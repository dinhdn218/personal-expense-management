import { test as setup } from '@playwright/test'
import { authFile } from './auth-file'
import { TEST_PASSWORD, ensureTestUser, seedUser, workerEmail } from './db'
import { signInCookies } from './session'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Tạo sẵn session cho TỪNG worker Playwright, mỗi worker một tài khoản riêng.
 *
 * Vì sao phải lặp: project `setup` chỉ chạy một test, tức chỉ ở worker 0. Nhưng
 * `storageState` lại được từng worker đọc theo chỉ số của chính nó, nên nếu chỉ
 * ghi w0.json thì worker 1, 2… sẽ không tìm thấy file.
 *
 * Vì sao mỗi worker một tài khoản: playwright.config đang bật `fullyParallel`.
 * Dùng chung một tài khoản thì các spec giẫm chân nhau — category.spec xoá danh
 * mục ngay lúc budget.spec đang đọc chính nó.
 *
 * Session lấy bằng cách gọi API Supabase từ Node rồi tự đặt cookie, KHÔNG qua
 * route nào của app: `reuseExistingServer` sẽ dùng lại `npm run dev` đang mở,
 * mà server đó không có biến môi trường riêng cho test.
 */
setup('tạo session cho mọi worker', async ({ browser, baseURL }) => {
  // Phải khớp với `workers` trong playwright.config.ts.
  const maxWorkers = Number(process.env.E2E_WORKERS ?? (process.env.CI ? 1 : 4))

  fs.mkdirSync(path.dirname(authFile('0')), { recursive: true })

  for (let index = 0; index < maxWorkers; index++) {
    const email = workerEmail(String(index))
    const userId = await ensureTestUser(email)
    await seedUser(userId, String(index))

    const cookies = await signInCookies(email, TEST_PASSWORD, baseURL!)
    const context = await browser.newContext()
    await context.addCookies(cookies)
    await context.storageState({ path: authFile(String(index)) })
    await context.close()
  }
})
