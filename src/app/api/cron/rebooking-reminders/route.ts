import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processRebookingReminders } from '@/lib/rebooking-reminders'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await processRebookingReminders(createAdminClient())
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[cron rebooking reminders] failed', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Cron failed' },
      { status: 500 }
    )
  }
}
