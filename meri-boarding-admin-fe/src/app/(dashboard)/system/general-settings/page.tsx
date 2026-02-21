'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type GeneralSettingsContent = {
  siteIconUrl: string
}

const defaultSettings: GeneralSettingsContent = {
  siteIconUrl: '/images/icon.webp'
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export default function GeneralSettingsPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [settings, setSettings] = useState<GeneralSettingsContent>(defaultSettings)

  const loadSettings = async () => {
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
        siteIconUrl: String(data?.content?.siteIconUrl || defaultSettings.siteIconUrl).trim()
      })
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const validate = (value: GeneralSettingsContent) => {
    const icon = String(value.siteIconUrl || '').trim()
    if (!icon) return 'Site icon URL is required.'
    const isRelative = icon.startsWith('/')
    const isAbsolute = /^https?:\/\//i.test(icon)
    if (!isRelative && !isAbsolute) return 'Site icon URL must start with "/" or "http(s)://".'
    if (/\s/.test(icon)) return 'Site icon URL cannot contain spaces.'
    return ''
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const currentFieldError = validate(settings)
    setFieldError(currentFieldError)
    if (currentFieldError) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/settings/general`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: settings })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'General settings could not be saved.')
        return
      }

      setSettings({
        siteIconUrl: String(data?.content?.siteIconUrl || settings.siteIconUrl).trim()
      })
      setSuccess('General settings saved.')
    } catch {
      setError('API connection failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (file: File) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(file.type)) {
      setFieldError('Only PNG, JPG, WEBP or ICO files are allowed.')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setFieldError('Image size cannot exceed 8MB.')
      return
    }

    setUploading(true)
    setFieldError('')
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
          context: 'general-site-icon'
        })
      })

      const data = await response.json()
      if (!response.ok) {
        setFieldError(data?.error || 'Image upload failed.')
        return
      }

      const imageUrl = String(data?.imageUrl || '').trim()
      if (!imageUrl) {
        setFieldError('Image upload failed.')
        return
      }

      setSettings(prev => ({ ...prev, siteIconUrl: imageUrl }))
      setSuccess('Image uploaded. Save to apply.')
    } catch {
      setFieldError('Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <Typography>Loading...</Typography>
  if (!allowed) return <Alert severity='error'>Only super admin or moderator can access this panel.</Alert>

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>General Settings</Typography>
        <Typography color='text.secondary'>Manage the global site icon (favicon) used on desktop and mobile.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <CustomTextField
              fullWidth
              label='Site Icon URL'
              value={settings.siteIconUrl}
              onChange={event => {
                setSettings(prev => ({ ...prev, siteIconUrl: event.target.value }))
                if (fieldError) setFieldError('')
              }}
              error={Boolean(fieldError)}
              helperText={fieldError || 'Example: /images/icon.webp or https://cdn.example.com/favicon.png'}
            />

            <div className='flex flex-wrap items-center gap-3'>
              <Button variant='outlined' component='label' disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Icon'}
                <input
                  hidden
                  type='file'
                  accept='image/png,image/jpeg,image/jpg,image/webp,image/x-icon,image/vnd.microsoft.icon'
                  onChange={event => {
                    const file = event.target.files?.[0]
                    event.currentTarget.value = ''
                    if (!file) return
                    void handleUpload(file)
                  }}
                />
              </Button>
              <Button variant='contained' onClick={handleSave} disabled={saving || uploading}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>

            <div>
              <Typography variant='subtitle2' className='mb-2'>
                Preview
              </Typography>
              <div className='inline-flex items-center gap-3 rounded border border-gray-200 px-3 py-2'>
                <img
                  src={settings.siteIconUrl || defaultSettings.siteIconUrl}
                  alt='Site icon preview'
                  style={{ width: 40, height: 40, objectFit: 'contain' }}
                  onError={event => {
                    event.currentTarget.src = defaultSettings.siteIconUrl
                  }}
                />
                <Typography color='text.secondary'>Browser tab icon preview</Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
