import type { NextRequest } from 'next/server'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { FinanceEntrySchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negocio no encontrado', 404)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('business_finance_entries')
      .select('*')
      .eq('business_id', business.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)

    if (type === 'income' || type === 'expense') query = query.eq('type', type)
    if (from) query = query.gte('entry_date', from)
    if (to) query = query.lte('entry_date', to)

    const { data, error } = await query
    if (error) return handleError(error.message, 422)

    return formatResponse(data ?? [])
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negocio no encontrado', 404)

    const body = await request.json()
    const parsed = FinanceEntrySchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { data, error } = await supabase
      .from('business_finance_entries')
      .insert({
        ...parsed.data,
        business_id: business.id,
        created_by: user.id,
        category: parsed.data.category.toLowerCase(),
        currency: parsed.data.currency.toUpperCase(),
        notes: parsed.data.notes || null,
        appointment_id: parsed.data.appointment_id || null,
        employee_id: parsed.data.employee_id || null,
      })
      .select('*')
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data, 201)
  } catch (err) {
    return handleError(err)
  }
}
