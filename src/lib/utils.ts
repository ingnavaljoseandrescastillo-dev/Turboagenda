import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const DEFAULT_BUSINESS_TIME_ZONE = 'Europe/Lisbon'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Hoje'
  if (isTomorrow(date)) return 'Amanha'
  return format(date, "dd 'de' MMMM", { locale: ptBR })
}

export function formatTime(dateStr: string): string {
  return formatTimeInTimeZone(dateStr)
}

export function formatDateTime(dateStr: string, timeZone = DEFAULT_BUSINESS_TIME_ZONE): string {
  return formatDateTimeInTimeZone(dateStr, timeZone)
}

export function formatTimeInTimeZone(dateStr: string, timeZone = DEFAULT_BUSINESS_TIME_ZONE): string {
  const parts = getDateTimeParts(dateStr, timeZone)
  return `${parts.hour}:${parts.minute}`
}

export function formatDateTimeInTimeZone(dateStr: string, timeZone = DEFAULT_BUSINESS_TIME_ZONE): string {
  const parts = getDateTimeParts(dateStr, timeZone)
  return `${parts.day}/${parts.month}/${parts.year} as ${parts.hour}:${parts.minute}`
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-PT', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function normalizeTimeZone(timeZone?: string | null): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_BUSINESS_TIME_ZONE
}

export function zonedDateTimeToUtcIso(date: string, time: string, timeZone = DEFAULT_BUSINESS_TIME_ZONE): string {
  const normalizedTimeZone = normalizeTimeZone(timeZone)
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utc = baseUtc

  for (let i = 0; i < 3; i += 1) {
    utc = baseUtc - getTimeZoneOffsetMs(new Date(utc), normalizedTimeZone)
  }

  return new Date(utc).toISOString()
}

export function formatCurrency(amount: number, currency = 'EUR', locale = 'pt-PT'): string {
  const normalizedCurrency = ['EUR', 'USD', 'VES'].includes(currency) ? currency : 'EUR'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    completed: 'Concluido',
  }
  return labels[status] ?? status
}

function getDateTimeParts(dateStr: string, timeZone: string) {
  const normalizedTimeZone = normalizeTimeZone(timeZone)
  const parts = new Intl.DateTimeFormat('pt-PT', {
    timeZone: normalizedTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parseISO(dateStr))

  return {
    day: getPart(parts, 'day'),
    month: getPart(parts, 'month'),
    year: getPart(parts, 'year'),
    hour: getPart(parts, 'hour'),
    minute: getPart(parts, 'minute'),
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const asUtc = Date.UTC(
    Number(getPart(parts, 'year')),
    Number(getPart(parts, 'month')) - 1,
    Number(getPart(parts, 'day')),
    Number(getPart(parts, 'hour')),
    Number(getPart(parts, 'minute')),
    Number(getPart(parts, 'second'))
  )

  return asUtc - date.getTime()
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? ''
}
