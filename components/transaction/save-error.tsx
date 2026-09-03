import { cn } from '@/lib/utils'

/**
 * Dải báo lỗi lưu, chèn **ngay trên** hàng nút. Không toast, không đóng
 * dialog, không xoá thứ người dùng đã gõ.
 */
export function SaveError({
  onRetry,
  className,
}: {
  onRetry: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-negative/40 bg-negative/12 p-3.5',
        className,
      )}
    >
      <p className="text-[14.5px] font-extrabold">Chưa lưu được</p>
      <p className="mt-1 text-[13px] font-medium text-muted text-pretty">
        Trình duyệt đang chặn bộ nhớ cục bộ hoặc đã đầy. Không có gì bị mất.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2.5 h-[44px] rounded-[13px] bg-negative px-4 text-[14px] font-extrabold text-negative-foreground transition-[filter] duration-[120ms] hover:brightness-[1.06] active:brightness-90"
      >
        Thử lại
      </button>
    </div>
  )
}
