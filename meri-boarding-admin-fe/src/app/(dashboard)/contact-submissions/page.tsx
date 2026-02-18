'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type SubmissionStatusFilter = 'all' | 'unread' | 'read'
type SubmissionStatus = 'unread' | 'read'

type ContactSubmission = {
  id: string
  name: string
  email: string
  phone: string
  country: string
  subject: string
  message: string
  locale: 'de' | 'en' | 'tr'
  sourcePage: string
  status: SubmissionStatus
  mailSent: boolean
  mailError: string
  createdAt: string
}

const toMessagePreview = (value: string) => {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim()

  if (!cleaned) return ''

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  const preview = sentences.slice(0, 2).join(' ')

  if (preview.length <= 220) return preview

  return `${preview.slice(0, 217)}...`
}

export default function ContactSubmissionsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [items, setItems] = useState<ContactSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null)
  const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [querySearch, setQuerySearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0 })

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total])

  const loadSubmissions = useCallback(async () => {
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

      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        limit: String(limit)
      })

      if (querySearch.trim()) {
        params.set('search', querySearch.trim())
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/contact-submissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Contact submissions could not be loaded.')
        setLoading(false)

        return
      }

      const list = Array.isArray(data?.items) ? data.items : []

      setItems(list)
      setTotal(Number(data?.total || 0))
      setCounts({
        all: Number(data?.counts?.all || 0),
        unread: Number(data?.counts?.unread || 0),
        read: Number(data?.counts?.read || 0)
      })
      setSelectedSubmission(prev => list.find((item: ContactSubmission) => item.id === prev?.id) || null)
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, limit, page, querySearch, statusFilter])

  useEffect(() => {
    void loadSubmissions()
  }, [loadSubmissions])

  const updateStatus = async (submissionId: string, status: SubmissionStatus) => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    setBusyId(submissionId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/contact-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Status could not be updated.')

        return
      }

      setSuccess(status === 'read' ? 'Submission marked as read.' : 'Submission marked as unread.')
      await loadSubmissions()
    } catch {
      setError('API connection failed.')
    } finally {
      setBusyId(null)
    }
  }

  const deleteSubmission = async (submissionId: string) => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    if (!window.confirm('Bu mesaj kaydını silmek istiyor musunuz?')) return

    setDeletingId(submissionId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/contact-submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Submission could not be deleted.')

        return
      }

      setSuccess('Submission deleted.')
      setSelectedSubmission(prev => (prev?.id === submissionId ? null : prev))
      await loadSubmissions()
    } catch {
      setError('API connection failed.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <Typography>Loading...</Typography>
  if (!allowed) return <Alert severity='error'>Only super admin or moderator can access this panel.</Alert>

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Contact Submissions</Typography>
        <Typography color='text.secondary'>List view shows sender email and short message preview. Click row for details.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <CustomTextField
                  select
                  label='Status'
                  value={statusFilter}
                  onChange={event => {
                    setStatusFilter(event.target.value as SubmissionStatusFilter)
                    setPage(1)
                  }}
                  fullWidth
                >
                  <MenuItem value='all'>All ({counts.all})</MenuItem>
                  <MenuItem value='unread'>Unread ({counts.unread})</MenuItem>
                  <MenuItem value='read'>Read ({counts.read})</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <CustomTextField
                  label='Search (email or message)'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }} className='flex items-end'>
                <Button
                  variant='outlined'
                  fullWidth
                  onClick={() => {
                    setQuerySearch(search.trim())
                    setPage(1)
                  }}
                >
                  Apply
                </Button>
              </Grid>
            </Grid>

            {items.length < 1 ? (
              <Typography color='text.secondary'>No submission found.</Typography>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Sender</TableCell>
                      <TableCell>Message Preview</TableCell>
                      <TableCell>Read</TableCell>
                      <TableCell>Mail</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedSubmission(item)}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(item.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell sx={{ maxWidth: 500 }}>
                          <Typography variant='body2'>{toMessagePreview(item.message)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            size='small'
                            checked={item.status === 'read'}
                            disabled={busyId === item.id}
                            onClick={event => event.stopPropagation()}
                            onChange={event => {
                              event.stopPropagation()
                              void updateStatus(item.id, event.target.checked ? 'read' : 'unread')
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip size='small' color={item.mailSent ? 'success' : 'warning'} label={item.mailSent ? 'Sent' : 'Failed'} />
                        </TableCell>
                        <TableCell align='right'>
                          <Tooltip title='Delete submission'>
                            <span>
                              <IconButton
                                size='small'
                                color='error'
                                disabled={deletingId === item.id}
                                onClick={event => {
                                  event.stopPropagation()
                                  void deleteSubmission(item.id)
                                }}
                              >
                                <i className='bx-trash' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <div className='flex items-center justify-between'>
              <Typography color='text.secondary'>
                Page {page} / {totalPages} | Total {total}
              </Typography>
              <div className='flex items-center gap-2'>
                <Button size='small' variant='outlined' disabled={page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                  Previous
                </Button>
                <Button size='small' variant='outlined' disabled={page >= totalPages} onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={Boolean(selectedSubmission)} onClose={() => setSelectedSubmission(null)} fullWidth maxWidth='md'>
        <DialogTitle>Contact Submission Detail</DialogTitle>
        <DialogContent dividers>
          {selectedSubmission ? (
            <div className='grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start'>
              <div className='flex flex-col gap-3'>
                <div className='flex flex-wrap gap-2'>
                  <Chip size='small' label={selectedSubmission.status === 'read' ? 'Read' : 'Unread'} color={selectedSubmission.status === 'read' ? 'success' : 'warning'} />
                  <Chip size='small' label={selectedSubmission.mailSent ? 'Mail Sent' : 'Mail Failed'} color={selectedSubmission.mailSent ? 'success' : 'warning'} />
                </div>
                <Typography variant='body2'><strong>Date:</strong> {new Date(selectedSubmission.createdAt).toLocaleString()}</Typography>
                <Typography variant='body2'><strong>Email:</strong> {selectedSubmission.email}</Typography>
                <Typography variant='body2'><strong>Name:</strong> {selectedSubmission.name}</Typography>
                <Typography variant='body2'><strong>Phone:</strong> {selectedSubmission.phone}</Typography>
                <Typography variant='body2'><strong>Country:</strong> {selectedSubmission.country || '-'}</Typography>
                <Typography variant='body2'><strong>Topic:</strong> {selectedSubmission.subject || '-'}</Typography>
                <Typography variant='body2'><strong>Locale:</strong> {selectedSubmission.locale.toUpperCase()}</Typography>
                <Typography variant='body2'><strong>Source:</strong> {selectedSubmission.sourcePage}</Typography>
                {!selectedSubmission.mailSent && selectedSubmission.mailError ? (
                  <Alert severity='warning'>{selectedSubmission.mailError}</Alert>
                ) : null}
                <Typography variant='body2'><strong>Message:</strong></Typography>
                <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedSubmission.message}
                </Typography>
              </div>
              <div
                className='hidden md:flex items-center justify-center'
                style={{
                  minHeight: 280,
                  border: '1px dashed rgba(0, 0, 0, 0.14)',
                  borderRadius: 14,
                  background: 'linear-gradient(160deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.01))'
                }}
              >
                <i className='bx-message-square-dots' style={{ fontSize: 130, color: 'rgba(0, 0, 0, 0.18)' }} />
              </div>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          {selectedSubmission ? (
            <Button
              variant='outlined'
              disabled={busyId === selectedSubmission.id}
              onClick={() => void updateStatus(selectedSubmission.id, selectedSubmission.status === 'read' ? 'unread' : 'read')}
            >
              {selectedSubmission.status === 'read' ? 'Mark Unread' : 'Mark Read'}
            </Button>
          ) : null}
          <Button onClick={() => setSelectedSubmission(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
