'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
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

type AdminUser = {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'moderator' | 'user'
  approved: boolean
  active: boolean
}

type EditableUserState = {
  role: 'moderator' | 'user'
  approved: boolean
  active: boolean
}

export default function UsersPage() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl

  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [editable, setEditable] = useState<Record<string, EditableUserState>>({})

  const loadUsers = async () => {
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

      const allowed = meData?.admin?.role === 'super_admin'
      setIsSuperAdmin(allowed)

      if (!allowed) {
        setLoading(false)
        return
      }

      const usersResponse = await fetch(`${apiBaseUrl}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const usersData = await usersResponse.json()

      if (!usersResponse.ok) {
        setError(usersData?.error || 'Users could not be loaded.')
        setLoading(false)
        return
      }

      const list = (usersData?.users || []) as AdminUser[]
      setUsers(list)

      const initialEditable: Record<string, EditableUserState> = {}
      for (const user of list) {
        if (user.role === 'super_admin') continue
        initialEditable[user.id] = {
          role: user.role === 'moderator' ? 'moderator' : 'user',
          approved: Boolean(user.approved),
          active: Boolean(user.active)
        }
      }
      setEditable(initialEditable)
    } catch {
      setError('API connection failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const handleSaveApproval = async (userId: string, payload?: EditableUserState) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setError('No active session. Please login again.')
      return
    }

    const state = payload ?? editable[userId]
    if (!state) return

    setSavingUserId(userId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(state)
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'User update failed.')
        setSavingUserId(null)
        return
      }

      setSuccess('User approval and role updated.')
      await loadUsers()
    } catch {
      setError('API connection failed.')
    } finally {
      setSavingUserId(null)
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    const token = window.localStorage.getItem('admin_token')
    if (!token) {
      setError('No active session. Please login again.')
      return
    }

    const confirmed = window.confirm(`Delete user "${user.name}" (${user.email})?`)
    if (!confirmed) return

    setDeletingUserId(user.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'User could not be deleted.')
        setDeletingUserId(null)
        return
      }

      setSuccess('User deleted.')
      await loadUsers()
    } catch {
      setError('API connection failed.')
    } finally {
      setDeletingUserId(null)
    }
  }

  if (loading) return <Typography>Loading...</Typography>

  if (!isSuperAdmin) {
    return <Alert severity='error'>Only super admin can access the users panel.</Alert>
  }

  const managedUsers = users.filter(user => user.role !== 'super_admin')
  const pendingCount = managedUsers.filter(user => !user.approved).length
  const approvedCount = managedUsers.filter(user => user.approved).length

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Users Approval Panel</Typography>
        <Typography color='text.secondary'>
          New accounts come from the login register form. Only super admin can approve and assign role.
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            <Typography variant='h6'>Users List</Typography>
            <Typography color='text.secondary'>
              Pending: {pendingCount} | Approved: {approvedCount} | Total: {managedUsers.length}
            </Typography>
            {managedUsers.length === 0 ? (
              <Typography color='text.secondary'>No users found.</Typography>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Approval</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {managedUsers.map(user => (
                      <TableRow key={user.id} hover>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <CustomTextField
                            select
                            value={editable[user.id]?.role || 'user'}
                            onChange={e =>
                              setEditable(prev => ({
                                ...prev,
                                [user.id]: { ...prev[user.id], role: e.target.value as 'moderator' | 'user' }
                              }))
                            }
                            fullWidth
                          >
                            <MenuItem value='moderator'>Moderator</MenuItem>
                            <MenuItem value='user'>User</MenuItem>
                          </CustomTextField>
                        </TableCell>
                        <TableCell>
                          <Chip size='small' color={user.approved ? 'success' : 'warning'} label={user.approved ? 'Approved' : 'Pending'} />
                        </TableCell>
                        <TableCell>
                          <Chip size='small' color={user.active ? 'success' : 'warning'} label={user.active ? 'Active' : 'Inactive'} />
                        </TableCell>
                        <TableCell align='right'>
                          <div className='flex items-center justify-end gap-2 flex-wrap'>
                            {!user.approved ? (
                              <>
                                <Button
                                  size='small'
                                  variant='contained'
                                  onClick={() => {
                                    const nextState: EditableUserState = {
                                      ...(editable[user.id] || { role: 'user', approved: false, active: false }),
                                      approved: true,
                                      active: true
                                    }
                                    setEditable(prev => ({
                                      ...prev,
                                      [user.id]: nextState
                                    }))
                                    void handleSaveApproval(user.id, nextState)
                                  }}
                                  disabled={savingUserId === user.id}
                                >
                                  {savingUserId === user.id ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  size='small'
                                  variant='outlined'
                                  color='secondary'
                                  onClick={() => {
                                    const nextState: EditableUserState = {
                                      ...(editable[user.id] || { role: 'user', approved: false, active: false }),
                                      approved: false,
                                      active: false
                                    }
                                    setEditable(prev => ({
                                      ...prev,
                                      [user.id]: nextState
                                    }))
                                    void handleSaveApproval(user.id, nextState)
                                  }}
                                  disabled={savingUserId === user.id}
                                >
                                  Keep Pending
                                </Button>
                              </>
                            ) : (
                              <Button
                                size='small'
                                variant='outlined'
                                onClick={() => {
                                  const nextState: EditableUserState = {
                                    ...(editable[user.id] || { role: 'user', approved: true, active: true }),
                                    approved: true,
                                    active: true
                                  }
                                  setEditable(prev => ({
                                    ...prev,
                                    [user.id]: nextState
                                  }))
                                  void handleSaveApproval(user.id, nextState)
                                }}
                                disabled={savingUserId === user.id}
                              >
                                {savingUserId === user.id ? 'Saving...' : 'Save Role'}
                              </Button>
                            )}
                            <Button
                              size='small'
                              variant='outlined'
                              color='error'
                              onClick={() => void handleDeleteUser(user)}
                              disabled={deletingUserId === user.id || savingUserId === user.id}
                            >
                              {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
