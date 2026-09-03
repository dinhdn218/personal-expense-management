import { expect, test } from '@playwright/test'
import { resetStore } from './helpers'

/** Mở pill chọn tháng rồi chọn một mục trong danh sách. */
async function pickMonth(page: import('@playwright/test').Page, label: string) {
  await page.getByRole('combobox', { name: 'Chọn tháng' }).click()
  await page.getByRole('option', { name: label }).click()
}

test.beforeEach(async ({ page }) => {
  await resetStore(page)
})

test('đổi tháng trên Tổng quan đổi số liệu của tháng đó', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'Chọn tháng' })).toContainText(
    'Tháng 9, 2026',
  )

  await pickMonth(page, 'Tháng 8, 2026')

  await expect(page.getByRole('combobox', { name: 'Chọn tháng' })).toContainText(
    'Tháng 8, 2026',
  )
  // Giao dịch tháng 8 xuất hiện ở thẻ "Giao dịch gần đây".
  await expect(page.getByText('Lương tháng 8').first()).toBeVisible()
})

test('tháng đã chọn giữ nguyên khi sang màn khác', async ({ page }) => {
  await page.goto('/')
  await pickMonth(page, 'Tháng 8, 2026')

  await page.getByRole('link', { name: 'Giao dịch' }).first().click()
  await expect(page).toHaveURL(/\/giao-dich$/)

  await expect(page.getByRole('combobox', { name: 'Chọn tháng' })).toContainText(
    'Tháng 8, 2026',
  )
  await expect(page.getByTestId('tx-table').getByText('Tiền nhà tháng 8')).toBeVisible()
  await expect(page.getByTestId('tx-table').getByText('Tiền nhà tháng 9')).toBeHidden()
})

test('đổi tháng lọc lại danh sách giao dịch', async ({ page }) => {
  await page.goto('/giao-dich')
  await expect(page.getByTestId('tx-table').getByText('Cafe Highlands')).toBeVisible()

  await pickMonth(page, 'Tháng 8, 2026')

  await expect(page.getByTestId('tx-table').getByText('Cafe Highlands')).toBeHidden()
  await expect(page.getByTestId('tx-table').getByText('Ăn uống tháng 8')).toBeVisible()
})

test('đổi tháng đổi luôn ngân sách của tháng đó', async ({ page }) => {
  await page.goto('/ngan-sach')
  const meta = page.getByText(/Đã dùng .* trên .* · còn \d+ ngày/)
  await expect(meta).toBeVisible()
  const thang9 = await meta.textContent()

  await pickMonth(page, 'Tháng 8, 2026')

  await expect(meta).not.toHaveText(thang9!)
})

test('tháng đang chọn còn giữ sau khi tải lại', async ({ page }) => {
  await page.goto('/')
  await pickMonth(page, 'Tháng 8, 2026')

  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Chọn tháng' })).toContainText(
    'Tháng 8, 2026',
  )
})
