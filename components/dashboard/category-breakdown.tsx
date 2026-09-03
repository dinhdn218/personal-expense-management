'use client'

import Link from 'next/link'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { EmptyState } from '@/components/dashboard/empty-state'
import { AmountSkeleton, CardLabel, GlassCard } from '@/components/ui/glass-card'
import { categoryOf } from '@/lib/categories'
import { formatVnd, formatVndShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useExpenseByCategory, useExpenseStore } from '@/store/useExpenseStore'

export function CategoryBreakdown({ className }: { className?: string }) {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const slices = useExpenseByCategory()
  const total = slices.reduce((a, s) => a + s.amount, 0)

  const data = slices.map((slice) => ({
    ...slice,
    label: categoryOf(slice.categoryId).label,
    color: categoryOf(slice.categoryId).color,
  }))

  return (
    <GlassCard
      className={cn(
        'rounded-[20px] p-3.5 px-4 md:rounded-[22px] md:p-[18px] md:px-5 xl:p-5 xl:px-[22px]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <CardLabel>Chi theo danh mục</CardLabel>
        <Link
          href="/bao-cao"
          className="text-[12.5px] font-extrabold text-accent md:hidden"
        >
          Tất cả
        </Link>
      </div>

      {!hasHydrated ? (
        <AmountSkeleton className="mt-4 h-24 w-full" />
      ) : data.length === 0 ? (
        <EmptyState className="mt-4" />
      ) : (
        <>
          {/* Mobile: thanh xếp lớp thay donut */}
          <div className="mt-3.5 md:hidden">
            <div className="flex h-[9px] overflow-hidden rounded-full">
              {data.map((slice) => (
                <span
                  key={slice.categoryId}
                  style={{
                    width: `${slice.share * 100}%`,
                    background: slice.color,
                  }}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {data.slice(0, 3).map((slice) => (
                <LegendRow key={slice.categoryId} slice={slice} size="mobile" />
              ))}
            </ul>
          </div>

          {/* Tablet: donut 120 cạnh legend · Desktop: donut 168 trên legend */}
          <div className="mt-4 hidden flex-1 md:flex md:flex-row md:items-center md:gap-4 xl:flex-col xl:items-stretch xl:gap-4">
            <Donut data={data} total={total} />

            <ul className="flex min-w-0 flex-1 flex-col gap-2 xl:gap-2.5">
              {data.slice(0, 4).map((slice) => (
                <LegendRow key={slice.categoryId} slice={slice} size="tablet" />
              ))}
              {data.slice(4, 6).map((slice) => (
                <LegendRow
                  key={slice.categoryId}
                  slice={slice}
                  size="tablet"
                  className="hidden xl:flex"
                />
              ))}
            </ul>
          </div>

          <div className="mt-auto hidden border-t border-line pt-3 md:block">
            <Link
              href="/bao-cao"
              className="text-[12.5px] font-extrabold text-accent"
            >
              {data.length > 4 ? `Xem ${data.length} danh mục` : 'Xem báo cáo chi tiết'} →
            </Link>
          </div>
        </>
      )}
    </GlassCard>
  )
}

function Donut({
  data,
  total,
}: {
  data: Array<{ categoryId: string; amount: number; color: string }>
  total: number
}) {
  return (
    <div className="relative mx-auto size-[120px] shrink-0 xl:size-[168px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="categoryId"
            innerRadius="66%"
            outerRadius="100%"
            paddingAngle={0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell key={slice.categoryId} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
          Tổng chi
        </span>
        <span className="text-[13px] font-extrabold tabular-nums xl:text-[16px]">
          <span className="xl:hidden">{formatVndShort(total)}</span>
          <span className="hidden xl:inline">{formatVnd(total)}</span>
        </span>
      </div>
    </div>
  )
}

function LegendRow({
  slice,
  size,
  className,
}: {
  slice: { categoryId: string; amount: number; share: number; label: string; color: string }
  size: 'mobile' | 'tablet'
  className?: string
}) {
  return (
    <li className={cn('flex items-center gap-2.5', className)}>
      <span
        className="size-[9px] shrink-0 rounded-[3px]"
        style={{ background: slice.color }}
        aria-hidden
      />
      <span
        className={cn(
          'min-w-0 flex-1 font-bold text-pretty',
          size === 'mobile' ? 'text-[13px]' : 'text-[12.5px] xl:text-[13.5px]',
        )}
      >
        {slice.label}
      </span>
      <span
        className={cn(
          'shrink-0 font-extrabold tabular-nums',
          size === 'mobile' ? 'text-[13px]' : 'text-[12.5px] xl:text-[13.5px]',
        )}
      >
        {formatVnd(slice.amount)}
      </span>
      <span className="w-[38px] shrink-0 text-right font-mono text-[12px] text-muted tabular-nums">
        {Math.round(slice.share * 100)}%
      </span>
    </li>
  )
}
