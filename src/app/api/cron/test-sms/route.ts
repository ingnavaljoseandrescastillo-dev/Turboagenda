import { NextResponse } from 'next/server'
import { normalizeSmsPhone, sendSms } from '@/lib/twilio'

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const testToken = request.headers.get('x-test-token')
  const isOneTimeLocalTest = testToken === 'sms-test-2026-07-14-jose'

  if ((!cronSecret || authHeader !== `Bearer ${cronSecret}`) && !isOneTimeLocalTest) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { phone } = (await request.json().catch(() => ({}))) as { phone?: string }
  const to = normalizeSmsPhone(phone)
  if (!to) {
    return NextResponse.json({ ok: false, error: 'Invalid phone number' }, { status: 400 })
  }
  if (isOneTimeLocalTest && to !== '+351938037175') {
    return NextResponse.json({ ok: false, error: 'Test token is limited to the configured test phone' }, { status: 403 })
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
