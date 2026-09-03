'use client'

import { useState } from 'react'
import { formatVnd, parseAmountVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCategoryLookup, useExpenseStore } from '@/store/useExpenseStore'
import type { CategoryBudgetRow } from '@/store/useExpenseStore'

/**
 * Một danh mục trong màn Ngân sách.
 * Vượt hạn mức dùng **ba tín hiệu chồng lên nhau** (viền + nền, thanh đổi màu,
 * nhãn chữ) chứ không chỉ màu — để người mù màu vẫn đọc được.
 */
export function BudgetRow({ row, compact }: { row: CategoryBudgetRow; compact?: boolean }) {
  const lookup = useCategoryLookup()
  const setBudget = useExpenseStore((s) => s.setBudget)
  const category = lookup(row.categoryId)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const percent = row.limit > 0 ? Math.round((row.used / row.limit) * 100) : 0
  const remaining = Math.max(0, row.limit - row.used)

  function save() {
    const value = parseAmountVnd(draft)
    if (!value) return
    setBudget(row.categoryId, value)
    setEditing(false)
    setDraft('')
  }

  /* Chưa đặt hạn mức: vẫn tính vào tổng chi, chỉ không có thanh tiến độ. */
  if (row.unset) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex items-center gap-2.5">
          <span
            className="size-[9px] shrink-0 rounded-full bg-foreground/30"
            aria-hidden
          />
          <span className="min-w-0 flex-1 text-[14px] font-bold text-foreground/66 text-pretty">
            {category.label}
          </span>
          <span className="shrink-0 text-[14px] font-extrabold tabular-nums text-foreground/66">
            {formatVnd(row.used)}
          </span>
          <span className="w-6 shrink-0 text-right text-[14px] text-muted" aria-hidden>
            —
          </span>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 text-[12.5px] font-extrabold text-accent"
            >
              Đặt
            </button>
          )}
        </div>

        {editing && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') setEditing(false)
              }}
              placeholder="VD: 2tr"
              aria-label={`Hạn mức cho ${category.label}`}
              className="h-[44px] min-w-0 flex-1 rounded-[13px] border border-glass-border bg-well px-3 text-[14px] font-bold outline-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={!parseAmountVnd(draft)}
              className={cn(
                'h-[44px] shrink-0 rounded-[13px] bg-accent px-4 text-[13px] font-extrabold text-accent-foreground',
                !parseAmountVnd(draft) && 'opacity-40',
              )}
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-[44px] shrink-0 rounded-[13px] border border-glass-border px-3 text-[13px] font-bold text-muted"
            >
              Huỷ
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5',
        row.over
          ? 'rounded-2xl border border-negative/40 bg-negative/11 p-3.5'
          : 'py-2',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="size-[9px] shrink-0 rounded-full"
          style={{ background: category.color }}
          aria-hidden
        />
        <span
          className={cn(
            'min-w-0 flex-1 font-bold text-pretty',
            compact ? 'text-[14px]' : 'text-[15px]',
          )}
        >
          {category.label}
        </span>
        <span
          className={cn(
            'shrink-0 font-extrabold tabular-nums',
            compact ? 'text-[14px]' : 'text-[15px]',
          )}
        >
          {formatVnd(row.used, { unit: false })}
          <span className="font-bold text-muted"> / {formatVnd(row.limit)}</span>
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            row.over ? 'bg-negative' : 'bg-accent',
          )}
          // share đã kẹp ở 1 nên thanh không bao giờ vẽ quá 100%.
          style={{ width: `${row.share * 100}%` }}
        />
      </div>

      {row.over ? (
        <p className="text-[12.5px] font-semibold">
          <span className="font-mono text-[10.5px] font-bold tracking-[.16em] text-negative uppercase">
            Vượt hạn mức
          </span>
          <span className="text-muted">
            {' '}
            quá {formatVnd(row.overBy)} · {percent}% hạn mức
          </span>
        </p>
      ) : (
        <p className="text-[12.5px] font-semibold text-muted">
          Còn {formatVnd(remaining)} · {percent}% hạn mức
        </p>
      )}
    </div>
  )
}
