'use client'

import { useMemo } from 'react'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { GlassCard } from '@/components/shared/glass-card'
import { StatCard } from '@/components/shared/stat-card'
import { formatCurrency } from '@/lib/format'
import { getBalance, getTotalExpense, getTotalIncome } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

export function BalanceCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const { balance, income, expense } = useMemo(
    () => ({
      balance: getBalance(transactions),
      income: getTotalIncome(transactions),
      expense: getTotalExpense(transactions),
    }),
    [transactions],
  )

  if (!hasHydrated) {
    return (
      <GlassCard className={className}>
        <CardSkeleton lines={2} />
      </GlassCard>
    )
  }

  return (
    <StatCard
      className={className}
      label="Total Balance"
      value={formatCurrency(balance)}
      valueClassName="text-4xl md:text-5xl"
      hint={
        <span className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            Income{' '}
            <span className="font-medium text-emerald-400 tabular-nums">
              {formatCurrency(income)}
            </span>
          </span>
          <span>
            Spent{' '}
            <span className="font-medium text-rose-400 tabular-nums">
              {formatCurrency(expense)}
            </span>
          </span>
        </span>
      }
    />
  )
}
