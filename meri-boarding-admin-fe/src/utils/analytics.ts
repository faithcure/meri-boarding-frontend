import type {
  AnalyticsCountry,
  AnalyticsDaily,
  AnalyticsOverview,
  AnalyticsTopClick,
  AnalyticsTopPage
} from '@/types/analytics'
import { defaultAnalyticsOverview } from '@/types/analytics'

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function toErrorMessage(data: unknown) {
  if (data && typeof data === 'object' && 'error' in data) {
    const message = String((data as { error?: unknown }).error || '').trim()

    if (message) return message
  }

  return 'Analytics data could not be loaded.'
}

export function resolveApiBaseUrl(configuredApiBaseUrl: string) {
  const value = String(configuredApiBaseUrl || '').trim()

  if (value.startsWith('http://localhost') || value.startsWith('https://localhost')) {
    return ''
  }

  return value
}

export function normalizeAnalyticsOverview(input: unknown): AnalyticsOverview {
  const data = (input || {}) as {
    periodDays?: unknown
    locale?: unknown
    generatedAt?: unknown
    totals?: Record<string, unknown>
    topPages?: unknown[]
    topClicks?: unknown[]
    countries?: unknown[]
    daily?: unknown[]
  }

  const topPages: AnalyticsTopPage[] = Array.isArray(data.topPages)
    ? data.topPages.map(item => {
        const value = (item || {}) as Record<string, unknown>

        return {
          path: toString(value.path, '/'),
          views: toNumber(value.views),
          visitors: toNumber(value.visitors),
          avgDurationSeconds: toNumber(value.avgDurationSeconds)
        }
      })
    : []

  const topClicks: AnalyticsTopClick[] = Array.isArray(data.topClicks)
    ? data.topClicks.map(item => {
        const value = (item || {}) as Record<string, unknown>

        return {
          label: toString(value.label, '(no label)'),
          href: toString(value.href),
          tag: toString(value.tag),
          count: toNumber(value.count)
        }
      })
    : []

  const countries: AnalyticsCountry[] = Array.isArray(data.countries)
    ? data.countries.map(item => {
        const value = (item || {}) as Record<string, unknown>

        return {
          country: toString(value.country, 'UNKNOWN'),
          pageViews: toNumber(value.pageViews),
          visitors: toNumber(value.visitors)
        }
      })
    : []

  const daily: AnalyticsDaily[] = Array.isArray(data.daily)
    ? data.daily.map(item => {
        const value = (item || {}) as Record<string, unknown>

        return {
          date: toString(value.date),
          pageViews: toNumber(value.pageViews),
          clicks: toNumber(value.clicks),
          visitors: toNumber(value.visitors)
        }
      })
    : []

  return {
    periodDays: toNumber(data.periodDays, defaultAnalyticsOverview.periodDays),
    locale: toString(data.locale, defaultAnalyticsOverview.locale),
    generatedAt: toString(data.generatedAt),
    totals: {
      pageViews: toNumber(data.totals?.pageViews),
      clicks: toNumber(data.totals?.clicks),
      visitorsInPeriod: toNumber(data.totals?.visitorsInPeriod),
      visitorsDaily: toNumber(data.totals?.visitorsDaily),
      visitorsWeekly: toNumber(data.totals?.visitorsWeekly),
      visitorsMonthly: toNumber(data.totals?.visitorsMonthly),
      avgVisitDurationSeconds: toNumber(data.totals?.avgVisitDurationSeconds),
      avgPagesPerVisit: toNumber(data.totals?.avgPagesPerVisit)
    },
    topPages,
    topClicks,
    countries,
    daily
  }
}

export async function fetchAnalyticsOverview(
  apiBaseUrl: string,
  token: string,
  options?: { days?: number; locale?: string }
) {
  const params = new URLSearchParams()

  params.set('days', String(Math.max(1, Math.min(120, Math.round(options?.days ?? 30)))))
  if (options?.locale) params.set('locale', options.locale)

  const response = await fetch(`${apiBaseUrl}/api/v1/admin/analytics/overview?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(toErrorMessage(data))
  }

  return normalizeAnalyticsOverview(data)
}
