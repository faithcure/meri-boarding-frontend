'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

type AdminAuthGuardProps = {
  children: ReactNode
}

function getApiBaseUrl() {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()

  if (
    configuredApiBaseUrl.startsWith('http://localhost') ||
    configuredApiBaseUrl.startsWith('https://localhost')
  ) {
    return ''
  }

  return configuredApiBaseUrl
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    const verifySession = async () => {
      const token = window.localStorage.getItem('admin_token')

      if (!token) {
        if (!cancelled) {
          setIsAuthorized(false)
          setIsChecking(false)
          router.replace(`/login?next=${encodeURIComponent(pathname || '/home')}`)
        }

        return
      }

      try {
        const apiBaseUrl = getApiBaseUrl()
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: 'no-store'
        })

        if (!response.ok) {
          throw new Error(`Session check failed with status ${response.status}`)
        }

        if (!cancelled) {
          setIsAuthorized(true)
          setIsChecking(false)
        }
      } catch {
        window.localStorage.removeItem('admin_token')
        window.localStorage.removeItem('admin_profile')

        if (!cancelled) {
          setIsAuthorized(false)
          setIsChecking(false)
          router.replace(`/login?next=${encodeURIComponent(pathname || '/home')}`)
        }
      }
    }

    void verifySession()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  if (isChecking) {
    return (
      <Box className='flex min-bs-screen items-center justify-center p-6'>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
