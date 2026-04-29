'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { LoginInput, RegisterInput } from '@/lib/validators'
import { slugify } from '@/lib/utils'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createClient()
    return supabaseRef.current
  }, [])

  useEffect(() => {
    const supabase = getSupabase()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [getSupabase])

  async function login({ email, password }: LoginInput) {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    router.push('/dashboard')
    router.refresh()
  }

  async function register({ email, password, businessName, phone }: RegisterInput) {
    const supabase = getSupabase()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://turboagenda.pt/auth/callback',
        data: { businessName, phone },
      },
    })
    if (authError) throw authError
    if (!authData.user) throw new Error('Erro ao criar utilizador')

    if (!authData.session) return 'confirmation_required' as const

    const slug = `${slugify(businessName)}-${Math.random().toString(36).slice(2, 6)}`
    const { error: bizError } = await supabase
      .from('businesses')
      .insert({ name: businessName, slug, phone, owner_id: authData.user.id })
    if (bizError) throw bizError

    router.push('/dashboard')
    router.refresh()
    return 'redirected' as const
  }

  async function logout() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return { user, loading, login, register, logout }
}
