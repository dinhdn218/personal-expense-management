'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS_COMPACT, isActive } from '@/components/layout/nav-items'
import { TransactionSheet } from '@/components/transaction/transaction-sheet'
import { glass } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'

export function MobileTabbar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <div className={cn('shrink-0 px-4 pt-2 pb-2.5', className)}>
      <TransactionSheet
        label="+ Thêm giao dịch"
        triggerClassName="h-[52px] w-full rounded-2xl text-[16.5px]"
      />

      <nav
        className={cn(
          glass,
          'mt-2.5 flex h-[62px] items-center gap-1 rounded-[20px] px-1.5',
        )}
      >
        {NAV_ITEMS_COMPACT.map((item) => {
          const active = isActive(item.href, pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-[46px] flex-1 items-center justify-center rounded-[14px] text-center text-[12.5px] transition-colors duration-[120ms]',
                active ? 'bg-foreground/8 font-extrabold' : 'font-semibold text-muted',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
