export type Locale = 'en' | 'de' | 'tr'

export type HeroSlide = {
  image: string
  position: string
}

export type BookingPartner = {
  name: string
  logo: string
  url: string
  description: string
}

export type HeroContent = {
  titleLead: string
  titleHighlight: string
  titleTail: string
  description: string
  ctaLocations: string
  ctaLocationsHref: string
  ctaQuote: string
  ctaQuoteHref: string
  bookingPartners: BookingPartner[]
  slides: HeroSlide[]
}

export type UploadingTarget = { kind: 'slide' | 'partner'; index: number } | null
