// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

export const metadata = {
  title: 'Sneat - MUI Next.js Admin Dashboard Template',
  description:
    'Sneat - MUI Next.js Admin Dashboard Template - is the most developer friendly & highly customizable Admin Dashboard Template based on MUI v5.'
}

async function fetchAdminSiteIconUrl() {
  const rawApiProxyTarget = (process.env.API_PROXY_TARGET ?? process.env.API_BASE_URL ?? 'http://api:4000').replace(/\/+$/, '')
  const apiBaseUrl = rawApiProxyTarget.endsWith('/api') ? rawApiProxyTarget.slice(0, -4) : rawApiProxyTarget

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/settings/general`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch settings (${response.status})`)
    }

    const data = await response.json()
    const icon = String(data?.content?.siteIconUrl || '').trim()

    if (!icon) return '/images/branding/meri-logo-mark.svg'
    
return icon
  } catch {
    return '/images/branding/meri-logo-mark.svg'
  }
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  // Vars

  const systemMode = await getSystemMode()
  const direction = 'ltr'
  const siteIconUrl = await fetchAdminSiteIconUrl()

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
      <head>
        <link rel='icon' href={siteIconUrl} />
        <link rel='shortcut icon' href={siteIconUrl} />
        <link rel='apple-touch-icon' href={siteIconUrl} />
        <link
          rel='stylesheet'
          href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
        />
      </head>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
