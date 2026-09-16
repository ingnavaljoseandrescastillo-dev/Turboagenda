import type { NextRequest } from 'next/server'
import { AppointmentSchema } from '@/lib/validators'
import { formatResponse, handleError, validateAuth, getBusinessForUser } from '@/lib/api-helpers'
import { sendAppointmentCreatedEmails } from '@/lib/appointment-emails'
import { sendAppointmentCreatedPush } from '@/lib/push-notifications'
import { createAdminClient } from '@/lib/supabase/admin'
import { allowRequest, validPaymentProof } from '@/lib/request-security'
import { verifiedContact } from '@/lib/client-verification'
import { z } from 'zod'

const PAYMENT_PROOFS_BUCKET = 'payment-proofs'
const MAX_PROOF_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const { data, error } = await supabase
      .from('appointments')
      .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: false })
      .limit(100)

    if (error) return handleError(error.message)

    return formatResponse(data ?? [])
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: NextRequest) {
  let uploadedProofPath: string | null = null
  let committed = false
  try {
    if (!await allowRequest(request, 'booking', 10)) return handleError('Demasiados pedidos. Tente novamente mais tarde.', 429)
    if (Number(request.headers.get('content-length')) > 4.4 * 1024 * 1024) return handleError('Ficheiro demasiado grande.', 413)
    const contentType = request.headers.get('content-type') ?? ''
    const formData = contentType.includes('multipart/form-data') ? await request.formData() : null
    const body = formData ? JSON.parse(String(formData.get('appointment') ?? '{}')) : await request.json()
    const parsed = AppointmentSchema.safeParse(body)
    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
    }

    const db = createAdminClient()

    const { data: business, error: businessError } = await db
      .from('businesses')
      .select('is_paused, currency, business_settings(deposit_required_enabled, deposit_percent, deposit_mbway_phone)')
      .eq('id', parsed.data.business_id)
      .maybeSingle()

    if (businessError) return handleError(businessError.message, 500)
    if (business?.is_paused) return handleError('Este negocio no esta aceptando reservas ahora mismo', 422)

    const settings = Array.isArray(business?.business_settings)
      ? business.business_settings[0]
      : business?.business_settings
    const verified = verifiedContact(request, parsed.data.business_id, parsed.data.client_email, parsed.data.client_phone)
    const { data: hasCompletedAppointment, error: statusError } = await db.rpc(
      'has_completed_public_client_appointment',
      {
        p_business_id: parsed.data.business_id,
        p_client_email: verified?.email || null,
        p_client_phone: verified?.phone || null,
      }
    )

    if (statusError) return handleError(statusError.message, 500)

    const depositRequired = Boolean(
      settings?.deposit_required_enabled && settings.deposit_mbway_phone && !hasCompletedAppointment
    )
    const proofFile = formData?.get('payment_proof')
    if (depositRequired && !(proofFile instanceof File)) {
      return handleError('Carregue o comprovativo MB WAY para bloquear o horario.', 400)
    }
    if (depositRequired && proofFile instanceof File) {
      if (!ALLOWED_PROOF_TYPES.has(proofFile.type)) return handleError('Use JPG, PNG, WEBP ou PDF.', 400)
      if (proofFile.size > MAX_PROOF_FILE_SIZE) return handleError('O comprovativo nao pode superar 4 MB.', 400)
      if (!await validPaymentProof(proofFile)) return handleError('Comprovativo invalido.', 400)

      const admin = createAdminClient()
      uploadedProofPath = `${parsed.data.business_id}/${crypto.randomUUID()}.${extensionFromType(proofFile.type)}`
      const { error: uploadError } = await admin.storage
        .from(PAYMENT_PROOFS_BUCKET)
        .upload(uploadedProofPath, proofFile, {
          contentType: proofFile.type,
          upsert: false,
        })

      if (uploadError) return handleError(uploadError.message, 422)
    }

    const serviceIds = Array.from(new Set(parsed.data.service_ids?.length ? parsed.data.service_ids : [parsed.data.service_id]))

    const { data, error } = await db.rpc('create_verified_public_appointment', {
      p_request_id: z.string().uuid().parse(request.headers.get('idempotency-key') || crypto.randomUUID()),
      p_verified_email: verified?.email || null,
      p_verified_phone: verified?.phone || null,
      p_business_id: parsed.data.business_id,
      p_service_id: serviceIds[0],
      p_service_ids: serviceIds,
      p_employee_id: parsed.data.employee_id,
      p_client_name: parsed.data.client_name,
      p_client_email: parsed.data.client_email || null,
      p_client_phone: parsed.data.client_phone ?? null,
      p_client_birthdate: parsed.data.client_birthdate || null,
      p_start_time: parsed.data.start_time,
      p_notes: parsed.data.notes ?? null,
      p_payment_proof_path: uploadedProofPath,
    })

    if (error) {
      if (uploadedProofPath) {
        await createAdminClient().storage.from(PAYMENT_PROOFS_BUCKET).remove([uploadedProofPath])
      }
      return handleError(error.message, 422)
    }

    committed = data?.created === true
    if (committed && typeof data?.id === 'string') {
      await Promise.all([sendAppointmentCreatedEmails(data.id), sendAppointmentCreatedPush(data.id)])
    }

    return formatResponse(data.id, data.created ? 201 : 200)
  } catch (err) {
    console.error('[booking] failed', err instanceof Error ? err.message : 'unknown')
    return handleError('Nao foi possivel concluir a reserva. Tente novamente.', 500)
  } finally {
    if (uploadedProofPath && !committed) {
      await createAdminClient().storage.from(PAYMENT_PROOFS_BUCKET).remove([uploadedProofPath]).catch(() => undefined)
    }
  }
}

function extensionFromType(type: string) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'application/pdf') return 'pdf'
  return 'jpg'
}
