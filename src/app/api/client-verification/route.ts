import { NextRequest, NextResponse } from 'next/server'
import { randomInt, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { allowRequest, consumeLimit } from '@/lib/request-security'
import { CHALLENGE_COOKIE, VERIFIED_COOKIE, contactHash, readValue, signValue } from '@/lib/client-verification'
import { getResend, getEmailFrom } from '@/lib/resend'
import { normalizeSmsPhone, sendSms } from '@/lib/twilio'
import { createAdminClient } from '@/lib/supabase/admin'

type Challenge = { business: string; email?: string; phone?: string; nonce: string; verifier: string; expires: number }
const schema = z.object({ business_id: z.string().uuid(), email: z.string().email().max(254).optional().or(z.literal('')), phone: z.string().max(25).optional(), code: z.string().regex(/^\d{6}$/).optional() })
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/' }

export async function POST(request: NextRequest) {
  try {
    if (!await allowRequest(request, 'verify-contact', 15)) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Contacto invalido.' }, { status: 400 })
    const { business_id: business, code } = parsed.data
    if (code) {
      const challenge = readValue<Challenge>(request.cookies.get(CHALLENGE_COOKIE)?.value)
      if (!challenge || challenge.business !== business || !await consumeLimit(`otp-attempt:${challenge.nonce}`, 5, 600) || contactHash(`${challenge.nonce}:${code}`) !== challenge.verifier) {
        return NextResponse.json({ error: 'Codigo invalido ou expirado.' }, { status: 400 })
      }
      const response = NextResponse.json({ data: { verified: true } })
      response.cookies.set(VERIFIED_COOKIE, signValue({ business, email: challenge.email, phone: challenge.phone, expires: Date.now() + 1800000 }), { ...cookieOptions, maxAge: 1800 })
      response.cookies.set(CHALLENGE_COOKIE, '', { ...cookieOptions, maxAge: 0 })
      return response
    }
    const email = parsed.data.email?.trim().toLowerCase() || undefined
    const phone = email ? undefined : normalizeSmsPhone(parsed.data.phone) || undefined
    if (!email && (!phone || !/^\+3519\d{8}$/.test(phone))) return NextResponse.json({ error: 'Informe um email ou telemovel portugues valido.' }, { status: 400 })
    const { data: settings } = await createAdminClient().from('business_settings').select('deposit_required_enabled').eq('business_id', business).maybeSingle()
    if (!settings?.deposit_required_enabled) return NextResponse.json({ error: 'Verificacao indisponivel.' }, { status: 400 })
    if (!await consumeLimit(`otp-send:${email || phone}`, 3, 3600) || !await consumeLimit('otp-global', 100, 3600)) return NextResponse.json({ error: 'Aguarde antes de pedir outro codigo.' }, { status: 429 })
    const otp = String(randomInt(100000, 1000000))
    const nonce = randomUUID()
    if (email) {
      const result = await getResend().emails.send({ from: getEmailFrom(), to: email, subject: 'Codigo de verificacao TurboAgenda', text: `O seu codigo e ${otp}. Expira em 10 minutos. Se nao pediu este codigo, ignore esta mensagem.` })
      if (result.error) throw new Error('Email failed')
    } else {
      await sendSms({ to: phone!, body: `TurboAgenda: codigo ${otp}. Expira em 10 minutos. Nao partilhe este codigo.` })
    }
    const response = NextResponse.json({ data: { sent: true } })
    response.cookies.set(CHALLENGE_COOKIE, signValue({ business, email, phone, nonce, verifier: contactHash(`${nonce}:${otp}`), expires: Date.now() + 600000 }), { ...cookieOptions, maxAge: 600 })
    return response
  } catch {
    return NextResponse.json({ error: 'Nao foi possivel verificar o contacto. Tente mais tarde.' }, { status: 503 })
  }
}
