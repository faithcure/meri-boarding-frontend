const DEFAULT_SERVER_API_BASE_URL = 'http://api:4000'
const DEFAULT_PUBLIC_API_BASE_URL = '/api'
const ABSOLUTE_HTTP_URL = /^https?:\/\//i

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function isLocalhostUrl(value: string): boolean {
  return value.includes('localhost') || value.includes('127.0.0.1')
}

function normalizeApiRootUrl(value: string): string {
  const normalizedBaseUrl = normalizeBaseUrl(value)
  return normalizedBaseUrl.endsWith('/api') ? normalizedBaseUrl.slice(0, -4) : normalizedBaseUrl
}

export function getServerApiBaseUrl(): string {
  const configuredServerBaseUrl = String(process.env.API_BASE_URL || process.env.INTERNAL_API_BASE_URL || '').trim()
  if (configuredServerBaseUrl) {
    const normalizedServerBaseUrl = normalizeApiRootUrl(configuredServerBaseUrl)
    if (process.env.NODE_ENV === 'production' && isLocalhostUrl(normalizedServerBaseUrl)) {
      return DEFAULT_SERVER_API_BASE_URL
    }
    return normalizedServerBaseUrl
  }

  const configuredPublicBaseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || '').trim()
  if (ABSOLUTE_HTTP_URL.test(configuredPublicBaseUrl) && !(process.env.NODE_ENV === 'production' && isLocalhostUrl(configuredPublicBaseUrl))) {
    return normalizeApiRootUrl(configuredPublicBaseUrl)
  }

  return DEFAULT_SERVER_API_BASE_URL
}

export function getPublicApiBaseUrl(): string {
  const configuredPublicBaseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || '').trim()
  if (!configuredPublicBaseUrl) {
    return DEFAULT_PUBLIC_API_BASE_URL
  }

  if (process.env.NODE_ENV === 'production' && isLocalhostUrl(configuredPublicBaseUrl)) {
    return DEFAULT_PUBLIC_API_BASE_URL
  }

  return normalizeApiRootUrl(configuredPublicBaseUrl) || DEFAULT_PUBLIC_API_BASE_URL
}

export function withPublicApiBaseIfNeeded(url: string): string {
  const value = String(url || '').trim()
  if (!value) return ''
  if (!value.startsWith('/api/')) return value

  const publicApiBaseUrl = getPublicApiBaseUrl()
  if (!publicApiBaseUrl || publicApiBaseUrl === '/api') {
    return value
  }

  if (publicApiBaseUrl.endsWith('/api')) {
    return `${publicApiBaseUrl}${value.slice(4)}`
  }

  return `${publicApiBaseUrl}${value}`
}
