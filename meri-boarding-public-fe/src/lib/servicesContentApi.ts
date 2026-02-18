import type { Locale } from '@/i18n/getLocale'
import { getMessages } from '@/i18n/messages'

type CmsServicesContent = {
  hero?: {
    subtitle?: string
    title?: string
    home?: string
    crumb?: string
    backgroundImage?: string
  }
  content?: {
    heroSubtitle?: string
    heroTitle?: string
    heroDescription?: string
    ctaAvailability?: string
    ctaContact?: string
    stats?: Array<{ label?: string; value?: string; note?: string }>
    statsImage?: string
    essentialsSubtitle?: string
    essentialsTitle?: string
    highlights?: Array<{ icon?: string; title?: string; description?: string }>
    supportSubtitle?: string
    supportTitle?: string
    supportDescription?: string
    ctaStart?: string
    supportList?: string[]
  }
}

export type ServicesResolvedContent = {
  hero: ReturnType<typeof getMessages>['servicesHero'] & { backgroundImage: string }
  content: ReturnType<typeof getMessages>['servicesContent'] & {
    stats: Array<{ label: string; value: string; note: string }>
    statsImage: string
    highlights: Array<{ icon: string; title: string; description: string }>
    supportList: string[]
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000'
const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, '')

function withApiBaseIfNeeded(url: string) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (!value.startsWith('/api/')) return value
  return `${normalizedApiBaseUrl}${value}`
}

function resolveContent(locale: Locale, cms?: CmsServicesContent): ServicesResolvedContent {
  const messages = getMessages(locale)

  const defaultStats = Array.isArray(messages.servicesContent.stats) ? messages.servicesContent.stats : []
  const statsSource = Array.isArray(cms?.content?.stats) ? cms?.content?.stats : defaultStats
  const stats = statsSource
    .map(item => ({
      label: String(item?.label || '').trim(),
      value: String(item?.value || '').trim(),
      note: String(item?.note || '').trim()
    }))
    .filter(item => Boolean(item.label) && Boolean(item.value) && Boolean(item.note))
    .slice(0, 6)

  const defaultHighlights = Array.isArray(messages.servicesContent.highlights) ? messages.servicesContent.highlights : []
  const highlightsSource = Array.isArray(cms?.content?.highlights) ? cms?.content?.highlights : defaultHighlights
  const highlights = highlightsSource
    .map(item => ({
      icon: String(item?.icon || '').trim() || 'fa fa-home',
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim()
    }))
    .filter(item => Boolean(item.icon) && Boolean(item.title) && Boolean(item.description))
    .slice(0, 12)

  const defaultSupportList = Array.isArray(messages.servicesContent.supportList) ? messages.servicesContent.supportList : []
  const supportListSource = Array.isArray(cms?.content?.supportList) ? cms?.content?.supportList : defaultSupportList
  const supportList = supportListSource.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)

  return {
    hero: {
      subtitle: String(cms?.hero?.subtitle || messages.servicesHero.subtitle || '').trim(),
      title: String(cms?.hero?.title || messages.servicesHero.title || '').trim(),
      home: String(cms?.hero?.home || messages.servicesHero.home || '').trim(),
      crumb: String(cms?.hero?.crumb || messages.servicesHero.crumb || '').trim(),
      backgroundImage:
        withApiBaseIfNeeded(String(cms?.hero?.backgroundImage || '').trim()) ||
        '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg'
    },
    content: {
      ...messages.servicesContent,
      heroSubtitle: String(cms?.content?.heroSubtitle || messages.servicesContent.heroSubtitle || '').trim(),
      heroTitle: String(cms?.content?.heroTitle || messages.servicesContent.heroTitle || '').trim(),
      heroDescription: String(cms?.content?.heroDescription || messages.servicesContent.heroDescription || '').trim(),
      ctaAvailability: String(cms?.content?.ctaAvailability || messages.servicesContent.ctaAvailability || '').trim(),
      ctaContact: String(cms?.content?.ctaContact || messages.servicesContent.ctaContact || '').trim(),
      stats,
      statsImage:
        withApiBaseIfNeeded(String(cms?.content?.statsImage || '').trim()) ||
        '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg',
      essentialsSubtitle: String(cms?.content?.essentialsSubtitle || messages.servicesContent.essentialsSubtitle || '').trim(),
      essentialsTitle: String(cms?.content?.essentialsTitle || messages.servicesContent.essentialsTitle || '').trim(),
      highlights,
      supportSubtitle: String(cms?.content?.supportSubtitle || messages.servicesContent.supportSubtitle || '').trim(),
      supportTitle: String(cms?.content?.supportTitle || messages.servicesContent.supportTitle || '').trim(),
      supportDescription: String(cms?.content?.supportDescription || messages.servicesContent.supportDescription || '').trim(),
      ctaStart: String(cms?.content?.ctaStart || messages.servicesContent.ctaStart || '').trim(),
      supportList
    }
  }
}

export async function fetchServicesResolvedContent(locale: Locale): Promise<ServicesResolvedContent> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/content/services?locale=${locale}`, {
      cache: 'no-store'
    })
    if (!response.ok) {
      return resolveContent(locale, undefined)
    }

    const data = await response.json()
    return resolveContent(locale, data?.content || {})
  } catch {
    return resolveContent(locale, undefined)
  }
}

