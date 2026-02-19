'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CustomTextField from '@core/components/mui/TextField'

type Locale = 'en' | 'de' | 'tr'

type OfferCard = {
  id: string
  badge: string
  title: string
  text: string
  image: string
}

type OffersContent = {
  subtitle: string
  title: string
  cards: OfferCard[]
}

type OfferCardErrors = {
  title?: string
  text?: string
  image?: string
}

type OffersErrors = {
  subtitle?: string
  title?: string
  cards?: string
  cardByIndex: Record<number, OfferCardErrors>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']

const createDefaultCards = (): OfferCard[] => [
  { id: 'offer-1', badge: '', title: '', text: '', image: '' },
  { id: 'offer-2', badge: '', title: '', text: '', image: '' },
  { id: 'offer-3', badge: '', title: '', text: '', image: '' }
]

const createOfferCard = (index: number): OfferCard => ({
  id: `offer-${Date.now()}-${index + 1}`,
  badge: '',
  title: '',
  text: '',
  image: ''
})

const normalizeOffers = (input: unknown): OffersContent => {
  const value = (input || {}) as Partial<OffersContent>
  const cardsSource = Array.isArray(value.cards) ? value.cards : []
  const cards = cardsSource
    .map((item, index) => ({
      id: String(item?.id || `offer-${index + 1}`).trim() || `offer-${index + 1}`,
      badge: String(item?.badge || '').trim(),
      title: String(item?.title || '').trim(),
      text: String(item?.text || '').trim(),
      image: String(item?.image || '').trim()
    }))
    .filter(item => Boolean(item.title) || Boolean(item.text) || Boolean(item.image) || Boolean(item.badge))
    .slice(0, 4)

  return {
    subtitle: String(value.subtitle || '').trim(),
    title: String(value.title || '').trim(),
    cards: cards.length > 0 ? cards : createDefaultCards()
  }
}

export default function OffersSettingsPage() {
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
  const [expanded, setExpanded] = useState<'texts' | 'cards'>('texts')
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({})
  const [formErrors, setFormErrors] = useState<OffersErrors>({ cardByIndex: {} })
  const [offers, setOffers] = useState<OffersContent>({
    subtitle: '',
    title: '',
    cards: createDefaultCards()
  })

  const loadOffers = async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')
      return
    }

    setError('')
    setSuccess('')
    setUploadErrors({})
    setFormErrors({ cardByIndex: {} })
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
        setError(data?.error || 'Offers content could not be loaded.')
        return
      }

      setOffers(normalizeOffers(data?.content?.offers || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOffers(locale)
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadOffers(nextLocale)
  }

  const validateOffers = (value: OffersContent): OffersErrors => {
    const errors: OffersErrors = { cardByIndex: {} }
    if (!value.subtitle.trim()) errors.subtitle = 'Subtitle is required.'
    if (!value.title.trim()) errors.title = 'Title is required.'
    if (!Array.isArray(value.cards) || value.cards.length < 1) errors.cards = 'At least 1 card is required.'
    if (Array.isArray(value.cards) && value.cards.length > 4) errors.cards = 'Card limit is 4.'
    value.cards.forEach((card, index) => {
      const rowError: OfferCardErrors = {}
      if (!card.title.trim()) rowError.title = 'Title is required.'
      if (!card.text.trim()) rowError.text = 'Text is required.'
      if (!card.image.trim()) rowError.image = 'Image is required.'
      if (rowError.title || rowError.text || rowError.image) errors.cardByIndex[index] = rowError
    })
    return errors
  }

  const hasErrors = (errors: OffersErrors) =>
    Boolean(errors.subtitle || errors.title || errors.cards || Object.keys(errors.cardByIndex).length)

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const uploadOfferImage = async (file: File, cardIndex: number) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setUploadErrors(prev => ({ ...prev, [cardIndex]: 'Only PNG, JPG or WEBP files are allowed.' }))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadErrors(prev => ({ ...prev, [cardIndex]: 'Image size cannot exceed 8MB.' }))
      return
    }

    setSaving(true)
    setUploadErrors(prev => ({ ...prev, [cardIndex]: '' }))
    try {
      const dataUrl = await toDataUrl(file)
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home/offers-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fileName: file.name, dataUrl })
      })
      const data = await response.json()
      if (!response.ok) {
        setUploadErrors(prev => ({ ...prev, [cardIndex]: data?.error || 'Offers image upload failed.' }))
        return
      }

      setOffers(prev => ({
        ...prev,
        cards: prev.cards.map((card, index) => (index === cardIndex ? { ...card, image: String(data?.imageUrl || '') } : card))
      }))
      setSuccess('Offers image uploaded.')
    } catch {
      setUploadErrors(prev => ({ ...prev, [cardIndex]: 'Offers image upload failed.' }))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const normalized = normalizeOffers(offers)
    const validationErrors = validateOffers(normalized)
    setFormErrors(validationErrors)
    if (hasErrors(validationErrors)) {
      if (validationErrors.subtitle || validationErrors.title) setExpanded('texts')
      else setExpanded('cards')
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
          content: { offers: normalized }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Offers settings could not be saved.')
        return
      }
      setSuccess('Offers settings saved.')
      await loadOffers(locale)
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
        <Typography variant='h4'>Offers Settings</Typography>
        <Typography color='text.secondary'>Manage offers title/subtitle and dynamic offer cards.</Typography>
        <Typography variant='caption' color='text.secondary'>
          Note: Offer card images are shared globally across all locales.
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
            <Accordion expanded={expanded === 'texts'} onChange={(_, open) => setExpanded(open ? 'texts' : 'cards')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Texts</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Subtitle'
                      value={offers.subtitle}
                      onChange={e => {
                        setOffers(prev => ({ ...prev, subtitle: e.target.value }))
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
                      value={offers.title}
                      onChange={e => {
                        setOffers(prev => ({ ...prev, title: e.target.value }))
                        setFormErrors(prev => ({ ...prev, title: undefined }))
                      }}
                      error={Boolean(formErrors.title)}
                      helperText={formErrors.title}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'cards'} onChange={(_, open) => setExpanded(open ? 'cards' : 'texts')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Cards (${offers.cards.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.cards ? <Alert severity='error'>{formErrors.cards}</Alert> : null}
                {offers.cards.map((card, index) => (
                  <Card key={`offer-card-${index}`} variant='outlined'>
                    <CardContent>
                      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                        <Typography variant='subtitle1'>{`Card ${index + 1}`}</Typography>
                        <div className='flex gap-2'>
                          <Button
                            variant='outlined'
                            size='small'
                            onClick={() =>
                              setOffers(prev => ({
                                ...prev,
                                cards: prev.cards.map((row, i) => (i === index ? { ...row, badge: row.badge ? '' : '20% OFF' } : row))
                              }))
                            }
                          >
                            {card.badge ? 'Remove Badge' : 'Add Badge'}
                          </Button>
                          <Button
                            variant='outlined'
                            color='error'
                            size='small'
                            disabled={offers.cards.length <= 1}
                            onClick={() =>
                              setOffers(prev => ({
                                ...prev,
                                cards: prev.cards.filter((_, i) => i !== index)
                              }))
                            }
                          >
                            Remove Card
                          </Button>
                        </div>
                      </div>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Badge'
                            value={card.badge}
                            onChange={e =>
                              setOffers(prev => ({
                                ...prev,
                                cards: prev.cards.map((row, i) => (i === index ? { ...row, badge: e.target.value } : row))
                              }))
                            }
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <CustomTextField
                            label='Title'
                            value={card.title}
                            onChange={e => {
                              setOffers(prev => ({
                                ...prev,
                                cards: prev.cards.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardByIndex: {
                                  ...prev.cardByIndex,
                                  [index]: { ...prev.cardByIndex[index], title: undefined }
                                }
                              }))
                            }}
                            error={Boolean(formErrors.cardByIndex[index]?.title)}
                            helperText={formErrors.cardByIndex[index]?.title}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                          <CustomTextField
                            label='Text'
                            value={card.text}
                            onChange={e => {
                              setOffers(prev => ({
                                ...prev,
                                cards: prev.cards.map((row, i) => (i === index ? { ...row, text: e.target.value } : row))
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardByIndex: {
                                  ...prev.cardByIndex,
                                  [index]: { ...prev.cardByIndex[index], text: undefined }
                                }
                              }))
                            }}
                            error={Boolean(formErrors.cardByIndex[index]?.text)}
                            helperText={formErrors.cardByIndex[index]?.text}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <CustomTextField
                            label='Image URL'
                            value={card.image}
                            onChange={e => {
                              setOffers(prev => ({
                                ...prev,
                                cards: prev.cards.map((row, i) => (i === index ? { ...row, image: e.target.value } : row))
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardByIndex: {
                                  ...prev.cardByIndex,
                                  [index]: { ...prev.cardByIndex[index], image: undefined }
                                }
                              }))
                            }}
                            error={Boolean(formErrors.cardByIndex[index]?.image)}
                            helperText={formErrors.cardByIndex[index]?.image}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Button component='label' variant={uploadErrors[index] ? 'contained' : 'outlined'} color={uploadErrors[index] ? 'error' : 'primary'} fullWidth disabled={saving}>
                            Upload Image
                            <input
                              hidden
                              type='file'
                              accept='image/png,image/jpeg,image/jpg,image/webp'
                              onChange={e => {
                                const file = e.target.files?.[0] || null
                                if (file) void uploadOfferImage(file, index)
                                e.currentTarget.value = ''
                              }}
                            />
                          </Button>
                          {uploadErrors[index] ? (
                            <Typography variant='caption' color='error.main'>
                              {uploadErrors[index]}
                            </Typography>
                          ) : null}
                        </Grid>
                        {card.image ? (
                          <Grid size={{ xs: 12, md: 4 }}>
                                    <img
                                      src={card.image.startsWith('/api/') ? `${apiBaseUrl}${card.image}` : card.image}
                                      alt={card.title || `Offer ${index + 1}`}
                                      style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                                    />
                                  </Grid>
                                ) : null}
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}
                <Button
                  variant='outlined'
                  disabled={offers.cards.length >= 4}
                  onClick={() =>
                    setOffers(prev => ({
                      ...prev,
                      cards: [...prev.cards, createOfferCard(prev.cards.length)]
                    }))
                  }
                >
                  Add Card (max 4)
                </Button>
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving...' : 'Save Offers Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
