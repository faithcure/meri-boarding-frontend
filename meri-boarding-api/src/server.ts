import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'meri_boarding';
const tokenSecret = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET || 'change-this-secret';
const tokenHours = Number(process.env.ADMIN_TOKEN_HOURS || 12);
const seedHotelsOnStart = String(process.env.SEED_HOTELS_ON_START || '').trim().toLowerCase() === 'true';
const smtpHost = String(process.env.SMTP_HOST || '').trim();
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE || 'true').trim().toLowerCase() !== 'false';
const smtpStartTls = String(process.env.SMTP_STARTTLS || '').trim().toLowerCase() === 'true';
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || '').trim();
const smtpFrom = String(process.env.SMTP_FROM || smtpUser || 'no-reply@local.test').trim();
const contactNotifyToRaw = String(process.env.CONTACT_FORM_TO || process.env.CONTACT_NOTIFY_TO || '').trim();

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

type ServicesStat = {
  label: string;
  value: string;
  note: string;
};

type ServicesHighlight = {
  icon: string;
  title: string;
  description: string;
};

type AmenitiesLayoutOption = {
  title: string;
  icon: string;
  description: string;
  highlights: string[];
};

type AmenitiesCard = {
  title: string;
  icon: string;
  image: string;
  description: string;
  highlights: string[];
};

type ContactDetailItem = {
  icon: string;
  title: string;
  value: string;
};

type ContactSocialLink = {
  icon: string;
  label: string;
  url: string;
};

type ContactSubmissionStatus = 'unread' | 'read';

type ContactSubmission = {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  country?: string;
  subject?: string;
  message: string;
  locale: ContentLocale;
  sourcePage: string;
  status: ContactSubmissionStatus;
  mailSent: boolean;
  mailError?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
};

type ReservationHelpContact = {
  icon: string;
  value: string;
};

type ReservationInquiryPurpose = {
  value: string;
  label: string;
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

type ServicesCmsContent = {
  hero: {
    subtitle: string;
    title: string;
    home: string;
    crumb: string;
    backgroundImage: string;
  };
  content: {
    heroSubtitle: string;
    heroTitle: string;
    heroDescription: string;
    ctaAvailability: string;
    ctaContact: string;
    stats: ServicesStat[];
    statsImage: string;
    essentialsSubtitle: string;
    essentialsTitle: string;
    highlights: ServicesHighlight[];
    supportSubtitle: string;
    supportTitle: string;
    supportDescription: string;
    ctaStart: string;
    supportList: string[];
  };
};

type AmenitiesCmsContent = {
  hero: {
    subtitle: string;
    title: string;
    home: string;
    crumb: string;
    backgroundImage: string;
  };
  content: {
    layoutSubtitle: string;
    layoutTitle: string;
    layoutDesc: string;
    layoutOptions: AmenitiesLayoutOption[];
    amenitiesSubtitle: string;
    amenitiesTitle: string;
    toggleLabel: string;
    cardView: string;
    listView: string;
    switchHelp: string;
    includedTitle: string;
    request: string;
  };
  data: {
    cards: AmenitiesCard[];
    overviewItems: string[];
  };
};

type ContactCmsContent = {
  hero: {
    subtitle: string;
    title: string;
    home: string;
    crumb: string;
    backgroundImage: string;
  };
  details: {
    subtitle: string;
    title: string;
    description: string;
    items: ContactDetailItem[];
    socials: ContactSocialLink[];
  };
  form: {
    action: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    send: string;
    success: string;
    error: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    messagePlaceholder: string;
  };
};

type ReservationCmsContent = {
  hero: {
    subtitle: string;
    title: string;
    description: string;
    backgroundImage: string;
  };
  crumb: {
    home: string;
    current: string;
  };
  shortStay: {
    subtitle: string;
    title: string;
    description: string;
    helper: string;
  };
  form: {
    action: string;
    checkIn: string;
    checkOut: string;
    boarding: string;
    select: string;
    rooms: string;
    guests: string;
    availability: string;
    boardingOptions: string[];
    roomOptions: string[];
    guestOptions: string[];
  };
  longStay: {
    title: string;
    description: string;
    bullets: string[];
    ctaQuote: string;
    ctaContact: string;
  };
  help: {
    title: string;
    description: string;
    hoursTitle: string;
    hoursDay: string;
    contacts: ReservationHelpContact[];
    hours: string[];
  };
  why: {
    title: string;
    bullets: string[];
  };
  inquiry: {
    action: string;
    subtitle: string;
    title: string;
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phone: string;
    purpose: string;
    nationality: string;
    guests: string;
    rooms: string;
    boarding: string;
    moveIn: string;
    message: string;
    select: string;
    send: string;
    policy: string;
    policyLink: string;
    moveInPlaceholder: string;
    stayPurposes: ReservationInquiryPurpose[];
    boardingOptions: string[];
    roomOptions: string[];
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
const defaultServicesContent: ServicesCmsContent = {
  hero: {
    subtitle: 'Meri Boarding',
    title: 'Services',
    home: 'Home',
    crumb: 'Services',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg',
  },
  content: {
    heroSubtitle: 'Serviced apartments',
    heroTitle: 'Everything you need to live, work, and settle in quickly',
    heroDescription:
      'Meri Boarding provides fully equipped 1-3 room apartments across three locations in Stuttgart. In Hildesheim, about 30 minutes south of Hannover, guests can also stay in smaller buildings with the same serviced-apartment feel.',
    ctaAvailability: 'Request availability',
    ctaContact: 'Contact us',
    stats: [
      { label: 'Total apartments', value: '256+', note: 'Across 3 locations in Stuttgart' },
      { label: 'Apartment layouts', value: '1-3 rooms', note: 'Smart, fully equipped layouts' },
      { label: 'Move-in ready', value: 'Available now', note: 'Immediate occupancy is possible' },
    ],
    statsImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg',
    essentialsSubtitle: 'Included in every stay',
    essentialsTitle: 'Apartment essentials, ready from day one',
    highlights: [
      {
        icon: 'fa fa-home',
        title: 'Furnished living rooms',
        description: 'High-quality furniture, a modern Smart TV with satellite channels, and a sofa that converts into a bed.',
      },
      {
        icon: 'fa fa-bed',
        title: 'Restful bedrooms',
        description: 'Large double beds with quality mattresses, built-in wardrobes, and optional extra beds. Bedding is provided.',
      },
      {
        icon: 'fa fa-cutlery',
        title: 'International-ready kitchens',
        description: 'Fully equipped kitchens with dishwasher, coffee machine, microwave, rice cooker, and Chapati board.',
      },
      {
        icon: 'fa fa-coffee',
        title: 'Dining essentials',
        description: 'Complete sets of dishes, cutlery, and glasses for everyday meals and hosting.',
      },
      {
        icon: 'fa fa-sun-o',
        title: 'Balcony or terrace',
        description: 'Every apartment includes a furnished balcony or terrace to relax outdoors.',
      },
      {
        icon: 'fa fa-wifi',
        title: 'Connectivity',
        description: 'Fast, free WLAN and DSL plus a private phone line with flat-rate calls to German landlines.',
      },
      {
        icon: 'fa fa-refresh',
        title: 'Laundry options',
        description: 'A washing machine in the bathroom or shared laundry with washer and dryer.',
      },
      {
        icon: 'fa fa-child',
        title: 'Family & mobility',
        description: 'Playground, baby and child beds available, plus parking or underground garage on request.',
      },
    ],
    supportSubtitle: 'Resident support',
    supportTitle: 'Services that make moving simple',
    supportDescription:
      'From registration support to on-request services, Meri Boarding makes every stay smooth for individuals, families, and corporate guests.',
    ctaStart: 'Start your stay',
    supportList: [
      'Move-in ready apartments with immediate availability.',
      'Registration support with confirmation documents for residents.',
      'Name door sign prepared on arrival.',
      '24-hour caretaker service on site.',
      'Facility and cleaning services available on request.',
      'Option for disturbance-free living without additional services.',
      'Visitor access can be arranged and pets are welcome on request.',
      'Multicultural, child-friendly, private living atmosphere.',
    ],
  },
};
const defaultAmenitiesContent: AmenitiesCmsContent = {
  hero: {
    subtitle: 'Meri Boarding',
    title: 'Amenities',
    crumb: 'Amenities',
    home: 'Home',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg',
  },
  content: {
    layoutSubtitle: 'Layout options',
    layoutTitle: 'Choose the layout that fits your stay',
    layoutDesc: 'From compact studios to spacious multi-room apartments.',
    layoutOptions: [
      {
        title: 'Studio / 1-Room',
        icon: 'fa fa-square-o',
        description: 'Open-plan layouts that keep everything close and practical.',
        highlights: ['Living and sleeping in one space', 'Compact dining and storage'],
      },
      {
        title: '2-Room',
        icon: 'fa fa-columns',
        description: 'Separate sleeping area for extra privacy and comfort.',
        highlights: ['Distinct living and bedroom zones', 'Ideal for couples or remote work'],
      },
      {
        title: '3-Room',
        icon: 'fa fa-th-large',
        description: 'More space for families, longer stays, or sharing.',
        highlights: ['Extra room for guests or a workspace', 'Great for longer stays'],
      },
    ],
    amenitiesSubtitle: 'All amenities',
    amenitiesTitle: 'Everything included for everyday living',
    toggleLabel: 'View options',
    cardView: 'Card view',
    listView: 'List view',
    switchHelp: 'Switch between card and list views to scan details your way.',
    includedTitle: 'Included in your stay',
    request: 'Request availability',
  },
  data: {
    cards: [
      {
        title: 'Living Room',
        icon: 'fa fa-home',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg',
        description: 'Quality furnishings create a relaxed atmosphere in every apartment, with space to unwind.',
        highlights: ['Smart TV with satellite channels', 'Sofa converts into an extra bed'],
      },
      {
        title: 'Bedroom',
        icon: 'fa fa-bed',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6744.jpg',
        description: 'Large double beds with quality mattresses and built-in wardrobes keep things comfortable and tidy.',
        highlights: ['Extra beds available for adults or children', 'Bedding provided and refreshed on request'],
      },
      {
        title: 'Kitchen',
        icon: 'fa fa-cutlery',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6754.jpg',
        description: 'Fully equipped kitchens for European and international cooking, ready for everyday use.',
        highlights: ['Dishwasher, coffee machine, microwave, rice cooker', 'Chapati board and a shopping trolley for groceries'],
      },
      {
        title: 'Dining Area',
        icon: 'fa fa-coffee',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6756.jpg',
        description: 'Complete dining setup for daily meals and shared moments.',
        highlights: ['Full set of tableware, cutlery, and glasses'],
      },
      {
        title: 'Balcony / Terrace',
        icon: 'fa fa-sun-o',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg',
        description: 'Every apartment includes a furnished balcony or terrace for fresh-air breaks.',
        highlights: ['Plenty of space to relax outdoors'],
      },
      {
        title: 'Connectivity',
        icon: 'fa fa-wifi',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6844.jpg',
        description: 'Stay connected with fast, reliable internet and a private phone line.',
        highlights: ['Free WiFi and DSL', 'Phone line with flat rate to German landlines'],
      },
      {
        title: 'For Little Guests',
        icon: 'fa fa-child',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6846.jpg',
        description: 'Family-friendly touches make traveling with kids easy and comfortable.',
        highlights: ['Play area and playground on site', 'Baby, kids, and extra beds bookable anytime'],
      },
      {
        title: 'Parking / Underground Garage',
        icon: 'fa fa-car',
        image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6856-Bearbeitet.jpg',
        description: 'Parking options are available on request, with added bike facilities in some locations.',
        highlights: ['Parking or underground spaces on request', 'Bicycle parking or storage where available'],
      },
    ],
    overviewItems: [
      'Washing machine in the bathroom or shared laundry room with dryer',
      'Heat-resistant blackout curtains',
      'Playroom with table tennis table',
      'Fully furnished apartments with quality furniture',
    ],
  },
};
const defaultContactContent: ContactCmsContent = {
  hero: {
    subtitle: 'Enjoy Your Stay',
    title: 'Contact',
    crumb: 'Contact',
    home: 'Home',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg',
  },
  details: {
    subtitle: 'Write a Message',
    title: 'Get In Touch',
    description:
      'Have a question, suggestion, or just want to say hi? We are here and happy to hear from you! Office hours are Monday to Friday, 08:00-12:00 and 13:00-17:00. Weekend by appointment.',
    items: [
      { icon: 'icofont-location-pin', title: 'Address', value: 'Flamingoweg 70\nD-70378 Stuttgart' },
      { icon: 'icofont-envelope', title: 'Email', value: 'info@meri-boarding.de' },
      { icon: 'icofont-phone', title: 'Phone', value: '+49 (0) 711 54 89 84 - 0' },
      { icon: 'icofont-brand-whatsapp', title: 'WhatsApp', value: '+49 (0) 152 06419253' },
    ],
    socials: [
      { icon: 'fa-brands fa-instagram', label: 'Instagram', url: 'https://www.instagram.com/' },
      { icon: 'fa-brands fa-linkedin-in', label: 'LinkedIn', url: 'https://www.linkedin.com/' },
    ],
  },
  form: {
    action: 'https://meri-boarding.de/boarding-booking.php',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    message: 'Message',
    send: 'Send Message',
    success: 'Your message has been sent successfully. Refresh this page if you want to send more messages.',
    error: 'Sorry there was an error sending your form.',
    namePlaceholder: 'Your Name',
    emailPlaceholder: 'Your Email',
    phonePlaceholder: 'Your Phone',
    messagePlaceholder: 'Your Message',
  },
};
const defaultReservationContent: ReservationCmsContent = {
  hero: {
    subtitle: 'Plan Your Stay',
    title: 'Reservation',
    description: 'Short stays can be reserved online. For stays longer than 1 month or annual allocations, our team prepares a tailored offer.',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg',
  },
  crumb: {
    home: 'Home',
    current: 'Reservation',
  },
  shortStay: {
    subtitle: 'Short stays (up to 30 nights)',
    title: 'Instant reservation',
    description: 'Ideal for business trips, short-term projects, or temporary housing. Choose your dates and request availability.',
    helper: 'For stays longer than 30 nights, please use the long-stay inquiry below.',
  },
  form: {
    action: '#',
    checkIn: 'Check In',
    checkOut: 'Check Out',
    boarding: 'Boarding House',
    select: 'Please select',
    rooms: 'Rooms',
    guests: 'Guests',
    availability: 'Check Availability',
    boardingOptions: ['Flamingo', 'Europaplatz', 'Hildesheim'],
    roomOptions: ['1', '2', '3', '4', '5'],
    guestOptions: ['1', '2', '3', '4', '5', '6'],
  },
  longStay: {
    title: 'Long-term & corporate stays',
    description:
      'For 1+ month stays, annual allocations, or corporate partnerships (employees and students), we provide tailored offers, fixed rates, and block bookings.',
    bullets: [
      'Dedicated account support for companies and institutions',
      'Flexible move-in dates and custom invoicing',
      'Optional services and quiet-living packages',
    ],
    ctaQuote: 'Request long-stay quote',
    ctaContact: 'Contact the team',
  },
  help: {
    title: 'Need help?',
    description: 'Our reservation team helps with availability, invoicing, and customized agreements for longer stays.',
    hoursTitle: 'Office hours',
    hoursDay: 'Monday - Friday',
    contacts: [
      { icon: 'fa fa-phone', value: '+49 (0) 711 54 89 84 - 0' },
      { icon: 'fa fa-whatsapp', value: '+49 (0) 152 06419253' },
      { icon: 'fa fa-envelope', value: 'info@meri-boarding.de' },
    ],
    hours: ['08:00 - 12:00', '13:00 - 17:00'],
  },
  why: {
    title: 'Why companies book with us',
    bullets: [
      'Reliable capacity for project teams and interns',
      'Furnished apartments ready for immediate move-in',
      'Custom agreements for long-term housing',
    ],
  },
  inquiry: {
    action: 'https://meri-boarding.de/boarding-booking.php',
    subtitle: 'Non-binding booking inquiry',
    title: 'Request a Quote',
    firstName: 'First Name',
    lastName: 'Last Name',
    company: 'Company (for business requests)',
    email: 'Email',
    phone: 'Phone',
    purpose: 'Purpose of Stay',
    nationality: 'Nationality',
    guests: 'Number of Guests',
    rooms: 'Number of Rooms',
    boarding: 'Boarding House',
    moveIn: 'Move-in Date',
    message: 'Your Message',
    select: 'Please select',
    send: 'Send Request',
    policy: '* By submitting this form, you agree that we may use your data to process your request. Information about data protection can be found ',
    policyLink: 'here',
    moveInPlaceholder: 'mm/dd/yyyy',
    stayPurposes: [
      { value: 'Business', label: 'Business' },
      { value: 'Private', label: 'Private' },
      { value: 'Project', label: 'Project' },
      { value: 'Relocation', label: 'Relocation' },
      { value: 'Other', label: 'Other' },
    ],
    boardingOptions: ['Flamingo', 'Europaplatz', 'Hildesheim'],
    roomOptions: ['1', '2', '3'],
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
const servicesFallbackCache: Partial<Record<ContentLocale, ServicesCmsContent>> = {};
const amenitiesFallbackCache: Partial<Record<ContentLocale, AmenitiesCmsContent>> = {};
const contactFallbackCache: Partial<Record<ContentLocale, ContactCmsContent>> = {};
const reservationFallbackCache: Partial<Record<ContentLocale, ReservationCmsContent>> = {};
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

function canManageContent(admin: AdminUser | null) {
  return Boolean(admin && (admin.role === 'super_admin' || admin.role === 'moderator'));
}

function parseEmailList(input: string) {
  const values = String(input || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(values));
}

function extractEmailsFromText(input: string) {
  const text = String(input || '');
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const values = matches.map((item) => item.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(values));
}

function extractEnvelopeAddress(input: string) {
  const value = String(input || '').trim();
  if (!value) return '';
  const bracketMatch = /<([^>]+)>/.exec(value);
  if (bracketMatch?.[1]) return bracketMatch[1].trim();
  if (value.includes('@')) return value;
  return '';
}

async function sendSmtpMail(options: { to: string[]; subject: string; text: string }) {
  if (!smtpHost || !smtpPort || !smtpFrom) {
    return { sent: false, error: 'SMTP config is missing (SMTP_HOST/SMTP_PORT/SMTP_FROM).' };
  }

  const fromEnvelope = extractEnvelopeAddress(smtpFrom);
  if (!fromEnvelope || !fromEnvelope.includes('@')) {
    return { sent: false, error: 'SMTP_FROM must include a valid email address.' };
  }

  const recipients = options.to.map((item) => extractEnvelopeAddress(item)).filter((item) => item.includes('@'));
  if (recipients.length < 1) {
    return { sent: false, error: 'No valid recipient email address found.' };
  }

  if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
    return { sent: false, error: 'Both SMTP_USER and SMTP_PASS must be set together.' };
  }

  try {
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: !smtpSecure && smtpStartTls,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 20_000,
    });

    await transport.sendMail({
      from: smtpFrom,
      to: recipients.join(', '),
      subject: String(options.subject || 'Meri Boarding Contact Submission').trim(),
      text: String(options.text || ''),
    });

    return { sent: true as const };
  } catch (error) {
    return { sent: false as const, error: String((error as Error)?.message || 'SMTP send failed') };
  }
}

function formatContactSubmission(item: ContactSubmission) {
  return {
    id: String(item._id),
    name: item.name,
    email: item.email,
    phone: item.phone,
    country: String(item.country || ''),
    subject: String(item.subject || ''),
    message: item.message,
    locale: item.locale,
    sourcePage: item.sourcePage,
    status: item.status,
    mailSent: item.mailSent,
    mailError: item.mailError || '',
    userAgent: item.userAgent || '',
    ip: item.ip || '',
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    readAt: item.readAt ? item.readAt.toISOString() : '',
  };
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

function normalizeServicesContent(
  input: Partial<ServicesCmsContent> | undefined,
  fallback: ServicesCmsContent,
): ServicesCmsContent {
  const statsSource = Array.isArray(input?.content?.stats) ? input?.content?.stats : fallback.content.stats;
  const highlightsSource = Array.isArray(input?.content?.highlights) ? input?.content?.highlights : fallback.content.highlights;
  const supportListSource = Array.isArray(input?.content?.supportList) ? input?.content?.supportList : fallback.content.supportList;

  const normalizedStats = statsSource
    .map((item) => ({
      label: String(item?.label || '').trim(),
      value: String(item?.value || '').trim(),
      note: String(item?.note || '').trim(),
    }))
    .filter((item) => Boolean(item.label) || Boolean(item.value) || Boolean(item.note))
    .slice(0, 6);

  const normalizedHighlights = highlightsSource
    .map((item) => ({
      icon: String(item?.icon || '').trim() || 'fa fa-home',
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim(),
    }))
    .filter((item) => Boolean(item.icon) || Boolean(item.title) || Boolean(item.description))
    .slice(0, 12);

  const normalizedSupportList = supportListSource
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 20);

  return {
    hero: {
      subtitle: String(input?.hero?.subtitle ?? fallback.hero.subtitle ?? '').trim(),
      title: String(input?.hero?.title ?? fallback.hero.title ?? '').trim(),
      home: String(input?.hero?.home ?? fallback.hero.home ?? '').trim(),
      crumb: String(input?.hero?.crumb ?? fallback.hero.crumb ?? '').trim(),
      backgroundImage: String(input?.hero?.backgroundImage ?? fallback.hero.backgroundImage ?? '').trim(),
    },
    content: {
      heroSubtitle: String(input?.content?.heroSubtitle ?? fallback.content.heroSubtitle ?? '').trim(),
      heroTitle: String(input?.content?.heroTitle ?? fallback.content.heroTitle ?? '').trim(),
      heroDescription: String(input?.content?.heroDescription ?? fallback.content.heroDescription ?? '').trim(),
      ctaAvailability: String(input?.content?.ctaAvailability ?? fallback.content.ctaAvailability ?? '').trim(),
      ctaContact: String(input?.content?.ctaContact ?? fallback.content.ctaContact ?? '').trim(),
      stats: normalizedStats.length > 0 ? normalizedStats : fallback.content.stats,
      statsImage: String(input?.content?.statsImage ?? fallback.content.statsImage ?? '').trim(),
      essentialsSubtitle: String(input?.content?.essentialsSubtitle ?? fallback.content.essentialsSubtitle ?? '').trim(),
      essentialsTitle: String(input?.content?.essentialsTitle ?? fallback.content.essentialsTitle ?? '').trim(),
      highlights: normalizedHighlights.length > 0 ? normalizedHighlights : fallback.content.highlights,
      supportSubtitle: String(input?.content?.supportSubtitle ?? fallback.content.supportSubtitle ?? '').trim(),
      supportTitle: String(input?.content?.supportTitle ?? fallback.content.supportTitle ?? '').trim(),
      supportDescription: String(input?.content?.supportDescription ?? fallback.content.supportDescription ?? '').trim(),
      ctaStart: String(input?.content?.ctaStart ?? fallback.content.ctaStart ?? '').trim(),
      supportList: normalizedSupportList.length > 0 ? normalizedSupportList : fallback.content.supportList,
    },
  };
}

function validateServicesContent(input: ServicesCmsContent) {
  if (!input.hero.subtitle || !input.hero.title || !input.hero.home || !input.hero.crumb) {
    return 'Services hero fields are required';
  }
  if (!input.hero.backgroundImage) {
    return 'Services hero background image is required';
  }
  if (!input.content.heroSubtitle || !input.content.heroTitle || !input.content.heroDescription) {
    return 'Services intro title/description fields are required';
  }
  if (!input.content.ctaAvailability || !input.content.ctaContact || !input.content.ctaStart) {
    return 'Services CTA fields are required';
  }
  if (!Array.isArray(input.content.stats) || input.content.stats.length < 1) {
    return 'Services stats are required (at least 1)';
  }
  if (input.content.stats.length > 6) {
    return 'Services stats limit is 6';
  }
  for (const [index, item] of input.content.stats.entries()) {
    if (!item.label || !item.value || !item.note) {
      return `Services stat ${index + 1}: label, value and note are required`;
    }
  }
  if (!input.content.statsImage) {
    return 'Services stats image is required';
  }
  if (!input.content.essentialsSubtitle || !input.content.essentialsTitle) {
    return 'Services essentials title fields are required';
  }
  if (!Array.isArray(input.content.highlights) || input.content.highlights.length < 1) {
    return 'Services highlights are required (at least 1)';
  }
  if (input.content.highlights.length > 12) {
    return 'Services highlights limit is 12';
  }
  for (const [index, item] of input.content.highlights.entries()) {
    if (!item.icon || !item.title || !item.description) {
      return `Services highlight ${index + 1}: icon, title and description are required`;
    }
  }
  if (!input.content.supportSubtitle || !input.content.supportTitle || !input.content.supportDescription) {
    return 'Services support title/description fields are required';
  }
  if (!Array.isArray(input.content.supportList) || input.content.supportList.length < 1) {
    return 'Services support list is required (at least 1)';
  }
  if (input.content.supportList.length > 20) {
    return 'Services support list item limit is 20';
  }
  for (const [index, item] of input.content.supportList.entries()) {
    if (!item) {
      return `Services support item ${index + 1} is required`;
    }
  }
  return null;
}

function normalizeAmenitiesContent(
  input: Partial<AmenitiesCmsContent> | undefined,
  fallback: AmenitiesCmsContent,
): AmenitiesCmsContent {
  const layoutOptionsSource = Array.isArray(input?.content?.layoutOptions) ? input?.content?.layoutOptions : fallback.content.layoutOptions;
  const cardsSource = Array.isArray(input?.data?.cards) ? input?.data?.cards : fallback.data.cards;
  const overviewItemsSource = Array.isArray(input?.data?.overviewItems) ? input?.data?.overviewItems : fallback.data.overviewItems;

  const normalizedLayoutOptions = layoutOptionsSource
    .map((item) => ({
      title: String(item?.title || '').trim(),
      icon: String(item?.icon || '').trim() || 'fa fa-square-o',
      description: String(item?.description || '').trim(),
      highlights: Array.isArray(item?.highlights) ? item.highlights.map((row) => String(row || '').trim()).filter(Boolean).slice(0, 10) : [],
    }))
    .filter((item) => Boolean(item.title) || Boolean(item.description) || Boolean(item.highlights.length))
    .slice(0, 8);

  const normalizedCards = cardsSource
    .map((item) => ({
      title: String(item?.title || '').trim(),
      icon: String(item?.icon || '').trim() || 'fa fa-home',
      image: String(item?.image || '').trim(),
      description: String(item?.description || '').trim(),
      highlights: Array.isArray(item?.highlights) ? item.highlights.map((row) => String(row || '').trim()).filter(Boolean).slice(0, 10) : [],
    }))
    .filter((item) => Boolean(item.title) || Boolean(item.description) || Boolean(item.image) || Boolean(item.highlights.length))
    .slice(0, 24);

  const normalizedOverviewItems = overviewItemsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 40);

  return {
    hero: {
      subtitle: String(input?.hero?.subtitle ?? fallback.hero.subtitle ?? '').trim(),
      title: String(input?.hero?.title ?? fallback.hero.title ?? '').trim(),
      home: String(input?.hero?.home ?? fallback.hero.home ?? '').trim(),
      crumb: String(input?.hero?.crumb ?? fallback.hero.crumb ?? '').trim(),
      backgroundImage: String(input?.hero?.backgroundImage ?? fallback.hero.backgroundImage ?? '').trim(),
    },
    content: {
      layoutSubtitle: String(input?.content?.layoutSubtitle ?? fallback.content.layoutSubtitle ?? '').trim(),
      layoutTitle: String(input?.content?.layoutTitle ?? fallback.content.layoutTitle ?? '').trim(),
      layoutDesc: String(input?.content?.layoutDesc ?? fallback.content.layoutDesc ?? '').trim(),
      layoutOptions: normalizedLayoutOptions.length > 0 ? normalizedLayoutOptions : fallback.content.layoutOptions,
      amenitiesSubtitle: String(input?.content?.amenitiesSubtitle ?? fallback.content.amenitiesSubtitle ?? '').trim(),
      amenitiesTitle: String(input?.content?.amenitiesTitle ?? fallback.content.amenitiesTitle ?? '').trim(),
      toggleLabel: String(input?.content?.toggleLabel ?? fallback.content.toggleLabel ?? '').trim(),
      cardView: String(input?.content?.cardView ?? fallback.content.cardView ?? '').trim(),
      listView: String(input?.content?.listView ?? fallback.content.listView ?? '').trim(),
      switchHelp: String(input?.content?.switchHelp ?? fallback.content.switchHelp ?? '').trim(),
      includedTitle: String(input?.content?.includedTitle ?? fallback.content.includedTitle ?? '').trim(),
      request: String(input?.content?.request ?? fallback.content.request ?? '').trim(),
    },
    data: {
      cards: normalizedCards.length > 0 ? normalizedCards : fallback.data.cards,
      overviewItems: normalizedOverviewItems.length > 0 ? normalizedOverviewItems : fallback.data.overviewItems,
    },
  };
}

function validateAmenitiesContent(input: AmenitiesCmsContent) {
  if (!input.hero.subtitle || !input.hero.title || !input.hero.home || !input.hero.crumb) {
    return 'Amenities hero fields are required';
  }
  if (!input.hero.backgroundImage) {
    return 'Amenities hero background image is required';
  }
  if (!input.content.layoutSubtitle || !input.content.layoutTitle || !input.content.layoutDesc) {
    return 'Amenities layout title/description fields are required';
  }
  if (!Array.isArray(input.content.layoutOptions) || input.content.layoutOptions.length < 1) {
    return 'Amenities layout options are required (at least 1)';
  }
  if (input.content.layoutOptions.length > 8) {
    return 'Amenities layout option limit is 8';
  }
  for (const [index, option] of input.content.layoutOptions.entries()) {
    if (!option.title || !option.icon || !option.description) {
      return `Amenities layout option ${index + 1}: title, icon and description are required`;
    }
    if (!Array.isArray(option.highlights) || option.highlights.length < 1) {
      return `Amenities layout option ${index + 1}: at least 1 highlight is required`;
    }
    if (option.highlights.length > 10) {
      return `Amenities layout option ${index + 1}: highlight limit is 10`;
    }
    if (option.highlights.some((item) => !item)) {
      return `Amenities layout option ${index + 1}: highlight rows cannot be empty`;
    }
  }
  if (!input.content.amenitiesSubtitle || !input.content.amenitiesTitle) {
    return 'Amenities section title fields are required';
  }
  if (!input.content.toggleLabel || !input.content.cardView || !input.content.listView || !input.content.switchHelp) {
    return 'Amenities toggle/view fields are required';
  }
  if (!input.content.includedTitle || !input.content.request) {
    return 'Amenities included title and request CTA are required';
  }
  if (!Array.isArray(input.data.cards) || input.data.cards.length < 1) {
    return 'Amenities cards are required (at least 1)';
  }
  if (input.data.cards.length > 24) {
    return 'Amenities card limit is 24';
  }
  for (const [index, card] of input.data.cards.entries()) {
    if (!card.title || !card.icon || !card.image || !card.description) {
      return `Amenities card ${index + 1}: title, icon, image and description are required`;
    }
    if (!Array.isArray(card.highlights) || card.highlights.length < 1) {
      return `Amenities card ${index + 1}: at least 1 highlight is required`;
    }
    if (card.highlights.length > 10) {
      return `Amenities card ${index + 1}: highlight limit is 10`;
    }
    if (card.highlights.some((item) => !item)) {
      return `Amenities card ${index + 1}: highlight rows cannot be empty`;
    }
  }
  if (!Array.isArray(input.data.overviewItems) || input.data.overviewItems.length < 1) {
    return 'Amenities overview items are required (at least 1)';
  }
  if (input.data.overviewItems.length > 40) {
    return 'Amenities overview item limit is 40';
  }
  if (input.data.overviewItems.some((item) => !item)) {
    return 'Amenities overview items cannot be empty';
  }
  return null;
}

function normalizeContactContent(
  input: Partial<ContactCmsContent> | undefined,
  fallback: ContactCmsContent,
): ContactCmsContent {
  const detailItemsSource = Array.isArray(input?.details?.items) ? input?.details?.items : fallback.details.items;
  const socialsSource = Array.isArray(input?.details?.socials) ? input?.details?.socials : fallback.details.socials;

  const normalizedItems = detailItemsSource
    .map((item) => ({
      icon: String(item?.icon || '').trim() || 'icofont-info-circle',
      title: String(item?.title || '').trim(),
      value: String(item?.value || '').trim(),
    }))
    .filter((item) => Boolean(item.title) || Boolean(item.value))
    .slice(0, 12);

  const normalizedSocials = socialsSource
    .map((item) => ({
      icon: String(item?.icon || '').trim() || 'fa-brands fa-linkedin-in',
      label: String(item?.label || '').trim(),
      url: String(item?.url || '').trim(),
    }))
    .filter((item) => Boolean(item.label) || Boolean(item.url))
    .slice(0, 12);

  return {
    hero: {
      subtitle: String(input?.hero?.subtitle ?? fallback.hero.subtitle ?? '').trim(),
      title: String(input?.hero?.title ?? fallback.hero.title ?? '').trim(),
      home: String(input?.hero?.home ?? fallback.hero.home ?? '').trim(),
      crumb: String(input?.hero?.crumb ?? fallback.hero.crumb ?? '').trim(),
      backgroundImage: String(input?.hero?.backgroundImage ?? fallback.hero.backgroundImage ?? '').trim(),
    },
    details: {
      subtitle: String(input?.details?.subtitle ?? fallback.details.subtitle ?? '').trim(),
      title: String(input?.details?.title ?? fallback.details.title ?? '').trim(),
      description: String(input?.details?.description ?? fallback.details.description ?? '').trim(),
      items: normalizedItems.length > 0 ? normalizedItems : fallback.details.items,
      socials: normalizedSocials.length > 0 ? normalizedSocials : fallback.details.socials,
    },
    form: {
      action: String(input?.form?.action ?? fallback.form.action ?? '').trim(),
      name: String(input?.form?.name ?? fallback.form.name ?? '').trim(),
      email: String(input?.form?.email ?? fallback.form.email ?? '').trim(),
      phone: String(input?.form?.phone ?? fallback.form.phone ?? '').trim(),
      message: String(input?.form?.message ?? fallback.form.message ?? '').trim(),
      send: String(input?.form?.send ?? fallback.form.send ?? '').trim(),
      success: String(input?.form?.success ?? fallback.form.success ?? '').trim(),
      error: String(input?.form?.error ?? fallback.form.error ?? '').trim(),
      namePlaceholder: String(input?.form?.namePlaceholder ?? fallback.form.namePlaceholder ?? '').trim(),
      emailPlaceholder: String(input?.form?.emailPlaceholder ?? fallback.form.emailPlaceholder ?? '').trim(),
      phonePlaceholder: String(input?.form?.phonePlaceholder ?? fallback.form.phonePlaceholder ?? '').trim(),
      messagePlaceholder: String(input?.form?.messagePlaceholder ?? fallback.form.messagePlaceholder ?? '').trim(),
    },
  };
}

function validateContactContent(input: ContactCmsContent) {
  if (!input.hero.subtitle || !input.hero.title || !input.hero.home || !input.hero.crumb) {
    return 'Contact hero fields are required';
  }
  if (!input.hero.backgroundImage) {
    return 'Contact hero background image is required';
  }
  if (!input.details.subtitle || !input.details.title || !input.details.description) {
    return 'Contact details section fields are required';
  }
  if (!Array.isArray(input.details.items) || input.details.items.length < 1) {
    return 'Contact detail items are required (at least 1)';
  }
  if (input.details.items.length > 12) {
    return 'Contact detail item limit is 12';
  }
  for (const [index, item] of input.details.items.entries()) {
    if (!item.icon || !item.title || !item.value) {
      return `Contact detail item ${index + 1}: icon, title and value are required`;
    }
  }
  if (!Array.isArray(input.details.socials) || input.details.socials.length < 1) {
    return 'Contact social links are required (at least 1)';
  }
  if (input.details.socials.length > 12) {
    return 'Contact social link limit is 12';
  }
  for (const [index, item] of input.details.socials.entries()) {
    if (!item.icon || !item.label || !item.url) {
      return `Contact social link ${index + 1}: icon, label and URL are required`;
    }
  }
  if (
    !input.form.action ||
    !input.form.name ||
    !input.form.email ||
    !input.form.phone ||
    !input.form.message ||
    !input.form.send ||
    !input.form.success ||
    !input.form.error ||
    !input.form.namePlaceholder ||
    !input.form.emailPlaceholder ||
    !input.form.phonePlaceholder ||
    !input.form.messagePlaceholder
  ) {
    return 'Contact form fields are required';
  }
  return null;
}

function normalizeReservationContent(
  input: Partial<ReservationCmsContent> | undefined,
  fallback: ReservationCmsContent,
): ReservationCmsContent {
  const formBoardingOptionsSource = Array.isArray(input?.form?.boardingOptions)
    ? input?.form?.boardingOptions
    : fallback.form.boardingOptions;
  const formRoomOptionsSource = Array.isArray(input?.form?.roomOptions) ? input?.form?.roomOptions : fallback.form.roomOptions;
  const formGuestOptionsSource = Array.isArray(input?.form?.guestOptions) ? input?.form?.guestOptions : fallback.form.guestOptions;
  const longStayBulletsSource = Array.isArray(input?.longStay?.bullets) ? input?.longStay?.bullets : fallback.longStay.bullets;
  const helpContactsSource = Array.isArray(input?.help?.contacts) ? input?.help?.contacts : fallback.help.contacts;
  const helpHoursSource = Array.isArray(input?.help?.hours) ? input?.help?.hours : fallback.help.hours;
  const whyBulletsSource = Array.isArray(input?.why?.bullets) ? input?.why?.bullets : fallback.why.bullets;
  const inquiryPurposesSource = Array.isArray(input?.inquiry?.stayPurposes)
    ? input?.inquiry?.stayPurposes
    : fallback.inquiry.stayPurposes;
  const inquiryBoardingOptionsSource = Array.isArray(input?.inquiry?.boardingOptions)
    ? input?.inquiry?.boardingOptions
    : fallback.inquiry.boardingOptions;
  const inquiryRoomOptionsSource = Array.isArray(input?.inquiry?.roomOptions) ? input?.inquiry?.roomOptions : fallback.inquiry.roomOptions;

  const normalizedFormBoardingOptions = formBoardingOptionsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
  const normalizedFormRoomOptions = formRoomOptionsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
  const normalizedFormGuestOptions = formGuestOptionsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
  const normalizedLongStayBullets = longStayBulletsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
  const normalizedHelpContacts = helpContactsSource
    .map((item) => ({
      icon: String(item?.icon || '').trim() || 'fa fa-info-circle',
      value: String(item?.value || '').trim(),
    }))
    .filter((item) => Boolean(item.value))
    .slice(0, 10);
  const normalizedHelpHours = helpHoursSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 10);
  const normalizedWhyBullets = whyBulletsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
  const normalizedInquiryPurposes = inquiryPurposesSource
    .map((item) => ({
      value: String(item?.value || '').trim(),
      label: String(item?.label || '').trim(),
    }))
    .filter((item) => Boolean(item.value) || Boolean(item.label))
    .slice(0, 15);
  const normalizedInquiryBoardingOptions = inquiryBoardingOptionsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
  const normalizedInquiryRoomOptions = inquiryRoomOptionsSource.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);

  return {
    hero: {
      subtitle: String(input?.hero?.subtitle ?? fallback.hero.subtitle ?? '').trim(),
      title: String(input?.hero?.title ?? fallback.hero.title ?? '').trim(),
      description: String(input?.hero?.description ?? fallback.hero.description ?? '').trim(),
      backgroundImage: String(input?.hero?.backgroundImage ?? fallback.hero.backgroundImage ?? '').trim(),
    },
    crumb: {
      home: String(input?.crumb?.home ?? fallback.crumb.home ?? '').trim(),
      current: String(input?.crumb?.current ?? fallback.crumb.current ?? '').trim(),
    },
    shortStay: {
      subtitle: String(input?.shortStay?.subtitle ?? fallback.shortStay.subtitle ?? '').trim(),
      title: String(input?.shortStay?.title ?? fallback.shortStay.title ?? '').trim(),
      description: String(input?.shortStay?.description ?? fallback.shortStay.description ?? '').trim(),
      helper: String(input?.shortStay?.helper ?? fallback.shortStay.helper ?? '').trim(),
    },
    form: {
      action: String(input?.form?.action ?? fallback.form.action ?? '').trim(),
      checkIn: String(input?.form?.checkIn ?? fallback.form.checkIn ?? '').trim(),
      checkOut: String(input?.form?.checkOut ?? fallback.form.checkOut ?? '').trim(),
      boarding: String(input?.form?.boarding ?? fallback.form.boarding ?? '').trim(),
      select: String(input?.form?.select ?? fallback.form.select ?? '').trim(),
      rooms: String(input?.form?.rooms ?? fallback.form.rooms ?? '').trim(),
      guests: String(input?.form?.guests ?? fallback.form.guests ?? '').trim(),
      availability: String(input?.form?.availability ?? fallback.form.availability ?? '').trim(),
      boardingOptions: normalizedFormBoardingOptions.length > 0 ? normalizedFormBoardingOptions : fallback.form.boardingOptions,
      roomOptions: normalizedFormRoomOptions.length > 0 ? normalizedFormRoomOptions : fallback.form.roomOptions,
      guestOptions: normalizedFormGuestOptions.length > 0 ? normalizedFormGuestOptions : fallback.form.guestOptions,
    },
    longStay: {
      title: String(input?.longStay?.title ?? fallback.longStay.title ?? '').trim(),
      description: String(input?.longStay?.description ?? fallback.longStay.description ?? '').trim(),
      bullets: normalizedLongStayBullets.length > 0 ? normalizedLongStayBullets : fallback.longStay.bullets,
      ctaQuote: String(input?.longStay?.ctaQuote ?? fallback.longStay.ctaQuote ?? '').trim(),
      ctaContact: String(input?.longStay?.ctaContact ?? fallback.longStay.ctaContact ?? '').trim(),
    },
    help: {
      title: String(input?.help?.title ?? fallback.help.title ?? '').trim(),
      description: String(input?.help?.description ?? fallback.help.description ?? '').trim(),
      hoursTitle: String(input?.help?.hoursTitle ?? fallback.help.hoursTitle ?? '').trim(),
      hoursDay: String(input?.help?.hoursDay ?? fallback.help.hoursDay ?? '').trim(),
      contacts: normalizedHelpContacts.length > 0 ? normalizedHelpContacts : fallback.help.contacts,
      hours: normalizedHelpHours.length > 0 ? normalizedHelpHours : fallback.help.hours,
    },
    why: {
      title: String(input?.why?.title ?? fallback.why.title ?? '').trim(),
      bullets: normalizedWhyBullets.length > 0 ? normalizedWhyBullets : fallback.why.bullets,
    },
    inquiry: {
      action: String(input?.inquiry?.action ?? fallback.inquiry.action ?? '').trim(),
      subtitle: String(input?.inquiry?.subtitle ?? fallback.inquiry.subtitle ?? '').trim(),
      title: String(input?.inquiry?.title ?? fallback.inquiry.title ?? '').trim(),
      firstName: String(input?.inquiry?.firstName ?? fallback.inquiry.firstName ?? '').trim(),
      lastName: String(input?.inquiry?.lastName ?? fallback.inquiry.lastName ?? '').trim(),
      company: String(input?.inquiry?.company ?? fallback.inquiry.company ?? '').trim(),
      email: String(input?.inquiry?.email ?? fallback.inquiry.email ?? '').trim(),
      phone: String(input?.inquiry?.phone ?? fallback.inquiry.phone ?? '').trim(),
      purpose: String(input?.inquiry?.purpose ?? fallback.inquiry.purpose ?? '').trim(),
      nationality: String(input?.inquiry?.nationality ?? fallback.inquiry.nationality ?? '').trim(),
      guests: String(input?.inquiry?.guests ?? fallback.inquiry.guests ?? '').trim(),
      rooms: String(input?.inquiry?.rooms ?? fallback.inquiry.rooms ?? '').trim(),
      boarding: String(input?.inquiry?.boarding ?? fallback.inquiry.boarding ?? '').trim(),
      moveIn: String(input?.inquiry?.moveIn ?? fallback.inquiry.moveIn ?? '').trim(),
      message: String(input?.inquiry?.message ?? fallback.inquiry.message ?? '').trim(),
      select: String(input?.inquiry?.select ?? fallback.inquiry.select ?? '').trim(),
      send: String(input?.inquiry?.send ?? fallback.inquiry.send ?? '').trim(),
      policy: String(input?.inquiry?.policy ?? fallback.inquiry.policy ?? '').trim(),
      policyLink: String(input?.inquiry?.policyLink ?? fallback.inquiry.policyLink ?? '').trim(),
      moveInPlaceholder: String(input?.inquiry?.moveInPlaceholder ?? fallback.inquiry.moveInPlaceholder ?? '').trim(),
      stayPurposes: normalizedInquiryPurposes.length > 0 ? normalizedInquiryPurposes : fallback.inquiry.stayPurposes,
      boardingOptions: normalizedInquiryBoardingOptions.length > 0 ? normalizedInquiryBoardingOptions : fallback.inquiry.boardingOptions,
      roomOptions: normalizedInquiryRoomOptions.length > 0 ? normalizedInquiryRoomOptions : fallback.inquiry.roomOptions,
    },
  };
}

function validateReservationContent(input: ReservationCmsContent) {
  if (!input.hero.subtitle || !input.hero.title || !input.hero.description) {
    return 'Reservation hero fields are required';
  }
  if (!input.hero.backgroundImage) {
    return 'Reservation hero background image is required';
  }
  if (!input.crumb.home || !input.crumb.current) {
    return 'Reservation breadcrumb fields are required';
  }
  if (!input.shortStay.subtitle || !input.shortStay.title || !input.shortStay.description || !input.shortStay.helper) {
    return 'Short stay fields are required';
  }
  if (
    !input.form.action ||
    !input.form.checkIn ||
    !input.form.checkOut ||
    !input.form.boarding ||
    !input.form.select ||
    !input.form.rooms ||
    !input.form.guests ||
    !input.form.availability
  ) {
    return 'Reservation form labels are required';
  }
  if (!Array.isArray(input.form.boardingOptions) || input.form.boardingOptions.length < 1) {
    return 'Reservation form boarding options are required (at least 1)';
  }
  if (input.form.boardingOptions.length > 20) {
    return 'Reservation form boarding option limit is 20';
  }
  if (input.form.boardingOptions.some((item) => !item)) {
    return 'Reservation form boarding options cannot be empty';
  }
  if (!Array.isArray(input.form.roomOptions) || input.form.roomOptions.length < 1) {
    return 'Reservation form room options are required (at least 1)';
  }
  if (input.form.roomOptions.length > 20) {
    return 'Reservation form room option limit is 20';
  }
  if (input.form.roomOptions.some((item) => !item)) {
    return 'Reservation form room options cannot be empty';
  }
  if (!Array.isArray(input.form.guestOptions) || input.form.guestOptions.length < 1) {
    return 'Reservation form guest options are required (at least 1)';
  }
  if (input.form.guestOptions.length > 20) {
    return 'Reservation form guest option limit is 20';
  }
  if (input.form.guestOptions.some((item) => !item)) {
    return 'Reservation form guest options cannot be empty';
  }
  if (!input.longStay.title || !input.longStay.description || !input.longStay.ctaQuote || !input.longStay.ctaContact) {
    return 'Long stay fields are required';
  }
  if (!Array.isArray(input.longStay.bullets) || input.longStay.bullets.length < 1) {
    return 'Long stay bullets are required (at least 1)';
  }
  if (input.longStay.bullets.length > 20) {
    return 'Long stay bullet limit is 20';
  }
  if (input.longStay.bullets.some((item) => !item)) {
    return 'Long stay bullets cannot be empty';
  }
  if (!input.help.title || !input.help.description || !input.help.hoursTitle || !input.help.hoursDay) {
    return 'Help card fields are required';
  }
  if (!Array.isArray(input.help.contacts) || input.help.contacts.length < 1) {
    return 'Help contacts are required (at least 1)';
  }
  if (input.help.contacts.length > 10) {
    return 'Help contact limit is 10';
  }
  for (const [index, item] of input.help.contacts.entries()) {
    if (!item.icon || !item.value) {
      return `Help contact ${index + 1}: icon and value are required`;
    }
  }
  if (!Array.isArray(input.help.hours) || input.help.hours.length < 1) {
    return 'Help hours rows are required (at least 1)';
  }
  if (input.help.hours.length > 10) {
    return 'Help hours row limit is 10';
  }
  if (input.help.hours.some((item) => !item)) {
    return 'Help hours rows cannot be empty';
  }
  if (!input.why.title) {
    return 'Why section title is required';
  }
  if (!Array.isArray(input.why.bullets) || input.why.bullets.length < 1) {
    return 'Why section bullets are required (at least 1)';
  }
  if (input.why.bullets.length > 20) {
    return 'Why section bullet limit is 20';
  }
  if (input.why.bullets.some((item) => !item)) {
    return 'Why section bullets cannot be empty';
  }
  if (
    !input.inquiry.action ||
    !input.inquiry.subtitle ||
    !input.inquiry.title ||
    !input.inquiry.firstName ||
    !input.inquiry.lastName ||
    !input.inquiry.company ||
    !input.inquiry.email ||
    !input.inquiry.phone ||
    !input.inquiry.purpose ||
    !input.inquiry.nationality ||
    !input.inquiry.guests ||
    !input.inquiry.rooms ||
    !input.inquiry.boarding ||
    !input.inquiry.moveIn ||
    !input.inquiry.message ||
    !input.inquiry.select ||
    !input.inquiry.send ||
    !input.inquiry.policy ||
    !input.inquiry.policyLink ||
    !input.inquiry.moveInPlaceholder
  ) {
    return 'Inquiry form fields are required';
  }
  if (!Array.isArray(input.inquiry.stayPurposes) || input.inquiry.stayPurposes.length < 1) {
    return 'Inquiry stay purposes are required (at least 1)';
  }
  if (input.inquiry.stayPurposes.length > 15) {
    return 'Inquiry stay purpose limit is 15';
  }
  for (const [index, item] of input.inquiry.stayPurposes.entries()) {
    if (!item.value || !item.label) {
      return `Inquiry stay purpose ${index + 1}: value and label are required`;
    }
  }
  if (!Array.isArray(input.inquiry.boardingOptions) || input.inquiry.boardingOptions.length < 1) {
    return 'Inquiry boarding options are required (at least 1)';
  }
  if (input.inquiry.boardingOptions.length > 20) {
    return 'Inquiry boarding option limit is 20';
  }
  if (input.inquiry.boardingOptions.some((item) => !item)) {
    return 'Inquiry boarding options cannot be empty';
  }
  if (!Array.isArray(input.inquiry.roomOptions) || input.inquiry.roomOptions.length < 1) {
    return 'Inquiry room options are required (at least 1)';
  }
  if (input.inquiry.roomOptions.length > 20) {
    return 'Inquiry room option limit is 20';
  }
  if (input.inquiry.roomOptions.some((item) => !item)) {
    return 'Inquiry room options cannot be empty';
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

server.get('/api/v1/public/content/services', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getServicesContent(locale);
  return reply.send({ key: 'page.services', locale, content });
});

server.get('/api/v1/public/content/amenities', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getAmenitiesContent(locale);
  return reply.send({ key: 'page.amenities', locale, content });
});

server.get('/api/v1/public/content/reservation', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getReservationContent(locale);
  return reply.send({ key: 'page.reservation', locale, content });
});

server.get('/api/v1/public/content/contact', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getContactContent(locale);
  return reply.send({ key: 'page.contact', locale, content });
});

server.post('/api/v1/public/forms/contact', async (request, reply) => {
  const body = request.body as
    | {
        locale?: string;
        sourcePage?: string;
        name?: string;
        email?: string;
        phone?: string;
        country?: string;
        subject?: string;
        message?: string;
      }
    | undefined;

  const locale = parseLocale(body?.locale);
  const sourcePage = String(body?.sourcePage || '/contact').trim().slice(0, 120) || '/contact';
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const phone = String(body?.phone || '').trim();
  const country = String(body?.country || '').trim();
  const subject = String(body?.subject || '').trim();
  const message = String(body?.message || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || name.length < 2) {
    return reply.code(400).send({ error: 'Name must be at least 2 characters.' });
  }
  if (!emailRegex.test(email)) {
    return reply.code(400).send({ error: 'Valid email is required.' });
  }
  if (!phone || phone.length < 5) {
    return reply.code(400).send({ error: 'Phone is required.' });
  }
  if (!country || country.length < 2) {
    return reply.code(400).send({ error: 'Country is required.' });
  }
  if (!subject || subject.length < 2) {
    return reply.code(400).send({ error: 'Subject is required.' });
  }
  if (!message || message.length < 5) {
    return reply.code(400).send({ error: 'Message must be at least 5 characters.' });
  }
  if (message.length > 5000) {
    return reply.code(400).send({ error: 'Message is too long.' });
  }

  const now = new Date();
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = (forwardedFor || request.ip || '').slice(0, 120);
  const userAgent = String(request.headers['user-agent'] || '').trim().slice(0, 300);
  const submission: ContactSubmission = {
    _id: new ObjectId(),
    locale,
    sourcePage,
    name: name.slice(0, 160),
    email: email.slice(0, 200),
    phone: phone.slice(0, 80),
    country: country.slice(0, 120),
    subject: subject.slice(0, 160),
    message,
    status: 'unread',
    mailSent: false,
    userAgent,
    ip,
    createdAt: now,
    updatedAt: now,
  };

  const submissions = await getContactSubmissionsCollection();
  await submissions.insertOne(submission);

  try {
    const recipients = await resolveContactNotificationRecipients(locale);
    const mailResult = await sendSmtpMail({
      to: recipients,
      subject: `New Contact Message - ${submission.subject || 'General'} - ${submission.name}`,
      text: [
        'A new contact form submission has been received.',
        '',
        `Date: ${submission.createdAt.toISOString()}`,
        `Locale: ${submission.locale}`,
        `Source: ${submission.sourcePage}`,
        `Name: ${submission.name}`,
        `Email: ${submission.email}`,
        `Phone: ${submission.phone}`,
        `Country: ${submission.country || '-'}`,
        `Subject: ${submission.subject || '-'}`,
        '',
        'Message:',
        submission.message,
      ].join('\n'),
    });

    if (mailResult.sent) {
      await submissions.updateOne(
        { _id: submission._id },
        { $set: { mailSent: true, mailError: '', updatedAt: new Date() } },
      );
      return reply.code(201).send({ ok: true, id: String(submission._id), mailSent: true });
    }

    await submissions.updateOne(
      { _id: submission._id },
      { $set: { mailSent: false, mailError: String(mailResult.error || 'Mail send failed.'), updatedAt: new Date() } },
    );

    return reply.code(202).send({
      ok: true,
      id: String(submission._id),
      mailSent: false,
      warning: 'Message saved but email notification failed.',
    });
  } catch (error) {
    await submissions.updateOne(
      { _id: submission._id },
      { $set: { mailSent: false, mailError: String((error as Error)?.message || 'Mail send failed.'), updatedAt: new Date() } },
    );
    return reply.code(202).send({
      ok: true,
      id: String(submission._id),
      mailSent: false,
      warning: 'Message saved but email notification failed.',
    });
  }
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
  const hasSuperAdmin = (await admins.countDocuments({ role: 'super_admin', active: true }, { limit: 1 })) > 0;
  const role: AdminRole = hasSuperAdmin ? 'user' : 'super_admin';
  const approved = !hasSuperAdmin;
  const active = !hasSuperAdmin;

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
      role,
      approved,
      active,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return reply.code(409).send({ error: 'This email is already registered' });
  }

  if (!hasSuperAdmin) {
    return reply.code(201).send({ ok: true, message: 'First account created as super_admin.' });
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

server.get('/api/v1/admin/content/services', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getServicesContent(locale);

  return reply.send({ key: 'page.services', locale, content });
});

server.put('/api/v1/admin/content/services', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<ServicesCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<ServicesCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultServicesContent(locale);
  const existing = await contents.findOne({ key: 'page.services', locale });
  const fallbackContent = existing ? normalizeServicesContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeServicesContent(body?.content, fallbackContent);
  const validationError = validateServicesContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.services', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.services',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/content/amenities', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getAmenitiesContent(locale);

  return reply.send({ key: 'page.amenities', locale, content });
});

server.put('/api/v1/admin/content/amenities', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<AmenitiesCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<AmenitiesCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultAmenitiesContent(locale);
  const existing = await contents.findOne({ key: 'page.amenities', locale });
  const fallbackContent = existing ? normalizeAmenitiesContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeAmenitiesContent(body?.content, fallbackContent);
  const validationError = validateAmenitiesContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.amenities', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.amenities',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/content/reservation', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getReservationContent(locale);

  return reply.send({ key: 'page.reservation', locale, content });
});

server.put('/api/v1/admin/content/reservation', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<ReservationCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<ReservationCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultReservationContent(locale);
  const existing = await contents.findOne({ key: 'page.reservation', locale });
  const fallbackContent = existing ? normalizeReservationContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeReservationContent(body?.content, fallbackContent);
  const validationError = validateReservationContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.reservation', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.reservation',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/content/contact', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getContactContent(locale);

  return reply.send({ key: 'page.contact', locale, content });
});

server.put('/api/v1/admin/content/contact', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<ContactCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<ContactCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultContactContent(locale);
  const existing = await contents.findOne({ key: 'page.contact', locale });
  const fallbackContent = existing ? normalizeContactContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeContactContent(body?.content, fallbackContent);
  const validationError = validateContactContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.contact', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.contact',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/contact-submissions', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as
    | {
        status?: string;
        page?: string | number;
        limit?: string | number;
        search?: string;
      }
    | undefined;

  const statusRaw = String(query?.status || 'all').trim().toLowerCase();
  const status = statusRaw === 'read' || statusRaw === 'unread' ? (statusRaw as ContactSubmissionStatus) : 'all';
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(100, Math.max(5, Number(query?.limit || 25)));
  const search = String(query?.search || '').trim().slice(0, 120);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (status !== 'all') {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { country: regex },
      { subject: regex },
      { message: regex },
      { sourcePage: regex },
    ];
  }

  const submissions = await getContactSubmissionsCollection();
  const [items, total, unreadCount, readCount] = await Promise.all([
    submissions.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    submissions.countDocuments(filter),
    submissions.countDocuments({ status: 'unread' }),
    submissions.countDocuments({ status: 'read' }),
  ]);

  return reply.send({
    items: items.map(formatContactSubmission),
    total,
    page,
    limit,
    counts: {
      unread: unreadCount,
      read: readCount,
      all: unreadCount + readCount,
    },
  });
});

server.patch('/api/v1/admin/contact-submissions/:submissionId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const params = request.params as { submissionId?: string } | undefined;
  const submissionId = String(params?.submissionId || '');
  if (!ObjectId.isValid(submissionId)) {
    return reply.code(400).send({ error: 'Invalid submission id' });
  }

  const body = request.body as { status?: string } | undefined;
  const nextStatus = String(body?.status || '').trim().toLowerCase();
  if (nextStatus !== 'read' && nextStatus !== 'unread') {
    return reply.code(400).send({ error: 'Status must be "read" or "unread"' });
  }

  const now = new Date();
  const submissions = await getContactSubmissionsCollection();
  const result =
    nextStatus === 'read'
      ? await submissions.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { status: 'read', readAt: now, updatedAt: now } },
        )
      : await submissions.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { status: 'unread', updatedAt: now }, $unset: { readAt: '' } },
        );

  if (!result.matchedCount) {
    return reply.code(404).send({ error: 'Submission not found' });
  }

  return reply.send({ ok: true });
});

server.delete('/api/v1/admin/contact-submissions/:submissionId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can delete this route' });
  }

  const params = request.params as { submissionId?: string } | undefined;
  const submissionId = String(params?.submissionId || '');
  if (!ObjectId.isValid(submissionId)) {
    return reply.code(400).send({ error: 'Invalid submission id' });
  }

  const submissions = await getContactSubmissionsCollection();
  const result = await submissions.deleteOne({ _id: new ObjectId(submissionId) });
  if (!result.deletedCount) {
    return reply.code(404).send({ error: 'Submission not found' });
  }

  return reply.send({ ok: true });
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

server.post('/api/v1/admin/content/page-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload page images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string; context?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const context = sanitizeFilename(String(body?.context || 'page')).replace(/\.+/g, '-').slice(0, 24) || 'page';
  const requestedName = sanitizeFilename(String(body?.fileName || `${context}-${Date.now()}.${parsed.ext}`));
  const fileName = `${context}-${Date.now()}-${requestedName}`.replace(/\.+/g, '.');
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
    await ensureAdminIndexes();
    await seedHeaderContents();
    await seedHomeContents();
    await seedServicesContents();
    await seedAmenitiesContents();
    await seedReservationContents();
    await seedContactContents();
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
