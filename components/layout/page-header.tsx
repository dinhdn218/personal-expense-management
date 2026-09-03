'use client'

import { TransactionSheet } from '@/components/transaction/transaction-sheet'
import { glass } from '@/components/ui/glass-card'
import { formatMonthLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useExpenseStore } from '@/store/useExpenseStore'

/** Đầu trang dùng chung cho các màn 2a–2d. */
export function PageHeader({
  title,
  meta,
  showMonthPill = true,
  showAddButton = true,
  children,
}: {
  title: string
  meta?: React.ReactNode
  showMonthPill?: boolean
  showAddButton?: boolean
  children?: React.ReactNode
}) {
  const activeMonth = useExpenseStore((s) => s.activeMonth)

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[22px] leading-none font-extrabold tracking-[-.015em] md:text-[23px] xl:text-[26px]">
          {title}
        </h1>
        {meta ? (
          <p className="text-[12px] font-medium text-muted md:text-[12.5px] xl:text-[13px]">
            {meta}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5">
        {children}
        {showMonthPill && (
          <button
            type="button"
            className={cn(
              glass,
              'hidden h-10 items-center gap-2 rounded-[13px] px-[15px] text-[13.5px] font-bold sm:flex xl:h-[42px]',
            )}
          >
            {formatMonthLabel(activeMonth)}
            <span className="text-[11px] text-muted" aria-hidden>
              ▾
            </span>
          </button>
        )}
        {showAddButton && (
          <TransactionSheet
            label="+ Thêm giao dịch"
            triggerClassName="hidden md:flex"
          />
        )}
      </div>
    </header>
  )
}

/** Chip lọc / chọn dùng ở 2a và 2d. */
export function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-[44px] shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13px] whitespace-nowrap',
        'transition-colors duration-[120ms] active:bg-accent/8 md:h-[38px]',
        active
          ? 'border-2 border-accent bg-accent/14 font-extrabold'
          : 'border border-glass-border font-bold text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}
