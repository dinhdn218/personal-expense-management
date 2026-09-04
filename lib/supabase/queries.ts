import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, CategoryId } from '@/lib/categories'
import type { Budgets } from '@/lib/seed-data'
import type { NewTransaction, Transaction } from '@/types/transaction'
import { rowToCategory, rowToTransaction, rowsToBudgets } from './mappers'
import type { BudgetRow, CategoryRow, TransactionRow } from './types'

/**
 * Mọi câu truy vấn Supabase nằm ở đây. Trả về type của app (camelCase), không
 * bao giờ để dòng snake_case lọt ra ngoài.
 *
 * ⚠️ Không select cột nào dạng ::date hay date_trunc('month', ...). Việc gom
 * tháng là của monthKey() phía client, tính theo giờ địa phương — xem chú thích
 * ở store/useExpenseStore.ts. Thêm một cách tính tháng thứ hai ở server sẽ lệch
 * âm thầm khi người dùng đổi múi giờ.
 */

export interface Snapshot {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budgets
}

/** Mã lỗi Postgres khi vi phạm khoá ngoại (xoá danh mục còn giao dịch). */
export const FK_VIOLATION = '23503'

export async function fetchSnapshot(supabase: SupabaseClient): Promise<Snapshot> {
  const [transactions, categories, budgets] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .order('occurred_at', { ascending: false }),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('budgets').select('*'),
  ])

  if (transactions.error) throw transactions.error
  if (categories.error) throw categories.error
  if (budgets.error) throw budgets.error

  return {
    transactions: (transactions.data as TransactionRow[]).map(rowToTransaction),
    categories: (categories.data as CategoryRow[]).map(rowToCategory),
    budgets: rowsToBudgets(budgets.data as BudgetRow[]),
  }
}

/** Đếm giao dịch của người dùng — dùng để quyết định có mời di trú hay không. */
export async function countTransactions(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function insertTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: NewTransaction,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: input.type,
      amount_vnd: input.amountVnd,
      category_id: input.categoryId,
      account_id: input.accountId,
      note: input.note ?? null,
      occurred_at: input.occurredAt,
    })
    .select()
    .single()

  if (error) throw error
  return rowToTransaction(data as TransactionRow)
}

export async function updateTransactionRow(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<NewTransaction>,
): Promise<Transaction> {
  // Chỉ gửi cột thực sự đổi: gửi undefined sẽ ghi đè thành null.
  const row: Record<string, unknown> = {}
  if (patch.type !== undefined) row.type = patch.type
  if (patch.amountVnd !== undefined) row.amount_vnd = patch.amountVnd
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId
  if (patch.accountId !== undefined) row.account_id = patch.accountId
  if (patch.note !== undefined) row.note = patch.note ?? null
  if (patch.occurredAt !== undefined) row.occurred_at = patch.occurredAt

  const { data, error } = await supabase
    .from('transactions')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToTransaction(data as TransactionRow)
}

export async function deleteTransaction(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function updateCategoryRow(
  supabase: SupabaseClient,
  id: CategoryId,
  patch: Partial<Omit<Category, 'id'>>,
) {
  const row: Record<string, unknown> = {}
  if (patch.label !== undefined) row.label = patch.label
  if (patch.color !== undefined) row.color = patch.color

  const { error } = await supabase.from('categories').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(supabase: SupabaseClient, id: CategoryId) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function upsertBudget(
  supabase: SupabaseClient,
  userId: string,
  month: string,
  categoryId: CategoryId,
  limit: number,
) {
  const { error } = await supabase.from('budgets').upsert(
    {
      user_id: userId,
      month,
      category_id: categoryId,
      limit_vnd: limit,
    },
    { onConflict: 'user_id,month,category_id' },
  )
  if (error) throw error
}

/**
 * ⚠️ XOÁ DÒNG, không ghi 0. computeBudgetRows phân biệt "chưa đặt hạn mức" bằng
 * sự vắng mặt của key; ghi 0 sẽ hiện thanh 0đ thay vì vào nhóm "Chưa đặt hạn mức".
 */
export async function deleteBudget(
  supabase: SupabaseClient,
  month: string,
  categoryId: CategoryId,
) {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('month', month)
    .eq('category_id', categoryId)
  if (error) throw error
}
