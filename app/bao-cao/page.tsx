'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { PageHeader } from '@/components/layout/page-header'
import { AmountSkeleton, CardLabel, GlassCard, glass } from '@/components/ui/glass-card'
import { formatVnd, formatVndShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useBiggestExpenses,
  useCashflowSeries,
  useCategoryLookup,
  useExpenseStore,
  useMonthComparison,
} from '@/store/useExpenseStore'

const RANGES = [
  { id: '12', label: '12 tháng', months: 12 },
  { id: '6', label: '6 tháng', months: 6 },
  { id: 'year', label: 'Năm nay', months: 0 },
] as const

export default function ReportPage() {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]['id']>('12')
  const lookup = useCategoryLookup()

  const monthNo = Number(activeMonth.split('-')[1])
  const monthsInYear = monthNo
  const months =
    rangeId === 'year' ? monthsInYear : RANGES.find((r) => r.id === rangeId)!.months

  const series = useCashflowSeries(months)
  const comparison = useMonthComparison()
  const biggest = useBiggestExpenses(4)

  const averages = useMemo(() => {
    if (series.length === 0) return { income: 0, expense: 0, savingRate: 0 }
    const income = series.reduce((a, p) => a + p.income, 0) / series.length
    const expense = series.reduce((a, p) => a + p.expense, 0) / series.length
    return {
      income,
      expense,
      savingRate: income > 0 ? (income - expense) / income : 0,
    }
  }, [series])

  const prevMonthNo = monthNo === 1 ? 12 : monthNo - 1
  const spendLess = comparison.expenseDelta < 0

  return (
    <main className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 md:gap-4 md:p-5 xl:gap-4 xl:p-6 xl:px-[26px]">
      <PageHeader title="Báo cáo" meta={`Thu chi theo tháng · tới tháng ${monthNo}`} showAddButton={false}>
        <div className="hidden h-10 items-center gap-1 rounded-[13px] border border-glass-border bg-well p-[3px] sm:flex">
          {RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() => setRangeId(range.id)}
              aria-pressed={rangeId === range.id}
              className={cn(
                'h-full rounded-[10px] px-3 text-[12.5px] transition-colors duration-[120ms]',
                rangeId === range.id
                  ? 'bg-accent font-extrabold text-accent-foreground'
                  : 'font-bold text-muted hover:text-foreground',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Thu & chi theo tháng */}
      <GlassCard className="rounded-[20px] p-3.5 px-4 md:rounded-[22px] md:p-[18px] md:px-5 xl:h-[396px] xl:p-5 xl:px-[22px]">
        <div className="flex items-center justify-between gap-3">
          <CardLabel>Thu &amp; chi theo tháng</CardLabel>
          <div className="flex items-center gap-3.5 text-[12px] font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-positive" aria-hidden />
              Thu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-accent" aria-hidden />
              Chi
            </span>
          </div>
        </div>

        {!hasHydrated ? (
          <AmountSkeleton className="mt-4 h-[200px] w-full xl:h-[240px]" />
        ) : (
          <div className="mt-4 h-[200px] xl:h-auto xl:min-h-0 xl:flex-1">
            {/* flex-1 chỉ dùng ở xl, nơi thẻ có chiều cao xác định (396px).
                Ở khổ nhỏ thẻ cao theo nội dung, flex-basis:0 sẽ thắng
                h-[200px] và làm biểu đồ co về 0. */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} barGap={5} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={{
                    fill: 'var(--muted)',
                    fontSize: 10.5,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
                <Tooltip cursor={{ fill: 'color-mix(in oklab, var(--foreground) 6%, transparent)' }} content={<ChartTooltip />} />
                <Bar dataKey="income" barSize={15} radius={5} isAnimationActive={false}>
                  {series.map((point, index) => (
                    <Cell
                      key={point.month}
                      fill="var(--positive)"
                      fillOpacity={index === series.length - 1 ? 1 : 0.5}
                    />
                  ))}
                </Bar>
                <Bar dataKey="expense" barSize={15} radius={5} isAnimationActive={false}>
                  {series.map((point, index) => (
                    <Cell
                      key={point.month}
                      fill="var(--accent)"
                      fillOpacity={index === series.length - 1 ? 1 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 grid shrink-0 grid-cols-3 gap-3 border-t border-line pt-3">
          <Stat label="Thu TB" value={averages.income} ready={hasHydrated} />
          <Stat label="Chi TB" value={averages.expense} ready={hasHydrated} />
          <div className="flex flex-col gap-1">
            <span className="text-[11.5px] font-semibold text-muted">Tiết kiệm</span>
            {hasHydrated ? (
              <span className="text-[16px] font-extrabold text-positive tabular-nums">
                {Math.round(averages.savingRate * 100)}%
              </span>
            ) : (
              <AmountSkeleton className="h-[16px] w-16" />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Hai thẻ dưới */}
      <div className="grid gap-3 pb-1 md:gap-4 lg:grid-cols-2">
        <GlassCard className="rounded-[20px] p-3.5 px-4 md:rounded-[22px] md:p-[18px] md:px-5 xl:p-5 xl:px-[22px]">
          <CardLabel>
            Tháng {monthNo} so tháng {prevMonthNo}
          </CardLabel>

          {!hasHydrated ? (
            <AmountSkeleton className="mt-4 h-24 w-full" />
          ) : comparison.previous.expense === 0 ? (
            <p className="mt-4 text-[14px] font-medium text-muted text-pretty">
              Tháng {prevMonthNo} chưa có khoản chi nào để so sánh.
            </p>
          ) : (
            <>
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11.5px] font-extrabold tabular-nums',
                    spendLess
                      ? 'border-positive/45 bg-positive/14 text-positive'
                      : 'border-negative/45 bg-negative/14 text-negative',
                  )}
                >
                  {spendLess ? 'Chi ít hơn' : 'Chi nhiều hơn'}{' '}
                  {Math.abs((comparison.expenseShare ?? 0) * 100)
                    .toFixed(1)
                    .replace('.', ',')}
                  %
                </span>
                <span className="text-[17px] font-extrabold tabular-nums">
                  {formatVnd(comparison.expenseDelta, { sign: true })}
                </span>
              </div>

              <ul className="mt-3.5 flex flex-col gap-2.5">
                {comparison.rows.slice(0, 3).map((row) => {
                  const category = lookup(row.categoryId)
                  const down = row.delta < 0
                  return (
                    <li key={row.categoryId} className="flex items-center gap-2.5">
                      <span
                        className="size-[9px] shrink-0 rounded-full"
                        style={{ background: category.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 text-[13.5px] font-bold text-pretty">
                        {category.label}
                      </span>
                      {row.share !== null && (
                        <span
                          className={cn(
                            'shrink-0 text-[12.5px] font-extrabold tabular-nums',
                            down ? 'text-positive' : 'text-negative',
                          )}
                        >
                          {down ? '−' : '+'}
                          {Math.abs(row.share * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className="w-[110px] shrink-0 text-right text-[13.5px] font-extrabold tabular-nums">
                        {formatVnd(row.delta, { sign: true })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </GlassCard>

        <GlassCard className="rounded-[20px] p-3.5 px-4 md:rounded-[22px] md:p-[18px] md:px-5 xl:p-5 xl:px-[22px]">
          <CardLabel>Chi lớn nhất tháng {monthNo}</CardLabel>

          {!hasHydrated ? (
            <AmountSkeleton className="mt-4 h-24 w-full" />
          ) : biggest.length === 0 ? (
            <p className="mt-4 text-[14px] font-medium text-muted">
              Tháng này chưa có khoản chi nào.
            </p>
          ) : (
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {biggest.map((row) => {
                const category = lookup(row.categoryId)
                return (
                  <li key={row.id} className="flex items-center gap-2.5">
                    <span
                      className="size-[9px] shrink-0 rounded-full"
                      style={{ background: category.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 text-[14px] font-bold text-pretty">
                      {row.note ?? category.label}
                    </span>
                    <span className="shrink-0 text-[14px] font-extrabold tabular-nums">
                      {formatVnd(row.amountVnd)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-auto border-t border-line pt-3">
            <a href="/giao-dich" className="text-[12.5px] font-extrabold text-accent">
              Xem tất cả giao dịch →
            </a>
          </div>
        </GlassCard>
      </div>
    </main>
  )
}

function Stat({ label, value, ready }: { label: string; value: number; ready: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11.5px] font-semibold text-muted">{label}</span>
      {ready ? (
        <span className="text-[16px] font-extrabold tabular-nums">
          {formatVndShort(value)}
        </span>
      ) : (
        <AmountSkeleton className="h-[16px] w-16" />
      )}
    </div>
  )
}

/** Tooltip tự viết theo style pill của app — không dùng mặc định của Recharts. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const income = payload.find((p) => p.dataKey === 'income')?.value ?? 0
  const expense = payload.find((p) => p.dataKey === 'expense')?.value ?? 0

  return (
    <div className={cn(glass, 'rounded-[13px] px-3 py-2')}>
      <p className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-extrabold text-positive tabular-nums">
        Thu {formatVnd(income)}
      </p>
      <p className="text-[13px] font-extrabold text-accent tabular-nums">
        Chi {formatVnd(expense)}
      </p>
    </div>
  )
}
