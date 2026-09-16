import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { normalizeSmsPhone } from '@/lib/twilio'

export const VERIFIED_COOKIE = 'ta_verified_contact'
export const CHALLENGE_COOKIE = 'ta_contact_challenge'
export function contactHash(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Verification not configured')
  return createHmac('sha256', secret).update(`contact-verification-v1:${value}`).digest('hex')
}
export function signValue(value: object) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${payload}.${contactHash(payload)}`
}
export function readValue<T extends { expires: number }>(value?: string): T | null {
  try {
    const [payload, signature] = (value || '').split('.')
    const expected = Buffer.from(contactHash(payload))
    const actual = Buffer.from(signature || '')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as T
    return parsed.expires > Date.now() ? parsed : null
  } catch { return null }
}
export type VerifiedContact = { business: string; email?: string; phone?: string; expires: number }
export function verifiedContact(request: NextRequest, business: string, email?: string | null, phone?: string | null) {
  const value = readValue<VerifiedContact>(request.cookies.get(VERIFIED_COOKIE)?.value)
  if (!value || value.business !== business) return null
  if (value.email && value.email === email?.trim().toLowerCase()) return value
  if (value.phone && value.phone === normalizeSmsPhone(phone)) return value
  return null
}
