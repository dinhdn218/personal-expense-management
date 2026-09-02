'use client'

import { Brand } from '@/components/layout/brand'
import { MONTHLY_BUDGET_VND, NAV_ITEMS } from '@/components/layout/nav-items'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { AmountSkeleton, glass } from '@/components/ui/glass-card'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useExpenseStore, useMonthlySummary } from '@/store/useExpenseStore'

/** Số ngày còn lại của tháng đang xem, tính từ hôm nay. */
function daysLeftIn(month: string, now = new Date()) {
  const [year, m] = month.split('-').map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === m
  return isCurrent ? Math.max(0, lastDay - now.getDate()) : lastDay
}

export function AppSidebar({ className }: { className?: string }) {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const { expense } = useMonthlySummary()

  const used = Math.min(100, Math.round((expense / MONTHLY_BUDGET_VND) * 100))
  const remaining = MONTHLY_BUDGET_VND - expense

  return (
    <aside
      className={cn(
        'w-[236px] shrink-0 flex-col gap-[26px] border-r border-line px-[18px] py-6',
        className,
      )}
    >
      <Brand />

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item, index) => {
          const active = index === 0
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center rounded-[13px] px-3.5 text-left transition-colors duration-120',
                active
                  ? `${glass} rounded-[13px] text-[14.5px] font-extrabold`
                  : 'text-[14.5px] font-semibold text-foreground/56 hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      <ThemeToggle size="desktop" />

      <section className={cn(glass, 'rounded-[18px] p-[15px]')}>
        <h2 className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
          Ngân sách tháng
        </h2>

        {hasHydrated ? (
          <p className="mt-2.5 text-[15px] font-extrabold tabular-nums">
            {formatVnd(expense, { unit: false })}
            <span className="text-muted"> / {formatVnd(MONTHLY_BUDGET_VND)}</span>
          </p>
        ) : (
          <AmountSkeleton className="mt-2.5 h-[18px] w-40" />
        )}

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/13">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: hasHydrated ? `${used}%` : '0%' }}
          />
        </div>

        <p className="mt-2.5 text-[12px] font-semibold text-muted">
          {hasHydrated
            ? `Còn ${formatVnd(Math.max(0, remaining))} cho ${daysLeftIn(activeMonth)} ngày`
            : ' '}
        </p>
      </section>
    </aside>
  )
}
