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

export type MessageFailureEvent = {
  id: string
  business_id: string
  appointment_id: string | null
  channel: string
  event_type: string
  recipient_name: string | null
  recipient_phone: string | null
  status: string
  error: string | null
  payload: Record<string, unknown> | null
  provider_message_id?: string | null
  provider_status?: string | null
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

export async function sendMessageFailurePush(
  admin: AdminClient,
  event: MessageFailureEvent,
  options: { notifyBusiness?: boolean } = {}
) {
  try {
    const [business, appointment] = await Promise.all([
      loadBusinessForPush(admin, event.business_id),
      event.appointment_id ? loadAppointmentForPush(admin, event.appointment_id) : Promise.resolve(null),
    ])

    if (!business) return

    const channel = event.channel.toUpperCase()
    const recipient = event.recipient_name || event.recipient_phone || 'cliente'
    const reason = event.error || event.provider_status || 'sem detalhe do provedor'
    const appointmentText = appointment
      ? ` Cita: ${appointment.client_name}, ${formatDateTime(appointment.start_time)}.`
      : ''

    const adminEventKey = `message-failed:admin:${event.id}:${event.provider_status ?? event.status}`
    const adminClaimed = await claimPushEvent(admin, {
      eventKey: adminEventKey,
      audience: 'admin',
      businessId: event.business_id,
      title: `${channel} fallido`,
      body: `${business.name}: fallo el mensaje para ${recipient}.${appointmentText} Motivo: ${reason}`,
    })

    if (adminClaimed) {
      await sendPushToAdmins(admin, {
        title: `${channel} fallido`,
        body: `${business.name}: fallo el mensaje para ${recipient}.${appointmentText}`,
        url: `/admin/businesses/${event.business_id}`,
      })
    }

    if (!options.notifyBusiness || event.channel !== 'sms' || event.event_type !== 'appointment_reminder_24h') return

    const businessEventKey = `message-failed:business:${event.id}:${event.provider_status ?? event.status}`
    const businessClaimed = await claimPushEvent(admin, {
      eventKey: businessEventKey,
      audience: 'business',
      businessId: event.business_id,
      title: 'SMS nao entregue',
      body: `O lembrete por SMS para ${recipient} nao foi entregue. Confirma o telefone do cliente.`,
    })

    if (businessClaimed) {
      await sendPushToBusiness(admin, event.business_id, {
        title: 'SMS nao entregue',
        body: `O lembrete por SMS para ${recipient} nao foi entregue. Confirma o telefone do cliente.`,
        url: '/dashboard/clients',
      })
    }
  } catch (err) {
    console.error('[push message failure] failed', err)
  }
}

export async function sendSubscriptionExpiryPushReminders(
  admin: AdminClient,
  options: { now?: Date; daysAhead?: number; audience?: PushAudience } = {}
) {
  const now = options.now ?? new Date()
  const daysAhead = options.daysAhead ?? 1
  const audience = options.audience ?? 'admin'
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

    const amount = formatCurrency((subscription.price_cents ?? 0) / 100, subscription.currency ?? 'EUR')
    const notice = buildSubscriptionExpiryNotice({
      audience,
      business,
      amount,
      daysAhead,
    })
    const eventKey = `subscription-expiry:${audience}:${business.id}:${targetDateKey}:${daysAhead}`
    const wasClaimed = await claimPushEvent(admin, {
      eventKey,
      audience,
      businessId: business.id,
      title: notice.title,
      body: notice.body,
    })

    if (!wasClaimed) {
      result.skipped += 1
      continue
    }

    const sendResult =
      audience === 'admin'
        ? await sendPushToAdmins(admin, {
            ...notice,
            url: `/admin/businesses/${business.id}`,
          })
        : await sendPushToBusiness(admin, business.id, {
            ...notice,
            url: '/dashboard/settings',
          })

    result.sent += sendResult.sent
    result.failed += sendResult.failed
    result.skipped += sendResult.skipped
  }

  return result
}

function buildSubscriptionExpiryNotice({
  audience,
  business,
  amount,
  daysAhead,
}: {
  audience: PushAudience
  business: NonNullable<SubscriptionDueRow['businesses']>
  amount: string
  daysAhead: number
}) {
  if (audience === 'business') {
    return {
      title: 'A tua subscricao vence em breve',
      body: `A subscricao do ${business.name} vence em ${daysAhead} dias (${amount}). Regulariza para manter os avisos ativos.`,
    }
  }

  return {
    title: 'Cliente por vencer',
    body:
      daysAhead === 1
        ? `${business.name} vence manana (${amount}). Revisa si pago antes de desactivar.`
        : `${business.name} vence en ${daysAhead} dias (${amount}). Revisa si pago antes de desactivar.`,
  }
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

  const serviceNames = await loadAppointmentServiceNames(admin, appointmentId, appointment.services?.name)

  return {
    ...appointment,
    services: serviceNames ? { name: serviceNames } : appointment.services,
    business_settings: (settings as AppointmentPushData['business_settings']) ?? null,
  }
}

async function loadAppointmentServiceNames(admin: AdminClient, appointmentId: string, fallback: string | undefined) {
  const { data, error } = await admin
    .from('appointment_services')
    .select('position, services(name)')
    .eq('appointment_id', appointmentId)
    .order('position', { ascending: true })

  if (error) {
    console.error('[push appointment created] service list lookup failed', error)
    return fallback
  }

  const rows = (data ?? []) as unknown as Array<{ services: { name: string } | { name: string }[] | null }>
  const names = rows
    .map((row) => {
      const service = Array.isArray(row.services) ? row.services[0] : row.services
      return service?.name
    })
    .filter((name): name is string => Boolean(name))

  return names.length > 0 ? names.join(' + ') : fallback
}

async function loadBusinessForPush(admin: AdminClient, businessId: string) {
  const { data, error } = await admin
    .from('businesses')
    .select('id, name, slug')
    .eq('id', businessId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as { id: string; name: string; slug: string } | null
}

async function loadAppointmentForPush(admin: AdminClient, appointmentId: string) {
  const { data, error } = await admin
    .from('appointments')
    .select('id, client_name, start_time')
    .eq('id', appointmentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as { id: string; client_name: string; start_time: string } | null
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
