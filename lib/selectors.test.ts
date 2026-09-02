import { describe, expect, it } from 'vitest'
import {
  getBalance,
  getExpenseByCategory,
  getMonthlySummary,
  getRecentTransactions,
  getTotalExpense,
  getTotalIncome,
} from '@/lib/selectors'
import type { Transaction } from '@/types/transaction'

function txn(
  overrides: Partial<Transaction> & Pick<Transaction, 'id'>,
): Transaction {
  return {
    type: 'expense',
    amount: 10,
    category: 'food',
    date: '2026-03-10',
    createdAt: '2026-03-10T09:00:00.000Z',
    ...overrides,
  }
}

const transactions: Transaction[] = [
  txn({ id: '1', type: 'income', amount: 1000, category: 'salary', date: '2026-03-01' }),
  txn({ id: '2', type: 'income', amount: 500, category: 'freelance', date: '2026-02-20' }),
  txn({ id: '3', type: 'expense', amount: 300, category: 'food', date: '2026-03-05' }),
  txn({ id: '4', type: 'expense', amount: 100, category: 'food', date: '2026-03-08' }),
  txn({ id: '5', type: 'expense', amount: 100, category: 'transport', date: '2026-02-11' }),
]

describe('totals', () => {
  it('sums income', () => {
    expect(getTotalIncome(transactions)).toBe(1500)
  })

  it('sums expenses', () => {
    expect(getTotalExpense(transactions)).toBe(500)
  })

  it('computes balance as income minus expense', () => {
    expect(getBalance(transactions)).toBe(1000)
  })

  it('returns zero for an empty list', () => {
    expect(getBalance([])).toBe(0)
    expect(getTotalIncome([])).toBe(0)
    expect(getTotalExpense([])).toBe(0)
  })
})

describe('getRecentTransactions', () => {
  it('returns the newest first, limited', () => {
    expect(getRecentTransactions(transactions, 2).map((t) => t.id)).toEqual([
      '4',
      '3',
    ])
  })

  it('does not mutate the input array', () => {
    const order = transactions.map((t) => t.id)
    getRecentTransactions(transactions, 3)
    expect(transactions.map((t) => t.id)).toEqual(order)
  })

  it('breaks date ties with createdAt, newest first', () => {
    const sameDay = [
      txn({ id: 'early', date: '2026-03-10', createdAt: '2026-03-10T08:00:00.000Z' }),
      txn({ id: 'late', date: '2026-03-10', createdAt: '2026-03-10T20:00:00.000Z' }),
    ]
    expect(getRecentTransactions(sameDay, 1).map((t) => t.id)).toEqual(['late'])
  })
})

describe('getMonthlySummary', () => {
  it('includes only transactions in the given month', () => {
    expect(getMonthlySummary(transactions, '2026-03')).toEqual({
      income: 1000,
      expense: 400,
      net: 600,
    })
  })

  it('returns zeroes for a month with no transactions', () => {
    expect(getMonthlySummary(transactions, '2025-01')).toEqual({
      income: 0,
      expense: 0,
      net: 0,
    })
  })
})

describe('getExpenseByCategory', () => {
  it('groups expenses by category, largest first, with percentages', () => {
    const breakdown = getExpenseByCategory(transactions)
    expect(breakdown.map((entry) => entry.id)).toEqual(['food', 'transport'])
    expect(breakdown[0].total).toBe(400)
    expect(breakdown[0].percentage).toBe(80)
    expect(breakdown[1].percentage).toBe(20)
  })

  it('ignores income', () => {
    const breakdown = getExpenseByCategory(transactions)
    expect(breakdown.some((entry) => entry.id === 'salary')).toBe(false)
  })

  it('returns an empty array rather than NaN percentages when there are no expenses', () => {
    const incomeOnly = [
      txn({ id: 'i', type: 'income', amount: 10, category: 'salary' }),
    ]
    expect(getExpenseByCategory(incomeOnly)).toEqual([])
  })

  it('carries the category label and color', () => {
    const [top] = getExpenseByCategory(transactions)
    expect(top.label).toBe('Food & Drink')
    expect(top.color).toBe('#fb923c')
  })
})
