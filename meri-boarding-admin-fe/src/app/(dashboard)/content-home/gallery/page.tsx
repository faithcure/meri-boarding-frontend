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

type GalleryCategory = {
  key: string
  label: string
}

type GalleryItem = {
  image: string
  category: string
  alt: string
}

type GalleryContent = {
  subtitle: string
  title: string
  description: string
  view: string
  categories: GalleryCategory[]
  items: GalleryItem[]
}

type GalleryErrors = {
  subtitle?: string
  title?: string
  description?: string
  view?: string
  categories?: string
  items?: string
  categoryByIndex: Record<number, { key?: string; label?: string }>
  itemByIndex: Record<number, { image?: string }>
}

const localeOptions: Locale[] = ['en', 'de', 'tr']

const sanitizeKey = (input: string) =>
  String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)

const getNextCategory = (categories: GalleryCategory[]): GalleryCategory => {
  const base = `category-${categories.length + 1}`
  let key = sanitizeKey(base) || `category-${Date.now()}`
  let seq = 2
  while (categories.some(item => item.key === key)) {
    key = sanitizeKey(`${base}-${seq}`) || `category-${Date.now()}-${seq}`
    seq += 1
  }
  return { key, label: `Category ${categories.length + 1}` }
}

const normalizeGallery = (input: unknown): GalleryContent => {
  const value = (input || {}) as Partial<GalleryContent>
  const categories = Array.isArray(value.categories)
    ? value.categories
        .map(item => ({
          key: sanitizeKey(String(item?.key || '')),
          label: String(item?.label || '').trim()
        }))
        .filter(item => Boolean(item.key) && Boolean(item.label))
    : []

  const safeCategories = categories.length > 0 ? categories : [{ key: 'general', label: 'General' }]
  const defaultCategory = safeCategories[0].key
  const items = Array.isArray(value.items)
    ? value.items
        .map(item => ({
          image: String(item?.image || '').trim(),
          category: sanitizeKey(String(item?.category || defaultCategory)) || defaultCategory,
          alt: String(item?.alt || '').trim()
        }))
        .filter(item => Boolean(item.image))
        .slice(0, 24)
        .map(item => ({
          ...item,
          category: safeCategories.some(category => category.key === item.category) ? item.category : defaultCategory
        }))
    : []

  return {
    subtitle: String(value.subtitle || '').trim(),
    title: String(value.title || '').trim(),
    description: String(value.description || '').trim(),
    view: String(value.view || '').trim(),
    categories: safeCategories,
    items
  }
}

export default function GallerySettingsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [expanded, setExpanded] = useState<'texts' | 'categories' | 'items'>('texts')
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [uploadingByCategory, setUploadingByCategory] = useState<Record<string, boolean>>({})
  const [formErrors, setFormErrors] = useState<GalleryErrors>({ categoryByIndex: {}, itemByIndex: {} })
  const [gallery, setGallery] = useState<GalleryContent>({
    subtitle: '',
    title: '',
    description: '',
    view: '',
    categories: [{ key: 'general', label: 'General' }],
    items: []
  })

  const loadGallery = async (targetLocale: Locale) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      setError('No active session. Please login again.')
      return
    }

    setError('')
    setSuccess('')
    setFormErrors({ categoryByIndex: {}, itemByIndex: {} })
    setUploadErrors({})
    setUploadingByCategory({})
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
        setError(data?.error || 'Gallery content could not be loaded.')
        return
      }

      setGallery(normalizeGallery(data?.content?.gallery || {}))
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGallery(locale)
  }, [])

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
    await loadGallery(nextLocale)
  }

  const validate = (value: GalleryContent): GalleryErrors => {
    const errors: GalleryErrors = { categoryByIndex: {}, itemByIndex: {} }
    if (!value.subtitle.trim()) errors.subtitle = 'Subtitle is required.'
    if (!value.title.trim()) errors.title = 'Title is required.'
    if (!value.description.trim()) errors.description = 'Description is required.'
    if (!value.view.trim()) errors.view = '"View" label is required.'
    if (!Array.isArray(value.categories) || value.categories.length < 1) errors.categories = 'At least 1 category is required.'

    const keySet = new Set<string>()
    value.categories.forEach((category, index) => {
      const rowError: { key?: string; label?: string } = {}
      const key = sanitizeKey(category.key)
      if (!key) rowError.key = 'Key is required.'
      if (!category.label.trim()) rowError.label = 'Label is required.'
      if (key && keySet.has(key)) rowError.key = 'Duplicate key.'
      if (key) keySet.add(key)
      if (rowError.key || rowError.label) errors.categoryByIndex[index] = rowError
    })

    if (!Array.isArray(value.items) || value.items.length < 1) errors.items = 'At least 1 item is required.'
    if (value.items.length > 24) errors.items = 'Item limit is 24.'
    const categoryItemCounts = new Map<string, number>()
    value.items.forEach((item, index) => {
      if (!item.image.trim()) errors.itemByIndex[index] = { image: 'Image is required.' }
      const count = (categoryItemCounts.get(item.category) || 0) + 1
      categoryItemCounts.set(item.category, count)
    })
    const overLimitCategory = Array.from(categoryItemCounts.entries()).find(([, count]) => count > 8)
    if (overLimitCategory) {
      errors.items = `Category "${overLimitCategory[0]}" can contain at most 8 images.`
    }
    return errors
  }

  const hasErrors = (errors: GalleryErrors) =>
    Boolean(
        errors.subtitle ||
        errors.title ||
        errors.description ||
        errors.view ||
        errors.categories ||
        errors.items ||
        Object.keys(errors.categoryByIndex).length ||
        Object.keys(errors.itemByIndex).length
    )

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const uploadGalleryImages = async (files: File[], categoryKey: string) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    if (files.length < 1) return
    const existingInCategory = gallery.items.filter(item => item.category === categoryKey).length
    if (existingInCategory + files.length > 8) {
      setUploadErrors(prev => ({ ...prev, [categoryKey]: 'Each category can contain at most 8 images.' }))
      return
    }
    if (gallery.items.length + files.length > 24) {
      setUploadErrors(prev => ({ ...prev, [categoryKey]: 'Toplam galeri görsel limiti 24. Önce bazı görselleri kaldırın.' }))
      return
    }

    const invalidType = files.find(file => !['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type))
    if (invalidType) {
      setUploadErrors(prev => ({ ...prev, [categoryKey]: 'Only PNG, JPG or WEBP files are allowed.' }))
      return
    }
    const invalidSize = files.find(file => file.size > 8 * 1024 * 1024)
    if (invalidSize) {
      setUploadErrors(prev => ({ ...prev, [categoryKey]: 'Image size cannot exceed 8MB.' }))
      return
    }

    setUploadingByCategory(prev => ({ ...prev, [categoryKey]: true }))
    setUploadErrors(prev => ({ ...prev, [categoryKey]: '' }))
    try {
      const uploadedItems: GalleryItem[] = []
      for (const file of files) {
        const dataUrl = await toDataUrl(file)
        const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home/gallery-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: file.name, dataUrl })
        })
        const data = await response.json()
        if (!response.ok) {
          setUploadErrors(prev => ({ ...prev, [categoryKey]: data?.error || 'Gallery image upload failed.' }))
          return
        }
        uploadedItems.push({
          image: String(data?.imageUrl || ''),
          category: categoryKey,
          alt: ''
        })
      }

      if (uploadedItems.length > 0) {
        setGallery(prev => ({
          ...prev,
          items: [...prev.items, ...uploadedItems].slice(0, 24)
        }))
        setSuccess(`${uploadedItems.length} image(s) uploaded.`)
      }
    } catch {
      setUploadErrors(prev => ({ ...prev, [categoryKey]: 'Gallery image upload failed.' }))
    } finally {
      setUploadingByCategory(prev => ({ ...prev, [categoryKey]: false }))
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    const normalized = normalizeGallery(gallery)
    const validationErrors = validate(normalized)
    setFormErrors(validationErrors)
    if (hasErrors(validationErrors)) {
      if (validationErrors.subtitle || validationErrors.title || validationErrors.description || validationErrors.view) setExpanded('texts')
      else if (validationErrors.categories || Object.keys(validationErrors.categoryByIndex).length) setExpanded('categories')
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
          content: { gallery: normalized }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Gallery settings could not be saved.')
        return
      }
      setSuccess('Gallery settings saved.')
      await loadGallery(locale)
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
        <Typography variant='h4'>Gallery Settings</Typography>
        <Typography color='text.secondary'>Manage gallery texts, dynamic categories and items.</Typography>
        <Typography variant='caption' color='text.secondary'>
          Note: Category and item structure is shared globally across all locales.
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
            <Accordion
              expanded={expanded === 'texts'}
              onChange={(_, open) => setExpanded(open ? 'texts' : 'categories')}
              variant='outlined'
              disableGutters
            >
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Texts`}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      label='Subtitle'
                      value={gallery.subtitle}
                      onChange={e => {
                        setGallery(prev => ({ ...prev, subtitle: e.target.value }))
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
                      value={gallery.title}
                      onChange={e => {
                        setGallery(prev => ({ ...prev, title: e.target.value }))
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
                      value={gallery.description}
                      onChange={e => {
                        setGallery(prev => ({ ...prev, description: e.target.value }))
                        setFormErrors(prev => ({ ...prev, description: undefined }))
                      }}
                      error={Boolean(formErrors.description)}
                      helperText={formErrors.description}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      label='View Label'
                      value={gallery.view}
                      onChange={e => {
                        setGallery(prev => ({ ...prev, view: e.target.value }))
                        setFormErrors(prev => ({ ...prev, view: undefined }))
                      }}
                      error={Boolean(formErrors.view)}
                      helperText={formErrors.view}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion
              expanded={expanded === 'categories'}
              onChange={(_, open) => setExpanded(open ? 'categories' : 'items')}
              variant='outlined'
              disableGutters
            >
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Categories (${gallery.categories.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.categories ? <Alert severity='error'>{formErrors.categories}</Alert> : null}
                {gallery.categories.map((category, index) => (
                  <Card key={`gallery-category-${index}`} variant='outlined'>
                    <CardContent>
                      <Typography variant='subtitle1' className='mb-3'>
                        {`Category ${index + 1}`}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <CustomTextField
                            label='Key'
                            value={category.key}
                            onChange={e => {
                              const nextKey = sanitizeKey(e.target.value)
                              const previousKey = gallery.categories[index].key
                              setGallery(prev => ({
                                ...prev,
                                categories: prev.categories.map((row, i) => (i === index ? { ...row, key: nextKey } : row)),
                                items: prev.items.map((item) => (item.category === previousKey ? { ...item, category: nextKey || previousKey } : item))
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                categories: undefined,
                                categoryByIndex: {
                                  ...prev.categoryByIndex,
                                  [index]: { ...prev.categoryByIndex[index], key: undefined }
                                }
                              }))
                            }}
                            helperText={formErrors.categoryByIndex[index]?.key || 'Use only lowercase letters, numbers, and -'}
                            error={Boolean(formErrors.categoryByIndex[index]?.key)}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                          <CustomTextField
                            label='Label'
                            value={category.label}
                            onChange={e => {
                              setGallery(prev => ({
                                ...prev,
                                categories: prev.categories.map((row, i) => (i === index ? { ...row, label: e.target.value } : row))
                              }))
                              setFormErrors(prev => ({
                                ...prev,
                                categories: undefined,
                                categoryByIndex: {
                                  ...prev.categoryByIndex,
                                  [index]: { ...prev.categoryByIndex[index], label: undefined }
                                }
                              }))
                            }}
                            helperText={formErrors.categoryByIndex[index]?.label}
                            error={Boolean(formErrors.categoryByIndex[index]?.label)}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Button
                            variant='outlined'
                            color='error'
                            fullWidth
                            disabled={gallery.categories.length <= 1}
                            onClick={() => {
                              const keyToRemove = gallery.categories[index].key
                              const fallbackKey = gallery.categories.find((_, i) => i !== index)?.key || 'general'
                              setGallery(prev => ({
                                ...prev,
                                categories: prev.categories.filter((_, i) => i !== index),
                                items: prev.items.map(item => (item.category === keyToRemove ? { ...item, category: fallbackKey } : item))
                              }))
                            }}
                          >
                            Remove
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant='outlined'
                  onClick={() =>
                    setGallery(prev => ({
                      ...prev,
                      categories: [...prev.categories, getNextCategory(prev.categories)]
                    }))
                  }
                >
                  Add Category
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion
              expanded={expanded === 'items'}
              onChange={(_, open) => setExpanded(open ? 'items' : 'texts')}
              variant='outlined'
              disableGutters
            >
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>{`Items (${gallery.items.length})`}</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.items ? <Alert severity='error'>{formErrors.items}</Alert> : null}
                {gallery.categories.map((category, categoryIndex) => {
                  const categoryItems = gallery.items
                    .map((item, itemIndex) => ({ ...item, itemIndex }))
                    .filter(item => item.category === category.key)

                  return (
                    <Card key={`gallery-category-items-${category.key}-${categoryIndex}`} variant='outlined'>
                      <CardContent className='flex flex-col gap-3'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <Typography variant='subtitle1'>{`Category ${categoryIndex + 1}: ${category.label} (${categoryItems.length}/8)`}</Typography>
                          <Button component='label' variant={uploadErrors[category.key] ? 'contained' : 'outlined'} color={uploadErrors[category.key] ? 'error' : 'primary'} disabled={Boolean(uploadingByCategory[category.key]) || gallery.items.length >= 24}>
                            {uploadingByCategory[category.key] ? 'Uploading...' : 'Upload Multiple Images'}
                            <input
                              hidden
                              multiple
                              type='file'
                              accept='image/png,image/jpeg,image/jpg,image/webp'
                              onChange={e => {
                                const files = e.target.files ? Array.from(e.target.files) : []
                                if (files.length > 0) void uploadGalleryImages(files, category.key)
                                e.currentTarget.value = ''
                              }}
                            />
                          </Button>
                        </div>

                        {uploadErrors[category.key] ? (
                          <Typography variant='caption' color='error.main'>
                            {uploadErrors[category.key]}
                          </Typography>
                        ) : null}

                        {categoryItems.length < 1 ? (
                          <Typography variant='body2' color='text.secondary'>
                            No images in this category yet.
                          </Typography>
                        ) : (
                          <Grid container spacing={3}>
                            {categoryItems.map(item => (
                              <Grid key={`gallery-item-${item.itemIndex}`} size={{ xs: 12, md: 6, lg: 4 }}>
                                <Card variant='outlined'>
                                  <CardContent className='flex flex-col gap-2'>
                                    <img
                                      src={item.image.startsWith('/api/') ? `${apiBaseUrl}${item.image}` : item.image}
                                      alt={item.alt || `Gallery ${item.itemIndex + 1}`}
                                      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                                    />
                                    <CustomTextField
                                      label='Alt Text'
                                      value={item.alt}
                                      onChange={e =>
                                        setGallery(prev => ({
                                          ...prev,
                                          items: prev.items.map((row, i) => (i === item.itemIndex ? { ...row, alt: e.target.value } : row))
                                        }))
                                      }
                                      fullWidth
                                    />
                                    <Button
                                      variant='outlined'
                                      color='error'
                                      onClick={() =>
                                        setGallery(prev => ({
                                          ...prev,
                                          items: prev.items.filter((_, i) => i !== item.itemIndex)
                                        }))
                                      }
                                    >
                                      Remove Image
                                    </Button>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving...' : 'Save Gallery Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
