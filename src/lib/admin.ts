import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AdminSupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function requirePlatformAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const isAdmin = await checkPlatformAdmin(supabase, user.id)

  if (!isAdmin) redirect('/dashboard')

  return { supabase, user }
}

export async function validatePlatformAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { supabase, user: null, isAdmin: false }
  }

  const isAdmin = await checkPlatformAdmin(supabase, user.id)

  return { supabase, user, isAdmin }
}

async function checkPlatformAdmin(supabase: AdminSupabaseClient, userId: string) {
  const { data: rpcAdmin, error: rpcError } = await supabase.rpc('is_platform_admin')

  if (!rpcError && rpcAdmin) return true

  if (rpcError) {
    console.error('[admin] is_platform_admin failed', rpcError)
  }

  const { data: rowAdmin, error: rowError } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (rowError) {
    console.error('[admin] platform_admins fallback failed', rowError)
    return false
  }

return Boolean(rowAdmin)
}
