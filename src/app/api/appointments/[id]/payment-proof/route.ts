import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

const PAYMENT_PROOFS_BUCKET = 'payment-proofs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const { id } = await params
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('payment_proof_path')
      .eq('id', id)
      .eq('business_id', business.id)
      .maybeSingle()

    if (error) return handleError(error.message, 422)
    if (!appointment?.payment_proof_path) return handleError('Comprovativo nao encontrado', 404)

    const admin = createAdminClient()
    const { data, error: signedError } = await admin.storage
      .from(PAYMENT_PROOFS_BUCKET)
      .createSignedUrl(appointment.payment_proof_path, 300)

    if (signedError) return handleError(signedError.message, 422)
    return formatResponse({ url: data.signedUrl })
  } catch (err) {
    return handleError(err)
  }
}
