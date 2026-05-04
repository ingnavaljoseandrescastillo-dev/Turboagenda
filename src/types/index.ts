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
  current_period_end?: string
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
