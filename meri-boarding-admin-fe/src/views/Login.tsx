'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'

// Component Imports
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

const LoginView = () => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hooks
  const router = useRouter()

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

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  return (
    <Box className='relative flex min-bs-[100dvh] items-center justify-center p-6 pt-40 sm:p-10 sm:pt-44 bg-backgroundDefault'>
      <div className='pointer-events-none fixed left-1/2 top-6 z-20 -translate-x-1/2 sm:top-8'>
        <Logo height={112} maxWidth={520} />
      </div>

      <Card className='w-full max-w-[520px]'>
        <CardContent className='relative overflow-hidden p-6 sm:p-10'>
          <img
            src='/images/branding/meri-logo-mark.svg'
            alt=''
            aria-hidden='true'
            style={{
              position: 'absolute',
              width: 360,
              height: 360,
              objectFit: 'contain',
              inset: '50% auto auto 50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.05,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          />

          <div className='relative mb-6 flex flex-col items-center gap-1 text-center'>
            <Typography variant='h4'>Welcome back 👋🏻</Typography>
            <Typography>Please sign-in to your account and start the adventure</Typography>
            <Divider flexItem className='my-2' />
            <Typography color='text.secondary' className='mt-1 max-w-[440px]'>
              Please submit your membership details and notify the admin. Your assignment will be activated by the
              administrator.
            </Typography>
          </div>

          <form
            noValidate
            autoComplete='off'
            onSubmit={async e => {
              e.preventDefault()
              if (!username.trim() || !password) {
                setError('Email and password are required.')
                return
              }

              setIsSubmitting(true)
              setError('')

              try {
                const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: username.trim(),
                    password
                  })
                })

                const data = await response.json()

                if (!response.ok) {
                  setError(data?.error || 'Invalid email or password.')
                  return
                }

                if (typeof window !== 'undefined') {
                  const profile = {
                    ...data.admin,
                    avatarUrl: normalizeAvatarUrl(data?.admin?.avatarUrl)
                  }
                  localStorage.setItem('admin_token', data.token)
                  localStorage.setItem('admin_profile', JSON.stringify(profile))
                }

                router.push('/home')
              } catch {
                setError('API connection failed. Check API server and URL.')
              } finally {
                setIsSubmitting(false)
              }
            }}
            className='relative flex flex-col gap-5'
          >
            {error && <Alert severity='error'>{error}</Alert>}
            <CustomTextField
              autoFocus
              fullWidth
              label='Email'
              placeholder='Enter your email'
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <CustomTextField
              fullWidth
              label='Password'
              placeholder='············'
              type={isPasswordShown ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton edge='end' onClick={handleClickShowPassword} onMouseDown={e => e.preventDefault()}>
                        <i className={isPasswordShown ? 'bx-hide' : 'bx-show'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />
            <Button fullWidth variant='contained' type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>
            <div className='flex justify-center items-center flex-wrap gap-2'>
              <Typography>New on our platform?</Typography>
              <Typography component={Link} href='/register' color='primary.main'>
                Create an account
              </Typography>
            </div>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LoginView
