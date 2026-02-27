import { randomBytes } from 'node:crypto'

import type {
  AmenitiesCmsContent,
  ContactCmsContent,
  ContentLocale,
  HomeCmsContent,
  HomeGalleryCategory,
  HomeSectionKey,
  HomeSectionState,
  HotelFact,
  HotelGalleryImage,
  HotelGalleryMeta,
  HotelLocaleContent,
  ReservationCmsContent,
  ServicesCmsContent
} from './contentSchemas.js'

type CreateContentTransformsOptions = {
  defaultHomeContent: HomeCmsContent
  defaultServicesContent: ServicesCmsContent
  defaultAmenitiesContent: AmenitiesCmsContent
  defaultContactContent: ContactCmsContent
  defaultReservationContent: ReservationCmsContent
  homeSectionKeys: HomeSectionKey[]
  sanitizeHomeGalleryCategoryKey: (input?: string) => string
  isValidBackgroundPosition: (input: string) => boolean
  isValidLink: (input: string) => boolean
  parseGalleryCategory: (input?: string) => HotelGalleryImage['category']
}

export function createContentTransforms(options: CreateContentTransformsOptions) {
  const {
    defaultHomeContent,
    defaultServicesContent,
    defaultAmenitiesContent,
    defaultContactContent,
    defaultReservationContent,
    homeSectionKeys,
    sanitizeHomeGalleryCategoryKey,
    isValidBackgroundPosition,
    isValidLink,
    parseGalleryCategory
  } = options

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
  const bookingPartnersSource = Array.isArray(input?.hero?.bookingPartners)
    ? input?.hero?.bookingPartners
    : fallback.hero.bookingPartners;
  const bookingPartnersVisibilitySource = input?.hero?.bookingPartnersVisibility;
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
      bookingPartnersTitle: String(input?.hero?.bookingPartnersTitle ?? fallback.hero.bookingPartnersTitle ?? '').trim().slice(0, 120),
      bookingPartnersDescription: String(input?.hero?.bookingPartnersDescription ?? fallback.hero.bookingPartnersDescription ?? '')
        .trim()
        .slice(0, 320),
      bookingPartnersVisibility: {
        hotelsPage: Boolean(bookingPartnersVisibilitySource?.hotelsPage ?? fallback.hero.bookingPartnersVisibility?.hotelsPage ?? true),
        hotelDetailPage: Boolean(
          bookingPartnersVisibilitySource?.hotelDetailPage ?? fallback.hero.bookingPartnersVisibility?.hotelDetailPage ?? true,
        ),
      },
      bookingPartners: bookingPartnersSource
        .map((item) => ({
          name: String(item?.name || '').trim(),
          logo: String(item?.logo || '').trim(),
          url: String(item?.url || '').trim(),
          description: String(item?.description || '').trim().slice(0, 300),
        }))
        .filter((item) => Boolean(item.name) || Boolean(item.logo) || Boolean(item.url) || Boolean(item.description))
        .slice(0, 12),
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
    videoCta: {
      videoUrl: String(input?.videoCta?.videoUrl ?? fallback.videoCta?.videoUrl ?? '').trim(),
    },
  };
}

function validateHomeContent(input: HomeCmsContent) {
  const isSupportedVideoUrl = (value: string) => {
    const raw = String(value || '').trim();
    if (!raw) return false;
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      return (
        host === 'youtube.com' ||
        host === 'www.youtube.com' ||
        host === 'youtu.be' ||
        host === 'vimeo.com' ||
        host === 'www.vimeo.com' ||
        host === 'player.vimeo.com'
      );
    } catch {
      return false;
    }
  };
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
  if (!Array.isArray(input.hero.bookingPartners)) {
    return 'Hero booking partners must be an array';
  }
  if (input.hero.bookingPartners.length > 12) {
    return 'Hero booking partner limit is 12';
  }
  if (String(input.hero.bookingPartnersTitle || '').trim().length > 120) {
    return 'Booking partners title must be at most 120 characters';
  }
  if (String(input.hero.bookingPartnersDescription || '').trim().length > 320) {
    return 'Booking partners description must be at most 320 characters';
  }
  for (const [index, partner] of input.hero.bookingPartners.entries()) {
    if (!partner.name || !partner.logo || !partner.url) {
      return `Booking partner ${index + 1}: name, logo and link are required`;
    }
    if (!isValidLink(partner.url)) {
      return `Booking partner ${index + 1}: link must start with "/" or "http(s)://"`;
    }
    if (String(partner.description || '').trim().length > 300) {
      return `Booking partner ${index + 1}: description must be at most 300 characters`;
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

  if (!input.videoCta.videoUrl || !isSupportedVideoUrl(input.videoCta.videoUrl)) {
    return 'Video CTA URL must be a valid YouTube or Vimeo link';
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


  return {
    getLocalizedGenericRoomsCards,
    normalizeHomeContent,
    validateHomeContent,
    normalizeServicesContent,
    validateServicesContent,
    normalizeAmenitiesContent,
    validateAmenitiesContent,
    normalizeContactContent,
    validateContactContent,
    normalizeReservationContent,
    validateReservationContent,
    mergeRoomsCardsWithSharedMedia,
    normalizeHotelFact,
    normalizeGalleryMeta,
    normalizeGalleryMetaMap,
    normalizeHotelLocaleContent
  }
}
