'use client'

import { Brand } from '@/components/layout/brand'
import { MonthPicker } from '@/components/layout/month-picker'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { cn } from '@/lib/utils'

export function MobileHeader({ className }: { className?: string }) {
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
        <MonthPicker size="mobile" />
      </div>
    </header>
  )
}
