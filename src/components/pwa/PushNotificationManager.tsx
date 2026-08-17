'use client'

import { useEffect, useState } from 'react'

type PushNotificationManagerProps = {
  audience: 'business' | 'admin'
  businessId?: string | null
}

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied' | 'loading' | 'subscribed'

export function PushNotificationManager({ audience, businessId }: PushNotificationManagerProps) {
  const [state, setState] = useState<PermissionState>('loading')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      if (!isPushSupported()) {
        setState('unsupported')
        return
      }

      setState(Notification.permission as PermissionState)
    })
  }, [])

  if (state === 'unsupported' || state === 'denied' || state === 'subscribed' || state === 'granted') {
    return null
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setIsSaving(true)
        try {
          await subscribeToPush({ audience, businessId })
          setState('subscribed')
        } catch (err) {
          console.warn('[push] subscription failed', err)
          if (Notification.permission === 'denied') setState('denied')
          else setState(Notification.permission as PermissionState)
        } finally {
          setIsSaving(false)
        }
      }}
      disabled={isSaving}
      className="fixed bottom-24 right-4 z-50 rounded-full border border-emerald-400/30 bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-70 md:bottom-6"
    >
      {isSaving ? 'Activando...' : 'Activar avisos'}
    </button>
  )
}

async function subscribeToPush({
  audience,
  businessId,
}: {
  audience: 'business' | 'admin'
  businessId?: string | null
}) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission not granted')

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: await getApplicationServerKey(),
    }))

  const response = await fetch('/api/push-subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audience,
      businessId,
      subscription: subscription.toJSON(),
    }),
  })

  if (!response.ok) throw new Error('Push subscription save failed')
}

async function getApplicationServerKey() {
  const response = await fetch('/api/push-subscriptions', { cache: 'no-store' })
  if (!response.ok) throw new Error('Push public key lookup failed')

  const payload = (await response.json()) as { data?: { publicKey?: string } }
  const publicKey = payload.data?.publicKey
  if (!publicKey) throw new Error('Push public key is not configured')

  return urlBase64ToUint8Array(publicKey)
}

function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
