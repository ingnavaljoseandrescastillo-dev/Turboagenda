import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ className, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900',
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
