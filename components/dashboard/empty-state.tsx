'use client'

import { TransactionSheet } from '@/components/transaction/transaction-sheet'
import { cn } from '@/lib/utils'

/**
 * Trạng thái rỗng. `withActions` dùng cho màn rỗng toàn trang (2f): không vẽ
 * thẻ số dư rỗng hay biểu đồ trống, chỉ một lời mời và nút thêm giao dịch.
 */
export function EmptyState({
  className,
  message = 'Ghi khoản đầu tiên để thấy số liệu ở đây.',
  withActions = false,
}: {
  className?: string
  message?: string
  withActions?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center',
        className,
      )}
    >
      <div
        className="size-16 rounded-[18px] border-2 border-dashed border-foreground/20"
        aria-hidden
      />
      <p className="text-[22px] leading-tight font-extrabold text-pretty">
        Chưa có giao dịch nào
      </p>
      <p className="max-w-[30ch] text-[15px] font-medium text-muted text-pretty">
        {message}
      </p>

      {withActions && (
        <div className="mt-3 flex w-full max-w-[320px] flex-col gap-2.5">
          <TransactionSheet
            label="+ Thêm giao dịch"
            triggerClassName="h-[52px] w-full rounded-2xl text-[16.5px]"
          />
        </div>
      )}
    </div>
  )
}
