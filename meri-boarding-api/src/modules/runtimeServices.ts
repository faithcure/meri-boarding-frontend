import { randomBytes } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Db, ObjectId as MongoObjectId } from 'mongodb'

import type {
  AdminUser,
  AmenitiesCmsContent,
  ContactCmsContent,
  ContactSubmission,
  ContentEntry,
  ContentLocale,
  GeneralSettingsContent,
  HeaderContent,
  HomeCmsContent,
  HotelEntity,
  HotelGalleryImage,
  HotelLocaleContent,
  ReservationCmsContent,
  ServicesCmsContent,
  SessionPayload
} from './contentSchemas.js'

type CreateRuntimeServicesOptions = {
  getDb: () => Promise<Db>
  ObjectId: typeof MongoObjectId
  allowedLocales: ContentLocale[]
  defaultHeaderContent: Record<ContentLocale, HeaderContent>
  defaultGeneralSettingsContent: GeneralSettingsContent
  defaultHomeContent: HomeCmsContent
  defaultServicesContent: ServicesCmsContent
  defaultAmenitiesContent: AmenitiesCmsContent
  defaultReservationContent: ReservationCmsContent
  defaultContactContent: ContactCmsContent
  normalizeHeaderContent: (input: Partial<HeaderContent> | undefined, fallback: HeaderContent) => HeaderContent
  normalizeGeneralSettingsContent: (input: Partial<GeneralSettingsContent> | undefined, fallback: GeneralSettingsContent) => GeneralSettingsContent
  normalizeHomeContent: (input: Partial<HomeCmsContent> | undefined, fallback: HomeCmsContent) => HomeCmsContent
  normalizeServicesContent: (input: Partial<ServicesCmsContent> | undefined, fallback: ServicesCmsContent) => ServicesCmsContent
  normalizeAmenitiesContent: (input: Partial<AmenitiesCmsContent> | undefined, fallback: AmenitiesCmsContent) => AmenitiesCmsContent
  normalizeReservationContent: (input: Partial<ReservationCmsContent> | undefined, fallback: ReservationCmsContent) => ReservationCmsContent
  normalizeContactContent: (input: Partial<ContactCmsContent> | undefined, fallback: ContactCmsContent) => ContactCmsContent
  mergeRoomsCardsWithSharedMedia: (baseCards: HomeCmsContent['rooms']['cards'], sharedCards: HomeCmsContent['rooms']['cards']) => HomeCmsContent['rooms']['cards']
  normalizeHotelLocaleContent: (
    locale: ContentLocale,
    input: Partial<HotelLocaleContent> | undefined,
    fallback?: HotelLocaleContent
  ) => HotelLocaleContent
  getLocalizedGenericRoomsCards: (locale: ContentLocale) => HomeCmsContent['rooms']['cards']
  parseEmailList: (input: string) => string[]
  extractEmailsFromText: (input: string) => string[]
  contactNotifyToRaw: string
  avatarUploadDir: string
  hotelUploadDir: string
  homeUploadDir: string
  assetCacheDir: string
  getBearerToken: (authorization?: string) => string | null
  verifyToken: (token?: string) => SessionPayload | null
}

export function createRuntimeServices(options: CreateRuntimeServicesOptions) {
  const {
    getDb,
    ObjectId,
    allowedLocales,
    defaultHeaderContent,
    defaultGeneralSettingsContent,
    defaultHomeContent,
    defaultServicesContent,
    defaultAmenitiesContent,
    defaultReservationContent,
    defaultContactContent,
    normalizeHeaderContent,
    normalizeGeneralSettingsContent,
    normalizeHomeContent,
    normalizeServicesContent,
    normalizeAmenitiesContent,
    normalizeReservationContent,
    normalizeContactContent,
    mergeRoomsCardsWithSharedMedia,
    normalizeHotelLocaleContent,
    getLocalizedGenericRoomsCards,
    parseEmailList,
    extractEmailsFromText,
    contactNotifyToRaw,
    avatarUploadDir,
    hotelUploadDir,
    homeUploadDir,
    assetCacheDir,
    getBearerToken,
    verifyToken
  } = options

  const homeFallbackCache: Partial<Record<ContentLocale, HomeCmsContent>> = {}
  const servicesFallbackCache: Partial<Record<ContentLocale, ServicesCmsContent>> = {}
  const amenitiesFallbackCache: Partial<Record<ContentLocale, AmenitiesCmsContent>> = {}
  const contactFallbackCache: Partial<Record<ContentLocale, ContactCmsContent>> = {}
  const reservationFallbackCache: Partial<Record<ContentLocale, ReservationCmsContent>> = {}
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

async function getGeneralSettingsContent() {
  const db = await getDb();
  const contents = db.collection<ContentEntry<GeneralSettingsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });

  const content = await contents.findOne({ key: 'shared.general_settings', locale: 'en' });
  if (content) {
    return normalizeGeneralSettingsContent(content.value, defaultGeneralSettingsContent);
  }

  const fallback = defaultGeneralSettingsContent;
  const now = new Date();
  await contents.updateOne(
    { key: 'shared.general_settings', locale: 'en' },
    {
      $set: { value: fallback, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), key: 'shared.general_settings', locale: 'en', createdAt: now },
    },
    { upsert: true },
  );

  return fallback;
}

async function getLocalizedDefaultHomeContent(locale: ContentLocale): Promise<HomeCmsContent> {
  if (homeFallbackCache[locale]) {
    return JSON.parse(JSON.stringify(homeFallbackCache[locale])) as HomeCmsContent;
  }

  const fallback = JSON.parse(JSON.stringify(defaultHomeContent)) as HomeCmsContent;
  fallback.rooms.cards = getLocalizedGenericRoomsCards(locale);

  homeFallbackCache[locale] = fallback;
  return JSON.parse(JSON.stringify(fallback)) as HomeCmsContent;
}

async function getHomeContent(locale: ContentLocale) {
  const db = await getDb();
  const contents = db.collection<ContentEntry<HomeCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultHomeContent(locale);

  const content = await contents.findOne({ key: 'page.home', locale });
  if (content) {
    let normalized = normalizeHomeContent(content.value, localizedFallback);
    const hasLegacyEnglishHero =
      locale !== 'en' &&
      normalized.hero.titleLead === defaultHomeContent.hero.titleLead &&
      normalized.hero.titleHighlight === defaultHomeContent.hero.titleHighlight &&
      normalized.hero.titleTail === defaultHomeContent.hero.titleTail &&
      normalized.hero.description === defaultHomeContent.hero.description &&
      normalized.hero.ctaLocations === defaultHomeContent.hero.ctaLocations &&
      normalized.hero.ctaQuote === defaultHomeContent.hero.ctaQuote;

    if (hasLegacyEnglishHero) {
      normalized = normalizeHomeContent({ ...normalized, hero: localizedFallback.hero }, normalized);
      await contents.updateOne(
        { _id: content._id },
        { $set: { value: normalized, updatedAt: new Date() } },
      );
    }

    const shouldBackfillRooms = !Array.isArray(normalized.rooms.cards) || normalized.rooms.cards.length < 1;

    if (shouldBackfillRooms) {
      normalized = normalizeHomeContent(
        {
          ...normalized,
          rooms: {
            ...normalized.rooms,
            cards: localizedFallback.rooms.cards,
            subtitle: normalized.rooms.subtitle || localizedFallback.rooms.subtitle,
            title: normalized.rooms.title || localizedFallback.rooms.title,
            description: normalized.rooms.description || localizedFallback.rooms.description,
            allAmenities: normalized.rooms.allAmenities || localizedFallback.rooms.allAmenities,
            request: normalized.rooms.request || localizedFallback.rooms.request,
          },
        },
        normalized,
      );
      await contents.updateOne(
        { _id: content._id },
        { $set: { value: normalized, updatedAt: new Date() } },
      );
    }

    if (locale === 'en') {
      return normalized;
    }

    // Section visibility/order is global across locales, sourced from EN.
    const enContent = await contents.findOne({ key: 'page.home', locale: 'en' });
    if (enContent) {
      const enNormalized = normalizeHomeContent(enContent.value, defaultHomeContent);
      const mergedCards = mergeRoomsCardsWithSharedMedia(normalized.rooms.cards, enNormalized.rooms.cards);
      return {
        ...normalized,
        sections: enNormalized.sections,
        rooms: {
          ...normalized.rooms,
          cards: mergedCards,
        },
      };
    }

    return normalized;
  }

  const fallback = localizedFallback;
  const now = new Date();
  await contents.updateOne(
    { key: 'page.home', locale },
    {
      $set: { value: fallback, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), key: 'page.home', locale, createdAt: now },
    },
    { upsert: true },
  );

  return fallback;
}

async function getLocalizedDefaultServicesContent(locale: ContentLocale): Promise<ServicesCmsContent> {
  if (servicesFallbackCache[locale]) {
    return JSON.parse(JSON.stringify(servicesFallbackCache[locale])) as ServicesCmsContent;
  }

  const fallback = JSON.parse(JSON.stringify(defaultServicesContent)) as ServicesCmsContent;

  servicesFallbackCache[locale] = fallback;
  return JSON.parse(JSON.stringify(fallback)) as ServicesCmsContent;
}

async function getServicesContent(locale: ContentLocale) {
  const db = await getDb();
  const contents = db.collection<ContentEntry<ServicesCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultServicesContent(locale);

  const content = await contents.findOne({ key: 'page.services', locale });
  if (content) {
    return normalizeServicesContent(content.value, localizedFallback);
  }

  const fallback = localizedFallback;
  const now = new Date();
  await contents.updateOne(
    { key: 'page.services', locale },
    {
      $set: { value: fallback, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), key: 'page.services', locale, createdAt: now },
    },
    { upsert: true },
  );

  return fallback;
}

async function getLocalizedDefaultAmenitiesContent(locale: ContentLocale): Promise<AmenitiesCmsContent> {
  if (amenitiesFallbackCache[locale]) {
    return JSON.parse(JSON.stringify(amenitiesFallbackCache[locale])) as AmenitiesCmsContent;
  }

  const fallback = JSON.parse(JSON.stringify(defaultAmenitiesContent)) as AmenitiesCmsContent;

  amenitiesFallbackCache[locale] = fallback;
  return JSON.parse(JSON.stringify(fallback)) as AmenitiesCmsContent;
}

async function getAmenitiesContent(locale: ContentLocale) {
  const db = await getDb();
  const contents = db.collection<ContentEntry<AmenitiesCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultAmenitiesContent(locale);

  const content = await contents.findOne({ key: 'page.amenities', locale });
  if (content) {
    return normalizeAmenitiesContent(content.value, localizedFallback);
  }

  const fallback = localizedFallback;
  const now = new Date();
  await contents.updateOne(
    { key: 'page.amenities', locale },
    {
      $set: { value: fallback, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), key: 'page.amenities', locale, createdAt: now },
    },
    { upsert: true },
  );

  return fallback;
}

async function getLocalizedDefaultReservationContent(locale: ContentLocale): Promise<ReservationCmsContent> {
  if (reservationFallbackCache[locale]) {
    return JSON.parse(JSON.stringify(reservationFallbackCache[locale])) as ReservationCmsContent;
  }

  const fallback = JSON.parse(JSON.stringify(defaultReservationContent)) as ReservationCmsContent;

  reservationFallbackCache[locale] = fallback;
  return JSON.parse(JSON.stringify(fallback)) as ReservationCmsContent;
}

async function getReservationContent(locale: ContentLocale) {
  const db = await getDb();
  const contents = db.collection<ContentEntry<ReservationCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultReservationContent(locale);

  const content = await contents.findOne({ key: 'page.reservation', locale });
  if (content) {
    return normalizeReservationContent(content.value, localizedFallback);
  }

  const fallback = localizedFallback;
  const now = new Date();
  await contents.updateOne(
    { key: 'page.reservation', locale },
    {
      $set: { value: fallback, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), key: 'page.reservation', locale, createdAt: now },
    },
    { upsert: true },
  );

  return fallback;
}

async function getLocalizedDefaultContactContent(locale: ContentLocale): Promise<ContactCmsContent> {
  if (contactFallbackCache[locale]) {
    return JSON.parse(JSON.stringify(contactFallbackCache[locale])) as ContactCmsContent;
  }

  const fallback = JSON.parse(JSON.stringify(defaultContactContent)) as ContactCmsContent;

  contactFallbackCache[locale] = fallback;
  return JSON.parse(JSON.stringify(fallback)) as ContactCmsContent;
}

async function getContactContent(locale: ContentLocale) {
  const db = await getDb();
  const contents = db.collection<ContentEntry<ContactCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultContactContent(locale);

  const content = await contents.findOne({ key: 'page.contact', locale });
  if (content) {
    return normalizeContactContent(content.value, localizedFallback);
  }

  const fallback = localizedFallback;
  const now = new Date();
  await contents.updateOne(
    { key: 'page.contact', locale },
    {
      $set: { value: fallback, updatedAt: now },
      $setOnInsert: { _id: new ObjectId(), key: 'page.contact', locale, createdAt: now },
    },
    { upsert: true },
  );

  return fallback;
}

async function getContactSubmissionsCollection() {
  const db = await getDb();
  const submissions = db.collection<ContactSubmission>('contact_submissions');
  await submissions.createIndex({ createdAt: -1 });
  await submissions.createIndex({ status: 1, createdAt: -1 });
  await submissions.createIndex({ email: 1 });
  return submissions;
}

async function resolveContactNotificationRecipients(locale: ContentLocale) {
  const envRecipients = parseEmailList(contactNotifyToRaw);
  if (envRecipients.length > 0) return envRecipients;

  const content = await getContactContent(locale);
  const itemEmails = (content.details.items || [])
    .flatMap((item) => extractEmailsFromText(String(item?.value || '')))
    .filter(Boolean);

  return Array.from(new Set(itemEmails));
}

async function ensureAdminIndexes() {
  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');
  await admins.createIndex({ email: 1 }, { unique: true });
}

async function ensureChatIndexes() {
  const db = await getDb();
  const sessions = db.collection('chat_sessions');
  const messages = db.collection('chat_messages');
  const events = db.collection('chat_events');
  await Promise.all([
    sessions.createIndex({ createdAt: -1 }),
    sessions.createIndex({ email: 1, createdAt: -1 }),
    sessions.createIndex({ locale: 1, createdAt: -1 }),
    messages.createIndex({ sessionId: 1, createdAt: 1 }),
    messages.createIndex({ role: 1, createdAt: -1 }),
    messages.createIndex({ locale: 1, createdAt: -1 }),
    events.createIndex({ sessionId: 1, createdAt: -1 }),
    events.createIndex({ event: 1, createdAt: -1 }),
    events.createIndex({ locale: 1, createdAt: -1 }),
  ]);
}

async function seedHeaderContents() {
  for (const locale of allowedLocales) {
    await getHeaderContent(locale);
  }
}

async function seedHomeContents() {
  for (const locale of allowedLocales) {
    await getHomeContent(locale);
  }
}

async function seedServicesContents() {
  for (const locale of allowedLocales) {
    await getServicesContent(locale);
  }
}

async function seedAmenitiesContents() {
  for (const locale of allowedLocales) {
    await getAmenitiesContent(locale);
  }
}

async function seedReservationContents() {
  for (const locale of allowedLocales) {
    await getReservationContent(locale);
  }
}

async function seedContactContents() {
  for (const locale of allowedLocales) {
    await getContactContent(locale);
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
  await mkdir(homeUploadDir, { recursive: true });
  await mkdir(path.join(assetCacheDir, 'avatars'), { recursive: true });
  await mkdir(path.join(assetCacheDir, 'hotels'), { recursive: true });
  await mkdir(path.join(assetCacheDir, 'home'), { recursive: true });
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

  return {
    getHeaderContent,
    getGeneralSettingsContent,
    getLocalizedDefaultHomeContent,
    getHomeContent,
    getLocalizedDefaultServicesContent,
    getServicesContent,
    getLocalizedDefaultAmenitiesContent,
    getAmenitiesContent,
    getLocalizedDefaultReservationContent,
    getReservationContent,
    getLocalizedDefaultContactContent,
    getContactContent,
    getContactSubmissionsCollection,
    resolveContactNotificationRecipients,
    ensureAdminIndexes,
    ensureChatIndexes,
    seedHeaderContents,
    seedHomeContents,
    seedServicesContents,
    seedAmenitiesContents,
    seedReservationContents,
    seedContactContents,
    buildDefaultHotelLocales,
    seedHotels,
    ensureStorageFolders,
    getRequestAdmin
  }
}
