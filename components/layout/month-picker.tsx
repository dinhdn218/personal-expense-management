'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { glass } from '@/components/ui/glass-card'
import { formatMonthLabel, formatMonthShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAvailableMonths, useExpenseStore } from '@/store/useExpenseStore'

/**
 * Pill chọn tháng — dùng chung cho cả ba chỗ (dashboard, header mobile,
 * PageHeader của 2a–2d). Ghi thẳng vào `activeMonth`, nên mọi selector lọc
 * theo tháng đổi theo ngay.
 *
 * `size="mobile"` chỉ hiện "T9" cho vừa header hẹp; bản đầy đủ ghi
 * "Tháng 9, 2026".
 */
export function MonthPicker({
  size = 'default',
  className,
}: {
  size?: 'default' | 'mobile'
  className?: string
}) {
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const setActiveMonth = useExpenseStore((s) => s.setActiveMonth)
  const months = useAvailableMonths()

  const isMobile = size === 'mobile'

  return (
    <Select
      items={Object.fromEntries(months.map((m) => [m, formatMonthLabel(m)]))}
      value={activeMonth}
      onValueChange={(v) => setActiveMonth(String(v ?? activeMonth))}
    >
      <SelectTrigger
        aria-label="Chọn tháng"
        size="none"
        className={cn(
          glass,
          'shrink-0 justify-center gap-1.5 font-bold text-foreground',
          isMobile
            ? 'h-[44px] rounded-[13px] px-[13px] text-[13.5px]'
            : 'h-10 rounded-[13px] px-[15px] text-[13.5px] xl:h-[42px]',
          '[&>svg]:size-3 [&>svg]:text-muted',
          className,
        )}
      >
        {isMobile ? formatMonthShort(activeMonth) : formatMonthLabel(activeMonth)}
      </SelectTrigger>

      <SelectContent className="border border-glass-border bg-glass backdrop-blur-[28px]">
        {months.map((m) => (
          <SelectItem
            key={m}
            value={m}
            className="py-2 pl-2.5 text-[13.5px] font-bold"
          >
            {formatMonthLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
