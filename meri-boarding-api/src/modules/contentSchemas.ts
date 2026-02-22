import type { ObjectId } from 'mongodb';

export type AdminRole = 'super_admin' | 'moderator' | 'user';

export type AdminUser = {
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

export type SessionPayload = {
  userId: string;
  role: AdminRole;
  exp: number;
};

export type ContentLocale = 'de' | 'en' | 'tr';

export type HeaderContent = {
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

export type GeneralSettingsContent = {
  siteIconUrl: string;
  socialLinks: Array<{
    id: string;
    platform: string;
    label: string;
    url: string;
    enabled: boolean;
    order: number;
  }>;
};

export type ContentEntry<T> = {
  _id: ObjectId;
  key: string;
  locale: ContentLocale;
  value: T;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
};

export type HotelGalleryImage = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  category: 'rooms' | 'dining' | 'facilities' | 'other';
  alt: string;
  sortOrder: number;
};

export type HotelFact = {
  text: string;
  icon: string;
};

export type HotelGalleryMeta = {
  sections: Array<{
    title: string;
    features: string[];
  }>;
};

export type HotelLocaleContent = {
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

export type HotelEntity = {
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

export type HomeSectionKey = 'hero' | 'bookingPartners' | 'rooms' | 'testimonials' | 'facilities' | 'gallery' | 'offers' | 'faq';

export type HomeSectionState = {
  enabled: boolean;
  order: number;
};

export type HomeHeroSlide = {
  image: string;
  position: string;
};

export type HomeBookingPartner = {
  name: string;
  logo: string;
  url: string;
  description: string;
};

export type HomeGalleryItem = {
  image: string;
  category: string;
  alt: string;
};

export type HomeGalleryCategory = {
  key: string;
  label: string;
};

export type HomeOfferCard = {
  id: string;
  badge: string;
  title: string;
  text: string;
  image: string;
};

export type HomeTestimonialSlide = {
  badge: string;
  text: string;
};

export type HomeFaqItem = {
  title: string;
  body: string;
};

export type ServicesStat = {
  label: string;
  value: string;
  note: string;
};

export type ServicesHighlight = {
  icon: string;
  title: string;
  description: string;
};

export type AmenitiesLayoutOption = {
  title: string;
  icon: string;
  description: string;
  highlights: string[];
};

export type AmenitiesCard = {
  title: string;
  icon: string;
  image: string;
  description: string;
  highlights: string[];
};

export type ContactDetailItem = {
  icon: string;
  title: string;
  value: string;
};

export type ContactSocialLink = {
  icon: string;
  label: string;
  url: string;
};

export type ContactSubmissionStatus = 'unread' | 'read';

export type ContactSubmission = {
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

export type ReservationHelpContact = {
  icon: string;
  value: string;
};

export type ReservationInquiryPurpose = {
  value: string;
  label: string;
};

export type HomeCmsContent = {
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
    bookingPartnersTitle: string;
    bookingPartnersDescription: string;
    slides: HomeHeroSlide[];
    bookingPartners: HomeBookingPartner[];
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

export type ServicesCmsContent = {
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

export type AmenitiesCmsContent = {
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

export type ContactCmsContent = {
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

export type ReservationCmsContent = {
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

export const allowedLocales: ContentLocale[] = ['de', 'en', 'tr'];
export const allowedGalleryCategories: HotelGalleryImage['category'][] = ['rooms', 'dining', 'facilities', 'other'];
export const allowedSocialPlatforms = [
  'instagram',
  'facebook',
  'x',
  'tiktok',
  'youtube',
  'linkedin',
  'threads',
  'pinterest',
  'telegram',
  'whatsapp',
  'snapchat',
  'discord',
  'reddit',
  'github',
  'medium',
  'vimeo',
] as const;
export const homeSectionKeys: HomeSectionKey[] = ['hero', 'bookingPartners', 'rooms', 'testimonials', 'facilities', 'gallery', 'offers', 'faq'];
export const defaultHomeContent: HomeCmsContent = {
  sections: {
    hero: { enabled: true, order: 1 },
    bookingPartners: { enabled: true, order: 2 },
    rooms: { enabled: true, order: 3 },
    testimonials: { enabled: true, order: 4 },
    facilities: { enabled: true, order: 5 },
    gallery: { enabled: true, order: 6 },
    offers: { enabled: true, order: 7 },
    faq: { enabled: true, order: 8 },
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
    bookingPartnersTitle: 'Booking Partners',
    bookingPartnersDescription: 'Reserve through our trusted platforms and partners.',
    bookingPartners: [],
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
export const defaultServicesContent: ServicesCmsContent = {
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
export const defaultAmenitiesContent: AmenitiesCmsContent = {
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
export const defaultContactContent: ContactCmsContent = {
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
export const defaultReservationContent: ReservationCmsContent = {
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
export const defaultHeaderContent: Record<ContentLocale, HeaderContent> = {
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
export const defaultGeneralSettingsContent: GeneralSettingsContent = {
  siteIconUrl: '/images/icon.webp',
  socialLinks: [
    {
      id: 'instagram',
      platform: 'instagram',
      label: 'Instagram',
      url: 'https://www.instagram.com/',
      enabled: true,
      order: 1,
    },
    {
      id: 'linkedin',
      platform: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/',
      enabled: true,
      order: 2,
    },
  ],
};
