import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityQuerySchema } from '@/lib/validators'
import { formatResponse, handleError } from '@/lib/api-helpers'

function isWithinBookingWindow(date: string, maxBookingDays: number) {
  const requested = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const latest = new Date(today)
  latest.setDate(latest.getDate() + Math.max(0, maxBookingDays - 1))

  return requested >= today && requested <= latest
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const query = Object.fromEntries(searchParams.entries())

    const parsed = AvailabilityQuerySchema.safeParse(query)
    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos', 400)
    }

    const { business_id, service_id, employee_id, date } = parsed.data

    const supabase = await createClient()
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('max_booking_days')
      .eq('business_id', business_id)
      .maybeSingle()

    if (settingsError) return handleError(settingsError.message, 500)

    const maxBookingDays = settings?.max_booking_days ?? 30
    if (!isWithinBookingWindow(date, maxBookingDays)) {
      return formatResponse({ slots: [] })
    }

    const { data, error } = await supabase.rpc('get_available_slots', {
      p_business_id: business_id,
      p_service_id: service_id,
      p_employee_id: employee_id,
      p_date: date,
    })

    if (error) return handleError(error.message, 500)

    return formatResponse({ slots: data ?? [] })
  } catch (err) {
    return handleError(err)
  }
}
