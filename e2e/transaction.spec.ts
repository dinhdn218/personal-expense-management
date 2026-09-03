import { expect, test } from '@playwright/test'
import { resetStore } from './helpers'

/**
 * Bảng desktop và danh sách mobile cùng nằm trong DOM (chỉ ẩn bằng CSS), nên
 * mọi locator ở đây phải bám vào `tx-table` — không thì mỗi chuỗi khớp 2 lần.
 */
const table = (page: import('@playwright/test').Page) =>
  page.getByTestId('tx-table')

test.beforeEach(async ({ page }) => {
  await resetStore(page)
  await page.goto('/giao-dich')
})

test('sửa ghi chú của một giao dịch', async ({ page }) => {
  await table(page)
    .getByTestId('tx-row-tx_3')
    .getByRole('button', { name: 'Sửa' })
    .click()

  const name = page.getByLabel('Tên giao dịch')
  await expect(name).toBeVisible()
  await name.fill('Cafe The Coffee House')
  await page.getByRole('button', { name: 'Lưu' }).click()

  await expect(table(page).getByText('Cafe The Coffee House')).toBeVisible()
  await expect(table(page).getByText('Cafe Highlands')).toBeHidden()
})

test('sửa giao dịch còn giữ sau khi tải lại trang', async ({ page }) => {
  await table(page)
    .getByTestId('tx-row-tx_3')
    .getByRole('button', { name: 'Sửa' })
    .click()

  await page.getByLabel('Tên giao dịch').fill('Cafe đã đổi tên')
  await page.getByRole('button', { name: 'Lưu' }).click()
  await expect(table(page).getByText('Cafe đã đổi tên')).toBeVisible()

  // Dữ liệu chỉ nằm ở localStorage — reload là phép thử thật cho persist.
  await page.reload()
  await expect(table(page).getByText('Cafe đã đổi tên')).toBeVisible()
})

test('xoá giao dịch cần xác nhận hai bước', async ({ page }) => {
  await table(page)
    .getByTestId('tx-row-tx_6')
    .getByRole('button', { name: 'Sửa' })
    .click()

  // Bước 1 chỉ mở phần xác nhận, chưa xoá gì.
  await page.getByRole('button', { name: 'Xoá giao dịch' }).click()
  await expect(page.getByText(/Xoá “Netflix”\?/)).toBeVisible()
  await expect(table(page).getByTestId('tx-row-tx_6')).toBeVisible()

  // Bước 2 mới thực sự xoá.
  await page.getByRole('button', { name: 'Xoá', exact: true }).click()
  await expect(table(page).getByTestId('tx-row-tx_6')).toBeHidden()
})

test('huỷ xác nhận thì giao dịch vẫn còn', async ({ page }) => {
  await table(page)
    .getByTestId('tx-row-tx_4')
    .getByRole('button', { name: 'Sửa' })
    .click()

  await page.getByRole('button', { name: 'Xoá giao dịch' }).click()
  await page.getByRole('button', { name: 'Huỷ', exact: true }).first().click()
  await page.keyboard.press('Escape')

  await expect(table(page).getByTestId('tx-row-tx_4')).toBeVisible()
})

test('lọc theo loại thu nhập chỉ còn các khoản thu', async ({ page }) => {
  await page.getByRole('button', { name: 'Thu nhập' }).click()

  await expect(table(page).getByText('Lương tháng 9')).toBeVisible()
  await expect(table(page).getByText('Tiền nhà tháng 9')).toBeHidden()
})
