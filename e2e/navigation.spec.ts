import { expect, test } from '@playwright/test'
import { resetStore } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetStore(page)
})

test('"Xem tất cả" ở thẻ giao dịch gần đây dẫn sang /giao-dich', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Xem tất cả' }).click()

  await expect(page).toHaveURL(/\/giao-dich$/)
  await expect(page.getByRole('heading', { name: 'Giao dịch' })).toBeVisible()
})

test('link ở thẻ danh mục dẫn sang /bao-cao', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('link', { name: /Xem \d+ danh mục|Xem báo cáo chi tiết/ })
    .click()

  await expect(page).toHaveURL(/\/bao-cao$/)
  await expect(page.getByRole('heading', { name: 'Báo cáo' })).toBeVisible()
})

test('mọi mục trên thanh nav desktop đều vào được', async ({ page }) => {
  await page.goto('/')

  for (const [name, path] of [
    ['Giao dịch', '/giao-dich'],
    ['Danh mục', '/danh-muc'],
    ['Ngân sách', '/ngan-sach'],
    ['Báo cáo', '/bao-cao'],
    ['Tổng quan', '/'],
  ] as const) {
    await page.getByRole('link', { name, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`))
  }
})

test('không còn nút chết nào trên Tổng quan', async ({ page }) => {
  await page.goto('/')
  // Chờ hydrate xong để các thẻ vẽ đủ nội dung.
  await expect(page.getByText('Cafe Highlands').first()).toBeVisible()

  // Mọi <button> hiện trên trang phải có onClick thật — ở đây kiểm gián tiếp:
  // các nhãn điều hướng cũ giờ phải là <a>, không phải <button>.
  await expect(page.getByRole('button', { name: 'Xem tất cả' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tất cả' })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Xem báo cáo chi tiết/ }),
  ).toHaveCount(0)
})

test('sửa được giao dịch ngay từ thẻ trên Tổng quan', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('recent-row-tx_3').click()

  const name = page.getByLabel('Tên giao dịch')
  await expect(name).toBeVisible()
  await name.fill('Cafe sửa từ Tổng quan')
  await page.getByRole('button', { name: 'Lưu' }).click()

  await expect(page.getByText('Cafe sửa từ Tổng quan')).toBeVisible()
})
