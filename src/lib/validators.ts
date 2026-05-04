import { z } from 'zod'

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color invalido')

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
  whatsapp_enabled: z.boolean(),
  whatsapp_notify_client_on_booking: z.boolean(),
  whatsapp_notify_business_on_booking: z.boolean(),
  whatsapp_reminder_24h_enabled: z.boolean(),
  whatsapp_birthday_enabled: z.boolean(),
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
  opening_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de abertura invalida'),
  closing_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de fecho invalida'),
  slot_duration_minutes: z.number().int().min(5).max(240),
  working_days: z.array(z.number().int().min(0).max(6)).min(1, 'Escolha pelo menos um dia de trabalho'),
  max_booking_days: z.number().int().min(1).max(365),
})

export const BusinessCreateSchema = z.object({
  name: z.string().min(2, 'Nome do negócio deve ter pelo menos 2 caracteres'),
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

export type LoginInput = z.infer<typeof LoginSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type AppointmentInput = z.infer<typeof AppointmentSchema>
export type NotificationSettingsInput = z.infer<typeof NotificationSettingsSchema>
export type ServiceInput = z.infer<typeof ServiceSchema>
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>
export type BusinessSettingsInput = z.infer<typeof BusinessSettingsSchema>
export type BusinessScheduleInput = z.infer<typeof BusinessScheduleSchema>
export type BusinessCreateInput = z.infer<typeof BusinessCreateSchema>
