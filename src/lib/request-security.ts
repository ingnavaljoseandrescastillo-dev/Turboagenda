import 'server-only'
import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function allowRequest(request: NextRequest, scope: string, limit = 10, seconds = 600) {
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  return consumeLimit(`${scope}:${ip}`, limit, seconds)
}

export async function consumeLimit(scope: string, limit: number, seconds: number) {
  const key = createHash('sha256').update(scope).digest('hex')
  const { data, error } = await createAdminClient().rpc('consume_api_rate_limit', { p_key: key, p_limit: limit, p_seconds: seconds })
  if (error) throw new Error('Rate limiter unavailable')
  return data === true
}

export async function validPaymentProof(file: File) {
  if (!file.size || file.size > 4 * 1024 * 1024) return false
  const bytes = Buffer.from(await file.slice(0, 16).arrayBuffer())
  if (file.type === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  if (file.type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (file.type === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (file.type === 'application/pdf') return bytes.toString('ascii', 0, 5) === '%PDF-'
  return false
}
