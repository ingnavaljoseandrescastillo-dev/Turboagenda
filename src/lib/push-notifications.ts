import type { SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTime, formatCurrency, normalizeTimeZone } from '@/lib/utils'

type AdminClient = SupabaseClient

type PushAudience = 'business' | 'admin'

type PushSubscriptionRow = {
  id: string
  user_id: string
  business_id: string | null
  audience: PushAudience
  endpoint: string
  p256dh: string
  auth: string
}

type AppointmentPushData = {
  id: string
  client_name: string
  client_phone: string | null
  start_time: string
  businesses: {
    id: string
    name: string
    slug: string
  } | null
  services: {
    name: string
  } | null
  employees: {
    name: string
  } | null
  business_settings: {
    time_zone: string | null
  } | null
}

type SubscriptionDueRow = {
  id: string
  business_id: string
  plan: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  price_cents: number | null
  currency: string | null
  businesses: {
    id: string
    name: string
    slug: string
    is_paused: boolean | null
  } | null
}

type PushPayload = {
  title: string
  body: string
  url: string
}

type PushResult = {
  subscriptions: number
  sent: number
  failed: number
  skipped: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const LISBON_TIME_ZONE = 'Europe/Lisbon'

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
}

export function assertPushConfigured() {
  const publicKey = getVapidPublicKey()
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) throw new Error('Web Push VAPID keys are not configured')

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:ingnavaljoseandrescastillo@gmail.com',
    publicKey,
    privateKey
  )
}

export async function sendAppointmentCreatedPush(appointmentId: string) {
  try {
    const admin = createAdminClient()
    const appointment = await loadAppointmentPushData(admin, appointmentId)
    if (!appointment?.businesses) return

    const business = appointment.businesses
    const timeZone = normalizeTimeZone(appointment.business_settings?.time_zone)
    const when = formatDateTime(appointment.start_time, timeZone)
    const serviceName = appointment.services?.name ?? 'Servico'
    const employeeName = appointment.employees?.name ?? 'Profissional'

    await sendPushToBusiness(admin, business.id, {
      title: `Nova reserva em ${business.name}`,
      body: `${appointment.client_name} marcou ${serviceName} com ${employeeName} para ${when}.`,
      url: '/dashboard/appointments',
    })
  } catch (err) {
    console.error('[push appointment created] failed', err)
  }
}

export async function sendAdminBusinessRegisteredPush({
  businessId,
  businessName,
}: {
  businessId: string
  businessName: string
}) {
  try {
    await sendPushToAdmins(createAdminClient(), {
      title: 'Novo negocio registado',
      body: `${businessName} criou conta no TurboAgenda.`,
      url: `/admin/businesses/${businessId}`,
    })
  } catch (err) {
    console.error('[push business registered] failed', err)
  }
}

export async function sendSubscriptionExpiryPushReminders(
  admin: AdminClient,
  options: { now?: Date; daysAhead?: number } = {}
) {
  const now = options.now ?? new Date()
  const daysAhead = options.daysAhead ?? 1
  const targetDateKey = getDateKey(new Date(now.getTime() + daysAhead * DAY_MS), LISBON_TIME_ZONE)
  const result = { scanned: 0, due: 0, sent: 0, failed: 0, skipped: 0 }

  const { data, error } = await admin
    .from('subscriptions')
    .select('id, business_id, plan, status, trial_ends_at, current_period_end, price_cents, currency, businesses(id, name, slug, is_paused)')
    .in('status', ['trial', 'active', 'past_due'])
    .limit(1000)

  if (error) throw new Error(error.message)

  const subscriptions = (data ?? []) as unknown as SubscriptionDueRow[]
  result.scanned = subscriptions.length

  const dueSubscriptions = subscriptions.filter((subscription) => {
    const dueAt = getSubscriptionDueAt(subscription)
    if (!dueAt || !subscription.businesses || subscription.businesses.is_paused) return false
    return getDateKey(new Date(dueAt), LISBON_TIME_ZONE) === targetDateKey
  })

  result.due = dueSubscriptions.length
  for (const subscription of dueSubscriptions) {
    const business = subscription.businesses
    const dueAt = getSubscriptionDueAt(subscription)
    if (!business || !dueAt) {
      result.skipped += 1
      continue
    }

    const eventKey = `subscription-expiry:${business.id}:${targetDateKey}`
    const wasClaimed = await claimPushEvent(admin, {
      eventKey,
      audience: 'admin',
      businessId: business.id,
      title: 'Cliente por vencer',
      body: `${business.name} vence manana. Revisa si pago antes de desactivar.`,
    })

    if (!wasClaimed) {
      result.skipped += 1
      continue
    }

    const amount = formatCurrency((subscription.price_cents ?? 0) / 100, subscription.currency ?? 'EUR')
    const sendResult = await sendPushToAdmins(admin, {
      title: 'Cliente por vencer',
      body: `${business.name} vence manana (${amount}). Revisa si pago antes de desactivar.`,
      url: `/admin/businesses/${business.id}`,
    })

    result.sent += sendResult.sent
    result.failed += sendResult.failed
    result.skipped += sendResult.skipped
  }

  return result
}

export async function sendPushToBusiness(admin: AdminClient, businessId: string, payload: PushPayload) {
  return sendPushToSubscriptions(admin, payload, { audience: 'business', businessId })
}

export async function sendPushToAdmins(admin: AdminClient, payload: PushPayload) {
  return sendPushToSubscriptions(admin, payload, { audience: 'admin' })
}

async function sendPushToSubscriptions(
  admin: AdminClient,
  payload: PushPayload,
  scope: { audience: PushAudience; businessId?: string }
): Promise<PushResult> {
  try {
    assertPushConfigured()
  } catch (err) {
    console.error('[push] not configured', err)
    return { subscriptions: 0, sent: 0, failed: 0, skipped: 1 }
  }

  let query = admin
    .from('push_subscriptions')
    .select('id, user_id, business_id, audience, endpoint, p256dh, auth')
    .eq('audience', scope.audience)

  if (scope.businessId) {
    query = query.eq('business_id', scope.businessId)
  }

  const { data, error } = await query.limit(500)
  if (error) throw new Error(error.message)

  const subscriptions = (data ?? []) as PushSubscriptionRow[]
  const result = { subscriptions: subscriptions.length, sent: 0, failed: 0, skipped: 0 }

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload)
      )
      result.sent += 1
    } catch (err) {
      result.failed += 1
      if (isExpiredPushSubscription(err)) {
        await admin.from('push_subscriptions').delete().eq('id', subscription.id)
      } else {
        console.error('[push] send failed', err)
      }
    }
  }

  return result
}

async function loadAppointmentPushData(admin: AdminClient, appointmentId: string) {
  const { data, error } = await admin
    .from('appointments')
    .select('id, client_name, client_phone, start_time, businesses(id, name, slug), services(name), employees(name)')
    .eq('id', appointmentId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const appointment = data as unknown as Omit<AppointmentPushData, 'business_settings'> | null
  if (!appointment?.businesses) return null

  const { data: settings, error: settingsError } = await admin
    .from('business_settings')
    .select('time_zone')
    .eq('business_id', appointment.businesses.id)
    .maybeSingle()

  if (settingsError) console.error('[push appointment created] settings lookup failed', settingsError)
  return {
    ...appointment,
    business_settings: (settings as AppointmentPushData['business_settings']) ?? null,
  }
}

async function claimPushEvent(
  admin: AdminClient,
  event: {
    eventKey: string
    audience: PushAudience
    businessId: string | null
    title: string
    body: string
  }
) {
  const { error } = await admin.from('push_notification_events').insert({
    event_key: event.eventKey,
    audience: event.audience,
    business_id: event.businessId,
    title: event.title,
    body: event.body,
    status: 'queued',
  })

  if (!error) return true
  if (error.code === '23505') return false
  throw new Error(error.message)
}

function getSubscriptionDueAt(subscription: SubscriptionDueRow) {
  if (subscription.status === 'trial' || subscription.plan === 'trial') {
    return subscription.trial_ends_at ?? subscription.current_period_end
  }

  return subscription.current_period_end ?? subscription.trial_ends_at
}

function getDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}`
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? ''
}

function isExpiredPushSubscription(err: unknown) {
  const statusCode = typeof err === 'object' && err && 'statusCode' in err ? Number(err.statusCode) : 0
  return statusCode === 404 || statusCode === 410
}
