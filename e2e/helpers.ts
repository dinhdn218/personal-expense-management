import type { Page } from '@playwright/test'

/**
 * Xoá bản lưu localStorage trước mỗi test để store quay về dữ liệu mẫu.
 * Phải mở trang một lần trước đã — localStorage gắn với origin, chưa vào
 * trang thì chưa có origin nào để xoá.
 */
export async function resetStore(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('vi-rieng/expenses'))
}
