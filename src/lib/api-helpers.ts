import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type CurrentBusiness = {
  id: string
  slug: string
  name: string
  description?: string | null
  phone?: string | null
  address?: string | null
  cover_image_url?: string | null
  logo_image_url?: string | null
  gallery_images?: string[] | null
  default_language?: 'pt' | 'en' | 'es'
  currency?: 'EUR' | 'USD' | 'VES'
  owner_id?: string
}

export function formatResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status })
}

export function handleError(error: unknown, status = 500) {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Erro interno do servidor'
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

export async function getBusinessForUser(supabase: SupabaseServerClient, userId: string) {
  const { data: ownedBusiness, error: ownerError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (ownerError) {
    console.error('[getBusinessForUser] businesses.owner_id lookup failed', ownerError)
  }

  if (ownedBusiness) {
    await ensureBusinessBootstrapRows(supabase, userId, ownedBusiness.id)
    return ownedBusiness as CurrentBusiness
  }

  const { data: ownerData, error: relationError } = await supabase
    .from('business_owners')
    .select('business_id, businesses(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (relationError) {
    console.error('[getBusinessForUser] business_owners lookup failed', relationError)
  }

  const business = ownerData?.businesses
  if (!business) return null

  return business as unknown as CurrentBusiness
}

export async function ensureBusinessBootstrapRows(
  supabase: SupabaseServerClient,
  userId: string,
  businessId: string
) {
  const results = await Promise.all([
    supabase
      .from('business_owners')
      .upsert(
        { user_id: userId, business_id: businessId },
        { onConflict: 'user_id,business_id', ignoreDuplicates: true }
      ),
    supabase
      .from('business_settings')
      .upsert({ business_id: businessId }, { onConflict: 'business_id', ignoreDuplicates: true }),
    supabase
      .from('subscriptions')
      .upsert({ business_id: businessId }, { onConflict: 'business_id', ignoreDuplicates: true }),
  ])

  for (const { error } of results) {
    if (error) console.error('[ensureBusinessBootstrapRows] repair failed', error)
  }
}
