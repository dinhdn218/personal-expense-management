import { cn } from '@/lib/utils'

const TRACK = 'color-mix(in oklab, var(--foreground) 12%, transparent)'

/**
 * Vòng tiến độ ngân sách. Dùng conic-gradient chứ không phải chart:
 * đây là một con số duy nhất, không phải chuỗi dữ liệu.
 */
export function BudgetRing({
  percent,
  over,
  size,
  hole,
  valueClassName = 'text-[26px]',
  className,
}: {
  percent: number
  over?: boolean
  size: number
  hole: number
  valueClassName?: string
  className?: string
}) {
  const capped = Math.min(100, Math.max(0, percent))
  const color = over ? 'var(--negative)' : 'var(--accent)'

  return (
    <div
      className={cn('relative shrink-0 rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} 0 ${capped}%, ${TRACK} ${capped}% 100%)`,
      }}
      role="img"
      aria-label={`Đã dùng ${percent}% hạn mức tháng`}
    >
      <div
        className="absolute rounded-full bg-background"
        style={{ inset: (size - hole) / 2 }}
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className={cn('font-extrabold tabular-nums', valueClassName)}>
          {percent}%
        </span>
        <span className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
          Đã dùng
        </span>
      </div>
    </div>
  )
}
