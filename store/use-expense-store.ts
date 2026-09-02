import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SEED_TRANSACTIONS } from '@/lib/seed-data'
import type { NewTransaction, Transaction } from '@/types/transaction'

export interface ExpenseState {
  transactions: Transaction[]
  hasHydrated: boolean
  addTransaction: (input: NewTransaction) => void
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => void
  deleteTransaction: (id: string) => void
  resetToSeed: () => void
  setHasHydrated: (value: boolean) => void
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      transactions: SEED_TRANSACTIONS,
      hasHydrated: false,

      addTransaction: (input) =>
        set((state) => ({
          transactions: [
            { ...input, id: createId(), createdAt: new Date().toISOString() },
            ...state.transactions,
          ],
        })),

      updateTransaction: (id, patch) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id ? { ...transaction, ...patch } : transaction,
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter(
            (transaction) => transaction.id !== id,
          ),
        })),

      resetToSeed: () => set({ transactions: SEED_TRANSACTIONS }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'expense-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only data is persisted; actions and the hydration flag are recreated.
      partialize: (state) => ({ transactions: state.transactions }),
      // Rehydration is triggered from a client effect (see StoreHydration).
      // Without this, persist reads localStorage as the module loads, so the
      // first client render would hold stored data while the server rendered
      // seed data, and React would report a hydration mismatch.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
