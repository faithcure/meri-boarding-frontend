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

type ContactDetailItem = {
  icon: string
  title: string
  value: string
}

type ContactSocialLink = {
  icon: string
  label: string
  url: string
}

type ContactContent = {
  hero: {
    subtitle: string
    title: string
    home: string
    crumb: string
    backgroundImage: string
  }
  details: {
    subtitle: string
    title: string
    description: string
    items: ContactDetailItem[]
    socials: ContactSocialLink[]
  }
  form: {
    action: string
    name: string
    email: string
    phone: string
    message: string
    send: string
    success: string
    error: string
    namePlaceholder: string
    emailPlaceholder: string
    phonePlaceholder: string
    messagePlaceholder: string
  }
}

type ContactErrors = {
  heroSubtitle?: string
  heroTitle?: string
  heroHome?: string
  heroCrumb?: string
  heroBackgroundImage?: string
  detailsSubtitle?: string
  detailsTitle?: string
  detailsDescription?: string
  detailItems?: string
  socials?: string
  formAction?: string
  formName?: string
  formEmail?: string
  formPhone?: string
  formMessage?: string
  formSend?: string
  formSuccess?: string
  formError?: string
  formNamePlaceholder?: string
  formEmailPlaceholder?: string
  formPhonePlaceholder?: string
  formMessagePlaceholder?: string
  detailsByIndex: Record<number, { icon?: string; title?: string; value?: string }>
  socialsByIndex: Record<number, { icon?: string; label?: string; url?: string }>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']
const maxDetailItems = 12
const maxSocials = 12

const createDefaultContact = (): ContactContent => ({
  hero: {
    subtitle: '',
    title: '',
    home: '',
    crumb: '',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg'
  },
  details: {
    subtitle: '',
    title: '',
    description: '',
    items: [{ icon: 'icofont-location-pin', title: '', value: '' }],
    socials: [{ icon: 'fa-brands fa-instagram', label: '', url: '' }]
  },
  form: {
    action: 'https://meri-boarding.de/boarding-booking.php',
    name: '',
    email: '',
    phone: '',
    message: '',
    send: '',
    success: '',
    error: '',
    namePlaceholder: '',
    emailPlaceholder: '',
    phonePlaceholder: '',
    messagePlaceholder: ''
  }
})

const normalizeContact = (input: unknown): ContactContent => {
  const value = (input || {}) as Partial<ContactContent>

  const items = Array.isArray(value?.details?.items)
    ? value.details.items
        .map(item => ({
          icon: String(item?.icon || '').trim() || 'icofont-info-circle',
          title: String(item?.title || '').trim(),
          value: String(item?.value || '').trim()
        }))
        .filter(item => Boolean(item.title) || Boolean(item.value))
        .slice(0, maxDetailItems)
    : []

  const socials = Array.isArray(value?.details?.socials)
    ? value.details.socials
        .map(item => ({
          icon: String(item?.icon || '').trim() || 'fa-brands fa-linkedin-in',
          label: String(item?.label || '').trim(),
          url: String(item?.url || '').trim()
        }))
        .filter(item => Boolean(item.label) || Boolean(item.url))
        .slice(0, maxSocials)
    : []

  return {
    hero: {
      subtitle: String(value?.hero?.subtitle || '').trim(),
      title: String(value?.hero?.title || '').trim(),
      home: String(value?.hero?.home || '').trim(),
      crumb: String(value?.hero?.crumb || '').trim(),
      backgroundImage: String(value?.hero?.backgroundImage || '').trim()
    },
    details: {
      subtitle: String(value?.details?.subtitle || '').trim(),
      title: String(value?.details?.title || '').trim(),
      description: String(value?.details?.description || '').trim(),
      items: items.length > 0 ? items : [{ icon: 'icofont-location-pin', title: '', value: '' }],
      socials: socials.length > 0 ? socials : [{ icon: 'fa-brands fa-instagram', label: '', url: '' }]
    },
    form: {
      action: String(value?.form?.action || '').trim(),
      name: String(value?.form?.name || '').trim(),
      email: String(value?.form?.email || '').trim(),
      phone: String(value?.form?.phone || '').trim(),
      message: String(value?.form?.message || '').trim(),
      send: String(value?.form?.send || '').trim(),
      success: String(value?.form?.success || '').trim(),
      error: String(value?.form?.error || '').trim(),
      namePlaceholder: String(value?.form?.namePlaceholder || '').trim(),
      emailPlaceholder: String(value?.form?.emailPlaceholder || '').trim(),
      phonePlaceholder: String(value?.form?.phonePlaceholder || '').trim(),
      messagePlaceholder: String(value?.form?.messagePlaceholder || '').trim()
    }
  }
}

const validateContact = (value: ContactContent): ContactErrors => {
  const errors: ContactErrors = {
    detailsByIndex: {},
    socialsByIndex: {}
  }

  if (!value.hero.subtitle.trim()) errors.heroSubtitle = 'Hero subtitle is required.'
  if (!value.hero.title.trim()) errors.heroTitle = 'Hero title is required.'
  if (!value.hero.home.trim()) errors.heroHome = 'Breadcrumb home text is required.'
  if (!value.hero.crumb.trim()) errors.heroCrumb = 'Breadcrumb current text is required.'
  if (!value.hero.backgroundImage.trim()) errors.heroBackgroundImage = 'Hero background image URL is required.'

  if (!value.details.subtitle.trim()) errors.detailsSubtitle = 'Details subtitle is required.'
  if (!value.details.title.trim()) errors.detailsTitle = 'Details title is required.'
  if (!value.details.description.trim()) errors.detailsDescription = 'Details description is required.'

  if (!Array.isArray(value.details.items) || value.details.items.length < 1) {
    errors.detailItems = 'At least 1 detail row is required.'
  }

  if (Array.isArray(value.details.items) && value.details.items.length > maxDetailItems) {
    errors.detailItems = `Detail row limit is ${maxDetailItems}.`
  }

  value.details.items.forEach((item, index) => {
    const rowError: { icon?: string; title?: string; value?: string } = {}

    if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
    if (!item.title.trim()) rowError.title = 'Title is required.'
    if (!item.value.trim()) rowError.value = 'Value is required.'
    if (rowError.icon || rowError.title || rowError.value) errors.detailsByIndex[index] = rowError
  })

  if (!Array.isArray(value.details.socials) || value.details.socials.length < 1) {
    errors.socials = 'At least 1 social row is required.'
  }

  if (Array.isArray(value.details.socials) && value.details.socials.length > maxSocials) {
    errors.socials = `Social row limit is ${maxSocials}.`
  }

  value.details.socials.forEach((item, index) => {
    const rowError: { icon?: string; label?: string; url?: string } = {}

    if (!item.icon.trim()) rowError.icon = 'Icon class is required.'
    if (!item.label.trim()) rowError.label = 'Label is required.'
    if (!item.url.trim()) rowError.url = 'URL is required.'
    if (rowError.icon || rowError.label || rowError.url) errors.socialsByIndex[index] = rowError
  })

  if (!value.form.action.trim()) errors.formAction = 'Form action URL is required.'
  if (!value.form.name.trim()) errors.formName = 'Name label is required.'
  if (!value.form.email.trim()) errors.formEmail = 'Email label is required.'
  if (!value.form.phone.trim()) errors.formPhone = 'Phone label is required.'
  if (!value.form.message.trim()) errors.formMessage = 'Message label is required.'
  if (!value.form.send.trim()) errors.formSend = 'Send button text is required.'
  if (!value.form.success.trim()) errors.formSuccess = 'Success message is required.'
  if (!value.form.error.trim()) errors.formError = 'Error message is required.'
  if (!value.form.namePlaceholder.trim()) errors.formNamePlaceholder = 'Name placeholder is required.'
  if (!value.form.emailPlaceholder.trim()) errors.formEmailPlaceholder = 'Email placeholder is required.'
  if (!value.form.phonePlaceholder.trim()) errors.formPhonePlaceholder = 'Phone placeholder is required.'
  if (!value.form.messagePlaceholder.trim()) errors.formMessagePlaceholder = 'Message placeholder is required.'

  return errors
}

const hasErrors = (errors: ContactErrors) =>
  Boolean(
    errors.heroSubtitle ||
      errors.heroTitle ||
      errors.heroHome ||
      errors.heroCrumb ||
      errors.heroBackgroundImage ||
      errors.detailsSubtitle ||
      errors.detailsTitle ||
      errors.detailsDescription ||
      errors.detailItems ||
      errors.socials ||
      errors.formAction ||
      errors.formName ||
      errors.formEmail ||
      errors.formPhone ||
      errors.formMessage ||
      errors.formSend ||
      errors.formSuccess ||
      errors.formError ||
      errors.formNamePlaceholder ||
      errors.formEmailPlaceholder ||
      errors.formPhonePlaceholder ||
      errors.formMessagePlaceholder ||
      Object.keys(errors.detailsByIndex).length ||
      Object.keys(errors.socialsByIndex).length
  )

const moveItem = <T,>(items: T[], from: number, to: number) => {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)

  next.splice(to, 0, moved)

  return next
}

export default function ContactContentPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('de')
  const [expanded, setExpanded] = useState<'hero' | 'details' | 'items' | 'socials' | 'form'>('hero')

  const [formErrors, setFormErrors] = useState<ContactErrors>({
    detailsByIndex: {},
    socialsByIndex: {}
  })

  const [contact, setContact] = useState<ContactContent>(createDefaultContact())

  const loadContact = useCallback(
    async (targetLocale: Locale) => {
      const token = window.localStorage.getItem('admin_token')

      if (!token) {
        setLoading(false)
        setError('No active session. Please login again.')

        return
      }

      setError('')
      setSuccess('')
      setFormErrors({ detailsByIndex: {}, socialsByIndex: {} })

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

        const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/contact?locale=${targetLocale}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await response.json()

        if (!response.ok) {
          setLoading(false)
          setError(data?.error || 'Contact content could not be loaded.')

          return
        }

        setContact(normalizeContact(data?.content || {}))
      } catch {
        setError('API connection failed.')
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl]
  )

  useEffect(() => {
    void loadContact(locale)
  }, [loadContact, locale])

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    const normalized = normalizeContact(contact)
    const validationErrors = validateContact(normalized)

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
      } else if (validationErrors.detailsSubtitle || validationErrors.detailsTitle || validationErrors.detailsDescription) {
        setExpanded('details')
      } else if (validationErrors.detailItems || Object.keys(validationErrors.detailsByIndex).length) {
        setExpanded('items')
      } else if (validationErrors.socials || Object.keys(validationErrors.socialsByIndex).length) {
        setExpanded('socials')
      } else {
        setExpanded('form')
      }

      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/contact`, {
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
        setError(data?.error || 'Contact settings could not be saved.')

        return
      }

      setSuccess('Contact settings saved.')
      await loadContact(locale)
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
        <Typography variant='h4'>Contact Content</Typography>
        <Typography color='text.secondary'>Manage all texts and rows for the public contact page with locale-based editing.</Typography>
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
            <Accordion expanded={expanded === 'hero'} onChange={(_, open) => setExpanded(open ? 'hero' : 'details')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Hero & Breadcrumb</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Hero Subtitle'
                      value={contact.hero.subtitle}
                      onChange={e => {
                        setContact(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))
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
                      value={contact.hero.title}
                      onChange={e => {
                        setContact(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))
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
                      value={contact.hero.home}
                      onChange={e => {
                        setContact(prev => ({ ...prev, hero: { ...prev.hero, home: e.target.value } }))
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
                      value={contact.hero.crumb}
                      onChange={e => {
                        setContact(prev => ({ ...prev, hero: { ...prev.hero, crumb: e.target.value } }))
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
                      value={contact.hero.backgroundImage}
                      onChange={e => {
                        setContact(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: e.target.value } }))
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

            <Accordion expanded={expanded === 'details'} onChange={(_, open) => setExpanded(open ? 'details' : 'hero')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Details Intro</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Details Subtitle'
                      value={contact.details.subtitle}
                      onChange={e => {
                        setContact(prev => ({ ...prev, details: { ...prev.details, subtitle: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, detailsSubtitle: undefined }))
                      }}
                      error={Boolean(formErrors.detailsSubtitle)}
                      helperText={formErrors.detailsSubtitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField
                      label='Details Title'
                      value={contact.details.title}
                      onChange={e => {
                        setContact(prev => ({ ...prev, details: { ...prev.details, title: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, detailsTitle: undefined }))
                      }}
                      error={Boolean(formErrors.detailsTitle)}
                      helperText={formErrors.detailsTitle}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      label='Details Description'
                      value={contact.details.description}
                      onChange={e => {
                        setContact(prev => ({ ...prev, details: { ...prev.details, description: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, detailsDescription: undefined }))
                      }}
                      error={Boolean(formErrors.detailsDescription)}
                      helperText={formErrors.detailsDescription}
                      multiline
                      minRows={3}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'items'} onChange={(_, open) => setExpanded(open ? 'items' : 'details')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Detail Rows (${contact.details.items.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.detailItems ? <Alert severity='error'>{formErrors.detailItems}</Alert> : null}

                {contact.details.items.map((item, index) => (
                  <Card key={`contact-detail-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`Detail Row ${index + 1}`}</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Icon Class'
                            value={item.icon}
                            onChange={e => {
                              setContact(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  items: prev.details.items.map((row, i) => (i === index ? { ...row, icon: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                detailsByIndex: { ...prev.detailsByIndex, [index]: { ...prev.detailsByIndex[index], icon: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.detailsByIndex[index]?.icon)}
                            helperText={formErrors.detailsByIndex[index]?.icon}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Title'
                            value={item.title}
                            onChange={e => {
                              setContact(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  items: prev.details.items.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                detailsByIndex: { ...prev.detailsByIndex, [index]: { ...prev.detailsByIndex[index], title: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.detailsByIndex[index]?.title)}
                            helperText={formErrors.detailsByIndex[index]?.title}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <CustomTextField
                            label='Value (supports line breaks)'
                            value={item.value}
                            onChange={e => {
                              setContact(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  items: prev.details.items.map((row, i) => (i === index ? { ...row, value: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                detailsByIndex: { ...prev.detailsByIndex, [index]: { ...prev.detailsByIndex[index], value: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.detailsByIndex[index]?.value)}
                            helperText={formErrors.detailsByIndex[index]?.value}
                            multiline
                            minRows={2}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setContact(prev => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                items: moveItem(prev.details.items, index, index - 1)
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
                            setContact(prev => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                items: moveItem(prev.details.items, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === contact.details.items.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setContact(prev => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                items: prev.details.items.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={contact.details.items.length <= 1}
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
                    setContact(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        items: [...prev.details.items, { icon: 'icofont-info-circle', title: '', value: '' }].slice(0, maxDetailItems)
                      }
                    }))
                  }
                  disabled={contact.details.items.length >= maxDetailItems}
                >
                  Add Detail Row
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'socials'} onChange={(_, open) => setExpanded(open ? 'socials' : 'items')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Social Links (${contact.details.socials.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.socials ? <Alert severity='error'>{formErrors.socials}</Alert> : null}

                {contact.details.socials.map((item, index) => (
                  <Card key={`contact-social-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`Social ${index + 1}`}</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Icon Class'
                            value={item.icon}
                            onChange={e => {
                              setContact(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  socials: prev.details.socials.map((row, i) => (i === index ? { ...row, icon: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                socialsByIndex: { ...prev.socialsByIndex, [index]: { ...prev.socialsByIndex[index], icon: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.socialsByIndex[index]?.icon)}
                            helperText={formErrors.socialsByIndex[index]?.icon}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <CustomTextField
                            label='Label'
                            value={item.label}
                            onChange={e => {
                              setContact(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  socials: prev.details.socials.map((row, i) => (i === index ? { ...row, label: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                socialsByIndex: { ...prev.socialsByIndex, [index]: { ...prev.socialsByIndex[index], label: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.socialsByIndex[index]?.label)}
                            helperText={formErrors.socialsByIndex[index]?.label}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <CustomTextField
                            label='URL'
                            value={item.url}
                            onChange={e => {
                              setContact(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  socials: prev.details.socials.map((row, i) => (i === index ? { ...row, url: e.target.value } : row))
                                }
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                socialsByIndex: { ...prev.socialsByIndex, [index]: { ...prev.socialsByIndex[index], url: undefined } }
                              }))
                            }}
                            error={Boolean(formErrors.socialsByIndex[index]?.url)}
                            helperText={formErrors.socialsByIndex[index]?.url}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={() =>
                            setContact(prev => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                socials: moveItem(prev.details.socials, index, index - 1)
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
                            setContact(prev => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                socials: moveItem(prev.details.socials, index, index + 1)
                              }
                            }))
                          }
                          disabled={index === contact.details.socials.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() =>
                            setContact(prev => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                socials: prev.details.socials.filter((_, i) => i !== index)
                              }
                            }))
                          }
                          disabled={contact.details.socials.length <= 1}
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
                    setContact(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        socials: [...prev.details.socials, { icon: 'fa-brands fa-linkedin-in', label: '', url: '' }].slice(0, maxSocials)
                      }
                    }))
                  }
                  disabled={contact.details.socials.length >= maxSocials}
                >
                  Add Social Row
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'form'} onChange={(_, open) => setExpanded(open ? 'form' : 'socials')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Contact Form</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      label='Form Action URL'
                      value={contact.form.action}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, action: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formAction: undefined }))
                      }}
                      error={Boolean(formErrors.formAction)}
                      helperText={formErrors.formAction}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='Name Label'
                      value={contact.form.name}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formName: undefined }))
                      }}
                      error={Boolean(formErrors.formName)}
                      helperText={formErrors.formName}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='Email Label'
                      value={contact.form.email}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, email: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formEmail: undefined }))
                      }}
                      error={Boolean(formErrors.formEmail)}
                      helperText={formErrors.formEmail}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='Phone Label'
                      value={contact.form.phone}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, phone: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formPhone: undefined }))
                      }}
                      error={Boolean(formErrors.formPhone)}
                      helperText={formErrors.formPhone}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      label='Message Label'
                      value={contact.form.message}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, message: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formMessage: undefined }))
                      }}
                      error={Boolean(formErrors.formMessage)}
                      helperText={formErrors.formMessage}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Send Button Text'
                      value={contact.form.send}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, send: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formSend: undefined }))
                      }}
                      error={Boolean(formErrors.formSend)}
                      helperText={formErrors.formSend}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Success Message'
                      value={contact.form.success}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, success: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formSuccess: undefined }))
                      }}
                      error={Boolean(formErrors.formSuccess)}
                      helperText={formErrors.formSuccess}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Error Message'
                      value={contact.form.error}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, error: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formError: undefined }))
                      }}
                      error={Boolean(formErrors.formError)}
                      helperText={formErrors.formError}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Name Placeholder'
                      value={contact.form.namePlaceholder}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, namePlaceholder: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formNamePlaceholder: undefined }))
                      }}
                      error={Boolean(formErrors.formNamePlaceholder)}
                      helperText={formErrors.formNamePlaceholder}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Email Placeholder'
                      value={contact.form.emailPlaceholder}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, emailPlaceholder: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formEmailPlaceholder: undefined }))
                      }}
                      error={Boolean(formErrors.formEmailPlaceholder)}
                      helperText={formErrors.formEmailPlaceholder}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Phone Placeholder'
                      value={contact.form.phonePlaceholder}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, phonePlaceholder: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formPhonePlaceholder: undefined }))
                      }}
                      error={Boolean(formErrors.formPhonePlaceholder)}
                      helperText={formErrors.formPhonePlaceholder}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      label='Message Placeholder'
                      value={contact.form.messagePlaceholder}
                      onChange={e => {
                        setContact(prev => ({ ...prev, form: { ...prev.form, messagePlaceholder: e.target.value } }))
                        setFormErrors(prev => ({ ...prev, formMessagePlaceholder: undefined }))
                      }}
                      error={Boolean(formErrors.formMessagePlaceholder)}
                      helperText={formErrors.formMessagePlaceholder}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Contact Content'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
