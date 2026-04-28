import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
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
  start_time: z.string().datetime(),
  notes: z.string().optional(),
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
  address: z.string().optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug só pode conter letras minúsculas, números e hífens'),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type AppointmentInput = z.infer<typeof AppointmentSchema>
export type ServiceInput = z.infer<typeof ServiceSchema>
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>
export type BusinessSettingsInput = z.infer<typeof BusinessSettingsSchema>
