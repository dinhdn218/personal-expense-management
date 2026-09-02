'use client'

import { useMemo } from 'react'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { GlassCard } from '@/components/shared/glass-card'
import { formatCurrency } from '@/lib/format'
import { getExpenseByCategory } from '@/lib/selectors'
import type { CategoryBreakdown } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

/**
 * A CSS donut standing in for a chart library. `getExpenseByCategory` already
 * returns chart-ready data, so swapping in a real chart is a local change.
 */
function buildConicGradient(breakdown: CategoryBreakdown[]): string {
  let cursor = 0
  const stops = breakdown.map((entry) => {
    const start = cursor
    cursor += entry.percentage
    return `${entry.color} ${start}% ${cursor}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export function CategoryBreakdownCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const breakdown = useMemo(
    () => getExpenseByCategory(transactions),
    [transactions],
  )
  const top = breakdown.slice(0, 3)

  return (
    <GlassCard className={className}>
      {!hasHydrated ? (
        <CardSkeleton lines={3} />
      ) : (
        <div className="flex h-full flex-col">
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
            By Category
          </p>

          {breakdown.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No spending yet.</p>
          ) : (
            <>
              <div className="mt-5 flex items-center gap-4">
                <div
                  className="relative h-20 w-20 shrink-0 rounded-full"
                  style={{ background: buildConicGradient(breakdown) }}
                  role="img"
                  aria-label={`Spending split across ${breakdown.length} categories`}
                >
                  <div className="absolute inset-[22%] rounded-full bg-[#0b1020]" />
                </div>

                <ul className="min-w-0 flex-1 space-y-2">
                  {top.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="truncate text-slate-300">{entry.label}</span>
                      <span className="ml-auto shrink-0 text-slate-400 tabular-nums">
                        {Math.round(entry.percentage)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-auto pt-4 text-sm text-slate-400">
                Top{' '}
                <span className="font-medium text-slate-100 tabular-nums">
                  {formatCurrency(breakdown[0].total)}
                </span>{' '}
                on {breakdown[0].label}
              </p>
            </>
          )}
        </div>
      )}
    </GlassCard>
  )
}
