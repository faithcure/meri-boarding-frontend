import type { Locale } from '@/i18n/getLocale'
import { getMessages } from '@/i18n/messages'

type SectionKey = 'hero' | 'rooms' | 'testimonials' | 'facilities' | 'gallery' | 'offers' | 'faq'

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
  }
  facilities?: {
    primaryImage?: string
    secondaryImage?: string
    statsNumbers?: [number, number, number]
  }
  gallery?: {
    items?: Array<{ image?: string; category?: 'rooms' | 'dining' | 'facilities'; alt?: string }>
  }
  offers?: {
    cards?: Array<{ image?: string }>
  }
}

export type HomeResolvedContent = {
  sections: Record<SectionKey, { enabled: boolean; order: number }>
  hero: ReturnType<typeof getMessages>['hero'] & {
    ctaLocationsHref: string
    ctaQuoteHref: string
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
  }
  facilities: ReturnType<typeof getMessages>['facilities'] & {
    primaryImage: string
    secondaryImage: string
    statsNumbers: [number, number, number]
  }
  gallery: ReturnType<typeof getMessages>['gallery'] & {
    items: Array<{ image: string; category: 'rooms' | 'dining' | 'facilities'; alt: string }>
  }
  offers: ReturnType<typeof getMessages>['offers'] & {
    cards: Array<ReturnType<typeof getMessages>['offers']['cards'][number] & { image: string }>
  }
  faq: ReturnType<typeof getMessages>['faq']
}

const defaultSlides = [
  { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg', position: 'center 13%' },
  { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg', position: 'center 45%' },
  { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg', position: 'center 35%' },
  { image: '/images/Europaplatz_Fotos/_DSC6714.jpg', position: 'center 35%' }
] as const

const defaultGalleryItems = [
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
  { image: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6726.jpg', category: 'facilities', alt: '' }
] as const

const defaultOfferImages = [
  '/images/Europaplatz_Fotos/_DSC6629.jpg',
  '/images/Europaplatz_Fotos/_DSC6634.jpg',
  '/images/Europaplatz_Fotos/_DSC6639.jpg'
] as const

const sectionKeys: SectionKey[] = ['hero', 'rooms', 'testimonials', 'facilities', 'gallery', 'offers', 'faq']
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000'
const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, '')

function withApiBaseIfNeeded(url: string) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (!value.startsWith('/api/')) return value
  return `${normalizedApiBaseUrl}${value}`
}

function toSafeCategory(input?: string): 'rooms' | 'dining' | 'facilities' {
  if (input === 'rooms' || input === 'dining' || input === 'facilities') return input
  return 'rooms'
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

  const slidesSource = Array.isArray(cms?.hero?.slides) ? cms.hero.slides : defaultSlides
  const slides = slidesSource
    .map(item => ({
      image: withApiBaseIfNeeded(String(item?.image || '').trim()),
      position: String(item?.position || '').trim() || 'center center'
    }))
    .filter(item => Boolean(item.image))

  const gallerySource = Array.isArray(cms?.gallery?.items) ? cms.gallery.items : defaultGalleryItems
  const galleryItems = gallerySource
    .map(item => ({
      image: withApiBaseIfNeeded(String(item?.image || '').trim()),
      category: toSafeCategory(item?.category),
      alt: String(item?.alt || '').trim()
    }))
    .filter(item => Boolean(item.image))

  const offerCards = (messages.offers.cards || []).map((card, index) => ({
    ...card,
    image: withApiBaseIfNeeded(String(cms?.offers?.cards?.[index]?.image || defaultOfferImages[index] || defaultOfferImages[0]))
  }))

  const statsNumbers = Array.isArray(cms?.facilities?.statsNumbers) ? cms.facilities.statsNumbers : [256, 3, 3]

  return {
    sections,
    hero: {
      ...messages.hero,
      titleLead: String(cms?.hero?.titleLead || messages.hero.titleLead),
      titleHighlight: String(cms?.hero?.titleHighlight || messages.hero.titleHighlight),
      titleTail: String(cms?.hero?.titleTail || messages.hero.titleTail),
      description: String(cms?.hero?.description || messages.hero.description),
      ctaLocations: String(cms?.hero?.ctaLocations || messages.hero.ctaLocations),
      ctaLocationsHref: String(cms?.hero?.ctaLocationsHref || '/hotels'),
      ctaQuote: String(cms?.hero?.ctaQuote || messages.hero.ctaQuote),
      ctaQuoteHref: String(cms?.hero?.ctaQuoteHref || '/contact'),
      slides: slides.length > 0 ? slides : [...defaultSlides]
    },
    rooms: {
      ...messages.rooms,
      subtitle: String(cms?.rooms?.subtitle || messages.rooms.subtitle),
      title: String(cms?.rooms?.title || messages.rooms.title),
      description: String(cms?.rooms?.description || messages.rooms.description),
      allAmenities: String(cms?.rooms?.allAmenities || messages.rooms.allAmenities),
      allAmenitiesHref: String(cms?.rooms?.allAmenitiesHref || '/amenities'),
      request: String(cms?.rooms?.request || messages.rooms.request),
      requestHref: String(cms?.rooms?.requestHref || '/contact'),
      cards: (
        Array.isArray(cms?.rooms?.cards) && cms?.rooms?.cards.length > 0
          ? cms?.rooms?.cards
          : (messages as unknown as { amenitiesData?: { cards?: Array<Record<string, unknown>> } }).amenitiesData?.cards || []
      )
        .slice(0, 8)
        .map(item => ({
          title: String(item?.title || '').trim(),
          icon: String(item?.icon || '').trim() || 'fa fa-home',
          image: withApiBaseIfNeeded(String(item?.image || '').trim()),
          description: String(item?.description || '').trim(),
          highlights: Array.isArray(item?.highlights) ? item.highlights.map(v => String(v || '').trim()).filter(Boolean) : []
        }))
        .filter(item => Boolean(item.title) && Boolean(item.image))
    },
    testimonials: {
      ...messages.testimonials,
      apartmentsCount: Number(cms?.testimonials?.apartmentsCount) || 256,
      backgroundImage: withApiBaseIfNeeded(
        String(cms?.testimonials?.backgroundImage || '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg')
      )
    },
    facilities: {
      ...messages.facilities,
      primaryImage: withApiBaseIfNeeded(String(cms?.facilities?.primaryImage || '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg')),
      secondaryImage: withApiBaseIfNeeded(String(cms?.facilities?.secondaryImage || '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg')),
      statsNumbers: [
        Number(statsNumbers[0]) || 256,
        Number(statsNumbers[1]) || 3,
        Number(statsNumbers[2]) || 3
      ]
    },
    gallery: {
      ...messages.gallery,
      items: galleryItems.length > 0 ? galleryItems : [...defaultGalleryItems]
    },
    offers: {
      ...messages.offers,
      cards: offerCards
    },
    faq: messages.faq
  }
}

export async function fetchHomeResolvedContent(locale: Locale): Promise<HomeResolvedContent> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/content/home?locale=${locale}`, {
      next: { revalidate: 60 }
    })
    if (!response.ok) {
      return resolveContent(locale)
    }

    const data = await response.json()
    return resolveContent(locale, data?.content || {})
  } catch {
    return resolveContent(locale)
  }
}
