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

type TestimonialsContent = {
  apartmentsCount: number
  backgroundImage: string
  apartments: string
  locations: string
  slides: Array<{
    badge: string
    text: string
  }>
}

type TestimonialsErrors = {
  apartmentsCount?: string
  backgroundImage?: string
  apartments?: string
  locations?: string
  slides?: string
  slideByIndex: Record<number, { badge?: string; text?: string }>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']

const normalizeTestimonials = (input: unknown): TestimonialsContent => {
  const value = (input || {}) as Partial<TestimonialsContent>

  return {
    apartmentsCount: Number(value.apartmentsCount) || 0,
    backgroundImage: String(value.backgroundImage || '').trim(),
    apartments: String(value.apartments || '').trim(),
    locations: String(value.locations || '').trim(),
    slides: Array.isArray(value.slides)
      ? value.slides
          .map(item => ({
            badge: String(item?.badge || '').trim(),
            text: String(item?.text || '').trim()
          }))
          .filter(item => Boolean(item.badge) || Boolean(item.text))
      : []
  }
}

export default function TestimonialsSettingsPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [uploadError, setUploadError] = useState('')
  const [formErrors, setFormErrors] = useState<TestimonialsErrors>({ slideByIndex: {} })
  const [testimonials, setTestimonials] = useState<TestimonialsContent>({
    apartmentsCount: 0,
    backgroundImage: '',
    apartments: '',
    locations: '',
    slides: []
  })

  const loadTestimonials = async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')
      return
    }

    setError('')
    setSuccess('')
    setUploadError('')
    setFormErrors({ slideByIndex: {} })
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
        setError(data?.error || 'Testimonials content could not be loaded.')
        return
      }

      setTestimonials(normalizeTestimonials(data?.content?.testimonials || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTestimonials(locale)
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadTestimonials(nextLocale)
  }

  const validateTestimonials = (value: TestimonialsContent): TestimonialsErrors => {
    const errors: TestimonialsErrors = { slideByIndex: {} }
    if (!Number.isFinite(value.apartmentsCount) || value.apartmentsCount < 1 || value.apartmentsCount > 99999) {
      errors.apartmentsCount = 'Use a number between 1 and 99999.'
    }
    if (!value.backgroundImage.trim()) {
      errors.backgroundImage = 'Background image is required.'
    }
    if (!value.apartments.trim()) {
      errors.apartments = 'Apartments label is required.'
    }
    if (!value.locations.trim()) {
      errors.locations = 'Locations text is required.'
    }
    if (value.slides.length < 1) {
      errors.slides = 'At least one slide is required.'
    }
    if (value.slides.length > 8) {
      errors.slides = 'Slide limit is 8.'
    }
    for (const [index, slide] of value.slides.entries()) {
      const slideErrors: { badge?: string; text?: string } = {}
      if (!slide.badge.trim()) slideErrors.badge = 'Badge is required.'
      if (!slide.text.trim()) slideErrors.text = 'Text is required.'
      if (slideErrors.badge || slideErrors.text) {
        errors.slideByIndex[index] = slideErrors
      }
    }
    return errors
  }

  const hasErrors = (errors: TestimonialsErrors) =>
    Boolean(
      errors.apartmentsCount ||
        errors.backgroundImage ||
        errors.apartments ||
        errors.locations ||
        errors.slides ||
        Object.keys(errors.slideByIndex).length
    )

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const uploadBackgroundImage = async (file: File) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setUploadError('Only PNG, JPG or WEBP files are allowed.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size cannot exceed 8MB.')
      return
    }

    setSaving(true)
    setUploadError('')
    setError('')
    setSuccess('')
    try {
      const dataUrl = await toDataUrl(file)
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home/testimonials-image`, {
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
        setUploadError(data?.error || 'Testimonials image upload failed.')
        return
      }

      setTestimonials(prev => ({ ...prev, backgroundImage: String(data?.imageUrl || '') }))
      setFormErrors(prev => ({ ...prev, backgroundImage: undefined }))
      setSuccess('Testimonials image uploaded.')
    } catch {
      setUploadError('Testimonials image upload failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const validationErrors = validateTestimonials(testimonials)
    setFormErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    setError('')
    setSuccess('')
    setUploadError('')
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
            testimonials
          }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Testimonials settings could not be saved.')
        return
      }

      setSuccess('Testimonials settings saved.')
      await loadTestimonials(locale)
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
        <Typography variant='h4'>Testimonials Settings</Typography>
        <Typography color='text.secondary'>Manage apartments count and background image for the testimonials section.</Typography>
        <Typography variant='caption' color='text.secondary'>
          Note: Apartments count and image are shared globally across all locales.
        </Typography>
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
                  type='number'
                  label='Apartments Count'
                  value={testimonials.apartmentsCount}
                  onChange={e => {
                    setTestimonials(prev => ({ ...prev, apartmentsCount: Number(e.target.value) }))
                    setFormErrors(prev => ({ ...prev, apartmentsCount: undefined }))
                  }}
                  error={Boolean(formErrors.apartmentsCount)}
                  helperText={formErrors.apartmentsCount}
                  inputProps={{ min: 1, max: 99999 }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <CustomTextField
                  label='Background Image URL'
                  value={testimonials.backgroundImage}
                  onChange={e => {
                    setTestimonials(prev => ({ ...prev, backgroundImage: e.target.value }))
                    setFormErrors(prev => ({ ...prev, backgroundImage: undefined }))
                  }}
                  error={Boolean(formErrors.backgroundImage)}
                  helperText={formErrors.backgroundImage}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='Apartments Label'
                  value={testimonials.apartments}
                  onChange={e => {
                    setTestimonials(prev => ({ ...prev, apartments: e.target.value }))
                    setFormErrors(prev => ({ ...prev, apartments: undefined }))
                  }}
                  error={Boolean(formErrors.apartments)}
                  helperText={formErrors.apartments}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='Locations Text'
                  value={testimonials.locations}
                  onChange={e => {
                    setTestimonials(prev => ({ ...prev, locations: e.target.value }))
                    setFormErrors(prev => ({ ...prev, locations: undefined }))
                  }}
                  error={Boolean(formErrors.locations)}
                  helperText={formErrors.locations}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Button component='label' variant={uploadError ? 'contained' : 'outlined'} color={uploadError ? 'error' : 'primary'} fullWidth disabled={saving}>
                  Upload Background
                  <input
                    hidden
                    type='file'
                    accept='image/png,image/jpeg,image/jpg,image/webp'
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      if (file) {
                        void uploadBackgroundImage(file)
                      }
                      e.currentTarget.value = ''
                    }}
                  />
                </Button>
                {uploadError ? (
                  <Typography variant='caption' color='error.main'>
                    {uploadError}
                  </Typography>
                ) : null}
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                {testimonials.backgroundImage ? (
                  <img
                    src={testimonials.backgroundImage.startsWith('/api/') ? `${apiBaseUrl}${testimonials.backgroundImage}` : testimonials.backgroundImage}
                    alt='Testimonials background preview'
                    style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                  />
                ) : null}
              </Grid>
            </Grid>

            <Typography variant='h6'>Slides</Typography>
            {formErrors.slides ? <Alert severity='error'>{formErrors.slides}</Alert> : null}
            {testimonials.slides.map((slide, index) => (
              <Card key={`testimonials-slide-${index}`} variant='outlined'>
                <CardContent className='flex flex-col gap-3'>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        label='Badge'
                        value={slide.badge}
                        onChange={e => {
                          setTestimonials(prev => ({
                            ...prev,
                            slides: prev.slides.map((item, i) => (i === index ? { ...item, badge: e.target.value } : item))
                          }))
                          setFormErrors(prev => ({
                            ...prev,
                            slideByIndex: {
                              ...prev.slideByIndex,
                              [index]: { ...prev.slideByIndex[index], badge: undefined }
                            }
                          }))
                        }}
                        error={Boolean(formErrors.slideByIndex[index]?.badge)}
                        helperText={formErrors.slideByIndex[index]?.badge}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <CustomTextField
                        label='Text'
                        multiline
                        minRows={2}
                        value={slide.text}
                        onChange={e => {
                          setTestimonials(prev => ({
                            ...prev,
                            slides: prev.slides.map((item, i) => (i === index ? { ...item, text: e.target.value } : item))
                          }))
                          setFormErrors(prev => ({
                            ...prev,
                            slideByIndex: {
                              ...prev.slideByIndex,
                              [index]: { ...prev.slideByIndex[index], text: undefined }
                            }
                          }))
                        }}
                        error={Boolean(formErrors.slideByIndex[index]?.text)}
                        helperText={formErrors.slideByIndex[index]?.text}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Button
                        variant='outlined'
                        color='error'
                        fullWidth
                        onClick={() =>
                          setTestimonials(prev => ({
                            ...prev,
                            slides: prev.slides.filter((_, i) => i !== index)
                          }))
                        }
                      >
                        Remove Slide
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <div>
              <Button
                variant='outlined'
                disabled={testimonials.slides.length >= 8}
                onClick={() =>
                  setTestimonials(prev => ({
                    ...prev,
                    slides: [...prev.slides, { badge: '', text: '' }]
                  }))
                }
              >
                Add Slide
              </Button>
            </div>

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Testimonials Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
