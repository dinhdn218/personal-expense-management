import { beforeEach, describe, expect, it } from 'vitest'
import { useExpenseStore } from '@/store/use-expense-store'
import type { Transaction } from '@/types/transaction'

const existing: Transaction = {
  id: 'existing-1',
  type: 'expense',
  amount: 20,
  category: 'food',
  date: '2026-03-01',
  note: 'Coffee',
  createdAt: '2026-03-01T09:00:00.000Z',
}

beforeEach(() => {
  // The store is a module-level singleton shared across tests.
  useExpenseStore.setState({ transactions: [existing] })
})

describe('addTransaction', () => {
  it('prepends the new transaction', () => {
    useExpenseStore.getState().addTransaction({
      type: 'income',
      amount: 100,
      category: 'salary',
      date: '2026-03-02',
    })

    const { transactions } = useExpenseStore.getState()
    expect(transactions).toHaveLength(2)
    expect(transactions[0].amount).toBe(100)
    expect(transactions[1]).toEqual(existing)
  })

  it('generates an id and a createdAt timestamp', () => {
    useExpenseStore.getState().addTransaction({
      type: 'income',
      amount: 100,
      category: 'salary',
      date: '2026-03-02',
    })

    const added = useExpenseStore.getState().transactions[0]
    expect(added.id).toBeTruthy()
    expect(added.id).not.toBe(existing.id)
    expect(Number.isNaN(Date.parse(added.createdAt))).toBe(false)
  })
})

describe('updateTransaction', () => {
  it('patches only the named fields of the matching transaction', () => {
    useExpenseStore.getState().updateTransaction('existing-1', { amount: 45 })

    const [updated] = useExpenseStore.getState().transactions
    expect(updated.amount).toBe(45)
    expect(updated.category).toBe('food')
    expect(updated.id).toBe('existing-1')
  })

  it('leaves state untouched when the id is unknown', () => {
    useExpenseStore.getState().updateTransaction('nope', { amount: 45 })
    expect(useExpenseStore.getState().transactions).toEqual([existing])
  })
})

describe('deleteTransaction', () => {
  it('removes the matching transaction', () => {
    useExpenseStore.getState().deleteTransaction('existing-1')
    expect(useExpenseStore.getState().transactions).toEqual([])
  })
})

describe('resetToSeed', () => {
  it('restores the seed transactions', () => {
    useExpenseStore.getState().resetToSeed()

    const { transactions } = useExpenseStore.getState()
    expect(transactions.length).toBeGreaterThan(0)
    expect(transactions[0].id).toMatch(/^seed-/)
  })
})

describe('setHasHydrated', () => {
  it('flips the hydration flag', () => {
    useExpenseStore.getState().setHasHydrated(true)
    expect(useExpenseStore.getState().hasHydrated).toBe(true)
  })
})
