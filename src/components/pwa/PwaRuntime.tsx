'use client'

import { useEffect } from 'react'

export function PwaRuntime() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.warn('[pwa] service worker registration failed', error)
      })
    }

    window.addEventListener('load', registerServiceWorker)

    return () => {
      window.removeEventListener('load', registerServiceWorker)
    }
  }, [])

  return null
}
