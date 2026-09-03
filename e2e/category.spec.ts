import { expect, test } from '@playwright/test'
import { resetStore } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetStore(page)
  await page.goto('/danh-muc')
})

test('đổi tên danh mục áp dụng cho cả giao dịch cũ', async ({ page }) => {
  await page
    .getByTestId('cat-row-an-uong')
    .getByRole('button', { name: 'Sửa' })
    .click()

  const input = page.getByLabel('Tên danh mục')
  await expect(input).toBeVisible()
  await input.fill('Ăn uống & tạp hoá')
  await page.getByRole('button', { name: 'Lưu' }).click()

  await expect(page.getByText('Ăn uống & tạp hoá')).toBeVisible()

  // Tên mới phải hiện cả ở màn Giao dịch (danh mục là nguồn dùng chung).
  await page.goto('/giao-dich')
  await expect(
    page.getByTestId('tx-table').getByText('Ăn uống & tạp hoá').first(),
  ).toBeVisible()
})

test('không xoá được danh mục còn giao dịch, có nói lý do', async ({ page }) => {
  const anUongRow = page.getByTestId('cat-row-an-uong')

  await expect(anUongRow.getByRole('button', { name: 'Xoá' })).toBeDisabled()
  await expect(page.getByText(/Chưa xoá được — còn \d+ giao dịch/).first()).toBeVisible()
})

test('xoá được danh mục chưa có giao dịch nào', async ({ page }) => {
  // "Nhậu" có trong danh mục mặc định nhưng không có giao dịch nào trong seed.
  const nhauRow = page.getByTestId('cat-row-nhau')

  const remove = nhauRow.getByRole('button', { name: 'Xoá' })
  await expect(remove).toBeEnabled()
  await remove.click()

  await expect(page.getByTestId('cat-row-nhau')).toHaveCount(0)
})

test('huỷ sửa danh mục thì giữ tên cũ', async ({ page }) => {
  await page
    .getByTestId('cat-row-cafe')
    .getByRole('button', { name: 'Sửa' })
    .click()

  await page.getByLabel('Tên danh mục').fill('Trà sữa')
  await page.getByRole('button', { name: 'Huỷ' }).click()

  await expect(page.getByText('Cafe', { exact: true })).toBeVisible()
  await expect(page.getByText('Trà sữa')).toHaveCount(0)
})
