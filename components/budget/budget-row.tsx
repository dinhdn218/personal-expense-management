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
  const clearBudget = useExpenseStore((s) => s.clearBudget)
  const category = lookup(row.categoryId)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  // Gỡ hạn mức là mất dữ liệu, nên hỏi lại một nhịp — cùng lối với xoá giao dịch.
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [busy, setBusy] = useState(false)

  const percent = row.limit > 0 ? Math.round((row.used / row.limit) * 100) : 0
  const remaining = Math.max(0, row.limit - row.used)

  async function save() {
    const value = parseAmountVnd(draft)
    if (!value) return
    setBusy(true)
    try {
      await setBudget(row.categoryId, value)
    } catch {
      // Lưu hỏng thì giữ nguyên ô đang sửa để không mất số vừa gõ.
      setBusy(false)
      return
    }
    setBusy(false)
    setEditing(false)
    setDraft('')
  }

  async function clear() {
    setBusy(true)
    try {
      await clearBudget(row.categoryId)
    } catch {
      // Gỡ hỏng thì giữ nguyên hộp xác nhận — đóng nó lại sẽ trông như đã xong.
      setBusy(false)
      return
    }
    setBusy(false)
    setConfirmingClear(false)
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
          <LimitInput
            label={category.label}
            draft={draft}
            onDraft={setDraft}
            onSave={save}
            busy={busy}
            onCancel={() => setEditing(false)}
          />
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

      <div className="flex items-center gap-3">
        {row.over ? (
          <p className="min-w-0 flex-1 text-[12.5px] font-semibold">
            <span className="font-mono text-[10.5px] font-bold tracking-[.16em] text-negative uppercase">
              Vượt hạn mức
            </span>
            <span className="text-muted">
              {' '}
              quá {formatVnd(row.overBy)} · {percent}% hạn mức
            </span>
          </p>
        ) : (
          <p className="min-w-0 flex-1 text-[12.5px] font-semibold text-muted">
            Còn {formatVnd(remaining)} · {percent}% hạn mức
          </p>
        )}

        {!editing && !confirmingClear && (
          <span className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setDraft(String(row.limit))
                setEditing(true)
              }}
              className="text-[12.5px] font-extrabold text-accent"
            >
              Sửa
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="text-[12.5px] font-extrabold text-negative"
            >
              Gỡ
            </button>
          </span>
        )}
      </div>

      {editing && (
        <LimitInput
          label={category.label}
          draft={draft}
          onDraft={setDraft}
          onSave={save}
          busy={busy}
          onCancel={() => setEditing(false)}
        />
      )}

      {confirmingClear && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-negative/40 bg-negative/11 p-3.5">
          <p className="text-[13px] font-bold text-pretty">
            Gỡ hạn mức của “{category.label}”? Khoản đã chi vẫn giữ nguyên, chỉ
            không còn theo dõi hạn mức nữa.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="h-[44px] shrink-0 rounded-[13px] bg-negative px-4 text-[13px] font-extrabold text-white disabled:opacity-60"
            >
              {busy ? 'Đang gỡ…' : 'Gỡ hạn mức'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="h-[44px] shrink-0 rounded-[13px] border border-glass-border px-4 text-[13px] font-bold text-muted"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Ô nhập hạn mức — dùng chung cho lúc đặt mới và lúc sửa. */
function LimitInput({
  label,
  draft,
  onDraft,
  onSave,
  busy,
  onCancel,
}: {
  label: string
  draft: string
  onDraft: (value: string) => void
  onSave: () => void
  busy?: boolean
  onCancel: () => void
}) {
  const valid = parseAmountVnd(draft) && !busy
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && valid) onSave()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="VD: 2tr"
        aria-label={`Hạn mức cho ${label}`}
        className="h-[44px] min-w-0 flex-1 rounded-[13px] border border-glass-border bg-well px-3 text-[14px] font-bold outline-none"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={!valid}
        className={cn(
          'h-[44px] shrink-0 rounded-[13px] bg-accent px-4 text-[13px] font-extrabold text-accent-foreground',
          !valid && 'opacity-40',
        )}
      >
        {busy ? 'Đang lưu…' : 'Lưu'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-[44px] shrink-0 rounded-[13px] border border-glass-border px-3 text-[13px] font-bold text-muted"
      >
        Huỷ
      </button>
    </div>
  )
}
