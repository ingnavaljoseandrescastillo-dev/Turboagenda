import { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError } from '@/lib/api-helpers'

const ClientStatusQuerySchema = z.object({
  business_id: z.string().uuid('Negocio invalido'),
  email: z.string().optional(),
  phone: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const parsed = ClientStatusQuerySchema.safeParse({
      business_id: searchParams.get('business_id'),
      email: searchParams.get('email') ?? undefined,
      phone: searchParams.get('phone') ?? undefined,
    })

    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)
    }

    const { createClient } = await import('@/lib/supabase/server')
    const db = await createClient()
    const { data, error } = await db.rpc('has_completed_public_client_appointment', {
      p_business_id: parsed.data.business_id,
      p_client_email: parsed.data.email || null,
      p_client_phone: parsed.data.phone || null,
    })

    if (error) return handleError(error.message, 500)

    return formatResponse({ has_completed_appointment: Boolean(data) })
  } catch (err) {
    return handleError(err)
  }
}
