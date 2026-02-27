'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import AnalyticsOverviewPanel from '@/components/analytics/AnalyticsOverviewPanel'
import type { AnalyticsOverview } from '@/types/analytics'
import { defaultAnalyticsOverview } from '@/types/analytics'
import { fetchAnalyticsOverview, resolveApiBaseUrl } from '@/utils/analytics'

export default function Page() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = resolveApiBaseUrl(configuredApiBaseUrl)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(defaultAnalyticsOverview)

  const loadAnalytics = useCallback(async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setAnalyticsError('No active session. Please login again.')
      setAnalyticsLoading(false)

      return
    }

    setAnalyticsLoading(true)
    setAnalyticsError('')
    try {
      const next = await fetchAnalyticsOverview(apiBaseUrl, token, { days: 30 })
      setAnalytics(next)
    } catch (loadError) {
      setAnalyticsError(String((loadError as Error)?.message || 'Analytics data could not be loaded.'))
    } finally {
      setAnalyticsLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Meri Admin Dashboard</Typography>
        <Typography color='text.secondary'>Start managing public content modules from here.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <div className='flex flex-wrap gap-3'>
          <Button href='/content-home' variant='contained'>
            Manage Home Content
          </Button>
          <Button href='/hotels' variant='outlined'>
            Manage Hotels
          </Button>
          <Button href='/system/general-settings' variant='outlined'>
            General Settings
          </Button>
        </div>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {analyticsError ? <Alert severity='warning'>{analyticsError}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <Typography variant='h5'>Visitor Analytics</Typography>
                <Typography color='text.secondary'>
                  Period: last {analytics.periodDays} days
                  {analytics.generatedAt ? ` | Updated: ${new Date(analytics.generatedAt).toLocaleString()}` : ''}
                </Typography>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outlined' onClick={() => void loadAnalytics()} disabled={analyticsLoading}>
                  {analyticsLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button href='/system/general-settings' variant='contained'>
                  Full Analytics
                </Button>
              </div>
            </div>

            {analyticsLoading && !analytics.generatedAt ? (
              <Typography color='text.secondary'>Loading analytics...</Typography>
            ) : (
              <AnalyticsOverviewPanel analytics={analytics} topLimit={6} />
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
