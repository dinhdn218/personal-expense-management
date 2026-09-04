'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { AmountInput } from '@/components/transaction/amount-input'
import { Numpad } from '@/components/transaction/numpad'
import { SaveError } from '@/components/transaction/save-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { EXPENSE_CATEGORY_IDS, INCOME_CATEGORY_IDS } from '@/lib/categories'
import { formatVnd, parseAmountVnd } from '@/lib/format'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import {
  useCategories,
  useCategoryLookup,
  useExpenseStore,
  useTransaction,
} from '@/store/useExpenseStore'
import { ACCOUNTS } from '@/types/transaction'
import type { AccountId } from '@/types/transaction'

const modalGlass = 'border-glass-border bg-glass backdrop-blur-[28px]'
const readCard = 'rounded-[18px] border border-glass-border bg-well p-3 px-4'
const fieldBox =
  'h-[52px] w-full rounded-[15px] border border-glass-border bg-well px-3.5 text-[14.5px] font-bold outline-none'

/** ISO -> giá trị cho <input type="datetime-local"> theo giờ địa phương. */
function toLocalInput(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function formatStamp(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `Ghi lúc ${p(d.getHours())}:${p(d.getMinutes())} · ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function TransactionEdit({
  id,
  onClose,
}: {
  id: string | null
  onClose: () => void
}) {
  const isWide = useMediaQuery('(min-width: 768px)')
  const open = id !== null

  const body = <EditBody id={id} onClose={onClose} wide={isWide} />

  if (isWide) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className={cn(modalGlass, 'w-[480px] gap-4 rounded-[26px] p-[22px] sm:max-w-[480px]')}
          showCloseButton={false}
        >
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className={cn(
          modalGlass,
          'no-scrollbar max-h-[94dvh] gap-4 overflow-y-auto rounded-t-[32px] px-[18px] pt-3 pb-[22px]',
        )}
      >
        <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-foreground/25" aria-hidden />
        {body}
      </SheetContent>
    </Sheet>
  )
}

function EditBody({
  id,
  onClose,
  wide,
}: {
  id: string | null
  onClose: () => void
  wide: boolean
}) {
  const transaction = useTransaction(id)
  const updateTransaction = useExpenseStore((s) => s.updateTransaction)
  const removeTransaction = useExpenseStore((s) => s.removeTransaction)
  const categories = useCategories()
  const lookup = useCategoryLookup()

  const [amountRaw, setAmountRaw] = useState('')
  const [editingAmount, setEditingAmount] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState<AccountId>('cash')

  // Nạp lại nháp khi mở một giao dịch khác. Không dùng effect: chỉ cần
  // phát hiện id đổi ngay trong lúc render.
  if (transaction && draftKey !== transaction.id) {
    setDraftKey(transaction.id)
    setAmountRaw(String(transaction.amountVnd))
    setNote(transaction.note ?? '')
    setOccurredAt(toLocalInput(transaction.occurredAt))
    setCategoryId(transaction.categoryId)
    setAccountId(transaction.accountId)
    setEditingAmount(false)
    setConfirmingDelete(false)
    setStatus('idle')
  }

  if (!transaction) return null

  const parsedAmount = parseAmountVnd(amountRaw)
  const saving = status === 'saving'
  const canSave = Boolean(parsedAmount && categoryId && occurredAt) && !saving
  const categoryIds =
    transaction.type === 'income' ? INCOME_CATEGORY_IDS : EXPENSE_CATEGORY_IDS
  const options = categories.filter((c) => categoryIds.includes(c.id))

  async function save() {
    if (!parsedAmount || !transaction) return
    setStatus('saving')
    try {
      await updateTransaction(transaction.id, {
        amountVnd: parsedAmount,
        categoryId,
        accountId,
        note: note.trim() || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
      })
    } catch {
      // onClose PHẢI nằm trong nhánh thành công: đóng dialog khi lưu hỏng thì
      // người dùng tưởng đã lưu xong mà thực ra chưa có gì thay đổi.
      setStatus('error')
      return
    }
    setStatus('idle')
    onClose()
  }

  async function remove() {
    if (!transaction) return
    setStatus('saving')
    try {
      await removeTransaction(transaction.id)
    } catch {
      setStatus('error')
      return
    }
    setStatus('idle')
    onClose()
  }

  return (
    <>
      {/* Đầu tấm: Huỷ | Sửa giao dịch | Lưu */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="text-[15px] font-bold text-muted transition-colors duration-[120ms] hover:text-foreground"
        >
          Huỷ
        </button>
        <DialogOrSheetTitle wide={wide} />
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={cn(
            'text-[15px] font-extrabold text-accent transition-colors duration-[120ms]',
            !canSave && 'opacity-40',
          )}
        >
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>

      {/* Số tiền: thẻ đọc, bấm "Sửa" mới bật bàn phím số */}
      {editingAmount ? (
        <AmountInput
          value={amountRaw}
          onChange={setAmountRaw}
          mode={wide ? 'input' : 'display'}
        />
      ) : (
        <div className={cn(readCard, 'flex items-center justify-between gap-3')}>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
              Số tiền
            </span>
            <span className="text-[34px] leading-none font-extrabold tabular-nums">
              {formatVnd(parsedAmount ?? transaction.amountVnd)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingAmount(true)}
            className="shrink-0 text-[12.5px] font-extrabold text-accent"
          >
            Sửa
          </button>
        </div>
      )}

      {editingAmount && !wide && (
        <Numpad
          value={amountRaw}
          onChange={setAmountRaw}
          onSubmit={() => setEditingAmount(false)}
          canSubmit={Boolean(parsedAmount)}
        />
      )}

      {/* Danh mục + nguồn tiền */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className={cn(readCard, 'flex flex-col gap-1.5')}>
          <span className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Danh mục
          </span>
          <Select
            items={Object.fromEntries(options.map((c) => [c.id, c.label]))}
            value={categoryId}
            onValueChange={(v) => setCategoryId(String(v ?? ''))}
          >
            <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 text-[14.5px] font-bold">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: lookup(categoryId).color }}
                  aria-hidden
                />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {options.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(readCard, 'flex flex-col gap-1.5')}>
          <span className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Nguồn tiền
          </span>
          <Select
            items={Object.fromEntries(ACCOUNTS.map((a) => [a.id, a.label]))}
            value={accountId}
            onValueChange={(v) => setAccountId((v ?? 'cash') as AccountId)}
          >
            <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 text-[14.5px] font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNTS.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Tên giao dịch"
        aria-label="Tên giao dịch"
        className={fieldBox}
      />
      <input
        type="datetime-local"
        value={occurredAt}
        onChange={(e) => setOccurredAt(e.target.value)}
        aria-label="Thời điểm"
        className={fieldBox}
      />

      <p className="text-[12.5px] font-medium text-muted">
        {formatStamp(transaction.createdAt)}
      </p>

      {status === 'error' && <SaveError onRetry={() => setStatus('idle')} />}

      {/* Xoá — cuối vùng cuộn, không nằm trong vùng neo đáy */}
      {confirmingDelete ? (
        <div className="rounded-[18px] border border-negative/40 bg-negative/12 p-3.5">
          <p className="text-[17px] font-extrabold text-pretty">
            Xoá “{transaction.note ?? lookup(transaction.categoryId).label}”?
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-muted text-pretty">
            {formatVnd(transaction.amountVnd)} sẽ bị gỡ khỏi số dư và mọi báo cáo.{' '}
            <span className="font-bold text-foreground">Không hoàn tác được.</span>
          </p>
          <div className="mt-3 flex gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={remove}
              disabled={saving}
              className="h-[52px] flex-1 rounded-[15px] bg-negative text-[15px] font-extrabold text-negative-foreground transition-[filter] duration-[120ms] hover:brightness-[1.06] active:brightness-90 disabled:opacity-60"
            >
              {saving ? 'Đang xoá…' : 'Xoá'}
            </motion.button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="h-[52px] flex-1 rounded-[15px] border border-glass-border text-[15px] font-bold transition-colors duration-[120ms] hover:bg-foreground/5"
            >
              Giữ lại
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="h-[52px] w-full rounded-[15px] border border-negative/50 text-[15px] font-bold text-negative transition-colors duration-[120ms] hover:bg-negative/10"
        >
          Xoá giao dịch
        </button>
      )}
    </>
  )
}

/** Tiêu đề phải là Title của đúng loại vỏ để trợ năng đọc được. */
function DialogOrSheetTitle({ wide }: { wide: boolean }) {
  if (wide) {
    return (
      <>
        <DialogTitle className="text-[17px] font-extrabold">Sửa giao dịch</DialogTitle>
        <DialogDescription className="sr-only">
          Sửa số tiền, danh mục, nguồn tiền, tên và thời điểm của giao dịch.
        </DialogDescription>
      </>
    )
  }
  return (
    <>
      <SheetTitle className="text-[17px] font-extrabold">Sửa giao dịch</SheetTitle>
      <SheetDescription className="sr-only">
        Sửa số tiền, danh mục, nguồn tiền, tên và thời điểm của giao dịch.
      </SheetDescription>
    </>
  )
}
