'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { AmountSkeleton, GlassCard } from '@/components/ui/glass-card'
import { CHART_COLORS } from '@/lib/categories'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useCategories,
  useCategoryUsage,
  useExpenseStore,
} from '@/store/useExpenseStore'

export default function CategoriesPage() {
  const hasHydrated = useExpenseStore((s) => s.hasHydrated)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const categories = useCategories()
  const usage = useCategoryUsage()
  const monthNo = Number(activeMonth.split('-')[1])

  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <main className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 md:gap-4 md:p-5 xl:gap-4 xl:p-6 xl:px-[26px]">
      <PageHeader
        title="Danh mục"
        meta={`${categories.length} danh mục · chỉ xoá được danh mục chưa có giao dịch`}
        showAddButton={false}
      />

      <GlassCard className="rounded-[20px] p-3.5 px-4 md:rounded-[22px] md:p-[18px] md:px-5 xl:p-5 xl:px-[22px]">
        {/* Header cột — desktop */}
        <div className="hidden items-center gap-3.5 border-b border-line pb-2.5 md:flex">
          <span className="flex-1 font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Tên
          </span>
          <span className="hidden w-30 font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase xl:block">
            Giao dịch
          </span>
          <span className="w-[150px] text-right font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Chi tháng {monthNo}
          </span>
          <span className="w-24" aria-hidden />
        </div>

        {!hasHydrated ? (
          <div className="mt-3 flex flex-col gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <AmountSkeleton
                key={i}
                className="h-[22px] w-full"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {categories.map((category) => {
              const stats = usage.get(category.id)
              const count = stats?.count ?? 0
              const spend = stats?.monthSpend ?? 0

              return editingId === category.id ? (
                <CategoryEditor
                  key={category.id}
                  id={category.id}
                  label={category.label}
                  color={category.color}
                  count={count}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <CategoryRow
                  key={category.id}
                  id={category.id}
                  label={category.label}
                  color={category.color}
                  count={count}
                  spend={spend}
                  onEdit={() => setEditingId(category.id)}
                />
              )
            })}
          </div>
        )}
      </GlassCard>
    </main>
  )
}

function CategoryRow({
  id,
  label,
  color,
  count,
  spend,
  onEdit,
}: {
  id: string
  label: string
  color: string
  count: number
  spend: number
  onEdit: () => void
}) {
  const removeCategory = useExpenseStore((s) => s.removeCategory)
  const deletable = count === 0

  return (
    <div className="flex flex-col border-b border-line py-3.5 last:border-b-0">
      <div className="flex items-center gap-3.5">
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="size-[11px] shrink-0 rounded"
            style={{ background: color }}
            aria-hidden
          />
          <span className="min-w-0 text-[15px] font-bold text-pretty md:text-[16px]">
            {label}
          </span>
        </span>

        <span className="hidden w-30 text-[13px] font-semibold text-muted xl:block">
          {count} giao dịch
        </span>

        <span className="w-[110px] shrink-0 text-right text-[15px] font-extrabold tabular-nums md:w-[150px] md:text-[16px]">
          {formatVnd(spend)}
        </span>

        <span className="flex w-20 shrink-0 justify-end gap-3 md:w-24">
          <button
            type="button"
            onClick={onEdit}
            className="text-[13px] font-bold text-accent"
          >
            Sửa
          </button>
          <button
            type="button"
            onClick={() => removeCategory(id)}
            disabled={!deletable}
            className={cn(
              'text-[13px] font-bold',
              deletable ? 'text-negative' : 'cursor-not-allowed text-foreground/35',
            )}
          >
            Xoá
          </button>
        </span>
      </div>

      {/* Nói thẳng lý do ngay dưới, không ẩn nút. */}
      {!deletable && (
        <p className="mt-1.5 text-[12.5px] font-medium text-muted text-pretty">
          Chưa xoá được — còn {count} giao dịch. Chuyển chúng sang danh mục khác trước
          rồi mới xoá được.
        </p>
      )}
    </div>
  )
}

function CategoryEditor({
  id,
  label,
  color,
  count,
  onDone,
}: {
  id: string
  label: string
  color: string
  count: number
  onDone: () => void
}) {
  const updateCategory = useExpenseStore((s) => s.updateCategory)
  const [draftLabel, setDraftLabel] = useState(label)
  const [draftColor, setDraftColor] = useState(color)

  function save() {
    const name = draftLabel.trim()
    if (!name) return
    updateCategory(id, { label: name, color: draftColor })
    onDone()
  }

  return (
    <div className="my-2 rounded-[18px] border-2 border-accent bg-accent/9 p-4">
      <p className="font-mono text-[10.5px] font-bold tracking-[.16em] text-accent uppercase">
        Đang sửa danh mục
      </p>

      <input
        autoFocus
        value={draftLabel}
        onChange={(e) => setDraftLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') onDone()
        }}
        aria-label="Tên danh mục"
        className="mt-3 h-[52px] w-full rounded-[14px] border-2 border-accent bg-well px-3.5 text-[17px] font-bold outline-none"
      />

      {/* Chỉ chọn trong 6 màu biểu đồ — không có color picker tự do. */}
      <div className="mt-3 flex flex-wrap gap-2.5" role="group" aria-label="Màu danh mục">
        {CHART_COLORS.map((option) => {
          const selected = draftColor === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => setDraftColor(option)}
              aria-label={`Màu ${option}`}
              aria-pressed={selected}
              className={cn(
                'size-[30px] rounded-[9px] transition-opacity duration-[120ms]',
                !selected && 'opacity-50 hover:opacity-80',
              )}
              style={{
                background: option,
                boxShadow: selected
                  ? `0 0 0 2px var(--background), 0 0 0 4px ${option}`
                  : undefined,
              }}
            />
          )
        })}
      </div>

      <div className="mt-3.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={save}
          disabled={!draftLabel.trim()}
          className={cn(
            'h-[46px] rounded-[13px] bg-accent px-5 text-[14px] font-extrabold text-accent-foreground',
            'transition-[filter] duration-[120ms] hover:brightness-[1.06] active:brightness-90',
            !draftLabel.trim() && 'opacity-40',
          )}
        >
          Lưu
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-[46px] rounded-[13px] border border-glass-border px-5 text-[14px] font-bold text-muted transition-colors duration-[120ms] hover:bg-foreground/5"
        >
          Huỷ
        </button>
      </div>

      {count > 0 && (
        <p className="mt-3 text-[12.5px] font-medium text-muted text-pretty">
          Đổi tên và màu áp dụng cho cả {count} giao dịch cũ trong danh mục này.
        </p>
      )}
    </div>
  )
}
