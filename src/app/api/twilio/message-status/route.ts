import type { NextRequest } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessageFailurePush, type MessageFailureEvent } from '@/lib/push-notifications'

const FAILURE_STATUSES = new Set(['failed', 'undelivered'])
const SUCCESS_STATUSES = new Set(['sent', 'delivered'])

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = request.headers.get('x-twilio-signature') ?? ''
  const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL ?? 'https://turboagenda.pt/api/twilio/message-status'
  const formData = await request.formData()
  const params = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)]))

  if (!authToken || !twilio.validateRequest(authToken, signature, callbackUrl, params)) {
    return new Response('Forbidden', { status: 403 })
  }

  const messageSid = params.MessageSid
  const providerStatus = params.MessageStatus ?? params.SmsStatus ?? 'unknown'
  if (!messageSid) return Response.json({ ok: true, ignored: true })

  const errorCode = params.ErrorCode || null
  const errorMessage = params.ErrorMessage || null
  const isFailure = FAILURE_STATUSES.has(providerStatus)
  const isSuccess = SUCCESS_STATUSES.has(providerStatus)
  const admin = createAdminClient()
  const updatePayload: Record<string, string | null> = {
    provider_status: providerStatus,
    provider_error_code: errorCode,
    provider_error_message: errorMessage,
  }

  if (isFailure) {
    updatePayload.status = 'failed'
    updatePayload.error = errorMessage ?? errorCode ?? providerStatus
  } else if (isSuccess) {
    updatePayload.status = 'sent'
    updatePayload.error = null
    updatePayload.sent_at = new Date().toISOString()
  }

  const { data, error } = await admin
    .from('notification_events')
    .update(updatePayload)
    .eq('provider_message_id', messageSid)
    .select('id, business_id, appointment_id, channel, event_type, recipient_name, recipient_phone, status, error, payload, provider_message_id, provider_status')
    .maybeSingle()

  if (error) {
    console.error('[twilio status callback] update failed', error)
    return Response.json({ ok: false }, { status: 500 })
  }

  if (isFailure && data) {
    await sendMessageFailurePush(admin, data as MessageFailureEvent, { notifyBusiness: true })
  }

  return Response.json({ ok: true })
}
