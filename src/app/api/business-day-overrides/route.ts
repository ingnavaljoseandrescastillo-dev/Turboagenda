import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { TimeRangeSchema } from '@/lib/validators'

const MonthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mes invalido').refine((value) => {
    const month = Number(value.slice(5, 7))
    return month >= 1 && month <= 12
  }, 'Mes invalido'),
})

const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Horario invalido').refine((value) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}, 'Horario invalido')

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
  opening_time: TimeSchema.nullable().optional(),
  closing_time: TimeSchema.nullable().optional(),
  time_ranges: z.array(TimeRangeSchema).min(1).max(2).nullable().optional(),
  slot_duration_minutes: z.number().int().min(5).max(240).nullable().optional(),
  note: z.string().optional(),
}).refine((value) => {
  if (value.is_closed) return true
  if (value.time_ranges?.length) return true
  if (!value.opening_time && !value.closing_time) return true
  if (!value.opening_time || !value.closing_time) return false
  return value.opening_time < value.closing_time
}, 'El horario especial debe tener apertura y cierre validos')

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
      .select('date, is_closed, opening_time, closing_time, time_ranges, slot_duration_minutes, note')
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

    const timeRanges = parsed.data.is_closed
      ? []
      : normalizeTimeRanges(parsed.data.time_ranges, parsed.data.opening_time, parsed.data.closing_time)
    const hasSpecialSchedule = timeRanges.length > 0

    if (!parsed.data.is_closed && !hasSpecialSchedule) {
      const { error } = await supabase
        .from('business_day_overrides')
        .delete()
        .eq('business_id', business.id)
        .eq('date', parsed.data.date)

      if (error) return handleError(error.message, 422)
      return formatResponse({
        date: parsed.data.date,
        is_closed: false,
        opening_time: null,
        closing_time: null,
        time_ranges: [],
        slot_duration_minutes: null,
      })
    }

    const { data, error } = await supabase
      .from('business_day_overrides')
      .upsert(
        {
          business_id: business.id,
          date: parsed.data.date,
          is_closed: parsed.data.is_closed,
          opening_time: parsed.data.is_closed ? null : (timeRanges[0]?.start ?? null),
          closing_time: parsed.data.is_closed ? null : (timeRanges.at(-1)?.end ?? null),
          time_ranges: timeRanges,
          slot_duration_minutes: parsed.data.is_closed ? null : (parsed.data.slot_duration_minutes ?? null),
          note: parsed.data.note ?? null,
        },
        { onConflict: 'business_id,date' }
      )
      .select('date, is_closed, opening_time, closing_time, time_ranges, slot_duration_minutes, note')
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}

function normalizeTimeRanges(
  ranges: { start: string; end: string }[] | null | undefined,
  openingTime: string | null | undefined,
  closingTime: string | null | undefined
) {
  if (ranges?.length) return ranges
  if (openingTime && closingTime) return [{ start: openingTime, end: closingTime }]
  return []
}
