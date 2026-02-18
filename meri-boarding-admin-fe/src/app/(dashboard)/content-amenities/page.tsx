'use client'

import { useCallback, useEffect, useState } from 'react'

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

type AmenitiesLayoutOption = {
  title: string
  icon: string
  description: string
  highlights: string[]
}

type AmenitiesCard = {
  title: string
  icon: string
  image: string
  description: string
  highlights: string[]
}

type AmenitiesContent = {
  hero: {
    subtitle: string
    title: string
    home: string
    crumb: string
    backgroundImage: string
  }
  content: {
    layoutSubtitle: string
    layoutTitle: string
    layoutDesc: string
    layoutOptions: AmenitiesLayoutOption[]
    amenitiesSubtitle: string
    amenitiesTitle: string
    toggleLabel: string
    cardView: string
    listView: string
    switchHelp: string
    includedTitle: string
    request: string
  }
  data: {
    cards: AmenitiesCard[]
    overviewItems: string[]
  }
}

type AmenitiesErrors = {
  heroSubtitle?: string
  heroTitle?: string
  heroHome?: string
  heroCrumb?: string
  heroBackgroundImage?: string
  layoutSubtitle?: string
  layoutTitle?: string
  layoutDesc?: string
  amenitiesSubtitle?: string
  amenitiesTitle?: string
  toggleLabel?: string
  cardView?: string
  listView?: string
  switchHelp?: string
  includedTitle?: string
  request?: string
  layoutOptions?: string
  cards?: string
  overviewItems?: string
  layoutByIndex: Record<number, { title?: string; icon?: string; description?: string; highlights?: string }>
  cardsByIndex: Record<number, { title?: string; icon?: string; image?: string; description?: string; highlights?: string }>
  overviewByIndex: Record<number, { item?: string }>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']
const maxLayoutOptions = 8
const maxCards = 24
const maxOverviewItems = 40
const maxHighlightsPerItem = 10

const parseLines = (value: string, max = maxHighlightsPerItem) =>
  String(value || '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, max)

const createDefaultAmenities = (): AmenitiesContent => ({
  hero: {
    subtitle: '',
    title: '',
    home: '',
    crumb: '',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg'
  },
  content: {
    layoutSubtitle: '',
    layoutTitle: '',
    layoutDesc: '',
    layoutOptions: [{ title: '', icon: 'fa fa-square-o', description: '', highlights: [''] }],
    amenitiesSubtitle: '',
    amenitiesTitle: '',
    toggleLabel: '',
    cardView: '',
    listView: '',
    switchHelp: '',
    includedTitle: '',
    request: ''
  },
  data: {
    cards: [{ title: '', icon: 'fa fa-home', image: '', description: '', highlights: [''] }],
    overviewItems: ['']
  }
})

const normalizeAmenities = (input: unknown): AmenitiesContent => {
  const value = (input || {}) as Partial<AmenitiesContent>

  const layoutOptions = Array.isArray(value?.content?.layoutOptions)
    ? value.content.layoutOptions
        .map(item => ({
          title: String(item?.title || '').trim(),
          icon: String(item?.icon || '').trim() || 'fa fa-square-o',
          description: String(item?.description || '').trim(),
          highlights: Array.isArray(item?.highlights)
            ? item.highlights.map(row => String(row || '').trim()).filter(Boolean).slice(0, maxHighlightsPerItem)
            : []
        }))
        .filter(item => Boolean(item.title) || Boolean(item.description) || item.highlights.length > 0)
        .slice(0, maxLayoutOptions)
    : []

  const cards = Array.isArray(value?.data?.cards)
    ? value.data.cards
        .map(item => ({
          title: String(item?.title || '').trim(),
          icon: String(item?.icon || '').trim() || 'fa fa-home',
          image: String(item?.image || '').trim(),
          description: String(item?.description || '').trim(),
          highlights: Array.isArray(item?.highlights)
            ? item.highlights.map(row => String(row || '').trim()).filter(Boolean).slice(0, maxHighlightsPerItem)
            : []
        }))
        .filter(item => Boolean(item.title) || Boolean(item.description) || Boolean(item.image) || item.highlights.length > 0)
        .slice(0, maxCards)
    : []

  const overviewItems = Array.isArray(value?.data?.overviewItems)
    ? value.data.overviewItems.map(item => String(item || '').trim()).filter(Boolean).slice(0, maxOverviewItems)
    : []

  return {
    hero: {
      subtitle: String(value?.hero?.subtitle || '').trim(),
      title: String(value?.hero?.title || '').trim(),
      home: String(value?.hero?.home || '').trim(),
      crumb: String(value?.hero?.crumb || '').trim(),
      backgroundImage: String(value?.hero?.backgroundImage || '').trim()
    },
    content: {
      layoutSubtitle: String(value?.content?.layoutSubtitle || '').trim(),
      layoutTitle: String(value?.content?.layoutTitle || '').trim(),
      layoutDesc: String(value?.content?.layoutDesc || '').trim(),
      layoutOptions: layoutOptions.length > 0 ? layoutOptions : [{ title: '', icon: 'fa fa-square-o', description: '', highlights: [''] }],
      amenitiesSubtitle: String(value?.content?.amenitiesSubtitle || '').trim(),
      amenitiesTitle: String(value?.content?.amenitiesTitle || '').trim(),
      toggleLabel: String(value?.content?.toggleLabel || '').trim(),
      cardView: String(value?.content?.cardView || '').trim(),
      listView: String(value?.content?.listView || '').trim(),
      switchHelp: String(value?.content?.switchHelp || '').trim(),
      includedTitle: String(value?.content?.includedTitle || '').trim(),
      request: String(value?.content?.request || '').trim()
    },
    data: {
      cards: cards.length > 0 ? cards : [{ title: '', icon: 'fa fa-home', image: '', description: '', highlights: [''] }],
      overviewItems: overviewItems.length > 0 ? overviewItems : ['']
    }
  }
}

export default function AmenitiesContentPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('de')
  const [expanded, setExpanded] = useState<'hero' | 'layout' | 'cards' | 'overview'>('hero')

  const [formErrors, setFormErrors] = useState<AmenitiesErrors>({
    layoutByIndex: {},
    cardsByIndex: {},
    overviewByIndex: {}
  })

  const [uploadErrors, setUploadErrors] = useState<{ hero?: string; cards: Record<number, string> }>({ cards: {} })
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null)

  const [amenities, setAmenities] = useState<AmenitiesContent>(createDefaultAmenities())

  const loadAmenities = useCallback(async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')

      return
    }

    setError('')
    setSuccess('')
    setFormErrors({ layoutByIndex: {}, cardsByIndex: {}, overviewByIndex: {} })
    setUploadErrors({ cards: {} })

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

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/amenities?locale=${targetLocale}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setLoading(false)
        setError(data?.error || 'Amenities content could not be loaded.')

        return
      }

      setAmenities(normalizeAmenities(data?.content || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    void loadAmenities(locale)
  }, [loadAmenities, locale])

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
  }

  const validateAmenities = (value: AmenitiesContent): AmenitiesErrors => {
    const errors: AmenitiesErrors = {
      layoutByIndex: {},
      cardsByIndex: {},
      overviewByIndex: {}
    }

    if (!value.hero.subtitle.trim()) errors.heroSubtitle = 'Hero subtitle is required.'
    if (!value.hero.title.trim()) errors.heroTitle = 'Hero title is required.'
    if (!value.hero.home.trim()) errors.heroHome = 'Breadcrumb home text is required.'
    if (!value.hero.crumb.trim()) errors.heroCrumb = 'Breadcrumb current text is required.'
    if (!value.hero.backgroundImage.trim()) errors.heroBackgroundImage = 'Hero background image URL is required.'

    if (!value.content.layoutSubtitle.trim()) errors.layoutSubtitle = 'Layout subtitle is required.'
    if (!value.content.layoutTitle.trim()) errors.layoutTitle = 'Layout title is required.'
    if (!value.content.layoutDesc.trim()) errors.layoutDesc = 'Layout description is required.'
    if (!value.content.amenitiesSubtitle.trim()) errors.amenitiesSubtitle = 'Amenities subtitle is required.'
    if (!value.content.amenitiesTitle.trim()) errors.amenitiesTitle = 'Amenities title is required.'
    if (!value.content.toggleLabel.trim()) errors.toggleLabel = 'Toggle label is required.'
    if (!value.content.cardView.trim()) errors.cardView = 'Card view label is required.'
    if (!value.content.listView.trim()) errors.listView = 'List view label is required.'
    if (!value.content.switchHelp.trim()) errors.switchHelp = 'Switch help text is required.'
    if (!value.content.includedTitle.trim()) errors.includedTitle = 'Included title is required.'
    if (!value.content.request.trim()) errors.request = 'Request CTA text is required.'

    if (!Array.isArray(value.content.layoutOptions) || value.content.layoutOptions.length < 1) {
      errors.layoutOptions = 'At least 1 layout option is required.'
    }

    if (Array.isArray(value.content.layoutOptions) && value.content.layoutOptions.length > maxLayoutOptions) {
      errors.layoutOptions = `Layout option limit is ${maxLayoutOptions}.`
    }

    value.content.layoutOptions.forEach((item, index) => {
      const rowError: { title?: string; icon?: string; description?: string; highlights?: string } = {}

      if (!item.title.trim()) rowError.title = 'Title is required.'
      if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
      if (!item.description.trim()) rowError.description = 'Description is required.'
      if (!Array.isArray(item.highlights) || item.highlights.length < 1) rowError.highlights = 'At least 1 highlight line is required.'
      if (Array.isArray(item.highlights) && item.highlights.some(line => !line.trim())) rowError.highlights = 'Highlight lines cannot be empty.'

      if (rowError.title || rowError.icon || rowError.description || rowError.highlights) {
        errors.layoutByIndex[index] = rowError
      }
    })

    if (!Array.isArray(value.data.cards) || value.data.cards.length < 1) {
      errors.cards = 'At least 1 amenity card is required.'
    }

    if (Array.isArray(value.data.cards) && value.data.cards.length > maxCards) {
      errors.cards = `Amenity card limit is ${maxCards}.`
    }

    value.data.cards.forEach((item, index) => {
      const rowError: { title?: string; icon?: string; image?: string; description?: string; highlights?: string } = {}

      if (!item.title.trim()) rowError.title = 'Title is required.'
      if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
      if (!item.image.trim()) rowError.image = 'Image URL is required.'
      if (!item.description.trim()) rowError.description = 'Description is required.'
      if (!Array.isArray(item.highlights) || item.highlights.length < 1) rowError.highlights = 'At least 1 highlight line is required.'
      if (Array.isArray(item.highlights) && item.highlights.some(line => !line.trim())) rowError.highlights = 'Highlight lines cannot be empty.'

      if (rowError.title || rowError.icon || rowError.image || rowError.description || rowError.highlights) {
        errors.cardsByIndex[index] = rowError
      }
    })

    if (!Array.isArray(value.data.overviewItems) || value.data.overviewItems.length < 1) {
      errors.overviewItems = 'At least 1 overview line is required.'
    }

    if (Array.isArray(value.data.overviewItems) && value.data.overviewItems.length > maxOverviewItems) {
      errors.overviewItems = `Overview line limit is ${maxOverviewItems}.`
    }

    value.data.overviewItems.forEach((item, index) => {
      if (!item.trim()) {
        errors.overviewByIndex[index] = { item: 'Line is required.' }
      }
    })

    return errors
  }

  const hasErrors = (errors: AmenitiesErrors) =>
    Boolean(
      errors.heroSubtitle ||
        errors.heroTitle ||
        errors.heroHome ||
        errors.heroCrumb ||
        errors.heroBackgroundImage ||
        errors.layoutSubtitle ||
        errors.layoutTitle ||
        errors.layoutDesc ||
        errors.amenitiesSubtitle ||
        errors.amenitiesTitle ||
        errors.toggleLabel ||
        errors.cardView ||
        errors.listView ||
        errors.switchHelp ||
        errors.includedTitle ||
        errors.request ||
        errors.layoutOptions ||
        errors.cards ||
        errors.overviewItems ||
        Object.keys(errors.layoutByIndex).length ||
        Object.keys(errors.cardsByIndex).length ||
        Object.keys(errors.overviewByIndex).length
    )

  const moveItem = <T,>(items: T[], from: number, to: number) => {
    if (to < 0 || to >= items.length) return items
    const next = [...items]
    const [moved] = next.splice(from, 1)

    next.splice(to, 0, moved)

    return next
  }

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const uploadAmenitiesImage = async (file: File, target: 'hero' | number) => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      if (target === 'hero') {
        setUploadErrors(prev => ({ ...prev, hero: 'Only PNG, JPG or WEBP files are allowed.' }))
      } else {
        setUploadErrors(prev => ({ ...prev, cards: { ...prev.cards, [target]: 'Only PNG, JPG or WEBP files are allowed.' } }))
      }

      
return
    }

    if (file.size > 8 * 1024 * 1024) {
      if (target === 'hero') {
        setUploadErrors(prev => ({ ...prev, hero: 'Image size cannot exceed 8MB.' }))
      } else {
        setUploadErrors(prev => ({ ...prev, cards: { ...prev.cards, [target]: 'Image size cannot exceed 8MB.' } }))
      }

      
return
    }

    const targetKey = target === 'hero' ? 'hero' : `card-${target}`

    setUploadingTarget(targetKey)

    if (target === 'hero') {
      setUploadErrors(prev => ({ ...prev, hero: '' }))
    } else {
      setUploadErrors(prev => ({ ...prev, cards: { ...prev.cards, [target]: '' } }))
    }

    setError('')
    setSuccess('')

    try {
      const dataUrl = await toDataUrl(file)

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/page-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          dataUrl,
          context: target === 'hero' ? 'amenities-hero' : `amenities-card-${target}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const msg = data?.error || 'Image upload failed.'

        if (target === 'hero') {
          setUploadErrors(prev => ({ ...prev, hero: msg }))
        } else {
          setUploadErrors(prev => ({ ...prev, cards: { ...prev.cards, [target]: msg } }))
        }

        
return
      }

      const imageUrl = String(data?.imageUrl || '')

      if (!imageUrl) {
        if (target === 'hero') {
          setUploadErrors(prev => ({ ...prev, hero: 'Image upload failed.' }))
        } else {
          setUploadErrors(prev => ({ ...prev, cards: { ...prev.cards, [target]: 'Image upload failed.' } }))
        }

        
return
      }

      if (target === 'hero') {
        setAmenities(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: imageUrl } }))
        setFormErrors(prev => ({ ...prev, heroBackgroundImage: undefined }))
      } else {
        setAmenities(prev => ({
          ...prev,
          data: {
            ...prev.data,
            cards: prev.data.cards.map((row, i) => (i === target ? { ...row, image: imageUrl } : row))
          }
        }))
        setFormErrors(prev => ({
          ...prev,
          cardsByIndex: { ...prev.cardsByIndex, [target]: { ...prev.cardsByIndex[target], image: undefined } }
        }))
      }

      setSuccess('Image uploaded.')
    } catch {
      if (target === 'hero') {
        setUploadErrors(prev => ({ ...prev, hero: 'Image upload failed.' }))
      } else {
        setUploadErrors(prev => ({ ...prev, cards: { ...prev.cards, [target]: 'Image upload failed.' } }))
      }
    } finally {
      setUploadingTarget(null)
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    const normalized = normalizeAmenities(amenities)
    const validationErrors = validateAmenities(normalized)

    setFormErrors(validationErrors)

    if (hasErrors(validationErrors)) {
      if (
        validationErrors.heroSubtitle ||
        validationErrors.heroTitle ||
        validationErrors.heroHome ||
        validationErrors.heroCrumb ||
        validationErrors.heroBackgroundImage
      ) {
        setExpanded('hero')
      } else if (
        validationErrors.layoutSubtitle ||
        validationErrors.layoutTitle ||
        validationErrors.layoutDesc ||
        validationErrors.amenitiesSubtitle ||
        validationErrors.amenitiesTitle ||
        validationErrors.toggleLabel ||
        validationErrors.cardView ||
        validationErrors.listView ||
        validationErrors.switchHelp ||
        validationErrors.includedTitle ||
        validationErrors.request ||
        validationErrors.layoutOptions ||
        Object.keys(validationErrors.layoutByIndex).length
      ) {
        setExpanded('layout')
      } else if (validationErrors.cards || Object.keys(validationErrors.cardsByIndex).length) {
        setExpanded('cards')
      } else {
        setExpanded('overview')
      }


      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/amenities`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          locale,
          content: normalized
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Amenities settings could not be saved.')

        return
      }

      setSuccess('Amenities settings saved.')
      await loadAmenities(locale)
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
        <Typography variant='h4'>Amenities Content</Typography>
        <Typography color='text.secondary'>Manage all public amenities page lines with locale-based editing.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <CustomTextField select label='Locale' value={locale} onChange={e => handleLocaleChange(e.target.value as Locale)} fullWidth>
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
            <Accordion expanded={expanded === 'hero'} onChange={(_, open) => setExpanded(open ? 'hero' : 'layout')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Hero & Breadcrumb</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Hero Subtitle'
                      value={amenities.hero.subtitle}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, heroSubtitle: undefined }))
                      }}
                      error={Boolean(formErrors.heroSubtitle)}
                      helperText={formErrors.heroSubtitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField
                      label='Hero Title'
                      value={amenities.hero.title}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, heroTitle: undefined }))
                      }}
                      error={Boolean(formErrors.heroTitle)}
                      helperText={formErrors.heroTitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Breadcrumb Home'
                      value={amenities.hero.home}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, hero: { ...prev.hero, home: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, heroHome: undefined }))
                      }}
                      error={Boolean(formErrors.heroHome)}
                      helperText={formErrors.heroHome}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Breadcrumb Current'
                      value={amenities.hero.crumb}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, hero: { ...prev.hero, crumb: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, heroCrumb: undefined }))
                      }}
                      error={Boolean(formErrors.heroCrumb)}
                      helperText={formErrors.heroCrumb}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      label='Hero Background Image URL'
                      value={amenities.hero.backgroundImage}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, heroBackgroundImage: undefined }))
                      }}
                      error={Boolean(formErrors.heroBackgroundImage)}
                      helperText={formErrors.heroBackgroundImage}
                      fullWidth
                    />
                    <div className='mt-2'>
                      <Button
                        component='label'
                        variant={uploadErrors.hero ? 'contained' : 'outlined'}
                        color={uploadErrors.hero ? 'error' : 'primary'}
                        disabled={Boolean(uploadingTarget) || saving}
                      >
                        {uploadingTarget === 'hero' ? 'Uploading...' : 'Upload Hero Background'}
                        <input
                          hidden
                          type='file'
                          accept='image/png,image/jpeg,image/jpg,image/webp'
                          onChange={event => {
                            const file = event.target.files?.[0]

                            event.currentTarget.value = ''
                            if (file) void uploadAmenitiesImage(file, 'hero')
                          }}
                        />
                      </Button>
                    </div>
                    {uploadErrors.hero ? (
                      <Typography variant='caption' color='error.main'>
                        {uploadErrors.hero}
                      </Typography>
                    ) : null}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'layout'} onChange={(_, open) => setExpanded(open ? 'layout' : 'cards')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Layout Section (${amenities.content.layoutOptions.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.layoutOptions ? <Alert severity='error'>{formErrors.layoutOptions}</Alert> : null}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Layout Subtitle'
                      value={amenities.content.layoutSubtitle}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, layoutSubtitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, layoutSubtitle: undefined }))
                      }}
                      error={Boolean(formErrors.layoutSubtitle)}
                      helperText={formErrors.layoutSubtitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField
                      label='Layout Title'
                      value={amenities.content.layoutTitle}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, layoutTitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, layoutTitle: undefined }))
                      }}
                      error={Boolean(formErrors.layoutTitle)}
                      helperText={formErrors.layoutTitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      label='Layout Description'
                      value={amenities.content.layoutDesc}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, layoutDesc: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, layoutDesc: undefined }))
                      }}
                      error={Boolean(formErrors.layoutDesc)}
                      helperText={formErrors.layoutDesc}
                      multiline
                      minRows={2}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Amenities Subtitle'
                      value={amenities.content.amenitiesSubtitle}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, amenitiesSubtitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, amenitiesSubtitle: undefined }))
                      }}
                      error={Boolean(formErrors.amenitiesSubtitle)}
                      helperText={formErrors.amenitiesSubtitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField
                      label='Amenities Title'
                      value={amenities.content.amenitiesTitle}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, amenitiesTitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, amenitiesTitle: undefined }))
                      }}
                      error={Boolean(formErrors.amenitiesTitle)}
                      helperText={formErrors.amenitiesTitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='Toggle Label'
                      value={amenities.content.toggleLabel}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, toggleLabel: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, toggleLabel: undefined }))
                      }}
                      error={Boolean(formErrors.toggleLabel)}
                      helperText={formErrors.toggleLabel}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='Card View Label'
                      value={amenities.content.cardView}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, cardView: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, cardView: undefined }))
                      }}
                      error={Boolean(formErrors.cardView)}
                      helperText={formErrors.cardView}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='List View Label'
                      value={amenities.content.listView}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, listView: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, listView: undefined }))
                      }}
                      error={Boolean(formErrors.listView)}
                      helperText={formErrors.listView}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='Request CTA'
                      value={amenities.content.request}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, request: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, request: undefined }))
                      }}
                      error={Boolean(formErrors.request)}
                      helperText={formErrors.request}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Switch Help'
                      value={amenities.content.switchHelp}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, switchHelp: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, switchHelp: undefined }))
                      }}
                      error={Boolean(formErrors.switchHelp)}
                      helperText={formErrors.switchHelp}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='Included Title'
                      value={amenities.content.includedTitle}
                      onChange={e => {
                        setAmenities(prev => ({ ...prev, content: { ...prev.content, includedTitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, includedTitle: undefined }))
                      }}
                      error={Boolean(formErrors.includedTitle)}
                      helperText={formErrors.includedTitle}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {amenities.content.layoutOptions.map((item, index) => (
                  <Card key={`layout-option-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`Layout Option ${index + 1}`}</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Title'
                            value={item.title}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  layoutOptions: prev.content.layoutOptions.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                layoutByIndex: { ...prev.layoutByIndex, [index]: { ...prev.layoutByIndex[index], title: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.layoutByIndex[index]?.title)}
                            helperText={formErrors.layoutByIndex[index]?.title}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Icon Class'
                            value={item.icon}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  layoutOptions: prev.content.layoutOptions.map((row, i) => (i === index ? { ...row, icon: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                layoutByIndex: { ...prev.layoutByIndex, [index]: { ...prev.layoutByIndex[index], icon: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.layoutByIndex[index]?.icon)}
                            helperText={formErrors.layoutByIndex[index]?.icon}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <CustomTextField
                            label='Description'
                            value={item.description}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  layoutOptions: prev.content.layoutOptions.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                layoutByIndex: { ...prev.layoutByIndex, [index]: { ...prev.layoutByIndex[index], description: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.layoutByIndex[index]?.description)}
                            helperText={formErrors.layoutByIndex[index]?.description}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <CustomTextField
                            label='Highlights (one per line)'
                            value={item.highlights.join('\n')}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  layoutOptions: prev.content.layoutOptions.map((row, i) =>
                                    i === index ? { ...row, highlights: parseLines(e.target.value) } : row
                                  )
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                layoutByIndex: { ...prev.layoutByIndex, [index]: { ...prev.layoutByIndex[index], highlights: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.layoutByIndex[index]?.highlights)}
                            helperText={formErrors.layoutByIndex[index]?.highlights}
                            multiline
                            minRows={3}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                layoutOptions: moveItem(prev.content.layoutOptions, index, index - 1)
                              }
                            }))
                          }
                          disabled={index === 0}
                        >
                          Move Up
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                layoutOptions: moveItem(prev.content.layoutOptions, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === amenities.content.layoutOptions.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                layoutOptions: prev.content.layoutOptions.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={amenities.content.layoutOptions.length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant='outlined'
                  onClick={() =>
                    setAmenities(prev => ({
                      ...prev,
                      content: {
                        ...prev.content,
                        layoutOptions: [...prev.content.layoutOptions, { title: '', icon: 'fa fa-square-o', description: '', highlights: [''] }].slice(
                          0,
                          maxLayoutOptions
                        )
                      }
                    }))
                  }
                  disabled={amenities.content.layoutOptions.length >= maxLayoutOptions}
                >
                  Add Layout Option
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'cards'} onChange={(_, open) => setExpanded(open ? 'cards' : 'overview')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Amenity Cards (${amenities.data.cards.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.cards ? <Alert severity='error'>{formErrors.cards}</Alert> : null}
                {amenities.data.cards.map((item, index) => (
                  <Card key={`amenity-card-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`Card ${index + 1}`}</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Title'
                            value={item.title}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  cards: prev.data.cards.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardsByIndex: { ...prev.cardsByIndex, [index]: { ...prev.cardsByIndex[index], title: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.cardsByIndex[index]?.title)}
                            helperText={formErrors.cardsByIndex[index]?.title}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Icon Class'
                            value={item.icon}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  cards: prev.data.cards.map((row, i) => (i === index ? { ...row, icon: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardsByIndex: { ...prev.cardsByIndex, [index]: { ...prev.cardsByIndex[index], icon: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.cardsByIndex[index]?.icon)}
                            helperText={formErrors.cardsByIndex[index]?.icon}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <CustomTextField
                            label='Image URL'
                            value={item.image}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  cards: prev.data.cards.map((row, i) => (i === index ? { ...row, image: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardsByIndex: { ...prev.cardsByIndex, [index]: { ...prev.cardsByIndex[index], image: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.cardsByIndex[index]?.image)}
                            helperText={formErrors.cardsByIndex[index]?.image}
                            fullWidth
                          />
                          <div className='mt-2'>
                            <Button
                              component='label'
                              variant={uploadErrors.cards[index] ? 'contained' : 'outlined'}
                              color={uploadErrors.cards[index] ? 'error' : 'primary'}
                              disabled={Boolean(uploadingTarget) || saving}
                            >
                              {uploadingTarget === `card-${index}` ? 'Uploading...' : 'Upload Card Image'}
                              <input
                                hidden
                                type='file'
                                accept='image/png,image/jpeg,image/jpg,image/webp'
                                onChange={event => {
                                  const file = event.target.files?.[0]

                                  event.currentTarget.value = ''
                                  if (file) void uploadAmenitiesImage(file, index)
                                }}
                              />
                            </Button>
                          </div>
                          {uploadErrors.cards[index] ? (
                            <Typography variant='caption' color='error.main'>
                              {uploadErrors.cards[index]}
                            </Typography>
                          ) : null}
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <CustomTextField
                            label='Description'
                            value={item.description}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  cards: prev.data.cards.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardsByIndex: { ...prev.cardsByIndex, [index]: { ...prev.cardsByIndex[index], description: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.cardsByIndex[index]?.description)}
                            helperText={formErrors.cardsByIndex[index]?.description}
                            multiline
                            minRows={2}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <CustomTextField
                            label='Highlights (one per line)'
                            value={item.highlights.join('\n')}
                            onChange={e => {
                              setAmenities(prev => ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  cards: prev.data.cards.map((row, i) =>
                                    i === index ? { ...row, highlights: parseLines(e.target.value) } : row
                                  )
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                cardsByIndex: { ...prev.cardsByIndex, [index]: { ...prev.cardsByIndex[index], highlights: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.cardsByIndex[index]?.highlights)}
                            helperText={formErrors.cardsByIndex[index]?.highlights}
                            multiline
                            minRows={3}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                cards: moveItem(prev.data.cards, index, index - 1)
                              }
                            }))
                          }
                          disabled={index === 0}
                        >
                          Move Up
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                cards: moveItem(prev.data.cards, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === amenities.data.cards.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                cards: prev.data.cards.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={amenities.data.cards.length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant='outlined'
                  onClick={() =>
                    setAmenities(prev => ({
                      ...prev,
                      data: {
                        ...prev.data,
                        cards: [...prev.data.cards, { title: '', icon: 'fa fa-home', image: '', description: '', highlights: [''] }].slice(0, maxCards)
                      }
                    }))
                  }
                  disabled={amenities.data.cards.length >= maxCards}
                >
                  Add Amenity Card
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'overview'} onChange={(_, open) => setExpanded(open ? 'overview' : 'cards')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Overview Lines (${amenities.data.overviewItems.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.overviewItems ? <Alert severity='error'>{formErrors.overviewItems}</Alert> : null}
                {amenities.data.overviewItems.map((item, index) => (
                  <Card key={`overview-item-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField
                        label={`Overview Line ${index + 1}`}
                        value={item}
                        onChange={e => {
                          setAmenities(prev => ({
                            ...prev,
                            data: {
                              ...prev.data,
                              overviewItems: prev.data.overviewItems.map((row, i) => (i === index ? e.target.value : row))
                            }
                          }))
                          setFormErrors(prev => ({
                            ...prev,
                            overviewByIndex: { ...prev.overviewByIndex, [index]: { item: undefined } }
                          }))
                        }}
                        error={Boolean(formErrors.overviewByIndex[index]?.item)}
                        helperText={formErrors.overviewByIndex[index]?.item}
                        fullWidth
                      />
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                overviewItems: moveItem(prev.data.overviewItems, index, index - 1)
                              }
                            }))
                          }
                          disabled={index === 0}
                        >
                          Move Up
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                overviewItems: moveItem(prev.data.overviewItems, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === amenities.data.overviewItems.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setAmenities(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                overviewItems: prev.data.overviewItems.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={amenities.data.overviewItems.length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant='outlined'
                  onClick={() =>
                    setAmenities(prev => ({
                      ...prev,
                      data: {
                        ...prev.data,
                        overviewItems: [...prev.data.overviewItems, ''].slice(0, maxOverviewItems)
                      }
                    }))
                  }
                  disabled={amenities.data.overviewItems.length >= maxOverviewItems}
                >
                  Add Overview Line
                </Button>
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Amenities Content'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
