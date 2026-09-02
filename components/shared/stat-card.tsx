import { GlassCard } from '@/components/shared/glass-card'
import { cn } from '@/lib/utils'

const ACCENT_CLASS = {
  default: 'text-slate-50',
  income: 'text-emerald-400',
  expense: 'text-rose-400',
} as const

interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  accent?: keyof typeof ACCENT_CLASS
  className?: string
  /** Overrides the value's type scale, e.g. for a hero figure. */
  valueClassName?: string
  children?: React.ReactNode
}

export function StatCard({
  label,
  value,
  hint,
  accent = 'default',
  className,
  valueClassName,
  children,
}: StatCardProps) {
  return (
    <GlassCard className={cn('flex flex-col justify-between', className)}>
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <div className="mt-3">
        <p
          className={cn(
            'text-3xl font-semibold tracking-tight tabular-nums',
            ACCENT_CLASS[accent],
            valueClassName,
          )}
        >
          {value}
        </p>
        {hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
      </div>
      {children}
    </GlassCard>
  )
}
