export type AnalyticsTopPage = {
  path: string
  views: number
  visitors: number
  avgDurationSeconds: number
}

export type AnalyticsTopClick = {
  label: string
  href: string
  tag: string
  count: number
}

export type AnalyticsCountry = {
  country: string
  pageViews: number
  visitors: number
}

export type AnalyticsDaily = {
  date: string
  pageViews: number
  clicks: number
  visitors: number
}

export type AnalyticsOverview = {
  periodDays: number
  locale: string
  generatedAt: string
  totals: {
    pageViews: number
    clicks: number
    visitorsInPeriod: number
    visitorsDaily: number
    visitorsWeekly: number
    visitorsMonthly: number
    avgVisitDurationSeconds: number
    avgPagesPerVisit: number
  }
  topPages: AnalyticsTopPage[]
  topClicks: AnalyticsTopClick[]
  countries: AnalyticsCountry[]
  daily: AnalyticsDaily[]
}

export const defaultAnalyticsOverview: AnalyticsOverview = {
  periodDays: 30,
  locale: 'all',
  generatedAt: '',
  totals: {
    pageViews: 0,
    clicks: 0,
    visitorsInPeriod: 0,
    visitorsDaily: 0,
    visitorsWeekly: 0,
    visitorsMonthly: 0,
    avgVisitDurationSeconds: 0,
    avgPagesPerVisit: 0
  },
  topPages: [],
  topClicks: [],
  countries: [],
  daily: []
}
