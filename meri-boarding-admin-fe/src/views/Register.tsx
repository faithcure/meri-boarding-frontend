'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

const RegisterView = () => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  return (
    <Box className='relative flex min-bs-[100dvh] items-center justify-center p-6 pt-40 sm:p-10 sm:pt-44 bg-backgroundDefault'>
      <div className='pointer-events-none fixed left-1/2 top-6 z-20 -translate-x-1/2 sm:top-8'>
        <Logo height={112} maxWidth={520} />
      </div>

      <Card className='w-full max-w-[560px]'>
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

          <div className='relative mb-6 flex flex-col gap-1 items-center text-center'>
            <Typography variant='h4'>Create account</Typography>
            <Typography>Your account will be reviewed by admin before login is allowed.</Typography>
            <Divider flexItem className='my-2' />
            <Typography color='text.secondary' className='max-w-[460px]'>
              Please submit your membership details and notify the admin. Your assignment will be activated by the
              administrator.
            </Typography>
          </div>

          <form
            noValidate
            autoComplete='off'
            onSubmit={async event => {
              event.preventDefault()
              setError('')
              setSuccess('')

              if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
                setError('First name, last name, email and password are required.')
                return
              }

              setIsSubmitting(true)

              try {
                const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    password
                  })
                })

                const data = await response.json()
                if (!response.ok) {
                  setError(data?.error || 'Registration failed.')
                  return
                }

                setSuccess('Registration submitted. Wait for admin approval.')
                setTimeout(() => router.push('/login'), 1500)
              } catch {
                setError('API connection failed. Check API server and URL.')
              } finally {
                setIsSubmitting(false)
              }
            }}
            className='relative flex flex-col gap-5'
          >
            {error ? <Alert severity='error'>{error}</Alert> : null}
            {success ? <Alert severity='success'>{success}</Alert> : null}

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <CustomTextField label='First Name' value={firstName} onChange={e => setFirstName(e.target.value)} fullWidth />
              <CustomTextField label='Last Name' value={lastName} onChange={e => setLastName(e.target.value)} fullWidth />
            </div>

            <CustomTextField label='Email' value={email} onChange={e => setEmail(e.target.value)} fullWidth />
            <CustomTextField label='Phone (optional)' value={phone} onChange={e => setPhone(e.target.value)} fullWidth />
            <CustomTextField
              label='Password'
              placeholder='At least 6 characters'
              type={isPasswordShown ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
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
              {isSubmitting ? 'Submitting...' : 'Create Account'}
            </Button>

            <div className='flex justify-center items-center flex-wrap gap-2'>
              <Typography>Already have an account?</Typography>
              <Typography component={Link} href='/login' color='primary.main'>
                Sign in
              </Typography>
            </div>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}

export default RegisterView
