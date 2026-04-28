import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError, validateAuth, getBusinessForUser } from '@/lib/api-helpers'

const EmployeePatchSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const { id } = await params
    const body = await request.json()
    const parsed = EmployeePatchSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)

    const { data, error } = await supabase
      .from('employees')
      .update(parsed.data)
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

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('business_id', business.id)

    if (error) return handleError(error.message)
    return formatResponse({ deleted: true })
  } catch (err) {
    return handleError(err)
  }
}
