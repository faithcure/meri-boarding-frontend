export type AnalyticsTopPage = {
  path: string
  views: number
  visitors: number
  avgDurationSeconds: number
}

export type AnalyticsLandingPage = {
  path: string
  visits: number
}

export type AnalyticsTopClick = {
  label: string
  href: string
  tag: string
  count: number
}

export type AnalyticsTopReferrer = {
  source: string
  visits: number
}

export type AnalyticsCountry = {
  country: string
  pageViews: number
  visitors: number
}

export type AnalyticsDevice = {
  deviceType: string
  visits: number
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
    visitsInPeriod: number
    pageViews: number
    clicks: number
    visitorsInPeriod: number
    newVisitorsInPeriod: number
    returningVisitorsInPeriod: number
    visitorsDaily: number
    visitorsWeekly: number
    visitorsMonthly: number
    bounceRate: number
    avgVisitDurationSeconds: number
    avgPagesPerVisit: number
  }
  topPages: AnalyticsTopPage[]
  landingPages: AnalyticsLandingPage[]
  topClicks: AnalyticsTopClick[]
  topReferrers: AnalyticsTopReferrer[]
  countries: AnalyticsCountry[]
  devices: AnalyticsDevice[]
  daily: AnalyticsDaily[]
}

export const defaultAnalyticsOverview: AnalyticsOverview = {
  periodDays: 30,
  locale: 'all',
  generatedAt: '',
  totals: {
    visitsInPeriod: 0,
    pageViews: 0,
    clicks: 0,
    visitorsInPeriod: 0,
    newVisitorsInPeriod: 0,
    returningVisitorsInPeriod: 0,
    visitorsDaily: 0,
    visitorsWeekly: 0,
    visitorsMonthly: 0,
    bounceRate: 0,
    avgVisitDurationSeconds: 0,
    avgPagesPerVisit: 0
  },
  topPages: [],
  landingPages: [],
  topClicks: [],
  topReferrers: [],
  countries: [],
  devices: [],
  daily: []
}
