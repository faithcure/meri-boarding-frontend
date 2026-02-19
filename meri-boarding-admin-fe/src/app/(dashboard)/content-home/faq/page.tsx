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

type FaqItem = {
  title: string
  body: string
}

type FaqContent = {
  subtitle: string
  title: string
  cta: string
  items: FaqItem[]
}

type FaqErrors = {
  subtitle?: string
  title?: string
  cta?: string
  items?: string
  itemByIndex: Record<number, { title?: string; body?: string }>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']

const normalizeFaq = (input: unknown): FaqContent => {
  const value = (input || {}) as Partial<FaqContent>
  const items = Array.isArray(value.items)
    ? value.items
        .map(item => ({
          title: String(item?.title || '').trim(),
          body: String(item?.body || '').trim()
        }))
        .filter(item => Boolean(item.title) || Boolean(item.body))
        .slice(0, 20)
    : []

  return {
    subtitle: String(value.subtitle || '').trim(),
    title: String(value.title || '').trim(),
    cta: String(value.cta || '').trim(),
    items
  }
}

export default function FaqSettingsPage() {
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
  const [expanded, setExpanded] = useState<'texts' | 'items'>('texts')
  const [formErrors, setFormErrors] = useState<FaqErrors>({ itemByIndex: {} })
  const [faq, setFaq] = useState<FaqContent>({
    subtitle: '',
    title: '',
    cta: '',
    items: []
  })

  const loadFaq = async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')
      return
    }

    setError('')
    setSuccess('')
    setFormErrors({ itemByIndex: {} })
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
        setError(data?.error || 'FAQ content could not be loaded.')
        return
      }

      setFaq(normalizeFaq(data?.content?.faq || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFaq(locale)
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadFaq(nextLocale)
  }

  const validateFaq = (value: FaqContent): FaqErrors => {
    const errors: FaqErrors = { itemByIndex: {} }
    if (!value.subtitle.trim()) errors.subtitle = 'Subtitle is required.'
    if (!value.title.trim()) errors.title = 'Title is required.'
    if (!value.cta.trim()) errors.cta = 'CTA is required.'
    if (!Array.isArray(value.items) || value.items.length < 1) errors.items = 'At least 1 FAQ item is required.'
    if (value.items.length > 20) errors.items = 'FAQ item limit is 20.'
    value.items.forEach((item, index) => {
      const rowError: { title?: string; body?: string } = {}
      if (!item.title.trim()) rowError.title = 'Question is required.'
      if (!item.body.trim()) rowError.body = 'Answer is required.'
      if (rowError.title || rowError.body) errors.itemByIndex[index] = rowError
    })
    return errors
  }

  const hasErrors = (errors: FaqErrors) =>
    Boolean(
      errors.subtitle ||
        errors.title ||
        errors.cta ||
        errors.items ||
        Object.keys(errors.itemByIndex).length
    )

  const moveItem = (from: number, to: number) => {
    setFaq(prev => {
      if (to < 0 || to >= prev.items.length) return prev
      const nextItems = [...prev.items]
      const [moved] = nextItems.splice(from, 1)
      nextItems.splice(to, 0, moved)
      return { ...prev, items: nextItems }
    })
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const normalized = normalizeFaq(faq)
    const validationErrors = validateFaq(normalized)
    setFormErrors(validationErrors)
    if (hasErrors(validationErrors)) {
      if (validationErrors.subtitle || validationErrors.title || validationErrors.cta) setExpanded('texts')
      else setExpanded('items')
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
          content: { faq: normalized }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'FAQ settings could not be saved.')
        return
      }
      setSuccess('FAQ settings saved.')
      await loadFaq(locale)
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
        <Typography variant='h4'>FAQ Settings</Typography>
        <Typography color='text.secondary'>Manage FAQ title, CTA and question-answer list.</Typography>
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
            <Accordion expanded={expanded === 'texts'} onChange={(_, open) => setExpanded(open ? 'texts' : 'items')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Texts</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Subtitle'
                      value={faq.subtitle}
                      onChange={e => {
                        setFaq(prev => ({ ...prev, subtitle: e.target.value }))
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
                      value={faq.title}
                      onChange={e => {
                        setFaq(prev => ({ ...prev, title: e.target.value }))
                        setFormErrors(prev => ({ ...prev, title: undefined }))
                      }}
                      error={Boolean(formErrors.title)}
                      helperText={formErrors.title}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='CTA Text'
                      value={faq.cta}
                      onChange={e => {
                        setFaq(prev => ({ ...prev, cta: e.target.value }))
                        setFormErrors(prev => ({ ...prev, cta: undefined }))
                      }}
                      error={Boolean(formErrors.cta)}
                      helperText={formErrors.cta}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'items'} onChange={(_, open) => setExpanded(open ? 'items' : 'texts')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Items (${faq.items.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.items ? <Alert severity='error'>{formErrors.items}</Alert> : null}
                {faq.items.map((item, index) => (
                  <Card key={`faq-item-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Typography variant='subtitle1'>{`Item ${index + 1}`}</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 5 }}>
                          <CustomTextField
                            label='Question'
                            value={item.title}
                            onChange={e => {
                              setFaq(prev => ({
                                ...prev,
                                items: prev.items.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                itemByIndex: {
                                  ...prev.itemByIndex,
                                  [index]: { ...prev.itemByIndex[index], title: undefined }
                                }
                              }))
                            }}
                            error={Boolean(formErrors.itemByIndex[index]?.title)}
                            helperText={formErrors.itemByIndex[index]?.title}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 7 }}>
                          <CustomTextField
                            multiline
                            minRows={2}
                            label='Answer'
                            value={item.body}
                            onChange={e => {
                              setFaq(prev => ({
                                ...prev,
                                items: prev.items.map((row, i) => (i === index ? { ...row, body: e.target.value } : row))
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                itemByIndex: {
                                  ...prev.itemByIndex,
                                  [index]: { ...prev.itemByIndex[index], body: undefined }
                                }
                              }))
                            }}
                            error={Boolean(formErrors.itemByIndex[index]?.body)}
                            helperText={formErrors.itemByIndex[index]?.body}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <div className='flex gap-2'>
                            <Button variant='outlined' fullWidth disabled={index === 0} onClick={() => moveItem(index, index - 1)}>
                              Move Up
                            </Button>
                            <Button variant='outlined' fullWidth disabled={index === faq.items.length - 1} onClick={() => moveItem(index, index + 1)}>
                              Move Down
                            </Button>
                          </div>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Button variant='outlined' color='error' fullWidth onClick={() => setFaq(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}>
                            Remove
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant='outlined'
                  disabled={faq.items.length >= 20}
                  onClick={() =>
                    setFaq(prev => ({
                      ...prev,
                      items: [...prev.items, { title: '', body: '' }]
                    }))
                  }
                >
                  Add FAQ Item
                </Button>
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving...' : 'Save FAQ Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
