'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type LocaleFilter = 'all' | 'de' | 'en' | 'tr'

type ChatSession = {
  id: string
  name: string
  email: string
  locale: 'de' | 'en' | 'tr'
  sourcePage: string
  status: string
  messageCount: number
  lastMessageAt: string
  lastRole: string
  lastPreview: string
  createdAt: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  kind: string
  model: string
  intent: string
  locale: string
  createdAt: string
}

type SessionDetail = {
  session: ChatSession
  messages: ChatMessage[]
}

export default function ChatSessionsPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [items, setItems] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('all')
  const [search, setSearch] = useState('')
  const [querySearch, setQuerySearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [total, setTotal] = useState(0)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total])

  const loadSessions = useCallback(async () => {
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
        page: String(page),
        limit: String(limit),
        locale: localeFilter
      })

      if (querySearch.trim()) params.set('search', querySearch.trim())

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/chat-sessions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Chat sessions could not be loaded.')
        setLoading(false)

        return
      }

      const list = Array.isArray(data?.items) ? data.items : []

      setItems(list)
      setTotal(Number(data?.total || 0))
      setSelectedSession(prev => list.find((item: ChatSession) => item.id === prev?.id) || null)
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, limit, localeFilter, page, querySearch])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const openDetail = async (session: ChatSession) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    setSelectedSession(session)
    setLoadingDetail(true)
    setDetail(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/chat-sessions/${session.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Session detail could not be loaded.')

        return
      }
      setDetail(data)
    } catch {
      setError('API connection failed.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const exportCsv = async () => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return

    try {
      const params = new URLSearchParams({ locale: localeFilter })
      if (querySearch.trim()) params.set('search', querySearch.trim())

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/chat-sessions-export.csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        setError('CSV export failed.')

        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chat_sessions_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setSuccess('CSV exported successfully.')
    } catch {
      setError('CSV export failed.')
    }
  }

  const deleteSession = async (session: ChatSession) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) return
    if (!window.confirm('Bu chat oturumunu ve tum mesajlarini silmek istiyor musunuz?')) return

    setDeletingId(session.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/chat-sessions/${session.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Session could not be deleted.')
        return
      }
      setSelectedSession(prev => (prev?.id === session.id ? null : prev))
      setDetail(null)
      setSuccess('Session deleted.')
      await loadSessions()
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
        <Typography variant='h4'>Chat Sessions</Typography>
        <Typography color='text.secondary'>All chat messages are stored per session for analysis and dataset building.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 2 }}>
                <CustomTextField
                  select
                  label='Locale'
                  value={localeFilter}
                  onChange={event => {
                    setLocaleFilter(event.target.value as LocaleFilter)
                    setPage(1)
                  }}
                  fullWidth
                >
                  <MenuItem value='all'>All</MenuItem>
                  <MenuItem value='de'>DE</MenuItem>
                  <MenuItem value='en'>EN</MenuItem>
                  <MenuItem value='tr'>TR</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  label='Search (name, email, last message)'
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
              <Grid size={{ xs: 12, md: 2 }} className='flex items-end'>
                <Button variant='contained' fullWidth onClick={() => void exportCsv()}>
                  Export CSV
                </Button>
              </Grid>
            </Grid>

            {items.length < 1 ? (
              <Typography color='text.secondary'>No chat session found.</Typography>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Locale</TableCell>
                      <TableCell>Messages</TableCell>
                      <TableCell>Last Message</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => void openDetail(item)}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(item.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.locale.toUpperCase()}</TableCell>
                        <TableCell>{item.messageCount}</TableCell>
                        <TableCell sx={{ maxWidth: 520 }}>
                          <Typography variant='body2'>{item.lastPreview || '-'}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            color='error'
                            disabled={deletingId === item.id}
                            onClick={event => {
                              event.stopPropagation()
                              void deleteSession(item)
                            }}
                          >
                            <i className='bx-trash' />
                          </IconButton>
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

      <Dialog open={Boolean(selectedSession)} onClose={() => setSelectedSession(null)} fullWidth maxWidth='md'>
        <DialogTitle>Chat Session Detail</DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? <Typography>Loading detail...</Typography> : null}
          {!loadingDetail && detail ? (
            <div className='flex flex-col gap-3'>
              <div className='flex flex-wrap gap-2'>
                <Chip size='small' label={`Locale: ${detail.session.locale.toUpperCase()}`} />
                <Chip size='small' label={`Messages: ${detail.session.messageCount}`} />
                <Chip size='small' label={`Source: ${detail.session.sourcePage}`} />
              </div>
              <Typography variant='body2'><strong>Name:</strong> {detail.session.name}</Typography>
              <Typography variant='body2'><strong>Email:</strong> {detail.session.email}</Typography>
              <Typography variant='body2'><strong>Date:</strong> {new Date(detail.session.createdAt).toLocaleString()}</Typography>
              <div className='flex flex-col gap-2'>
                {detail.messages.map(message => (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '84%',
                      border: '1px solid rgba(0,0,0,0.14)',
                      borderRadius: 12,
                      padding: '8px 10px',
                      background: message.role === 'user' ? 'rgba(202,160,92,0.18)' : '#fff'
                    }}
                  >
                    <Typography variant='caption' color='text.secondary'>
                      {message.role.toUpperCase()} • {new Date(message.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.text}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          {selectedSession ? (
            <Button
              color='error'
              variant='outlined'
              disabled={deletingId === selectedSession.id}
              onClick={() => void deleteSession(selectedSession)}
            >
              Delete Session
            </Button>
          ) : null}
          <Button onClick={() => setSelectedSession(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
