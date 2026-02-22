export type Locale = 'en' | 'de' | 'tr'

export type AmenitiesLayoutOption = {
  title: string
  icon: string
  description: string
  highlights: string[]
}

export type AmenitiesCard = {
  title: string
  icon: string
  image: string
  description: string
  highlights: string[]
}

export type AmenitiesContent = {
  hero: {
    subtitle: string
    title: string
    home: string
    crumb: string
    backgroundImage: string
  }
  content: {
    layoutSubtitle: string
    layoutTitle: string
    layoutDesc: string
    layoutOptions: AmenitiesLayoutOption[]
    amenitiesSubtitle: string
    amenitiesTitle: string
    toggleLabel: string
    cardView: string
    listView: string
    switchHelp: string
    includedTitle: string
    request: string
  }
  data: {
    cards: AmenitiesCard[]
    overviewItems: string[]
  }
}

export type AmenitiesErrors = {
  heroSubtitle?: string
  heroTitle?: string
  heroHome?: string
  heroCrumb?: string
  heroBackgroundImage?: string
  layoutSubtitle?: string
  layoutTitle?: string
  layoutDesc?: string
  amenitiesSubtitle?: string
  amenitiesTitle?: string
  toggleLabel?: string
  cardView?: string
  listView?: string
  switchHelp?: string
  includedTitle?: string
  request?: string
  layoutOptions?: string
  cards?: string
  overviewItems?: string
  layoutByIndex: Record<number, { title?: string; icon?: string; description?: string; highlights?: string }>
  cardsByIndex: Record<number, { title?: string; icon?: string; image?: string; description?: string; highlights?: string }>
  overviewByIndex: Record<number, { item?: string }>
}

export const localeOptions: Locale[] = ['en', 'de', 'tr']
export const maxLayoutOptions = 8
export const maxCards = 24
export const maxOverviewItems = 40
export const maxHighlightsPerItem = 10

export const parseLines = (value: string, max = maxHighlightsPerItem) =>
  String(value || '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, max)

export const createDefaultAmenities = (): AmenitiesContent => ({
  hero: {
    subtitle: '',
    title: '',
    home: '',
    crumb: '',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg'
  },
  content: {
    layoutSubtitle: '',
    layoutTitle: '',
    layoutDesc: '',
    layoutOptions: [{ title: '', icon: 'fa fa-square-o', description: '', highlights: [''] }],
    amenitiesSubtitle: '',
    amenitiesTitle: '',
    toggleLabel: '',
    cardView: '',
    listView: '',
    switchHelp: '',
    includedTitle: '',
    request: ''
  },
  data: {
    cards: [{ title: '', icon: 'fa fa-home', image: '', description: '', highlights: [''] }],
    overviewItems: ['']
  }
})

export const normalizeAmenities = (input: unknown): AmenitiesContent => {
  const value = (input || {}) as Partial<AmenitiesContent>

  const layoutOptions = Array.isArray(value?.content?.layoutOptions)
    ? value.content.layoutOptions
        .map(item => ({
          title: String(item?.title || '').trim(),
          icon: String(item?.icon || '').trim() || 'fa fa-square-o',
          description: String(item?.description || '').trim(),
          highlights: Array.isArray(item?.highlights)
            ? item.highlights.map(row => String(row || '').trim()).filter(Boolean).slice(0, maxHighlightsPerItem)
            : []
        }))
        .filter(item => Boolean(item.title) || Boolean(item.description) || item.highlights.length > 0)
        .slice(0, maxLayoutOptions)
    : []

  const cards = Array.isArray(value?.data?.cards)
    ? value.data.cards
        .map(item => ({
          title: String(item?.title || '').trim(),
          icon: String(item?.icon || '').trim() || 'fa fa-home',
          image: String(item?.image || '').trim(),
          description: String(item?.description || '').trim(),
          highlights: Array.isArray(item?.highlights)
            ? item.highlights.map(row => String(row || '').trim()).filter(Boolean).slice(0, maxHighlightsPerItem)
            : []
        }))
        .filter(item => Boolean(item.title) || Boolean(item.description) || Boolean(item.image) || item.highlights.length > 0)
        .slice(0, maxCards)
    : []

  const overviewItems = Array.isArray(value?.data?.overviewItems)
    ? value.data.overviewItems.map(item => String(item || '').trim()).filter(Boolean).slice(0, maxOverviewItems)
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
      layoutSubtitle: String(value?.content?.layoutSubtitle || '').trim(),
      layoutTitle: String(value?.content?.layoutTitle || '').trim(),
      layoutDesc: String(value?.content?.layoutDesc || '').trim(),
      layoutOptions: layoutOptions.length > 0 ? layoutOptions : [{ title: '', icon: 'fa fa-square-o', description: '', highlights: [''] }],
      amenitiesSubtitle: String(value?.content?.amenitiesSubtitle || '').trim(),
      amenitiesTitle: String(value?.content?.amenitiesTitle || '').trim(),
      toggleLabel: String(value?.content?.toggleLabel || '').trim(),
      cardView: String(value?.content?.cardView || '').trim(),
      listView: String(value?.content?.listView || '').trim(),
      switchHelp: String(value?.content?.switchHelp || '').trim(),
      includedTitle: String(value?.content?.includedTitle || '').trim(),
      request: String(value?.content?.request || '').trim()
    },
    data: {
      cards: cards.length > 0 ? cards : [{ title: '', icon: 'fa fa-home', image: '', description: '', highlights: [''] }],
      overviewItems: overviewItems.length > 0 ? overviewItems : ['']
    }
  }
}

export const validateAmenities = (value: AmenitiesContent): AmenitiesErrors => {
  const errors: AmenitiesErrors = {
    layoutByIndex: {},
    cardsByIndex: {},
    overviewByIndex: {}
  }

  if (!value.hero.subtitle.trim()) errors.heroSubtitle = 'Hero subtitle is required.'
  if (!value.hero.title.trim()) errors.heroTitle = 'Hero title is required.'
  if (!value.hero.home.trim()) errors.heroHome = 'Breadcrumb home text is required.'
  if (!value.hero.crumb.trim()) errors.heroCrumb = 'Breadcrumb current text is required.'
  if (!value.hero.backgroundImage.trim()) errors.heroBackgroundImage = 'Hero background image URL is required.'

  if (!value.content.layoutSubtitle.trim()) errors.layoutSubtitle = 'Layout subtitle is required.'
  if (!value.content.layoutTitle.trim()) errors.layoutTitle = 'Layout title is required.'
  if (!value.content.layoutDesc.trim()) errors.layoutDesc = 'Layout description is required.'
  if (!value.content.amenitiesSubtitle.trim()) errors.amenitiesSubtitle = 'Amenities subtitle is required.'
  if (!value.content.amenitiesTitle.trim()) errors.amenitiesTitle = 'Amenities title is required.'
  if (!value.content.toggleLabel.trim()) errors.toggleLabel = 'Toggle label is required.'
  if (!value.content.cardView.trim()) errors.cardView = 'Card view label is required.'
  if (!value.content.listView.trim()) errors.listView = 'List view label is required.'
  if (!value.content.switchHelp.trim()) errors.switchHelp = 'Switch help text is required.'
  if (!value.content.includedTitle.trim()) errors.includedTitle = 'Included title is required.'
  if (!value.content.request.trim()) errors.request = 'Request CTA text is required.'

  if (!Array.isArray(value.content.layoutOptions) || value.content.layoutOptions.length < 1) {
    errors.layoutOptions = 'At least 1 layout option is required.'
  }

  if (Array.isArray(value.content.layoutOptions) && value.content.layoutOptions.length > maxLayoutOptions) {
    errors.layoutOptions = `Layout option limit is ${maxLayoutOptions}.`
  }

  value.content.layoutOptions.forEach((item, index) => {
    const rowError: { title?: string; icon?: string; description?: string; highlights?: string } = {}

    if (!item.title.trim()) rowError.title = 'Title is required.'
    if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
    if (!item.description.trim()) rowError.description = 'Description is required.'
    if (!Array.isArray(item.highlights) || item.highlights.length < 1) rowError.highlights = 'At least 1 highlight line is required.'
    if (Array.isArray(item.highlights) && item.highlights.some(line => !line.trim())) rowError.highlights = 'Highlight lines cannot be empty.'

    if (rowError.title || rowError.icon || rowError.description || rowError.highlights) {
      errors.layoutByIndex[index] = rowError
    }
  })

  if (!Array.isArray(value.data.cards) || value.data.cards.length < 1) {
    errors.cards = 'At least 1 amenity card is required.'
  }

  if (Array.isArray(value.data.cards) && value.data.cards.length > maxCards) {
    errors.cards = `Amenity card limit is ${maxCards}.`
  }

  value.data.cards.forEach((item, index) => {
    const rowError: { title?: string; icon?: string; image?: string; description?: string; highlights?: string } = {}

    if (!item.title.trim()) rowError.title = 'Title is required.'
    if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
    if (!item.image.trim()) rowError.image = 'Image URL is required.'
    if (!item.description.trim()) rowError.description = 'Description is required.'
    if (!Array.isArray(item.highlights) || item.highlights.length < 1) rowError.highlights = 'At least 1 highlight line is required.'
    if (Array.isArray(item.highlights) && item.highlights.some(line => !line.trim())) rowError.highlights = 'Highlight lines cannot be empty.'

    if (rowError.title || rowError.icon || rowError.image || rowError.description || rowError.highlights) {
      errors.cardsByIndex[index] = rowError
    }
  })

  if (!Array.isArray(value.data.overviewItems) || value.data.overviewItems.length < 1) {
    errors.overviewItems = 'At least 1 overview line is required.'
  }

  if (Array.isArray(value.data.overviewItems) && value.data.overviewItems.length > maxOverviewItems) {
    errors.overviewItems = `Overview line limit is ${maxOverviewItems}.`
  }

  value.data.overviewItems.forEach((item, index) => {
    if (!item.trim()) {
      errors.overviewByIndex[index] = { item: 'Line is required.' }
    }
  })

  return errors
}

export const hasAmenitiesErrors = (errors: AmenitiesErrors) =>
  Boolean(
    errors.heroSubtitle ||
      errors.heroTitle ||
      errors.heroHome ||
      errors.heroCrumb ||
      errors.heroBackgroundImage ||
      errors.layoutSubtitle ||
      errors.layoutTitle ||
      errors.layoutDesc ||
      errors.amenitiesSubtitle ||
      errors.amenitiesTitle ||
      errors.toggleLabel ||
      errors.cardView ||
      errors.listView ||
      errors.switchHelp ||
      errors.includedTitle ||
      errors.request ||
      errors.layoutOptions ||
      errors.cards ||
      errors.overviewItems ||
      Object.keys(errors.layoutByIndex).length ||
      Object.keys(errors.cardsByIndex).length ||
      Object.keys(errors.overviewByIndex).length
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
