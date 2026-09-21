import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').refine((value) => {
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}, 'Data inválida')
const CampaignSchema = z.object({
  name: z.string().trim().min(2).max(100),
  discount_percent: z.number().int().min(1).max(99),
  starts_on: DateSchema,
  ends_on: DateSchema,
  is_active: z.boolean(),
  service_ids: z.array(z.string().uuid()).min(1).max(100).refine(
    (ids) => new Set(ids).size === ids.length,
    'Escolha cada serviço uma vez'
  ),
}).refine((value) => value.ends_on >= value.starts_on, {
  message: 'A data final deve ser igual ou posterior à inicial',
  path: ['ends_on'],
})

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)
    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)
    const { data, error } = await supabase
      .from('service_discount_campaigns')
      .select('*')
      .eq('business_id', business.id)
      .order('starts_on', { ascending: false })
      .limit(100)
    if (error) return handleError(error.message)
    return formatResponse(data ?? [])
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)
    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)
    const parsed = CampaignSchema.safeParse(await request.json())
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Campanha inválida', 400)
    const { data, error } = await supabase
      .from('service_discount_campaigns')
      .insert({ ...parsed.data, business_id: business.id })
      .select()
      .single()
    if (error) return handleError(error.message, 422)
    return formatResponse(data, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)
    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)
    const body = await request.json()
    const id = z.string().uuid().safeParse(body.id)
    const parsed = CampaignSchema.safeParse(body)
    if (!id.success || !parsed.success) return handleError('Campanha inválida', 400)
    const { data, error } = await supabase
      .from('service_discount_campaigns')
      .update(parsed.data)
      .eq('id', id.data)
      .eq('business_id', business.id)
      .select()
      .single()
    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (error) {
    return handleError(error)
  }
}
