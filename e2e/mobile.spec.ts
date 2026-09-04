import { expect, test } from '@playwright/test'
import { resetStore } from './helpers'
import { SEED_IDS } from './seed-data'

/**
 * Chạy ở khổ iPhone (project "mobile" trong playwright.config.ts).
 * Thanh tab dưới chỉ có 4 mục — "Danh mục" vào từ nút ở màn Ngân sách.
 */

test.beforeEach(async ({ page }) => {
  await resetStore(page)
})

test('thanh tab dưới có 4 mục, không có Danh mục', async ({ page }) => {
  await page.goto('/')

  for (const name of ['Tổng quan', 'Giao dịch', 'Ngân sách', 'Báo cáo']) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: 'Danh mục', exact: true })).toHaveCount(0)
})

test('vào được /danh-muc từ màn Ngân sách', async ({ page }) => {
  await page.goto('/ngan-sach')

  await page.getByRole('link', { name: 'Danh mục' }).click()

  await expect(page).toHaveURL(/\/danh-muc$/)
  await expect(page.getByRole('heading', { name: 'Danh mục' })).toBeVisible()
})

test('pill chọn tháng ở header mobile đổi được tháng', async ({ page }) => {
  await page.goto('/')

  const pill = page.getByRole('combobox', { name: 'Chọn tháng' })
  await expect(pill).toContainText('T9')

  await pill.click()
  await page.getByRole('option', { name: 'Tháng 8, 2026' }).click()

  await expect(pill).toContainText('T8')
})

test('bấm một dòng ở danh sách giao dịch mở được form sửa', async ({ page }) => {
  await page.goto('/giao-dich')

  await page.getByTestId(`tx-row-m-${SEED_IDS.cafeHighlands}`).click()

  await expect(page.getByLabel('Tên giao dịch')).toBeVisible()
})
