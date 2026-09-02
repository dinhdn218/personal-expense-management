'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/components/dashboard/empty-state'
import { AmountSkeleton, CardLabel, GlassCard } from '@/components/ui/glass-card'
import { categoryOf } from '@/lib/categories'
import { formatDayLabel, formatTime, formatVnd } from '@/lib/format'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { useExpenseStore, useRecentTransactions } from '@/store/useExpenseStore'
import { accountOf } from '@/types/transaction'
import type { Transaction } from '@/types/transaction'

/** Gom các giao dịch liên tiếp cùng ngày thành nhóm có nhãn. */
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

export function RecentTransactions({ className }: { className?: string }) {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const isTablet = useMediaQuery('(min-width: 768px)')
  const isDesktop = useMediaQuery('(min-width: 1280px)')

  const limit = isDesktop ? 6 : isTablet ? 4 : 3
  const rows = useRecentTransactions(limit)
  const highlightId = useNewRowHighlight(rows, hasHydrated)

  const groups = groupByDay(rows)

  return (
    <GlassCard
      className={cn(
        'rounded-[20px] p-3.5 px-4 md:rounded-[22px] md:p-[18px] md:px-5 xl:p-5 xl:px-[22px]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <CardLabel>
          <span className="md:hidden">Gần đây</span>
          <span className="hidden md:inline">Giao dịch gần đây</span>
        </CardLabel>
        <button type="button" className="text-[12.5px] font-extrabold text-accent">
          Xem tất cả
        </button>
      </div>

      {!hasHydrated ? (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <AmountSkeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState className="mt-4" />
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto xl:gap-4 no-scrollbar">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="font-mono text-[10.5px] font-extrabold tracking-[.14em] uppercase opacity-38">
                {group.label}
              </h3>
              <AnimatePresence initial={false}>
                {group.rows.map((row, index) => (
                  <Row
                    key={row.id}
                    row={row}
                    highlighted={row.id === highlightId}
                    divided={index > 0}
                  />
                ))}
              </AnimatePresence>
            </section>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function Row({
  row,
  highlighted,
  divided,
}: {
  row: Transaction
  highlighted: boolean
  divided: boolean
}) {
  const reduceMotion = useReducedMotion()
  const category = categoryOf(row.categoryId)
  const isIncome = row.type === 'income'

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(divided && 'border-t border-line')}
    >
      <div className="relative -mx-3 flex items-center gap-3.5 rounded-[14px] px-3 py-2.5 transition-colors duration-[120ms] md:hover:bg-foreground/5">
        {highlighted && !reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[14px] bg-accent/12"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'linear' }}
          />
        )}

        <span
          className="size-[9px] shrink-0 rounded-full"
          style={{ background: category.color }}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Không truncate: tên dài thì xuống dòng. */}
          <p className="text-[14px] leading-[1.2] font-bold text-pretty md:text-[14.5px] xl:text-[15px]">
            {row.note ?? category.label}
          </p>
          <p className="text-[11px] font-medium text-muted md:text-[12px]">
            {category.label} · {accountOf(row.accountId).label} ·{' '}
            {formatTime(row.occurredAt)}
          </p>
        </div>

        <span
          className={cn(
            'shrink-0 text-[15px] font-extrabold tabular-nums md:text-[16px] xl:text-[17px]',
            isIncome ? 'text-positive' : 'text-foreground',
          )}
        >
          {formatVnd(isIncome ? row.amountVnd : -row.amountVnd, { sign: true })}
        </span>
      </div>
    </motion.div>
  )
}

/**
 * Trả về id của giao dịch vừa được thêm trong phiên này, trong 2 giây.
 * Lần chạy đầu chỉ ghi nhận danh sách hiện có — không làm sáng dữ liệu cũ.
 */
function useNewRowHighlight(rows: Transaction[], ready: boolean) {
  const seen = useRef<Set<string> | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return

    if (seen.current === null) {
      seen.current = new Set(rows.map((r) => r.id))
      return
    }

    const fresh = rows.find((r) => !seen.current!.has(r.id))
    for (const row of rows) seen.current.add(row.id)
    if (!fresh) return

    setHighlightId(fresh.id)
    const timer = setTimeout(() => setHighlightId(null), 2000)
    return () => clearTimeout(timer)
  }, [rows, ready])

  return highlightId
}
