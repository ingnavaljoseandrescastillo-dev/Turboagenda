import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  children: React.ReactNode
  className?: string
}

const variantStyles = {
  success: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 ring-red-500/20',
  neutral: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
  info: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function statusBadgeVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    completed: 'neutral',
    trial: 'info',
    active: 'success',
    past_due: 'danger',
  }
  return map[status] ?? 'neutral'
}
