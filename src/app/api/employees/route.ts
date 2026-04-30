import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError, validateAuth, getBusinessForUser } from '@/lib/api-helpers'

const EmployeeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.string().min(1, 'Função obrigatória'),
  avatar_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  is_active: z.boolean().default(true),
})

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', business.id)
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
    const parsed = EmployeeSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)

    const { data, error } = await supabase
      .from('employees')
      .insert({ ...parsed.data, avatar_url: parsed.data.avatar_url || null, business_id: business.id })
      .select()
      .single()

    if (error) return handleError(error.message)
    return formatResponse(data, 201)
  } catch (err) {
    return handleError(err)
  }
}
