'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type Locale = 'en' | 'de' | 'tr'

type BookingPartner = {
  name: string
  logo: string
  url: string
  description: string
}

type HomeHeroPayload = {
  bookingPartnersTitle?: string
  bookingPartnersDescription?: string
  bookingPartnersVisibility?: {
    hotelsPage?: boolean
    hotelDetailPage?: boolean
  }
  bookingPartners?: Array<Partial<BookingPartner>>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']
const maxPartners = 12
const defaultSectionTitle = 'Booking Partners'
const defaultSectionDescription = 'Reserve through our trusted platforms and partners.'

const isValidLink = (href: string) => href.startsWith('/') || /^https?:\/\//i.test(href)

const normalizePartners = (input: unknown): BookingPartner[] => {
  const source = ((input || {}) as HomeHeroPayload).bookingPartners

  if (!Array.isArray(source)) return []

  return source
    .map(item => ({
      name: String(item?.name || '').trim(),
      logo: String(item?.logo || '').trim(),
      url: String(item?.url || '').trim(),
      description: String(item?.description || '').trim()
    }))
    .filter(item => Boolean(item.name) || Boolean(item.logo) || Boolean(item.url) || Boolean(item.description))
    .slice(0, maxPartners)
}

export default function PartnerLogosPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl =
    configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
      ? ''
      : configuredApiBaseUrl
  const publicBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [locale, setLocale] = useState<Locale>('en')
  const [sectionTitle, setSectionTitle] = useState(defaultSectionTitle)
  const [sectionDescription, setSectionDescription] = useState(defaultSectionDescription)
  const [bookingPartnersVisibility, setBookingPartnersVisibility] = useState({
    hotelsPage: true,
    hotelDetailPage: true
  })
  const [partners, setPartners] = useState<BookingPartner[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resolvePreviewUrl = (rawUrl: string) => {
    const value = String(rawUrl || '').trim()
    if (!value) return ''
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) return value
    if (value.startsWith('/api/')) return `${apiBaseUrl}${value}`
    if (value.startsWith('/')) return `${publicBaseUrl}${value}`
    return value
  }

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const loadPartners = async (targetLocale: Locale) => {
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
        setError(data?.error || 'Partner list could not be loaded.')
        return
      }

      const hero = (data?.content?.hero || {}) as HomeHeroPayload
      setSectionTitle(String(hero.bookingPartnersTitle || defaultSectionTitle).trim() || defaultSectionTitle)
      setSectionDescription(String(hero.bookingPartnersDescription || defaultSectionDescription).trim() || defaultSectionDescription)
      setBookingPartnersVisibility({
        hotelsPage: Boolean(hero.bookingPartnersVisibility?.hotelsPage ?? true),
        hotelDetailPage: Boolean(hero.bookingPartnersVisibility?.hotelDetailPage ?? true)
      })
      setPartners(normalizePartners(hero))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPartners(locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadPartners(nextLocale)
  }

  const uploadLogo = async (file: File, index: number) => {
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

    setUploadingIndex(index)
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
          oldLogoUrl: String(partners[index]?.logo || '')
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Partner logo upload failed.')
        return
      }

      setPartners(prev => prev.map((item, i) => (i === index ? { ...item, logo: String(data?.imageUrl || '') } : item)))
      setSuccess('Partner logo uploaded.')
    } catch {
      setError('Partner logo upload failed.')
    } finally {
      setUploadingIndex(null)
    }
  }

  const validate = () => {
    if (sectionTitle.trim().length > 120) return 'Section title must be at most 120 characters.'
    if (sectionDescription.trim().length > 320) return 'Section description must be at most 320 characters.'
    if (partners.length > maxPartners) return `Partner limit is ${maxPartners}.`
    for (const [index, partner] of partners.entries()) {
      if (!partner.name || !partner.logo || !partner.url) {
        return `Partner ${index + 1}: name, logo and link are required.`
      }
      if (!isValidLink(partner.url)) {
        return `Partner ${index + 1}: link must start with "/" or "http(s)://".`
      }
      if (partner.description.length > 300) {
        return `Partner ${index + 1}: description must be at most 300 characters.`
      }
    }
    return null
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const validationError = validate()
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
            hero: {
              bookingPartnersTitle: sectionTitle.trim(),
              bookingPartnersDescription: sectionDescription.trim(),
              bookingPartnersVisibility,
              bookingPartners: partners
            }
          }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Partner logos could not be saved.')
        return
      }
      setSuccess('Partner logos saved.')
      await loadPartners(locale)
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
        <Typography variant='h4'>Partner Logos</Typography>
        <Typography color='text.secondary'>Manage booking partner logos (PNG/SVG upload), descriptions and links.</Typography>
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
          <CardContent className='flex flex-col gap-3'>
            <Typography variant='h6'>Section Content</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='Section Title'
                  value={sectionTitle}
                  onChange={e => setSectionTitle(e.target.value)}
                  helperText='Max 120 characters'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='Section Description'
                  value={sectionDescription}
                  onChange={e => setSectionDescription(e.target.value)}
                  helperText='Max 320 characters'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingPartnersVisibility.hotelsPage}
                      onChange={(_, checked) =>
                        setBookingPartnersVisibility(prev => ({ ...prev, hotelsPage: checked }))
                      }
                    />
                  }
                  label='Show on Hotels page (/hotels)'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingPartnersVisibility.hotelDetailPage}
                      onChange={(_, checked) =>
                        setBookingPartnersVisibility(prev => ({ ...prev, hotelDetailPage: checked }))
                      }
                    />
                  }
                  label='Show on Hotel Detail pages (/hotels/:slug)'
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            {partners.map((partner, index) => (
              <Card key={`partner-${index}`} variant='outlined'>
                <CardContent className='flex flex-col gap-3'>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <CustomTextField
                        label='Partner Name'
                        value={partner.name}
                        onChange={e =>
                          setPartners(prev => prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <CustomTextField
                        label='Partner Link'
                        value={partner.url}
                        onChange={e =>
                          setPartners(prev => prev.map((item, i) => (i === index ? { ...item, url: e.target.value } : item)))
                        }
                        helperText='Use /reservation or https://...'
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <CustomTextField
                        label='Description'
                        value={partner.description}
                        onChange={e =>
                          setPartners(prev => prev.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)))
                        }
                        helperText='Optional, max 300 chars'
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }} className='flex items-center'>
                      <Stack direction='row' spacing={1}>
                        <Tooltip title='Upload Logo (PNG/SVG)'>
                          <IconButton component='label' color='primary' disabled={uploadingIndex === index}>
                            <i className={`bx ${uploadingIndex === index ? 'bx-loader-alt bx-spin' : 'bx-upload'}`} />
                            <input
                              hidden
                              type='file'
                              accept='image/png,image/svg+xml'
                              onChange={e => {
                                const file = e.target.files?.[0] || null
                                if (file) void uploadLogo(file, index)
                                e.currentTarget.value = ''
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Clear Logo'>
                          <IconButton
                            color='warning'
                            onClick={() => setPartners(prev => prev.map((item, i) => (i === index ? { ...item, logo: '' } : item)))}
                          >
                            <i className='bx bx-eraser' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Remove Partner'>
                          <IconButton color='error' onClick={() => setPartners(prev => prev.filter((_, i) => i !== index))}>
                            <i className='bx bx-trash' />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Grid>
                    {partner.logo ? (
                      <Grid size={{ xs: 12 }}>
                        <img
                          src={resolvePreviewUrl(partner.logo)}
                          alt={partner.name || `Partner ${index + 1}`}
                          style={{ width: 220, maxHeight: 72, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', padding: 8 }}
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
                disabled={partners.length >= maxPartners}
                onClick={() => setPartners(prev => [...prev, { name: '', logo: '', url: '', description: '' }])}
              >
                Add Partner
              </Button>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Partner Logos'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
