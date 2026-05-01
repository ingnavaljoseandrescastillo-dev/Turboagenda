import type { NextRequest } from 'next/server'
import {
  ensureBusinessBootstrapRows,
  formatResponse,
  getBusinessForUser,
  handleError,
  validateAuth,
} from '@/lib/api-helpers'

const BUCKET = 'business-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_KINDS = new Set(['cover', 'logo', 'gallery'])

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    await ensureBusinessBootstrapRows(supabase, user.id, business.id)

    const formData = await request.formData()
    const file = formData.get('file')
    const kind = String(formData.get('kind') ?? 'gallery')

    if (!(file instanceof File)) return handleError('Selecciona una imagen valida.', 400)
    if (!ALLOWED_KINDS.has(kind)) return handleError('Tipo de imagen invalido.', 400)
    if (!ALLOWED_TYPES.has(file.type)) return handleError('Usa JPG, PNG, WEBP o GIF.', 400)
    if (file.size > MAX_FILE_SIZE) return handleError('La imagen no puede superar 5 MB.', 400)

    const extension = extensionFromType(file.type)
    const path = `${business.id}/${kind}-${Date.now()}-${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

    if (error) return handleError(error.message, 422)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return formatResponse({ url: data.publicUrl, path })
  } catch (err) {
    return handleError(err)
  }
}

function extensionFromType(type: string) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  return 'jpg'
}
