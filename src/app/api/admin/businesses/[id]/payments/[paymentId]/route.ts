import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError } from '@/lib/api-helpers'
import { validatePlatformAdmin } from '@/lib/admin'

const AdminPaymentPatchSchema = z.object({
  method: z.string().trim().min(1).max(60).optional(),
  reference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['voided']).optional(),
  voided_reason: z.string().trim().max(500).nullable().optional(),
})

type Ctx = { params: Promise<{ id: string; paymentId: string }> }

type PaymentRow = {
  id: string
  business_id: string
  subscription_id: string | null
  plan: 'basic' | 'plus'
  amount_cents: number
  currency: string
  paid_at: string
  period_start: string
  period_end: string
  method: string
  reference: string | null
  notes: string | null
  status?: 'paid' | 'voided'
}

type SubscriptionRow = {
  id: string
  business_id: string
  plan: 'trial' | 'basic' | 'plus'
  status: 'trial' | 'active' | 'cancelled' | 'past_due'
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  last_payment_at: string | null
  price_cents: number | null
  currency: string | null
}

function monthsCovered(startValue: string, endValue: string) {
  const start = new Date(startValue)
  const end = new Date(endValue)
  const rawMonths =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  return Math.max(1, rawMonths)
}

async function recalculateSubscription(
  supabase: Awaited<ReturnType<typeof validatePlatformAdmin>>['supabase'],
  businessId: string
) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id,business_id,plan,status,trial_ends_at,current_period_start,current_period_end,last_payment_at,price_cents,currency')
    .eq('business_id', businessId)
    .maybeSingle()

  const { data: latestPaid, error: latestError } = await supabase
    .from('admin_subscription_payments')
    .select('id,plan,amount_cents,currency,paid_at,period_start,period_end,status')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) throw new Error(latestError.message)

  const now = new Date()
  const currentSubscription = subscription as SubscriptionRow | null

  if (latestPaid) {
    const payment = latestPaid as PaymentRow
    const periodEnd = new Date(payment.period_end)
    const monthlyPriceCents = Math.round(
      payment.amount_cents / monthsCovered(payment.period_start, payment.period_end)
    )

    const { data: updated, error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          business_id: businessId,
          plan: payment.plan,
          status: periodEnd > now ? 'active' : 'past_due',
          current_period_start: payment.period_start,
          current_period_end: payment.period_end,
          last_payment_at: payment.paid_at,
          price_cents: monthlyPriceCents,
          currency: payment.currency,
          manual_override: true,
        },
        { onConflict: 'business_id' }
      )
      .select('id,plan,status,current_period_start,current_period_end,last_payment_at,price_cents,currency')
      .single()

    if (error) throw new Error(error.message)
    return { before: currentSubscription, after: updated }
  }

  const trialEndsAt = currentSubscription?.trial_ends_at ?? null
  const hasActiveTrial = trialEndsAt ? new Date(trialEndsAt) > now : false
  const fallbackStatus = hasActiveTrial ? 'trial' : 'past_due'

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        business_id: businessId,
        plan: 'trial',
        status: fallbackStatus,
        current_period_start: null,
        current_period_end: trialEndsAt,
        last_payment_at: null,
        price_cents: 0,
        currency: currentSubscription?.currency ?? 'EUR',
        manual_override: true,
      },
      { onConflict: 'business_id' }
    )
    .select('id,plan,status,current_period_start,current_period_end,last_payment_at,price_cents,currency')
    .single()

  if (error) throw new Error(error.message)
  return { before: currentSubscription, after: updated }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { supabase, user, isAdmin } = await validatePlatformAdmin()
    if (!isAdmin || !user) return handleError('Admin nao autorizado', 403)

    const { id, paymentId } = await params
    const body = await request.json()
    const parsed = AdminPaymentPatchSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { data: beforePayment, error: beforeError } = await supabase
      .from('admin_subscription_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('business_id', id)
      .maybeSingle()

    if (beforeError) return handleError(beforeError.message, 422)
    if (!beforePayment) return handleError('Cobro no encontrado', 404)

    const updatePatch = {
      ...(parsed.data.method !== undefined ? { method: parsed.data.method } : {}),
      ...(parsed.data.reference !== undefined ? { reference: parsed.data.reference || null } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      ...(parsed.data.status === 'voided'
        ? {
            status: 'voided',
            voided_at: new Date().toISOString(),
            voided_by: user.id,
            voided_reason: parsed.data.voided_reason || 'Anulado manualmente por admin',
          }
        : {}),
      updated_at: new Date().toISOString(),
    }

    const { data: payment, error: updateError } = await supabase
      .from('admin_subscription_payments')
      .update(updatePatch)
      .eq('id', paymentId)
      .eq('business_id', id)
      .select('*')
      .single()

    if (updateError) return handleError(updateError.message, 422)

    const recalculated =
      parsed.data.status === 'voided' ? await recalculateSubscription(supabase, id) : null

    const { error: auditError } = await supabase.from('admin_audit_log').insert({
      business_id: id,
      admin_user_id: user.id,
      admin_email: user.email,
      action: parsed.data.status === 'voided' ? 'admin_payment_voided' : 'admin_payment_updated',
      before_state: beforePayment,
      after_state: {
        payment,
        subscription: recalculated,
      },
    })

    if (auditError) {
      console.error('[admin payment audit] insert failed', auditError)
    }

    return formatResponse({ payment, subscription: recalculated?.after ?? null })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const body = await request.json().catch(() => ({}))
    return PATCH(
      new Request(request.url, {
        method: 'PATCH',
        headers: request.headers,
        body: JSON.stringify({ status: 'voided', voided_reason: body?.voided_reason ?? null }),
      }) as NextRequest,
      { params }
    )
  } catch (err) {
    return handleError(err)
  }
}
