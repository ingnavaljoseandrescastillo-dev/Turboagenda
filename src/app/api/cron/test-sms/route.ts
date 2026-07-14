import { NextResponse } from 'next/server'
import { normalizeSmsPhone, sendSms } from '@/lib/twilio'

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { phone } = (await request.json().catch(() => ({}))) as { phone?: string }
  const to = normalizeSmsPhone(phone)
  if (!to) {
    return NextResponse.json({ ok: false, error: 'Invalid phone number' }, { status: 400 })
  }

  try {
    const message = 'TurboAgenda prueba SMS: tus recordatorios por mensaje estan activos.'
    const result = await sendSms({ to, body: message })
    return NextResponse.json({ ok: true, sid: result.sid, status: result.status })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'SMS send failed' },
      { status: 500 }
    )
  }
}
