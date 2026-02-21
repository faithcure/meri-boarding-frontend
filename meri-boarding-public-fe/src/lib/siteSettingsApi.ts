import { getServerApiBaseUrl, withPublicApiBaseIfNeeded } from '@/lib/apiBaseUrl'

type CmsGeneralSettingsContent = {
  siteIconUrl?: string
}

const apiBaseUrl = getServerApiBaseUrl()
const API_REVALIDATE_SECONDS = 60
const fallbackIconUrl = '/images/icon.webp'

function resolveSiteIconUrl(cms?: CmsGeneralSettingsContent) {
  const raw = String(cms?.siteIconUrl || '').trim()
  if (!raw) return fallbackIconUrl
  const isRelative = raw.startsWith('/')
  const isAbsolute = /^https?:\/\//i.test(raw)
  if (!isRelative && !isAbsolute) return fallbackIconUrl
  return withPublicApiBaseIfNeeded(raw)
}

export async function fetchSiteIconUrl(): Promise<string> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/settings/general`, {
      next: { revalidate: API_REVALIDATE_SECONDS }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch general settings (${response.status})`)
    }

    const data = await response.json()
    return resolveSiteIconUrl(data?.content || {})
  } catch (error) {
    console.error('[public-fe] falling back to default site icon', error)
    return fallbackIconUrl
  }
}
