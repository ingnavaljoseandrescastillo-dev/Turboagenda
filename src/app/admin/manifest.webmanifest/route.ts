import type { MetadataRoute } from 'next'

const adminManifest: MetadataRoute.Manifest = {
  name: 'TurboAdmin',
  short_name: 'TurboAdmin',
  description: 'Panel interno de administracion de TurboAgenda.',
  start_url: '/admin',
  scope: '/admin',
  display: 'standalone',
  background_color: '#09090b',
  theme_color: '#2563eb',
  orientation: 'portrait',
  categories: ['business', 'productivity'],
  icons: [
    {
      src: '/admin-pwa-icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/admin-pwa-icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/admin-pwa-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}

export function GET() {
  return Response.json(adminManifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  })
}
