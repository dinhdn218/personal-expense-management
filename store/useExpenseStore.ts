'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_CATEGORIES, categoryOf } from '@/lib/categories'
import type { Category, CategoryId } from '@/lib/categories'
import type {
  AccountId,
  NewTransaction,
  Transaction,
  TxType,
} from '@/types/transaction'

export type { AccountId, NewTransaction, Transaction, TxType }

/** Hạn mức chi theo tháng: budgets["2026-09"]["an-uong"] = 5_000_000 */
export type Budgets = Record<string, Record<CategoryId, number>>

interface ExpenseState {
  transactions: Transaction[]
  /** Danh mục sửa được (tên + màu) ở màn Danh mục. */
  categories: Category[]
  budgets: Budgets
  /** Tháng đang xem, dạng "2026-09". */
  activeMonth: string
  /** Cờ hydrate — xem ghi chú skipHydration bên dưới. */
  hasHydrated: boolean

  addTransaction: (input: NewTransaction) => string
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => void
  removeTransaction: (id: string) => void
  setActiveMonth: (month: string) => void
  setHasHydrated: (value: boolean) => void

  updateCategory: (id: CategoryId, patch: Partial<Omit<Category, 'id'>>) => void
  /** Chỉ xoá được danh mục không còn giao dịch nào. Trả về true nếu đã xoá. */
  removeCategory: (id: CategoryId) => boolean

  setBudget: (categoryId: CategoryId, limit: number, month?: string) => void
  clearBudget: (categoryId: CategoryId, month?: string) => void

  reset: () => void
}

/**
 * Tháng của một giao dịch, theo **giờ địa phương**.
 * Không cắt chuỗi ISO: ISO là giờ UTC, nên ở UTC+7 mọi khoản ghi trước 07:00
 * sáng sẽ bị đẩy sang tháng trước — sai cả tổng tháng lẫn ngân sách.
 */
const monthKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const uid = () => `tx_${Math.random().toString(36).slice(2, 10)}`
const at = (day: string, time = '09:00') =>
  new Date(`${day}T${time}:00`).toISOString()

/**
 * Dữ liệu mẫu — khớp đúng số trong thiết kế: thu 24.500.000đ · chi 16.180.000đ
 * · tiết kiệm 34%, và 6 lát donut đúng như "Nội dung mẫu" trong README.
 *
 * Ngày nằm trong `activeMonth` ("2026-09"). Bản handoff đặt phần lớn khoản chi
 * vào tháng 8 nên các số "tháng 9" trong README không bao giờ ra đúng — số tổng
 * đều là selector lọc theo tháng. Giữ nguyên số tiền, danh mục, nguồn tiền và
 * ghi chú của handoff, chỉ dời ngày.
 */
const SEED: Transaction[] = [
  { id: 'tx_3', type: 'expense', amountVnd: 65_000, categoryId: 'cafe', accountId: 'cash', note: 'Cafe Highlands', occurredAt: at('2026-09-03', '09:12'), createdAt: at('2026-09-03', '09:12') },
  { id: 'tx_1', type: 'income', amountVnd: 22_000_000, categoryId: 'luong', accountId: 'techcombank', note: 'Lương tháng 9', occurredAt: at('2026-09-03', '08:00'), createdAt: at('2026-09-03', '08:00') },
  { id: 'tx_4', type: 'expense', amountVnd: 78_000, categoryId: 'di-lai', accountId: 'momo', note: 'Grab về nhà', occurredAt: at('2026-09-02', '22:40'), createdAt: at('2026-09-02', '22:40') },
  { id: 'tx_5', type: 'expense', amountVnd: 412_000, categoryId: 'an-uong', accountId: 'cash', note: 'Đi chợ nấu ăn cuối tuần', occurredAt: at('2026-09-02', '17:05'), createdAt: at('2026-09-02', '17:05') },
  { id: 'tx_6', type: 'expense', amountVnd: 260_000, categoryId: 'khac', accountId: 'techcombank', note: 'Netflix', occurredAt: at('2026-09-02', '07:00'), createdAt: at('2026-09-02', '07:00') },
  { id: 'tx_7', type: 'expense', amountVnd: 5_500_000, categoryId: 'nha-cua', accountId: 'techcombank', note: 'Tiền nhà tháng 9', occurredAt: at('2026-09-01', '10:00'), createdAt: at('2026-09-01', '10:00') },
  { id: 'tx_2', type: 'income', amountVnd: 2_500_000, categoryId: 'khac', accountId: 'techcombank', note: 'Freelance sửa landing', occurredAt: at('2026-09-01', '08:30'), createdAt: at('2026-09-01', '08:30') },
  { id: 'tx_8', type: 'expense', amountVnd: 4_828_000, categoryId: 'an-uong', accountId: 'cash', note: 'Ăn uống trong tháng', occurredAt: at('2026-09-01', '08:00'), createdAt: at('2026-09-01', '08:00') },
  { id: 'tx_9', type: 'expense', amountVnd: 1_782_000, categoryId: 'di-lai', accountId: 'momo', note: 'Xăng + Grab', occurredAt: at('2026-09-01', '07:30'), createdAt: at('2026-09-01', '07:30') },
  { id: 'tx_10', type: 'expense', amountVnd: 1_420_000, categoryId: 'mua-sam', accountId: 'techcombank', note: 'Áo khoác', occurredAt: at('2026-09-01', '07:00'), createdAt: at('2026-09-01', '07:00') },
  { id: 'tx_11', type: 'expense', amountVnd: 825_000, categoryId: 'cafe', accountId: 'cash', note: 'Cafe làm việc', occurredAt: at('2026-09-01', '06:30'), createdAt: at('2026-09-01', '06:30') },
  { id: 'tx_12', type: 'expense', amountVnd: 1_010_000, categoryId: 'khac', accountId: 'techcombank', note: 'Thuốc + tạp hoá', occurredAt: at('2026-09-01', '06:00'), createdAt: at('2026-09-01', '06:00') },
  // Tháng 8 để màn Báo cáo có gì mà so sánh.
  { id: 'tx_13', type: 'income', amountVnd: 22_000_000, categoryId: 'luong', accountId: 'techcombank', note: 'Lương tháng 8', occurredAt: at('2026-08-03', '08:00'), createdAt: at('2026-08-03', '08:00') },
  { id: 'tx_14', type: 'expense', amountVnd: 5_500_000, categoryId: 'nha-cua', accountId: 'techcombank', note: 'Tiền nhà tháng 8', occurredAt: at('2026-08-01', '10:00'), createdAt: at('2026-08-01', '10:00') },
  { id: 'tx_15', type: 'expense', amountVnd: 6_140_000, categoryId: 'an-uong', accountId: 'cash', note: 'Ăn uống tháng 8', occurredAt: at('2026-08-20', '12:00'), createdAt: at('2026-08-20', '12:00') },
  { id: 'tx_16', type: 'expense', amountVnd: 2_310_000, categoryId: 'di-lai', accountId: 'momo', note: 'Đi lại tháng 8', occurredAt: at('2026-08-18', '12:00'), createdAt: at('2026-08-18', '12:00') },
  { id: 'tx_17', type: 'expense', amountVnd: 1_890_000, categoryId: 'mua-sam', accountId: 'techcombank', note: 'Mua sắm tháng 8', occurredAt: at('2026-08-15', '15:30'), createdAt: at('2026-08-15', '15:30') },
  { id: 'tx_18', type: 'expense', amountVnd: 1_820_000, categoryId: 'khac', accountId: 'techcombank', note: 'Chi khác tháng 8', occurredAt: at('2026-08-10', '18:00'), createdAt: at('2026-08-10', '18:00') },
]

/**
 * Hạn mức mẫu — tổng 24.000.000đ, đúng thẻ "Cả tháng" trong thiết kế (67%).
 * Hai mốc lấy thẳng từ README: Nhà cửa còn 500.000đ ở 92%, Ăn uống vượt
 * 240.000đ ở 105%. "Khác" cố tình để trống để thấy nhóm "Chưa đặt hạn mức".
 */
const MONTH_BUDGET: Record<string, number> = {
  'nha-cua': 6_000_000,
  'an-uong': 5_000_000,
  'di-lai': 4_000_000,
  'mua-sam': 5_000_000,
  cafe: 4_000_000,
}

const SEED_BUDGETS: Budgets = {
  '2026-09': MONTH_BUDGET,
  '2026-08': MONTH_BUDGET,
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      transactions: SEED,
      categories: DEFAULT_CATEGORIES,
      budgets: SEED_BUDGETS,
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

      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),

      removeCategory: (id) => {
        // Chỉ xoá được khi không còn giao dịch nào dùng danh mục này.
        const inUse = get().transactions.some((t) => t.categoryId === id)
        if (inUse) return false
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          budgets: Object.fromEntries(
            Object.entries(s.budgets).map(([month, limits]) => [
              month,
              Object.fromEntries(
                Object.entries(limits).filter(([key]) => key !== id),
              ),
            ]),
          ),
        }))
        return true
      },

      setBudget: (categoryId, limit, month) =>
        set((s) => {
          const key = month ?? s.activeMonth
          return {
            budgets: {
              ...s.budgets,
              [key]: { ...(s.budgets[key] ?? {}), [categoryId]: limit },
            },
          }
        }),

      clearBudget: (categoryId, month) =>
        set((s) => {
          const key = month ?? s.activeMonth
          const rest = Object.fromEntries(
            Object.entries(s.budgets[key] ?? {}).filter(([id]) => id !== categoryId),
          )
          return { budgets: { ...s.budgets, [key]: rest } }
        }),

      reset: () =>
        set({
          transactions: SEED,
          categories: DEFAULT_CATEGORIES,
          budgets: SEED_BUDGETS,
          activeMonth: '2026-09',
        }),
    }),
    {
      name: 'vi-rieng/expenses',
      // v2: seed cũ đặt khoản chi vào tháng 8 trong khi activeMonth là tháng 9,
      // và monthKey khi đó gom tháng theo giờ UTC. Trình duyệt đã lưu bản cũ
      // sẽ nạp lại dữ liệu mẫu đúng thay vì giữ số sai.
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        transactions: s.transactions,
        categories: s.categories,
        budgets: s.budgets,
        activeMonth: s.activeMonth,
      }),
      // Hydrate từ một effect phía client (xem StoreHydration). Nếu không,
      // persist đọc localStorage ngay khi module nạp, nên lần render client
      // đầu tiên đã khác server render -> React báo hydration mismatch.
      skipHydration: true,
      // Bản lưu cũ hơn thì bỏ, dùng lại dữ liệu mẫu đã sửa.
      migrate: () => ({
        transactions: SEED,
        categories: DEFAULT_CATEGORIES,
        budgets: SEED_BUDGETS,
        activeMonth: '2026-09',
      }),
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

/**
 * `month` bỏ trống thì lấy mọi tháng. Thẻ "Giao dịch gần đây" trên Tổng quan
 * luôn truyền tháng đang xem — nếu không, đổi sang tháng 8 sẽ ra cảnh tổng
 * tháng 8 nhưng danh sách vẫn là giao dịch tháng 9.
 */
export function computeRecentTransactions(
  transactions: Transaction[],
  limit: number,
  month?: string,
): Transaction[] {
  return transactions
    .filter((t) => !month || monthKey(t.occurredAt) === month)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
}

export function useRecentTransactions(limit = 6, month?: string): Transaction[] {
  const transactions = useExpenseStore((s) => s.transactions)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth
  return useMemo(
    () => computeRecentTransactions(transactions, limit, key),
    [transactions, limit, key],
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

/* ---------------- Danh mục lúc chạy ---------------- */

/** Danh mục hiện hành (đã tính các sửa đổi của người dùng). */
export const useCategories = () => useExpenseStore((s) => s.categories)

/** Tra một danh mục theo id, dùng danh sách trong store. */
export function useCategoryLookup() {
  const categories = useCategories()
  return useMemo(
    () => (id: CategoryId) => categoryOf(id, categories),
    [categories],
  )
}

export function useTransaction(id: string | null): Transaction | undefined {
  const transactions = useExpenseStore((s) => s.transactions)
  return useMemo(
    () => (id ? transactions.find((t) => t.id === id) : undefined),
    [transactions, id],
  )
}

/* ---------------- Ngân sách (màn 2b) ---------------- */

export interface BudgetStatus {
  used: number
  limit: number
  /** 0..1 — đã kẹp ở 1 để thanh không vẽ quá 100%. */
  share: number
  over: boolean
  /** Phần vượt, 0 nếu chưa vượt. */
  overBy: number
}

export function computeBudgetStatus(used: number, limit: number): BudgetStatus {
  const over = limit > 0 && used > limit
  return {
    used,
    limit,
    share: limit > 0 ? Math.min(1, used / limit) : 0,
    over,
    overBy: over ? used - limit : 0,
  }
}

/** Tình trạng ngân sách cả tháng — thẻ "Cả tháng" ở cột phải màn 2b. */
export function useBudgetStatus(month?: string): BudgetStatus {
  const transactions = useExpenseStore((s) => s.transactions)
  const budgets = useExpenseStore((s) => s.budgets)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth

  return useMemo(() => {
    const used = computeMonthlySummary(transactions, key).expense
    const limit = Object.values(budgets[key] ?? {}).reduce((a, n) => a + n, 0)
    return computeBudgetStatus(used, limit)
  }, [transactions, budgets, key])
}

export interface CategoryBudgetRow extends BudgetStatus {
  categoryId: CategoryId
  /** Danh mục chưa đặt hạn mức — vẫn tính vào tổng chi, chỉ không có thanh. */
  unset: boolean
}

export function computeBudgetRows(
  transactions: Transaction[],
  budgets: Budgets,
  month: string,
): CategoryBudgetRow[] {
  const spent = new Map<CategoryId, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || monthKey(t.occurredAt) !== month) continue
    spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amountVnd)
  }

  const limits = budgets[month] ?? {}
  const ids = new Set<CategoryId>([...spent.keys(), ...Object.keys(limits)])

  return [...ids]
    .map((categoryId) => {
      const limit = limits[categoryId] ?? 0
      return {
        categoryId,
        unset: !(categoryId in limits),
        ...computeBudgetStatus(spent.get(categoryId) ?? 0, limit),
      }
    })
    .sort((a, b) => {
      // Có hạn mức lên trước, rồi theo số đã chi giảm dần.
      if (a.unset !== b.unset) return a.unset ? 1 : -1
      return b.used - a.used
    })
}

export function useBudgetRows(month?: string): CategoryBudgetRow[] {
  const transactions = useExpenseStore((s) => s.transactions)
  const budgets = useExpenseStore((s) => s.budgets)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth
  return useMemo(
    () => computeBudgetRows(transactions, budgets, key),
    [transactions, budgets, key],
  )
}

/* ---------------- Danh mục (màn 2c) ---------------- */

export interface CategoryUsage {
  categoryId: CategoryId
  /** Tổng số giao dịch mọi tháng — quyết định có xoá được không. */
  count: number
  /** Chi trong tháng đang xem. */
  monthSpend: number
}

export function computeCategoryUsage(
  transactions: Transaction[],
  month: string,
): Map<CategoryId, CategoryUsage> {
  const map = new Map<CategoryId, CategoryUsage>()
  const get = (id: CategoryId) => {
    let row = map.get(id)
    if (!row) {
      row = { categoryId: id, count: 0, monthSpend: 0 }
      map.set(id, row)
    }
    return row
  }

  for (const t of transactions) {
    const row = get(t.categoryId)
    row.count += 1
    if (t.type === 'expense' && monthKey(t.occurredAt) === month) {
      row.monthSpend += t.amountVnd
    }
  }
  return map
}

export function useCategoryUsage(month?: string) {
  const transactions = useExpenseStore((s) => s.transactions)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth
  return useMemo(() => computeCategoryUsage(transactions, key), [transactions, key])
}

/* ---------------- Lọc giao dịch (màn 2a) ---------------- */

export interface TransactionFilter {
  type?: TxType | 'all'
  categoryIds?: CategoryId[]
  month?: string
  sort?: 'newest' | 'oldest' | 'amount'
}

export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter,
): Transaction[] {
  const { type = 'all', categoryIds = [], month, sort = 'newest' } = filter

  const rows = transactions.filter((t) => {
    if (month && monthKey(t.occurredAt) !== month) return false
    if (type !== 'all' && t.type !== type) return false
    if (categoryIds.length && !categoryIds.includes(t.categoryId)) return false
    return true
  })

  return rows.sort((a, b) => {
    if (sort === 'amount') return b.amountVnd - a.amountVnd
    const cmp = b.occurredAt.localeCompare(a.occurredAt)
    return sort === 'oldest' ? -cmp : cmp
  })
}

export function useFilteredTransactions(filter: TransactionFilter): Transaction[] {
  const transactions = useExpenseStore((s) => s.transactions)
  const { type, month, sort } = filter
  const categoryKey = (filter.categoryIds ?? []).join(',')

  return useMemo(
    () =>
      filterTransactions(transactions, {
        type,
        month,
        sort,
        categoryIds: categoryKey ? categoryKey.split(',') : [],
      }),
    [transactions, type, month, sort, categoryKey],
  )
}

/* ---------------- Báo cáo (màn 2d) ---------------- */

export interface MonthComparison {
  current: MonthlySummary
  previous: MonthlySummary
  /** Chênh lệch chi tiêu: âm = chi ít hơn tháng trước. */
  expenseDelta: number
  /** Tỉ lệ thay đổi chi tiêu, null khi tháng trước chưa chi gì. */
  expenseShare: number | null
  rows: Array<{ categoryId: CategoryId; delta: number; share: number | null }>
}

export function computeMonthComparison(
  transactions: Transaction[],
  month: string,
): MonthComparison {
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const current = computeMonthlySummary(transactions, month)
  const previous = computeMonthlySummary(transactions, prev)

  const spendIn = (key: string) => {
    const map = new Map<CategoryId, number>()
    for (const t of transactions) {
      if (t.type !== 'expense' || monthKey(t.occurredAt) !== key) continue
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amountVnd)
    }
    return map
  }

  const now = spendIn(month)
  const before = spendIn(prev)
  const ids = new Set<CategoryId>([...now.keys(), ...before.keys()])

  const rows = [...ids]
    .map((categoryId) => {
      const a = now.get(categoryId) ?? 0
      const b = before.get(categoryId) ?? 0
      return {
        categoryId,
        delta: a - b,
        share: b > 0 ? (a - b) / b : null,
      }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return {
    current,
    previous,
    expenseDelta: current.expense - previous.expense,
    expenseShare:
      previous.expense > 0
        ? (current.expense - previous.expense) / previous.expense
        : null,
    rows,
  }
}

export function useMonthComparison(month?: string): MonthComparison {
  const transactions = useExpenseStore((s) => s.transactions)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth
  return useMemo(() => computeMonthComparison(transactions, key), [transactions, key])
}

/** Chi lớn nhất trong tháng — thẻ phải dưới của màn Báo cáo. */
export function useBiggestExpenses(limit = 4, month?: string): Transaction[] {
  const transactions = useExpenseStore((s) => s.transactions)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  const key = month ?? activeMonth
  return useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense' && monthKey(t.occurredAt) === key)
        .sort((a, b) => b.amountVnd - a.amountVnd)
        .slice(0, limit),
    [transactions, key, limit],
  )
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

/* ---------------- Bộ chọn tháng ---------------- */

/**
 * Danh sách tháng chọn được, mới nhất trước. Gồm mọi tháng đã có giao dịch
 * hoặc đã đặt hạn mức, cộng thêm `activeMonth` (tháng đang xem có thể rỗng)
 * và tháng hiện tại — để luôn quay về được "tháng này" dù chưa ghi gì.
 */
export function computeAvailableMonths(
  transactions: Transaction[],
  budgets: Budgets,
  activeMonth: string,
  now = new Date(),
): string[] {
  const months = new Set<string>(transactions.map((t) => monthKey(t.occurredAt)))
  for (const [month, limits] of Object.entries(budgets)) {
    if (Object.keys(limits).length) months.add(month)
  }
  months.add(activeMonth)
  months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  return [...months].sort((a, b) => b.localeCompare(a))
}

export function useAvailableMonths(): string[] {
  const transactions = useExpenseStore((s) => s.transactions)
  const budgets = useExpenseStore((s) => s.budgets)
  const activeMonth = useExpenseStore((s) => s.activeMonth)
  return useMemo(
    () => computeAvailableMonths(transactions, budgets, activeMonth),
    [transactions, budgets, activeMonth],
  )
}
