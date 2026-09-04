import { expect, test } from '@playwright/test'
import { resetStore } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetStore(page)
  await page.goto('/ngan-sach')
})

test('đặt hạn mức cho danh mục chưa có hạn mức', async ({ page }) => {
  // "Khác" cố tình để trống trong seed -> nằm ở nhóm "Chưa đặt hạn mức".
  await page.getByRole('button', { name: 'Đặt' }).first().click()

  const input = page.getByLabel(/^Hạn mức cho /)
  await expect(input).toBeVisible()
  await input.fill('2tr')
  await page.getByRole('button', { name: 'Lưu' }).click()

  // Có hạn mức rồi thì dòng chuyển sang dạng có thanh tiến độ + "% hạn mức".
  await expect(page.getByText('2.000.000đ').first()).toBeVisible()
  await expect(input).toBeHidden()
})

test('hạn mức vừa đặt còn giữ sau khi tải lại', async ({ page }) => {
  await page.getByRole('button', { name: 'Đặt' }).first().click()
  await page.getByLabel(/^Hạn mức cho /).fill('3tr')
  await page.getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByText('3.000.000đ').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('3.000.000đ').first()).toBeVisible()
})

test('nhập hạn mức không hợp lệ thì nút Lưu bị khoá', async ({ page }) => {
  await page.getByRole('button', { name: 'Đặt' }).first().click()

  const save = page.getByRole('button', { name: 'Lưu' })
  await expect(save).toBeDisabled()

  await page.getByLabel(/^Hạn mức cho /).fill('abc')
  await expect(save).toBeDisabled()

  await page.getByLabel(/^Hạn mức cho /).fill('500k')
  await expect(save).toBeEnabled()
})

test('huỷ đặt hạn mức thì không ghi gì', async ({ page }) => {
  await page.getByRole('button', { name: 'Đặt' }).first().click()
  await page.getByLabel(/^Hạn mức cho /).fill('9tr')
  await page.getByRole('button', { name: 'Huỷ' }).click()

  await expect(page.getByText('9.000.000đ')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Đặt' }).first()).toBeVisible()
})

test('danh mục vượt hạn mức hiện nhãn cảnh báo', async ({ page }) => {
  // Ăn uống: chi 5.240.000đ trên hạn mức 5.000.000đ trong dữ liệu mẫu.
  await expect(page.getByText('Vượt hạn mức').first()).toBeVisible()
})

test('gỡ hạn mức cần xác nhận, và gỡ xong thì về nhóm chưa đặt', async ({ page }) => {
  // "Nhà cửa" có hạn mức trong dữ liệu mẫu.
  const remove = page.getByRole('button', { name: 'Gỡ' }).first()
  await remove.click()

  // Bước xác nhận chưa gỡ gì.
  await expect(page.getByText(/Gỡ hạn mức của “.*”\?/)).toBeVisible()

  const before = await page.getByRole('button', { name: 'Đặt' }).count()
  await page.getByRole('button', { name: 'Gỡ hạn mức' }).click()

  // Gỡ xong thì danh mục rơi xuống nhóm "chưa đặt" -> có thêm một nút "Đặt".
  await expect(page.getByRole('button', { name: 'Đặt' })).toHaveCount(before + 1)
})

test('huỷ gỡ hạn mức thì hạn mức vẫn còn', async ({ page }) => {
  // Đợi dữ liệu về rồi mới đếm: count() không tự thử lại như expect(), mà giờ
  // dữ liệu nạp từ server nên lúc mới vào trang danh sách còn rỗng.
  const removeButtons = page.getByRole('button', { name: 'Gỡ' })
  await expect(removeButtons.first()).toBeVisible()
  const before = await removeButtons.count()

  await removeButtons.first().click()
  await page.getByRole('button', { name: 'Huỷ' }).click()

  await expect(page.getByRole('button', { name: 'Gỡ' })).toHaveCount(before)
})

test('sửa lại hạn mức đã đặt', async ({ page }) => {
  await page.getByRole('button', { name: 'Sửa' }).first().click()

  const input = page.getByLabel(/^Hạn mức cho /)
  await expect(input).toBeVisible()
  await input.fill('7tr')
  await page.getByRole('button', { name: 'Lưu' }).click()

  await expect(page.getByText('7.000.000đ').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('7.000.000đ').first()).toBeVisible()
})

test('gỡ hạn mức rồi tải lại vẫn không quay về', async ({ page }) => {
  await page.getByRole('button', { name: 'Gỡ' }).first().click()
  const before = await page.getByRole('button', { name: 'Đặt' }).count()
  await page.getByRole('button', { name: 'Gỡ hạn mức' }).click()
  await expect(page.getByRole('button', { name: 'Đặt' })).toHaveCount(before + 1)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Đặt' })).toHaveCount(before + 1)
})
