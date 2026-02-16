'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useRef } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import CustomTextField from '@core/components/mui/TextField'

type AdminProfile = {
  id?: string
  name: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
  role: string
  active?: boolean
}

export default function MyProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [previewAvatar, setPreviewAvatar] = useState('/images/avatars/user-silhouette.svg')
  const [fileInput, setFileInput] = useState<File | null>(null)
  const [cropScale, setCropScale] = useState(1)
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef({ x: 0, y: 0 })

  const cropBox = { width: 320, height: 180 }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  const avatarSrc = useMemo(() => previewAvatar || '/images/avatars/user-silhouette.svg', [previewAvatar])
  const normalizeAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return '/images/avatars/user-silhouette.svg'
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl
    if (avatarUrl.startsWith('/images/avatars/')) return avatarUrl
    if (avatarUrl.startsWith('/')) return `${apiBaseUrl}${avatarUrl}`
    return avatarUrl
  }

  useEffect(() => {
    const loadProfile = async () => {
      const token = window.localStorage.getItem('admin_token')
      const fallback = window.localStorage.getItem('admin_profile')

      if (!token) {
        setError('No active session found. Please login again.')
        return
      }

      if (fallback) {
        try {
          const parsed = JSON.parse(fallback) as AdminProfile
          setProfile(parsed)
          setFirstName(parsed.firstName || parsed.name?.split(' ')[0] || '')
          setLastName(parsed.lastName || parsed.name?.split(' ').slice(1).join(' ') || '')
          setPhone(parsed.phone || '')
          setPreviewAvatar(normalizeAvatarUrl(parsed.avatarUrl))
        } catch {
          // ignore malformed local profile
        }
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()

        if (!response.ok) {
          setError(data?.error || 'Profile could not be loaded.')
          return
        }

        const nextProfile: AdminProfile = data.admin
        setFirstName(nextProfile.firstName || nextProfile.name?.split(' ')[0] || '')
        setLastName(nextProfile.lastName || nextProfile.name?.split(' ').slice(1).join(' ') || '')
        setPhone(nextProfile.phone || '')
        const normalized = { ...nextProfile, avatarUrl: normalizeAvatarUrl(nextProfile.avatarUrl) }
        setPreviewAvatar(normalized.avatarUrl || '/images/avatars/user-silhouette.svg')
        setProfile(normalized)
        window.localStorage.setItem('admin_profile', JSON.stringify(normalized))
      } catch {
        setError('API connection failed while loading profile.')
      }
    }

    void loadProfile()
  }, [apiBaseUrl])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPG or WEBP files are allowed.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size cannot exceed 5MB.')
      return
    }

    setError('')
    setFileInput(file)
    setPreviewAvatar(URL.createObjectURL(file))
    setCropScale(1)
    setCropPosition({ x: 0, y: 0 })
  }

  const handleAvatarReset = () => {
    setFileInput(null)
    setPreviewAvatar(normalizeAvatarUrl(profile?.avatarUrl))
    setCropScale(1)
    setCropPosition({ x: 0, y: 0 })
  }

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File could not be read'))
      reader.readAsDataURL(file)
    })

  const getCroppedDataUrl = async (imageUrl: string, scale: number, position: { x: number; y: number }) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = imageUrl
    })

    const { width: cropW, height: cropH } = cropBox
    const outputW = 800
    const outputH = Math.round((outputW / cropW) * cropH)
    const canvas = document.createElement('canvas')
    canvas.width = outputW
    canvas.height = outputH

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas not available')
    }

    const baseScale = Math.max(cropW / image.naturalWidth, cropH / image.naturalHeight)
    const finalScale = baseScale * scale
    const drawW = image.naturalWidth * finalScale
    const drawH = image.naturalHeight * finalScale
    const left = (cropW - drawW) / 2 + position.x
    const top = (cropH - drawH) / 2 + position.y
    const factor = outputW / cropW

    ctx.clearRect(0, 0, outputW, outputH)
    ctx.drawImage(image, left * factor, top * factor, drawW * factor, drawH * factor)

    return canvas.toDataURL('image/jpeg', 0.92)
  }

  useEffect(() => {
    if (!isDraggingCrop) {
      return
    }

    const onMove = (event: MouseEvent) => {
      const deltaX = event.clientX - dragStartRef.current.x
      const deltaY = event.clientY - dragStartRef.current.y
      setCropPosition({
        x: dragOriginRef.current.x + deltaX,
        y: dragOriginRef.current.y + deltaY
      })
    }

    const onUp = () => {
      setIsDraggingCrop(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingCrop])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const token = window.localStorage.getItem('admin_token')

    if (!token) {
      setSaving(false)
      setError('No active session found. Please login again.')
      return
    }

    try {
      const profileResponse = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ firstName, lastName, phone })
      })

      const profileData = await profileResponse.json()
      if (!profileResponse.ok) {
        setError(profileData?.error || 'Profile update failed.')
        setSaving(false)
        return
      }

      let avatarUrl = profileData?.admin?.avatarUrl || profile?.avatarUrl || '/images/avatars/user-silhouette.svg'

      if (fileInput) {
        const dataUrl = await getCroppedDataUrl(previewAvatar, cropScale, cropPosition).catch(() => toDataUrl(fileInput))
        const avatarResponse = await fetch(`${apiBaseUrl}/api/v1/auth/me/avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: fileInput.name, dataUrl })
        })
        const avatarData = await avatarResponse.json()

        if (!avatarResponse.ok) {
          setError(avatarData?.error || 'Avatar upload failed.')
          setSaving(false)
          return
        }

        avatarUrl = `${apiBaseUrl}${avatarData.avatarUrl}`
      }

      const nextProfile: AdminProfile = {
        ...profileData.admin,
        avatarUrl
      }

      setProfile(nextProfile)
      setPreviewAvatar(nextProfile.avatarUrl || '/images/avatars/user-silhouette.svg')
      setFileInput(null)
      setSuccess('Profile updated successfully.')
      window.localStorage.setItem('admin_profile', JSON.stringify(nextProfile))
    } catch {
      setError('Save request failed. Please check API connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex max-sm:flex-col sm:items-center sm:justify-between gap-3'>
          <div>
            <Typography variant='h4'>My Profile</Typography>
            <Typography color='text.secondary'>Manage personal details and profile photo.</Typography>
          </div>
          <div className='flex items-center gap-2'>
            <Chip
              label={profile?.role || '-'}
              color='primary'
              size='small'
              icon={
                <i
                  className={
                    profile?.role === 'super_admin'
                      ? 'bx-crown'
                      : profile?.role === 'moderator'
                        ? 'bx-shield-quarter'
                        : 'bx-user'
                  }
                />
              }
            />
            <Chip
              label={profile?.active === false ? 'Inactive' : 'Active'}
              color={profile?.active === false ? 'warning' : 'success'}
              size='small'
            />
          </div>
        </div>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            {error ? <Alert severity='error'>{error}</Alert> : null}
            {success ? <Alert severity='success'>{success}</Alert> : null}

            <div className='flex max-sm:flex-col items-center gap-6 mt-4'>
              <img height={100} width={100} className='rounded' src={avatarSrc} alt='Profile Avatar' />
              <div className='flex grow flex-col gap-4'>
                <div className='flex flex-col sm:flex-row gap-4'>
                  <Button component='label' variant='contained'>
                    Upload New Photo
                    <input hidden type='file' accept='image/png, image/jpeg, image/webp' onChange={handleFileChange} />
                  </Button>
                  <Button variant='tonal' color='secondary' onClick={handleAvatarReset}>
                    Reset
                  </Button>
                </div>
                <Typography>Allowed PNG, JPG or WEBP. Max size 5MB. Stored physically on server.</Typography>
              </div>
            </div>

            {fileInput ? (
              <div className='mt-4'>
                <Typography variant='subtitle1' className='mb-2'>
                  Crop Photo
                </Typography>
                <Typography variant='body2' color='text.secondary' className='mb-3'>
                  Drag image to position it in the rectangle. Use slider for zoom.
                </Typography>
                <div
                  style={{
                    width: `${cropBox.width}px`,
                    height: `${cropBox.height}px`,
                    border: '2px solid rgba(0,0,0,0.35)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#f4f5f7',
                    cursor: isDraggingCrop ? 'grabbing' : 'grab',
                    userSelect: 'none'
                  }}
                  onMouseDown={event => {
                    dragStartRef.current = { x: event.clientX, y: event.clientY }
                    dragOriginRef.current = { ...cropPosition }
                    setIsDraggingCrop(true)
                  }}
                >
                  <img
                    src={previewAvatar}
                    alt='Crop preview'
                    draggable={false}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${cropPosition.x}px), calc(-50% + ${cropPosition.y}px)) scale(${cropScale})`,
                      transformOrigin: 'center center',
                      width: '100%',
                      height: 'auto',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
                <div className='mt-4 max-w-[320px]'>
                  <Typography variant='body2' color='text.secondary' className='mb-1'>
                    Scale
                  </Typography>
                  <Slider
                    value={cropScale}
                    min={1}
                    max={3}
                    step={0.01}
                    onChange={(_, value) => setCropScale(Array.isArray(value) ? value[0] : value)}
                  />
                </div>
              </div>
            ) : null}

            <Divider className='my-4' />

            <form onSubmit={handleSave}>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    label='First Name'
                    value={firstName}
                    placeholder='John'
                    onChange={e => setFirstName(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    label='Last Name'
                    value={lastName}
                    placeholder='Doe'
                    onChange={e => setLastName(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField fullWidth label='Email' value={profile?.email || ''} disabled />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    label='Phone'
                    value={phone}
                    placeholder='+49 ...'
                    onChange={e => setPhone(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Button variant='contained' type='submit' disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
