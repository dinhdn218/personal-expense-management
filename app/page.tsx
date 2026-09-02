'use client'

import { BalanceCard } from '@/components/dashboard/balance-card'
import { CashflowCard } from '@/components/dashboard/cashflow-card'
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { TransactionSheet } from '@/components/transaction/transaction-sheet'
import { glass } from '@/components/ui/glass-card'
import { formatMonthLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useExpenseStore } from '@/store/useExpenseStore'

export default function DashboardPage() {
  const activeMonth = useExpenseStore((s) => s.activeMonth)

  return (
    <main className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 md:gap-4 md:p-5 xl:gap-[18px] xl:p-6">
      {/* Đầu trang — mobile đã có header riêng ở khung ngoài */}
      <header className="hidden items-end justify-between gap-5 md:flex">
        <div className="flex flex-col gap-1">
          <h1 className="text-[23px] leading-none font-extrabold tracking-[-.015em] xl:text-[26px]">
            Tổng quan
          </h1>
          <p className="text-[12.5px] font-medium text-muted xl:text-[13px]">
            Chào Minh · dữ liệu lưu trên máy này
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className={cn(
              glass,
              'flex h-10 items-center gap-2 rounded-[13px] px-[15px] text-[13.5px] font-bold xl:h-[42px]',
            )}
          >
            {formatMonthLabel(activeMonth)}
            <span className="text-[11px] text-muted" aria-hidden>
              ▾
            </span>
          </button>

          <TransactionSheet
            label="+ Thêm giao dịch"
            triggerClassName="hidden xl:flex"
          />
        </div>
      </header>

      {/*
        Bento:
        mobile  -> 1 cột, thu/chi tách 2 ô nhỏ
        tablet  -> 2 cột, số dư span 2
        desktop -> 6 cột × 2 hàng (208px / 552px)
      */}
      <div
        className={cn(
          'grid grid-cols-1 gap-3 pb-1',
          'md:grid-cols-2 md:grid-rows-[190px_296px_1fr] md:gap-3.5',
          'xl:grid-cols-6 xl:grid-rows-[208px_552px] xl:gap-4',
        )}
      >
        <BalanceCard className="md:col-span-2 xl:col-span-3" />
        <CashflowCard className="md:col-span-1 xl:col-span-3" />
        <CategoryBreakdown className="md:col-span-1 xl:col-span-2 xl:row-start-2" />
        <RecentTransactions className="md:col-span-2 xl:col-span-4 xl:col-start-3 xl:row-start-2" />
      </div>
    </main>
  )
}
