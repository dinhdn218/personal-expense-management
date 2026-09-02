import { getCategory } from '@/types/transaction'
import type { Transaction } from '@/types/transaction'

export interface CategoryBreakdown {
  id: string
  label: string
  color: string
  total: number
  percentage: number
}

export interface MonthlySummary {
  income: number
  expense: number
  net: number
}

function sumBy(transactions: Transaction[], type: Transaction['type']): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function getTotalIncome(transactions: Transaction[]): number {
  return sumBy(transactions, 'income')
}

export function getTotalExpense(transactions: Transaction[]): number {
  return sumBy(transactions, 'expense')
}

export function getBalance(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpense(transactions)
}

export function getRecentTransactions(
  transactions: Transaction[],
  limit = 5,
): Transaction[] {
  return [...transactions]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, limit)
}

/** `monthKey` is 'YYYY-MM'. */
export function getMonthlySummary(
  transactions: Transaction[],
  monthKey: string,
): MonthlySummary {
  const inMonth = transactions.filter((transaction) =>
    transaction.date.startsWith(monthKey),
  )
  const income = getTotalIncome(inMonth)
  const expense = getTotalExpense(inMonth)
  return { income, expense, net: income - expense }
}

export function getExpenseByCategory(
  transactions: Transaction[],
): CategoryBreakdown[] {
  const expenses = transactions.filter(
    (transaction) => transaction.type === 'expense',
  )
  const total = expenses.reduce((sum, transaction) => sum + transaction.amount, 0)
  if (total === 0) return []

  const totalsById = new Map<string, number>()
  for (const transaction of expenses) {
    totalsById.set(
      transaction.category,
      (totalsById.get(transaction.category) ?? 0) + transaction.amount,
    )
  }

  return [...totalsById.entries()]
    .map(([id, categoryTotal]) => {
      const category = getCategory(id)
      return {
        id,
        label: category.label,
        color: category.color,
        total: categoryTotal,
        percentage: (categoryTotal / total) * 100,
      }
    })
    .sort((a, b) => b.total - a.total)
}
