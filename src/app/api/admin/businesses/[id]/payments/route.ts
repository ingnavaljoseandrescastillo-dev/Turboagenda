import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError } from '@/lib/api-helpers'
import { validatePlatformAdmin } from '@/lib/admin'

const AdminPaymentSchema = z.object({
  plan: z.enum(['basic', 'plus']),
  amount_cents: z.number().int().min(0),
  months: z.number().int().min(1).max(24).default(1),
  currency: z.string().trim().min(3).max(3).default('EUR'),
  paid_at: z.string().datetime().optional(),
  method: z.string().trim().min(1).max(60).default('manual'),
  reference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { supabase, user, isAdmin } = await validatePlatformAdmin()
    if (!isAdmin || !user) return handleError('Admin nao autorizado', 403)

    const { id } = await params
    const body = await request.json()
    const parsed = AdminPaymentSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { plan, amount_cents, months, currency, paid_at, method, reference, notes } = parsed.data

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, subscriptions(id,plan,status,current_period_end,price_cents,currency)')
      .eq('id', id)
      .maybeSingle()

    if (businessError) return handleError(businessError.message, 422)
    if (!business) return handleError('Negocio no encontrado', 404)

    const subscription = Array.isArray(business.subscriptions)
      ? business.subscriptions[0] ?? null
      : business.subscriptions

    const paidAt = paid_at ? new Date(paid_at) : new Date()
    const currentEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null
    const periodStart = currentEnd && currentEnd > paidAt ? currentEnd : paidAt
    const periodEnd = addMonths(periodStart, months)
    const monthlyPriceCents = Math.round(amount_cents / months)

    const { data: updatedSubscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          business_id: id,
          plan,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          last_payment_at: paidAt.toISOString(),
          price_cents: monthlyPriceCents,
          currency,
          manual_override: true,
        },
        { onConflict: 'business_id' }
      )
      .select('id,plan,status,current_period_start,current_period_end,last_payment_at,price_cents,currency')
      .single()

    if (subscriptionError) return handleError(subscriptionError.message, 422)

    const { data: payment, error: paymentError } = await supabase
      .from('admin_subscription_payments')
      .insert({
        business_id: id,
        subscription_id: updatedSubscription.id,
        admin_user_id: user.id,
        admin_email: user.email,
        plan,
        amount_cents,
        currency,
        paid_at: paidAt.toISOString(),
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        method,
        reference: reference || null,
        notes: notes || null,
        status: 'paid',
      })
      .select('id,amount_cents,currency,paid_at,period_start,period_end,status')
      .single()

    if (paymentError) return handleError(paymentError.message, 422)

    const { error: auditError } = await supabase.from('admin_audit_log').insert({
      business_id: id,
      admin_user_id: user.id,
      admin_email: user.email,
      action: 'admin_payment_recorded',
      before_state: subscription ?? null,
      after_state: {
        payment,
        subscription: updatedSubscription,
      },
    })

    if (auditError) {
      console.error('[admin payment audit] insert failed', auditError)
    }

    return formatResponse({ payment, subscription: updatedSubscription })
  } catch (err) {
    return handleError(err)
  }
}
