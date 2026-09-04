import { test as setup } from '@playwright/test'
import { authFile } from './auth-file'
import { TEST_PASSWORD, ensureTestUser, seedUser, workerEmail } from './db'

/**
 * Đăng nhập một lần rồi lưu cookie session ra file; các project khác dùng lại
 * qua `storageState` nên không phải đăng nhập trước từng test.
 *
 * Tài khoản test dùng MẬT KHẨU vì magic link không script hoá được trong trình
 * duyệt (phải mở hộp thư). Người dùng thật vẫn đăng nhập bằng magic link.
 */
setup('đăng nhập tài khoản test', async ({ page }) => {
  const email = workerEmail()
  const userId = await ensureTestUser(email)
  await seedUser(userId)

  // Đăng nhập qua route handler riêng cho test: dùng chính @supabase/ssr phía
  // server nên cookie ghi ra đúng định dạng proxy.ts đọc được.
  const response = await page.request.post('/auth/test-login', {
    data: { email, password: TEST_PASSWORD },
  })
  if (!response.ok()) {
    throw new Error(`Đăng nhập tài khoản test hỏng: ${await response.text()}`)
  }

  await page.context().storageState({ path: authFile() })
})
