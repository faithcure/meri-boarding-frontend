export type SectionKey = 'hero' | 'bookingPartners' | 'rooms' | 'testimonials' | 'facilities' | 'gallery' | 'offers' | 'faq'

export type HomeSectionState = {
  enabled: boolean
  order: number
}

export type HomeContent = {
  sections: Record<SectionKey, HomeSectionState>
}

export const sectionKeys: SectionKey[] = ['hero', 'bookingPartners', 'rooms', 'testimonials', 'facilities', 'gallery', 'offers', 'faq']

export const defaultSections = (): Record<SectionKey, HomeSectionState> => ({
  hero: { enabled: true, order: 1 },
  bookingPartners: { enabled: true, order: 2 },
  rooms: { enabled: true, order: 3 },
  testimonials: { enabled: true, order: 4 },
  facilities: { enabled: true, order: 5 },
  gallery: { enabled: true, order: 6 },
  offers: { enabled: true, order: 7 },
  faq: { enabled: true, order: 8 }
})

export const normalizeSections = (input: unknown): Record<SectionKey, HomeSectionState> => {
  const fallback = defaultSections()
  if (!input || typeof input !== 'object') return fallback
  const value = input as Record<string, { enabled?: unknown; order?: unknown }>

  return sectionKeys.reduce(
    (acc, key, index) => {
      acc[key] = {
        enabled: Boolean(value?.[key]?.enabled ?? fallback[key].enabled),
        order: Number(value?.[key]?.order) || index + 1
      }
      return acc
    },
    {} as Record<SectionKey, HomeSectionState>
  )
}

export const reorderKeys = (keys: SectionKey[], from: number, to: number) => {
  if (from < 0 || to < 0 || from === to) return keys
  const next = [...keys]
  const [moved] = next.splice(from, 1)
  if (!moved) return keys
  next.splice(to, 0, moved)
  return next
}
