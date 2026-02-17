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

type HeroSlide = {
  image: string
  position: string
}

type HeroContent = {
  titleLead: string
  titleHighlight: string
  titleTail: string
  description: string
  ctaLocations: string
  ctaLocationsHref: string
  ctaQuote: string
  ctaQuoteHref: string
  slides: HeroSlide[]
}

const localeOptions: Locale[] = ['en', 'de', 'tr']
const maxSlides = 8
const positionPresets = ['center center', 'center 20%', 'center 35%', 'center 50%', 'left center', 'right center', 'top center', 'bottom center']

const isValidPosition = (value: string) => {
  const text = String(value || '').trim()
  const partRegex = /^(left|center|right|top|bottom|\d{1,3}%|\d{1,4}px)$/i
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length < 1 || parts.length > 2) return false
  return parts.every(part => partRegex.test(part))
}

const normalizeHero = (input: unknown): HeroContent => {
  const value = (input || {}) as Partial<HeroContent>
  const slides = Array.isArray(value.slides)
    ? value.slides
        .map(item => ({
          image: String(item?.image || '').trim(),
          position: String(item?.position || '').trim() || 'center center'
        }))
        .filter(item => Boolean(item.image))
    : []

  return {
    titleLead: String(value.titleLead || '').trim(),
    titleHighlight: String(value.titleHighlight || '').trim(),
    titleTail: String(value.titleTail || '').trim(),
    description: String(value.description || '').trim(),
    ctaLocations: String(value.ctaLocations || '').trim(),
    ctaLocationsHref: String(value.ctaLocationsHref || '/hotels').trim(),
    ctaQuote: String(value.ctaQuote || '').trim(),
    ctaQuoteHref: String(value.ctaQuoteHref || '/contact').trim(),
    slides
  }
}

export default function HeroSettingsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  const publicBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [hero, setHero] = useState<HeroContent>({
    titleLead: '',
    titleHighlight: '',
    titleTail: '',
    description: '',
    ctaLocations: '',
    ctaLocationsHref: '/hotels',
    ctaQuote: '',
    ctaQuoteHref: '/contact',
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
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadHero(nextLocale)
  }

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

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

    setUploadingIndex(slideIndex)
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
        body: JSON.stringify({
          fileName: file.name,
          dataUrl
        })
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
      setUploadingIndex(null)
    }
  }

  const validateHero = (value: HeroContent) => {
    if (!value.titleLead || !value.titleHighlight || !value.titleTail) return 'Hero title fields are required.'
    if (!value.description || !value.ctaLocations || !value.ctaQuote) return 'Description and CTA fields are required.'
    if (!value.ctaLocationsHref || !value.ctaQuoteHref) return 'CTA link fields are required.'
    const isValidLink = (href: string) => href.startsWith('/') || /^https?:\/\//i.test(href)
    if (!isValidLink(value.ctaLocationsHref) || !isValidLink(value.ctaQuoteHref)) {
      return 'CTA links must start with "/" or "http(s)://".'
    }
    if (value.slides.length < 1) return 'At least one slide is required.'
    if (value.slides.length > maxSlides) return `Slide limit is ${maxSlides}.`
    for (const [index, slide] of value.slides.entries()) {
      if (!slide.image) return `Slide ${index + 1}: image is required.`
      if (!isValidPosition(slide.position)) return `Slide ${index + 1}: position is invalid (e.g. "center 35%").`
    }
    return null
  }

  const resolvePreviewUrl = (rawUrl: string) => {
    const value = String(rawUrl || '').trim()
    if (!value) return ''
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }
    if (value.startsWith('/api/')) {
      return `${apiBaseUrl}${value}`
    }
    if (value.startsWith('/')) {
      return `${publicBaseUrl}${value}`
    }
    return value
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
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  label='Title Lead'
                  value={hero.titleLead}
                  onChange={e => setHero(prev => ({ ...prev, titleLead: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  label='Title Highlight'
                  value={hero.titleHighlight}
                  onChange={e => setHero(prev => ({ ...prev, titleHighlight: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField
                  label='Title Tail'
                  value={hero.titleTail}
                  onChange={e => setHero(prev => ({ ...prev, titleTail: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  multiline
                  minRows={3}
                  label='Description'
                  value={hero.description}
                  onChange={e => setHero(prev => ({ ...prev, description: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='CTA Locations'
                  value={hero.ctaLocations}
                  onChange={e => setHero(prev => ({ ...prev, ctaLocations: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='CTA Locations Link'
                  value={hero.ctaLocationsHref}
                  onChange={e => setHero(prev => ({ ...prev, ctaLocationsHref: e.target.value }))}
                  helperText='Use /hotels or https://...'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='CTA Quote'
                  value={hero.ctaQuote}
                  onChange={e => setHero(prev => ({ ...prev, ctaQuote: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='CTA Quote Link'
                  value={hero.ctaQuoteHref}
                  onChange={e => setHero(prev => ({ ...prev, ctaQuoteHref: e.target.value }))}
                  helperText='Use /contact or https://...'
                  fullWidth
                />
              </Grid>
            </Grid>

            <Typography variant='h6'>Slides</Typography>
            {hero.slides.map((slide, index) => (
              <Card key={`hero-slide-${index}`} variant='outlined'>
                <CardContent className='flex flex-col gap-3'>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <CustomTextField
                        label='Image URL'
                        value={slide.image}
                        onChange={e =>
                          setHero(prev => ({
                            ...prev,
                            slides: prev.slides.map((item, i) => (i === index ? { ...item, image: e.target.value } : item))
                          }))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        select
                        label='Position Preset'
                        value={positionPresets.includes(slide.position) ? slide.position : ''}
                        onChange={e =>
                          setHero(prev => ({
                            ...prev,
                            slides: prev.slides.map((item, i) => (i === index ? { ...item, position: e.target.value } : item))
                          }))
                        }
                        fullWidth
                      >
                        <MenuItem value=''>Custom</MenuItem>
                        {positionPresets.map(preset => (
                          <MenuItem key={preset} value={preset}>
                            {preset}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <CustomTextField
                        label='Position'
                        value={slide.position}
                        onChange={e =>
                          setHero(prev => ({
                            ...prev,
                            slides: prev.slides.map((item, i) => (i === index ? { ...item, position: e.target.value } : item))
                          }))
                        }
                        helperText='e.g. center 35%'
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Button component='label' variant='outlined' fullWidth disabled={uploadingIndex === index}>
                        {uploadingIndex === index ? 'Uploading...' : 'Upload Image'}
                        <input
                          hidden
                          type='file'
                          accept='image/png,image/jpeg,image/jpg,image/webp'
                          onChange={e => {
                            const file = e.target.files?.[0] || null
                            if (file) {
                              void uploadHeroImage(file, index)
                            }
                            e.currentTarget.value = ''
                          }}
                        />
                      </Button>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Button
                        color='error'
                        variant='outlined'
                        fullWidth
                        onClick={() =>
                          setHero(prev => ({
                            ...prev,
                            slides: prev.slides.filter((_, i) => i !== index)
                          }))
                        }
                      >
                        Remove Slide
                      </Button>
                    </Grid>
                    {slide.image ? (
                      <Grid size={{ xs: 12 }}>
                        <img
                          src={resolvePreviewUrl(slide.image)}
                          alt={`Hero slide ${index + 1}`}
                          style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                        />
                      </Grid>
                    ) : null}
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <div className='flex gap-2'>
              <Button
                variant='outlined'
                disabled={hero.slides.length >= maxSlides}
                onClick={() =>
                  setHero(prev => ({
                    ...prev,
                    slides: [...prev.slides, { image: '', position: 'center center' }]
                  }))
                }
              >
                Add Slide
              </Button>
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
