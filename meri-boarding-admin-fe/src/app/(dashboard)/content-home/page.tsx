'use client'

import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { defaultSections, normalizeSections, reorderKeys, sectionKeys, type HomeContent, type HomeSectionState, type SectionKey } from './sectionUtils'

export default function ContentHomePage() {
  const theme = useTheme()
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl
  const sharedLocale: 'en' = 'en'
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sections, setSections] = useState<Record<SectionKey, HomeSectionState>>(defaultSections())
  const [draggingKey, setDraggingKey] = useState<SectionKey | null>(null)
  const [dragOverKey, setDragOverKey] = useState<SectionKey | null>(null)

  const orderedSectionKeys = useMemo(
    () =>
      [...sectionKeys].sort((a, b) => {
        const orderA = Number(sections[a]?.order || 0)
        const orderB = Number(sections[b]?.order || 0)
        return orderA - orderB
      }),
    [sections]
  )

  const applyOrderedKeys = (keys: SectionKey[]) => {
    setSections(prev => {
      const next = { ...prev }
      keys.forEach((key, index) => {
        next[key] = {
          ...next[key],
          order: index + 1
        }
      })
      return next
    })
  }

  const loadContent = async () => {
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

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/home?locale=${sharedLocale}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        setLoading(false)
        setError(data?.error || 'Home content could not be loaded.')
        return
      }

      const nextSections = normalizeSections((data?.content as HomeContent | undefined)?.sections || {})
      setSections(nextSections)
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadContent()
  }, [])

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

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
          locale: sharedLocale,
          content: { sections }
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Section settings could not be updated.')
        return
      }
      setSuccess('Section order and visibility saved.')
      await loadContent()
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
        <Typography variant='h4'>Home Content</Typography>
        <Typography color='text.secondary'>Drag and drop sections to reorder, then toggle visibility. This structure is shared across all locales.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            {orderedSectionKeys.map((key, index) => {
              const isDragging = draggingKey === key
              const isDropTarget = dragOverKey === key && draggingKey !== key

              return (
                <div
                  key={key}
                  draggable
                  onDragStart={event => {
                    event.dataTransfer.effectAllowed = 'move'
                    setDraggingKey(key)
                    setDragOverKey(key)
                  }}
                  onDragOver={event => {
                    event.preventDefault()
                    if (!draggingKey || draggingKey === key) return
                    const sourceIndex = orderedSectionKeys.indexOf(draggingKey)
                    const targetIndex = orderedSectionKeys.indexOf(key)
                    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
                    applyOrderedKeys(reorderKeys(orderedSectionKeys, sourceIndex, targetIndex))
                    setDragOverKey(key)
                  }}
                  onDrop={event => {
                    event.preventDefault()
                    setDraggingKey(null)
                    setDragOverKey(null)
                  }}
                  onDragEnd={() => {
                    setDraggingKey(null)
                    setDragOverKey(null)
                  }}
                  style={{
                    border: isDropTarget
                      ? `1px solid ${alpha(theme.palette.primary.main, 0.65)}`
                      : `1px solid ${alpha(theme.palette.divider, 0.95)}`,
                    borderRadius: 10,
                    padding: 12,
                    background: isDragging
                      ? alpha(theme.palette.action.active, 0.08)
                      : isDropTarget
                        ? alpha(theme.palette.primary.main, 0.16)
                        : alpha(theme.palette.background.paper, 0.9),
                    boxShadow: isDropTarget
                      ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.24)}`
                      : isDragging
                        ? `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.42 : 0.14)}`
                        : 'none',
                    transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                    opacity: isDragging ? 0.75 : 1,
                    transition: 'transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease, opacity 180ms ease',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  className='flex items-center justify-between gap-3'
                >
                  <div className='flex items-center gap-3'>
                    <i className='bx bx-grid-vertical' style={{ fontSize: 18, opacity: 0.75 }} />
                    <Typography variant='body1'>
                      {index + 1}. {key}
                    </Typography>
                    {isDropTarget ? (
                      <Typography variant='caption' color='primary.main'>
                        Drop here
                      </Typography>
                    ) : null}
                  </div>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(sections[key]?.enabled)}
                        onChange={e =>
                          setSections(prev => ({
                            ...prev,
                            [key]: { ...prev[key], enabled: e.target.checked }
                          }))
                        }
                      />
                    }
                    label='Visible'
                  />
                </div>
              )
            })}

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Section Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
