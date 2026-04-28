'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { LoginInput, RegisterInput } from '@/lib/validators'
import { slugify } from '@/lib/utils'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  // supabase instance is stable via ref — intentional empty-ish dep array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login({ email, password }: LoginInput) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    router.push('/dashboard')
    router.refresh()
  }

  async function register({ email, password, businessName, phone }: RegisterInput) {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) throw authError
    if (!authData.user) throw new Error('Erro ao criar utilizador')

    const slug = slugify(businessName) + '-' + Math.random().toString(36).slice(2, 6)

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({ name: businessName, slug, phone, owner_id: authData.user.id })
      .select()
      .single()

    if (bizError) throw bizError

    await supabase
      .from('business_owners')
      .insert({ user_id: authData.user.id, business_id: business.id })

    router.push('/dashboard')
    router.refresh()
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return { user, loading, login, register, logout }
}
