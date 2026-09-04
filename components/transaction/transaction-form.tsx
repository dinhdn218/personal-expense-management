'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { AmountInput } from '@/components/transaction/amount-input'
import { Numpad } from '@/components/transaction/numpad'
import { SaveError } from '@/components/transaction/save-error'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EXPENSE_CATEGORY_IDS,
  INCOME_CATEGORY_IDS,
  categoryOf,
} from '@/lib/categories'
import { parseAmountVnd, toDateInputValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useExpenseStore } from '@/store/useExpenseStore'
import { ACCOUNTS } from '@/types/transaction'
import type { AccountId, TxType } from '@/types/transaction'

const QUICK_AMOUNTS = ['100k', '200k', '500k', '1tr']

const schema = z
  .object({
    type: z.enum(['income', 'expense']),
    amountRaw: z.string(),
    categoryId: z.string().min(1),
    accountId: z.string().min(1),
    occurredAt: z.string().min(1),
    note: z.string().max(120).optional(),
  })
  // Số tiền phải parse được và > 0.
  .refine((v) => (parseAmountVnd(v.amountRaw) ?? 0) > 0, { path: ['amountRaw'] })
  // Ngày không ở tương lai.
  .refine((v) => v.occurredAt <= toDateInputValue(new Date()), {
    path: ['occurredAt'],
  })

type FormValues = z.infer<typeof schema>

function emptyValues(type: TxType): FormValues {
  return {
    type,
    amountRaw: '',
    categoryId: '',
    accountId: 'cash',
    occurredAt: toDateInputValue(new Date()),
    note: '',
  }
}

const fieldBox =
  'h-[50px] w-full rounded-[15px] border border-glass-border bg-well px-3.5 text-[14.5px] font-bold outline-none'

export function TransactionForm({
  variant,
  onDone,
  onCancel,
}: {
  variant: 'dialog' | 'sheet'
  onDone: () => void
  onCancel?: () => void
}) {
  const addTransaction = useExpenseStore((s) => s.addTransaction)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // Validate liên tục để bật/tắt nút Lưu, nhưng không bao giờ hiện lỗi đỏ
    // khi người dùng đang gõ dở — chỉ làm mờ nút.
    mode: 'onChange',
    defaultValues: emptyValues('expense'),
  })

  const type = useWatch({ control, name: 'type' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const amountRaw = useWatch({ control, name: 'amountRaw' })

  const categoryIds =
    type === 'income' ? INCOME_CATEGORY_IDS : EXPENSE_CATEGORY_IDS

  function selectType(next: TxType) {
    setValue('type', next, { shouldValidate: true })
    // Danh mục tách theo loại, nên bỏ lựa chọn cũ.
    setValue('categoryId', '', { shouldValidate: true })
  }

  async function submit(values: FormValues) {
    const amountVnd = parseAmountVnd(values.amountRaw)
    if (!amountVnd) return

    setStatus('saving')

    // Giữ giờ hiện tại để nhãn "Hôm nay" và thứ tự trong danh sách đúng.
    const now = new Date()
    const occurredAt = new Date(
      `${values.occurredAt}T${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes(),
      ).padStart(2, '0')}:00`,
    ).toISOString()

    try {
      await addTransaction({
        type: values.type,
        amountVnd,
        categoryId: values.categoryId as (typeof categoryIds)[number],
        accountId: values.accountId as AccountId,
        note: values.note?.trim() || undefined,
        occurredAt,
      })
    } catch {
      // Giữ nguyên form khi lưu hỏng, không xoá thứ người dùng đã gõ.
      setStatus('error')
      return
    }

    setStatus('idle')
    reset(emptyValues(values.type))
    onDone()
  }

  const isSheet = variant === 'sheet'
  const saving = status === 'saving'
  const canSubmit = isValid && !saving

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className={cn('flex flex-col', isSheet ? 'gap-4' : 'gap-[18px]')}
    >
      {/* Chi tiêu / Thu nhập */}
      <div className="flex h-11 items-center gap-1 rounded-[14px] border border-glass-border bg-well p-1">
        {(['expense', 'income'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => selectType(option)}
            aria-pressed={type === option}
            className={cn(
              'h-full flex-1 rounded-[10px] text-[13.5px] transition-colors duration-[120ms]',
              type === option
                ? 'bg-accent font-extrabold text-accent-foreground'
                : 'font-bold text-muted',
            )}
          >
            {option === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
          </button>
        ))}
      </div>

      <Controller
        control={control}
        name="amountRaw"
        render={({ field }) => (
          <AmountInput
            value={field.value}
            onChange={field.onChange}
            mode={isSheet ? 'display' : 'input'}
          />
        )}
      />

      {/* Chip nhanh — chỉ dialog, mobile đã có phím k/tr */}
      {!isSheet && (
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() =>
                setValue('amountRaw', quick, { shouldValidate: true })
              }
              className={cn(
                'h-[38px] rounded-xl border border-glass-border px-3.5 text-[13px] font-bold',
                'transition-colors duration-[120ms] hover:bg-foreground/5 active:bg-accent/8',
                amountRaw === quick && 'border-2 border-accent bg-accent/14',
              )}
            >
              {quick}
            </button>
          ))}
        </div>
      )}

      {/* Danh mục */}
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
          Danh mục
        </h3>
        <div
          className={cn(
            'flex gap-2',
            isSheet ? 'no-scrollbar -mx-[18px] overflow-x-auto px-[18px]' : 'flex-wrap',
          )}
        >
          {categoryIds.map((id) => {
            const category = categoryOf(id)
            const selected = categoryId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setValue('categoryId', id, { shouldValidate: true })
                }
                aria-pressed={selected}
                className={cn(
                  'flex h-11 shrink-0 items-center gap-2 rounded-[13px] px-[15px] text-[14px] font-bold',
                  'border transition-colors duration-[120ms] active:bg-accent/8',
                  selected
                    ? 'border-2 border-accent bg-accent/14 font-extrabold'
                    : 'border-glass-border hover:bg-foreground/5',
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: category.color }}
                  aria-hidden
                />
                {category.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ngày + nguồn tiền */}
      <div className={cn('grid gap-2.5', isSheet ? 'grid-cols-2' : 'grid-cols-2')}>
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Ngày
          </h3>
          <input
            type="date"
            max={toDateInputValue(new Date())}
            className={fieldBox}
            {...register('occurredAt')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
            Nguồn tiền
          </h3>
          <Controller
            control={control}
            name="accountId"
            render={({ field }) => (
              <Select
                items={Object.fromEntries(ACCOUNTS.map((a) => [a.id, a.label]))}
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? '')}
              >
                <SelectTrigger
                  className={cn(fieldBox, 'justify-between')}
                  size="default"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Ghi chú */}
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-[10.5px] font-bold tracking-[.16em] text-muted uppercase">
          Ghi chú
        </h3>
        <input
          type="text"
          placeholder="VD: Đi chợ nấu ăn cuối tuần"
          className={cn(
            fieldBox,
            'font-medium placeholder:font-medium placeholder:text-muted',
            isSheet && 'h-[52px]',
          )}
          {...register('note')}
        />
      </div>

      {status === 'error' && <SaveError onRetry={() => submit(getValues())} />}

      {isSheet ? (
        <Controller
          control={control}
          name="amountRaw"
          render={({ field }) => (
            <Numpad
              value={field.value}
              onChange={(next) =>
                setValue('amountRaw', next, { shouldValidate: true })
              }
              onSubmit={handleSubmit(submit)}
              canSubmit={canSubmit}
            />
          )}
        />
      ) : (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-[52px] w-[120px] rounded-[15px] border border-glass-border text-[15px] font-bold text-muted transition-colors duration-[120ms] hover:bg-foreground/5"
          >
            Huỷ
          </button>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={!canSubmit}
            className={cn(
              'h-[52px] flex-1 rounded-[15px] bg-accent text-[16.5px] font-extrabold text-accent-foreground',
              'transition-colors duration-[120ms] hover:brightness-[1.06] active:brightness-90',
              !canSubmit && 'opacity-40',
            )}
          >
            {saving ? 'Đang lưu…' : 'Lưu giao dịch'}
          </motion.button>
        </div>
      )}
    </form>
  )
}
