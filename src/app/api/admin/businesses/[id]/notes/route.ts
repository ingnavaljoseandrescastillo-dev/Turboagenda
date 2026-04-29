import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, handleError } from '@/lib/api-helpers'
import { validatePlatformAdmin } from '@/lib/admin'

const AdminNoteSchema = z.object({
  note: z.string().trim().min(3, 'La nota debe tener al menos 3 caracteres').max(2000),
})

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { supabase, user, isAdmin } = await validatePlatformAdmin()
    if (!isAdmin || !user) return handleError('Admin no autorizado', 403)

    const { id } = await params
    const body = await request.json()
    const parsed = AdminNoteSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Datos invalidos', 400)

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (businessError) return handleError(businessError.message, 422)
    if (!business) return handleError('Negocio no encontrado', 404)

    const { error } = await supabase.from('admin_notes').insert({
      business_id: id,
      admin_user_id: user.id,
      admin_email: user.email,
      note: parsed.data.note,
    })

    if (error) return handleError(error.message, 422)

    await supabase.from('admin_audit_log').insert({
      business_id: id,
      admin_user_id: user.id,
      admin_email: user.email,
      action: 'admin_note_created',
      after_state: { note: parsed.data.note },
    })

    return formatResponse({ created: true }, 201)
  } catch (err) {
    return handleError(err)
  }
}
