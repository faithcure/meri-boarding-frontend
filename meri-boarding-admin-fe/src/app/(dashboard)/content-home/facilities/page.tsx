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

type FacilitiesContent = {
  subtitle: string
  title: string
  description: string
  stats: Array<{ label: string; suffix: string }>
  primaryImage: string
  secondaryImage: string
  statsNumbers: [number, number, number]
}

type FacilitiesErrors = {
  subtitle?: string
  title?: string
  description?: string
  primaryImage?: string
  secondaryImage?: string
  stats?: string
  statsByIndex: Record<number, { label?: string; suffix?: string; number?: string }>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']

const normalizeFacilities = (input: unknown): FacilitiesContent => {
  const value = (input || {}) as Partial<FacilitiesContent>
  const stats = Array.isArray(value.stats)
    ? value.stats
        .map(item => ({
          label: String(item?.label || '').trim(),
          suffix: String(item?.suffix || '').trim()
        }))
        .slice(0, 3)
    : []
  while (stats.length < 3) stats.push({ label: '', suffix: '' })
  const statsNumbersSource = Array.isArray(value.statsNumbers) ? value.statsNumbers : [0, 0, 0]
  const statsNumbers: [number, number, number] = [
    Number(statsNumbersSource[0]) || 0,
    Number(statsNumbersSource[1]) || 0,
    Number(statsNumbersSource[2]) || 0
  ]

  return {
    subtitle: String(value.subtitle || '').trim(),
    title: String(value.title || '').trim(),
    description: String(value.description || '').trim(),
    stats,
    primaryImage: String(value.primaryImage || '').trim(),
    secondaryImage: String(value.secondaryImage || '').trim(),
    statsNumbers
  }
}

export default function FacilitiesSettingsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [uploadErrors, setUploadErrors] = useState<{ primary?: string; secondary?: string }>({})
  const [formErrors, setFormErrors] = useState<FacilitiesErrors>({ statsByIndex: {} })
  const [facilities, setFacilities] = useState<FacilitiesContent>({
    subtitle: '',
    title: '',
    description: '',
    stats: [
      { label: '', suffix: '' },
      { label: '', suffix: '' },
      { label: '', suffix: '' }
    ],
    primaryImage: '',
    secondaryImage: '',
    statsNumbers: [0, 0, 0]
  })

  const loadFacilities = async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')
      return
    }

    setError('')
    setSuccess('')
    setUploadErrors({})
    setFormErrors({ statsByIndex: {} })
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
        setError(data?.error || 'Facilities content could not be loaded.')
        return
      }

      setFacilities(normalizeFacilities(data?.content?.facilities || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFacilities(locale)
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadFacilities(nextLocale)
  }

  const validateFacilities = (value: FacilitiesContent): FacilitiesErrors => {
    const errors: FacilitiesErrors = { statsByIndex: {} }
    if (!value.subtitle.trim()) errors.subtitle = 'Subtitle is required.'
    if (!value.title.trim()) errors.title = 'Title is required.'
    if (!value.description.trim()) errors.description = 'Description is required.'
    if (!value.primaryImage.trim()) errors.primaryImage = 'Primary image is required.'
    if (!value.secondaryImage.trim()) errors.secondaryImage = 'Secondary image is required.'
    if (value.stats.length !== 3) errors.stats = 'Exactly 3 stats are required.'

    value.stats.forEach((item, index) => {
      const entry: { label?: string; suffix?: string; number?: string } = {}
      if (!item.label.trim()) entry.label = 'Label is required.'
      if (!item.suffix.trim()) entry.suffix = 'Suffix is required.'
      const numberValue = Number(value.statsNumbers[index])
      if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 99999) {
        entry.number = 'Use a number between 0 and 99999.'
      }
      if (entry.label || entry.suffix || entry.number) {
        errors.statsByIndex[index] = entry
      }
    })
    return errors
  }

  const hasErrors = (errors: FacilitiesErrors) =>
    Boolean(
      errors.subtitle ||
        errors.title ||
        errors.description ||
        errors.primaryImage ||
        errors.secondaryImage ||
        errors.stats ||
        Object.keys(errors.statsByIndex).length
    )

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const uploadFacilitiesImage = async (file: File, target: 'primary' | 'secondary') => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setUploadErrors(prev => ({ ...prev, [target]: 'Only PNG, JPG or WEBP files are allowed.' }))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadErrors(prev => ({ ...prev, [target]: 'Image size cannot exceed 8MB.' }))
      return
    }

    setSaving(true)
    setUploadErrors(prev => ({ ...prev, [target]: '' }))
    setError('')
    setSuccess('')
    try {
      const dataUrl = await toDataUrl(file)
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home/facilities-image`, {
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
        setUploadErrors(prev => ({ ...prev, [target]: data?.error || 'Facilities image upload failed.' }))
        return
      }

      setFacilities(prev => ({
        ...prev,
        primaryImage: target === 'primary' ? String(data?.imageUrl || '') : prev.primaryImage,
        secondaryImage: target === 'secondary' ? String(data?.imageUrl || '') : prev.secondaryImage
      }))
      setSuccess('Facilities image uploaded.')
    } catch {
      setUploadErrors(prev => ({ ...prev, [target]: 'Facilities image upload failed.' }))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const validationErrors = validateFacilities(facilities)
    setFormErrors(validationErrors)
    if (hasErrors(validationErrors)) return

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
          content: { facilities }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Facilities settings could not be saved.')
        return
      }
      setSuccess('Facilities settings saved.')
      await loadFacilities(locale)
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
        <Typography variant='h4'>Facilities Settings</Typography>
        <Typography color='text.secondary'>Manage facilities content, stats and images.</Typography>
        <Typography variant='caption' color='text.secondary'>
          Note: Facilities images and stat numbers are shared globally across all locales.
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
                  label='Subtitle'
                  value={facilities.subtitle}
                  onChange={e => {
                    setFacilities(prev => ({ ...prev, subtitle: e.target.value }))
                    setFormErrors(prev => ({ ...prev, subtitle: undefined }))
                  }}
                  error={Boolean(formErrors.subtitle)}
                  helperText={formErrors.subtitle}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <CustomTextField
                  label='Title'
                  value={facilities.title}
                  onChange={e => {
                    setFacilities(prev => ({ ...prev, title: e.target.value }))
                    setFormErrors(prev => ({ ...prev, title: undefined }))
                  }}
                  error={Boolean(formErrors.title)}
                  helperText={formErrors.title}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  multiline
                  minRows={3}
                  label='Description'
                  value={facilities.description}
                  onChange={e => {
                    setFacilities(prev => ({ ...prev, description: e.target.value }))
                    setFormErrors(prev => ({ ...prev, description: undefined }))
                  }}
                  error={Boolean(formErrors.description)}
                  helperText={formErrors.description}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Typography variant='h6'>Stats</Typography>
            {formErrors.stats ? <Alert severity='error'>{formErrors.stats}</Alert> : null}
            {facilities.stats.map((stat, index) => (
              <Card key={`facility-stat-${index}`} variant='outlined'>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        label='Label'
                        value={stat.label}
                        onChange={e => {
                          setFacilities(prev => ({
                            ...prev,
                            stats: prev.stats.map((item, i) => (i === index ? { ...item, label: e.target.value } : item))
                          }))
                          setFormErrors(prev => ({
                            ...prev,
                            statsByIndex: { ...prev.statsByIndex, [index]: { ...prev.statsByIndex[index], label: undefined } }
                          }))
                        }}
                        error={Boolean(formErrors.statsByIndex[index]?.label)}
                        helperText={formErrors.statsByIndex[index]?.label}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        label='Suffix'
                        value={stat.suffix}
                        onChange={e => {
                          setFacilities(prev => ({
                            ...prev,
                            stats: prev.stats.map((item, i) => (i === index ? { ...item, suffix: e.target.value } : item))
                          }))
                          setFormErrors(prev => ({
                            ...prev,
                            statsByIndex: { ...prev.statsByIndex, [index]: { ...prev.statsByIndex[index], suffix: undefined } }
                          }))
                        }}
                        error={Boolean(formErrors.statsByIndex[index]?.suffix)}
                        helperText={formErrors.statsByIndex[index]?.suffix}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        type='number'
                        label='Number'
                        value={facilities.statsNumbers[index]}
                        onChange={e => {
                          const next = [...facilities.statsNumbers] as [number, number, number]
                          next[index] = Number(e.target.value)
                          setFacilities(prev => ({ ...prev, statsNumbers: next }))
                          setFormErrors(prev => ({
                            ...prev,
                            statsByIndex: { ...prev.statsByIndex, [index]: { ...prev.statsByIndex[index], number: undefined } }
                          }))
                        }}
                        error={Boolean(formErrors.statsByIndex[index]?.number)}
                        helperText={formErrors.statsByIndex[index]?.number}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Typography variant='h6'>Images</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='Primary Image URL'
                  value={facilities.primaryImage}
                  onChange={e => {
                    setFacilities(prev => ({ ...prev, primaryImage: e.target.value }))
                    setFormErrors(prev => ({ ...prev, primaryImage: undefined }))
                  }}
                  error={Boolean(formErrors.primaryImage)}
                  helperText={formErrors.primaryImage}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='Secondary Image URL'
                  value={facilities.secondaryImage}
                  onChange={e => {
                    setFacilities(prev => ({ ...prev, secondaryImage: e.target.value }))
                    setFormErrors(prev => ({ ...prev, secondaryImage: undefined }))
                  }}
                  error={Boolean(formErrors.secondaryImage)}
                  helperText={formErrors.secondaryImage}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button component='label' variant={uploadErrors.primary ? 'contained' : 'outlined'} color={uploadErrors.primary ? 'error' : 'primary'} fullWidth disabled={saving}>
                  Upload Primary
                  <input
                    hidden
                    type='file'
                    accept='image/png,image/jpeg,image/jpg,image/webp'
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      if (file) void uploadFacilitiesImage(file, 'primary')
                      e.currentTarget.value = ''
                    }}
                  />
                </Button>
                {uploadErrors.primary ? (
                  <Typography variant='caption' color='error.main'>
                    {uploadErrors.primary}
                  </Typography>
                ) : null}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button component='label' variant={uploadErrors.secondary ? 'contained' : 'outlined'} color={uploadErrors.secondary ? 'error' : 'primary'} fullWidth disabled={saving}>
                  Upload Secondary
                  <input
                    hidden
                    type='file'
                    accept='image/png,image/jpeg,image/jpg,image/webp'
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      if (file) void uploadFacilitiesImage(file, 'secondary')
                      e.currentTarget.value = ''
                    }}
                  />
                </Button>
                {uploadErrors.secondary ? (
                  <Typography variant='caption' color='error.main'>
                    {uploadErrors.secondary}
                  </Typography>
                ) : null}
              </Grid>
              {facilities.primaryImage ? (
                <Grid size={{ xs: 12, md: 6 }}>
                  <img
                    src={facilities.primaryImage.startsWith('/api/') ? `${apiBaseUrl}${facilities.primaryImage}` : facilities.primaryImage}
                    alt='Facilities primary preview'
                    style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                  />
                </Grid>
              ) : null}
              {facilities.secondaryImage ? (
                <Grid size={{ xs: 12, md: 6 }}>
                  <img
                    src={facilities.secondaryImage.startsWith('/api/') ? `${apiBaseUrl}${facilities.secondaryImage}` : facilities.secondaryImage}
                    alt='Facilities secondary preview'
                    style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                  />
                </Grid>
              ) : null}
            </Grid>

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Facilities Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
