/**
 * Hình dạng dòng dữ liệu trả về từ Postgres — snake_case, đúng như schema.
 * Chỉ dùng bên trong lib/supabase; phần còn lại của app dùng type camelCase ở
 * @/types/transaction và @/lib/categories. Chỗ chuyển đổi duy nhất là mappers.ts.
 */

export interface TransactionRow {
  id: string
  user_id: string
  type: string
  amount_vnd: number
  category_id: string
  account_id: string
  note: string | null
  occurred_at: string
  created_at: string
}

export interface CategoryRow {
  user_id: string
  id: string
  label: string
  color: string
  sort_order: number
  created_at: string
}

export interface BudgetRow {
  user_id: string
  month: string
  category_id: string
  limit_vnd: number
  updated_at: string
}
