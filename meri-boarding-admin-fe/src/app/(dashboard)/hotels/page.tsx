'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import CustomTextField from '@core/components/mui/TextField'

type Locale = 'en' | 'de' | 'tr'
type GalleryCategory = 'rooms' | 'dining' | 'facilities' | 'other'

type GalleryImage = {
  id: string
  url: string
  alt: string
  category: GalleryCategory
  sortOrder: number
}

type HotelLocaleContent = {
  locale: Locale
  name: string
  location: string
  shortDescription: string
  facts: Array<string | { text?: string; icon?: string }>
  heroTitle: string
  heroSubtitle: string
  description: string[]
  amenitiesTitle: string
  highlights: string[]
  gallery: GalleryImage[]
}

type Hotel = {
  id: string
  slug: string
  order: number
  active: boolean
  available: boolean
  coverImageUrl: string
  locales: Record<Locale, HotelLocaleContent>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']

const asLines = (arr: string[]) => arr.join('\n')
const asFactLines = (arr: Array<string | { text?: string }>) =>
  (arr || [])
    .map(item => (typeof item === 'string' ? item : String(item?.text || '')))
    .map(item => item.trim())
    .filter(Boolean)
    .join('\n')
const fromLines = (value: string) =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export default function HotelsPage() {
  const router = useRouter()
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deletingHotelId, setDeletingHotelId] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newName, setNewName] = useState('')
  const [newShortDescription, setNewShortDescription] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newAvailable, setNewAvailable] = useState(true)

  const [slug, setSlug] = useState('')
  const [order, setOrder] = useState(1)
  const [active, setActive] = useState(true)
  const [available, setAvailable] = useState(true)
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [amenitiesTitle, setAmenitiesTitle] = useState('')
  const [factsText, setFactsText] = useState('')
  const [descriptionText, setDescriptionText] = useState('')
  const [highlightsText, setHighlightsText] = useState('')
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>('rooms')
  const [galleryAlt, setGalleryAlt] = useState('')
  const generatedSlug = useMemo(() => toSlug(newName), [newName])

  const selectedHotel = useMemo(
    () => hotels.find(item => item.id === selectedHotelId) || null,
    [hotels, selectedHotelId]
  )

  const selectedLocaleContent = useMemo(() => {
    if (!selectedHotel) return null
    return selectedHotel.locales[locale]
  }, [selectedHotel, locale])

  const loadHotels = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setError('No active session. Please login again.')
      setLoading(false)
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
        setError(meData?.error || 'Profile check failed.')
        setLoading(false)
        return
      }

      const canAccess = ['super_admin', 'moderator'].includes(String(meData?.admin?.role || ''))
      setAllowed(canAccess)
      if (!canAccess) {
        setLoading(false)
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/hotels`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Hotels could not be loaded.')
        setLoading(false)
        return
      }

      const list = (data?.hotels || []) as Hotel[]
      setHotels(list)

      if (!selectedHotelId && list.length > 0) {
        setSelectedHotelId(list[0].id)
      }
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHotels()
  }, [])

  useEffect(() => {
    if (!selectedHotel || !selectedLocaleContent) return
    setSlug(selectedHotel.slug)
    setOrder(selectedHotel.order)
    setActive(selectedHotel.active)
    setAvailable(selectedHotel.available !== false)
    setCoverImageUrl(selectedHotel.coverImageUrl || '')
    setName(selectedLocaleContent.name || '')
    setLocation(selectedLocaleContent.location || '')
    setShortDescription(selectedLocaleContent.shortDescription || '')
    setHeroTitle(selectedLocaleContent.heroTitle || '')
    setHeroSubtitle(selectedLocaleContent.heroSubtitle || '')
    setAmenitiesTitle(selectedLocaleContent.amenitiesTitle || '')
    setFactsText(asFactLines(selectedLocaleContent.facts || []))
    setDescriptionText(asLines(selectedLocaleContent.description || []))
    setHighlightsText(asLines(selectedLocaleContent.highlights || []))
  }, [selectedHotel, selectedLocaleContent])

  const handleCreateHotel = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return
    if (!newName.trim() || !newShortDescription.trim()) {
      setError('Name and Short Description are required.')
      return
    }
    const slugInput = newSlug.trim() || generatedSlug
    if (!slugInput) {
      setError('A valid slug could not be generated from name.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/hotels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          slug: slugInput,
          available: newAvailable,
          locale,
          content: {
            name: newName,
            shortDescription: newShortDescription,
            location: newLocation
          }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Hotel could not be created.')
        return
      }
      setSuccess('Hotel created.')
      setNewSlug('')
      setNewName('')
      setNewShortDescription('')
      setNewLocation('')
      setNewAvailable(true)
      setIsCreateModalOpen(false)
      await loadHotels()
      if (data?.id) setSelectedHotelId(data.id)
    } catch {
      setError('API connection failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHotel = async (hotelId: string) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return
    if (!window.confirm('Bu oteli silmek istediğinize emin misiniz?')) return

    setDeletingHotelId(hotelId)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/hotels/${hotelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Hotel could not be deleted.')
        return
      }

      setSuccess('Hotel deleted.')
      if (selectedHotelId === hotelId) {
        const next = hotels.find(item => item.id !== hotelId)
        setSelectedHotelId(next?.id || '')
      }
      await loadHotels()
    } catch {
      setError('API connection failed.')
    } finally {
      setDeletingHotelId('')
    }
  }

  const handleSaveHotel = async () => {
    if (!selectedHotel) return
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/hotels/${selectedHotel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          slug,
          order: Number(order),
          active,
          available,
          coverImageUrl,
          locale,
          content: {
            name,
            location,
            shortDescription,
            heroTitle,
            heroSubtitle,
            amenitiesTitle,
            facts: fromLines(factsText),
            description: fromLines(descriptionText),
            highlights: fromLines(highlightsText)
          }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Hotel could not be saved.')
        return
      }
      setSuccess('Hotel saved.')
      await loadHotels()
    } catch {
      setError('API connection failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadGalleryImage = async (file: File | null) => {
    if (!selectedHotel || !file) return
    if (file.size > 8 * 1024 * 1024) {
      setError('Max file size is 8MB.')
      return
    }

    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('File read failed'))
        reader.readAsDataURL(file)
      })

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/hotels/${selectedHotel.id}/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          locale,
          fileName: file.name,
          dataUrl,
          category: galleryCategory,
          alt: galleryAlt
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Upload failed.')
        return
      }
      setSuccess('Gallery image uploaded.')
      await loadHotels()
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleUploadCoverImage = async (file: File | null) => {
    if (!selectedHotel || !file) return
    if (file.size > 8 * 1024 * 1024) {
      setError('Max file size is 8MB.')
      return
    }

    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    setUploadingCover(true)
    setError('')
    setSuccess('')
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('File read failed'))
        reader.readAsDataURL(file)
      })

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/hotels/${selectedHotel.id}/cover`, {
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
        setError(data?.error || 'Cover image upload failed.')
        return
      }
      setSuccess('Cover image uploaded.')
      setCoverImageUrl(String(data?.coverImageUrl || ''))
      await loadHotels()
    } catch {
      setError('Cover image upload failed.')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!selectedHotel) return
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/hotels/${selectedHotel.id}/gallery/${imageId}?locale=${locale}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Image could not be deleted.')
        return
      }
      setSuccess('Gallery image deleted.')
      await loadHotels()
    } catch {
      setError('API connection failed.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <Typography>Loading...</Typography>
  if (!allowed) return <Alert severity='error'>Only super admin or moderator can access hotels panel.</Alert>

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Hotels Management</Typography>
        <Typography color='text.secondary'>Create hotels, edit content by language, and manage gallery images.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <Typography variant='h6'>Hotels</Typography>
              <Button variant='contained' onClick={() => setIsCreateModalOpen(true)}>
                Add Hotel
              </Button>
            </div>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Menu Name</TableCell>
                    <TableCell>Name (EN)</TableCell>
                    <TableCell>Location (EN)</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell>Available</TableCell>
                    <TableCell align='right'>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hotels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0 }}>
                        <div
                          style={{
                            minHeight: 280,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8
                          }}
                        >
                          <i className='bx-building-house' style={{ fontSize: 84, color: '#9ca3af' }} />
                          <Typography variant='h6' sx={{ color: 'text.secondary', textAlign: 'center', px: 2 }}>
                            No hotels found. Add your first hotel.
                          </Typography>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    hotels.map(item => (
                      <TableRow key={item.id} selected={selectedHotelId === item.id}>
                        <TableCell>{item.slug}</TableCell>
                        <TableCell>{item.locales?.en?.name || '-'}</TableCell>
                        <TableCell>{item.locales?.en?.location || '-'}</TableCell>
                        <TableCell>{item.order}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            color={item.active ? 'success' : 'default'}
                            label={item.active ? 'Active' : 'Passive'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            color={item.available !== false ? 'primary' : 'warning'}
                            label={item.available !== false ? 'Available' : 'Full'}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <div className='flex justify-end gap-2'>
                            <Button size='small' variant='outlined' onClick={() => router.push(`/hotels/${item.id}`)}>
                              Edit
                            </Button>
                            <Button
                              size='small'
                              color='error'
                              variant='outlined'
                              onClick={() => void handleDeleteHotel(item.id)}
                              disabled={deletingHotelId === item.id}
                            >
                              {deletingHotelId === item.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} fullWidth maxWidth='md'>
        <DialogTitle>Add New Hotel</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <CustomTextField
                label='Menu Name'
                value={newSlug}
                onChange={e => setNewSlug(e.target.value)}
                placeholder={generatedSlug || 'menu-name'}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <CustomTextField label='Name' value={newName} onChange={e => setNewName(e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <CustomTextField label='Location' value={newLocation} onChange={e => setNewLocation(e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <CustomTextField
                label='Short Description'
                value={newShortDescription}
                onChange={e => setNewShortDescription(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <CustomTextField select label='Locale' value={locale} onChange={e => setLocale(e.target.value as Locale)} fullWidth>
                {localeOptions.map(item => (
                  <MenuItem key={item} value={item}>
                    {item.toUpperCase()}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={newAvailable} onChange={e => setNewAvailable(e.target.checked)} />}
                label='Available (unchecked means full)'
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant='contained' onClick={() => void handleCreateHotel()} disabled={saving}>
            {saving ? 'Adding...' : 'Add Hotel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
