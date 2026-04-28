import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {helper && !error && <p className="text-xs text-zinc-500">{helper}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
