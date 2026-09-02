import type { TransactionType } from '@/types/transaction'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatSignedAmount(
  type: TransactionType,
  amount: number,
): string {
  const sign = type === 'income' ? '+' : '-'
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`
}

/**
 * Parses 'YYYY-MM-DD' as a local date. `new Date('2026-01-01')` parses as UTC
 * midnight, which renders as the previous day in negative UTC offsets.
 */
function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(isoDate: string): string {
  return dayFormatter.format(parseIsoDate(isoDate))
}

export function formatRelativeDay(isoDate: string): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isoDate === toIsoDate(today)) return 'Today'
  if (isoDate === toIsoDate(yesterday)) return 'Yesterday'
  return formatDate(isoDate)
}

export function currentMonthKey(): string {
  return toIsoDate(new Date()).slice(0, 7)
}
