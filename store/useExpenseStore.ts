'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CategoryId } from '@/lib/categories'
import type {
  AccountId,
  NewTransaction,
  Transaction,
  TxType,
} from '@/types/transaction'

export type { AccountId, NewTransaction, Transaction, TxType }

interface ExpenseState {
  transactions: Transaction[]
  /** Tháng đang xem, dạng "2026-09". */
  activeMonth: string
  /** Cờ hydrate — xem ghi chú skipHydration bên dưới. */
  hasHydrated: boolean

  addTransaction: (input: NewTransaction) => string
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => void
  removeTransaction: (id: string) => void
  setActiveMonth: (month: string) => void
  setHasHydrated: (value: boolean) => void
  reset: () => void
}

const monthKey = (iso: string) => iso.slice(0, 7)
const uid = () => `tx_${Math.random().toString(36).slice(2, 10)}`
const at = (day: string, time = '09:00') =>
  new Date(`${day}T${time}:00`).toISOString()

/** Dữ liệu mẫu — khớp đúng số trong file thiết kế (tổng chi 16.180.000đ). */
const SEED: Transaction[] = [
  { id: 'tx_1', type: 'income', amountVnd: 22_000_000, categoryId: 'luong', accountId: 'techcombank', note: 'Lương tháng 9', occurredAt: at('2026-09-01', '08:00'), createdAt: at('2026-09-01', '08:00') },
  { id: 'tx_2', type: 'income', amountVnd: 2_500_000, categoryId: 'khac', accountId: 'techcombank', note: 'Freelance sửa landing', occurredAt: at('2026-09-01', '11:20'), createdAt: at('2026-09-01', '11:20') },
  { id: 'tx_3', type: 'expense', amountVnd: 65_000, categoryId: 'cafe', accountId: 'cash', note: 'Cafe Highlands', occurredAt: at('2026-09-01', '09:12'), createdAt: at('2026-09-01', '09:12') },
  { id: 'tx_4', type: 'expense', amountVnd: 78_000, categoryId: 'di-lai', accountId: 'momo', note: 'Grab về nhà', occurredAt: at('2026-08-31', '22:40'), createdAt: at('2026-08-31', '22:40') },
  { id: 'tx_5', type: 'expense', amountVnd: 412_000, categoryId: 'an-uong', accountId: 'cash', note: 'Đi chợ nấu ăn cuối tuần', occurredAt: at('2026-08-31', '17:05'), createdAt: at('2026-08-31', '17:05') },
  { id: 'tx_6', type: 'expense', amountVnd: 260_000, categoryId: 'khac', accountId: 'techcombank', note: 'Netflix', occurredAt: at('2026-08-29', '07:00'), createdAt: at('2026-08-29', '07:00') },
  { id: 'tx_7', type: 'expense', amountVnd: 5_500_000, categoryId: 'nha-cua', accountId: 'techcombank', note: 'Tiền nhà tháng 9', occurredAt: at('2026-08-28', '10:00'), createdAt: at('2026-08-28', '10:00') },
  { id: 'tx_8', type: 'expense', amountVnd: 4_828_000, categoryId: 'an-uong', accountId: 'cash', note: 'Ăn uống trong tháng', occurredAt: at('2026-08-20', '12:00'), createdAt: at('2026-08-20', '12:00') },
  { id: 'tx_9', type: 'expense', amountVnd: 1_782_000, categoryId: 'di-lai', accountId: 'momo', note: 'Xăng + Grab', occurredAt: at('2026-08-18', '12:00'), createdAt: at('2026-08-18', '12:00') },
  { id: 'tx_10', type: 'expense', amountVnd: 1_420_000, categoryId: 'mua-sam', accountId: 'techcombank', note: 'Áo khoác', occurredAt: at('2026-08-15', '15:30'), createdAt: at('2026-08-15', '15:30') },
  { id: 'tx_11', type: 'expense', amountVnd: 825_000, categoryId: 'cafe', accountId: 'cash', note: 'Cafe làm việc', occurredAt: at('2026-08-12', '09:00'), createdAt: at('2026-08-12', '09:00') },
  { id: 'tx_12', type: 'expense', amountVnd: 1_010_000, categoryId: 'khac', accountId: 'techcombank', note: 'Thuốc + tạp hoá', occurredAt: at('2026-08-10', '18:00'), createdAt: at('2026-08-10', '18:00') },
]

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      transactions: SEED,
      activeMonth: '2026-09',
      hasHydrated: false,

      addTransaction: (input) => {
        const tx: Transaction = {
          ...input,
          id: uid(),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ transactions: [tx, ...s.transactions] }))
        return tx.id
      },

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        })),

      removeTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      setActiveMonth: (activeMonth) => set({ activeMonth }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      reset: () => set({ transactions: SEED, activeMonth: '2026-09' }),
    }),
    {
      name: 'vi-rieng/expenses',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        transactions: s.transactions,
        activeMonth: s.activeMonth,
      }),
      // Hydrate từ một effect phía client (xem StoreHydration). Nếu không,
      // persist đọc localStorage ngay khi module nạp, nên lần render client
      // đầu tiên đã khác server render -> React báo hydration mismatch.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

/* ------------------------------------------------------------------ *
 * Selectors — state DẪN XUẤT, không bao giờ lưu vào store.
 *
 * Mỗi hook lấy lát dữ liệu thô (tham chiếu ổn định) rồi tính trong
 * useMemo. Không truyền hàm tính trực tiếp vào useExpenseStore(...):
 * Zustand v5 đọc qua useSyncExternalStore, mà hàm trả về object/mảng mới
 * mỗi lần gọi sẽ tạo snapshot mới mỗi render -> vòng lặp render vô hạn.
 * ------------------------------------------------------------------ */

export interface MonthlySummary {
  income: number
  expense: number
  net: number
  savingRate: number
}

export function computeMonthlySummary(
  transactions: Transaction[],
  month: string,
): MonthlySummary {
  const rows = transactions.filter((t) => monthKey(t.occurredAt) === month)
  const income = rows
    .filter((t) => t.type === 'income')
    .reduce((a, t) => a + t.amountVnd, 0)
  const expense = rows
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amountVnd, 0)
  // Tháng chưa có thu nhập -> savingRate 0, không chia cho 0.
  return {
    income,
    expense,
    net: income - expense,
    savingRate: income ? (income - expense) / income : 0,
  }
}

export function useMonthlySummary(month?: string): MonthlySummary {
  const transactions = useExpenseStore((s) => s.transactions)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth
  return useMemo(
    () => computeMonthlySummary(transactions, key),
    [transactions, key],
  )
}

/** Tổng số dư mọi thời điểm (mọi tháng, mọi nguồn tiền). */
export const useTotalBalance = () =>
  useExpenseStore((s) =>
    s.transactions.reduce(
      (a, t) => a + (t.type === 'income' ? t.amountVnd : -t.amountVnd),
      0,
    ),
  )

export function computeBalanceByAccount(
  transactions: Transaction[],
): Record<AccountId, number> {
  const acc: Record<AccountId, number> = { techcombank: 0, cash: 0, momo: 0 }
  for (const t of transactions) {
    acc[t.accountId] += t.type === 'income' ? t.amountVnd : -t.amountVnd
  }
  return acc
}

export function useBalanceByAccount(): Record<AccountId, number> {
  const transactions = useExpenseStore((s) => s.transactions)
  return useMemo(() => computeBalanceByAccount(transactions), [transactions])
}

export interface CategorySlice {
  categoryId: CategoryId
  amount: number
  /** 0..1 */
  share: number
}

export function computeExpenseByCategory(
  transactions: Transaction[],
  month: string,
): CategorySlice[] {
  const rows = transactions.filter(
    (t) => monthKey(t.occurredAt) === month && t.type === 'expense',
  )
  const total = rows.reduce((a, t) => a + t.amountVnd, 0)
  const map = new Map<CategoryId, number>()
  for (const t of rows) {
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amountVnd)
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      amount,
      share: total ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/** Chi theo danh mục, đã sắp giảm dần + kèm %. */
export function useExpenseByCategory(month?: string): CategorySlice[] {
  const transactions = useExpenseStore((s) => s.transactions)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth
  return useMemo(
    () => computeExpenseByCategory(transactions, key),
    [transactions, key],
  )
}

export function computeRecentTransactions(
  transactions: Transaction[],
  limit: number,
): Transaction[] {
  return [...transactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
}

export function useRecentTransactions(limit = 6): Transaction[] {
  const transactions = useExpenseStore((s) => s.transactions)
  return useMemo(
    () => computeRecentTransactions(transactions, limit),
    [transactions, limit],
  )
}

export interface CashflowPoint {
  month: string
  label: string
  income: number
  expense: number
}

export function computeCashflowSeries(
  transactions: Transaction[],
  months: number,
  from: string,
): CashflowPoint[] {
  const [y, m] = from.split('-').map(Number)
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(y, m - 1 - (months - 1 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const rows = transactions.filter((t) => monthKey(t.occurredAt) === key)
    return {
      month: key,
      label: `T${d.getMonth() + 1}`,
      income: rows
        .filter((t) => t.type === 'income')
        .reduce((a, t) => a + t.amountVnd, 0),
      expense: rows
        .filter((t) => t.type === 'expense')
        .reduce((a, t) => a + t.amountVnd, 0),
    }
  })
}

/** Thu/chi 6 tháng gần nhất — cho mini bar ở Card 2. */
export function useCashflowSeries(months = 6, from?: string): CashflowPoint[] {
  const transactions = useExpenseStore((s) => s.transactions)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = from ?? activeMonth
  return useMemo(
    () => computeCashflowSeries(transactions, months, key),
    [transactions, months, key],
  )
}
