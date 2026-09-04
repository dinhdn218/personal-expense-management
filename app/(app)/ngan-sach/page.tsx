'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { BudgetRing } from '@/components/budget/budget-ring'
import { BudgetRow } from '@/components/budget/budget-row'
import { PageHeader } from '@/components/layout/page-header'
import { AmountSkeleton, CardLabel, GlassCard, glass } from '@/components/ui/glass-card'
import { daysLeftInMonth, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBudgetRows, useBudgetStatus, useExpenseStore } from '@/store/useExpenseStore'

export default function BudgetPage() {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const status = useBudgetStatus()
  const rows = useBudgetRows()

  const { withLimit, withoutLimit } = useMemo(
    () => ({
      withLimit: rows.filter((r) => !r.unset),
      withoutLimit: rows.filter((r) => r.unset),
    }),
    [rows],
  )

  const percent = status.limit > 0 ? Math.round((status.used / status.limit) * 100) : 0
  const remaining = Math.max(0, status.limit - status.used)
  const daysLeft = daysLeftInMonth(activeMonth)
  const perDay = Math.round(remaining / daysLeft)

  return (
    <main className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 md:gap-4 md:p-5 xl:gap-4 xl:p-6 xl:px-[26px]">
      <PageHeader
        title="Ngân sách"
        meta={
          hasHydrated
            ? `Đã dùng ${formatVnd(status.used)} trên ${formatVnd(status.limit)} · còn ${daysLeft} ngày`
            : 'Đang tải…'
        }
      >
        {/* Lối vào màn Danh mục cho mobile — thanh tab dưới chỉ đủ 4 mục. */}
        <Link
          href="/danh-muc"
          className={cn(
            glass,
            'flex h-10 items-center rounded-[13px] px-[15px] text-[13.5px] font-bold xl:hidden',
          )}
        >
          Danh mục
        </Link>
      </PageHeader>

      {/* Mobile: thẻ tổng nằm trên cùng */}
      <GlassCard className="flex-row items-center gap-4 rounded-[20px] p-3.5 px-4 md:hidden">
        {hasHydrated ? (
          <>
            <BudgetRing
              percent={percent}
              over={status.over}
              size={96}
              hole={70}
              valueClassName="text-[20px]"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-[15px] font-extrabold tabular-nums">
                {formatVnd(status.used, { unit: false })}
                <span className="font-bold text-muted"> / {formatVnd(status.limit)}</span>
              </p>
              <p className="text-[12.5px] font-semibold text-muted">
                Còn {formatVnd(perDay)}/ngày
              </p>
            </div>
          </>
        ) : (
          <AmountSkeleton className="h-24 w-full" />
        )}
      </GlassCard>

      {/* Cột đôi từ 1024px, dưới đó xếp một cột — theo mục "Khổ tablet" trong README. */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-[1fr_320px] lg:items-stretch">
        {/* Cột trái — theo danh mục */}
        <GlassCard className="rounded-[20px] p-3.5 px-4 md:rounded-[22px] md:p-[18px] md:px-5 xl:p-5 xl:px-[22px]">
          <CardLabel>Theo danh mục</CardLabel>

          {!hasHydrated ? (
            <div className="mt-4 flex flex-col gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <AmountSkeleton
                    className="h-[15px] w-full"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                  <AmountSkeleton
                    className="h-2 w-full"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="mt-6 text-[15px] font-medium text-muted">
              Chưa có hạn mức nào. Đặt hạn mức để theo dõi chi tiêu theo danh mục.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-col gap-1">
                {withLimit.map((row) => (
                  <BudgetRow key={row.categoryId} row={row} />
                ))}
              </div>

              {withoutLimit.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <CardLabel>Chưa đặt hạn mức</CardLabel>
                  <div className="mt-1 flex flex-col">
                    {withoutLimit.map((row) => (
                      <BudgetRow key={row.categoryId} row={row} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </GlassCard>

        {/* Cột phải — cả tháng + nhịp chi. Kéo bằng cột trái nhờ items-stretch. */}
        <div className="hidden flex-col gap-4 md:flex">
          <GlassCard className="items-center p-[18px] px-5 xl:p-5 xl:px-[22px]">
            <CardLabel className="self-start">Cả tháng</CardLabel>
            {hasHydrated ? (
              <>
                <BudgetRing
                  percent={percent}
                  over={status.over}
                  size={156}
                  hole={112}
                  className="mt-4"
                />
                <p className="mt-4 text-[18px] font-extrabold tabular-nums">
                  {formatVnd(status.used, { unit: false })}
                  <span className="font-bold text-muted"> / {formatVnd(status.limit)}</span>
                </p>
                <p className="mt-1 text-[12.5px] font-semibold text-muted">
                  {status.over
                    ? `Quá hạn mức ${formatVnd(status.overBy)}`
                    : `Còn ${formatVnd(remaining)} cho ${daysLeft} ngày`}
                </p>
              </>
            ) : (
              <AmountSkeleton className="mt-4 size-[156px] rounded-full" />
            )}
          </GlassCard>

          <GlassCard className="flex-1 p-[18px] px-5 xl:p-5 xl:px-[22px]">
            <CardLabel>Nhịp chi</CardLabel>
            {hasHydrated ? (
              <>
                <p className="mt-3 text-[15px] font-bold text-pretty">
                  Còn {daysLeft} ngày, tiêu tối đa{' '}
                  <span className="font-extrabold text-accent tabular-nums">
                    {formatVnd(perDay)}/ngày
                  </span>{' '}
                  là vừa hạn mức.
                </p>
                <div className="my-3.5 h-px bg-line" />
                <p className="text-[12.5px] font-semibold text-muted">
                  Hạn mức an toàn còn lại
                </p>
                <p
                  className={cn(
                    'mt-1 text-[18px] font-extrabold tabular-nums',
                    status.over ? 'text-negative' : 'text-foreground',
                  )}
                >
                  {formatVnd(remaining)}
                </p>
              </>
            ) : (
              <AmountSkeleton className="mt-3 h-[60px] w-full" />
            )}
          </GlassCard>
        </div>

        {/* Mobile: nhịp chi một câu */}
        <GlassCard className="rounded-[20px] p-3.5 px-4 md:hidden">
          <CardLabel>Nhịp chi</CardLabel>
          {hasHydrated ? (
            <p className="mt-2 text-[14px] font-bold text-pretty">
              Còn {daysLeft} ngày, tiêu tối đa{' '}
              <span className="font-extrabold text-accent tabular-nums">
                {formatVnd(perDay)}/ngày
              </span>{' '}
              là vừa hạn mức.
            </p>
          ) : (
            <AmountSkeleton className="mt-2 h-[36px] w-full" />
          )}
        </GlassCard>
      </div>
    </main>
  )
}
