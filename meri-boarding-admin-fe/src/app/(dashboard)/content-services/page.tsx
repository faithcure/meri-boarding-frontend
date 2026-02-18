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

type ServicesHeroContent = {
  subtitle: string
  title: string
  home: string
  crumb: string
  backgroundImage: string
}

type ServicesStat = {
  label: string
  value: string
  note: string
}

type ServicesHighlight = {
  icon: string
  title: string
  description: string
}

type ServicesBodyContent = {
  heroSubtitle: string
  heroTitle: string
  heroDescription: string
  ctaAvailability: string
  ctaContact: string
  stats: ServicesStat[]
  statsImage: string
  essentialsSubtitle: string
  essentialsTitle: string
  highlights: ServicesHighlight[]
  supportSubtitle: string
  supportTitle: string
  supportDescription: string
  ctaStart: string
  supportList: string[]
}

type ServicesContent = {
  hero: ServicesHeroContent
  content: ServicesBodyContent
}

type ServicesErrors = {
  heroSubtitle?: string
  heroTitle?: string
  heroHome?: string
  heroCrumb?: string
  heroBackgroundImage?: string
  introSubtitle?: string
  introTitle?: string
  introDescription?: string
  ctaAvailability?: string
  ctaContact?: string
  ctaStart?: string
  statsImage?: string
  essentialsSubtitle?: string
  essentialsTitle?: string
  supportSubtitle?: string
  supportTitle?: string
  supportDescription?: string
  stats?: string
  highlights?: string
  supportList?: string
  statsByIndex: Record<number, { label?: string; value?: string; note?: string }>
  highlightsByIndex: Record<number, { icon?: string; title?: string; description?: string }>
  supportListByIndex: Record<number, { item?: string }>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']
const maxStats = 6
const maxHighlights = 12
const maxSupportItems = 20

const createDefaultServices = (): ServicesContent => ({
  hero: {
    subtitle: '',
    title: '',
    home: '',
    crumb: '',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg'
  },
  content: {
    heroSubtitle: '',
    heroTitle: '',
    heroDescription: '',
    ctaAvailability: '',
    ctaContact: '',
    stats: [{ label: '', value: '', note: '' }],
    statsImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg',
    essentialsSubtitle: '',
    essentialsTitle: '',
    highlights: [{ icon: 'fa fa-home', title: '', description: '' }],
    supportSubtitle: '',
    supportTitle: '',
    supportDescription: '',
    ctaStart: '',
    supportList: ['']
  }
})

const normalizeServices = (input: unknown): ServicesContent => {
  const value = (input || {}) as Partial<ServicesContent>

  const stats = Array.isArray(value?.content?.stats)
    ? value.content.stats
        .map(item => ({
          label: String(item?.label || '').trim(),
          value: String(item?.value || '').trim(),
          note: String(item?.note || '').trim()
        }))
        .filter(item => Boolean(item.label) || Boolean(item.value) || Boolean(item.note))
        .slice(0, maxStats)
    : []

  const highlights = Array.isArray(value?.content?.highlights)
    ? value.content.highlights
        .map(item => ({
          icon: String(item?.icon || '').trim() || 'fa fa-home',
          title: String(item?.title || '').trim(),
          description: String(item?.description || '').trim()
        }))
        .filter(item => Boolean(item.icon) || Boolean(item.title) || Boolean(item.description))
        .slice(0, maxHighlights)
    : []

  const supportList = Array.isArray(value?.content?.supportList)
    ? value.content.supportList.map(item => String(item || '').trim()).filter(Boolean).slice(0, maxSupportItems)
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
      heroSubtitle: String(value?.content?.heroSubtitle || '').trim(),
      heroTitle: String(value?.content?.heroTitle || '').trim(),
      heroDescription: String(value?.content?.heroDescription || '').trim(),
      ctaAvailability: String(value?.content?.ctaAvailability || '').trim(),
      ctaContact: String(value?.content?.ctaContact || '').trim(),
      stats: stats.length > 0 ? stats : [{ label: '', value: '', note: '' }],
      statsImage: String(value?.content?.statsImage || '').trim(),
      essentialsSubtitle: String(value?.content?.essentialsSubtitle || '').trim(),
      essentialsTitle: String(value?.content?.essentialsTitle || '').trim(),
      highlights: highlights.length > 0 ? highlights : [{ icon: 'fa fa-home', title: '', description: '' }],
      supportSubtitle: String(value?.content?.supportSubtitle || '').trim(),
      supportTitle: String(value?.content?.supportTitle || '').trim(),
      supportDescription: String(value?.content?.supportDescription || '').trim(),
      ctaStart: String(value?.content?.ctaStart || '').trim(),
      supportList: supportList.length > 0 ? supportList : ['']
    }
  }
}

export default function ServicesContentPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('de')
  const [expanded, setExpanded] = useState<'hero' | 'intro' | 'stats' | 'highlights' | 'support'>('hero')

  const [formErrors, setFormErrors] = useState<ServicesErrors>({
    statsByIndex: {},
    highlightsByIndex: {},
    supportListByIndex: {}
  })

  const [services, setServices] = useState<ServicesContent>(createDefaultServices())

  const loadServices = useCallback(async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')

      return
    }

    setError('')
    setSuccess('')
    setFormErrors({ statsByIndex: {}, highlightsByIndex: {}, supportListByIndex: {} })

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

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/services?locale=${targetLocale}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setLoading(false)
        setError(data?.error || 'Services content could not be loaded.')

        return
      }

      setServices(normalizeServices(data?.content || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    void loadServices(locale)
  }, [loadServices, locale])

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
  }

  const validateServices = (value: ServicesContent): ServicesErrors => {
    const errors: ServicesErrors = {
      statsByIndex: {},
      highlightsByIndex: {},
      supportListByIndex: {}
    }

    if (!value.hero.subtitle.trim()) errors.heroSubtitle = 'Hero subtitle is required.'
    if (!value.hero.title.trim()) errors.heroTitle = 'Hero title is required.'
    if (!value.hero.home.trim()) errors.heroHome = 'Breadcrumb home text is required.'
    if (!value.hero.crumb.trim()) errors.heroCrumb = 'Breadcrumb current text is required.'
    if (!value.hero.backgroundImage.trim()) errors.heroBackgroundImage = 'Hero background image is required.'

    if (!value.content.heroSubtitle.trim()) errors.introSubtitle = 'Intro subtitle is required.'
    if (!value.content.heroTitle.trim()) errors.introTitle = 'Intro title is required.'
    if (!value.content.heroDescription.trim()) errors.introDescription = 'Intro description is required.'
    if (!value.content.ctaAvailability.trim()) errors.ctaAvailability = 'Availability CTA is required.'
    if (!value.content.ctaContact.trim()) errors.ctaContact = 'Contact CTA is required.'
    if (!value.content.ctaStart.trim()) errors.ctaStart = 'Start CTA is required.'

    if (!value.content.statsImage.trim()) errors.statsImage = 'Stats image is required.'

    if (!Array.isArray(value.content.stats) || value.content.stats.length < 1) {
      errors.stats = 'At least 1 stats row is required.'
    }

    if (Array.isArray(value.content.stats) && value.content.stats.length > maxStats) {
      errors.stats = `Stats row limit is ${maxStats}.`
    }

    value.content.stats.forEach((item, index) => {
      const rowError: { label?: string; value?: string; note?: string } = {}

      if (!item.label.trim()) rowError.label = 'Label is required.'
      if (!item.value.trim()) rowError.value = 'Value is required.'
      if (!item.note.trim()) rowError.note = 'Note is required.'
      if (rowError.label || rowError.value || rowError.note) errors.statsByIndex[index] = rowError
    })

    if (!value.content.essentialsSubtitle.trim()) errors.essentialsSubtitle = 'Essentials subtitle is required.'
    if (!value.content.essentialsTitle.trim()) errors.essentialsTitle = 'Essentials title is required.'

    if (!Array.isArray(value.content.highlights) || value.content.highlights.length < 1) {
      errors.highlights = 'At least 1 highlight row is required.'
    }

    if (Array.isArray(value.content.highlights) && value.content.highlights.length > maxHighlights) {
      errors.highlights = `Highlight row limit is ${maxHighlights}.`
    }

    value.content.highlights.forEach((item, index) => {
      const rowError: { icon?: string; title?: string; description?: string } = {}

      if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
      if (!item.title.trim()) rowError.title = 'Title is required.'
      if (!item.description.trim()) rowError.description = 'Description is required.'
      if (rowError.icon || rowError.title || rowError.description) errors.highlightsByIndex[index] = rowError
    })

    if (!value.content.supportSubtitle.trim()) errors.supportSubtitle = 'Support subtitle is required.'
    if (!value.content.supportTitle.trim()) errors.supportTitle = 'Support title is required.'
    if (!value.content.supportDescription.trim()) errors.supportDescription = 'Support description is required.'

    if (!Array.isArray(value.content.supportList) || value.content.supportList.length < 1) {
      errors.supportList = 'At least 1 support list row is required.'
    }

    if (Array.isArray(value.content.supportList) && value.content.supportList.length > maxSupportItems) {
      errors.supportList = `Support list row limit is ${maxSupportItems}.`
    }

    value.content.supportList.forEach((item, index) => {
      if (!item.trim()) {
        errors.supportListByIndex[index] = { item: 'List row is required.' }
      }
    })

    return errors
  }

  const hasErrors = (errors: ServicesErrors) =>
    Boolean(
      errors.heroSubtitle ||
        errors.heroTitle ||
        errors.heroHome ||
        errors.heroCrumb ||
        errors.heroBackgroundImage ||
        errors.introSubtitle ||
        errors.introTitle ||
        errors.introDescription ||
        errors.ctaAvailability ||
        errors.ctaContact ||
        errors.ctaStart ||
        errors.statsImage ||
        errors.essentialsSubtitle ||
        errors.essentialsTitle ||
        errors.supportSubtitle ||
        errors.supportTitle ||
        errors.supportDescription ||
        errors.stats ||
        errors.highlights ||
        errors.supportList ||
        Object.keys(errors.statsByIndex).length ||
        Object.keys(errors.highlightsByIndex).length ||
        Object.keys(errors.supportListByIndex).length
    )

  const moveItem = <T,>(items: T[], from: number, to: number) => {
    if (to < 0 || to >= items.length) return items
    const next = [...items]
    const [moved] = next.splice(from, 1)

    next.splice(to, 0, moved)

    return next
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    const normalized = normalizeServices(services)
    const validationErrors = validateServices(normalized)

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
        validationErrors.introSubtitle ||
        validationErrors.introTitle ||
        validationErrors.introDescription ||
        validationErrors.ctaAvailability ||
        validationErrors.ctaContact ||
        validationErrors.ctaStart
      ) {
        setExpanded('intro')
      } else if (validationErrors.stats || validationErrors.statsImage || Object.keys(validationErrors.statsByIndex).length) {
        setExpanded('stats')
      } else if (validationErrors.highlights || validationErrors.essentialsSubtitle || validationErrors.essentialsTitle || Object.keys(validationErrors.highlightsByIndex).length) {
        setExpanded('highlights')
      } else {
        setExpanded('support')
      }


      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/services`, {
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
        setError(data?.error || 'Services settings could not be saved.')

        return
      }

      setSuccess('Services settings saved.')
      await loadServices(locale)
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
        <Typography variant='h4'>Services Content</Typography>
        <Typography color='text.secondary'>Manage all texts for the public services page with locale-based editing.</Typography>
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
            <Accordion expanded={expanded === 'hero'} onChange={(_, open) => setExpanded(open ? 'hero' : 'intro')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Hero & Breadcrumb</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Hero Subtitle'
                      value={services.hero.subtitle}
                      onChange={e => {
                        setServices(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))
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
                      value={services.hero.title}
                      onChange={e => {
                        setServices(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))
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
                      value={services.hero.home}
                      onChange={e => {
                        setServices(prev => ({ ...prev, hero: { ...prev.hero, home: e.target.value } }))
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
                      value={services.hero.crumb}
                      onChange={e => {
                        setServices(prev => ({ ...prev, hero: { ...prev.hero, crumb: e.target.value } }))
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
                      value={services.hero.backgroundImage}
                      onChange={e => {
                        setServices(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, heroBackgroundImage: undefined }))
                      }}
                      error={Boolean(formErrors.heroBackgroundImage)}
                      helperText={formErrors.heroBackgroundImage}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'intro'} onChange={(_, open) => setExpanded(open ? 'intro' : 'hero')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Intro & CTA</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Intro Subtitle'
                      value={services.content.heroSubtitle}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, heroSubtitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, introSubtitle: undefined }))
                      }}
                      error={Boolean(formErrors.introSubtitle)}
                      helperText={formErrors.introSubtitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField
                      label='Intro Title'
                      value={services.content.heroTitle}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, heroTitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, introTitle: undefined }))
                      }}
                      error={Boolean(formErrors.introTitle)}
                      helperText={formErrors.introTitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      label='Intro Description'
                      value={services.content.heroDescription}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, heroDescription: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, introDescription: undefined }))
                      }}
                      error={Boolean(formErrors.introDescription)}
                      helperText={formErrors.introDescription}
                      multiline
                      minRows={3}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='CTA Availability'
                      value={services.content.ctaAvailability}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, ctaAvailability: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, ctaAvailability: undefined }))
                      }}
                      error={Boolean(formErrors.ctaAvailability)}
                      helperText={formErrors.ctaAvailability}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='CTA Contact'
                      value={services.content.ctaContact}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, ctaContact: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, ctaContact: undefined }))
                      }}
                      error={Boolean(formErrors.ctaContact)}
                      helperText={formErrors.ctaContact}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='CTA Start'
                      value={services.content.ctaStart}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, ctaStart: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, ctaStart: undefined }))
                      }}
                      error={Boolean(formErrors.ctaStart)}
                      helperText={formErrors.ctaStart}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'stats'} onChange={(_, open) => setExpanded(open ? 'stats' : 'intro')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Stats (${services.content.stats.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.stats ? <Alert severity='error'>{formErrors.stats}</Alert> : null}
                <CustomTextField
                  label='Stats Image URL'
                  value={services.content.statsImage}
                  onChange={e => {
                    setServices(prev => ({ ...prev, content: { ...prev.content, statsImage: e.target.value } }))
                    setFormErrors(prev => ({ ...prev, statsImage: undefined }))
                  }}
                  error={Boolean(formErrors.statsImage)}
                  helperText={formErrors.statsImage}
                  fullWidth
                />

                {services.content.stats.map((item, index) => (
                  <Card key={`services-stat-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`Stat ${index + 1}`}</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <CustomTextField
                            label='Label'
                            value={item.label}
                            onChange={e => {
                              setServices(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  stats: prev.content.stats.map((row, i) => (i === index ? { ...row, label: e.target.value } : row))
                                }
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
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Value'
                            value={item.value}
                            onChange={e => {
                              setServices(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  stats: prev.content.stats.map((row, i) => (i === index ? { ...row, value: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                statsByIndex: { ...prev.statsByIndex, [index]: { ...prev.statsByIndex[index], value: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.statsByIndex[index]?.value)}
                            helperText={formErrors.statsByIndex[index]?.value}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                          <CustomTextField
                            label='Note'
                            value={item.note}
                            onChange={e => {
                              setServices(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  stats: prev.content.stats.map((row, i) => (i === index ? { ...row, note: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                statsByIndex: { ...prev.statsByIndex, [index]: { ...prev.statsByIndex[index], note: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.statsByIndex[index]?.note)}
                            helperText={formErrors.statsByIndex[index]?.note}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                stats: moveItem(prev.content.stats, index, index - 1)
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
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                stats: moveItem(prev.content.stats, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === services.content.stats.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                stats: prev.content.stats.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={services.content.stats.length <= 1}
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
                    setServices(prev => ({
                      ...prev,
                      content: {
                        ...prev.content,
                        stats: [...prev.content.stats, { label: '', value: '', note: '' }].slice(0, maxStats)
                      }
                    }))
                  }
                  disabled={services.content.stats.length >= maxStats}
                >
                  Add Stat Row
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'highlights'} onChange={(_, open) => setExpanded(open ? 'highlights' : 'stats')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Essentials & Highlights (${services.content.highlights.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.highlights ? <Alert severity='error'>{formErrors.highlights}</Alert> : null}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Essentials Subtitle'
                      value={services.content.essentialsSubtitle}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, essentialsSubtitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, essentialsSubtitle: undefined }))
                      }}
                      error={Boolean(formErrors.essentialsSubtitle)}
                      helperText={formErrors.essentialsSubtitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField
                      label='Essentials Title'
                      value={services.content.essentialsTitle}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, essentialsTitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, essentialsTitle: undefined }))
                      }}
                      error={Boolean(formErrors.essentialsTitle)}
                      helperText={formErrors.essentialsTitle}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {services.content.highlights.map((item, index) => (
                  <Card key={`services-highlight-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`Highlight ${index + 1}`}</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Icon Class'
                            value={item.icon}
                            onChange={e => {
                              setServices(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  highlights: prev.content.highlights.map((row, i) => (i === index ? { ...row, icon: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                highlightsByIndex: { ...prev.highlightsByIndex, [index]: { ...prev.highlightsByIndex[index], icon: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.highlightsByIndex[index]?.icon)}
                            helperText={formErrors.highlightsByIndex[index]?.icon}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <CustomTextField
                            label='Title'
                            value={item.title}
                            onChange={e => {
                              setServices(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  highlights: prev.content.highlights.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                highlightsByIndex: { ...prev.highlightsByIndex, [index]: { ...prev.highlightsByIndex[index], title: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.highlightsByIndex[index]?.title)}
                            helperText={formErrors.highlightsByIndex[index]?.title}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                          <CustomTextField
                            label='Description'
                            value={item.description}
                            onChange={e => {
                              setServices(prev => ({
                                ...prev,
                                content: {
                                  ...prev.content,
                                  highlights: prev.content.highlights.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                highlightsByIndex: { ...prev.highlightsByIndex, [index]: { ...prev.highlightsByIndex[index], description: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.highlightsByIndex[index]?.description)}
                            helperText={formErrors.highlightsByIndex[index]?.description}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                highlights: moveItem(prev.content.highlights, index, index - 1)
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
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                highlights: moveItem(prev.content.highlights, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === services.content.highlights.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                highlights: prev.content.highlights.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={services.content.highlights.length <= 1}
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
                    setServices(prev => ({
                      ...prev,
                      content: {
                        ...prev.content,
                        highlights: [...prev.content.highlights, { icon: 'fa fa-home', title: '', description: '' }].slice(0, maxHighlights)
                      }
                    }))
                  }
                  disabled={services.content.highlights.length >= maxHighlights}
                >
                  Add Highlight Row
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'support'} onChange={(_, open) => setExpanded(open ? 'support' : 'highlights')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Support List (${services.content.supportList.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.supportList ? <Alert severity='error'>{formErrors.supportList}</Alert> : null}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Support Subtitle'
                      value={services.content.supportSubtitle}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, supportSubtitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, supportSubtitle: undefined }))
                      }}
                      error={Boolean(formErrors.supportSubtitle)}
                      helperText={formErrors.supportSubtitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField
                      label='Support Title'
                      value={services.content.supportTitle}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, supportTitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, supportTitle: undefined }))
                      }}
                      error={Boolean(formErrors.supportTitle)}
                      helperText={formErrors.supportTitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      label='Support Description'
                      value={services.content.supportDescription}
                      onChange={e => {
                        setServices(prev => ({ ...prev, content: { ...prev.content, supportDescription: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, supportDescription: undefined }))
                      }}
                      error={Boolean(formErrors.supportDescription)}
                      helperText={formErrors.supportDescription}
                      multiline
                      minRows={3}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {services.content.supportList.map((item, index) => (
                  <Card key={`services-support-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`List Row ${index + 1}`}</Typography>
                      <CustomTextField
                        label='Support List Item'
                        value={item}
                        onChange={e => {
                          setServices(prev => ({
                            ...prev,
                            content: {
                              ...prev.content,
                              supportList: prev.content.supportList.map((row, i) => (i === index ? e.target.value : row))
                            }
                          }))
                          setFormErrors(prev => ({
                            ...prev,
                            supportListByIndex: { ...prev.supportListByIndex, [index]: { item: undefined } }
                          }))
                        }}
                        error={Boolean(formErrors.supportListByIndex[index]?.item)}
                        helperText={formErrors.supportListByIndex[index]?.item}
                        fullWidth
                      />
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                supportList: moveItem(prev.content.supportList, index, index - 1)
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
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                supportList: moveItem(prev.content.supportList, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === services.content.supportList.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setServices(prev => ({
                              ...prev,
                              content: {
                                ...prev.content,
                                supportList: prev.content.supportList.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={services.content.supportList.length <= 1}
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
                    setServices(prev => ({
                      ...prev,
                      content: {
                        ...prev.content,
                        supportList: [...prev.content.supportList, ''].slice(0, maxSupportItems)
                      }
                    }))
                  }
                  disabled={services.content.supportList.length >= maxSupportItems}
                >
                  Add Support List Row
                </Button>
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Services Content'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
