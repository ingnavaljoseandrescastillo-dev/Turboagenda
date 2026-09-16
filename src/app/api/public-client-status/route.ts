import { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError } from '@/lib/api-helpers'
import { verifiedContact } from '@/lib/client-verification'
import { allowRequest } from '@/lib/request-security'

const ClientStatusQuerySchema = z.object({
  business_id: z.string().uuid('Negocio invalido'),
  email: z.string().optional(),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    if (!await allowRequest(request, 'client-status', 60)) return handleError('Demasiados pedidos.', 429)
    const parsed = ClientStatusQuerySchema.safeParse(await request.json())

    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient()
    const verified = verifiedContact(request, parsed.data.business_id, parsed.data.email, parsed.data.phone)
    if (!verified) return formatResponse({ has_completed_appointment: false })
    const { data, error } = await db.rpc('has_completed_public_client_appointment', {
      p_business_id: parsed.data.business_id,
      p_client_email: verified.email || null,
      p_client_phone: verified.phone || null,
    })

    if (error) return handleError(error.message, 500)

    return formatResponse({ has_completed_appointment: Boolean(data) })
  } catch (err) {
    return handleError(err)
  }
}
