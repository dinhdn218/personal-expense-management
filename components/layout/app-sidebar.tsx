'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brand } from '@/components/layout/brand'
import { NAV_ITEMS, isActive } from '@/components/layout/nav-items'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { AmountSkeleton, glass } from '@/components/ui/glass-card'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useBudgetStatus,
  useExpenseStore,
  useMonthlySummary,
} from '@/store/useExpenseStore'

/** Số ngày còn lại của tháng đang xem, tính từ hôm nay. */
function daysLeftIn(month: string, now = new Date()) {
  const [year, m] = month.split('-').map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === m
  return isCurrent ? Math.max(0, lastDay - now.getDate()) : lastDay
}

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const { expense } = useMonthlySummary()
  const budget = useBudgetStatus()

  const used = Math.round(budget.share * 100)
  const remaining = Math.max(0, budget.limit - expense)

  return (
    <aside
      className={cn(
        'h-full min-h-0 w-[236px] shrink-0 flex-col gap-[26px] overflow-y-auto border-r border-line px-[18px] py-6',
        className,
      )}
    >
      <Brand />

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center rounded-[13px] px-3.5 text-left transition-colors duration-[120ms]',
                active
                  ? `${glass} rounded-[13px] text-[14.5px] font-extrabold`
                  : 'text-[14.5px] font-semibold text-foreground/56 hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="min-h-[26px] flex-1" />

      <ThemeToggle size="desktop" />

      <section className={cn(glass, 'shrink-0 rounded-[18px] p-[15px]')}>
        <h2 className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
          Ngân sách tháng
        </h2>

        {hasHydrated ? (
          <p className="mt-2.5 text-[15px] font-extrabold tabular-nums">
            {formatVnd(expense, { unit: false })}
            <span className="text-muted"> / {formatVnd(budget.limit)}</span>
          </p>
        ) : (
          <AmountSkeleton className="mt-2.5 h-[18px] w-40" />
        )}

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/13">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              budget.over ? 'bg-negative' : 'bg-accent',
            )}
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
