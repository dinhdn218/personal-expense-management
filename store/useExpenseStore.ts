'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { categoryOf } from '@/lib/categories'
import type { Category, CategoryId } from '@/lib/categories'
import { SEED_ACTIVE_MONTH } from '@/lib/seed-data'
import type { Budgets } from '@/lib/seed-data'
import { createClient } from '@/lib/supabase/client'
import {
  FK_VIOLATION,
  deleteBudget,
  deleteCategory,
  deleteTransaction,
  fetchSnapshot,
  insertTransaction,
  updateCategoryRow,
  updateTransactionRow,
  upsertBudget,
} from '@/lib/supabase/queries'
import type {
  AccountId,
  NewTransaction,
  Transaction,
  TxType,
} from '@/types/transaction'

export type { AccountId, NewTransaction, Transaction, TxType }

/** Hạn mức chi theo tháng: budgets["2026-09"]["an-uong"] = 5_000_000 */
export type { Budgets }

/**
 * Kết quả xoá danh mục. Trả về union thay vì ném lỗi vì "danh mục còn giao
 * dịch" là kết quả nghiệp vụ bình thường, không phải sự cố.
 */
export type RemoveCategoryResult =
  | { ok: true }
  | { ok: false; reason: 'in-use' | 'network' }

/** Trạng thái đồng bộ với server. Chỉ dùng cho chỉ báo, không chặn nội dung. */
export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error'

interface ExpenseState {
  transactions: Transaction[]
  /** Danh mục sửa được (tên + màu) ở màn Danh mục. */
  categories: Category[]
  budgets: Budgets
  /** Tháng đang xem, dạng "2026-09". Chỉ là view state, không lưu lên server. */
  activeMonth: string
  /**
   * Đã có dữ liệu để vẽ chưa. Là LATCH MỘT CHIỀU: false -> true, không bao giờ
   * quay lại. 10 component dùng nó để quyết định hiện skeleton hay số thật; cho
   * nó lật lại khi refetch thì mỗi lần đồng bộ nền cả dashboard sẽ nháy về
   * skeleton. Trạng thái đồng bộ chi tiết nằm ở `syncStatus`.
   * Chỉ đặt lại false khi đăng xuất (signOutAndClear).
   */
  hasHydrated: boolean
  syncStatus: SyncStatus
  /** Id người dùng đang đăng nhập; cần khi ghi để thoả policy RLS. */
  userId: string | null

  loadFromServer: (userId: string) => Promise<void>
  signOutAndClear: () => void

  addTransaction: (input: NewTransaction) => Promise<string>
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  setActiveMonth: (month: string) => void
  setHasHydrated: (value: boolean) => void

  updateCategory: (
    id: CategoryId,
    patch: Partial<Omit<Category, 'id'>>,
  ) => Promise<void>
  /** Chỉ xoá được danh mục không còn giao dịch nào. */
  removeCategory: (id: CategoryId) => Promise<RemoveCategoryResult>

  setBudget: (categoryId: CategoryId, limit: number, month?: string) => Promise<void>
  clearBudget: (categoryId: CategoryId, month?: string) => Promise<void>
}

/**
 * Tháng của một giao dịch, theo **giờ địa phương**.
 * Không cắt chuỗi ISO: ISO là giờ UTC, nên ở UTC+7 mọi khoản ghi trước 07:00
 * sáng sẽ bị đẩy sang tháng trước — sai cả tổng tháng lẫn ngân sách.
 *
 * Đây là định nghĩa "tháng" DUY NHẤT của app. Postgres chỉ lưu occurred_at
 * dạng timestamptz và không bao giờ tự gom tháng — thêm date_trunc hay cột
 * tháng sinh tự động ở server sẽ tạo định nghĩa thứ hai, lệch âm thầm.
 */
const monthKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Mã lỗi Postgres đi kèm trong lỗi của supabase-js. */
const errorCode = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      // Bắt đầu RỖNG: server mới là nguồn sự thật. Dữ liệu thật đến từ
      // loadFromServer, còn cache localStorage chỉ để lần sơn đầu đỡ trắng màn.
      transactions: [],
      categories: [],
      budgets: {},
      activeMonth: SEED_ACTIVE_MONTH,
      hasHydrated: false,
      syncStatus: 'idle',
      userId: null,

      loadFromServer: async (userId) => {
        set({ syncStatus: 'loading', userId })
        try {
          const snapshot = await fetchSnapshot(createClient())
          set({
            transactions: snapshot.transactions,
            categories: snapshot.categories,
            budgets: snapshot.budgets,
            syncStatus: 'ready',
            hasHydrated: true,
          })
        } catch {
          // Mất mạng: giữ nguyên cache đã đọc từ localStorage để vẫn xem được
          // số cũ, chỉ báo trạng thái lỗi.
          set({ syncStatus: 'error' })
        }
      },

      /**
       * Xoá sạch khi đăng xuất. Bắt buộc, không phải dọn dẹp cho gọn: máy này
       * có thể được người khác đăng nhập ngay sau đó, và cache localStorage sẽ
       * hiện thoáng số của tài khoản cũ trước khi fetch mới kịp về.
       */
      signOutAndClear: () => {
        set({
          transactions: [],
          categories: [],
          budgets: {},
          activeMonth: SEED_ACTIVE_MONTH,
          hasHydrated: false,
          syncStatus: 'idle',
          userId: null,
        })
        try {
          localStorage.removeItem('vi-rieng/expenses')
        } catch {
          // Chế độ riêng tư chặn localStorage — state trong bộ nhớ đã sạch rồi.
        }
      },

      addTransaction: async (input) => {
        const userId = get().userId
        if (!userId) throw new Error('Chưa đăng nhập')

        const tx = await insertTransaction(createClient(), userId, input)
        set((s) => ({ transactions: [tx, ...s.transactions] }))
        return tx.id
      },

      updateTransaction: async (id, patch) => {
        const updated = await updateTransactionRow(createClient(), id, patch)
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
        }))
      },

      removeTransaction: async (id) => {
        await deleteTransaction(createClient(), id)
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
      },

      setActiveMonth: (activeMonth) => set({ activeMonth }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      updateCategory: async (id, patch) => {
        await updateCategoryRow(createClient(), id, patch)
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }))
      },

      removeCategory: async (id) => {
        // Chặn sớm phía client để không phải đợi server nói điều đã biết.
        // Chốt chặn thật là khoá ngoại ON DELETE RESTRICT ở Postgres: mảng
        // trong máy có thể cũ (máy khác vừa thêm giao dịch).
        if (get().transactions.some((t) => t.categoryId === id)) {
          return { ok: false, reason: 'in-use' }
        }

        try {
          await deleteCategory(createClient(), id)
        } catch (error) {
          return {
            ok: false,
            reason: errorCode(error) === FK_VIOLATION ? 'in-use' : 'network',
          }
        }

        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          // Hạn mức của danh mục này biến mất ở MỌI tháng. Postgres đã lo bằng
          // ON DELETE CASCADE; đây là dọn lại bản cache cho khớp.
          budgets: Object.fromEntries(
            Object.entries(s.budgets).map(([month, limits]) => [
              month,
              Object.fromEntries(
                Object.entries(limits).filter(([key]) => key !== id),
              ),
            ]),
          ),
        }))
        return { ok: true }
      },

      setBudget: async (categoryId, limit, month) => {
        const { userId, activeMonth } = get()
        if (!userId) throw new Error('Chưa đăng nhập')
        // Chốt tháng TRƯỚC khi await: đổi tháng giữa chừng mà đọc sau thì hạn
        // mức sẽ ghi vào nhầm tháng.
        const key = month ?? activeMonth

        await upsertBudget(createClient(), userId, key, categoryId, limit)
        set((s) => ({
          budgets: {
            ...s.budgets,
            [key]: { ...(s.budgets[key] ?? {}), [categoryId]: limit },
          },
        }))
      },

      clearBudget: async (categoryId, month) => {
        const key = month ?? get().activeMonth

        await deleteBudget(createClient(), key, categoryId)
        set((s) => {
          const rest = Object.fromEntries(
            Object.entries(s.budgets[key] ?? {}).filter(([id]) => id !== categoryId),
          )
          return { budgets: { ...s.budgets, [key]: rest } }
        })
      },
    }),
    {
      name: 'vi-rieng/expenses',
      // v3: dữ liệu chuyển lên Supabase. Bản lưu cũ là dữ liệu mẫu localStorage
      // hoặc dữ liệu thật chưa đẩy lên — bỏ đi ở đây thì mất, nên KHÔNG xoá:
      // giữ nguyên để luồng di trú (components/store-bootstrap.tsx) đọc và hỏi
      // người dùng có muốn đẩy lên tài khoản không.
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        transactions: s.transactions,
        categories: s.categories,
        budgets: s.budgets,
        // activeMonth là view state phía client, phải nằm lại đây để chọn tháng
        // xong tải lại trang vẫn giữ nguyên.
        activeMonth: s.activeMonth,
      }),
      // Hydrate từ một effect phía client (xem StoreBootstrap). Nếu không,
      // persist đọc localStorage ngay khi module nạp, nên lần render client
      // đầu tiên đã khác server render -> React báo hydration mismatch.
      skipHydration: true,
      // Bản v2 trở về trước có cùng hình dạng; giữ nguyên để luồng di trú xử lý.
      migrate: (persisted) => persisted as Partial<ExpenseState>,
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
