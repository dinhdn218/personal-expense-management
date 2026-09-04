'use client'

import { useMemo, useState } from 'react'
import { FilterChip, PageHeader } from '@/components/layout/page-header'
import { TransactionEdit } from '@/components/transaction/transaction-edit'
import { EmptyState } from '@/components/dashboard/empty-state'
import { AmountSkeleton, GlassCard, glass } from '@/components/ui/glass-card'
import { formatDayLabel, formatTime, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useCategories,
  useCategoryLookup,
  useExpenseStore,
  useFilteredTransactions,
} from '@/store/useExpenseStore'
import { accountOf } from '@/types/transaction'
import type { Transaction, TxType } from '@/types/transaction'

type TypeFilter = TxType | 'all'
type SortKey = 'newest' | 'oldest' | 'amount'

const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Mới nhất',
  oldest: 'Cũ nhất',
  amount: 'Số tiền',
}

function groupByDay(rows: Transaction[]) {
  const groups: Array<{ label: string; rows: Transaction[] }> = []
  for (const row of rows) {
    const label = formatDayLabel(row.occurredAt)
    const last = groups.at(-1)
    if (last && last.label === label) last.rows.push(row)
    else groups.push({ label, rows: [row] })
  }
  return groups
}

export default function TransactionsPage() {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const categories = useCategories()
  const lookup = useCategoryLookup()

  const [type, setType] = useState<TypeFilter>('all')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>('newest')
  const [editingId, setEditingId] = useState<string | null>(null)

  const rows = useFilteredTransactions({ type, categoryIds, month: activeMonth, sort })
  const groups = useMemo(() => groupByDay(rows), [rows])

  const summary = useMemo(() => {
    const income = rows.filter((r) => r.type === 'income').reduce((a, r) => a + r.amountVnd, 0)
    const expense = rows.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amountVnd, 0)
    return { income, expense }
  }, [rows])

  const filtering = type !== 'all' || categoryIds.length > 0
  const monthNo = Number(activeMonth.split('-')[1])

  // 4 danh mục chi nhiều nhất làm chip lọc nhanh, như thiết kế.
  const chipCategories = useMemo(() => categories.slice(0, 4), [categories])

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )

  const clearFilters = () => {
    setType('all')
    setCategoryIds([])
  }

  return (
    <main className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 md:gap-4 md:p-5 xl:gap-4 xl:p-6 xl:px-[26px]">
      <PageHeader
        title="Giao dịch"
        meta={
          hasHydrated
            ? `${rows.length} giao dịch tháng ${monthNo} · thu ${formatVnd(summary.income)} · chi ${formatVnd(summary.expense)}`
            : 'Đang tải…'
        }
      />

      {/* Dải lọc */}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <FilterChip active={type === 'all'} onClick={() => setType('all')}>
          Tất cả
        </FilterChip>
        <FilterChip active={type === 'expense'} onClick={() => setType('expense')}>
          Chi tiêu
        </FilterChip>
        <FilterChip active={type === 'income'} onClick={() => setType('income')}>
          Thu nhập
        </FilterChip>

        <span className="h-6 w-px shrink-0 bg-line" aria-hidden />

        {chipCategories.map((category) => (
          <FilterChip
            key={category.id}
            active={categoryIds.includes(category.id)}
            onClick={() => toggleCategory(category.id)}
          >
            <span
              className="size-2.5 rounded-[3px]"
              style={{ background: category.color }}
              aria-hidden
            />
            {category.label}
          </FilterChip>
        ))}

        <span className="hidden flex-1 md:block" />

        <FilterChip
          onClick={() =>
            setSort((s) => (s === 'newest' ? 'oldest' : s === 'oldest' ? 'amount' : 'newest'))
          }
        >
          {SORT_LABEL[sort]}
          <span className="text-[11px] text-muted" aria-hidden>
            ▾
          </span>
        </FilterChip>
      </div>

      {/* Bảng (desktop/tablet) */}
      <GlassCard
        data-testid="tx-table"
        className="hidden min-h-0 flex-1 px-[22px] pt-2 pb-5 md:flex"
      >
        <div className="flex shrink-0 items-center gap-3.5 border-b border-line py-2.5">
          <span className="hidden w-24 font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase xl:block">
            Danh mục
          </span>
          <span className="flex-1 font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Giao dịch
          </span>
          <span className="w-[130px] text-right font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Số tiền
          </span>
          <span className="w-13" aria-hidden />
        </div>

        {!hasHydrated ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          filtering ? (
            <NoMatch onClear={clearFilters} />
          ) : (
            <EmptyState className="mt-4" withActions />
          )
        ) : (
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pt-2">
            {groups.map((group) => (
              <section key={group.label} className="mb-3">
                <h2 className="py-1.5 font-mono text-[10.5px] font-extrabold tracking-[.14em] uppercase opacity-38">
                  {group.label}
                </h2>
                {group.rows.map((row) => {
                  const category = lookup(row.categoryId)
                  const isIncome = row.type === 'income'
                  return (
                    <div
                      key={row.id}
                      data-testid={`tx-row-${row.id}`}
                      className="-mx-3 flex items-center gap-3.5 rounded-[14px] px-3 py-2.5 transition-colors duration-[120ms] hover:bg-foreground/5"
                    >
                      <span className="hidden w-24 items-center gap-2 xl:flex">
                        <span
                          className="size-[9px] shrink-0 rounded-full"
                          style={{ background: category.color }}
                          aria-hidden
                        />
                        <span className="truncate text-[12.5px] font-bold">
                          {category.label}
                        </span>
                      </span>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="text-[15px] leading-[1.2] font-bold text-pretty">
                          {row.note ?? category.label}
                        </p>
                        <p className="text-[12px] font-medium text-muted">
                          <span className="xl:hidden">{category.label} · </span>
                          {accountOf(row.accountId).label} · {formatTime(row.occurredAt)}
                        </p>
                      </div>

                      <span
                        className={cn(
                          'w-[130px] shrink-0 text-right text-[17px] font-extrabold tabular-nums',
                          isIncome ? 'text-positive' : 'text-foreground',
                        )}
                      >
                        {formatVnd(isIncome ? row.amountVnd : -row.amountVnd, { sign: true })}
                      </span>

                      <button
                        type="button"
                        onClick={() => setEditingId(row.id)}
                        className="w-13 shrink-0 text-right text-[12.5px] font-extrabold text-accent"
                      >
                        Sửa
                      </button>
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Mobile: mỗi nhóm ngày là một thẻ kính, nhãn ngày nằm ngoài thẻ */}
      <div data-testid="tx-list-mobile" className="flex flex-col gap-3 pb-1 md:hidden">
        {!hasHydrated ? (
          <GlassCard className="rounded-[18px] px-3.5">
            <LoadingRows />
          </GlassCard>
        ) : rows.length === 0 ? (
          <GlassCard className="rounded-[18px] px-3.5">
            {filtering ? <NoMatch onClear={clearFilters} /> : <EmptyState withActions />}
          </GlassCard>
        ) : (
          groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-1.5 font-mono text-[10.5px] font-extrabold tracking-[.14em] uppercase opacity-38">
                {group.label}
              </h2>
              <div className={cn(glass, 'flex flex-col rounded-[18px] px-3.5')}>
                {group.rows.map((row, index) => {
                  const category = lookup(row.categoryId)
                  const isIncome = row.type === 'income'
                  return (
                    <button
                      key={row.id}
                      type="button"
                      data-testid={`tx-row-m-${row.id}`}
                      onClick={() => setEditingId(row.id)}
                      className={cn(
                        'flex items-center gap-3 py-2.5 text-left',
                        index > 0 && 'border-t border-line',
                      )}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: category.color }}
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[14px] leading-[1.2] font-bold text-pretty">
                          {row.note ?? category.label}
                        </span>
                        <span className="text-[11px] font-medium text-muted">
                          {category.label} · {accountOf(row.accountId).label} ·{' '}
                          {formatTime(row.occurredAt)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-[15px] font-extrabold tabular-nums',
                          isIncome ? 'text-positive' : 'text-foreground',
                        )}
                      >
                        {formatVnd(isIncome ? row.amountVnd : -row.amountVnd, { sign: true })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <TransactionEdit id={editingId} onClose={() => setEditingId(null)} />
    </main>
  )
}

function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
      <p className="text-[15px] font-bold text-muted">
        Không có giao dịch nào khớp bộ lọc
      </p>
      <button
        type="button"
        onClick={onClear}
        className="text-[13px] font-extrabold text-accent"
      >
        Bỏ lọc
      </button>
    </div>
  )
}

/** Khối chờ đúng kích thước nội dung thật, lệch pha để không nhấp nháy đồng loạt. */
function LoadingRows() {
  return (
    <div className="flex flex-col gap-3 pt-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3.5">
          <AmountSkeleton
            className="h-[13px] w-24"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
          <AmountSkeleton
            className="h-[15px] flex-1"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
          <AmountSkeleton
            className="h-[17px] w-[130px]"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        </div>
      ))}
    </div>
  )
}
