import type { NextRequest } from 'next/server'
import { BusinessCreateSchema, BusinessSettingsSchema } from '@/lib/validators'
import {
  ensureBusinessBootstrapRows,
  formatResponse,
  getBusinessForUser,
  handleError,
  validateAuth,
} from '@/lib/api-helpers'
import { slugify } from '@/lib/utils'

function uniqueSlug(name: string) {
  return `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`
}

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) {
      return handleError('Nenhum negócio encontrado. Crie o negócio inicial no onboarding.', 404)
    }

    const [{ data: settings, error: settingsError }, { data: subscription, error: subscriptionError }] =
      await Promise.all([
        supabase.from('business_settings').select('*').eq('business_id', business.id).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('business_id', business.id).maybeSingle(),
      ])

    if (settingsError) console.error('[GET /api/businesses] settings lookup failed', settingsError)
    if (subscriptionError) console.error('[GET /api/businesses] subscription lookup failed', subscriptionError)

    return formatResponse({ business, settings, subscription })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const existing = await getBusinessForUser(supabase, user.id)
    if (existing) return formatResponse(existing, 200)

    const body = await request.json()
    const parsed = BusinessCreateSchema.safeParse(body)
    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
    }

    const { name, slug, ...rest } = parsed.data
    const dashboardLanguage = rest.dashboard_language ?? rest.default_language ?? 'pt'
    const publicLanguage = rest.public_language ?? rest.default_language ?? dashboardLanguage
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        ...rest,
        default_language: dashboardLanguage,
        dashboard_language: dashboardLanguage,
        public_language: publicLanguage,
        gallery_images: rest.gallery_images?.filter(Boolean) ?? [],
        name,
        slug: slug ?? uniqueSlug(name),
        owner_id: user.id,
      })
      .select('*')
      .single()

    if (error) return handleError(error.message, 422)

    await ensureBusinessBootstrapRows(supabase, user.id, data.id)
    return formatResponse(data, 201)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) {
      return handleError('Nenhum negócio encontrado. Crie o negócio inicial no onboarding.', 404)
    }

    const body = await request.json()
    const parsed = BusinessSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
    }

    const dashboardLanguage = parsed.data.dashboard_language ?? parsed.data.default_language ?? 'pt'
    const publicLanguage = parsed.data.public_language ?? parsed.data.default_language ?? dashboardLanguage
    const payload = {
      ...parsed.data,
      default_language: dashboardLanguage,
      dashboard_language: dashboardLanguage,
      public_language: publicLanguage,
      notification_email: parsed.data.notification_email || null,
      cover_image_url: parsed.data.cover_image_url || null,
      logo_image_url: parsed.data.logo_image_url || null,
      theme_background_image_url: parsed.data.theme_background_image_url || null,
      gallery_images: parsed.data.gallery_images?.filter(Boolean) ?? [],
    }

    const { data, error } = await supabase
      .from('businesses')
      .update(payload)
      .eq('id', business.id)
      .eq('owner_id', user.id)
      .select('*')
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}
