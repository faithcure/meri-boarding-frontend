'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Styled component for role badge content
const RoleBadgeSpan = styled('span')({
  width: 18,
  height: 18,
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)',
  fontSize: 12
})

const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@local.test',
    role: 'admin',
    avatarUrl: '/images/avatars/user-silhouette.svg'
  })

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const router = useRouter()

  const { settings } = useSettings()
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl
  const normalizeAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return '/images/avatars/user-silhouette.svg'
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl
    if (avatarUrl.startsWith('/images/avatars/')) return avatarUrl
    if (avatarUrl.startsWith('/')) return `${apiBaseUrl}${avatarUrl}`
    return avatarUrl
  }

  useEffect(() => {
    const storedProfile = window.localStorage.getItem('admin_profile')

    if (!storedProfile) {
      return
    }

    try {
      const parsed = JSON.parse(storedProfile) as { name?: string; email?: string; role?: string; avatarUrl?: string }
      setProfile({
        name: parsed.name || 'Admin User',
        email: parsed.email || 'admin@local.test',
        role: parsed.role || 'admin',
        avatarUrl: normalizeAvatarUrl(parsed.avatarUrl)
      })
    } catch {
      setProfile({
        name: 'Admin User',
        email: 'admin@local.test',
        role: 'admin',
        avatarUrl: '/images/avatars/user-silhouette.svg'
      })
    }
  }, [])

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false)
  }

  const badgeConfig =
    profile.role === 'super_admin'
      ? { icon: 'bx-crown', bg: 'var(--mui-palette-warning-main)', title: 'Super Admin' }
      : profile.role === 'moderator'
        ? { icon: 'bx-shield-quarter', bg: 'var(--mui-palette-info-main)', title: 'Moderator' }
        : { icon: 'bx-user', bg: 'var(--mui-palette-success-main)', title: 'User' }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleUserLogout = async () => {
    window.localStorage.removeItem('admin_token')
    window.localStorage.removeItem('admin_profile')
    // Redirect to login page
    router.push('/login')
  }

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={
          <RoleBadgeSpan onClick={handleDropdownOpen} style={{ backgroundColor: badgeConfig.bg }} title={badgeConfig.title}>
            <i className={badgeConfig.icon} />
          </RoleBadgeSpan>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2.5'
      >
        <CustomAvatar
          ref={anchorRef}
          alt={profile.name}
          src={profile.avatarUrl}
          onClick={handleDropdownOpen}
          className='cursor-pointer'
        />
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-4 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  <div className='flex items-center plb-2 pli-5 gap-2' tabIndex={-1}>
                    <CustomAvatar size={40} alt={profile.name} src={profile.avatarUrl} />
                    <div className='flex items-start flex-col'>
                      <Typography variant='h6'>{profile.name}</Typography>
                      <Typography variant='body2' color='text.disabled'>
                        {profile.email}
                      </Typography>
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  <MenuItem className='gap-3' onClick={e => handleDropdownClose(e, '/my-profile')}>
                    <i className='bx-user' />
                    <Typography color='text.primary'>My Profile</Typography>
                  </MenuItem>
                  <MenuItem className='gap-3' onClick={e => handleDropdownClose(e)}>
                    <i className='bx-help-circle' />
                    <Typography color='text.primary'>FAQ</Typography>
                  </MenuItem>
                  <Divider className='mlb-1' />
                  <MenuItem className='gap-3' onClick={handleUserLogout}>
                    <i className='bx-power-off' />
                    <Typography color='text.primary'>Logout</Typography>
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
