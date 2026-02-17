'use client'

import type { CSSProperties } from 'react'

import { useTheme } from '@mui/material/styles'

type LogoProps = {
  color?: CSSProperties['color']
  height?: number
  maxWidth?: number
}

const Logo = ({ color, height = 34, maxWidth = 160 }: LogoProps) => {
  const theme = useTheme()
  void color

  return (
    <div className='flex items-center'>
      <img
        src={theme.palette.mode === 'dark' ? '/images/branding/meri-logo-white.svg' : '/images/branding/meri-logo-black.svg'}
        alt='Meri Boarding'
        style={{ height, width: 'auto', maxWidth, objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}

export default Logo
