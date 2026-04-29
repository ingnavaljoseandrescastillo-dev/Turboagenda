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

  const { data: isAdmin, error } = await supabase.rpc('is_platform_admin')

  if (error) {
    console.error('[admin] is_platform_admin failed', error)
    redirect('/dashboard')
  }

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

  const { data: isAdmin, error } = await supabase.rpc('is_platform_admin')
  if (error) {
    console.error('[admin] is_platform_admin failed', error)
    return { supabase, user, isAdmin: false }
  }

  return { supabase, user, isAdmin: Boolean(isAdmin) }
}
