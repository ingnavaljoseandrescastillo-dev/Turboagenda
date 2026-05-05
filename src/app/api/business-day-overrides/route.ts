import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'

const MonthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mes invalido').refine((value) => {
    const month = Number(value.slice(5, 7))
    return month >= 1 && month <= 12
  }, 'Mes invalido'),
})

const DayOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida').refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    )
  }, 'Data invalida'),
  is_closed: z.boolean(),
  note: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const query = MonthQuerySchema.safeParse({
      month: request.nextUrl.searchParams.get('month') ?? '',
    })
    if (!query.success) return handleError(query.error.issues[0]?.message ?? 'Mes invalido', 400)

    const [year, month] = query.data.month.split('-').map(Number)
    const start = `${query.data.month}-01`
    const endDate = new Date(year, month, 0)
    const end = `${query.data.month}-${String(endDate.getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('business_day_overrides')
      .select('date, is_closed, note')
      .eq('business_id', business.id)
      .gte('date', start)
      .lte('date', end)
      .order('date')

    if (error) return handleError(error.message, 422)
    return formatResponse(data ?? [])
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const body = await request.json()
    const parsed = DayOverrideSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    if (!parsed.data.is_closed) {
      const { error } = await supabase
        .from('business_day_overrides')
        .delete()
        .eq('business_id', business.id)
        .eq('date', parsed.data.date)

      if (error) return handleError(error.message, 422)
      return formatResponse({ date: parsed.data.date, is_closed: false })
    }

    const { data, error } = await supabase
      .from('business_day_overrides')
      .upsert(
        {
          business_id: business.id,
          date: parsed.data.date,
          is_closed: true,
          note: parsed.data.note ?? null,
        },
        { onConflict: 'business_id,date' }
      )
      .select('date, is_closed, note')
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}
