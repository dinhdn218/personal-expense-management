import { expect, test } from '@playwright/test'
import { emptyUser, ensureTestUser, workerEmail } from './db'

/**
 * Luồng di trú: đẩy dữ liệu cũ trong localStorage lên tài khoản.
 *
 * Đây là thứ bảo vệ dữ liệu người dùng đã nhập trước khi có backend, nên phải
 * có test thật. Các spec khác cố tình đặt cờ 'migration-declined' để hộp thoại
 * không che giao diện; ở đây thì ngược lại — ta dựng đúng tình huống cho nó hiện.
 */

/** Bản lưu localStorage đúng dạng zustand/persist ghi ra. */
const LOCAL_SNAPSHOT = {
  state: {
    transactions: [
      {
        id: 'tx_local_1',
        type: 'expense',
        amountVnd: 123_000,
        categoryId: 'cafe',
        accountId: 'cash',
        note: 'Khoản cũ trên máy',
        occurredAt: '2026-09-05T09:00:00.000Z',
        createdAt: '2026-09-05T09:00:00.000Z',
      },
      {
        id: 'tx_local_2',
        type: 'income',
        amountVnd: 9_000_000,
        categoryId: 'luong',
        accountId: 'techcombank',
        note: 'Lương cũ trên máy',
        occurredAt: '2026-09-04T09:00:00.000Z',
        createdAt: '2026-09-04T09:00:00.000Z',
      },
    ],
    categories: [
      { id: 'cafe', label: 'Cà phê đổi tên', color: '#FF7A9C' },
      { id: 'luong', label: 'Lương', color: '#3ED6B5' },
    ],
    budgets: { '2026-09': { cafe: 1_500_000 } },
  },
  version: 3,
}

/** Tài khoản trống + localStorage có dữ liệu cũ = đúng điều kiện mời di trú. */
async function arrange(page: import('@playwright/test').Page) {
  const userId = await ensureTestUser(workerEmail())
  await emptyUser(userId)

  await page.goto('/')
  await page.evaluate((snapshot) => {
    localStorage.removeItem('vi-rieng/migration-declined')
    localStorage.setItem('vi-rieng/expenses', JSON.stringify(snapshot))
  }, LOCAL_SNAPSHOT)
  await page.reload()
}

test('mời chuyển dữ liệu cũ, chuyển xong thì thấy trên tài khoản', async ({ page }) => {
  await arrange(page)

  const dialog = page.getByRole('dialog', { name: /Chuyển dữ liệu trên máy này/ })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('2 giao dịch')

  await dialog.getByRole('button', { name: 'Chuyển lên tài khoản' }).click()
  await expect(dialog).toBeHidden()

  // Dữ liệu phải nằm trên server, không phải chỉ trong bộ nhớ: tải lại vẫn còn.
  await page.reload()
  await expect(page.getByText('Khoản cũ trên máy')).toBeVisible()

  // Tên danh mục người dùng tự sửa cũng phải theo lên.
  await page.goto('/danh-muc')
  await expect(page.getByText('Cà phê đổi tên')).toBeVisible()
})

test('chuyển xong thì không hỏi lại, không nhân đôi dữ liệu', async ({ page }) => {
  await arrange(page)

  const dialog = page.getByRole('dialog', { name: /Chuyển dữ liệu trên máy này/ })
  await dialog.getByRole('button', { name: 'Chuyển lên tài khoản' }).click()
  await expect(dialog).toBeHidden()

  await page.reload()

  // Chốt chặn quan trọng nhất: hỏi lại lần nữa là người dùng đẩy lên lần hai,
  // mà id cũ là tx_xxxx còn id mới là uuid nên không có cách nào dedup.
  await expect(dialog).toBeHidden()
  // Bảng desktop và danh sách mobile cùng nằm trong DOM (chỉ ẩn bằng CSS), nên
  // phải scope vào tx-table không thì mỗi chuỗi khớp hai lần.
  await page.goto('/giao-dich')
  await expect(
    page.getByTestId('tx-table').getByText('Khoản cũ trên máy'),
  ).toHaveCount(1)
})

test('bấm Bỏ qua thì không hỏi lại và giữ nguyên dữ liệu cũ trên máy', async ({ page }) => {
  await arrange(page)

  const dialog = page.getByRole('dialog', { name: /Chuyển dữ liệu trên máy này/ })
  await dialog.getByRole('button', { name: 'Bỏ qua' }).click()
  await expect(dialog).toBeHidden()

  await page.reload()
  await expect(dialog).toBeHidden()

  // Xoá bản sao duy nhất của thứ người dùng vừa từ chối đẩy lên là không cứu lại
  // được. persist ghi đè 'vi-rieng/expenses' bằng dữ liệu server ngay khi nạp
  // xong, nên bản gốc phải nằm ở khoá sao lưu riêng.
  const kept = await page.evaluate(() =>
    localStorage.getItem('vi-rieng/pre-supabase-backup'),
  )
  expect(kept).toContain('tx_local_1')
})
