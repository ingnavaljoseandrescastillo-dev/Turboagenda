import twilio from 'twilio'

type SmsMessage = {
  to: string
  body: string
}

let twilioClient: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are not configured')
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken)
  }

  return twilioClient
}

export async function sendSms({ to, body }: SmsMessage) {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!messagingServiceSid && !from) {
    throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER is not configured')
  }

  const client = getTwilioClient()
  return client.messages.create({
    to,
    body,
    ...(messagingServiceSid ? { messagingServiceSid } : { from }),
  })
}

export function normalizeSmsPhone(phone: string | null | undefined) {
  if (!phone) return null

  const trimmed = phone.trim()
  if (!trimmed) return null

  const digits = trimmed.replace(/[^\d+]/g, '')
  if (/^\+\d{8,15}$/.test(digits)) return digits

  const localDigits = trimmed.replace(/\D/g, '')
  if (/^351\d{9}$/.test(localDigits)) return `+${localDigits}`
  if (/^9\d{8}$/.test(localDigits)) return `+351${localDigits}`

  return null
}
