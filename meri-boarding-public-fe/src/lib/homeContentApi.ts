import type { Locale } from '@/i18n/getLocale'
import { getMessages } from '@/i18n/messages'
import { getServerApiBaseUrl, withAssetImageParams, withPublicApiBaseIfNeeded } from '@/lib/apiBaseUrl'

type SectionKey = 'hero' | 'bookingPartners' | 'rooms' | 'testimonials' | 'facilities' | 'gallery' | 'offers' | 'faq'

type CmsHomeContent = {
  sections?: Partial<Record<SectionKey, { enabled?: boolean; order?: number }>>
  hero?: {
    titleLead?: string
    titleHighlight?: string
    titleTail?: string
    description?: string
    ctaLocations?: string
    ctaLocationsHref?: string
    ctaQuote?: string
    ctaQuoteHref?: string
    bookingPartnersTitle?: string
    bookingPartnersDescription?: string
    bookingPartners?: Array<{ name?: string; logo?: string; url?: string; description?: string }>
    slides?: Array<{ image?: string; position?: string }>
  }
  rooms?: {
    subtitle?: string
    title?: string
    description?: string
    allAmenities?: string
    allAmenitiesHref?: string
    request?: string
    requestHref?: string
    cards?: Array<{
      title?: string
      icon?: string
      image?: string
      description?: string
      highlights?: string[]
    }>
  }
  testimonials?: {
    apartmentsCount?: number
    backgroundImage?: string
    apartments?: string
    locations?: string
    slides?: Array<{ badge?: string; text?: string }>
  }
  facilities?: {
    subtitle?: string
    title?: string
    description?: string
    stats?: Array<{ label?: string; suffix?: string }>
    primaryImage?: string
    secondaryImage?: string
    statsNumbers?: [number, number, number]
  }
  gallery?: {
    subtitle?: string
    title?: string
    description?: string
    view?: string
    categories?: Array<{ key?: string; label?: string }>
    items?: Array<{ image?: string; category?: string; alt?: string }>
  }
  offers?: {
    subtitle?: string
    title?: string
    cards?: Array<{ id?: string; badge?: string; title?: string; text?: string; image?: string }>
  }
  faq?: {
    subtitle?: string
    title?: string
    cta?: string
    items?: Array<{ title?: string; body?: string }>
  }
}

export type HomeResolvedContent = {
  sections: Record<SectionKey, { enabled: boolean; order: number }>
  hero: ReturnType<typeof getMessages>['hero'] & {
    ctaLocationsHref: string
    ctaQuoteHref: string
    bookingPartnersTitle: string
    bookingPartnersDescription: string
    bookingPartners: Array<{ name: string; logo: string; url: string; description: string }>
    slides: Array<{ image: string; position: string }>
  }
  rooms: ReturnType<typeof getMessages>['rooms'] & {
    allAmenitiesHref: string
    requestHref: string
    cards: Array<{
      title: string
      icon: string
      image: string
      description: string
      highlights: string[]
    }>
  }
  testimonials: ReturnType<typeof getMessages>['testimonials'] & {
    apartmentsCount: number
    backgroundImage: string
    apartments: string
    locations: string
    slides: Array<{ badge: string; text: string }>
  }
  facilities: ReturnType<typeof getMessages>['facilities'] & {
    subtitle: string
    title: string
    description: string
    stats: Array<{ label: string; suffix: string }>
    primaryImage: string
    secondaryImage: string
    statsNumbers: [number, number, number]
  }
  gallery: ReturnType<typeof getMessages>['gallery'] & {
    subtitle: string
    title: string
    description: string
    view: string
    categories: Array<{ key: string; label: string }>
    items: Array<{ image: string; category: string; alt: string }>
  }
  offers: {
    subtitle: string
    title: string
    cards: Array<{ id: string; badge: string; title: string; text: string; image: string }>
  }
  faq: {
    subtitle: string
    title: string
    cta: string
    items: Array<{ title: string; body: string }>
  }
}

const sectionKeys: SectionKey[] = ['hero', 'bookingPartners', 'rooms', 'testimonials', 'facilities', 'gallery', 'offers', 'faq']
const apiBaseUrl = getServerApiBaseUrl()

function withApiBaseIfNeeded(url: string) {
  return withPublicApiBaseIfNeeded(url)
}

function withOptimizedAsset(url: string, width: number, quality = 80) {
  return withAssetImageParams(withApiBaseIfNeeded(url), { width, quality })
}

function sanitizeCategoryKey(input?: string): string {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return normalized || 'general'
}

function resolveContent(locale: Locale, cms?: CmsHomeContent): HomeResolvedContent {
  const messages = getMessages(locale)

  const sections = sectionKeys.reduce(
    (acc, key) => {
      acc[key] = {
        enabled: Boolean(cms?.sections?.[key]?.enabled ?? true),
        order: Number(cms?.sections?.[key]?.order) || sectionKeys.indexOf(key) + 1
      }
      return acc
    },
    {} as Record<SectionKey, { enabled: boolean; order: number }>
  )

  const slidesSource = Array.isArray(cms?.hero?.slides) ? cms.hero.slides : []
  const bookingPartnersSource = Array.isArray(cms?.hero?.bookingPartners) ? cms.hero.bookingPartners : []
  const slides = slidesSource
    .map(item => ({
      image: withOptimizedAsset(String(item?.image || '').trim(), 2200, 80),
      position: String(item?.position || '').trim() || 'center center'
    }))
    .filter(item => Boolean(item.image))

  const galleryCategorySource = Array.isArray(cms?.gallery?.categories) ? cms.gallery.categories : []
  const galleryCategories = galleryCategorySource
    .map(item => ({
      key: sanitizeCategoryKey(item?.key),
      label: String(item?.label || '').trim()
    }))
    .filter(item => Boolean(item.key) && Boolean(item.label))
  const safeGalleryCategories = galleryCategories.length > 0 ? galleryCategories : []
  const defaultCategoryKey = safeGalleryCategories[0]?.key || 'general'

  const gallerySource = Array.isArray(cms?.gallery?.items) ? cms.gallery.items : []
  const galleryItems = gallerySource
    .map(item => ({
      image: withOptimizedAsset(String(item?.image || '').trim(), 1400, 80),
      category: sanitizeCategoryKey(item?.category),
      alt: String(item?.alt || '').trim()
    }))
    .map(item => ({
      ...item,
      category: safeGalleryCategories.some(category => category.key === item.category) ? item.category : defaultCategoryKey
    }))
    .filter(item => Boolean(item.image))

  const offerSource = Array.isArray(cms?.offers?.cards) ? cms?.offers?.cards : []
  const offerCards = offerSource
    .map((item, index) => ({
      id: String(item?.id || `offer-${index + 1}`).trim() || `offer-${index + 1}`,
      badge: String(item?.badge || '').trim(),
      title: String(item?.title || '').trim(),
      text: String(item?.text || '').trim(),
      image: withOptimizedAsset(String(item?.image || ''), 1400, 80)
    }))
    .filter(item => Boolean(item.title) || Boolean(item.text) || Boolean(item.image))
    .slice(0, 4)

  const statsNumbers = Array.isArray(cms?.facilities?.statsNumbers) ? cms.facilities.statsNumbers : [0, 0, 0]

  return {
    sections,
    hero: {
      ...messages.hero,
      titleLead: String(cms?.hero?.titleLead || ''),
      titleHighlight: String(cms?.hero?.titleHighlight || ''),
      titleTail: String(cms?.hero?.titleTail || ''),
      description: String(cms?.hero?.description || ''),
      ctaLocations: String(cms?.hero?.ctaLocations || ''),
      ctaLocationsHref: String(cms?.hero?.ctaLocationsHref || '/hotels'),
      ctaQuote: String(cms?.hero?.ctaQuote || ''),
      ctaQuoteHref: String(cms?.hero?.ctaQuoteHref || '/contact'),
      bookingPartnersTitle: String(cms?.hero?.bookingPartnersTitle || 'Booking Partners').trim(),
      bookingPartnersDescription: String(cms?.hero?.bookingPartnersDescription || 'Reserve through our trusted platforms and partners.').trim(),
      bookingPartners: bookingPartnersSource
        .map(item => ({
          name: String(item?.name || '').trim(),
          logo: withOptimizedAsset(String(item?.logo || '').trim(), 420, 82),
          url: String(item?.url || '').trim(),
          description: String(item?.description || '').trim()
        }))
        .filter(item => Boolean(item.name) && Boolean(item.logo) && Boolean(item.url))
        .slice(0, 12),
      slides
    },
    rooms: {
      ...messages.rooms,
      subtitle: String(cms?.rooms?.subtitle || ''),
      title: String(cms?.rooms?.title || ''),
      description: String(cms?.rooms?.description || ''),
      allAmenities: String(cms?.rooms?.allAmenities || ''),
      allAmenitiesHref: String(cms?.rooms?.allAmenitiesHref || '/amenities'),
      request: String(cms?.rooms?.request || ''),
      requestHref: String(cms?.rooms?.requestHref || '/contact'),
      cards: (Array.isArray(cms?.rooms?.cards) ? cms?.rooms?.cards : [])
        .slice(0, 8)
        .map(item => ({
          title: String(item?.title || '').trim(),
          icon: String(item?.icon || '').trim() || 'fa fa-home',
          image: withOptimizedAsset(String(item?.image || '').trim(), 1400, 80),
          description: String(item?.description || '').trim(),
          highlights: Array.isArray(item?.highlights) ? item.highlights.map(v => String(v || '').trim()).filter(Boolean) : []
        }))
        .filter(item => Boolean(item.title) && Boolean(item.image))
    },
    testimonials: {
      ...messages.testimonials,
      apartmentsCount: Number(cms?.testimonials?.apartmentsCount) || 0,
      backgroundImage: withOptimizedAsset(String(cms?.testimonials?.backgroundImage || ''), 2200, 80),
      apartments: String(cms?.testimonials?.apartments || ''),
      locations: String(cms?.testimonials?.locations || ''),
      slides: (Array.isArray(cms?.testimonials?.slides) ? cms?.testimonials?.slides : [])
        .map(item => ({
          badge: String(item?.badge || '').trim(),
          text: String(item?.text || '').trim()
        }))
        .filter(item => Boolean(item.badge) && Boolean(item.text))
        .slice(0, 8)
    },
    facilities: {
      ...messages.facilities,
      subtitle: String(cms?.facilities?.subtitle || ''),
      title: String(cms?.facilities?.title || ''),
      description: String(cms?.facilities?.description || ''),
      stats: (Array.isArray(cms?.facilities?.stats) ? cms?.facilities?.stats : [])
        .map(item => ({
          label: String(item?.label || '').trim(),
          suffix: String(item?.suffix || '').trim()
        }))
        .filter(item => Boolean(item.label) && Boolean(item.suffix))
        .slice(0, 3),
      primaryImage: withOptimizedAsset(String(cms?.facilities?.primaryImage || ''), 1600, 80),
      secondaryImage: withOptimizedAsset(String(cms?.facilities?.secondaryImage || ''), 1600, 80),
      statsNumbers: [
        Number(statsNumbers[0]) || 0,
        Number(statsNumbers[1]) || 0,
        Number(statsNumbers[2]) || 0
      ]
    },
    gallery: {
      ...messages.gallery,
      subtitle: String(cms?.gallery?.subtitle || ''),
      title: String(cms?.gallery?.title || ''),
      description: String(cms?.gallery?.description || ''),
      view: String(cms?.gallery?.view || ''),
      categories: safeGalleryCategories,
      items: galleryItems
    },
    offers: {
      subtitle: String(cms?.offers?.subtitle || ''),
      title: String(cms?.offers?.title || ''),
      cards: offerCards
    },
    faq: {
      subtitle: String(cms?.faq?.subtitle || ''),
      title: String(cms?.faq?.title || ''),
      cta: String(cms?.faq?.cta || ''),
      items: (Array.isArray(cms?.faq?.items) ? cms?.faq?.items : [])
        .map(item => ({
          title: String(item?.title || '').trim(),
          body: String(item?.body || '').trim()
        }))
        .filter(item => Boolean(item.title) && Boolean(item.body))
        .slice(0, 20)
    }
  }
}

export async function fetchHomeResolvedContent(locale: Locale): Promise<HomeResolvedContent> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/content/home?locale=${locale}`, {
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch home content (${response.status})`)
    }

    const data = await response.json()
    return resolveContent(locale, data?.content || {})
  } catch (error) {
    console.error('[public-fe] falling back to local home content', error)
    return resolveContent(locale, {})
  }
}
