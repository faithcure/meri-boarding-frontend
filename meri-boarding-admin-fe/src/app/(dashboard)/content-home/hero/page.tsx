'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import HeroMainFields from './components/HeroMainFields'
import HeroPartnersEditor from './components/HeroPartnersEditor'
import HeroSlidesEditor from './components/HeroSlidesEditor'
import type { HeroContent, Locale, UploadingTarget } from './types'
import { localeOptions, maxPartners, maxSlides, normalizeHero, positionPresets, resolvePreviewUrl, toDataUrl, validateHero } from './utils'

export default function HeroSettingsPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl =
    configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost') ? '' : configuredApiBaseUrl
  const publicBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<UploadingTarget>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [activeTab, setActiveTab] = useState<'hero' | 'partners'>('hero')
  const [hero, setHero] = useState<HeroContent>({
    titleLead: '',
    titleHighlight: '',
    titleTail: '',
    description: '',
    ctaLocations: '',
    ctaLocationsHref: '/hotels',
    ctaQuote: '',
    ctaQuoteHref: '/contact',
    bookingPartnersVisibility: {
      hotelsPage: true,
      hotelDetailPage: true
    },
    bookingPartners: [],
    slides: []
  })

  const loadHero = async (targetLocale: Locale) => {
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
        setError(data?.error || 'Hero content could not be loaded.')
        return
      }

      setHero(normalizeHero(data?.content?.hero || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHero(locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadHero(nextLocale)
  }

  const uploadHeroImage = async (file: File, slideIndex: number) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPG or WEBP files are allowed.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image size cannot exceed 8MB.')
      return
    }

    setUploadingTarget({ kind: 'slide', index: slideIndex })
    setError('')
    setSuccess('')
    try {
      const dataUrl = await toDataUrl(file)
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home/hero-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fileName: file.name, dataUrl })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Hero image upload failed.')
        return
      }

      setHero(prev => ({
        ...prev,
        slides: prev.slides.map((item, i) => (i === slideIndex ? { ...item, image: String(data?.imageUrl || '') } : item))
      }))
      setSuccess('Hero image uploaded.')
    } catch {
      setError('Hero image upload failed.')
    } finally {
      setUploadingTarget(null)
    }
  }

  const uploadBookingPartnerLogo = async (file: File, partnerIndex: number) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      setError('Only PNG or SVG files are allowed.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Logo size cannot exceed 4MB.')
      return
    }

    setUploadingTarget({ kind: 'partner', index: partnerIndex })
    setError('')
    setSuccess('')
    try {
      const dataUrl = await toDataUrl(file)
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home/partner-logo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          dataUrl,
          oldLogoUrl: String(hero.bookingPartners[partnerIndex]?.logo || '')
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Booking partner logo upload failed.')
        return
      }

      setHero(prev => ({
        ...prev,
        bookingPartners: prev.bookingPartners.map((item, i) => (i === partnerIndex ? { ...item, logo: String(data?.imageUrl || '') } : item))
      }))
      setSuccess('Booking partner logo uploaded.')
    } catch {
      setError('Booking partner logo upload failed.')
    } finally {
      setUploadingTarget(null)
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const validationError = validateHero(hero)
    if (validationError) {
      setError(validationError)
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
            hero
          }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Hero settings could not be saved.')
        return
      }
      setSuccess('Hero settings saved.')
      await loadHero(locale)
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
        <Typography variant='h4'>Hero Settings</Typography>
        <Typography color='text.secondary'>Manage hero text, CTA labels and slide images.</Typography>
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

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Tabs value={activeTab} onChange={(_, value: 'hero' | 'partners') => setActiveTab(value)}>
              <Tab value='hero' label='Hero Content' />
              <Tab value='partners' label='Booking Partners' />
            </Tabs>

            {activeTab === 'hero' ? (
              <Box className='flex flex-col gap-4'>
                <HeroMainFields hero={hero} onChange={updater => setHero(prev => updater(prev))} />

                <Typography variant='h6'>Slides</Typography>
                <HeroSlidesEditor
                  hero={hero}
                  uploadingTarget={uploadingTarget}
                  positionPresets={positionPresets}
                  resolvePreviewUrl={rawUrl => resolvePreviewUrl(rawUrl, apiBaseUrl, publicBaseUrl)}
                  onChange={updater => setHero(prev => updater(prev))}
                  onUpload={uploadHeroImage}
                  onRemove={index => setHero(prev => ({ ...prev, slides: prev.slides.filter((_, i) => i !== index) }))}
                />
              </Box>
            ) : (
              <Box className='flex flex-col gap-4'>
                <Typography variant='h6'>Booking Partners</Typography>
                <Box className='flex flex-col'>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={hero.bookingPartnersVisibility.hotelsPage}
                        onChange={(_, checked) =>
                          setHero(prev => ({
                            ...prev,
                            bookingPartnersVisibility: { ...prev.bookingPartnersVisibility, hotelsPage: checked }
                          }))
                        }
                      />
                    }
                    label='Show on Hotels page (/hotels)'
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={hero.bookingPartnersVisibility.hotelDetailPage}
                        onChange={(_, checked) =>
                          setHero(prev => ({
                            ...prev,
                            bookingPartnersVisibility: { ...prev.bookingPartnersVisibility, hotelDetailPage: checked }
                          }))
                        }
                      />
                    }
                    label='Show on Hotel Detail pages (/hotels/:slug)'
                  />
                </Box>
                <HeroPartnersEditor
                  hero={hero}
                  uploadingTarget={uploadingTarget}
                  resolvePreviewUrl={rawUrl => resolvePreviewUrl(rawUrl, apiBaseUrl, publicBaseUrl)}
                  onChange={updater => setHero(prev => updater(prev))}
                  onUpload={uploadBookingPartnerLogo}
                  onRemove={index => setHero(prev => ({ ...prev, bookingPartners: prev.bookingPartners.filter((_, i) => i !== index) }))}
                />
              </Box>
            )}

            <div className='flex gap-2'>
              {activeTab === 'hero' ? (
                <Button
                  variant='outlined'
                  disabled={hero.slides.length >= maxSlides}
                  onClick={() => setHero(prev => ({ ...prev, slides: [...prev.slides, { image: '', position: 'center center' }] }))}
                >
                  Add Slide
                </Button>
              ) : (
                <Button
                  variant='outlined'
                  disabled={hero.bookingPartners.length >= maxPartners}
                  onClick={() => setHero(prev => ({ ...prev, bookingPartners: [...prev.bookingPartners, { name: '', logo: '', url: '', description: '' }] }))}
                >
                  Add Booking Partner
                </Button>
              )}
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Hero Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
