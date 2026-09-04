import { createClient } from '@supabase/supabase-js'
import { DEFAULT_CATEGORIES, SEED, SEED_BUDGETS, serverIdFor } from './seed-data'

/**
 * Thao tác thẳng với Postgres bằng service role key — BỎ QUA RLS.
 * Chỉ chạy trong Node lúc test, không bao giờ import vào app.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'E2E cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local. Xem supabase/README.md.',
  )
}

export const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** Mật khẩu test user — chỉ dùng cho tài khoản test, người thật dùng magic link. */
export const TEST_PASSWORD = 'e2e-test-password-2026'

/**
 * Mỗi worker Playwright một tài khoản riêng. playwright.config đang bật
 * fullyParallel, dùng chung một user thì các spec giẫm chân nhau: category.spec
 * xoá danh mục trong khi budget.spec đang đọc chính danh mục đó.
 */
export function workerEmail(index = process.env.TEST_PARALLEL_INDEX ?? '0') {
  return `e2e+w${index}@vi-rieng.test`
}

/** Tạo tài khoản test nếu chưa có, trả về id. */
export async function ensureTestUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })

  if (!error && data.user) return data.user.id

  // Đã tồn tại từ lần chạy trước — tìm lại id.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  })
  if (listError) throw listError

  const existing = list.users.find((u) => u.email === email)
  if (!existing) throw error ?? new Error(`Không tạo được tài khoản test ${email}`)
  return existing.id
}

/**
 * Đưa tài khoản về đúng dữ liệu mẫu. Xoá theo thứ tự ngược khoá ngoại:
 * transactions và budgets trỏ tới categories nên phải đi trước.
 */
export async function seedUser(userId: string) {
  await admin.from('transactions').delete().eq('user_id', userId)
  await admin.from('budgets').delete().eq('user_id', userId)
  await admin.from('categories').delete().eq('user_id', userId)

  const { error: catError } = await admin.from('categories').insert(
    DEFAULT_CATEGORIES.map((c, index) => ({
      user_id: userId,
      id: c.id,
      label: c.label,
      color: c.color,
      sort_order: index,
    })),
  )
  if (catError) throw catError

  const { error: txError } = await admin.from('transactions').insert(
    SEED.map((t, index) => ({
      id: serverIdFor(t.id, index),
      user_id: userId,
      type: t.type,
      amount_vnd: t.amountVnd,
      category_id: t.categoryId,
      account_id: t.accountId,
      note: t.note ?? null,
      occurred_at: t.occurredAt,
      created_at: t.createdAt,
    })),
  )
  if (txError) throw txError

  const budgetRows = Object.entries(SEED_BUDGETS).flatMap(([month, limits]) =>
    Object.entries(limits).map(([categoryId, limit]) => ({
      user_id: userId,
      month,
      category_id: categoryId,
      limit_vnd: limit,
    })),
  )
  const { error: budgetError } = await admin.from('budgets').insert(budgetRows)
  if (budgetError) throw budgetError
}
