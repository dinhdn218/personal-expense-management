'use client'

import { useMemo } from 'react'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { GlassCard } from '@/components/shared/glass-card'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { getRecentTransactions } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

export function RecentTransactionsCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const recent = useMemo(
    () => getRecentTransactions(transactions, 7),
    [transactions],
  )

  return (
    <GlassCard className={className}>
      {!hasHydrated ? (
        <CardSkeleton lines={5} />
      ) : (
        <div className="flex h-full flex-col">
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
            Recent Transactions
          </p>

          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Nothing yet. Add your first transaction.
            </p>
          ) : (
            <div className="-mx-2 mt-3 flex-1 space-y-0.5 overflow-y-auto">
              {recent.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}
