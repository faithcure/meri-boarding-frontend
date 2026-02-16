'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import { styled, useTheme } from '@mui/material/styles'
import classnames from 'classnames'
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'
import themeConfig from '@configs/themeConfig'
import { useSettings } from '@core/hooks/useSettings'

const RegisterIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 600,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: {
    maxBlockSize: 550
  },
  [theme.breakpoints.down('lg')]: {
    maxBlockSize: 450
  }
}))

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
  const { settings } = useSettings()
  const theme = useTheme()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          { 'border-ie': settings.skin === 'bordered' }
        )}
      >
        <RegisterIllustration
          src='/images/illustrations/characters-with-objects/8.png'
          alt='register-illustration'
          className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })}
        />
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[520px]'>
        <Link href='/login' className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </Link>
        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[420px] md:max-is-[unset] mbs-11 sm:mbs-14 md:mbs-0'>
          <div className='flex flex-col gap-1'>
            <Typography variant='h4'>{`Create account for ${themeConfig.templateName}`}</Typography>
            <Typography>Your account will be reviewed by admin before login is allowed.</Typography>
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
            className='flex flex-col gap-5'
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

            <Divider className='gap-2 text-textPrimary'>or</Divider>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterView
