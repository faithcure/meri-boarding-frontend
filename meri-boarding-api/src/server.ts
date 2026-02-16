import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'meri_boarding';
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@local.test').trim().toLowerCase();
const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
const adminName = (process.env.ADMIN_NAME || 'Super Admin').trim();
const tokenSecret = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET || 'change-this-secret';
const tokenHours = Number(process.env.ADMIN_TOKEN_HOURS || 12);
const seedHotelsOnStart = String(process.env.SEED_HOTELS_ON_START || '').trim().toLowerCase() === 'true';

type AdminRole = 'super_admin' | 'moderator' | 'user';

type AdminUser = {
  _id: ObjectId;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarPath?: string;
  passwordHash: string;
  role: AdminRole;
  approved?: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SessionPayload = {
  userId: string;
  role: AdminRole;
  exp: number;
};

type ContentLocale = 'de' | 'en' | 'tr';

type HeaderContent = {
  home: string;
  hotels: string;
  services: string;
  ourServices: string;
  amenities: string;
  ourAmenities: string;
  contact: string;
  reservation: string;
  flamingo: string;
  europaplatz: string;
  hildesheim: string;
};

type ContentEntry<T> = {
  _id: ObjectId;
  key: string;
  locale: ContentLocale;
  value: T;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
};

type HotelGalleryImage = {
  id: string;
  url: string;
  category: 'rooms' | 'dining' | 'facilities' | 'other';
  alt: string;
  sortOrder: number;
};

type HotelFact = {
  text: string;
  icon: string;
};

type HotelGalleryMeta = {
  sections: Array<{
    title: string;
    features: string[];
  }>;
};

type HotelLocaleContent = {
  locale: ContentLocale;
  name: string;
  location: string;
  shortDescription: string;
  facts: HotelFact[];
  heroTitle: string;
  heroSubtitle: string;
  description: string[];
  amenitiesTitle: string;
  highlights: string[];
  gallery: HotelGalleryImage[];
  galleryMeta: Record<string, HotelGalleryMeta>;
};

type HotelEntity = {
  _id: ObjectId;
  slug: string;
  active: boolean;
  available: boolean;
  order: number;
  coverImageUrl: string;
  locales: Record<ContentLocale, HotelLocaleContent>;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
};

const allowedLocales: ContentLocale[] = ['de', 'en', 'tr'];
const allowedGalleryCategories: HotelGalleryImage['category'][] = ['rooms', 'dining', 'facilities', 'other'];
const defaultHeaderContent: Record<ContentLocale, HeaderContent> = {
  de: {
    home: 'Startseite',
    hotels: 'Hotels',
    services: 'Services',
    ourServices: 'Unsere Services',
    amenities: 'Ausstattung',
    ourAmenities: 'Unsere Ausstattung',
    contact: 'Kontakt',
    reservation: 'Reservierung',
    flamingo: 'Flamingo',
    europaplatz: 'Europaplatz',
    hildesheim: 'Hildesheim',
  },
  en: {
    home: 'Home',
    hotels: 'Hotels',
    services: 'Services',
    ourServices: 'Our Services',
    amenities: 'Amenities',
    ourAmenities: 'Our Amenities',
    contact: 'Contact',
    reservation: 'Reservation',
    flamingo: 'Flamingo',
    europaplatz: 'Europaplatz',
    hildesheim: 'Hildesheim',
  },
  tr: {
    home: 'Ana Sayfa',
    hotels: 'Oteller',
    services: 'Hizmetler',
    ourServices: 'Hizmetlerimiz',
    amenities: 'Olanaklar',
    ourAmenities: 'Olanaklarımız',
    contact: 'İletişim',
    reservation: 'Rezervasyon',
    flamingo: 'Flamingo',
    europaplatz: 'Europaplatz',
    hildesheim: 'Hildesheim',
  },
};

const server = Fastify({
  logger: true,
  // Gallery uploads are sent as base64 JSON payloads from admin panel.
  // Keep this above allowed 8MB decoded file size to avoid transport-level disconnects.
  bodyLimit: 12 * 1024 * 1024,
});

let mongoClient: MongoClient | null = null;
const avatarUploadDir = path.resolve(process.cwd(), 'uploads', 'avatars');
const hotelUploadDir = path.resolve(process.cwd(), 'uploads', 'hotels');
const defaultAvatarPath = '/images/avatars/user-silhouette.svg';

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const receivedHash = scryptSync(password, salt, 64).toString('hex');
  const expected = Buffer.from(storedHash, 'hex');
  const received = Buffer.from(receivedHash, 'hex');

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

function signTokenPart(value: string) {
  return createHmac('sha256', tokenSecret).update(value).digest('hex');
}

function createToken(payload: Omit<SessionPayload, 'exp'>) {
  const exp = Date.now() + tokenHours * 60 * 60 * 1000;
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = signTokenPart(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token?: string) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signTokenPart(encodedPayload);
  const left = Buffer.from(expectedSignature);
  const right = Buffer.from(signature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;

    if (!parsed.userId || !parsed.role || !parsed.exp || parsed.exp <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getBearerToken(authorization?: string) {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function getAdminDisplayName(admin: AdminUser) {
  const firstName = String(admin.firstName || '').trim();
  const lastName = String(admin.lastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return String(admin.name || '').trim() || 'Admin User';
}

function toAvatarUrl(avatarPath?: string) {
  return avatarPath ? `/api/v1/assets/avatars/${avatarPath}` : defaultAvatarPath;
}

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function toSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    return null;
  }

  const mime = match[1].toLowerCase();
  const base64 = match[2];
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  return { mime, ext, buffer: Buffer.from(base64, 'base64') };
}

async function getDb() {
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
  }

  return mongoClient.db(mongoDbName);
}

function parseLocale(input?: string): ContentLocale {
  const normalized = String(input || '').trim().toLowerCase();
  return allowedLocales.includes(normalized as ContentLocale) ? (normalized as ContentLocale) : 'en';
}

function normalizeHeaderContent(input: Partial<HeaderContent> | undefined, fallback: HeaderContent): HeaderContent {
  return {
    home: String(input?.home ?? fallback.home).trim(),
    hotels: String(input?.hotels ?? fallback.hotels).trim(),
    services: String(input?.services ?? fallback.services).trim(),
    ourServices: String(input?.ourServices ?? fallback.ourServices).trim(),
    amenities: String(input?.amenities ?? fallback.amenities).trim(),
    ourAmenities: String(input?.ourAmenities ?? fallback.ourAmenities).trim(),
    contact: String(input?.contact ?? fallback.contact).trim(),
    reservation: String(input?.reservation ?? fallback.reservation).trim(),
    flamingo: String(input?.flamingo ?? fallback.flamingo).trim(),
    europaplatz: String(input?.europaplatz ?? fallback.europaplatz).trim(),
    hildesheim: String(input?.hildesheim ?? fallback.hildesheim).trim(),
  };
}

function parseGalleryCategory(input?: string): HotelGalleryImage['category'] {
  const normalized = String(input || '').trim().toLowerCase();
  return allowedGalleryCategories.includes(normalized as HotelGalleryImage['category'])
    ? (normalized as HotelGalleryImage['category'])
    : 'other';
}

function normalizeHotelFact(input: unknown): HotelFact {
  if (typeof input === 'string') {
    return { text: input.trim(), icon: 'fa fa-check' };
  }

  if (input && typeof input === 'object') {
    const maybeFact = input as { text?: unknown; icon?: unknown; value?: unknown };
    const text = String(maybeFact.text ?? maybeFact.value ?? '').trim();
    const icon = String(maybeFact.icon ?? '').trim() || 'fa fa-check';

    return { text, icon };
  }

  return { text: '', icon: 'fa fa-check' };
}

function normalizeGalleryMeta(input: unknown): HotelGalleryMeta {
  if (!input || typeof input !== 'object') {
    return { sections: [] };
  }

  const meta = input as { section?: unknown; features?: unknown; sections?: unknown };
  const sections = Array.isArray(meta.sections)
    ? meta.sections
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const section = item as { title?: unknown; features?: unknown };
          const title = String(section.title ?? '').trim();
          const features = Array.isArray(section.features)
            ? section.features.map((feature) => String(feature || '').trim()).filter(Boolean)
            : [];
          if (!title && features.length === 0) return null;
          return { title, features };
        })
        .filter(Boolean) as Array<{ title: string; features: string[] }>
    : [];

  // Backward compatibility: old shape { section, features }
  if (sections.length === 0) {
    const title = String(meta.section ?? '').trim();
    const features = Array.isArray(meta.features)
      ? meta.features.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    if (title || features.length > 0) {
      return { sections: [{ title, features }] };
    }
  }

  return {
    sections,
  };
}

function normalizeGalleryMetaMap(input: unknown): Record<string, HotelGalleryMeta> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const mapInput = input as Record<string, unknown>;
  const output: Record<string, HotelGalleryMeta> = {};

  for (const [key, value] of Object.entries(mapInput)) {
    const id = String(key || '').trim();
    if (!id) continue;
    output[id] = normalizeGalleryMeta(value);
  }

  return output;
}

function normalizeHotelLocaleContent(
  locale: ContentLocale,
  input: Partial<HotelLocaleContent> | undefined,
  fallback?: HotelLocaleContent,
): HotelLocaleContent {
  const base: HotelLocaleContent =
    fallback ||
    ({
      locale,
      name: '',
      location: '',
      shortDescription: '',
      facts: [],
      heroTitle: '',
      heroSubtitle: '',
      description: [],
      amenitiesTitle: '',
      highlights: [],
      gallery: [],
      galleryMeta: {},
    } as HotelLocaleContent);

  const facts = Array.isArray(input?.facts) ? input?.facts : base.facts;
  const description = Array.isArray(input?.description) ? input?.description : base.description;
  const highlights = Array.isArray(input?.highlights) ? input?.highlights : base.highlights;
  const gallery = Array.isArray(input?.gallery) ? input?.gallery : base.gallery;
  const galleryMeta = normalizeGalleryMetaMap(input?.galleryMeta ?? base.galleryMeta);

  return {
    locale,
    name: String(input?.name ?? base.name ?? '').trim(),
    location: String(input?.location ?? base.location ?? '').trim(),
    shortDescription: String(input?.shortDescription ?? base.shortDescription ?? '').trim(),
    facts: facts.map((item) => normalizeHotelFact(item)).filter((item) => Boolean(item.text)),
    heroTitle: String(input?.heroTitle ?? base.heroTitle ?? '').trim(),
    heroSubtitle: String(input?.heroSubtitle ?? base.heroSubtitle ?? '').trim(),
    description: description.map((item) => String(item || '').trim()).filter(Boolean),
    amenitiesTitle: String(input?.amenitiesTitle ?? base.amenitiesTitle ?? '').trim(),
    highlights: highlights.map((item) => String(item || '').trim()).filter(Boolean),
    gallery: gallery
      .map((item, index) => ({
        id: String(item?.id || '').trim() || randomBytes(12).toString('hex'),
        url: String(item?.url || '').trim(),
        category: parseGalleryCategory(item?.category),
        alt: String(item?.alt || '').trim(),
        sortOrder: Number.isFinite(item?.sortOrder) ? Number(item?.sortOrder) : index + 1,
      }))
      .filter((item) => Boolean(item.url) && item.url !== 'undefined' && item.url !== 'null')
      .sort((a, b) => a.sortOrder - b.sortOrder),
    galleryMeta,
  };
}

async function getHeaderContent(locale: ContentLocale) {
  const db = await getDb();
  const contents = db.collection<ContentEntry<HeaderContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });

  const content = await contents.findOne({ key: 'shared.header', locale });
  if (content) {
    return normalizeHeaderContent(content.value, defaultHeaderContent[locale]);
  }

  const fallback = defaultHeaderContent[locale];
  const now = new Date();
  await contents.updateOne(
    { key: 'shared.header', locale },
    {
      $set: { value: fallback, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), key: 'shared.header', locale, createdAt: now },
    },
    { upsert: true },
  );

  return fallback;
}

async function seedSuperAdmin() {
  if (!adminPassword) {
    server.log.warn('ADMIN_PASSWORD is empty. Super admin seed skipped.');
    return;
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');

  await admins.createIndex({ email: 1 }, { unique: true });

  const now = new Date();
  const superAdminExists = await admins.findOne({ role: 'super_admin', active: true });

  if (superAdminExists) {
    return;
  }

  await admins.updateOne(
    { email: adminEmail },
    {
      $set: {
        name: adminName,
        firstName: adminName.split(' ')[0] || 'Super',
        lastName: adminName.split(' ').slice(1).join(' ') || 'Admin',
        role: 'super_admin',
        approved: true,
        active: true,
        updatedAt: now,
      },
      $setOnInsert: {
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  server.log.info(`Seeded super admin: ${adminEmail}`);
}

async function seedHeaderContents() {
  for (const locale of allowedLocales) {
    await getHeaderContent(locale);
  }
}

function buildDefaultHotelLocales(name: string, location: string, description: string): Record<ContentLocale, HotelLocaleContent> {
  const baseGallery: HotelGalleryImage[] = [
    {
      id: randomBytes(8).toString('hex'),
      url: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg',
      category: 'rooms',
      alt: `${name} room`,
      sortOrder: 1,
    },
    {
      id: randomBytes(8).toString('hex'),
      url: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6844.jpg',
      category: 'dining',
      alt: `${name} dining`,
      sortOrder: 2,
    },
  ];

  const mk = (locale: ContentLocale): HotelLocaleContent => ({
    locale,
    name,
    location,
    shortDescription: description,
    facts: [
      { text: 'Fully furnished', icon: 'fa fa-home' },
      { text: 'Wi-Fi included', icon: 'fa fa-wifi' },
      { text: 'Flexible stay', icon: 'fa fa-calendar' },
    ],
    heroTitle: `Meri Boardinghouse ${name}`,
    heroSubtitle: 'Comfortable long-stay apartments',
    description: [description],
    amenitiesTitle: 'Amenities, services & highlights',
    highlights: ['Cleaning service', 'Fully equipped kitchen', 'Public transport nearby', 'Workspace friendly'],
    gallery: baseGallery,
    galleryMeta: {},
  });

  return {
    en: mk('en'),
    de: mk('de'),
    tr: mk('tr'),
  };
}

async function seedHotels() {
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  await hotels.createIndex({ slug: 1 }, { unique: true });
  await hotels.createIndex({ active: 1, order: 1 });

  const seeds = [
    {
      slug: 'flamingo',
      order: 1,
      coverImageUrl: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg',
      locales: buildDefaultHotelLocales('Flamingo', 'Stuttgart', 'Stylish long-stay units in Stuttgart with practical amenities.'),
    },
    {
      slug: 'europaplatz',
      order: 2,
      coverImageUrl: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6744.jpg',
      locales: buildDefaultHotelLocales('Europaplatz', 'Stuttgart', 'Modern serviced apartments for business and relocation stays.'),
    },
    {
      slug: 'hildesheim',
      order: 3,
      coverImageUrl: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6754.jpg',
      locales: buildDefaultHotelLocales('Hildesheim', 'Hildesheim', 'Comfortable accommodations designed for medium and long stays.'),
    },
  ];

  for (const item of seeds) {
    const now = new Date();
    await hotels.updateOne(
      { slug: item.slug },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          slug: item.slug,
          active: true,
          available: true,
          order: item.order,
          coverImageUrl: item.coverImageUrl,
          locales: item.locales,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  await hotels.updateMany({ available: { $exists: false } }, { $set: { available: true } });
}

async function ensureStorageFolders() {
  await mkdir(avatarUploadDir, { recursive: true });
  await mkdir(hotelUploadDir, { recursive: true });
}

async function getRequestAdmin(authorization?: string) {
  const token = getBearerToken(authorization);
  const payload = verifyToken(token || undefined);

  if (!payload || !ObjectId.isValid(payload.userId)) {
    return null;
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const admin = await admins.findOne({ _id: new ObjectId(payload.userId), active: true });

  if (!admin) {
    return null;
  }

  const isApproved = admin.approved ?? true;
  if (!isApproved) {
    return null;
  }

  return admin;
}

await server.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',').map((v) => v.trim()).filter(Boolean) || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

server.setErrorHandler((error, request, reply) => {
  const err = error as { code?: string };

  if (err.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return reply.code(413).send({ error: 'Request payload is too large. Please upload a smaller image.' });
  }

  request.log.error(error);
  return reply.code(500).send({ error: 'Internal server error' });
});

server.get('/health', async () => ({ ok: true, service: 'meri-boarding-api' }));
server.get('/api/v1/health', async () => ({ ok: true, version: 'v1' }));

server.get('/api/v1/public/content/header', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHeaderContent(locale);
  return reply.send({ key: 'shared.header', locale, content });
});

server.get('/api/v1/public/hotels', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const rows = await hotels.find({ active: true }).sort({ order: 1, createdAt: 1 }).toArray();

  return reply.send({
    locale,
    hotels: rows.map((row) => {
      const content = normalizeHotelLocaleContent(locale, row.locales?.[locale], row.locales?.en);
      return {
        id: row._id.toHexString(),
        slug: row.slug,
        order: row.order,
        active: row.active,
        available: row.available !== false,
        name: content.name,
        location: content.location,
        shortDescription: content.shortDescription,
        facts: content.facts,
        coverImageUrl: row.coverImageUrl || content.gallery[0]?.url || '',
      };
    }),
  });
});

server.get('/api/v1/public/hotels/:slug', async (request, reply) => {
  const params = request.params as { slug?: string } | undefined;
  const slug = String(params?.slug || '').trim();
  if (!slug) {
    return reply.code(400).send({ error: 'Invalid slug' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row =
    (await hotels.findOne({ slug, active: true })) ||
    (await hotels.findOne({ slug: { $regex: new RegExp(`^${escapeRegex(slug)}$`, 'i') }, active: true }));

  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const content = normalizeHotelLocaleContent(locale, row.locales?.[locale], row.locales?.en);
  const sharedGallery = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.[locale]).gallery;

  return reply.send({
    locale,
    hotel: {
      id: row._id.toHexString(),
      slug: row.slug,
      order: row.order,
      active: row.active,
      available: row.available !== false,
      coverImageUrl: row.coverImageUrl || content.gallery[0]?.url || '',
      ...content,
      gallery: sharedGallery.map((image) => ({
        ...image,
        meta: content.galleryMeta?.[image.id] || { sections: [] },
      })),
    },
  });
});

server.get('/api/v1/assets/avatars/:fileName', async (request, reply) => {
  const params = request.params as { fileName?: string };
  const fileName = sanitizeFilename(String(params.fileName || ''));

  if (!fileName) {
    return reply.code(404).send({ error: 'File not found' });
  }

  const filePath = path.join(avatarUploadDir, fileName);

  try {
    await stat(filePath);
    return reply.type('image/*').send(createReadStream(filePath));
  } catch {
    return reply.code(404).send({ error: 'File not found' });
  }
});

server.get('/api/v1/assets/hotels/:fileName', async (request, reply) => {
  const params = request.params as { fileName?: string };
  const fileName = sanitizeFilename(String(params.fileName || ''));

  if (!fileName) {
    return reply.code(404).send({ error: 'File not found' });
  }

  const filePath = path.join(hotelUploadDir, fileName);

  try {
    await stat(filePath);
    return reply.type('image/*').send(createReadStream(filePath));
  } catch {
    return reply.code(404).send({ error: 'File not found' });
  }
});

server.post('/api/v1/auth/login', async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!email || !password) {
    return reply.code(400).send({ error: 'Email and password are required' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const admin = await admins.findOne({ email });

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const isApproved = admin.approved ?? true;
  if (!isApproved || !admin.active) {
    return reply.code(403).send({ error: 'Your account is pending admin approval.' });
  }

  const token = createToken({ userId: admin._id.toHexString(), role: admin.role });
  return reply.send({
    token,
    admin: {
      id: admin._id.toHexString(),
      email: admin.email,
      name: getAdminDisplayName(admin),
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      phone: admin.phone || '',
      avatarUrl: toAvatarUrl(admin.avatarPath),
      role: admin.role,
      active: admin.active,
      approved: admin.approved ?? false,
    },
  });
});

server.post('/api/v1/auth/register', async (request, reply) => {
  const body = request.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  const firstName = String(body?.firstName || '').trim();
  const lastName = String(body?.lastName || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();
  const phone = String(body?.phone || '').trim();

  if (!firstName || !lastName || !email || !password) {
    return reply.code(400).send({ error: 'First name, last name, email and password are required' });
  }

  if (password.length < 6) {
    return reply.code(400).send({ error: 'Password must be at least 6 characters' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');

  try {
    const now = new Date();
    await admins.insertOne({
      _id: new ObjectId(),
      email,
      firstName,
      lastName,
      phone,
      name: `${firstName} ${lastName}`.trim(),
      passwordHash: hashPassword(password),
      role: 'user',
      approved: false,
      active: false,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return reply.code(409).send({ error: 'This email is already registered' });
  }

  return reply.code(201).send({ ok: true, message: 'Registration submitted. Wait for admin approval.' });
});

server.get('/api/v1/auth/me', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  return reply.send({
    admin: {
      id: admin._id.toHexString(),
      email: admin.email,
      name: getAdminDisplayName(admin),
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      phone: admin.phone || '',
      avatarUrl: toAvatarUrl(admin.avatarPath),
      role: admin.role,
      active: admin.active,
      approved: admin.approved ?? false,
    },
  });
});

server.patch('/api/v1/auth/me', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const body = request.body as { firstName?: string; lastName?: string; phone?: string } | undefined;
  const firstName = String(body?.firstName || '').trim();
  const lastName = String(body?.lastName || '').trim();
  const phone = String(body?.phone || '').trim();

  if (!firstName || !lastName) {
    return reply.code(400).send({ error: 'First name and last name are required' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const now = new Date();
  const name = `${firstName} ${lastName}`.trim();

  await admins.updateOne(
    { _id: admin._id },
    {
      $set: {
        firstName,
        lastName,
        phone,
        name,
        updatedAt: now,
      },
    },
  );

  const updated = await admins.findOne({ _id: admin._id });
  if (!updated) {
    return reply.code(404).send({ error: 'User not found' });
  }

  return reply.send({
    ok: true,
    admin: {
      id: updated._id.toHexString(),
      email: updated.email,
      name: getAdminDisplayName(updated),
      firstName: updated.firstName || '',
      lastName: updated.lastName || '',
      phone: updated.phone || '',
      avatarUrl: toAvatarUrl(updated.avatarPath),
      role: updated.role,
      active: updated.active,
      approved: updated.approved ?? false,
    },
  });
});

server.post('/api/v1/auth/me/avatar', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const dataUrl = String(body?.dataUrl || '');
  const parsed = parseDataUrl(dataUrl);

  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }

  if (parsed.buffer.length > 5 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 5MB' });
  }

  const nowStamp = Date.now();
  const requestedName = sanitizeFilename(String(body?.fileName || `avatar-${nowStamp}.${parsed.ext}`));
  const fileName = `${admin._id.toHexString()}-${nowStamp}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(avatarUploadDir, fileName);

  await writeFile(filePath, parsed.buffer);

  if (admin.avatarPath) {
    const oldPath = path.join(avatarUploadDir, sanitizeFilename(admin.avatarPath));
    await unlink(oldPath).catch(() => undefined);
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  await admins.updateOne(
    { _id: admin._id },
    {
      $set: {
        avatarPath: fileName,
        updatedAt: new Date(),
      },
    },
  );

  return reply.send({ ok: true, avatarUrl: toAvatarUrl(fileName) });
});

server.get('/api/v1/admin/users', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);

  if (!admin || admin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can access this route' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const users = await admins.find({}).sort({ createdAt: 1 }).toArray();

  return reply.send({
    users: users.map((user) => ({
      id: user._id.toHexString(),
      email: user.email,
      name: getAdminDisplayName(user),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      avatarUrl: toAvatarUrl(user.avatarPath),
      role: user.role,
      approved: user.approved ?? false,
      active: user.active,
      createdAt: user.createdAt,
    })),
  });
});

server.patch('/api/v1/admin/users/:userId/approval', async (request, reply) => {
  const currentAdmin = await getRequestAdmin(request.headers.authorization);

  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can approve users' });
  }

  const params = request.params as { userId?: string } | undefined;
  const userId = String(params?.userId || '');

  if (!ObjectId.isValid(userId)) {
    return reply.code(400).send({ error: 'Invalid user id' });
  }

  const body = request.body as { role?: AdminRole; approved?: boolean; active?: boolean } | undefined;
  const role = body?.role;
  const approved = body?.approved;
  const active = body?.active;

  if (role !== 'moderator' && role !== 'user') {
    return reply.code(400).send({ error: 'Role must be moderator or user' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const target = await admins.findOne({ _id: new ObjectId(userId) });

  if (!target) {
    return reply.code(404).send({ error: 'User not found' });
  }

  if (target.role === 'super_admin') {
    return reply.code(400).send({ error: 'Super admin account cannot be changed from this endpoint' });
  }

  await admins.updateOne(
    { _id: target._id },
    {
      $set: {
        role,
        approved: approved === undefined ? true : Boolean(approved),
        active: active === undefined ? true : Boolean(active),
        updatedAt: new Date(),
      },
    },
  );

  return reply.send({ ok: true });
});

server.delete('/api/v1/admin/users/:userId', async (request, reply) => {
  const currentAdmin = await getRequestAdmin(request.headers.authorization);

  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can delete users' });
  }

  const params = request.params as { userId?: string } | undefined;
  const userId = String(params?.userId || '');

  if (!ObjectId.isValid(userId)) {
    return reply.code(400).send({ error: 'Invalid user id' });
  }

  const targetId = new ObjectId(userId);

  if (targetId.equals(currentAdmin._id)) {
    return reply.code(400).send({ error: 'You cannot delete your own account' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  const target = await admins.findOne({ _id: targetId });

  if (!target) {
    return reply.code(404).send({ error: 'User not found' });
  }

  if (target.role === 'super_admin') {
    return reply.code(400).send({ error: 'Super admin account cannot be deleted' });
  }

  await admins.deleteOne({ _id: target._id });

  if (target.avatarPath) {
    const avatarPath = path.join(avatarUploadDir, sanitizeFilename(target.avatarPath));
    await unlink(avatarPath).catch(() => undefined);
  }

  return reply.send({ ok: true });
});

server.get('/api/v1/admin/hotels', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const rows = await hotels.find({}).sort({ order: 1, createdAt: 1 }).toArray();

  return reply.send({
    hotels: rows.map((row) => {
      const en = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.en);
      const de = normalizeHotelLocaleContent('de', row.locales?.de, en);
      const tr = normalizeHotelLocaleContent('tr', row.locales?.tr, en);

      return {
        id: row._id.toHexString(),
        slug: row.slug,
        order: row.order,
        active: row.active,
        available: row.available !== false,
        coverImageUrl: row.coverImageUrl || en.gallery[0]?.url || '',
        locales: { en, de, tr },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
  });
});

server.post('/api/v1/admin/hotels', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can create hotels' });
  }

  const body = request.body as
    | {
        slug?: string;
        order?: number;
        active?: boolean;
        available?: boolean;
        locale?: ContentLocale;
        content?: Partial<HotelLocaleContent>;
      }
    | undefined;

  const active = body?.active === undefined ? true : Boolean(body?.active);
  const available = body?.available === undefined ? true : Boolean(body?.available);
  const locale = parseLocale(body?.locale);

  const normalized = normalizeHotelLocaleContent(locale, body?.content);
  if (!normalized.name || !normalized.shortDescription) {
    return reply.code(400).send({ error: 'Name and short description are required' });
  }

  const slug = toSlug(String(body?.slug || '').trim() || normalized.name);
  if (!slug) {
    return reply.code(400).send({ error: 'A valid slug could not be generated from name' });
  }

  const locales = {
    en: normalizeHotelLocaleContent('en', locale === 'en' ? normalized : { name: normalized.name }),
    de: normalizeHotelLocaleContent('de', locale === 'de' ? normalized : { name: normalized.name }),
    tr: normalizeHotelLocaleContent('tr', locale === 'tr' ? normalized : { name: normalized.name }),
  } as Record<ContentLocale, HotelLocaleContent>;

  locales[locale] = normalized;

  const now = new Date();
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const lastHotelByOrder = await hotels.find({}).sort({ order: -1, createdAt: -1 }).limit(1).next();
  const nextAutoOrder = Math.max(1, Number(lastHotelByOrder?.order || 0) + 1);
  const order = Number.isFinite(body?.order) ? Math.max(1, Number(body?.order)) : nextAutoOrder;

  try {
    const result = await hotels.insertOne({
      _id: new ObjectId(),
      slug,
      order,
      active,
      available,
      coverImageUrl: normalized.gallery[0]?.url || '',
      locales,
      createdAt: now,
      updatedAt: now,
      updatedBy: admin._id,
    });
    return reply.code(201).send({ ok: true, id: result.insertedId.toHexString() });
  } catch {
    return reply.code(409).send({ error: 'Hotel could not be created. Slug may already exist.' });
  }
});

server.patch('/api/v1/admin/hotels/:hotelId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update hotels' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const body = request.body as
    | {
        slug?: string;
        order?: number;
        active?: boolean;
        available?: boolean;
        locale?: ContentLocale;
        content?: Partial<HotelLocaleContent>;
        coverImageUrl?: string;
      }
    | undefined;

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });

  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const locale = parseLocale(body?.locale);
  const currentLocale = normalizeHotelLocaleContent(locale, row.locales?.[locale], row.locales?.en);
  const nextLocale = normalizeHotelLocaleContent(locale, body?.content, currentLocale);

  const nextSlug =
    body?.slug === undefined
      ? row.slug
      : String(body.slug || '')
          .trim()
          .replace(/[^a-zA-Z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
  if (!nextSlug) {
    return reply.code(400).send({ error: 'Slug cannot be empty' });
  }

  const nextLocales = { ...row.locales, [locale]: nextLocale };
  const nextCoverImage =
    String(body?.coverImageUrl || '').trim() || row.coverImageUrl || nextLocale.gallery[0]?.url || '';

  try {
    await hotels.updateOne(
      { _id: row._id },
      {
        $set: {
          slug: nextSlug,
          order: body?.order === undefined ? row.order : Math.max(1, Number(body.order)),
          active: body?.active === undefined ? row.active : Boolean(body.active),
          available: body?.available === undefined ? row.available !== false : Boolean(body.available),
          locales: nextLocales,
          coverImageUrl: nextCoverImage,
          updatedAt: new Date(),
          updatedBy: admin._id,
        },
      },
    );
  } catch {
    return reply.code(409).send({ error: 'Slug already exists' });
  }

  return reply.send({ ok: true });
});

server.delete('/api/v1/admin/hotels/:hotelId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can delete hotels' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });

  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  for (const locale of allowedLocales) {
    const gallery = row.locales?.[locale]?.gallery || [];
    for (const image of gallery) {
      const localFile = image.url.split('/api/v1/assets/hotels/')[1];
      if (localFile) {
        const filePath = path.join(hotelUploadDir, sanitizeFilename(localFile));
        await unlink(filePath).catch(() => undefined);
      }
    }
  }

  const result = await hotels.deleteOne({ _id: row._id });
  if (!result.acknowledged || result.deletedCount !== 1) {
    return reply.code(500).send({ error: 'Hotel could not be deleted from database' });
  }

  return reply.send({ ok: true });
});

server.post('/api/v1/admin/hotels/:hotelId/gallery', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload gallery images' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const body = request.body as
    | { locale?: ContentLocale; fileName?: string; dataUrl?: string; category?: string; alt?: string }
    | undefined;
  const locale = parseLocale(body?.locale);
  const parsed = parseDataUrl(String(body?.dataUrl || ''));

  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }

  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });
  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `hotel-${Date.now()}.${parsed.ext}`));
  const fileName = `${row.slug}-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(hotelUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  const current = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.[locale]);
  const image: HotelGalleryImage = {
    id: randomBytes(12).toString('hex'),
    url: `/api/v1/assets/hotels/${fileName}`,
    category: parseGalleryCategory(body?.category),
    alt: String(body?.alt || `${current.name} image`).trim(),
    sortOrder: current.gallery.length + 1,
  };

  const nextSharedGallery = [...current.gallery, image];
  const localesPatch = allowedLocales.reduce((acc, localeKey) => {
    const localeContent = normalizeHotelLocaleContent(localeKey, row.locales?.[localeKey], row.locales?.en);
    acc[`locales.${localeKey}`] = normalizeHotelLocaleContent(localeKey, {
      ...localeContent,
      gallery: nextSharedGallery,
    });
    return acc;
  }, {} as Record<string, HotelLocaleContent>);

  await hotels.updateOne(
    { _id: row._id },
    {
      $set: {
        ...localesPatch,
        coverImageUrl: row.coverImageUrl || image.url,
        updatedAt: new Date(),
        updatedBy: admin._id,
      },
    },
  );

  return reply.send({ ok: true, image });
});

server.post('/api/v1/admin/hotels/:hotelId/cover', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload cover images' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));

  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }

  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });
  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `cover-${Date.now()}.${parsed.ext}`));
  const fileName = `${row.slug}-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(hotelUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  const coverImageUrl = `/api/v1/assets/hotels/${fileName}`;

  await hotels.updateOne(
    { _id: row._id },
    {
      $set: {
        coverImageUrl,
        updatedAt: new Date(),
        updatedBy: admin._id,
      },
    },
  );

  return reply.send({ ok: true, coverImageUrl });
});

server.delete('/api/v1/admin/hotels/:hotelId/gallery/:imageId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can delete gallery images' });
  }

  const params = request.params as { hotelId?: string; imageId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  const imageId = String(params?.imageId || '').trim();

  if (!ObjectId.isValid(hotelId) || !imageId) {
    return reply.code(400).send({ error: 'Invalid parameters' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });
  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const current = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.[locale]);
  const target = current.gallery.find((item) => item.id === imageId);
  if (!target) {
    return reply.code(404).send({ error: 'Image not found' });
  }

  const nextGallery = current.gallery.filter((item) => item.id !== imageId).map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
  const localesPatch = allowedLocales.reduce((acc, localeKey) => {
    const localeContent = normalizeHotelLocaleContent(localeKey, row.locales?.[localeKey], row.locales?.en);
    const nextGalleryMeta = { ...(localeContent.galleryMeta || {}) };
    delete nextGalleryMeta[imageId];
    acc[`locales.${localeKey}`] = normalizeHotelLocaleContent(localeKey, {
      ...localeContent,
      gallery: nextGallery,
      galleryMeta: nextGalleryMeta,
    });
    return acc;
  }, {} as Record<string, HotelLocaleContent>);

  await hotels.updateOne(
    { _id: row._id },
    { $set: { ...localesPatch, updatedAt: new Date(), updatedBy: admin._id } },
  );

  const localFile = target.url.split('/api/v1/assets/hotels/')[1];
  if (localFile) {
    const filePath = path.join(hotelUploadDir, sanitizeFilename(localFile));
    await unlink(filePath).catch(() => undefined);
  }

  return reply.send({ ok: true });
});

server.get('/api/v1/admin/content/header', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHeaderContent(locale);

  return reply.send({ key: 'shared.header', locale, content });
});

server.put('/api/v1/admin/content/header', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<HeaderContent> } | undefined;
  const locale = parseLocale(body?.locale);
  const nextContent = normalizeHeaderContent(body?.content, defaultHeaderContent[locale]);

  if (Object.values(nextContent).some((value) => !value)) {
    return reply.code(400).send({ error: 'All header fields are required' });
  }

  const db = await getDb();
  const contents = db.collection<ContentEntry<HeaderContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });

  const now = new Date();
  await contents.updateOne(
    { key: 'shared.header', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'shared.header',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.post('/api/v1/admin/users', async (request, reply) => {
  const currentAdmin = await getRequestAdmin(request.headers.authorization);

  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can create users' });
  }

  const body = request.body as { name?: string; email?: string; password?: string; role?: AdminRole };
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();
  const role = body?.role;

  if (!name || !email || !password || (role !== 'moderator' && role !== 'user')) {
    return reply.code(400).send({ error: 'Valid name, email, password and role (moderator|user) are required' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');

  try {
    const now = new Date();
    const parts = name.split(' ');
    const firstName = parts[0] || name;
    const lastName = parts.slice(1).join(' ');
    await admins.insertOne({
      _id: new ObjectId(),
      email,
      name,
      firstName,
      lastName,
      passwordHash: hashPassword(password),
      role,
      approved: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return reply.code(409).send({ error: 'User could not be created. Email may already exist.' });
  }

  return reply.code(201).send({ ok: true });
});

const start = async () => {
  try {
    await ensureStorageFolders();
    await seedSuperAdmin();
    await seedHeaderContents();
    if (seedHotelsOnStart) {
      await seedHotels();
      server.log.info('Default hotels seed completed (SEED_HOTELS_ON_START=true).');
    } else {
      server.log.info('Default hotels seed skipped (set SEED_HOTELS_ON_START=true to enable).');
    }
    await server.listen({ port, host });
    server.log.info(`API running on http://${host}:${port}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void start();
