'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type Locale = 'en' | 'de' | 'tr'

type VideoCtaContent = {
  videoUrl: string
}

const localeOptions: Locale[] = ['en', 'de', 'tr']

const normalizeVideo = (input: unknown): VideoCtaContent => {
  const value = (input || {}) as Partial<VideoCtaContent>
  return {
    videoUrl: String(value.videoUrl || '').trim()
  }
}

const isSupportedVideoUrl = (url: string) => {
  const raw = String(url || '').trim()
  if (!raw) return false
  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.toLowerCase()
    return host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be' || host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com'
  } catch {
    return false
  }
}

export default function VideoSettingsPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl =
    configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
      ? ''
      : configuredApiBaseUrl

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [video, setVideo] = useState<VideoCtaContent>({
    videoUrl: ''
  })

  const loadVideo = async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')
      return
    }

    setError('')
    setSuccess('')
    try {
      const meResponse = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const meData = await meResponse.json()
      if (!meResponse.ok) {
        setLoading(false)
        setError(meData?.error || 'Profile check failed.')
        return
      }

      const canAccess = ['super_admin', 'moderator'].includes(String(meData?.admin?.role || ''))
      setAllowed(canAccess)
      if (!canAccess) {
        setLoading(false)
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home?locale=${targetLocale}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        setLoading(false)
        setError(data?.error || 'Video settings could not be loaded.')
        return
      }

      setVideo(normalizeVideo(data?.content?.videoCta || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVideo(locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadVideo(nextLocale)
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const normalized = normalizeVideo(video)
    if (!isSupportedVideoUrl(normalized.videoUrl)) {
      setError('Please enter a valid YouTube or Vimeo URL.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          locale,
          content: {
            videoCta: normalized
          }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Video settings could not be saved.')
        return
      }
      setSuccess('Video settings saved.')
      await loadVideo(locale)
    } catch {
      setError('API connection failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Typography>Loading...</Typography>
  if (!allowed) return <Alert severity='error'>Only super admin or moderator can access this panel.</Alert>

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Video Settings</Typography>
        <Typography color='text.secondary'>Set the home page video popup URL. Supported providers: YouTube and Vimeo.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <CustomTextField select label='Locale' value={locale} onChange={e => void handleLocaleChange(e.target.value as Locale)} fullWidth>
              {localeOptions.map(item => (
                <MenuItem key={item} value={item}>
                  {item.toUpperCase()}
                </MenuItem>
              ))}
            </CustomTextField>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <CustomTextField
              label='Video URL'
              value={video.videoUrl}
              onChange={e => setVideo({ videoUrl: e.target.value })}
              helperText='Examples: https://www.youtube.com/watch?v=... or https://vimeo.com/...'
              fullWidth
            />
            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Video Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
