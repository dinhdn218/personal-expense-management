import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category } from '@/lib/categories'
import type { Budgets } from '@/lib/seed-data'
import type { Transaction } from '@/types/transaction'

/**
 * Đọc và đẩy dữ liệu cũ trong localStorage lên tài khoản Supabase.
 *
 * Dữ liệu cũ nằm dưới key 'vi-rieng/expenses' do zustand/persist ghi, dạng
 * { state: {...}, version: n }.
 */

export const STORAGE_KEY = 'vi-rieng/expenses'
export const DECLINED_KEY = 'vi-rieng/migration-declined'

export interface LocalSnapshot {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budgets
}

/**
 * Trả về dữ liệu cũ nếu có gì đáng để đẩy lên, ngược lại null.
 * Không ném lỗi: cache hỏng thì coi như không có.
 */
export function readLocalSnapshot(): LocalSnapshot | null {
  try {
    if (localStorage.getItem(DECLINED_KEY)) return null

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { state?: Partial<LocalSnapshot> }
    const state = parsed?.state
    if (!state) return null

    const transactions = Array.isArray(state.transactions) ? state.transactions : []
    if (transactions.length === 0) return null

    return {
      transactions,
      categories: Array.isArray(state.categories) ? state.categories : [],
      budgets:
        state.budgets && typeof state.budgets === 'object' ? state.budgets : {},
    }
  } catch {
    return null
  }
}

/** Ghi nhớ là người dùng đã từ chối, để lần sau không hỏi lại. */
export function markDeclined() {
  try {
    localStorage.setItem(DECLINED_KEY, '1')
  } catch {
    // Không ghi được thì lần sau hỏi lại — phiền, nhưng không mất gì.
  }
}

/** Xoá cache cũ sau khi đã đẩy lên server thành công. */
export function clearLocalSnapshot() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Bỏ qua: dữ liệu đã nằm an toàn trên server rồi.
  }
}

/**
 * Đẩy toàn bộ lên server trong MỘT transaction Postgres (hàm migrate_local_data).
 * Ba lần insert rời sẽ để lại trạng thái dở dang nếu hỏng giữa chừng.
 *
 * Id cũ dạng tx_xxxx bị bỏ, Postgres cấp uuid mới — nên sau khi xong PHẢI nạp
 * lại từ server chứ không dùng mảng cũ, vì màn sửa giao dịch tra theo id.
 */
export async function uploadLocalSnapshot(
  supabase: SupabaseClient,
  snapshot: LocalSnapshot,
) {
  const budgets = Object.entries(snapshot.budgets).flatMap(([month, limits]) =>
    Object.entries(limits).map(([categoryId, limitVnd]) => ({
      month,
      categoryId,
      limitVnd,
    })),
  )

  const { error } = await supabase.rpc('migrate_local_data', {
    payload: {
      categories: snapshot.categories.map((c, index) => ({
        id: c.id,
        label: c.label,
        color: c.color,
        sortOrder: index,
      })),
      transactions: snapshot.transactions.map((t) => ({
        type: t.type,
        amountVnd: t.amountVnd,
        categoryId: t.categoryId,
        accountId: t.accountId,
        note: t.note ?? null,
        occurredAt: t.occurredAt,
        createdAt: t.createdAt,
      })),
      budgets,
    },
  })

  if (error) throw error
}
