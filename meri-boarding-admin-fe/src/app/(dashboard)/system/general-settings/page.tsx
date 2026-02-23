'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'threads'
  | 'pinterest'
  | 'telegram'
  | 'whatsapp'
  | 'snapchat'
  | 'discord'
  | 'reddit'
  | 'github'
  | 'medium'
  | 'vimeo'

type SocialLink = {
  id: string
  platform: SocialPlatform
  label: string
  url: string
  enabled: boolean
  order: number
}

type FormDeliverySettings = {
  requestFormActionUrl: string
  contactNotificationEmails: string[]
}

type SmtpSettings = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

type GeneralSettingsContent = {
  siteIconUrl: string
  socialLinks: SocialLink[]
  formDelivery: FormDeliverySettings
  smtp: SmtpSettings
}

const platformOptions: Array<{ value: SocialPlatform; label: string; iconClass: string }> = [
  { value: 'instagram', label: 'Instagram', iconClass: 'fa-brands fa-instagram' },
  { value: 'facebook', label: 'Facebook', iconClass: 'fa-brands fa-facebook-f' },
  { value: 'x', label: 'X (Twitter)', iconClass: 'fa-brands fa-x-twitter' },
  { value: 'tiktok', label: 'TikTok', iconClass: 'fa-brands fa-tiktok' },
  { value: 'youtube', label: 'YouTube', iconClass: 'fa-brands fa-youtube' },
  { value: 'linkedin', label: 'LinkedIn', iconClass: 'fa-brands fa-linkedin-in' },
  { value: 'threads', label: 'Threads', iconClass: 'fa-brands fa-threads' },
  { value: 'pinterest', label: 'Pinterest', iconClass: 'fa-brands fa-pinterest-p' },
  { value: 'telegram', label: 'Telegram', iconClass: 'fa-brands fa-telegram' },
  { value: 'whatsapp', label: 'WhatsApp', iconClass: 'fa-brands fa-whatsapp' },
  { value: 'snapchat', label: 'Snapchat', iconClass: 'fa-brands fa-snapchat' },
  { value: 'discord', label: 'Discord', iconClass: 'fa-brands fa-discord' },
  { value: 'reddit', label: 'Reddit', iconClass: 'fa-brands fa-reddit-alien' },
  { value: 'github', label: 'GitHub', iconClass: 'fa-brands fa-github' },
  { value: 'medium', label: 'Medium', iconClass: 'fa-brands fa-medium' },
  { value: 'vimeo', label: 'Vimeo', iconClass: 'fa-brands fa-vimeo-v' }
]

const defaultSettings: GeneralSettingsContent = {
  siteIconUrl: '/images/icon.webp',
  socialLinks: [
    {
      id: 'instagram',
      platform: 'instagram',
      label: 'Instagram',
      url: 'https://www.instagram.com/',
      enabled: true,
      order: 1
    },
    {
      id: 'linkedin',
      platform: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/',
      enabled: true,
      order: 2
    }
  ],
  formDelivery: {
    requestFormActionUrl: 'https://meri-boarding.de/boarding-booking.php',
    contactNotificationEmails: []
  },
  smtp: {
    host: '',
    port: 465,
    user: '',
    pass: '',
    from: ''
  }
}

const previewFallbackIcon = '/images/branding/meri-logo-mark.svg'

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

function applyBrowserTabIcon(url: string) {
  if (typeof document === 'undefined' || !url) return

  const upsertLink = (rel: string) => {
    let link = document.querySelector(`link[rel='${rel}']`) as HTMLLinkElement | null

    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }

    link.href = url
  }

  upsertLink('icon')
  upsertLink('shortcut icon')
  upsertLink('apple-touch-icon')
}

function normalizeSocialLinks(input: unknown): SocialLink[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item, index) => {
      const platform = String((item as { platform?: string })?.platform || '').trim().toLowerCase() as SocialPlatform
      const fallbackPlatform = platformOptions.some(option => option.value === platform) ? platform : 'instagram'
      const fallbackLabel = platformOptions.find(option => option.value === fallbackPlatform)?.label || 'Social'

      return {
        id: String((item as { id?: string })?.id || `${fallbackPlatform}-${index + 1}`),
        platform: fallbackPlatform,
        label: String((item as { label?: string })?.label || fallbackLabel).trim(),
        url: String((item as { url?: string })?.url || '').trim(),
        enabled: (item as { enabled?: boolean })?.enabled !== false,
        order: Number((item as { order?: number })?.order) || index + 1
      }
    })
    .filter(item => Boolean(item.label) && Boolean(item.url))
    .slice(0, 40)
    .map((item, index) => ({ ...item, order: index + 1 }))
}

function normalizeFormDelivery(input: unknown): FormDeliverySettings {
  const value = (input || {}) as { requestFormActionUrl?: unknown; contactNotificationEmails?: unknown }
  const emails = Array.isArray(value?.contactNotificationEmails)
    ? value.contactNotificationEmails
        .map(item => String(item || '').trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 30)
    : []

  return {
    requestFormActionUrl: String(value?.requestFormActionUrl || defaultSettings.formDelivery.requestFormActionUrl).trim(),
    contactNotificationEmails: emails
  }
}

function parseContactEmailList(input: string) {
  return Array.from(
    new Set(
      String(input || '')
        .split(/[\n,;]+/g)
        .map(item => item.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 30)
}

function normalizeSmtpSettings(input: unknown): SmtpSettings {
  const value = (input || {}) as { host?: unknown; port?: unknown; user?: unknown; pass?: unknown; from?: unknown }
  const portRaw = Number(value?.port ?? defaultSettings.smtp.port)
  const port = Number.isFinite(portRaw) ? Math.min(65535, Math.max(1, Math.round(portRaw))) : defaultSettings.smtp.port

  return {
    host: String(value?.host || '').trim(),
    port,
    user: String(value?.user || '').trim(),
    pass: String(value?.pass || '').trim(),
    from: String(value?.from || '').trim()
  }
}

export default function GeneralSettingsPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()

  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl

  const [tab, setTab] = useState<'icon' | 'socials' | 'forms'>('icon')
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingSocials, setSavingSocials] = useState(false)
  const [savingForms, setSavingForms] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [settings, setSettings] = useState<GeneralSettingsContent>(defaultSettings)
  const [contactEmailText, setContactEmailText] = useState('')

  const loadSettings = useCallback(async () => {
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

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/settings/general`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setLoading(false)
        setError(data?.error || 'General settings could not be loaded.')
        
return
      }

      setSettings({
        siteIconUrl: String(data?.content?.siteIconUrl || defaultSettings.siteIconUrl).trim(),
        socialLinks: normalizeSocialLinks(data?.content?.socialLinks),
        formDelivery: normalizeFormDelivery(data?.content?.formDelivery),
        smtp: normalizeSmtpSettings(data?.content?.smtp)
      })
      setContactEmailText(
        normalizeFormDelivery(data?.content?.formDelivery).contactNotificationEmails.join('\n')
      )
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const saveGeneralSettings = async (token: string, payload: GeneralSettingsContent) => {
    const response = await fetch(`${apiBaseUrl}/api/v1/admin/settings/general`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: payload })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(String(data?.error || 'General settings could not be saved.'))
    }

    return {
      siteIconUrl: String(data?.content?.siteIconUrl || payload.siteIconUrl).trim(),
      socialLinks: normalizeSocialLinks(data?.content?.socialLinks),
      formDelivery: normalizeFormDelivery(data?.content?.formDelivery),
      smtp: normalizeSmtpSettings(data?.content?.smtp)
    }
  }

  const handleIconUpload = async (file: File) => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    const extension = String(file.name.split('.').pop() || '').trim().toLowerCase()

    if (!['ico', 'png', 'svg'].includes(extension)) {
      setFieldError('Only ICO, PNG or SVG files are allowed.')
      
return
    }

    if (file.size > 8 * 1024 * 1024) {
      setFieldError('Image size cannot exceed 8MB.')
      
return
    }

    setUploadingIcon(true)
    setFieldError('')
    setError('')
    setSuccess('')

    try {
      const dataUrl = await toDataUrl(file)

      const uploadResponse = await fetch(`${apiBaseUrl}/api/v1/admin/content/page-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          dataUrl,
          context: 'general-site-icon'
        })
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        setFieldError(uploadData?.error || 'Icon upload failed.')
        
return
      }

      const uploadedIconUrl = String(uploadData?.imageUrl || '').trim()

      if (!uploadedIconUrl) {
        setFieldError('Icon upload failed.')
        
return
      }

      const persisted = await saveGeneralSettings(token, {
        siteIconUrl: uploadedIconUrl,
        socialLinks: settings.socialLinks,
        formDelivery: settings.formDelivery,
        smtp: settings.smtp
      })

      setSettings(persisted)
      applyBrowserTabIcon(persisted.siteIconUrl)
      setSuccess('Site icon updated.')
    } catch (uploadError) {
      setFieldError(String((uploadError as Error)?.message || 'Icon upload failed.'))
    } finally {
      setUploadingIcon(false)
    }
  }

  const addSocialLink = () => {
    const nextIndex = settings.socialLinks.length + 1

    setSettings(prev => ({
      ...prev,
      socialLinks: [
        ...prev.socialLinks,
        {
          id: `social-${Date.now()}-${nextIndex}`,
          platform: 'instagram',
          label: `Instagram ${nextIndex}`,
          url: '',
          enabled: true,
          order: nextIndex
        }
      ]
    }))
  }

  const removeSocialLink = (id: string) => {
    setSettings(prev => ({
      ...prev,
      socialLinks: prev.socialLinks
        .filter(item => item.id !== id)
        .map((item, index) => ({ ...item, order: index + 1 }))
    }))
  }

  const updateSocialLink = (id: string, patch: Partial<SocialLink>) => {
    setSettings(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(item => (item.id === id ? { ...item, ...patch } : item))
    }))
  }

  const moveSocialLink = (id: string, direction: -1 | 1) => {
    setSettings(prev => {
      const index = prev.socialLinks.findIndex(item => item.id === id)
      const targetIndex = index + direction

      if (index < 0 || targetIndex < 0 || targetIndex >= prev.socialLinks.length) return prev

      const next = [...prev.socialLinks]
      const [moved] = next.splice(index, 1)

      next.splice(targetIndex, 0, moved)
      
return {
        ...prev,
        socialLinks: next.map((item, idx) => ({ ...item, order: idx + 1 }))
      }
    })
  }

  const saveSocialLinks = async () => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    for (const [index, item] of settings.socialLinks.entries()) {
      if (!item.label.trim()) {
        setFieldError(`Social link ${index + 1}: label is required.`)
        
return
      }

      if (!/^https?:\/\//i.test(item.url.trim())) {
        setFieldError(`Social link ${index + 1}: URL must start with http(s)://`)
        
return
      }
    }

    setSavingSocials(true)
    setError('')
    setSuccess('')
    setFieldError('')

    try {
      const persisted = await saveGeneralSettings(token, {
        siteIconUrl: settings.siteIconUrl,
        socialLinks: settings.socialLinks,
        formDelivery: settings.formDelivery,
        smtp: settings.smtp
      })

      setSettings(persisted)
      setSuccess('Social media links saved.')
    } catch (saveError) {
      setError(String((saveError as Error)?.message || 'General settings could not be saved.'))
    } finally {
      setSavingSocials(false)
    }
  }

  const saveFormSettings = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const requestActionUrl = String(settings.formDelivery.requestFormActionUrl || '').trim()
    if (!/^https?:\/\//i.test(requestActionUrl)) {
      setFieldError('Request form action URL must start with http(s)://')
      return
    }

    const emails = parseContactEmailList(contactEmailText)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const [index, email] of emails.entries()) {
      if (!emailRegex.test(email)) {
        setFieldError(`Contact notification email ${index + 1} is invalid.`)
        return
      }
    }
    const smtpHost = String(settings.smtp.host || '').trim()
    const smtpFrom = String(settings.smtp.from || '').trim()
    const smtpPort = Number(settings.smtp.port || 0)
    const smtpUser = String(settings.smtp.user || '').trim()
    const smtpPass = String(settings.smtp.pass || '').trim()
    if (!smtpHost) {
      setFieldError('SMTP host is required.')
      return
    }
    if (!Number.isFinite(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      setFieldError('SMTP port must be between 1 and 65535.')
      return
    }
    const smtpFromEnvelope = smtpFrom.includes('<') ? String((smtpFrom.match(/<([^>]+)>/) || [])[1] || '').trim() : smtpFrom
    if (!emailRegex.test(smtpFromEnvelope.toLowerCase())) {
      setFieldError('SMTP from email is invalid.')
      return
    }
    if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
      setFieldError('SMTP user and password must be set together.')
      return
    }

    setSavingForms(true)
    setError('')
    setSuccess('')
    setFieldError('')

    try {
      const persisted = await saveGeneralSettings(token, {
        siteIconUrl: settings.siteIconUrl,
        socialLinks: settings.socialLinks,
        formDelivery: {
          requestFormActionUrl: requestActionUrl,
          contactNotificationEmails: emails
        },
        smtp: {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          from: smtpFrom
        }
      })
      setSettings(persisted)
      setContactEmailText(persisted.formDelivery.contactNotificationEmails.join('\n'))
      setSuccess('Form delivery settings saved.')
    } catch (saveError) {
      setError(String((saveError as Error)?.message || 'General settings could not be saved.'))
    } finally {
      setSavingForms(false)
    }
  }

  if (loading) return <Typography>Loading...</Typography>
  if (!allowed) return <Alert severity='error'>Only super admin or moderator can access this panel.</Alert>

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>General Settings</Typography>
        <Typography color='text.secondary'>Manage site icon and social media links from one place.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
        {fieldError ? <Alert severity='error'>{fieldError}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Tabs value={tab} onChange={(_, value) => setTab(value)}>
              <Tab value='icon' label='Site Icon' />
              <Tab value='socials' label='Social Media' />
              <Tab value='forms' label='Form Settings' />
            </Tabs>

            {tab === 'icon' ? (
              <Box className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-center gap-3'>
                  <Button variant='outlined' component='label' disabled={uploadingIcon}>
                    {uploadingIcon ? 'Uploading...' : 'Upload And Apply Icon'}
                    <input
                      hidden
                      type='file'
                      accept='.ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml'
                      onChange={event => {
                        const file = event.target.files?.[0]

                        event.currentTarget.value = ''
                        if (!file) return
                        void handleIconUpload(file)
                      }}
                    />
                  </Button>
                </div>
                <Typography color='text.secondary'>Allowed formats: ICO, PNG, SVG</Typography>

                <div>
                  <Typography variant='subtitle2' className='mb-2'>
                    Preview
                  </Typography>
                  <div className='inline-flex items-center gap-3 rounded border border-gray-200 px-3 py-2'>
                    <img
                      src={settings.siteIconUrl || defaultSettings.siteIconUrl}
                      alt='Site icon preview'
                      style={{ width: 40, height: 40, objectFit: 'contain' }}
                      onLoad={event => {
                        delete event.currentTarget.dataset.fallbackApplied
                      }}
                      onError={event => {
                        const target = event.currentTarget

                        if (target.dataset.fallbackApplied === '1') return
                        target.dataset.fallbackApplied = '1'
                        target.src = previewFallbackIcon
                      }}
                    />
                    <Typography color='text.secondary'>Browser tab icon preview</Typography>
                  </div>
                </div>
              </Box>
            ) : tab === 'socials' ? (
              <Box className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-center gap-3'>
                  <Button variant='outlined' onClick={addSocialLink} disabled={settings.socialLinks.length >= 40}>
                    Add Social Link
                  </Button>
                  <Button variant='contained' onClick={saveSocialLinks} disabled={savingSocials}>
                    {savingSocials ? 'Saving...' : 'Save Social Media'}
                  </Button>
                  <Typography color='text.secondary'>You can add up to 40 links.</Typography>
                </div>

                {settings.socialLinks.length < 1 ? (
                  <Alert severity='info'>No social links yet. Click &quot;Add Social Link&quot;.</Alert>
                ) : null}

                {settings.socialLinks.map((item, index) => (
                  <div key={item.id} className='rounded border border-gray-200 p-4'>
                    <div className='mb-3 flex items-center justify-between'>
                      <Typography variant='subtitle1'>
                        #{index + 1} {item.label || 'Social Link'}
                      </Typography>
                      <div className='flex items-center gap-1'>
                        <IconButton onClick={() => moveSocialLink(item.id, -1)} size='small' aria-label='Move up'>
                          <i className='bx-up-arrow-alt' />
                        </IconButton>
                        <IconButton onClick={() => moveSocialLink(item.id, 1)} size='small' aria-label='Move down'>
                          <i className='bx-down-arrow-alt' />
                        </IconButton>
                        <IconButton color='error' onClick={() => removeSocialLink(item.id)} size='small' aria-label='Delete'>
                          <i className='bx-trash' />
                        </IconButton>
                      </div>
                    </div>

                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          select
                          fullWidth
                          label='Platform'
                          value={item.platform}
                          onChange={event => {
                            const value = event.target.value as SocialPlatform
                            const fallbackLabel = platformOptions.find(option => option.value === value)?.label || item.label

                            updateSocialLink(item.id, { platform: value, label: item.label || fallbackLabel })
                          }}
                        >
                          {platformOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              <span className='inline-flex items-center gap-2'>
                                <i className={option.iconClass} aria-hidden='true'></i>
                                {option.label}
                              </span>
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          fullWidth
                          label='Label'
                          value={item.label}
                          onChange={event => updateSocialLink(item.id, { label: event.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          fullWidth
                          label='URL'
                          placeholder='https://...'
                          value={item.url}
                          onChange={event => updateSocialLink(item.id, { url: event.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={item.enabled}
                              onChange={event => updateSocialLink(item.id, { enabled: event.target.checked })}
                            />
                          }
                          label='Enabled'
                        />
                      </Grid>
                    </Grid>
                  </div>
                ))}
              </Box>
            ) : (
              <Box className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-center gap-3'>
                  <Button variant='contained' onClick={saveFormSettings} disabled={savingForms}>
                    {savingForms ? 'Saving...' : 'Save Form Settings'}
                  </Button>
                </div>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='h6'>SMTP Settings</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      fullWidth
                      label='SMTP Host'
                      placeholder='smtp.example.com'
                      value={settings.smtp.host}
                      onChange={event =>
                        setSettings(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, host: event.target.value }
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      fullWidth
                      type='number'
                      label='SMTP Port'
                      value={String(settings.smtp.port || '')}
                      onChange={event =>
                        setSettings(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, port: Number(event.target.value || 0) }
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      fullWidth
                      label='SMTP User'
                      placeholder='user@example.com'
                      value={settings.smtp.user}
                      onChange={event =>
                        setSettings(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, user: event.target.value }
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      fullWidth
                      type='password'
                      label='SMTP Password'
                      value={settings.smtp.pass}
                      onChange={event =>
                        setSettings(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, pass: event.target.value }
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='SMTP From Email'
                      placeholder='no-reply@example.com'
                      value={settings.smtp.from}
                      onChange={event =>
                        setSettings(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, from: event.target.value }
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='Request Form Action URL'
                      placeholder='https://...'
                      value={settings.formDelivery.requestFormActionUrl}
                      onChange={event =>
                        setSettings(prev => ({
                          ...prev,
                          formDelivery: { ...prev.formDelivery, requestFormActionUrl: event.target.value }
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      multiline
                      minRows={6}
                      label='Contact Form Notification Emails'
                      placeholder={'one@email.com\nsecond@email.com'}
                      value={contactEmailText}
                      onChange={event => setContactEmailText(event.target.value)}
                    />
                    <Typography color='text.secondary' className='mt-2'>
                      Enter one email per line (or comma separated). These recipients are used for contact form notifications.
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
