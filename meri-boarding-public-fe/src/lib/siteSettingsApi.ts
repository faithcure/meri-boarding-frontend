import { getServerApiBaseUrl, withPublicApiBaseIfNeeded } from '@/lib/apiBaseUrl'

type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'threads'
  | 'pinterest'
  | 'telegram'
  | 'whatsapp'
  | 'snapchat'
  | 'discord'
  | 'reddit'
  | 'github'
  | 'medium'
  | 'vimeo'

type CmsGeneralSettingsContent = {
  siteIconUrl?: string
  socialLinks?: Array<{
    id?: string
    platform?: string
    label?: string
    url?: string
    enabled?: boolean
    order?: number
  }>
  formDelivery?: {
    requestFormActionUrl?: string
  }
}

export type PublicSocialLink = {
  id: string
  platform: SocialPlatform
  label: string
  url: string
  iconClass: string
}

export type PublicGeneralSettings = {
  siteIconUrl: string
  socialLinks: PublicSocialLink[]
  formDelivery: {
    requestFormActionUrl: string
  }
}

const apiBaseUrl = getServerApiBaseUrl()
const fallbackIconUrl = '/images/icon.webp'
const fallbackSocialLinks: PublicSocialLink[] = [
  { id: 'instagram', platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/', iconClass: 'fa-brands fa-instagram' },
  { id: 'linkedin', platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/', iconClass: 'fa-brands fa-linkedin-in' }
]
const fallbackRequestFormActionUrl = 'https://meri-boarding.de/boarding-booking.php'
const socialIconMap: Record<SocialPlatform, string> = {
  instagram: 'fa-brands fa-instagram',
  facebook: 'fa-brands fa-facebook-f',
  x: 'fa-brands fa-x-twitter',
  tiktok: 'fa-brands fa-tiktok',
  youtube: 'fa-brands fa-youtube',
  linkedin: 'fa-brands fa-linkedin-in',
  threads: 'fa-brands fa-threads',
  pinterest: 'fa-brands fa-pinterest-p',
  telegram: 'fa-brands fa-telegram',
  whatsapp: 'fa-brands fa-whatsapp',
  snapchat: 'fa-brands fa-snapchat',
  discord: 'fa-brands fa-discord',
  reddit: 'fa-brands fa-reddit-alien',
  github: 'fa-brands fa-github',
  medium: 'fa-brands fa-medium',
  vimeo: 'fa-brands fa-vimeo-v'
}
const socialPlatforms = Object.keys(socialIconMap) as SocialPlatform[]

function resolveSiteIconUrl(cms?: CmsGeneralSettingsContent) {
  const raw = String(cms?.siteIconUrl || '').trim()
  if (!raw) return fallbackIconUrl
  const isRelative = raw.startsWith('/')
  const isAbsolute = /^https?:\/\//i.test(raw)
  if (!isRelative && !isAbsolute) return fallbackIconUrl
  return withPublicApiBaseIfNeeded(raw)
}

function resolveSocialLinks(cms?: CmsGeneralSettingsContent): PublicSocialLink[] {
  const list = Array.isArray(cms?.socialLinks) ? cms.socialLinks : []
  const normalized = list
    .map((item, index) => {
      const platformRaw = String(item?.platform || '').trim().toLowerCase() as SocialPlatform
      if (!socialPlatforms.includes(platformRaw)) return null

      const url = String(item?.url || '').trim()
      if (!/^https?:\/\//i.test(url)) return null
      if (item?.enabled === false) return null

      const label = String(item?.label || '').trim() || platformRaw
      const id = String(item?.id || `${platformRaw}-${index + 1}`).trim() || `${platformRaw}-${index + 1}`
      const order = Number(item?.order) || index + 1
      return {
        id,
        platform: platformRaw,
        label,
        url,
        iconClass: socialIconMap[platformRaw],
        order
      }
    })
    .filter(Boolean) as Array<PublicSocialLink & { order: number }>

  const sorted = normalized
    .sort((a, b) => a.order - b.order)
    .map(item => ({ id: item.id, platform: item.platform, label: item.label, url: item.url, iconClass: item.iconClass }))
  return sorted.length > 0 ? sorted : fallbackSocialLinks
}

function resolveRequestFormActionUrl(cms?: CmsGeneralSettingsContent): string {
  const value = String(cms?.formDelivery?.requestFormActionUrl || '').trim()
  return /^https?:\/\//i.test(value) ? value : fallbackRequestFormActionUrl
}

export async function fetchGeneralSettings(): Promise<PublicGeneralSettings> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/settings/general`, {
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch general settings (${response.status})`)
    }

    const data = await response.json()
    const content = data?.content || {}
    return {
      siteIconUrl: resolveSiteIconUrl(content),
      socialLinks: resolveSocialLinks(content),
      formDelivery: {
        requestFormActionUrl: resolveRequestFormActionUrl(content)
      }
    }
  } catch (error) {
    console.error('[public-fe] falling back to default general settings', error)
    return {
      siteIconUrl: fallbackIconUrl,
      socialLinks: fallbackSocialLinks,
      formDelivery: {
        requestFormActionUrl: fallbackRequestFormActionUrl
      }
    }
  }
}

export async function fetchSiteIconUrl(): Promise<string> {
  const settings = await fetchGeneralSettings()
  return settings.siteIconUrl
}

export async function fetchGeneralSocialLinks(): Promise<PublicSocialLink[]> {
  const settings = await fetchGeneralSettings()
  return settings.socialLinks
}

export async function fetchRequestFormActionUrl(): Promise<string> {
  const settings = await fetchGeneralSettings()
  return settings.formDelivery.requestFormActionUrl
}
