import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
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
  thumbnailUrl?: string;
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

type HomeSectionKey = 'hero' | 'rooms' | 'testimonials' | 'facilities' | 'gallery' | 'offers' | 'faq';

type HomeSectionState = {
  enabled: boolean;
  order: number;
};

type HomeHeroSlide = {
  image: string;
  position: string;
};

type HomeGalleryItem = {
  image: string;
  category: string;
  alt: string;
};

type HomeGalleryCategory = {
  key: string;
  label: string;
};

type HomeOfferCard = {
  id: string;
  badge: string;
  title: string;
  text: string;
  image: string;
};

type HomeTestimonialSlide = {
  badge: string;
  text: string;
};

type HomeFaqItem = {
  title: string;
  body: string;
};

type HomeCmsContent = {
  sections: Record<HomeSectionKey, HomeSectionState>;
  hero: {
    titleLead: string;
    titleHighlight: string;
    titleTail: string;
    description: string;
    ctaLocations: string;
    ctaLocationsHref: string;
    ctaQuote: string;
    ctaQuoteHref: string;
    slides: HomeHeroSlide[];
  };
  rooms: {
    subtitle: string;
    title: string;
    description: string;
    allAmenities: string;
    allAmenitiesHref: string;
    request: string;
    requestHref: string;
    cards: Array<{
      title: string;
      icon: string;
      image: string;
      description: string;
      highlights: string[];
    }>;
  };
  testimonials: {
    apartmentsCount: number;
    backgroundImage: string;
    apartments: string;
    locations: string;
    slides: HomeTestimonialSlide[];
  };
  facilities: {
    subtitle: string;
    title: string;
    description: string;
    stats: Array<{
      label: string;
      suffix: string;
    }>;
    primaryImage: string;
    secondaryImage: string;
    statsNumbers: [number, number, number];
  };
  gallery: {
    subtitle: string;
    title: string;
    description: string;
    view: string;
    categories: HomeGalleryCategory[];
    items: HomeGalleryItem[];
  };
  offers: {
    subtitle: string;
    title: string;
    cards: HomeOfferCard[];
  };
  faq: {
    subtitle: string;
    title: string;
    cta: string;
    items: HomeFaqItem[];
  };
};

const allowedLocales: ContentLocale[] = ['de', 'en', 'tr'];
const allowedGalleryCategories: HotelGalleryImage['category'][] = ['rooms', 'dining', 'facilities', 'other'];
const homeSectionKeys: HomeSectionKey[] = ['hero', 'rooms', 'testimonials', 'facilities', 'gallery', 'offers', 'faq'];
const defaultHomeContent: HomeCmsContent = {
  sections: {
    hero: { enabled: true, order: 1 },
    rooms: { enabled: true, order: 2 },
    testimonials: { enabled: true, order: 3 },
    facilities: { enabled: true, order: 4 },
    gallery: { enabled: true, order: 5 },
    offers: { enabled: true, order: 6 },
    faq: { enabled: true, order: 7 },
  },
  hero: {
    titleLead: 'In Stuttgart,',
    titleHighlight: 'live, stay, and work',
    titleTail: 'in one place',
    description:
      '256 apartments across 3 locations: 1-3 rooms, fully furnished, and ideal for short or long stays. Smart TV, fast Wi-Fi, and fully equipped kitchens for a comfortable experience.',
    ctaLocations: 'See Locations',
    ctaLocationsHref: '/hotels',
    ctaQuote: 'Request a Quote Now',
    ctaQuoteHref: '/contact',
    slides: [
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg', position: 'center 13%' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg', position: 'center 45%' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg', position: 'center 35%' },
      { image: '/images/Europaplatz_Fotos/_DSC6714.jpg', position: 'center 35%' },
    ],
  },
  rooms: {
    subtitle: 'Meri Boarding Amenities',
    title: 'Apartment Amenities',
    description: 'Fully furnished apartments with thoughtful details for everyday living, work, and family stays.',
    allAmenities: 'View all amenities',
    allAmenitiesHref: '/amenities',
    request: 'Request availability',
    requestHref: '/contact',
    cards: [
      {
        title: 'Card 1',
        icon: 'fa fa-home',
        image: '/images/placeholders/room.svg',
        description: 'Card description',
        highlights: [],
      },
      {
        title: 'Card 2',
        icon: 'fa fa-home',
        image: '/images/placeholders/room.svg',
        description: 'Card description',
        highlights: [],
      },
      {
        title: 'Card 3',
        icon: 'fa fa-home',
        image: '/images/placeholders/room.svg',
        description: 'Card description',
        highlights: [],
      },
      {
        title: 'Card 4',
        icon: 'fa fa-home',
        image: '/images/placeholders/room.svg',
        description: 'Card description',
        highlights: [],
      },
    ],
  },
  testimonials: {
    apartmentsCount: 256,
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg',
    apartments: 'Apartments',
    locations: '3 locations in Stuttgart',
    slides: [
      {
        badge: 'Fully furnished',
        text: '1–3 room apartments designed for living and working on time, across three Stuttgart locations.',
      },
      {
        badge: 'Comfort first',
        text: 'Smart layouts with balcony or terrace, fully equipped kitchens for international cooking, and Smart-TV.',
      },
      {
        badge: 'Work ready',
        text: 'Fast WLAN and excellent conditions for communication and mobile work in every apartment.',
      },
      {
        badge: 'Move-in support',
        text: 'Registration support and a smooth arrival, including help with official registration documents.',
      },
    ],
  },
  facilities: {
    subtitle: 'Welcome to Meri Boarding',
    title: 'Facilities & Services',
    description:
      'Fully furnished 1-3 room apartments across 3 locations in Stuttgart with a total of 256 apartments. Enjoy smart layouts, balconies or terraces, fully equipped kitchens for international cooking, Smart-TV, and fast WLAN.',
    stats: [
      { label: 'TOTAL APARTMENTS', suffix: 'furnished apartments' },
      { label: 'LOCATIONS', suffix: 'in Stuttgart' },
      { label: 'APARTMENT TYPES', suffix: '1-3 room layouts' },
    ],
    primaryImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg',
    secondaryImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg',
    statsNumbers: [256, 3, 3],
  },
  gallery: {
    subtitle: 'Welcome',
    title: 'Experience Comfort, Elegance, and Exceptional Hospitality',
    description:
      'Welcome to our hotel, where comfort meets refined elegance in a setting designed for relaxation and unforgettable stays.',
    view: 'View',
    categories: [
      { key: 'rooms', label: 'Rooms' },
      { key: 'dining', label: 'Dining' },
      { key: 'facilities', label: 'Facilities' },
    ],
    items: [
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg', category: 'rooms', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6844.jpg', category: 'dining', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6861.jpg', category: 'facilities', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6754.jpg', category: 'rooms', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6856-Bearbeitet.jpg', category: 'dining', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg', category: 'rooms', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6716.jpg', category: 'facilities', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6744.jpg', category: 'rooms', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg', category: 'facilities', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6756.jpg', category: 'rooms', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6846.jpg', category: 'dining', alt: '' },
      { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6726.jpg', category: 'facilities', alt: '' },
    ],
  },
  offers: {
    subtitle: 'Exclusive Deals',
    title: 'Latest Hotel Offers',
    cards: [
      {
        id: 'offer-1',
        badge: '20% OFF',
        title: 'Romantic Stay',
        text: '20% Off Weekend Packages',
        image: '/images/Europaplatz_Fotos/_DSC6629.jpg',
      },
      {
        id: 'offer-2',
        badge: '30% OFF',
        title: 'Early Bird Deal',
        text: 'Save Up to 30% on Rooms',
        image: '/images/Europaplatz_Fotos/_DSC6634.jpg',
      },
      {
        id: 'offer-3',
        badge: '',
        title: 'Family Getaway',
        text: 'Kids Stay & Eat Free',
        image: '/images/Europaplatz_Fotos/_DSC6639.jpg',
      },
    ],
  },
  faq: {
    subtitle: 'Services',
    title: 'Everything You Need to Know About Staying With Us',
    cta: 'Request a quote now',
    items: [
      {
        title: 'Vacant apartments are available for immediate move-in',
        body: 'Available apartments can be occupied immediately, with a smooth move-in process and clear onboarding guidance.',
      },
      {
        title: 'Registration confirmation and housing certificate',
        body: 'We provide the official registration confirmation and housing certificate needed for local registration.',
      },
      {
        title: 'Nameplate on the door at move-in',
        body: 'Your nameplate is prepared ahead of time, so your apartment is ready from day one.',
      },
      {
        title: 'Multicultural orientation, atmosphere, and specialization',
        body: 'A welcoming, multicultural atmosphere tailored to international residents and project teams.',
      },
      {
        title: 'Child-friendly and private atmosphere',
        body: 'Enjoy a child-friendly environment with privacy and quiet living spaces for families.',
      },
      {
        title: 'Visitors possible for only EUR 10 per person per month',
        body: 'Visitors are welcome for a monthly fee of EUR 10 per person, with clear and transparent rules.',
      },
      {
        title: 'Pets possible on request',
        body: 'Pets are possible on request, depending on apartment availability and house rules.',
      },
      {
        title: '24-hour caretaker service',
        body: '24/7 caretaker service ensures quick support whenever you need assistance.',
      },
      {
        title: 'Facility and cleaning service on request',
        body: 'Facility and cleaning services are available on request to keep your stay effortless.',
      },
      {
        title: 'Quiet living without service on request',
        body: 'If preferred, you can opt for disturbance-free living without additional services.',
      },
    ],
  },
};
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
const homeFallbackCache: Partial<Record<ContentLocale, HomeCmsContent>> = {};
const avatarUploadDir = path.resolve(process.cwd(), 'uploads', 'avatars');
const hotelUploadDir = path.resolve(process.cwd(), 'uploads', 'hotels');
const homeUploadDir = path.resolve(process.cwd(), 'uploads', 'home');
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

function sanitizeHomeGalleryCategoryKey(input?: string): string {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return normalized || 'general';
}

function isValidBackgroundPosition(input: string) {
  const value = String(input || '').trim();
  if (!value) return false;
  if (value.length > 48) return false;
  const partRegex = /^(left|center|right|top|bottom|\d{1,3}%|\d{1,4}px)$/i;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return false;
  return parts.every((part) => partRegex.test(part));
}

function isValidLink(input: string) {
  const value = String(input || '').trim();
  if (!value || value.length > 400) return false;
  if (value.startsWith('/')) return true;
  return /^https?:\/\//i.test(value);
}

const genericRoomsCardTitleByLocale: Record<ContentLocale, string> = {
  en: 'Card',
  de: 'Karte',
  tr: 'Kart',
};

const genericRoomsCardDescriptionByLocale: Record<ContentLocale, string> = {
  en: 'Update this card title and description from admin panel.',
  de: 'Aktualisieren Sie Titel und Beschreibung dieser Karte im Admin-Panel.',
  tr: 'Bu kartin basligini ve aciklamasini admin panelden guncelleyin.',
};

function getLocalizedGenericRoomsCards(locale: ContentLocale): HomeCmsContent['rooms']['cards'] {
  const baseImages = [
    '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg',
    '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6744.jpg',
    '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6754.jpg',
    '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6756.jpg',
  ];

  return baseImages.map((image, index) => ({
    title: `${genericRoomsCardTitleByLocale[locale]} ${index + 1}`,
    icon: 'fa fa-home',
    image,
    description: genericRoomsCardDescriptionByLocale[locale],
    highlights: [],
  }));
}

function normalizeHomeContent(input: Partial<HomeCmsContent> | undefined, fallback: HomeCmsContent): HomeCmsContent {
  const fallbackSections = fallback.sections || defaultHomeContent.sections;
  const sections = homeSectionKeys.reduce((acc, key) => {
    acc[key] = {
      enabled: Boolean(input?.sections?.[key]?.enabled ?? fallbackSections[key]?.enabled ?? true),
      order: Number(input?.sections?.[key]?.order) || Number(fallbackSections[key]?.order) || homeSectionKeys.indexOf(key) + 1,
    };
    return acc;
  }, {} as Record<HomeSectionKey, HomeSectionState>);

  const heroSlidesSource = Array.isArray(input?.hero?.slides) ? input?.hero?.slides : fallback.hero.slides;
  const gallerySource = Array.isArray(input?.gallery?.items) ? input?.gallery?.items : fallback.gallery.items;
  const galleryCategoriesSource = Array.isArray(input?.gallery?.categories) ? input?.gallery?.categories : fallback.gallery.categories;
  const offersSource = Array.isArray(input?.offers?.cards) ? input?.offers?.cards : fallback.offers.cards;
  const faqSource = Array.isArray(input?.faq?.items) ? input?.faq?.items : fallback.faq.items;
  const statsSource = Array.isArray(input?.facilities?.statsNumbers) ? input?.facilities?.statsNumbers : fallback.facilities.statsNumbers;
  const facilitiesStatsSource = Array.isArray(input?.facilities?.stats) ? input?.facilities?.stats : fallback.facilities.stats;

  const statsNumbers: [number, number, number] = [
    Number(statsSource[0]) || fallback.facilities.statsNumbers[0],
    Number(statsSource[1]) || fallback.facilities.statsNumbers[1],
    Number(statsSource[2]) || fallback.facilities.statsNumbers[2],
  ];
  const facilitiesStats = [0, 1, 2].map((index) => ({
    label: String(facilitiesStatsSource[index]?.label ?? fallback.facilities.stats[index]?.label ?? '').trim(),
    suffix: String(facilitiesStatsSource[index]?.suffix ?? fallback.facilities.stats[index]?.suffix ?? '').trim(),
  }));
  const galleryCategories = galleryCategoriesSource
    .map((item) => ({
      key: sanitizeHomeGalleryCategoryKey(item?.key),
      label: String(item?.label || '').trim(),
    }))
    .filter((item) => Boolean(item.key) && Boolean(item.label))
    .reduce((acc, item) => {
      if (acc.some((row) => row.key === item.key)) return acc;
      acc.push(item);
      return acc;
    }, [] as HomeGalleryCategory[]);
  const normalizedGalleryCategories = galleryCategories.length > 0 ? galleryCategories : fallback.gallery.categories;
  const defaultGalleryCategory = normalizedGalleryCategories[0]?.key || 'general';

  const normalizedOfferCards = offersSource
    .map((item, index) => {
      const fallbackCard = fallback.offers.cards[index] || fallback.offers.cards[0];
      const normalizedId = String(item?.id || `offer-${index + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
      return {
        id: normalizedId || `offer-${index + 1}`,
        badge: String(item?.badge ?? fallbackCard?.badge ?? '').trim(),
        title: String(item?.title ?? fallbackCard?.title ?? '').trim(),
        text: String(item?.text ?? fallbackCard?.text ?? '').trim(),
        image: String(item?.image || '').trim(),
      };
    })
    .filter((item) => Boolean(item.title) || Boolean(item.text) || Boolean(item.image))
    .slice(0, 4);

  return {
    sections,
    hero: {
      titleLead: String(input?.hero?.titleLead ?? fallback.hero.titleLead ?? '').trim(),
      titleHighlight: String(input?.hero?.titleHighlight ?? fallback.hero.titleHighlight ?? '').trim(),
      titleTail: String(input?.hero?.titleTail ?? fallback.hero.titleTail ?? '').trim(),
      description: String(input?.hero?.description ?? fallback.hero.description ?? '').trim(),
      ctaLocations: String(input?.hero?.ctaLocations ?? fallback.hero.ctaLocations ?? '').trim(),
      ctaLocationsHref: String(input?.hero?.ctaLocationsHref ?? fallback.hero.ctaLocationsHref ?? '').trim(),
      ctaQuote: String(input?.hero?.ctaQuote ?? fallback.hero.ctaQuote ?? '').trim(),
      ctaQuoteHref: String(input?.hero?.ctaQuoteHref ?? fallback.hero.ctaQuoteHref ?? '').trim(),
      slides: heroSlidesSource
        .map((item) => ({
          image: String(item?.image || '').trim(),
          position: String(item?.position || 'center center').trim() || 'center center',
        }))
        .filter((item) => Boolean(item.image)),
    },
    rooms: {
      subtitle: String(input?.rooms?.subtitle ?? fallback.rooms.subtitle ?? '').trim(),
      title: String(input?.rooms?.title ?? fallback.rooms.title ?? '').trim(),
      description: String(input?.rooms?.description ?? fallback.rooms.description ?? '').trim(),
      allAmenities: String(input?.rooms?.allAmenities ?? fallback.rooms.allAmenities ?? '').trim(),
      allAmenitiesHref: String(input?.rooms?.allAmenitiesHref ?? fallback.rooms.allAmenitiesHref ?? '').trim(),
      request: String(input?.rooms?.request ?? fallback.rooms.request ?? '').trim(),
      requestHref: String(input?.rooms?.requestHref ?? fallback.rooms.requestHref ?? '').trim(),
      cards: (Array.isArray(input?.rooms?.cards) ? input?.rooms?.cards : fallback.rooms.cards)
        .map((item) => {
          return {
            title: String(item?.title || '').trim(),
            icon: String(item?.icon || '').trim() || 'fa fa-home',
            image: String(item?.image || '').trim(),
            description: String(item?.description || '').trim(),
            highlights: Array.isArray(item?.highlights)
              ? item.highlights.map((v) => String(v || '').trim()).filter(Boolean)
              : [],
          };
        })
        .filter((item) => Boolean(item.title) || Boolean(item.image) || Boolean(item.description)),
    },
    testimonials: {
      apartmentsCount: Number(input?.testimonials?.apartmentsCount) || Number(fallback.testimonials.apartmentsCount) || 256,
      backgroundImage: String(input?.testimonials?.backgroundImage ?? fallback.testimonials.backgroundImage ?? '').trim(),
      apartments: String(input?.testimonials?.apartments ?? fallback.testimonials.apartments ?? '').trim(),
      locations: String(input?.testimonials?.locations ?? fallback.testimonials.locations ?? '').trim(),
      slides: (Array.isArray(input?.testimonials?.slides) ? input?.testimonials?.slides : fallback.testimonials.slides)
        .map((item) => ({
          badge: String(item?.badge || '').trim(),
          text: String(item?.text || '').trim(),
        }))
        .filter((item) => Boolean(item.badge) || Boolean(item.text)),
    },
    facilities: {
      subtitle: String(input?.facilities?.subtitle ?? fallback.facilities.subtitle ?? '').trim(),
      title: String(input?.facilities?.title ?? fallback.facilities.title ?? '').trim(),
      description: String(input?.facilities?.description ?? fallback.facilities.description ?? '').trim(),
      stats: facilitiesStats,
      primaryImage: String(input?.facilities?.primaryImage ?? fallback.facilities.primaryImage ?? '').trim(),
      secondaryImage: String(input?.facilities?.secondaryImage ?? fallback.facilities.secondaryImage ?? '').trim(),
      statsNumbers,
    },
    gallery: {
      subtitle: String(input?.gallery?.subtitle ?? fallback.gallery.subtitle ?? '').trim(),
      title: String(input?.gallery?.title ?? fallback.gallery.title ?? '').trim(),
      description: String(input?.gallery?.description ?? fallback.gallery.description ?? '').trim(),
      view: String(input?.gallery?.view ?? fallback.gallery.view ?? '').trim(),
      categories: normalizedGalleryCategories,
      items: gallerySource
        .map((item) => ({
          image: String(item?.image || '').trim(),
          category: sanitizeHomeGalleryCategoryKey(item?.category),
          alt: String(item?.alt || '').trim(),
        }))
        .map((item) => ({
          ...item,
          category: normalizedGalleryCategories.some((category) => category.key === item.category) ? item.category : defaultGalleryCategory,
        }))
        .filter((item) => Boolean(item.image)),
    },
    offers: {
      subtitle: String(input?.offers?.subtitle ?? fallback.offers.subtitle ?? '').trim(),
      title: String(input?.offers?.title ?? fallback.offers.title ?? '').trim(),
      cards: normalizedOfferCards.length > 0 ? normalizedOfferCards : fallback.offers.cards,
    },
    faq: {
      subtitle: String(input?.faq?.subtitle ?? fallback.faq.subtitle ?? '').trim(),
      title: String(input?.faq?.title ?? fallback.faq.title ?? '').trim(),
      cta: String(input?.faq?.cta ?? fallback.faq.cta ?? '').trim(),
      items: faqSource
        .map((item) => ({
          title: String(item?.title || '').trim(),
          body: String(item?.body || '').trim(),
        }))
        .filter((item) => Boolean(item.title) || Boolean(item.body))
        .slice(0, 20),
    },
  };
}

function validateHomeContent(input: HomeCmsContent) {
  if (!input.hero.titleLead || !input.hero.titleHighlight || !input.hero.titleTail) {
    return 'Hero title fields are required';
  }
  if (!input.hero.description || !input.hero.ctaLocations || !input.hero.ctaQuote) {
    return 'Hero description and CTA fields are required';
  }
  if (!input.hero.ctaLocationsHref || !input.hero.ctaQuoteHref) {
    return 'Hero CTA link fields are required';
  }
  if (!isValidLink(input.hero.ctaLocationsHref) || !isValidLink(input.hero.ctaQuoteHref)) {
    return 'Hero CTA links must start with "/" or "http(s)://"';
  }
  if (input.hero.slides.length < 1) {
    return 'At least one hero slide is required';
  }
  if (input.hero.slides.length > 8) {
    return 'Hero slide limit is 8';
  }
  for (const slide of input.hero.slides) {
    if (!slide.image) return 'Hero slide image is required';
    if (!isValidBackgroundPosition(slide.position)) {
      return 'Hero slide position is invalid. Example: "center 35%"';
    }
  }

  if (!input.rooms.subtitle || !input.rooms.title || !input.rooms.description) {
    return 'Rooms section title/description fields are required';
  }
  if (!input.rooms.allAmenities || !input.rooms.request) {
    return 'Rooms CTA text fields are required';
  }
  if (!input.rooms.allAmenitiesHref || !input.rooms.requestHref) {
    return 'Rooms CTA link fields are required';
  }
  if (!isValidLink(input.rooms.allAmenitiesHref) || !isValidLink(input.rooms.requestHref)) {
    return 'Rooms CTA links must start with "/" or "http(s)://"';
  }
  if (!Array.isArray(input.rooms.cards) || input.rooms.cards.length < 1) {
    return 'Rooms cards are required (at least 1)';
  }
  if (input.rooms.cards.length > 8) {
    return 'Rooms card limit is 8';
  }
  for (const [index, card] of input.rooms.cards.entries()) {
    if (!card.title || !card.image || !card.description) {
      return `Rooms card ${index + 1}: title, image and description are required`;
    }
  }

  if (!input.testimonials.backgroundImage) {
    return 'Testimonials background image is required';
  }
  if (!input.testimonials.apartments || !input.testimonials.locations) {
    return 'Testimonials label fields are required';
  }
  if (!Array.isArray(input.testimonials.slides) || input.testimonials.slides.length < 1) {
    return 'Testimonials slides are required (at least 1)';
  }
  if (input.testimonials.slides.length > 8) {
    return 'Testimonials slide limit is 8';
  }
  for (const [index, slide] of input.testimonials.slides.entries()) {
    if (!slide.badge || !slide.text) {
      return `Testimonials slide ${index + 1}: badge and text are required`;
    }
  }

  if (!input.facilities.subtitle || !input.facilities.title || !input.facilities.description) {
    return 'Facilities header fields are required';
  }
  if (!Array.isArray(input.facilities.stats) || input.facilities.stats.length !== 3) {
    return 'Facilities stats must include exactly 3 items';
  }
  for (const [index, stat] of input.facilities.stats.entries()) {
    if (!stat.label || !stat.suffix) {
      return `Facilities stat ${index + 1}: label and suffix are required`;
    }
  }
  if (!input.facilities.primaryImage || !input.facilities.secondaryImage) {
    return 'Facilities images are required';
  }
  if (!input.gallery.subtitle || !input.gallery.title || !input.gallery.description || !input.gallery.view) {
    return 'Gallery text fields are required';
  }
  if (!Array.isArray(input.gallery.categories) || input.gallery.categories.length < 1) {
    return 'Gallery categories are required (at least 1)';
  }
  const categoryKeySet = new Set<string>();
  for (const [index, category] of input.gallery.categories.entries()) {
    if (!category.key || !category.label) {
      return `Gallery category ${index + 1}: key and label are required`;
    }
    if (categoryKeySet.has(category.key)) {
      return `Gallery category ${index + 1}: duplicate key "${category.key}"`;
    }
    categoryKeySet.add(category.key);
  }
  if (!Array.isArray(input.gallery.items) || input.gallery.items.length < 1) {
    return 'Gallery items are required (at least 1)';
  }
  if (input.gallery.items.length > 24) {
    return 'Gallery item limit is 24';
  }
  for (const [index, item] of input.gallery.items.entries()) {
    if (!item.image) {
      return `Gallery item ${index + 1}: image is required`;
    }
    if (!item.category || !categoryKeySet.has(item.category)) {
      return `Gallery item ${index + 1}: category is invalid`;
    }
  }
  const categoryItemCounts = new Map<string, number>();
  for (const item of input.gallery.items) {
    const currentCount = categoryItemCounts.get(item.category) || 0;
    const nextCount = currentCount + 1;
    categoryItemCounts.set(item.category, nextCount);
    if (nextCount > 8) {
      return `Gallery category "${item.category}" can contain at most 8 images`;
    }
  }

  if (!input.offers.subtitle || !input.offers.title) {
    return 'Offers subtitle and title are required';
  }
  if (!Array.isArray(input.offers.cards) || input.offers.cards.length < 1) {
    return 'Offers must include at least 1 card';
  }
  if (input.offers.cards.length > 4) {
    return 'Offers card limit is 4';
  }
  const offerIdSet = new Set<string>();
  for (const [index, card] of input.offers.cards.entries()) {
    if (!card.id) {
      return `Offers card ${index + 1}: id is required`;
    }
    if (offerIdSet.has(card.id)) {
      return `Offers card ${index + 1}: duplicate id "${card.id}"`;
    }
    offerIdSet.add(card.id);
    if (!card.title || !card.text || !card.image) {
      return `Offers card ${index + 1}: title, text and image are required`;
    }
  }
  if (!input.faq.subtitle || !input.faq.title || !input.faq.cta) {
    return 'FAQ subtitle, title and CTA are required';
  }
  if (!Array.isArray(input.faq.items) || input.faq.items.length < 1) {
    return 'FAQ must include at least 1 item';
  }
  if (input.faq.items.length > 20) {
    return 'FAQ item limit is 20';
  }
  for (const [index, item] of input.faq.items.entries()) {
    if (!item.title || !item.body) {
      return `FAQ item ${index + 1}: title and body are required`;
    }
  }
  return null;
}

function mergeRoomsCardsWithSharedMedia(
  cards: HomeCmsContent['rooms']['cards'],
  sharedMediaCards: HomeCmsContent['rooms']['cards'],
) {
  return cards.map((card, index) => {
    const shared = sharedMediaCards[index];
    return {
      ...card,
      icon: String(shared?.icon || card.icon || 'fa fa-home').trim() || 'fa fa-home',
      image: String(shared?.image || card.image || '').trim(),
    };
  });
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
        thumbnailUrl: String(item?.thumbnailUrl || '').trim(),
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

async function getLocalizedDefaultHomeContent(locale: ContentLocale): Promise<HomeCmsContent> {
  if (homeFallbackCache[locale]) {
    return JSON.parse(JSON.stringify(homeFallbackCache[locale])) as HomeCmsContent;
  }

  const fallback = JSON.parse(JSON.stringify(defaultHomeContent)) as HomeCmsContent;
  const localePath = path.resolve(process.cwd(), '..', 'meri-boarding-public-fe', 'src', 'i18n', 'locales', `${locale}.json`);
  fallback.rooms.cards = getLocalizedGenericRoomsCards(locale);

  try {
    const raw = await readFile(localePath, 'utf8');
    const parsed = JSON.parse(raw) as {
      hero?: Record<string, unknown>;
      rooms?: Record<string, unknown>;
      testimonials?: { apartments?: unknown; locations?: unknown; slides?: Array<{ badge?: unknown; text?: unknown }> };
      facilities?: {
        subtitle?: unknown;
        title?: unknown;
        description?: unknown;
        stats?: Array<{ label?: unknown; suffix?: unknown }>;
      };
    };
    const hero = parsed?.hero || {};
    const rooms = parsed?.rooms || {};
    const testimonials = parsed?.testimonials || {};
    const facilities = parsed?.facilities || {};
    fallback.hero.titleLead = String(hero.titleLead ?? fallback.hero.titleLead).trim();
    fallback.hero.titleHighlight = String(hero.titleHighlight ?? fallback.hero.titleHighlight).trim();
    fallback.hero.titleTail = String(hero.titleTail ?? fallback.hero.titleTail).trim();
    fallback.hero.description = String(hero.description ?? fallback.hero.description).trim();
    fallback.hero.ctaLocations = String(hero.ctaLocations ?? fallback.hero.ctaLocations).trim();
    fallback.hero.ctaQuote = String(hero.ctaQuote ?? fallback.hero.ctaQuote).trim();
    fallback.rooms.subtitle = String(rooms.subtitle ?? fallback.rooms.subtitle).trim();
    fallback.rooms.title = String(rooms.title ?? fallback.rooms.title).trim();
    fallback.rooms.description = String(rooms.description ?? fallback.rooms.description).trim();
    fallback.rooms.allAmenities = String(rooms.allAmenities ?? fallback.rooms.allAmenities).trim();
    fallback.rooms.request = String(rooms.request ?? fallback.rooms.request).trim();
    fallback.testimonials.apartments = String(testimonials.apartments ?? fallback.testimonials.apartments).trim();
    fallback.testimonials.locations = String(testimonials.locations ?? fallback.testimonials.locations).trim();
    if (Array.isArray(testimonials.slides) && testimonials.slides.length > 0) {
      fallback.testimonials.slides = testimonials.slides
        .map((item) => ({
          badge: String(item?.badge || '').trim(),
          text: String(item?.text || '').trim(),
        }))
        .filter((item) => Boolean(item.badge) && Boolean(item.text))
        .slice(0, 8);
    }
    fallback.facilities.subtitle = String(facilities.subtitle ?? fallback.facilities.subtitle).trim();
    fallback.facilities.title = String(facilities.title ?? fallback.facilities.title).trim();
    fallback.facilities.description = String(facilities.description ?? fallback.facilities.description).trim();
    if (Array.isArray(facilities.stats) && facilities.stats.length > 0) {
      fallback.facilities.stats = facilities.stats
        .map((item) => ({
          label: String(item?.label || '').trim(),
          suffix: String(item?.suffix || '').trim(),
        }))
        .filter((item) => Boolean(item.label) && Boolean(item.suffix))
        .slice(0, 3);
    }
  } catch {
    // Keep hardcoded fallback when locale file cannot be read.
  }

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

async function seedHomeContents() {
  for (const locale of allowedLocales) {
    await getHomeContent(locale);
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

server.get('/api/v1/public/content/home', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHomeContent(locale);
  return reply.send({ key: 'page.home', locale, content });
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

server.get('/api/v1/assets/home/:fileName', async (request, reply) => {
  const params = request.params as { fileName?: string };
  const fileName = sanitizeFilename(String(params.fileName || ''));

  if (!fileName) {
    return reply.code(404).send({ error: 'File not found' });
  }

  const filePath = path.join(homeUploadDir, fileName);

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
    | { locale?: ContentLocale; fileName?: string; dataUrl?: string; thumbnailDataUrl?: string; category?: string; alt?: string }
    | undefined;
  const locale = parseLocale(body?.locale);
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  const thumbnailParsed = body?.thumbnailDataUrl ? parseDataUrl(String(body.thumbnailDataUrl || '')) : null;

  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }

  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }
  if (body?.thumbnailDataUrl && !thumbnailParsed) {
    return reply.code(400).send({ error: 'Invalid thumbnail image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (thumbnailParsed && thumbnailParsed.buffer.length > 2 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Thumbnail size cannot exceed 2MB' });
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
  let thumbnailUrl = '';
  if (thumbnailParsed) {
    const thumbName = `${row.slug}-${Date.now()}-thumb-${requestedName}`.replace(/\.+/g, '.');
    const thumbPath = path.join(hotelUploadDir, thumbName);
    await writeFile(thumbPath, thumbnailParsed.buffer);
    thumbnailUrl = `/api/v1/assets/hotels/${thumbName}`;
  }

  const current = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.[locale]);
  const image: HotelGalleryImage = {
    id: randomBytes(12).toString('hex'),
    url: `/api/v1/assets/hotels/${fileName}`,
    thumbnailUrl: thumbnailUrl || `/api/v1/assets/hotels/${fileName}`,
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
  const localThumb = String(target.thumbnailUrl || '').split('/api/v1/assets/hotels/')[1];
  if (localThumb && localThumb !== localFile) {
    const thumbPath = path.join(hotelUploadDir, sanitizeFilename(localThumb));
    await unlink(thumbPath).catch(() => undefined);
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

server.get('/api/v1/admin/content/home', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHomeContent(locale);

  return reply.send({ key: 'page.home', locale, content });
});

server.put('/api/v1/admin/content/home', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<HomeCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<HomeCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const existing = await contents.findOne({ key: 'page.home', locale });
  const fallbackContent = existing ? normalizeHomeContent(existing.value, defaultHomeContent) : defaultHomeContent;
  const nextContent = normalizeHomeContent(body?.content, fallbackContent);
  const validationError = validateHomeContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.home', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.home',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  // Keep sections shared for all locales.
  if (body?.content?.sections) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent({ ...current, sections: nextContent.sections }, current);
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep rooms card image + icon shared for all locales.
  if (body?.content?.rooms?.cards) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const mergedCards = mergeRoomsCardsWithSharedMedia(current.rooms.cards, nextContent.rooms.cards);
      const patched = normalizeHomeContent(
        {
          ...current,
          rooms: {
            ...current.rooms,
            cards: mergedCards,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep testimonials media + numeric stat shared for all locales.
  if (body?.content?.testimonials) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          testimonials: {
            ...current.testimonials,
            apartmentsCount: nextContent.testimonials.apartmentsCount,
            backgroundImage: nextContent.testimonials.backgroundImage,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep facilities media + numeric stats shared for all locales.
  if (body?.content?.facilities) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          facilities: {
            ...current.facilities,
            primaryImage: nextContent.facilities.primaryImage,
            secondaryImage: nextContent.facilities.secondaryImage,
            statsNumbers: nextContent.facilities.statsNumbers,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep gallery structure (categories + items) shared for all locales.
  if (body?.content?.gallery) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          gallery: {
            ...current.gallery,
            categories: nextContent.gallery.categories,
            items: nextContent.gallery.items,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep offers card images shared for all locales.
  if (body?.content?.offers) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          offers: {
            ...current.offers,
            cards: nextContent.offers.cards.map((card) => {
              const currentCard = current.offers.cards.find((item) => item.id === card.id);
              return {
                ...card,
                badge: String(currentCard?.badge ?? card.badge ?? '').trim(),
                title: String(currentCard?.title ?? card.title ?? '').trim(),
                text: String(currentCard?.text ?? card.text ?? '').trim(),
                image: card.image || currentCard?.image || '',
              };
            }),
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  return reply.send({ ok: true, locale, content: nextContent });
});

server.post('/api/v1/admin/content/home/hero-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload hero images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-hero-${Date.now()}.${parsed.ext}`));
  const fileName = `home-hero-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(homeUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  return reply.send({ ok: true, imageUrl: `/api/v1/assets/home/${fileName}` });
});

server.post('/api/v1/admin/content/home/rooms-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload rooms images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-rooms-${Date.now()}.${parsed.ext}`));
  const fileName = `home-rooms-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(homeUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  return reply.send({ ok: true, imageUrl: `/api/v1/assets/home/${fileName}` });
});

server.post('/api/v1/admin/content/home/testimonials-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload testimonials images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-testimonials-${Date.now()}.${parsed.ext}`));
  const fileName = `home-testimonials-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(homeUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  return reply.send({ ok: true, imageUrl: `/api/v1/assets/home/${fileName}` });
});

server.post('/api/v1/admin/content/home/facilities-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload facilities images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-facilities-${Date.now()}.${parsed.ext}`));
  const fileName = `home-facilities-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(homeUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  return reply.send({ ok: true, imageUrl: `/api/v1/assets/home/${fileName}` });
});

server.post('/api/v1/admin/content/home/gallery-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload gallery images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-gallery-${Date.now()}.${parsed.ext}`));
  const fileName = `home-gallery-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(homeUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  return reply.send({ ok: true, imageUrl: `/api/v1/assets/home/${fileName}` });
});

server.post('/api/v1/admin/content/home/offers-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload offers images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-offers-${Date.now()}.${parsed.ext}`));
  const fileName = `home-offers-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
  const filePath = path.join(homeUploadDir, fileName);
  await writeFile(filePath, parsed.buffer);

  return reply.send({ ok: true, imageUrl: `/api/v1/assets/home/${fileName}` });
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
    await seedHomeContents();
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
