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

type RoomsContent = {
  subtitle: string
  title: string
  description: string
  allAmenities: string
  allAmenitiesHref: string
  request: string
  requestHref: string
  cards: Array<{
    title: string
    icon: string
    image: string
    description: string
    highlights: string[]
  }>
}

type CardErrors = {
  title?: string
  image?: string
  description?: string
}

type RoomsErrors = {
  subtitle?: string
  title?: string
  description?: string
  allAmenities?: string
  allAmenitiesHref?: string
  request?: string
  requestHref?: string
  cards?: string
  cardsByIndex: Record<number, CardErrors>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']
const iconOptions = [
  { value: 'fa fa-home', label: 'Home' },
  { value: 'fa fa-bed', label: 'Bed' },
  { value: 'fa fa-cutlery', label: 'Cutlery' },
  { value: 'fa fa-coffee', label: 'Coffee' },
  { value: 'fa fa-wifi', label: 'WiFi' },
  { value: 'fa fa-tv', label: 'TV' },
  { value: 'fa fa-shower', label: 'Shower' },
  { value: 'fa fa-building', label: 'Building' },
  { value: 'fa fa-check', label: 'Check' }
]

const normalizeRooms = (input: unknown): RoomsContent => {
  const value = (input || {}) as Partial<RoomsContent>
  return {
    subtitle: String(value.subtitle || '').trim(),
    title: String(value.title || '').trim(),
    description: String(value.description || '').trim(),
    allAmenities: String(value.allAmenities || '').trim(),
    allAmenitiesHref: String(value.allAmenitiesHref || '/amenities').trim(),
    request: String(value.request || '').trim(),
    requestHref: String(value.requestHref || '/contact').trim(),
    cards: Array.isArray(value.cards)
      ? value.cards
          .map(item => ({
            title: String(item?.title || '').trim(),
            icon: String(item?.icon || '').trim() || 'fa fa-home',
            image: String(item?.image || '').trim(),
            description: String(item?.description || '').trim(),
            highlights: Array.isArray(item?.highlights) ? item.highlights.map(v => String(v || '').trim()).filter(Boolean) : []
          }))
          .filter(item => Boolean(item.title) && Boolean(item.image))
      : []
  }
}

const isValidLink = (href: string) => href.startsWith('/') || /^https?:\/\//i.test(href)
const accordionSx = {
  border: '1px solid var(--mui-palette-divider)',
  borderRadius: '10px !important',
  backgroundColor: 'var(--mui-palette-background-paper)',
  boxShadow: 'none',
  '&::before': {
    display: 'none'
  },
  '& .MuiAccordionSummary-root': {
    minHeight: 54,
    borderBottom: '1px solid var(--mui-palette-divider)',
    backgroundColor: 'color-mix(in srgb, var(--mui-palette-background-paper) 88%, var(--mui-palette-action-hover))'
  },
  '& .MuiAccordionSummary-content': {
    margin: '12px 0'
  },
  '& .MuiAccordionDetails-root': {
    paddingTop: 16
  }
} as const

export default function RoomsSettingsPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expanded, setExpanded] = useState<'header' | 'buttons' | 'cards'>('header')
  const [formErrors, setFormErrors] = useState<RoomsErrors>({ cardsByIndex: {} })
  const [cardUploadErrors, setCardUploadErrors] = useState<Record<number, string>>({})
  const [locale, setLocale] = useState<Locale>('en')
  const [rooms, setRooms] = useState<RoomsContent>({
    subtitle: '',
    title: '',
    description: '',
    allAmenities: '',
    allAmenitiesHref: '/amenities',
    request: '',
    requestHref: '/contact',
    cards: []
  })

  const loadRooms = async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')
      return
    }

    setError('')
    setSuccess('')
    setFormErrors({ cardsByIndex: {} })
    setCardUploadErrors({})
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
        setError(data?.error || 'Rooms content could not be loaded.')
        return
      }
      setRooms(normalizeRooms(data?.content?.rooms || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRooms(locale)
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    setFormErrors({ cardsByIndex: {} })
    setCardUploadErrors({})
    await loadRooms(nextLocale)
  }

  const validateRooms = (value: RoomsContent): RoomsErrors => {
    const nextErrors: RoomsErrors = { cardsByIndex: {} }

    if (!value.subtitle.trim()) nextErrors.subtitle = 'Subtitle is required.'
    if (!value.title.trim()) nextErrors.title = 'Title is required.'
    if (!value.description.trim()) nextErrors.description = 'Description is required.'
    if (!value.allAmenities.trim()) nextErrors.allAmenities = 'Button 1 label is required.'
    if (!value.request.trim()) nextErrors.request = 'Button 2 label is required.'

    if (!value.allAmenitiesHref.trim()) nextErrors.allAmenitiesHref = 'Button 1 link is required.'
    if (!value.requestHref.trim()) nextErrors.requestHref = 'Button 2 link is required.'
    if (value.allAmenitiesHref.trim() && !isValidLink(value.allAmenitiesHref)) {
      nextErrors.allAmenitiesHref = 'Use /path or http(s)://...'
    }
    if (value.requestHref.trim() && !isValidLink(value.requestHref)) {
      nextErrors.requestHref = 'Use /path or http(s)://...'
    }

    if (value.cards.length < 1) {
      nextErrors.cards = 'At least 1 card is required.'
    } else if (value.cards.length > 8) {
      nextErrors.cards = 'Card limit is 8.'
    }

    for (const [idx, card] of value.cards.entries()) {
      const cardErrors: CardErrors = {}
      if (!card.title.trim()) cardErrors.title = 'Title is required.'
      if (!card.image.trim()) cardErrors.image = 'Image is required.'
      if (!card.description.trim()) cardErrors.description = 'Description is required.'
      if (cardErrors.title || cardErrors.image || cardErrors.description) {
        nextErrors.cardsByIndex[idx] = cardErrors
      }
    }

    return nextErrors
  }

  const hasErrors = (errors: RoomsErrors) => {
    return Boolean(
      errors.subtitle ||
        errors.title ||
        errors.description ||
        errors.allAmenities ||
        errors.allAmenitiesHref ||
        errors.request ||
        errors.requestHref ||
        errors.cards ||
        Object.keys(errors.cardsByIndex).length
    )
  }

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const uploadCardImage = async (file: File, cardIndex: number) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setCardUploadErrors(prev => ({ ...prev, [cardIndex]: 'Only PNG, JPG or WEBP files are allowed.' }))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setCardUploadErrors(prev => ({ ...prev, [cardIndex]: 'Image size cannot exceed 8MB.' }))
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    setCardUploadErrors(prev => ({ ...prev, [cardIndex]: '' }))
    try {
      const dataUrl = await toDataUrl(file)
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home/rooms-image`, {
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
        setCardUploadErrors(prev => ({ ...prev, [cardIndex]: data?.error || 'Rooms image upload failed.' }))
        return
      }
      setRooms(prev => ({
        ...prev,
        cards: prev.cards.map((card, i) => (i === cardIndex ? { ...card, image: String(data?.imageUrl || '') } : card))
      }))
      setFormErrors(prev => ({
        ...prev,
        cardsByIndex: {
          ...prev.cardsByIndex,
          [cardIndex]: { ...prev.cardsByIndex[cardIndex], image: undefined }
        }
      }))
      setSuccess('Rooms card image uploaded.')
    } catch {
      setCardUploadErrors(prev => ({ ...prev, [cardIndex]: 'Rooms image upload failed.' }))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const validationErrors = validateRooms(rooms)
    setFormErrors(validationErrors)
    if (hasErrors(validationErrors)) {
      if (validationErrors.subtitle || validationErrors.title || validationErrors.description) setExpanded('header')
      else if (validationErrors.allAmenities || validationErrors.allAmenitiesHref || validationErrors.request || validationErrors.requestHref) setExpanded('buttons')
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
          content: { rooms }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Rooms settings could not be saved.')
        return
      }
      setSuccess('Rooms settings saved.')
      await loadRooms(locale)
    } catch {
      setError('API connection failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Typography>Loading...</Typography>
  if (!allowed) return <Alert severity='error'>Only super admin or moderator can access this panel.</Alert>

  const moveCard = (fromIndex: number, toIndex: number) => {
    setRooms(prev => {
      if (toIndex < 0 || toIndex >= prev.cards.length) return prev
      const nextCards = [...prev.cards]
      const [moved] = nextCards.splice(fromIndex, 1)
      nextCards.splice(toIndex, 0, moved)
      return { ...prev, cards: nextCards }
    })
  }

  const getDescriptionPreview = (value: string) => {
    const preview = value.trim()
    if (!preview) return ''
    return preview.length > 48 ? `${preview.slice(0, 48)}...` : preview
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Section Settings</Typography>
        <Typography color='text.secondary'>Manage second section content, cards and button links.</Typography>
        <Typography variant='caption' color='text.secondary'>
          Note: Card images and icons are shared globally across all locales.
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
            <Accordion sx={accordionSx} expanded={expanded === 'header'} onChange={(_, open) => setExpanded(open ? 'header' : 'buttons')}>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Section Header</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Subtitle'
                      value={rooms.subtitle}
                      onChange={e => {
                        setRooms(prev => ({ ...prev, subtitle: e.target.value }))
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
                      value={rooms.title}
                      onChange={e => {
                        setRooms(prev => ({ ...prev, title: e.target.value }))
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
                      value={rooms.description}
                      onChange={e => {
                        setRooms(prev => ({ ...prev, description: e.target.value }))
                        setFormErrors(prev => ({ ...prev, description: undefined }))
                      }}
                      error={Boolean(formErrors.description)}
                      helperText={formErrors.description}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx} expanded={expanded === 'buttons'} onChange={(_, open) => setExpanded(open ? 'buttons' : 'cards')}>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Buttons</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Button 1 Label'
                      value={rooms.allAmenities}
                      onChange={e => {
                        setRooms(prev => ({ ...prev, allAmenities: e.target.value }))
                        setFormErrors(prev => ({ ...prev, allAmenities: undefined }))
                      }}
                      error={Boolean(formErrors.allAmenities)}
                      helperText={formErrors.allAmenities}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Button 1 Link'
                      value={rooms.allAmenitiesHref}
                      onChange={e => {
                        setRooms(prev => ({ ...prev, allAmenitiesHref: e.target.value }))
                        setFormErrors(prev => ({ ...prev, allAmenitiesHref: undefined }))
                      }}
                      error={Boolean(formErrors.allAmenitiesHref)}
                      helperText={formErrors.allAmenitiesHref || 'Use /amenities or https://...'}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Button 2 Label'
                      value={rooms.request}
                      onChange={e => {
                        setRooms(prev => ({ ...prev, request: e.target.value }))
                        setFormErrors(prev => ({ ...prev, request: undefined }))
                      }}
                      error={Boolean(formErrors.request)}
                      helperText={formErrors.request}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Button 2 Link'
                      value={rooms.requestHref}
                      onChange={e => {
                        setRooms(prev => ({ ...prev, requestHref: e.target.value }))
                        setFormErrors(prev => ({ ...prev, requestHref: undefined }))
                      }}
                      error={Boolean(formErrors.requestHref)}
                      helperText={formErrors.requestHref || 'Use /contact or https://...'}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx} expanded={expanded === 'cards'} onChange={(_, open) => setExpanded(open ? 'cards' : 'header')}>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Section Cards</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
            {formErrors.cards ? <Alert severity='error'>{formErrors.cards}</Alert> : null}
            {rooms.cards.map((card, index) => (
              <Accordion sx={accordionSx} key={`room-card-${index}`} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                  <div className='flex flex-col'>
                    <Typography variant='subtitle1'>{`Card ${index + 1}: ${card.title || 'Title'}`}</Typography>
                    {card.description ? (
                      <Typography variant='caption' color='text.secondary'>
                        {`Description: ${getDescriptionPreview(card.description)}`}
                      </Typography>
                    ) : null}
                  </div>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        label='Title'
                        value={card.title}
                        onChange={e =>
                          {
                            setRooms(prev => ({
                              ...prev,
                              cards: prev.cards.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                            }))
                            setFormErrors(prev => ({
                              ...prev,
                              cardsByIndex: {
                                ...prev.cardsByIndex,
                                [index]: { ...prev.cardsByIndex[index], title: undefined }
                              }
                            }))
                          }
                        }
                        error={Boolean(formErrors.cardsByIndex[index]?.title)}
                        helperText={formErrors.cardsByIndex[index]?.title}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        select
                        label='Icon'
                        value={card.icon}
                        onChange={e =>
                          setRooms(prev => ({
                            ...prev,
                            cards: prev.cards.map((row, i) => (i === index ? { ...row, icon: e.target.value } : row))
                          }))
                        }
                        fullWidth
                      >
                        {iconOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            <span className='flex items-center gap-2'>
                              <i className={option.value} aria-hidden='true' />
                              <span>{option.label}</span>
                            </span>
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CustomTextField
                        label='Image URL'
                        value={card.image}
                        onChange={e =>
                          {
                            setRooms(prev => ({
                              ...prev,
                              cards: prev.cards.map((row, i) => (i === index ? { ...row, image: e.target.value } : row))
                            }))
                            setFormErrors(prev => ({
                              ...prev,
                              cardsByIndex: {
                                ...prev.cardsByIndex,
                                [index]: { ...prev.cardsByIndex[index], image: undefined }
                              }
                            }))
                          }
                        }
                        error={Boolean(formErrors.cardsByIndex[index]?.image)}
                        helperText={formErrors.cardsByIndex[index]?.image}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        multiline
                        minRows={2}
                        label='Description'
                        value={card.description}
                        onChange={e =>
                          {
                            setRooms(prev => ({
                              ...prev,
                              cards: prev.cards.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                            }))
                            setFormErrors(prev => ({
                              ...prev,
                              cardsByIndex: {
                                ...prev.cardsByIndex,
                                [index]: { ...prev.cardsByIndex[index], description: undefined }
                              }
                            }))
                          }
                        }
                        error={Boolean(formErrors.cardsByIndex[index]?.description)}
                        helperText={formErrors.cardsByIndex[index]?.description}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        multiline
                        minRows={2}
                        label='Highlights (one per line)'
                        value={card.highlights.join('\n')}
                        onChange={e =>
                          setRooms(prev => ({
                            ...prev,
                            cards: prev.cards.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    highlights: e.target.value
                                      .split('\n')
                                      .map(v => v.trim())
                                      .filter(Boolean)
                                  }
                                : row
                            )
                          }))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Button
                        component='label'
                        variant={cardUploadErrors[index] ? 'contained' : 'outlined'}
                        color={cardUploadErrors[index] ? 'error' : 'primary'}
                        fullWidth
                        disabled={saving}
                      >
                        Upload Image
                        <input
                          hidden
                          type='file'
                          accept='image/png,image/jpeg,image/jpg,image/webp'
                          onChange={e => {
                            const file = e.target.files?.[0] || null
                            if (file) {
                              void uploadCardImage(file, index)
                            }
                            e.currentTarget.value = ''
                          }}
                        />
                      </Button>
                      {cardUploadErrors[index] ? (
                        <Typography variant='caption' color='error.main'>
                          {cardUploadErrors[index]}
                        </Typography>
                      ) : null}
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Button
                        variant='outlined'
                        color='error'
                        fullWidth
                        onClick={() =>
                          setRooms(prev => ({
                            ...prev,
                            cards: prev.cards.filter((_, i) => i !== index)
                          }))
                        }
                      >
                        Remove Card
                      </Button>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <div className='flex gap-2'>
                        <Button variant='outlined' fullWidth disabled={index === 0} onClick={() => moveCard(index, index - 1)}>
                          Move Up
                        </Button>
                        <Button
                          variant='outlined'
                          fullWidth
                          disabled={index === rooms.cards.length - 1}
                          onClick={() => moveCard(index, index + 1)}
                        >
                          Move Down
                        </Button>
                      </div>
                    </Grid>
                    {card.image ? (
                      <Grid size={{ xs: 12, md: 4 }}>
                        <img
                          src={card.image.startsWith('/api/') ? `${apiBaseUrl}${card.image}` : card.image}
                          alt={card.title || `Rooms card ${index + 1}`}
                          style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                        />
                      </Grid>
                    ) : null}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}

            <Button
              variant='outlined'
              onClick={() =>
                setRooms(prev => ({
                  ...prev,
                  cards: [
                    ...prev.cards,
                    {
                      title: '',
                      icon: 'fa fa-home',
                      image: '',
                      description: '',
                      highlights: []
                    }
                  ]
                }))
              }
              disabled={rooms.cards.length >= 8}
            >
              Add Card
            </Button>
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Section Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
