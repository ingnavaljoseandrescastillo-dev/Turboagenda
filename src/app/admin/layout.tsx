import type { Metadata } from 'next'
import { PushNotificationManager } from '@/components/pwa/PushNotificationManager'

export const metadata: Metadata = {
  title: {
    default: 'TurboAdmin',
    template: '%s | TurboAdmin',
  },
  applicationName: 'TurboAdmin',
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TurboAdmin',
  },
  icons: {
    icon: [
      { url: '/admin-pwa-icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/admin-pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/admin-pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/admin-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <PushNotificationManager audience="admin" />
    </>
  )
}
