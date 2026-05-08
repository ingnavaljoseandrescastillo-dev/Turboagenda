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
    const result = await processAppointmentReminderEmails(createAdminClient(), { dryRun })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[cron appointment reminders] failed', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Cron failed' },
      { status: 500 }
    )
  }
}
