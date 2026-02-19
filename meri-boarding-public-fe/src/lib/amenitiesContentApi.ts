import type { Locale } from '@/i18n/getLocale'
import { getMessages } from '@/i18n/messages'
import { getServerApiBaseUrl, withPublicApiBaseIfNeeded } from '@/lib/apiBaseUrl'

type CmsAmenitiesContent = {
  hero?: {
    subtitle?: string
    title?: string
    home?: string
    crumb?: string
    backgroundImage?: string
  }
  content?: {
    layoutSubtitle?: string
    layoutTitle?: string
    layoutDesc?: string
    layoutOptions?: Array<{ title?: string; icon?: string; description?: string; highlights?: string[] }>
    amenitiesSubtitle?: string
    amenitiesTitle?: string
    toggleLabel?: string
    cardView?: string
    listView?: string
    switchHelp?: string
    includedTitle?: string
    request?: string
  }
  data?: {
    cards?: Array<{ title?: string; icon?: string; image?: string; description?: string; highlights?: string[] }>
    overviewItems?: string[]
  }
}

export type AmenitiesResolvedContent = {
  hero: ReturnType<typeof getMessages>['amenitiesHero'] & { backgroundImage: string }
  content: ReturnType<typeof getMessages>['amenitiesContent'] & {
    layoutOptions: Array<{ title: string; icon: string; description: string; highlights: string[] }>
  }
  data: {
    cards: Array<{ title: string; icon: string; image: string; description: string; highlights: string[] }>
    overviewItems: string[]
  }
}

const apiBaseUrl = getServerApiBaseUrl()

function withApiBaseIfNeeded(url: string) {
  return withPublicApiBaseIfNeeded(url)
}

function resolveContent(locale: Locale, cms?: CmsAmenitiesContent): AmenitiesResolvedContent {
  const messages = getMessages(locale)

  const fallbackLayoutOptions = Array.isArray(messages.amenitiesContent.layoutOptions) ? messages.amenitiesContent.layoutOptions : []
  const layoutOptionsSource = Array.isArray(cms?.content?.layoutOptions) ? cms?.content?.layoutOptions : fallbackLayoutOptions
  const layoutOptions = layoutOptionsSource
    .map(item => ({
      title: String(item?.title || '').trim(),
      icon: String(item?.icon || '').trim() || 'fa fa-square-o',
      description: String(item?.description || '').trim(),
      highlights: Array.isArray(item?.highlights) ? item.highlights.map(v => String(v || '').trim()).filter(Boolean).slice(0, 10) : []
    }))
    .filter(item => Boolean(item.title) && Boolean(item.icon) && Boolean(item.description) && item.highlights.length > 0)
    .slice(0, 8)

  const fallbackCards = Array.isArray(messages.amenitiesData.cards) ? messages.amenitiesData.cards : []
  const cardsSource = Array.isArray(cms?.data?.cards) ? cms?.data?.cards : fallbackCards
  const cards = cardsSource
    .map(item => ({
      title: String(item?.title || '').trim(),
      icon: String(item?.icon || '').trim() || 'fa fa-home',
      image: withApiBaseIfNeeded(String(item?.image || '').trim()),
      description: String(item?.description || '').trim(),
      highlights: Array.isArray(item?.highlights) ? item.highlights.map(v => String(v || '').trim()).filter(Boolean).slice(0, 10) : []
    }))
    .filter(item => Boolean(item.title) && Boolean(item.icon) && Boolean(item.image) && Boolean(item.description) && item.highlights.length > 0)
    .slice(0, 24)

  const fallbackOverviewItems = Array.isArray(messages.amenitiesData.overviewItems) ? messages.amenitiesData.overviewItems : []
  const overviewItemsSource = Array.isArray(cms?.data?.overviewItems) ? cms?.data?.overviewItems : fallbackOverviewItems
  const overviewItems = overviewItemsSource.map(item => String(item || '').trim()).filter(Boolean).slice(0, 40)

  return {
    hero: {
      subtitle: String(cms?.hero?.subtitle || messages.amenitiesHero.subtitle || '').trim(),
      title: String(cms?.hero?.title || messages.amenitiesHero.title || '').trim(),
      crumb: String(cms?.hero?.crumb || messages.amenitiesHero.crumb || '').trim(),
      home: String(cms?.hero?.home || messages.amenitiesHero.home || '').trim(),
      backgroundImage:
        withApiBaseIfNeeded(String(cms?.hero?.backgroundImage || '').trim()) ||
        '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg'
    },
    content: {
      ...messages.amenitiesContent,
      layoutSubtitle: String(cms?.content?.layoutSubtitle || messages.amenitiesContent.layoutSubtitle || '').trim(),
      layoutTitle: String(cms?.content?.layoutTitle || messages.amenitiesContent.layoutTitle || '').trim(),
      layoutDesc: String(cms?.content?.layoutDesc || messages.amenitiesContent.layoutDesc || '').trim(),
      layoutOptions: layoutOptions.length > 0 ? layoutOptions : fallbackLayoutOptions,
      amenitiesSubtitle: String(cms?.content?.amenitiesSubtitle || messages.amenitiesContent.amenitiesSubtitle || '').trim(),
      amenitiesTitle: String(cms?.content?.amenitiesTitle || messages.amenitiesContent.amenitiesTitle || '').trim(),
      toggleLabel: String(cms?.content?.toggleLabel || messages.amenitiesContent.toggleLabel || '').trim(),
      cardView: String(cms?.content?.cardView || messages.amenitiesContent.cardView || '').trim(),
      listView: String(cms?.content?.listView || messages.amenitiesContent.listView || '').trim(),
      switchHelp: String(cms?.content?.switchHelp || messages.amenitiesContent.switchHelp || '').trim(),
      includedTitle: String(cms?.content?.includedTitle || messages.amenitiesContent.includedTitle || '').trim(),
      request: String(cms?.content?.request || messages.amenitiesContent.request || '').trim()
    },
    data: {
      cards: cards.length > 0 ? cards : fallbackCards,
      overviewItems: overviewItems.length > 0 ? overviewItems : fallbackOverviewItems
    }
  }
}

export async function fetchAmenitiesResolvedContent(locale: Locale): Promise<AmenitiesResolvedContent> {
  const response = await fetch(`${apiBaseUrl}/api/v1/public/content/amenities?locale=${locale}`, {
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch amenities content (${response.status})`)
  }

  const data = await response.json()
  return resolveContent(locale, data?.content || {})
}
