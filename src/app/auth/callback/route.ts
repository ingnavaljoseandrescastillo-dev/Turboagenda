import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ensureBusinessBootstrapRows } from '@/lib/api-helpers'
import { slugify } from '@/lib/utils'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: existing, error: existingError } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (existingError) {
          console.error('[auth/callback] existing business lookup failed', existingError)
        }

        if (existing) {
          await ensureBusinessBootstrapRows(supabase, user.id, existing.id)
        } else {
          const meta = user.user_metadata as { businessName?: string; phone?: string }
          const businessName = meta.businessName ?? 'Meu Negocio'
          const slug = `${slugify(businessName)}-${Math.random().toString(36).slice(2, 6)}`

          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .insert({
              name: businessName,
              slug,
              phone: meta.phone ?? '',
              owner_id: user.id,
            })
            .select('id')
            .single()

          if (businessError) {
            console.error('[auth/callback] business insert failed', businessError)
          } else if (business) {
            await ensureBusinessBootstrapRows(supabase, user.id, business.id)
          }
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
