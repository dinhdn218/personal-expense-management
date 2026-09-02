'use client'

import { AmountSkeleton, CardLabel, GlassCard } from '@/components/ui/glass-card'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useBalanceByAccount,
  useExpenseStore,
  useMonthlySummary,
  useTotalBalance,
} from '@/store/useExpenseStore'
import { ACCOUNTS } from '@/types/transaction'

export function BalanceCard({ className }: { className?: string }) {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const balance = useTotalBalance()
  const byAccount = useBalanceByAccount()
  const { net } = useMonthlySummary()

  // % thay đổi so với số dư đầu tháng. Đầu tháng âm hoặc bằng 0 thì tỉ lệ
  // không có ý nghĩa — ẩn pill thay vì hiện một con số vô nghĩa.
  const startOfMonth = balance - net
  const delta = startOfMonth > 0 ? net / startOfMonth : null

  const accounts = ACCOUNTS.filter((a) => byAccount[a.id] !== 0).slice(0, 2)

  return (
    <GlassCard
      className={cn(
        'p-4 px-[18px] md:flex-row md:items-center md:gap-5 md:p-[18px] md:px-5 xl:flex-col xl:items-stretch xl:gap-0 xl:p-5 xl:px-[22px]',
        className,
      )}
    >
      {/* Trái (tablet) / trên (desktop, mobile) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3">
          <CardLabel>Tổng số dư</CardLabel>
          {hasHydrated && delta !== null && (
            <span className="shrink-0 rounded-full border border-positive/45 bg-positive/14 px-2.5 py-1 text-[11.5px] font-extrabold tabular-nums text-positive">
              {delta > 0 ? '+' : ''}
              {(delta * 100).toFixed(1).replace('.', ',')}% so đầu tháng
            </span>
          )}
        </div>

        {hasHydrated ? (
          <p className="mt-3.5 text-[34px] leading-none font-extrabold tracking-[-.025em] tabular-nums md:text-[38px] xl:text-[42px]">
            {formatVnd(balance)}
          </p>
        ) : (
          <AmountSkeleton className="mt-3.5 h-[34px] w-56 md:h-[38px] xl:h-[42px]" />
        )}

        {hasHydrated && (
          <p
            className={cn(
              'mt-2 text-[12px] font-semibold md:text-[13px]',
              net >= 0 ? 'text-positive' : 'text-negative',
            )}
          >
            {formatVnd(net, { sign: true })} trong tháng này
          </p>
        )}
      </div>

      {/* Vách ngăn — chỉ tablet, nơi bố cục nằm ngang */}
      <div className="hidden h-24 w-px shrink-0 bg-line md:block xl:hidden" aria-hidden />

      {/* Phải (tablet) / dưới (desktop, mobile) */}
      <div
        className={cn(
          'mt-3 flex shrink-0 border-t border-line pt-3',
          'md:mt-0 md:w-[216px] md:flex-col md:border-t-0 md:pt-0',
          'xl:mt-auto xl:w-auto xl:flex-row xl:border-t xl:pt-3.5',
        )}
      >
        {accounts.map((account, index) => (
          <div
            key={account.id}
            className={cn(
              'flex min-w-0 flex-1 flex-col gap-0.5',
              // Vách dọc giữa 2 cột ở desktop/mobile; kẻ ngang khi xếp dọc ở tablet.
              index === 1 && 'border-l border-line pl-4 md:border-l-0 md:border-t md:pl-0 md:pt-2.5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-4',
              index === 0 && 'md:pb-2.5 xl:pb-0',
            )}
          >
            <span className="text-[11px] font-semibold text-muted md:text-[11.5px]">
              {account.label}
            </span>
            {hasHydrated ? (
              <span className="text-[14px] font-extrabold tabular-nums md:text-[15px]">
                {formatVnd(byAccount[account.id])}
              </span>
            ) : (
              <AmountSkeleton className="h-[15px] w-24" />
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
