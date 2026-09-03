'use client'

import { Bar, BarChart, Cell, ResponsiveContainer } from 'recharts'
import { AmountSkeleton, CardLabel, GlassCard } from '@/components/ui/glass-card'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useCashflowSeries,
  useExpenseStore,
  useMonthlySummary,
} from '@/store/useExpenseStore'

function monthNumber(activeMonth: string) {
  return Number(activeMonth.split('-')[1])
}

export function CashflowCard({ className }: { className?: string }) {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const { income, expense, net, savingRate } = useMonthlySummary()
  const series = useCashflowSeries(6)

  const m = monthNumber(activeMonth)
  const expenseWidth = income ? Math.min(100, (expense / income) * 100) : expense ? 100 : 0

  return (
    <>
      {/* Mobile: tách thành 2 thẻ nhỏ như thiết kế */}
      <div className={cn('flex gap-3 md:hidden', className)}>
        <MiniStat
          label={`Thu tháng ${m}`}
          amount={income}
          tone="positive"
          ready={hasHydrated}
          fill={100}
        />
        <MiniStat
          label={`Chi tháng ${m}`}
          amount={expense}
          tone="accent"
          ready={hasHydrated}
          fill={expenseWidth}
        />
      </div>

      {/* Tablet + desktop: một thẻ đầy đủ */}
      <GlassCard
        className={cn(
          'hidden p-[18px] px-5 md:flex xl:p-5 xl:px-[22px]',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <CardLabel>Thu &amp; chi · tháng {m}</CardLabel>
          {hasHydrated && (
            <span className="shrink-0 text-[12px] font-semibold text-muted">
              Tiết kiệm{' '}
              <span className="font-extrabold text-positive tabular-nums">
                {Math.round(savingRate * 100)}%
              </span>
            </span>
          )}
        </div>

        <div className="mt-3 flex shrink-0 flex-col gap-2.5">
          <Row label="Thu" amount={income} tone="positive" ready={hasHydrated} fill={100} />
          <Row
            label="Chi"
            amount={expense}
            tone="accent"
            ready={hasHydrated}
            fill={expenseWidth}
          />
        </div>

        {/*
          Mini bar 6 tháng — chỉ desktop; tablet thay bằng dòng "Còn lại".
          Hàng bento ghim 208px nên vùng này phải co theo chỗ còn thừa
          (min-h-0 + flex-1) chứ không cao cố định, nếu không nội dung tràn
          khỏi viền thẻ và đè lên thẻ bên dưới.
        */}
        <div className="mt-3 hidden min-h-0 flex-1 flex-col xl:flex">
          {hasHydrated ? (
            <>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={series}
                    barGap={2}
                    margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                  >
                    <Bar dataKey="income" barSize={7} radius={3} isAnimationActive={false}>
                      {series.map((point, index) => (
                        <Cell
                          key={point.month}
                          fill="var(--positive)"
                          fillOpacity={index === series.length - 1 ? 1 : 0.55}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="expense" barSize={7} radius={3} isAnimationActive={false}>
                      {series.map((point, index) => (
                        <Cell
                          key={point.month}
                          fill="var(--accent)"
                          fillOpacity={index === series.length - 1 ? 1 : 0.55}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex shrink-0 justify-between font-mono text-[10.5px] font-bold">
                {series.map((point, index) => (
                  <span
                    key={point.month}
                    className={cn(
                      'flex-1 text-center',
                      index === series.length - 1 ? 'text-foreground' : 'text-muted',
                    )}
                  >
                    {point.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <AmountSkeleton className="min-h-0 w-full flex-1" />
          )}
        </div>

        {/* Tablet: footer "Còn lại" thay cho mini bar */}
        <div className="mt-auto shrink-0 border-t border-line pt-3 xl:hidden">
          <p className="text-[11.5px] font-semibold text-muted">Còn lại</p>
          {hasHydrated ? (
            <p className="text-[18px] font-extrabold tabular-nums">{formatVnd(net)}</p>
          ) : (
            <AmountSkeleton className="mt-1 h-[18px] w-28" />
          )}
        </div>
      </GlassCard>
    </>
  )
}

function Row({
  label,
  amount,
  tone,
  ready,
  fill,
}: {
  label: string
  amount: number
  tone: 'positive' | 'accent'
  ready: boolean
  fill: number
}) {
  return (
    <div>
      {/* leading-none: hàng bento chỉ cao 208px, chiều cao dòng mặc định của
          cỡ chữ 17px ăn mất chỗ của biểu đồ bên dưới. */}
      <div className="flex items-baseline justify-between gap-3 leading-none">
        <span className="text-[13px] font-bold">{label}</span>
        {ready ? (
          <span
            className={cn(
              'text-[17px] font-extrabold tabular-nums',
              tone === 'positive' ? 'text-positive' : 'text-accent',
            )}
          >
            {formatVnd(amount)}
          </span>
        ) : (
          <AmountSkeleton className="h-[17px] w-28" />
        )}
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            tone === 'positive' ? 'bg-positive' : 'bg-accent',
          )}
          style={{ width: ready ? `${fill}%` : '0%' }}
        />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  amount,
  tone,
  ready,
  fill,
}: {
  label: string
  amount: number
  tone: 'positive' | 'accent'
  ready: boolean
  fill: number
}) {
  return (
    <GlassCard className="flex-1 rounded-[20px] p-3.5 px-[15px]">
      <CardLabel>{label}</CardLabel>
      {ready ? (
        <p
          className={cn(
            'mt-2 text-[17px] font-extrabold tabular-nums',
            tone === 'positive' ? 'text-positive' : 'text-accent',
          )}
        >
          {formatVnd(amount)}
        </p>
      ) : (
        <AmountSkeleton className="mt-2 h-[17px] w-24" />
      )}
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            tone === 'positive' ? 'bg-positive' : 'bg-accent',
          )}
          style={{ width: ready ? `${fill}%` : '0%' }}
        />
      </div>
    </GlassCard>
  )
}
