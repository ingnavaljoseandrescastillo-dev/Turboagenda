export interface Business {
  id: string
  slug: string
  name: string
  description?: string
  phone?: string
  notification_email?: string
  address?: string
  cover_image_url?: string
  logo_image_url?: string
  gallery_images?: string[]
  theme_primary_color?: string
  theme_background_color?: string
  theme_text_color?: string
  theme_background_image_url?: string
  owner_id: string
  created_at: string
}

export interface BusinessSettings {
  id: string
  business_id: string
  opening_time: string
  closing_time: string
  slot_duration_minutes: number
  working_days: number[]
  max_booking_days: number
  time_zone?: string
  email_notify_client_on_booking?: boolean
  email_notify_business_on_booking?: boolean
  email_reminder_24h_enabled?: boolean
  email_notify_client_on_cancellation?: boolean
  email_rebooking_reminder_enabled?: boolean
  email_rebooking_reminder_delay_days?: number
  email_rebooking_reminder_message?: string
  whatsapp_enabled?: boolean
  whatsapp_notify_client_on_booking?: boolean
  whatsapp_notify_business_on_booking?: boolean
  whatsapp_reminder_24h_enabled?: boolean
  whatsapp_birthday_enabled?: boolean
  whatsapp_rebooking_reminder_enabled?: boolean
  whatsapp_rebooking_reminder_delay_days?: number
  whatsapp_rebooking_reminder_message?: string
}

export interface BusinessDayOverride {
  date: string
  is_closed: boolean
  opening_time?: string | null
  closing_time?: string | null
  slot_duration_minutes?: number | null
  note?: string | null
}

export interface BusinessOwner {
  id: string
  user_id: string
  business_id: string
  created_at: string
}

export interface Employee {
  id: string
  business_id: string
  name: string
  role: string
  avatar_url?: string
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description?: string
  duration_minutes: number
  price: number
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  business_id: string
  name: string
  email: string
  phone?: string
  birthdate?: string
  last_appointment_at?: string
  created_at: string
}

export interface Appointment {
  id: string
  business_id: string
  service_id: string
  employee_id: string
  client_name: string
  client_email: string
  client_phone?: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  created_at: string
  // joined fields
  service?: Service
  employee?: Employee
}

export interface Review {
  id: string
  business_id: string
  appointment_id?: string
  client_name: string
  rating: number
  comment?: string
  created_at: string
}

export interface Subscription {
  id: string
  business_id: string
  plan: 'trial' | 'basic' | 'plus'
  status: 'trial' | 'active' | 'cancelled' | 'past_due'
  trial_ends_at?: string
  current_period_start?: string
  current_period_end?: string
  last_payment_at?: string
  price_cents?: number
  currency?: string
  manual_override?: boolean
  notes?: string
  created_at: string
}

export interface NotificationEvent {
  id: string
  business_id: string
  appointment_id?: string | null
  client_id?: string | null
  channel: 'whatsapp' | 'email' | 'system'
  event_type:
    | 'appointment_created_client'
    | 'appointment_created_business'
    | 'appointment_reminder_24h'
    | 'birthday_greeting'
    | 'manual_reminder'
    | 'rebooking_reminder'
  recipient_type: 'client' | 'business'
  recipient_name?: string | null
  recipient_phone?: string | null
  recipient_email?: string | null
  status: 'queued' | 'skipped' | 'sent' | 'failed'
  scheduled_for: string
  payload: Record<string, unknown>
  error?: string | null
  sent_at?: string | null
  created_at: string
}

export interface AvailabilitySlot {
  time: string
  available: boolean
}

export interface DashboardMetrics {
  todayTotal: number
  todayPending: number
  todayConfirmed: number
  todayCancelled: number
}
