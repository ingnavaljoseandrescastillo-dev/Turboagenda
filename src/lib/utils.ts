import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Hoje'
  if (isTomorrow(date)) return 'Amanhã'
  return format(date, "dd 'de' MMMM", { locale: ptBR })
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm')
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
    completed: 'Concluído',
  }
  return labels[status] ?? status
}
