import { z } from 'zod'
import { isValidTimeZone } from '@/lib/utils'

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color invalido')
const TimeZoneSchema = z.string().min(3).max(64).refine(isValidTimeZone, 'Zona horaria invalida')
const LocaleSchema = z.enum(['pt', 'en', 'es'])
const CurrencySchema = z.enum(['EUR', 'USD', 'VES'])
const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Horario invalido').refine((value) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}, 'Horario invalido')
export const TimeRangeSchema = z
  .object({
    start: TimeSchema,
    end: TimeSchema,
  })
  .refine((value) => value.start < value.end, {
    message: 'La hora de inicio debe ser menor que la hora de cierre',
    path: ['end'],
  })

const MonthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, 'Mes invalido').refine((value) => {
  const month = Number(value.slice(5, 7))
  return month >= 1 && month <= 12
}, 'Mes invalido')

const WorkingScheduleSchema = z.record(
  z.string().regex(/^[0-6]$/, 'Dia invalido'),
  z.array(TimeRangeSchema).min(1).max(2, 'Solo se permiten dos franjas por dia')
)

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
})

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme a nova senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao coincidem',
    path: ['confirmPassword'],
  })

export const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  businessName: z.string().min(2, 'Nome do negócio deve ter pelo menos 2 caracteres'),
  phone: z.string().min(9, 'Telefone inválido'),
})

export const AppointmentSchema = z.object({
  business_id: z.string().uuid(),
  service_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  client_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  client_email: z.string().email('Email inválido'),
  client_phone: z.string().optional(),
  client_birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento invalida').optional().or(z.literal('')),
  start_time: z.string().datetime(),
  notes: z.string().optional(),
})

export const NotificationSettingsSchema = z.object({
  email_notify_client_on_booking: z.boolean(),
  email_notify_business_on_booking: z.boolean(),
  email_reminder_24h_enabled: z.boolean(),
  email_notify_client_on_cancellation: z.boolean(),
  sms_reminder_24h_enabled: z.boolean(),
  email_rebooking_reminder_enabled: z.boolean(),
  email_rebooking_reminder_delay_days: z.number().int().min(1).max(365),
  email_rebooking_reminder_message: z.string().min(10).max(1000),
  whatsapp_enabled: z.boolean(),
  whatsapp_notify_client_on_booking: z.boolean(),
  whatsapp_notify_business_on_booking: z.boolean(),
  whatsapp_reminder_24h_enabled: z.boolean(),
  whatsapp_birthday_enabled: z.boolean(),
  whatsapp_rebooking_reminder_enabled: z.boolean(),
  whatsapp_rebooking_reminder_delay_days: z.number().int().min(1).max(365),
  whatsapp_rebooking_reminder_message: z.string().min(10).max(1000),
})

export const ManualReminderSchema = z.object({
  appointment_id: z.string().uuid('Cita invalida'),
  channels: z
    .array(z.enum(['email', 'whatsapp']))
    .min(1, 'Escolha pelo menos um canal')
    .max(2),
  message: z.string().min(5, 'Mensagem muito curta').max(2000, 'Mensagem muito longa'),
  subject: z.string().min(2).max(140).optional(),
})

export const ServiceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(5).max(480),
  price: z.number().min(0),
  is_active: z.boolean(),
})

export const AvailabilityQuerySchema = z.object({
  business_id: z.string().uuid(),
  service_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
})

export const BusinessSettingsSchema = z.object({
  name: z.string().min(2),
  default_language: LocaleSchema.optional(),
  dashboard_language: LocaleSchema.optional(),
  public_language: LocaleSchema.optional(),
  currency: CurrencySchema.optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  notification_email: z.string().email('Email invalido').or(z.literal('')).optional(),
  address: z.string().optional(),
  cover_image_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  logo_image_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  gallery_images: z.array(z.string().url('URL invalida').or(z.literal(''))).max(12).optional(),
  theme_primary_color: HexColorSchema.optional(),
  theme_background_color: HexColorSchema.optional(),
  theme_text_color: HexColorSchema.optional(),
  theme_background_image_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug só pode conter letras minúsculas, números e hífens'),
})

export const BusinessScheduleSchema = z.object({
  opening_time: TimeSchema,
  closing_time: TimeSchema,
  slot_duration_minutes: z.number().int().min(5).max(240),
  working_days: z.array(z.number().int().min(0).max(6)).min(1, 'Escolha pelo menos um dia de trabalho'),
  max_booking_days: z.number().int().min(1).max(365),
  available_months: z.array(MonthKeySchema).max(24, 'Demasiados meses seleccionados').optional(),
  working_schedule: WorkingScheduleSchema.optional(),
  time_zone: TimeZoneSchema,
}).refine((value) => value.opening_time < value.closing_time, {
  message: 'Hora de abertura deve ser menor que hora de fecho',
  path: ['closing_time'],
})

export const BusinessCreateSchema = z.object({
  name: z.string().min(2, 'Nome do negócio deve ter pelo menos 2 caracteres'),
  default_language: LocaleSchema.optional(),
  dashboard_language: LocaleSchema.optional(),
  public_language: LocaleSchema.optional(),
  currency: CurrencySchema.optional(),
  phone: z.string().optional(),
  notification_email: z.string().email('Email invalido').or(z.literal('')).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  cover_image_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  logo_image_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  gallery_images: z.array(z.string().url('URL invalida').or(z.literal(''))).max(12).optional(),
  theme_primary_color: HexColorSchema.optional(),
  theme_background_color: HexColorSchema.optional(),
  theme_text_color: HexColorSchema.optional(),
  theme_background_image_url: z.string().url('URL invalida').or(z.literal('')).optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug só pode conter letras minúsculas, números e hífens')
    .optional(),
})

export const FinanceEntrySchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().trim().min(2, 'Categoria invalida').max(80),
  description: z.string().trim().min(2, 'Descripcion requerida').max(160),
  amount_cents: z.number().int().min(0, 'Importe invalido'),
  gross_amount_cents: z.number().int().min(0, 'Importe original invalido').nullable().optional(),
  discount_cents: z.number().int().min(0, 'Descuento invalido').optional(),
  currency: CurrencySchema.default('EUR'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida'),
  payment_method: z.string().trim().min(2).max(60).default('manual'),
  notes: z.string().trim().max(500).nullable().optional(),
  appointment_id: z.string().uuid().nullable().optional(),
  employee_id: z.string().uuid().nullable().optional(),
})

export const AppointmentCollectionSchema = z
  .object({
    amount_cents: z.number().int().min(0, 'Importe cobrado invalido'),
    gross_amount_cents: z.number().int().min(0, 'Importe original invalido'),
    discount_cents: z.number().int().min(0, 'Descuento invalido'),
    currency: CurrencySchema.default('EUR'),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida'),
    payment_method: z.string().trim().min(2).max(60).default('manual'),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => data.discount_cents <= data.gross_amount_cents, {
    message: 'El descuento no puede superar el importe original',
    path: ['discount_cents'],
  })

export type LoginInput = z.infer<typeof LoginSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type AppointmentInput = z.infer<typeof AppointmentSchema>
export type NotificationSettingsInput = z.infer<typeof NotificationSettingsSchema>
export type ManualReminderInput = z.infer<typeof ManualReminderSchema>
export type ServiceInput = z.infer<typeof ServiceSchema>
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>
export type BusinessSettingsInput = z.infer<typeof BusinessSettingsSchema>
export type BusinessScheduleInput = z.infer<typeof BusinessScheduleSchema>
export type BusinessCreateInput = z.infer<typeof BusinessCreateSchema>
export type FinanceEntryInput = z.infer<typeof FinanceEntrySchema>
export type AppointmentCollectionInput = z.infer<typeof AppointmentCollectionSchema>
