import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TurboAgenda',
    short_name: 'TurboAgenda',
    description: 'Agenda online para negocios, citas y recordatorios.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#10b981',
    orientation: 'portrait',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/pwa-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
