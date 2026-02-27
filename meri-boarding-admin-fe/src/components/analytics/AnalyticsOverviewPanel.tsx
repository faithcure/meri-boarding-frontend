'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { AnalyticsDaily, AnalyticsOverview } from '@/types/analytics'

type AnalyticsOverviewPanelProps = {
  analytics: AnalyticsOverview
  topLimit?: number
}

type HorizontalBarItem = {
  id: string
  label: string
  value: number
  helper: string
}

const integerFormatter = new Intl.NumberFormat('de-DE')

function formatInteger(value: number) {
  return integerFormatter.format(Math.max(0, Math.round(value || 0)))
}

function formatDuration(seconds: number) {
  const value = Math.max(0, Math.round(seconds || 0))

  if (value < 60) return `${value}s`
  if (value < 3600) return `${(value / 60).toFixed(1)}m`

  return `${(value / 3600).toFixed(1)}h`
}

function formatShortDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(5)

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value || '-'

  return parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card variant='outlined'>
      <CardContent className='flex flex-col gap-2'>
        <Typography color='text.secondary' variant='body2'>
          {label}
        </Typography>
        <Typography variant='h5'>{value}</Typography>
      </CardContent>
    </Card>
  )
}

function TrendChart({ daily }: { daily: AnalyticsDaily[] }) {
  const data = daily.slice(-30)
  const width = 740
  const height = 240
  const padX = 36
  const padY = 26
  const maxValue = Math.max(1, ...data.map(item => Math.max(item.pageViews, item.clicks, item.visitors)))
  const plotWidth = width - padX * 2
  const plotHeight = height - padY * 2
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0

  const yFor = (value: number) => padY + plotHeight - (Math.max(0, value) / maxValue) * plotHeight

  const buildPolyline = (selector: (item: AnalyticsDaily) => number) =>
    data
      .map((item, index) => `${(padX + index * step).toFixed(2)},${yFor(selector(item)).toFixed(2)}`)
      .join(' ')

  const firstLabel = data[0]?.date ? formatShortDate(data[0].date) : ''
  const midLabel = data[Math.floor(data.length / 2)]?.date ? formatShortDate(data[Math.floor(data.length / 2)].date) : ''
  const lastLabel = data[data.length - 1]?.date ? formatShortDate(data[data.length - 1].date) : ''
  const guideLevels = [0.25, 0.5, 0.75, 1]

  if (data.length < 1) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' className='mb-2'>
            Daily Trend
          </Typography>
          <Typography color='text.secondary'>No data yet.</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant='outlined'>
      <CardContent className='flex flex-col gap-3'>
        <Typography variant='h6'>Daily Trend</Typography>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <Box sx={{ minWidth: 520 }}>
            <svg viewBox={`0 0 ${width} ${height}`} width='100%' role='img' aria-label='Daily analytics trend'>
              <rect x='0' y='0' width={width} height={height} fill='transparent' />
              {guideLevels.map(level => {
                const y = yFor(level * maxValue)

                return (
                  <g key={String(level)}>
                    <line x1={padX} y1={y} x2={width - padX} y2={y} stroke='rgba(120,120,140,0.25)' strokeDasharray='3 4' />
                    <text x={6} y={y + 4} fontSize='10' fill='currentColor'>
                      {Math.round(level * maxValue)}
                    </text>
                  </g>
                )
              })}
              <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke='rgba(100,100,120,0.4)' />
              <polyline fill='none' stroke='#2563eb' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' points={buildPolyline(item => item.pageViews)} />
              <polyline fill='none' stroke='#16a34a' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' points={buildPolyline(item => item.clicks)} />
              <polyline fill='none' stroke='#f97316' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' points={buildPolyline(item => item.visitors)} />
              <text x={padX} y={height - 6} fontSize='10' fill='currentColor'>
                {firstLabel}
              </text>
              <text x={width / 2} y={height - 6} fontSize='10' textAnchor='middle' fill='currentColor'>
                {midLabel}
              </text>
              <text x={width - padX} y={height - 6} fontSize='10' textAnchor='end' fill='currentColor'>
                {lastLabel}
              </text>
            </svg>
          </Box>
        </Box>
        <div className='flex flex-wrap gap-4'>
          <Typography variant='body2' color='text.secondary'>
            <span style={{ color: '#2563eb' }}>o</span> Page Views
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            <span style={{ color: '#16a34a' }}>o</span> Clicks
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            <span style={{ color: '#f97316' }}>o</span> Visitors
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

function HorizontalBarsCard({
  title,
  items,
  barColor
}: {
  title: string
  items: HorizontalBarItem[]
  barColor: string
}) {
  const maxValue = Math.max(1, ...items.map(item => item.value))

  return (
    <Card variant='outlined'>
      <CardContent className='flex flex-col gap-3'>
        <Typography variant='h6'>{title}</Typography>
        {items.length < 1 ? (
          <Typography color='text.secondary'>No data yet.</Typography>
        ) : (
          items.map(item => {
            const width = Math.max(4, (Math.max(0, item.value) / maxValue) * 100)

            return (
              <div key={item.id} className='flex flex-col gap-1'>
                <div className='flex items-baseline justify-between gap-3'>
                  <Typography
                    variant='body2'
                    title={item.label}
                    sx={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant='subtitle2'>{formatInteger(item.value)}</Typography>
                </div>
                {item.helper ? (
                  <Typography color='text.secondary' variant='caption'>
                    {item.helper}
                  </Typography>
                ) : null}
                <Box
                  sx={{
                    height: 8,
                    width: '100%',
                    borderRadius: 2,
                    backgroundColor: 'rgba(120,120,140,0.18)',
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      width: `${width}%`,
                      height: '100%',
                      borderRadius: 2,
                      backgroundColor: barColor
                    }}
                  />
                </Box>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export default function AnalyticsOverviewPanel({ analytics, topLimit = 10 }: AnalyticsOverviewPanelProps) {
  const topPages = analytics.topPages.slice(0, topLimit).map(item => ({
    id: `page-${item.path}`,
    label: item.path,
    value: item.views,
    helper: `Visitors: ${formatInteger(item.visitors)} | Avg stay: ${formatDuration(item.avgDurationSeconds)}`
  }))

  const topClicks = analytics.topClicks.slice(0, topLimit).map((item, index) => ({
    id: `click-${index}`,
    label: item.label || item.href || item.tag || '(interaction)',
    value: item.count,
    helper: [item.tag, item.href].filter(Boolean).join(' | ')
  }))

  const countries = analytics.countries.slice(0, topLimit).map(item => ({
    id: `country-${item.country}`,
    label: item.country,
    value: item.visitors,
    helper: `Page views: ${formatInteger(item.pageViews)}`
  }))

  return (
    <Box className='flex flex-col gap-4'>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Visitors (Daily)' value={formatInteger(analytics.totals.visitorsDaily)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Visitors (Weekly)' value={formatInteger(analytics.totals.visitorsWeekly)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Visitors (Monthly)' value={formatInteger(analytics.totals.visitorsMonthly)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Visitors (Period)' value={formatInteger(analytics.totals.visitorsInPeriod)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Page Views' value={formatInteger(analytics.totals.pageViews)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Clicks' value={formatInteger(analytics.totals.clicks)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Avg Visit Duration' value={formatDuration(analytics.totals.avgVisitDurationSeconds)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard label='Avg Pages / Visit' value={analytics.totals.avgPagesPerVisit.toFixed(2)} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TrendChart daily={analytics.daily} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <HorizontalBarsCard title='Top Pages (Views)' items={topPages} barColor='#2563eb' />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <HorizontalBarsCard title='Top Click Targets' items={topClicks} barColor='#16a34a' />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <HorizontalBarsCard title='Countries (Visitors)' items={countries} barColor='#f97316' />
        </Grid>
      </Grid>
    </Box>
  )
}
