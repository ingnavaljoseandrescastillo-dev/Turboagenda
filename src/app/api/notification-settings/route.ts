import type { NextRequest } from 'next/server'
import { NotificationSettingsSchema } from '@/lib/validators'
import {
  ensureBusinessBootstrapRows,
  formatResponse,
  getBusinessForUser,
  handleError,
  validateAuth,
} from '@/lib/api-helpers'

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    await ensureBusinessBootstrapRows(supabase, user.id, business.id)
    const plan = await getSubscriptionPlan(supabase, business.id)
    const whatsappAvailable = plan === 'plus'

    const { data, error } = await supabase
      .from('business_settings')
      .select(
        'email_notify_client_on_booking, email_notify_business_on_booking, email_reminder_24h_enabled, email_notify_client_on_cancellation, sms_reminder_24h_enabled, whatsapp_enabled, whatsapp_notify_client_on_booking, whatsapp_notify_business_on_booking, whatsapp_reminder_24h_enabled, whatsapp_birthday_enabled'
          + ', email_rebooking_reminder_enabled, email_rebooking_reminder_delay_days, email_rebooking_reminder_message, whatsapp_rebooking_reminder_enabled, whatsapp_rebooking_reminder_delay_days, whatsapp_rebooking_reminder_message'
      )
      .eq('business_id', business.id)
      .maybeSingle()

    if (error) return handleError(error.message, 422)
    const settings = (data ?? {}) as Record<string, unknown> & { whatsapp_enabled?: boolean }
    return formatResponse({
      ...settings,
      whatsapp_enabled: whatsappAvailable ? Boolean(settings.whatsapp_enabled) : false,
      whatsapp_available: whatsappAvailable,
      plan,
    })
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const body = await request.json()
    const parsed = NotificationSettingsSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)
    const plan = await getSubscriptionPlan(supabase, business.id)
    const whatsappAvailable = plan === 'plus'
    if (!whatsappAvailable && parsed.data.whatsapp_enabled) {
      return handleError('WhatsApp esta disponible solo en el Plan Plus. El Plan Basic mantiene recordatorios por email.', 403)
    }

    const { data, error } = await supabase
      .from('business_settings')
      .update({
        ...parsed.data,
        whatsapp_enabled: whatsappAvailable ? parsed.data.whatsapp_enabled : false,
        whatsapp_rebooking_reminder_enabled: whatsappAvailable
          ? parsed.data.whatsapp_rebooking_reminder_enabled
          : false,
      })
      .eq('business_id', business.id)
      .select(
        'email_notify_client_on_booking, email_notify_business_on_booking, email_reminder_24h_enabled, email_notify_client_on_cancellation, sms_reminder_24h_enabled, email_rebooking_reminder_enabled, email_rebooking_reminder_delay_days, email_rebooking_reminder_message, whatsapp_enabled, whatsapp_notify_client_on_booking, whatsapp_notify_business_on_booking, whatsapp_reminder_24h_enabled, whatsapp_birthday_enabled, whatsapp_rebooking_reminder_enabled, whatsapp_rebooking_reminder_delay_days, whatsapp_rebooking_reminder_message'
      )
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse({
      ...data,
      whatsapp_enabled: whatsappAvailable ? Boolean(data?.whatsapp_enabled) : false,
      whatsapp_available: whatsappAvailable,
      plan,
    })
  } catch (err) {
    return handleError(err)
  }
}

async function getSubscriptionPlan(
  supabase: Awaited<ReturnType<typeof validateAuth>>['supabase'],
  businessId: string
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.plan ?? 'trial'
}
