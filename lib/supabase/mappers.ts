import type { Category } from '@/lib/categories'
import type { Budgets } from '@/lib/seed-data'
import type { AccountId, Transaction, TxType } from '@/types/transaction'
import type { BudgetRow, CategoryRow, TransactionRow } from './types'

/**
 * Ranh giới snake_case (Postgres) ↔ camelCase (app) DUY NHẤT. Mọi dòng đọc từ
 * Supabase phải đi qua đây.
 */

/**
 * ⚠️ Chuẩn hoá về dạng ...Z là BẮT BUỘC, không phải cho đẹp.
 *
 * supabase-js trả timestamptz dạng "2026-09-01T01:00:00+00:00", còn dữ liệu cũ
 * trong localStorage là "2026-09-01T01:00:00.000Z". Hai chỗ sắp xếp giao dịch
 * (computeRecentTransactions và filterTransactions) dùng
 * `b.occurredAt.localeCompare(a.occurredAt)` — SO SÁNH CHUỖI. Trộn hai định
 * dạng thì '+' (0x2B) và '.' (0x2E) so với nhau ra thứ tự sai, mà không văng
 * lỗi gì cả: danh sách chỉ đơn giản là sắp sai.
 *
 * new Date(...).toISOString() luôn cho đúng một dạng, kết thúc bằng 'Z'.
 */
const toIso = (value: string) => new Date(value).toISOString()

export function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as TxType,
    amountVnd: Number(row.amount_vnd),
    categoryId: row.category_id,
    accountId: row.account_id as AccountId,
    // Cột note là nullable trong DB, còn Transaction dùng `note?: string`.
    note: row.note ?? undefined,
    occurredAt: toIso(row.occurred_at),
    createdAt: toIso(row.created_at),
  }
}

export function rowToCategory(row: CategoryRow): Category {
  return { id: row.id, label: row.label, color: row.color }
}

/**
 * Dựng lại map lồng budgets[month][categoryId] = limit từ các dòng phẳng.
 * Giữ đúng hình dạng cũ để computeBudgetRows và computeAvailableMonths không
 * phải sửa một dòng nào.
 */
export function rowsToBudgets(rows: BudgetRow[]): Budgets {
  const budgets: Budgets = {}
  for (const row of rows) {
    ;(budgets[row.month] ??= {})[row.category_id] = Number(row.limit_vnd)
  }
  return budgets
}
