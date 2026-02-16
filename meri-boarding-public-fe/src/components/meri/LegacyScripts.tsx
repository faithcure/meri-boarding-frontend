'use client'

import { useEffect } from 'react'

const legacyScriptPaths = [
  '/js/vendors.js',
  '/js/moment.js',
  '/js/daterangepicker.js',
  '/js/meta-works.js',
  '/js/swiper.js',
  '/js/custom-swiper-1.js',
  '/js/custom-datepicker.js'
] as const

function loadScriptSequentially(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-legacy-src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
      } else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.dataset.legacySrc = src
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

export default function LegacyScripts() {
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      for (const src of legacyScriptPaths) {
        if (cancelled) return
        await loadScriptSequentially(src)
      }

      const win = window as Window & { $?: unknown; jQuery?: unknown }
      if (win.$ && !win.jQuery) {
        win.jQuery = win.$
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
