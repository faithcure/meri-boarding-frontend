export type Locale = 'en' | 'de' | 'tr'

export type ServicesHeroContent = {
  subtitle: string
  title: string
  home: string
  crumb: string
  backgroundImage: string
}

export type ServicesStat = {
  label: string
  value: string
  note: string
}

export type ServicesHighlight = {
  icon: string
  title: string
  description: string
}

export type ServicesBodyContent = {
  heroSubtitle: string
  heroTitle: string
  heroDescription: string
  ctaAvailability: string
  ctaContact: string
  stats: ServicesStat[]
  statsImage: string
  essentialsSubtitle: string
  essentialsTitle: string
  highlights: ServicesHighlight[]
  supportSubtitle: string
  supportTitle: string
  supportDescription: string
  ctaStart: string
  supportList: string[]
}

export type ServicesContent = {
  hero: ServicesHeroContent
  content: ServicesBodyContent
}

export type ServicesErrors = {
  heroSubtitle?: string
  heroTitle?: string
  heroHome?: string
  heroCrumb?: string
  heroBackgroundImage?: string
  introSubtitle?: string
  introTitle?: string
  introDescription?: string
  ctaAvailability?: string
  ctaContact?: string
  ctaStart?: string
  statsImage?: string
  essentialsSubtitle?: string
  essentialsTitle?: string
  supportSubtitle?: string
  supportTitle?: string
  supportDescription?: string
  stats?: string
  highlights?: string
  supportList?: string
  statsByIndex: Record<number, { label?: string; value?: string; note?: string }>
  highlightsByIndex: Record<number, { icon?: string; title?: string; description?: string }>
  supportListByIndex: Record<number, { item?: string }>
}

export const localeOptions: Locale[] = ['en', 'de', 'tr']
export const maxStats = 6
export const maxHighlights = 12
export const maxSupportItems = 20

export const createDefaultServices = (): ServicesContent => ({
  hero: {
    subtitle: '',
    title: '',
    home: '',
    crumb: '',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg'
  },
  content: {
    heroSubtitle: '',
    heroTitle: '',
    heroDescription: '',
    ctaAvailability: '',
    ctaContact: '',
    stats: [{ label: '', value: '', note: '' }],
    statsImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg',
    essentialsSubtitle: '',
    essentialsTitle: '',
    highlights: [{ icon: 'fa fa-home', title: '', description: '' }],
    supportSubtitle: '',
    supportTitle: '',
    supportDescription: '',
    ctaStart: '',
    supportList: ['']
  }
})

export const normalizeServices = (input: unknown): ServicesContent => {
  const value = (input || {}) as Partial<ServicesContent>

  const stats = Array.isArray(value?.content?.stats)
    ? value.content.stats
        .map(item => ({
          label: String(item?.label || '').trim(),
          value: String(item?.value || '').trim(),
          note: String(item?.note || '').trim()
        }))
        .filter(item => Boolean(item.label) || Boolean(item.value) || Boolean(item.note))
        .slice(0, maxStats)
    : []

  const highlights = Array.isArray(value?.content?.highlights)
    ? value.content.highlights
        .map(item => ({
          icon: String(item?.icon || '').trim() || 'fa fa-home',
          title: String(item?.title || '').trim(),
          description: String(item?.description || '').trim()
        }))
        .filter(item => Boolean(item.icon) || Boolean(item.title) || Boolean(item.description))
        .slice(0, maxHighlights)
    : []

  const supportList = Array.isArray(value?.content?.supportList)
    ? value.content.supportList.map(item => String(item || '').trim()).filter(Boolean).slice(0, maxSupportItems)
    : []

  return {
    hero: {
      subtitle: String(value?.hero?.subtitle || '').trim(),
      title: String(value?.hero?.title || '').trim(),
      home: String(value?.hero?.home || '').trim(),
      crumb: String(value?.hero?.crumb || '').trim(),
      backgroundImage: String(value?.hero?.backgroundImage || '').trim()
    },
    content: {
      heroSubtitle: String(value?.content?.heroSubtitle || '').trim(),
      heroTitle: String(value?.content?.heroTitle || '').trim(),
      heroDescription: String(value?.content?.heroDescription || '').trim(),
      ctaAvailability: String(value?.content?.ctaAvailability || '').trim(),
      ctaContact: String(value?.content?.ctaContact || '').trim(),
      stats: stats.length > 0 ? stats : [{ label: '', value: '', note: '' }],
      statsImage: String(value?.content?.statsImage || '').trim(),
      essentialsSubtitle: String(value?.content?.essentialsSubtitle || '').trim(),
      essentialsTitle: String(value?.content?.essentialsTitle || '').trim(),
      highlights: highlights.length > 0 ? highlights : [{ icon: 'fa fa-home', title: '', description: '' }],
      supportSubtitle: String(value?.content?.supportSubtitle || '').trim(),
      supportTitle: String(value?.content?.supportTitle || '').trim(),
      supportDescription: String(value?.content?.supportDescription || '').trim(),
      ctaStart: String(value?.content?.ctaStart || '').trim(),
      supportList: supportList.length > 0 ? supportList : ['']
    }
  }
}

export const validateServices = (value: ServicesContent): ServicesErrors => {
  const errors: ServicesErrors = {
    statsByIndex: {},
    highlightsByIndex: {},
    supportListByIndex: {}
  }

  if (!value.hero.subtitle.trim()) errors.heroSubtitle = 'Hero subtitle is required.'
  if (!value.hero.title.trim()) errors.heroTitle = 'Hero title is required.'
  if (!value.hero.home.trim()) errors.heroHome = 'Breadcrumb home text is required.'
  if (!value.hero.crumb.trim()) errors.heroCrumb = 'Breadcrumb current text is required.'
  if (!value.hero.backgroundImage.trim()) errors.heroBackgroundImage = 'Hero background image is required.'

  if (!value.content.heroSubtitle.trim()) errors.introSubtitle = 'Intro subtitle is required.'
  if (!value.content.heroTitle.trim()) errors.introTitle = 'Intro title is required.'
  if (!value.content.heroDescription.trim()) errors.introDescription = 'Intro description is required.'
  if (!value.content.ctaAvailability.trim()) errors.ctaAvailability = 'Availability CTA is required.'
  if (!value.content.ctaContact.trim()) errors.ctaContact = 'Contact CTA is required.'
  if (!value.content.ctaStart.trim()) errors.ctaStart = 'Start CTA is required.'

  if (!value.content.statsImage.trim()) errors.statsImage = 'Stats image is required.'

  if (!Array.isArray(value.content.stats) || value.content.stats.length < 1) {
    errors.stats = 'At least 1 stats row is required.'
  }
  if (Array.isArray(value.content.stats) && value.content.stats.length > maxStats) {
    errors.stats = `Stats row limit is ${maxStats}.`
  }
  value.content.stats.forEach((item, index) => {
    const rowError: { label?: string; value?: string; note?: string } = {}
    if (!item.label.trim()) rowError.label = 'Label is required.'
    if (!item.value.trim()) rowError.value = 'Value is required.'
    if (!item.note.trim()) rowError.note = 'Note is required.'
    if (rowError.label || rowError.value || rowError.note) errors.statsByIndex[index] = rowError
  })

  if (!value.content.essentialsSubtitle.trim()) errors.essentialsSubtitle = 'Essentials subtitle is required.'
  if (!value.content.essentialsTitle.trim()) errors.essentialsTitle = 'Essentials title is required.'

  if (!Array.isArray(value.content.highlights) || value.content.highlights.length < 1) {
    errors.highlights = 'At least 1 highlight row is required.'
  }
  if (Array.isArray(value.content.highlights) && value.content.highlights.length > maxHighlights) {
    errors.highlights = `Highlight row limit is ${maxHighlights}.`
  }
  value.content.highlights.forEach((item, index) => {
    const rowError: { icon?: string; title?: string; description?: string } = {}
    if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
    if (!item.title.trim()) rowError.title = 'Title is required.'
    if (!item.description.trim()) rowError.description = 'Description is required.'
    if (rowError.icon || rowError.title || rowError.description) errors.highlightsByIndex[index] = rowError
  })

  if (!value.content.supportSubtitle.trim()) errors.supportSubtitle = 'Support subtitle is required.'
  if (!value.content.supportTitle.trim()) errors.supportTitle = 'Support title is required.'
  if (!value.content.supportDescription.trim()) errors.supportDescription = 'Support description is required.'

  if (!Array.isArray(value.content.supportList) || value.content.supportList.length < 1) {
    errors.supportList = 'At least 1 support list row is required.'
  }
  if (Array.isArray(value.content.supportList) && value.content.supportList.length > maxSupportItems) {
    errors.supportList = `Support list row limit is ${maxSupportItems}.`
  }
  value.content.supportList.forEach((item, index) => {
    if (!item.trim()) errors.supportListByIndex[index] = { item: 'List row is required.' }
  })

  return errors
}

export const hasServicesErrors = (errors: ServicesErrors) =>
  Boolean(
    errors.heroSubtitle ||
      errors.heroTitle ||
      errors.heroHome ||
      errors.heroCrumb ||
      errors.heroBackgroundImage ||
      errors.introSubtitle ||
      errors.introTitle ||
      errors.introDescription ||
      errors.ctaAvailability ||
      errors.ctaContact ||
      errors.ctaStart ||
      errors.statsImage ||
      errors.essentialsSubtitle ||
      errors.essentialsTitle ||
      errors.supportSubtitle ||
      errors.supportTitle ||
      errors.supportDescription ||
      errors.stats ||
      errors.highlights ||
      errors.supportList ||
      Object.keys(errors.statsByIndex).length ||
      Object.keys(errors.highlightsByIndex).length ||
      Object.keys(errors.supportListByIndex).length
  )

export const moveItem = <T,>(items: T[], from: number, to: number) => {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (!moved) return items
  next.splice(to, 0, moved)
  return next
}

export const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
