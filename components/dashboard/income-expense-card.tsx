'use client'

import { useMemo } from 'react'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { GlassCard } from '@/components/shared/glass-card'
import { currentMonthKey, formatCurrency } from '@/lib/format'
import { getMonthlySummary } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

export function IncomeExpenseCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const summary = useMemo(
    () => getMonthlySummary(transactions, currentMonthKey()),
    [transactions],
  )

  // Bars are scaled against the larger figure, so the bigger one fills the track.
  const scale = Math.max(summary.income, summary.expense, 1)

  return (
    <GlassCard className={className}>
      {!hasHydrated ? (
        <CardSkeleton lines={2} />
      ) : (
        <div className="flex h-full flex-col">
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
            This Month
          </p>

          <div className="mt-5 space-y-4">
            <Bar
              label="Income"
              value={summary.income}
              width={(summary.income / scale) * 100}
              barClass="bg-emerald-400"
              valueClass="text-emerald-400"
            />
            <Bar
              label="Expense"
              value={summary.expense}
              width={(summary.expense / scale) * 100}
              barClass="bg-rose-400"
              valueClass="text-rose-400"
            />
          </div>

          <p className="mt-auto pt-4 text-sm text-slate-400">
            Net{' '}
            <span className="font-medium text-slate-100 tabular-nums">
              {formatCurrency(summary.net)}
            </span>
          </p>
        </div>
      )}
    </GlassCard>
  )
}

function Bar({
  label,
  value,
  width,
  barClass,
  valueClass,
}: {
  label: string
  value: number
  width: number
  barClass: string
  valueClass: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={`font-medium tabular-nums ${valueClass}`}>
          {formatCurrency(value)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
