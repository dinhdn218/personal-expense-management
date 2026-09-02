'use client'

import { Brand } from '@/components/layout/brand'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { glass } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'
import { useExpenseStore } from '@/store/useExpenseStore'

export function MobileHeader({ className }: { className?: string }) {
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const month = Number(activeMonth.split('-')[1])

  return (
    <header
      className={cn(
        'flex h-[54px] shrink-0 items-center justify-between gap-3 px-[18px] pt-2',
        className,
      )}
    >
      <Brand size="mobile" />

      <div className="flex items-center gap-2">
        <ThemeToggle size="mobile" />
        <button
          type="button"
          className={cn(
            glass,
            'flex h-[44px] shrink-0 items-center gap-1.5 rounded-[13px] px-[13px] text-[13.5px] font-bold',
          )}
        >
          T{month}
          <span className="text-[11px] text-muted" aria-hidden>
            ▾
          </span>
        </button>
      </div>
    </header>
  )
}
