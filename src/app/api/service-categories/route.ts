import type { NextRequest } from 'next/server'
import { ServiceCategorySchema } from '@/lib/validators'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('business_id', business.id)
      .order('display_order', { ascending: true })
      .order('name')

    if (error) return handleError(error.message)
    return formatResponse(data ?? [])
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const body = await request.json()
    const parsed = ServiceCategorySchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)

    const { data, error } = await supabase
      .from('service_categories')
      .insert({
        ...parsed.data,
        description: parsed.data.description || null,
        business_id: business.id,
      })
      .select()
      .single()

    if (error) return handleError(error.message)
    return formatResponse(data, 201)
  } catch (err) {
    return handleError(err)
  }
}
