import { vi } from 'vitest'

/**
 * Supabase giả cho unit test của store.
 *
 * Store gọi `createClient()` từ '@/lib/supabase/client' rồi đưa cho các hàm
 * trong '@/lib/supabase/queries'. Test chỉ cần biết mutation có gọi đúng lớp
 * truy vấn không và có cập nhật cache đúng không — không cần dựng lại cả
 * chuỗi .from().insert().select() của supabase-js. Nên mock thẳng lớp queries.
 */

/** Bộ đếm để giả uuid do Postgres cấp. */
let counter = 0

export const nextId = () => `srv_${++counter}`

export function resetFakeServer() {
  counter = 0
}

export const queryMocks = {
  insertTransaction: vi.fn(async (_client, _userId, input) => ({
    ...input,
    id: nextId(),
    note: input.note ?? undefined,
    createdAt: new Date().toISOString(),
  })),
  // Postgres trả về dòng SAU khi cập nhật; bản giả merge patch để giống thật.
  updateTransactionRow: vi.fn(async (_client, id, patch) => ({
    id,
    type: 'expense',
    amountVnd: 100_000,
    categoryId: 'an-uong',
    accountId: 'cash',
    occurredAt: '2026-09-01T09:00:00.000Z',
    createdAt: '2026-09-01T09:00:00.000Z',
    ...patch,
  })),
  deleteTransaction: vi.fn(async () => {}),
  updateCategoryRow: vi.fn(async () => {}),
  deleteCategory: vi.fn(async () => {}),
  upsertBudget: vi.fn(async () => {}),
  deleteBudget: vi.fn(async () => {}),
  fetchSnapshot: vi.fn(async () => ({
    transactions: [],
    categories: [],
    budgets: {},
  })),
  countTransactions: vi.fn(async () => 0),
}
