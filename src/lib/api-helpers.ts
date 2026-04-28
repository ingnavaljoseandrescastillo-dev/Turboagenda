import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export function formatResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status })
}

export function handleError(error: unknown, status = 500) {
  const message =
    error instanceof Error ? error.message : 'Erro interno do servidor'
  console.error('[API Error]', error)
  return NextResponse.json({ data: null, error: message }, { status })
}

export async function validateAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, supabase, unauthorized: true }
  }

  return { user, supabase, unauthorized: false }
}

export async function getBusinessForUser(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from('business_owners')
    .select('business_id, businesses(*)')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data.businesses as unknown as { id: string; slug: string; name: string } | null
}
