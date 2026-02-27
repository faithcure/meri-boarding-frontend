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
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

type LocaleFilter = 'all' | 'de' | 'en' | 'tr'
type ChatSessionsTab = 'quality' | 'messages'

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

type ChatQuality = {
  periodDays: number
  locale: LocaleFilter
  totals: {
    sessions: number
    handoffSessions: number
    assistantAnsweredSessions: number
    autoResolvedSessions: number
    handoffRate: number
    autoResolveRate: number
  }
  feedback: {
    correct: number
    incorrect: number
    incorrectRate: number
  }
  topQuestions: Array<{
    text: string
    count: number
  }>
}

export default function ChatSessionsPage() {
  const theme = useTheme()
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
  const [quality, setQuality] = useState<ChatQuality | null>(null)
  const [activeTab, setActiveTab] = useState<ChatSessionsTab>('quality')

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

      const [response, qualityResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/admin/chat-sessions?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiBaseUrl}/api/v1/admin/chat-quality?locale=${localeFilter}&days=30`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Chat sessions could not be loaded.')
        setLoading(false)

        return
      }

      if (qualityResponse.ok) {
        const qualityData = await qualityResponse.json()
        setQuality(qualityData)
      } else {
        setQuality(null)
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
            <Tabs value={activeTab} onChange={(_, value: ChatSessionsTab) => setActiveTab(value)}>
              <Tab value='quality' label='Quality Snapshot (30 days)' />
              <Tab value='messages' label='Mesajlar' />
            </Tabs>

            {activeTab === 'quality' ? (
              quality ? (
                <>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Chip color='primary' label={`Auto-resolve rate: ${quality.totals.autoResolveRate}%`} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Chip color='warning' label={`Handoff rate: ${quality.totals.handoffRate}%`} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Chip color='error' label={`Wrong-answer reports: ${quality.feedback.incorrect}`} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Chip label={`Wrong-answer rate: ${quality.feedback.incorrectRate}%`} />
                    </Grid>
                  </Grid>
                  <Typography variant='body2' color='text.secondary'>
                    Top asked questions (normalized from user messages)
                  </Typography>
                  {quality.topQuestions.length < 1 ? (
                    <Typography color='text.secondary'>No question trend data for selected period.</Typography>
                  ) : (
                    <TableContainer>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Question</TableCell>
                            <TableCell align='right'>Count</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {quality.topQuestions.map((row, index) => (
                            <TableRow key={`${row.text}-${index}`}>
                              <TableCell sx={{ maxWidth: 800 }}>
                                <Typography variant='body2'>{row.text}</Typography>
                              </TableCell>
                              <TableCell align='right'>{row.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              ) : (
                <Typography color='text.secondary'>No quality snapshot data found.</Typography>
              )
            ) : (
              <>
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
              </>
            )}
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
                  {detail.messages.map(message => {
                    const isUser = message.role === 'user'
                    const bubbleBackground = isUser
                      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.26 : 0.16)
                      : theme.palette.mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.06)
                        : theme.palette.background.paper

                    return (
                      <div
                        key={message.id}
                        style={{
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          maxWidth: '84%',
                          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                          borderRadius: 12,
                          padding: '8px 10px',
                          background: bubbleBackground
                        }}
                      >
                        <Typography variant='caption' color='text.secondary'>
                          {message.role.toUpperCase()} • {new Date(message.createdAt).toLocaleString()}
                        </Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>
                          {message.text}
                        </Typography>
                      </div>
                    )
                  })}
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
