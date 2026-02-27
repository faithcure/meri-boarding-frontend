import type { HeroContent } from './types'

export const localeOptions = ['en', 'de', 'tr'] as const
export const maxSlides = 8
export const maxPartners = 12
export const positionPresets = ['center center', 'center 20%', 'center 35%', 'center 50%', 'left center', 'right center', 'top center', 'bottom center']

export const isValidLink = (href: string) => href.startsWith('/') || /^https?:\/\//i.test(href)

export const isValidPosition = (value: string) => {
  const text = String(value || '').trim()
  const partRegex = /^(left|center|right|top|bottom|\d{1,3}%|\d{1,4}px)$/i
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length < 1 || parts.length > 2) return false
  return parts.every(part => partRegex.test(part))
}

export const normalizeHero = (input: unknown): HeroContent => {
  const value = (input || {}) as Partial<HeroContent>
  const slides = Array.isArray(value.slides)
    ? value.slides
        .map(item => ({
          image: String(item?.image || '').trim(),
          position: String(item?.position || '').trim() || 'center center'
        }))
        .filter(item => Boolean(item.image))
    : []

  const bookingPartners = Array.isArray(value.bookingPartners)
    ? value.bookingPartners
        .map(item => ({
          name: String(item?.name || '').trim(),
          logo: String(item?.logo || '').trim(),
          url: String(item?.url || '').trim(),
          description: String((item as { description?: unknown })?.description || '').trim()
        }))
        .filter(item => Boolean(item.name) || Boolean(item.logo) || Boolean(item.url) || Boolean(item.description))
        .slice(0, maxPartners)
    : []

  return {
    titleLead: String(value.titleLead || '').trim(),
    titleHighlight: String(value.titleHighlight || '').trim(),
    titleTail: String(value.titleTail || '').trim(),
    description: String(value.description || '').trim(),
    ctaLocations: String(value.ctaLocations || '').trim(),
    ctaLocationsHref: String(value.ctaLocationsHref || '/hotels').trim(),
    ctaQuote: String(value.ctaQuote || '').trim(),
    ctaQuoteHref: String(value.ctaQuoteHref || '/contact').trim(),
    bookingPartnersVisibility: {
      hotelsPage: Boolean((value as { bookingPartnersVisibility?: { hotelsPage?: unknown } }).bookingPartnersVisibility?.hotelsPage ?? true),
      hotelDetailPage: Boolean(
        (value as { bookingPartnersVisibility?: { hotelDetailPage?: unknown } }).bookingPartnersVisibility?.hotelDetailPage ?? true
      )
    },
    bookingPartners,
    slides
  }
}

export const validateHero = (value: HeroContent) => {
  if (!value.titleLead || !value.titleHighlight || !value.titleTail) return 'Hero title fields are required.'
  if (!value.description || !value.ctaLocations || !value.ctaQuote) return 'Description and CTA fields are required.'
  if (!value.ctaLocationsHref || !value.ctaQuoteHref) return 'CTA link fields are required.'
  if (!isValidLink(value.ctaLocationsHref) || !isValidLink(value.ctaQuoteHref)) {
    return 'CTA links must start with "/" or "http(s)://".'
  }
  if (value.slides.length < 1) return 'At least one slide is required.'
  if (value.slides.length > maxSlides) return `Slide limit is ${maxSlides}.`
  for (const [index, slide] of value.slides.entries()) {
    if (!slide.image) return `Slide ${index + 1}: image is required.`
    if (!isValidPosition(slide.position)) return `Slide ${index + 1}: position is invalid (e.g. "center 35%").`
  }
  if (value.bookingPartners.length > maxPartners) return `Booking partner limit is ${maxPartners}.`
  for (const [index, partner] of value.bookingPartners.entries()) {
    if (!partner.name || !partner.logo || !partner.url) {
      return `Booking partner ${index + 1}: name, logo and link are required.`
    }
    if (!isValidLink(partner.url)) {
      return `Booking partner ${index + 1}: link must start with "/" or "http(s)://".`
    }
    if (partner.description.length > 300) {
      return `Booking partner ${index + 1}: description must be at most 300 characters.`
    }
  }
  return null
}

export const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })

export const resolvePreviewUrl = (rawUrl: string, apiBaseUrl: string, publicBaseUrl: string) => {
  const value = String(rawUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) return value
  if (value.startsWith('/api/')) return `${apiBaseUrl}${value}`
  if (value.startsWith('/')) return `${publicBaseUrl}${value}`
  return value
}
