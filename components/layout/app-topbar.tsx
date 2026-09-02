'use client'

import { Brand } from '@/components/layout/brand'
import { NAV_ITEMS_COMPACT } from '@/components/layout/nav-items'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { TransactionSheet } from '@/components/transaction/transaction-sheet'
import { glass } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'

export function AppTopbar({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        'h-[66px] shrink-0 items-center gap-4 border-b border-line px-5',
        className,
      )}
    >
      <Brand size="tablet" />

      <nav className="flex items-center gap-1">
        {NAV_ITEMS_COMPACT.map((item, index) => {
          const active = index === 0
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center rounded-xl px-3.5 text-[13.5px] transition-colors duration-[120ms]',
                active
                  ? `${glass} rounded-xl font-extrabold`
                  : 'font-semibold text-foreground/56 hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      <ThemeToggle size="tablet" />
      <TransactionSheet label="+ Thêm" triggerClassName="h-10 px-4 text-[13.5px]" />
    </header>
  )
}
