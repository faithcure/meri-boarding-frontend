'use client'

import type { CSSProperties } from 'react'

import { useTheme } from '@mui/material/styles'

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  const theme = useTheme()
  void color

  return (
    <div className='flex items-center'>
      <img
        src={theme.palette.mode === 'dark' ? '/images/branding/meri-logo-white.svg' : '/images/branding/meri-logo-black.svg'}
        alt='Meri Boarding'
        style={{ height: 34, width: 'auto', maxWidth: 160, objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}

export default Logo
