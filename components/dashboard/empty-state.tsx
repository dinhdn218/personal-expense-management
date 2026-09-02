import { cn } from '@/lib/utils'

/** Trạng thái rỗng dùng chung cho thẻ danh mục và thẻ giao dịch gần đây. */
export function EmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center',
        className,
      )}
    >
      <div
        className="size-16 rounded-2xl border-2 border-dashed border-foreground/20"
        aria-hidden
      />
      <p className="text-[22px] leading-tight font-extrabold text-pretty">
        Chưa có giao dịch nào
      </p>
      <p className="max-w-[26ch] text-[15px] font-medium text-muted text-pretty">
        Ghi khoản đầu tiên để thấy số liệu ở đây.
      </p>
    </div>
  )
}
