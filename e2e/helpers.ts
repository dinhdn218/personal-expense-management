import type { Page } from '@playwright/test'
import { ensureTestUser, seedUser, workerEmail } from './db'

/**
 * Đưa tài khoản test của worker này về đúng dữ liệu mẫu trước mỗi test.
 *
 * Giữ nguyên tên và chữ ký cũ nên các spec không phải sửa dòng beforeEach.
 * Khác trước ở chỗ dữ liệu giờ nằm ở Postgres chứ không phải localStorage —
 * xoá localStorage không còn đưa app về dữ liệu mẫu nữa.
 */
export async function resetStore(page: Page) {
  const userId = await ensureTestUser(workerEmail())
  await seedUser(userId)

  // Cache localStorage còn giữ dữ liệu của test trước; xoá để lần nạp sau lấy
  // thẳng từ server. Phải mở trang trước đã — localStorage gắn với origin.
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('vi-rieng/expenses')
    // Chặn hộp thoại mời di trú làm che giao diện trong test.
    localStorage.setItem('vi-rieng/migration-declined', '1')
  })
  await page.reload()
}
