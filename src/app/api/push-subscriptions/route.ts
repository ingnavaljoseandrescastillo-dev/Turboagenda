import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { validateAuth, getBusinessForUser, formatResponse, handleError } from '@/lib/api-helpers'
import { validatePlatformAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVapidPublicKey } from '@/lib/push-notifications'
import { isAllowedPushEndpoint } from '@/lib/push-endpoint'

const PushSubscriptionSchema = z.object({
  audience: z.enum(['business', 'admin']),
  businessId: z.string().uuid().nullable().optional(),
  subscription: z.object({
    endpoint: z.string().url().refine(isAllowedPushEndpoint, 'Fornecedor push invalido'),
    keys: z.object({
      p256dh: z.string().max(100).regex(/^[A-Za-z0-9_-]+={0,2}$/).refine(value => Buffer.from(value, 'base64url').length === 65),
      auth: z.string().max(30).regex(/^[A-Za-z0-9_-]+={0,2}$/).refine(value => Buffer.from(value, 'base64url').length === 16),
    }),
  }),
})

const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function GET() {
  return formatResponse({
    publicKey: getVapidPublicKey(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = PushSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)
    }

    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const { audience, businessId, subscription } = parsed.data
    let allowedBusinessId: string | null = null

    if (audience === 'admin') {
      const admin = await validatePlatformAdmin()
      if (!admin.isAdmin || admin.user?.id !== user.id) return handleError('Sem permissao', 403)
    } else {
      const business = await getBusinessForUser(supabase, user.id)
      if (!business) return handleError('Negocio nao encontrado', 404)
      if (businessId && businessId !== business.id) return handleError('Sem permissao', 403)
      allowedBusinessId = business.id
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        business_id: allowedBusinessId,
        audience,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: request.headers.get('user-agent'),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) return handleError(error.message, 422)
    return formatResponse({ subscribed: true }, 201)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const body = await request.json()
    const parsed = PushUnsubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)
    }

    const adminDb = createAdminClient()
    const { error } = await adminDb
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', parsed.data.endpoint)
      .eq('user_id', user.id)

    if (error) return handleError(error.message, 422)
    return formatResponse({ subscribed: false })
  } catch (err) {
    return handleError(err)
  }
}
