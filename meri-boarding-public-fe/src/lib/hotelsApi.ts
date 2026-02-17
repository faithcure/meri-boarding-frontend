import type { Locale } from '@/i18n/getLocale'

export type PublicHotelFact = {
  text: string
  icon: string
}

export type PublicHotelListItem = {
  id: string
  slug: string
  order: number
  active: boolean
  available: boolean
  name: string
  location: string
  shortDescription: string
  facts: PublicHotelFact[]
  coverImageUrl: string
}

export type PublicHotelDetail = {
  id: string
  slug: string
  order: number
  active: boolean
  available: boolean
  coverImageUrl: string
  locale: 'en' | 'de' | 'tr'
  name: string
  location: string
  shortDescription: string
  facts: PublicHotelFact[]
  heroTitle: string
  heroSubtitle: string
  description: string[]
  amenitiesTitle: string
  highlights: string[]
  gallery: Array<{
    id: string
    url: string
    thumbnailUrl?: string
    category: 'rooms' | 'dining' | 'facilities' | 'other'
    alt: string
    sortOrder: number
    meta?: {
      sections: Array<{
        title: string
        features: string[]
      }>
    }
  }>
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000'
const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, '')

function withApiBaseIfNeeded(url: string) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (!value.startsWith('/api/')) return value
  return `${normalizedApiBaseUrl}${value}`
}

function normalizeFact(input: unknown): PublicHotelFact {
  if (typeof input === 'string') {
    return { text: input.trim(), icon: 'fa fa-check' }
  }

  if (input && typeof input === 'object') {
    const maybeFact = input as { text?: unknown; icon?: unknown; value?: unknown }

    return {
      text: String(maybeFact.text ?? maybeFact.value ?? '').trim(),
      icon: String(maybeFact.icon ?? '').trim() || 'fa fa-check'
    }
  }

  return { text: '', icon: 'fa fa-check' }
}

function normalizeGalleryMeta(input: unknown) {
  if (!input || typeof input !== 'object') {
    return { sections: [] as Array<{ title: string; features: string[] }> }
  }

  const value = input as { section?: unknown; features?: unknown; sections?: unknown }
  const sections = Array.isArray(value.sections)
    ? value.sections
        .map(item => {
          if (!item || typeof item !== 'object') return null
          const section = item as { title?: unknown; features?: unknown }
          return {
            title: String(section.title ?? '').trim(),
            features: Array.isArray(section.features) ? section.features.map(feature => String(feature || '').trim()).filter(Boolean) : []
          }
        })
        .filter((item): item is { title: string; features: string[] } => Boolean(item))
    : []

  if (sections.length > 0) {
    return { sections }
  }

  return {
    sections:
      String(value.section ?? '').trim() || (Array.isArray(value.features) ? value.features.length : 0) > 0
        ? [
            {
              title: String(value.section ?? '').trim(),
              features: Array.isArray(value.features) ? value.features.map(item => String(item || '').trim()).filter(Boolean) : []
            }
          ]
        : []
  }
}

export async function fetchPublicHotels(locale: Locale): Promise<PublicHotelListItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/public/hotels?locale=${locale}`, {
    cache: 'no-store'
  })
  if (!response.ok) {
    return []
  }

  const data = await response.json()
  const hotels = (data?.hotels || []) as PublicHotelListItem[]

  return hotels.map(item => ({
    ...item,
    facts: Array.isArray(item.facts) ? item.facts.map(fact => normalizeFact(fact)).filter(fact => Boolean(fact.text)) : [],
    coverImageUrl: withApiBaseIfNeeded(item.coverImageUrl)
  }))
}

export async function fetchPublicHotelBySlug(locale: Locale, slug: string): Promise<PublicHotelDetail | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/public/hotels/${slug}?locale=${locale}`, {
    cache: 'no-store'
  })
  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const hotel = (data?.hotel || null) as PublicHotelDetail | null
  if (!hotel) return null

  return {
    ...hotel,
    facts: Array.isArray(hotel.facts) ? hotel.facts.map(fact => normalizeFact(fact)).filter(fact => Boolean(fact.text)) : [],
    coverImageUrl: withApiBaseIfNeeded(hotel.coverImageUrl),
    gallery: (hotel.gallery || []).map(image => ({
      ...image,
      url: withApiBaseIfNeeded(image.url),
      thumbnailUrl: withApiBaseIfNeeded(String(image.thumbnailUrl || image.url || '')),
      meta: normalizeGalleryMeta(image.meta)
    }))
  }
}
