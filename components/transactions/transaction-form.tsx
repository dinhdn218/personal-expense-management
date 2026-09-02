'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toIsoDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useExpenseStore } from '@/store/use-expense-store'
import { categoriesForType } from '@/types/transaction'
import type { TransactionType } from '@/types/transaction'

// `amount` is kept as a string and converted on submit. `z.coerce.number()`
// would make the schema's input and output types differ, which trips up
// zodResolver's generics.
const formSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
  category: z.string().min(1, 'Pick a category'),
  date: z.string().min(1, 'Pick a date'),
  note: z.string().max(120, 'Keep the note under 120 characters').optional(),
})

type FormValues = z.infer<typeof formSchema>

function emptyValues(type: TransactionType): FormValues {
  return {
    type,
    amount: '',
    category: '',
    date: toIsoDate(new Date()),
    note: '',
  }
}

export function TransactionForm({ onSubmitted }: { onSubmitted: () => void }) {
  const addTransaction = useExpenseStore((state) => state.addTransaction)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues('expense'),
  })

  const type = watch('type')
  const categories = categoriesForType(type)
  const categoryLabels = Object.fromEntries(
    categories.map((category) => [category.id, category.label]),
  )

  function selectType(next: TransactionType) {
    setValue('type', next)
    // Categories are type-specific, so a stale selection must be cleared.
    setValue('category', '')
  }

  function onSubmit(values: FormValues) {
    addTransaction({
      type: values.type,
      amount: Number(values.amount),
      category: values.category,
      date: values.date,
      note: values.note?.trim() || undefined,
    })
    reset(emptyValues(values.type))
    onSubmitted()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1">
          {(['expense', 'income'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectType(option)}
              aria-pressed={type === option}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors',
                type === option
                  ? option === 'income'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <Field data-invalid={Boolean(errors.amount)}>
          <FieldLabel htmlFor="amount">Amount</FieldLabel>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            aria-invalid={Boolean(errors.amount)}
            {...register('amount')}
          />
          <FieldError errors={[errors.amount]} />
        </Field>

        <Field data-invalid={Boolean(errors.category)}>
          <FieldLabel htmlFor="category">Category</FieldLabel>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                items={categoryLabels}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? '')}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.category]} />
        </Field>

        <Field data-invalid={Boolean(errors.date)}>
          <FieldLabel htmlFor="date">Date</FieldLabel>
          <Input id="date" type="date" {...register('date')} />
          <FieldError errors={[errors.date]} />
        </Field>

        <Field data-invalid={Boolean(errors.note)}>
          <FieldLabel htmlFor="note">Note</FieldLabel>
          <Input id="note" placeholder="Optional" {...register('note')} />
          <FieldError errors={[errors.note]} />
        </Field>

        <Button type="submit" className="w-full">
          Add transaction
        </Button>
      </FieldGroup>
    </form>
  )
}
