import { cn } from '@/lib/utils'

/**
 * Lớp kính dùng chung. Đổi ở đây là đổi cả app.
 * `glass` / `glass-border` là token đổi theo `data-theme`, nên một chuỗi class
 * này đúng cho cả chế độ tối lẫn sáng. Không shadow: chiều sâu đến từ kính + viền 1px.
 */
export const glass =
  'bg-glass backdrop-blur-xl border border-glass-border rounded-[22px]'

export function GlassCard({
  className,
  children,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section className={cn(glass, 'flex min-w-0 flex-col p-5', className)} {...props}>
      {children}
    </section>
  )
}

/** Nhãn mục in hoa, mono — dùng ở mọi đầu thẻ. */
export function CardLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={cn(
        'font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase',
        className,
      )}
    >
      {children}
    </h2>
  )
}

/** Khối giả lập lúc chờ hydrate — thay số, không dùng spinner toàn màn. */
export function AmountSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-foreground/10', className)} />
  )
}
