import type { NextRequest } from 'next/server'
import { ServiceCategorySchema } from '@/lib/validators'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const { id } = await params
    const body = await request.json()
    const parsed = ServiceCategorySchema.partial().safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)

    const { data, error } = await supabase
      .from('service_categories')
      .update({
        ...parsed.data,
        description: parsed.data.description === '' ? null : parsed.data.description,
      })
      .eq('id', id)
      .eq('business_id', business.id)
      .select()
      .single()

    if (error) return handleError(error.message)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const { id } = await params

    const { error: serviceError } = await supabase
      .from('services')
      .update({ service_category_id: null })
      .eq('business_id', business.id)
      .eq('service_category_id', id)

    if (serviceError) return handleError(serviceError.message)

    const { data, error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', id)
      .eq('business_id', business.id)
      .select('id')
      .single()

    if (error) return handleError(error.message)
    return formatResponse({ deleted: true, id: data.id })
  } catch (err) {
    return handleError(err)
  }
}
