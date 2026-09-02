import { formatRelativeDay, formatSignedAmount } from '@/lib/format'
import { getCategory } from '@/types/transaction'
import type { Transaction } from '@/types/transaction'

export function TransactionItem({ transaction }: { transaction: Transaction }) {
  const category = getCategory(transaction.category)
  const isIncome = transaction.type === 'income'

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={{ backgroundColor: `${category.color}22`, color: category.color }}
        aria-hidden
      >
        {category.label.slice(0, 1)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">
          {transaction.note?.trim() || category.label}
        </p>
        <p className="text-xs text-slate-500">
          {category.label} · {formatRelativeDay(transaction.date)}
        </p>
      </div>

      <span
        className={`shrink-0 text-sm font-medium tabular-nums ${
          isIncome ? 'text-emerald-400' : 'text-slate-200'
        }`}
      >
        {formatSignedAmount(transaction.type, transaction.amount)}
      </span>
    </div>
  )
}
