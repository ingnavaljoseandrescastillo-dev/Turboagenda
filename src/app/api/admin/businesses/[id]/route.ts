import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError } from '@/lib/api-helpers'
import { validatePlatformAdmin } from '@/lib/admin'

const AdminBusinessPatchSchema = z.object({
  is_paused: z.boolean().optional(),
  pause_reason: z.string().nullable().optional(),
  plan: z.enum(['trial', 'basic', 'plus']).optional(),
  status: z.enum(['trial', 'active', 'cancelled', 'past_due']).optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),
  last_payment_at: z.string().datetime().nullable().optional(),
  price_cents: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { supabase, user, isAdmin } = await validatePlatformAdmin()
    if (!isAdmin || !user) return handleError('Admin nao autorizado', 403)

    const { id } = await params
    const body = await request.json()
    const parsed = AdminBusinessPatchSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const {
      is_paused,
      pause_reason,
      plan,
      status,
      trial_ends_at,
      current_period_start,
      current_period_end,
      last_payment_at,
      price_cents,
      notes,
    } = parsed.data

    const { data: beforeBusiness } = await supabase
      .from('businesses')
      .select('id, is_paused, paused_at, pause_reason, subscriptions(plan,status,trial_ends_at,current_period_start,current_period_end,last_payment_at,price_cents,notes,manual_override)')
      .eq('id', id)
      .maybeSingle()

    if (typeof is_paused === 'boolean' || pause_reason !== undefined) {
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          ...(typeof is_paused === 'boolean'
            ? { is_paused, paused_at: is_paused ? new Date().toISOString() : null }
            : {}),
          ...(pause_reason !== undefined ? { pause_reason } : {}),
        })
        .eq('id', id)

      if (businessError) return handleError(businessError.message, 422)
    }

    const subscriptionPatch = {
      ...(plan ? { plan } : {}),
      ...(status ? { status } : {}),
      ...(trial_ends_at !== undefined ? { trial_ends_at } : {}),
      ...(current_period_start !== undefined ? { current_period_start } : {}),
      ...(current_period_end !== undefined ? { current_period_end } : {}),
      ...(last_payment_at !== undefined ? { last_payment_at } : {}),
      ...(price_cents !== undefined ? { price_cents } : {}),
      ...(notes !== undefined ? { notes } : {}),
      manual_override: true,
    }

    if (Object.keys(subscriptionPatch).length > 1) {
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update(subscriptionPatch)
        .eq('business_id', id)

      if (subscriptionError) return handleError(subscriptionError.message, 422)
    }

    const { data: afterBusiness } = await supabase
      .from('businesses')
      .select('id, is_paused, paused_at, pause_reason, subscriptions(plan,status,trial_ends_at,current_period_start,current_period_end,last_payment_at,price_cents,notes,manual_override)')
      .eq('id', id)
      .maybeSingle()

    const { error: auditError } = await supabase.from('admin_audit_log').insert({
      business_id: id,
      admin_user_id: user.id,
      admin_email: user.email,
      action: 'admin_business_updated',
      before_state: beforeBusiness ?? null,
      after_state: afterBusiness ?? parsed.data,
    })

    if (auditError) {
      console.error('[admin audit] insert failed', auditError)
    }

    return formatResponse({ updated: true })
  } catch (err) {
    return handleError(err)
  }
}
