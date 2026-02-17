'use client'

import { use, useEffect, useMemo, useRef, useState } from 'react'
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
import Slider from '@mui/material/Slider'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import CustomTextField from '@core/components/mui/TextField'

type Locale = 'en' | 'de' | 'tr'
type GalleryCategory = 'rooms' | 'dining' | 'facilities' | 'other'

type GalleryImage = {
  id: string
  url: string
  thumbnailUrl?: string
  alt: string
  category: GalleryCategory
  sortOrder: number
}

type HotelFact = {
  text: string
  icon: string
}

type GalleryMeta = {
  sections: Array<{
    title: string
    features: string[]
  }>
}

type HotelLocaleContent = {
  locale: Locale
  name: string
  location: string
  shortDescription: string
  facts: HotelFact[]
  heroTitle: string
  heroSubtitle: string
  description: string[]
  amenitiesTitle: string
  highlights: string[]
  gallery: GalleryImage[]
  galleryMeta: Record<string, GalleryMeta>
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
const defaultFactIcon = 'fa fa-check'
const factIconOptions = [
  { label: 'Check', value: 'fa fa-check' },
  { label: 'Plane', value: 'fa fa-plane' },
  { label: 'Train', value: 'fa fa-train' },
  { label: 'Taxi', value: 'fa fa-taxi' },
  { label: 'Bus', value: 'fa fa-bus' },
  { label: 'Ship', value: 'fa fa-ship' },
  { label: 'Anchor', value: 'fa fa-anchor' },
  { label: 'Map Marker', value: 'fa fa-map-marker' },
  { label: 'Compass', value: 'fa fa-compass' },
  { label: 'Globe', value: 'fa fa-globe' },
  { label: 'Suitcase', value: 'fa fa-suitcase' },
  { label: 'Building', value: 'fa fa-building' },
  { label: 'Bed', value: 'fa fa-bed' },
  { label: 'Home', value: 'fa fa-home' },
  { label: 'Coffee', value: 'fa fa-coffee' },
  { label: 'Cutlery', value: 'fa fa-cutlery' },
  { label: 'Wifi', value: 'fa fa-wifi' },
  { label: 'Car', value: 'fa fa-car' },
  { label: 'Bicycle', value: 'fa fa-bicycle' },
  { label: 'Calendar', value: 'fa fa-calendar' },
  { label: 'Shield', value: 'fa fa-shield' },
  { label: 'Hospital', value: 'fa fa-hospital-o' },
  { label: 'Heart', value: 'fa fa-heartbeat' },
  { label: 'Life Ring', value: 'fa fa-life-ring' }
]
const findFactIconOption = (value: string) =>
  factIconOptions.find(option => option.value === value) || {
    label: 'Custom',
    value
  }
const normalizeFacts = (facts: unknown[]): HotelFact[] =>
  (facts || [])
    .map(item => {
      if (typeof item === 'string') {
        return { text: item.trim(), icon: defaultFactIcon }
      }

      if (item && typeof item === 'object') {
        const maybeFact = item as { text?: unknown; icon?: unknown; value?: unknown }

        return {
          text: String(maybeFact.text ?? maybeFact.value ?? '').trim(),
          icon: String(maybeFact.icon ?? '').trim() || defaultFactIcon
        }
      }

      return { text: '', icon: defaultFactIcon }
    })
    .filter(item => Boolean(item.text))

const asLines = (arr: string[]) => arr.join('\n')
const rawLines = (value: string) => value.split('\n')
const fromLines = (value: string) =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
const normalizeGalleryMetaSections = (input: unknown) => {
  if (!Array.isArray(input)) return []
  return input
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const section = item as { title?: unknown; features?: unknown }
      return {
        title: String(section.title ?? '').trim(),
        features: Array.isArray(section.features) ? section.features.map(feature => String(feature || '')) : []
      }
    })
    .filter(Boolean) as Array<{ title: string; features: string[] }>
}
const normalizeGalleryMetaMap = (input: unknown): Record<string, GalleryMeta> => {
  if (!input || typeof input !== 'object') return {}

  return Object.entries(input as Record<string, unknown>).reduce((acc, [imageId, value]) => {
    if (!imageId) return acc
    const entry = value && typeof value === 'object' ? (value as { section?: unknown; features?: unknown; sections?: unknown }) : {}
    const sections = normalizeGalleryMetaSections(entry.sections)
    const legacyTitle = String(entry.section ?? '').trim()
    const legacyFeatures = Array.isArray(entry.features) ? entry.features.map(item => String(item || '')) : []
    acc[imageId] = {
      sections: sections.length > 0 ? sections : legacyTitle || legacyFeatures.length > 0 ? [{ title: legacyTitle, features: legacyFeatures }] : []
    }
    return acc
  }, {} as Record<string, GalleryMeta>)
}

type HotelDetailPageProps = {
  params: { hotelId: string } | Promise<{ hotelId: string }>
}

type HotelSettingsTab = 'general' | 'facts' | 'gallery'

export default function HotelDetailPage({ params }: HotelDetailPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const hotelId = resolvedParams.hotelId
  const router = useRouter()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [locale, setLocale] = useState<Locale>('en')
  const [activeTab, setActiveTab] = useState<HotelSettingsTab>('general')

  const [slug, setSlug] = useState('')
  const [order, setOrder] = useState(1)
  const [active, setActive] = useState(true)
  const [available, setAvailable] = useState(true)
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverCropOpen, setCoverCropOpen] = useState(false)
  const [coverCropSource, setCoverCropSource] = useState('')
  const [coverCropFileName, setCoverCropFileName] = useState('cover.jpg')
  const [coverCropScale, setCoverCropScale] = useState(1)
  const [coverCropPosition, setCoverCropPosition] = useState({ x: 0, y: 0 })
  const [isDraggingCoverCrop, setIsDraggingCoverCrop] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [amenitiesTitle, setAmenitiesTitle] = useState('')
  const [facts, setFacts] = useState<HotelFact[]>([])
  const [descriptionText, setDescriptionText] = useState('')
  const [highlightsText, setHighlightsText] = useState('')
  const [galleryMetaMap, setGalleryMetaMap] = useState<Record<string, GalleryMeta>>({})
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>('rooms')
  const [galleryAlt, setGalleryAlt] = useState('')
  const coverDragStartRef = useRef({ x: 0, y: 0 })
  const coverDragOriginRef = useRef({ x: 0, y: 0 })
  const coverCropBox = { width: 480, height: 270 }
  const coverPreviewSrc =
    coverImageUrl && coverImageUrl.startsWith('/api/') ? `${apiBaseUrl}${coverImageUrl}` : coverImageUrl

  const selectedHotel = useMemo(() => hotels.find(item => item.id === hotelId) || null, [hotels, hotelId])

  const selectedLocaleContent = useMemo(() => {
    if (!selectedHotel) return null
    return selectedHotel.locales[locale]
  }, [selectedHotel, locale])

  const sharedGallery = useMemo(() => {
    if (!selectedHotel) return []
    const source = selectedHotel.locales?.en?.gallery || selectedLocaleContent?.gallery || []
    return source.filter(image => Boolean(image?.url))
  }, [selectedHotel, selectedLocaleContent])

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
    setFacts(normalizeFacts(selectedLocaleContent.facts || []))
    setDescriptionText(asLines(selectedLocaleContent.description || []))
    setHighlightsText(asLines(selectedLocaleContent.highlights || []))
    setGalleryMetaMap(normalizeGalleryMetaMap(selectedLocaleContent.galleryMeta || {}))
  }, [selectedHotel, selectedLocaleContent])

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
            facts: facts.map(item => ({ text: item.text.trim(), icon: item.icon || defaultFactIcon })).filter(item => Boolean(item.text)),
            description: fromLines(descriptionText),
            highlights: fromLines(highlightsText),
            galleryMeta: galleryMetaMap
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

  const handleUploadCoverImage = async (fileName: string, dataUrl: string) => {
    if (!selectedHotel) return false
    const token = window.localStorage.getItem('admin_token')
    if (!token) return false

    setUploadingCover(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/hotels/${selectedHotel.id}/cover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName,
          dataUrl
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Cover image upload failed.')
        return false
      }
      setSuccess('Cover image uploaded.')
      setCoverImageUrl(String(data?.coverImageUrl || ''))
      await loadHotels()
      return true
    } catch {
      setError('Cover image upload failed.')
      return false
    } finally {
      setUploadingCover(false)
    }
  }

  const closeCoverCropModal = () => {
    if (coverCropSource.startsWith('blob:')) {
      URL.revokeObjectURL(coverCropSource)
    }
    setCoverCropOpen(false)
    setCoverCropSource('')
    setCoverCropScale(1)
    setCoverCropPosition({ x: 0, y: 0 })
    setIsDraggingCoverCrop(false)
  }

  const handleSelectCoverFile = (file: File | null) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPG or WEBP files are allowed.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Max file size is 8MB.')
      return
    }

    if (coverCropSource.startsWith('blob:')) {
      URL.revokeObjectURL(coverCropSource)
    }

    const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'cover'
    setCoverCropFileName(`${baseName}.jpg`)
    setCoverCropSource(URL.createObjectURL(file))
    setCoverCropScale(1)
    setCoverCropPosition({ x: 0, y: 0 })
    setError('')
    setCoverCropOpen(true)
  }

  const getCoverCroppedDataUrl = async (imageUrl: string, scale: number, position: { x: number; y: number }) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = imageUrl
    })

    const { width: cropW, height: cropH } = coverCropBox
    const outputW = 1600
    const outputH = 900
    const canvas = document.createElement('canvas')
    canvas.width = outputW
    canvas.height = outputH

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')

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

  const handleApplyCoverCrop = async () => {
    if (!coverCropSource) return

    try {
      const dataUrl = await getCoverCroppedDataUrl(coverCropSource, coverCropScale, coverCropPosition)
      const uploaded = await handleUploadCoverImage(coverCropFileName, dataUrl)
      if (uploaded) {
        closeCoverCropModal()
      }
    } catch {
      setError('Cover crop failed.')
    }
  }

  useEffect(() => {
    if (!isDraggingCoverCrop) return

    const onMove = (event: MouseEvent) => {
      const deltaX = event.clientX - coverDragStartRef.current.x
      const deltaY = event.clientY - coverDragStartRef.current.y

      setCoverCropPosition({
        x: coverDragOriginRef.current.x + deltaX,
        y: coverDragOriginRef.current.y + deltaY
      })
    }

    const onUp = () => setIsDraggingCoverCrop(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingCoverCrop])

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const toThumbnailDataUrl = async (file: File) => {
    const source = await toDataUrl(file)
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = source
    })

    const maxWidth = 640
    const ratio = image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1
    const width = Math.max(1, Math.round(image.naturalWidth * ratio))
    const height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    ctx.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.82)
  }

  const handleUploadGalleryImages = async (files: File[]) => {
    if (!selectedHotel || files.length === 0) return

    const invalidTypeFile = files.find(file => !['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type))
    if (invalidTypeFile) {
      setError(`Unsupported file format: ${invalidTypeFile.name}`)
      return
    }

    const tooLargeFile = files.find(file => file.size > 8 * 1024 * 1024)
    if (tooLargeFile) {
      setError(`File exceeds 8MB limit: ${tooLargeFile.name}`)
      return
    }

    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    setUploading(true)
    setError('')
    setSuccess('')

    let successCount = 0
    const failed: string[] = []

    try {
      for (const file of files) {
        try {
          const dataUrl = await toDataUrl(file)
          const thumbnailDataUrl = await toThumbnailDataUrl(file)

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
              thumbnailDataUrl,
              category: galleryCategory,
              alt: galleryAlt
            })
          })

          if (!response.ok) {
            failed.push(file.name)
            continue
          }

          successCount += 1
        } catch {
          failed.push(file.name)
        }
      }

      if (successCount > 0) {
        await loadHotels()
        setSuccess(
          `${successCount} image${successCount > 1 ? 's' : ''} uploaded${failed.length > 0 ? `, ${failed.length} failed` : ''}.`
        )
      }

      if (failed.length > 0) {
        setError(
          `Failed files: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? ` +${failed.length - 3} more` : ''}`
        )
      }
    } finally {
      setUploading(false)
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
        `${apiBaseUrl}/api/v1/admin/hotels/${selectedHotel.id}/gallery/${imageId}`,
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
  if (!selectedHotel) return <Alert severity='warning'>Hotel not found.</Alert>

  return (
    <>
      <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center justify-between'>
          <div>
            <Typography variant='h4'>Hotel Details</Typography>
            <Typography color='text.secondary'>Edit hotel content and gallery.</Typography>
          </div>
          <Button variant='outlined' onClick={() => router.push('/hotels')}>
            Back to Hotels
          </Button>
        </div>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Tabs
              value={activeTab}
              onChange={(_, value: HotelSettingsTab) => setActiveTab(value)}
              variant='scrollable'
              allowScrollButtonsMobile
            >
              <Tab value='general' label='General' />
              <Tab value='facts' label='Facts & Texts' />
              <Tab value='gallery' label='Gallery' />
            </Tabs>

            {activeTab === 'general' ? (
              <>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField label='Selected Hotel' value={selectedHotel.slug} fullWidth disabled />
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
                  <Grid size={{ xs: 12, md: 2 }}>
                    <CustomTextField label='Order' type='number' value={order} onChange={e => setOrder(Number(e.target.value || 1))} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <CustomTextField label='Menu Name' value={slug} onChange={e => setSlug(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <CustomTextField select label='Active' value={active ? 'yes' : 'no'} onChange={e => setActive(e.target.value === 'yes')} fullWidth>
                      <MenuItem value='yes'>Yes</MenuItem>
                      <MenuItem value='no'>No</MenuItem>
                    </CustomTextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={<Checkbox checked={available} onChange={e => setAvailable(e.target.checked)} />}
                      label='Available (unchecked means full)'
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField label='Name' value={name} onChange={e => setName(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField label='Location' value={location} onChange={e => setLocation(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <div
                      style={{
                        height: '100%',
                        border: '1px dashed rgba(0,0,0,0.25)',
                        borderRadius: 10,
                        padding: 16,
                        background: 'rgba(0,0,0,0.01)'
                      }}
                    >
                      <div className='flex items-start gap-3 mb-3'>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            background: 'rgba(115,103,240,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <i className='bx bx-image-add text-[20px]' />
                        </div>
                        <div>
                          <Typography variant='subtitle2'>Cover Image</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Upload, crop and position the cover image. Max size 8MB.
                          </Typography>
                        </div>
                      </div>

                      <Button component='label' variant='outlined' size='small' disabled={uploadingCover} fullWidth>
                        {uploadingCover ? 'Uploading...' : 'Select And Crop Cover'}
                        <input
                          hidden
                          type='file'
                          accept='image/png,image/jpeg,image/jpg,image/webp'
                          onChange={e => {
                            handleSelectCoverFile(e.target.files?.[0] || null)
                            e.currentTarget.value = ''
                          }}
                        />
                      </Button>
                    </div>
                  </Grid>
                  {coverImageUrl ? (
                    <Grid size={{ xs: 12, md: 4 }}>
                      <img
                        src={coverPreviewSrc}
                        alt='Cover preview'
                        style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                      />
                    </Grid>
                  ) : null}
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Short Description' value={shortDescription} onChange={e => setShortDescription(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Hero Title' value={heroTitle} onChange={e => setHeroTitle(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Hero Subtitle' value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Amenities Title' value={amenitiesTitle} onChange={e => setAmenitiesTitle(e.target.value)} fullWidth />
                  </Grid>
                </Grid>
              </>
            ) : null}

            {activeTab === 'facts' ? (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <div className='border rounded p-3 h-full'>
                    <div className='flex items-center justify-between mb-2'>
                      <Typography variant='subtitle2'>Facts With Icon</Typography>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setFacts(prev => [...prev, { text: '', icon: defaultFactIcon }])}
                      >
                        Add
                      </Button>
                    </div>
                    <div className='flex flex-col gap-2'>
                      {facts.map((fact, index) => (
                        <div key={`${fact.icon}-${index}`} className='border rounded p-2'>
                          <div className='flex items-center gap-2 mb-2'>
                            <i className={fact.icon} aria-hidden='true' />
                            <Typography variant='caption' color='text.secondary'>
                              Fact {index + 1}
                            </Typography>
                            <Button
                              size='small'
                              color='error'
                              variant='text'
                              onClick={() => setFacts(prev => prev.filter((_, idx) => idx !== index))}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className='grid grid-cols-12 gap-2'>
                            <CustomTextField
                              className='col-span-12 md:col-span-2'
                              select
                              label='Icon'
                              value={fact.icon}
                              SelectProps={{
                                MenuProps: {
                                  PaperProps: {
                                    sx: { width: 96 }
                                  }
                                },
                                renderValue: selected => {
                                  const option = findFactIconOption(String(selected || defaultFactIcon))

                                  return (
                                    <span className='flex items-center'>
                                      <i className={option.value} aria-hidden='true' />
                                    </span>
                                  )
                                }
                              }}
                              onChange={e =>
                                setFacts(prev =>
                                  prev.map((item, idx) =>
                                    idx === index ? { ...item, icon: e.target.value } : item
                                  )
                                )
                              }
                              fullWidth
                            >
                              {factIconOptions.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  <div className='flex items-center justify-center w-full' title={option.label} aria-label={option.label}>
                                    <i className={option.value} aria-hidden='true' />
                                  </div>
                                </MenuItem>
                              ))}
                            </CustomTextField>
                            <CustomTextField
                              className='col-span-12 md:col-span-10'
                              label='Text'
                              value={fact.text}
                              onChange={e =>
                                setFacts(prev =>
                                  prev.map((item, idx) =>
                                    idx === index ? { ...item, text: e.target.value } : item
                                  )
                                )
                              }
                              fullWidth
                            />
                          </div>
                        </div>
                      ))}
                      {facts.length === 0 ? (
                        <Typography variant='caption' color='text.secondary'>
                          No fact added yet.
                        </Typography>
                      ) : null}
                    </div>
                  </div>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <CustomTextField
                    multiline
                    minRows={8}
                    label='Description Paragraphs (one per line)'
                    value={descriptionText}
                    onChange={e => setDescriptionText(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <CustomTextField
                    multiline
                    minRows={8}
                    label='Highlights (one per line)'
                    value={highlightsText}
                    onChange={e => setHighlightsText(e.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>
            ) : null}

            {activeTab === 'gallery' ? (
              <>
                <Typography variant='h6'>Gallery</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField
                      select
                      label='Category'
                      value={galleryCategory}
                      onChange={e => setGalleryCategory(e.target.value as GalleryCategory)}
                      fullWidth
                    >
                      <MenuItem value='rooms'>Rooms</MenuItem>
                      <MenuItem value='dining'>Dining</MenuItem>
                      <MenuItem value='facilities'>Facilities</MenuItem>
                      <MenuItem value='other'>Other</MenuItem>
                    </CustomTextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }}>
                    <CustomTextField label='Alt text' value={galleryAlt} onChange={e => setGalleryAlt(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <input
                      type='file'
                      multiple
                      accept='image/png,image/jpeg,image/jpg,image/webp'
                      onChange={e => {
                        void handleUploadGalleryImages(Array.from(e.target.files || []))
                        e.currentTarget.value = ''
                      }}
                      disabled={uploading}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      Select one or multiple photos (max 8MB each).
                    </Typography>
                  </Grid>
                </Grid>

                <Grid container spacing={3}>
                  {sharedGallery.map(image => (
                    <Grid key={image.id} size={{ xs: 12, md: 3 }}>
                      <div className='border rounded p-2 flex flex-col gap-2 h-full'>
                        <img
                          src={image.url.startsWith('/api/') ? `${apiBaseUrl}${image.url}` : image.url}
                          alt={image.alt || 'Hotel gallery'}
                          style={{ width: '100%', borderRadius: 6 }}
                        />
                        <Typography variant='body2'>{image.alt || 'No alt'}</Typography>
                        <Chip size='small' label={image.category} />
                        <div className='flex items-center justify-between'>
                          <Typography variant='caption' color='text.secondary'>
                            Meta Sections
                          </Typography>
                          <Button
                            size='small'
                            variant='text'
                            onClick={() =>
                              setGalleryMetaMap(prev => ({
                                ...prev,
                                [image.id]: {
                                  sections: [...(prev[image.id]?.sections || []), { title: '', features: [] }]
                                }
                              }))
                            }
                          >
                            Add Section
                          </Button>
                        </div>
                        {(galleryMetaMap[image.id]?.sections || []).map((section, sectionIndex) => (
                          <div key={`${image.id}-${sectionIndex}`} className='border rounded p-2'>
                            <div className='flex items-center justify-between gap-2 mb-2'>
                              <Typography variant='caption' color='text.secondary'>
                                Section {sectionIndex + 1}
                              </Typography>
                              <Button
                                size='small'
                                color='error'
                                variant='text'
                                onClick={() =>
                                  setGalleryMetaMap(prev => ({
                                    ...prev,
                                    [image.id]: {
                                      sections: (prev[image.id]?.sections || []).filter((_, idx) => idx !== sectionIndex)
                                    }
                                  }))
                                }
                              >
                                Remove
                              </Button>
                            </div>
                            <CustomTextField
                              size='small'
                              label='Section Title'
                              value={section.title || ''}
                              onChange={event =>
                                setGalleryMetaMap(prev => ({
                                  ...prev,
                                  [image.id]: {
                                    sections: (prev[image.id]?.sections || []).map((item, idx) =>
                                      idx === sectionIndex ? { ...item, title: event.target.value } : item
                                    )
                                  }
                                }))
                              }
                              fullWidth
                            />
                            <div className='mt-2'>
                              <CustomTextField
                                size='small'
                                label='Features (one per line)'
                                multiline
                                minRows={3}
                                value={asLines(section.features || [])}
                                onChange={event =>
                                  setGalleryMetaMap(prev => ({
                                    ...prev,
                                    [image.id]: {
                                      sections: (prev[image.id]?.sections || []).map((item, idx) =>
                                        idx === sectionIndex ? { ...item, features: rawLines(event.target.value) } : item
                                      )
                                    }
                                  }))
                                }
                                fullWidth
                              />
                            </div>
                          </div>
                        ))}
                        <Button
                          size='small'
                          color='error'
                          variant='outlined'
                          onClick={() => void handleDeleteGalleryImage(image.id)}
                          disabled={uploading}
                        >
                          Delete
                        </Button>
                      </div>
                    </Grid>
                  ))}
                </Grid>
              </>
            ) : null}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <div className='flex flex-col gap-2'>
          <Chip size='small' color='primary' label={`Locale: ${locale.toUpperCase()}`} className='self-start' />
          <Button variant='contained' size='large' fullWidth onClick={() => void handleSaveHotel()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Hotel'}
          </Button>
        </div>
      </Grid>
      </Grid>
      <Dialog open={coverCropOpen} onClose={uploadingCover ? undefined : closeCoverCropModal} maxWidth='md' fullWidth>
        <DialogTitle>Crop Cover Image</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' className='mb-3'>
            Drag to position the image and use zoom for perfect framing.
          </Typography>
          <div
            style={{
              width: `${coverCropBox.width}px`,
              maxWidth: '100%',
              height: `${coverCropBox.height}px`,
              border: '2px solid rgba(0,0,0,0.35)',
              borderRadius: 10,
              overflow: 'hidden',
              position: 'relative',
              background: '#f4f5f7',
              cursor: isDraggingCoverCrop ? 'grabbing' : 'grab',
              userSelect: 'none',
              margin: '0 auto'
            }}
            onMouseDown={event => {
              coverDragStartRef.current = { x: event.clientX, y: event.clientY }
              coverDragOriginRef.current = { ...coverCropPosition }
              setIsDraggingCoverCrop(true)
            }}
          >
            {coverCropSource ? (
              <img
                src={coverCropSource}
                alt='Cover crop preview'
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${coverCropPosition.x}px), calc(-50% + ${coverCropPosition.y}px)) scale(${coverCropScale})`,
                  transformOrigin: 'center center',
                  width: '100%',
                  height: 'auto',
                  pointerEvents: 'none'
                }}
              />
            ) : null}
          </div>
          <div className='mt-4'>
            <Typography variant='body2' color='text.secondary' className='mb-1'>
              Zoom
            </Typography>
            <Slider
              value={coverCropScale}
              min={1}
              max={3}
              step={0.01}
              onChange={(_, value) => setCoverCropScale(Array.isArray(value) ? value[0] : value)}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCoverCropModal} disabled={uploadingCover} color='secondary'>
            Cancel
          </Button>
          <Button onClick={() => void handleApplyCoverCrop()} variant='contained' disabled={uploadingCover || !coverCropSource}>
            {uploadingCover ? 'Uploading...' : 'Crop And Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
