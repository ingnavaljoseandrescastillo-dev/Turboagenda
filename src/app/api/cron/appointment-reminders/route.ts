import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processAppointmentReminderEmails } from '@/lib/appointment-reminders'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const dryRun = url.searchParams.get('dry_run') === '1'
    const targetHours = parseNumberParam(url.searchParams.get('target_hours'), 1, 168)
    const windowMinutes = parseNumberParam(url.searchParams.get('window_minutes'), 5, 180)
    const result = await processAppointmentReminderEmails(createAdminClient(), {
      dryRun,
      targetHours,
      windowMinutes,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[cron appointment reminders] failed', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Cron failed' },
      { status: 500 }
    )
  }
}

function parseNumberParam(value: string | null, min: number, max: number) {
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined
  return parsed
}
