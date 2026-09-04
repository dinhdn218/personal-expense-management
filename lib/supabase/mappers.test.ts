import { describe, expect, it } from 'vitest'
import { rowToCategory, rowToTransaction, rowsToBudgets } from './mappers'
import type { BudgetRow, CategoryRow, TransactionRow } from './types'

const txRow = (over: Partial<TransactionRow> = {}): TransactionRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'u1',
  type: 'expense',
  amount_vnd: 65_000,
  category_id: 'cafe',
  account_id: 'cash',
  note: 'Cafe Highlands',
  occurred_at: '2026-09-03T02:12:00+00:00',
  created_at: '2026-09-03T02:12:00+00:00',
  ...over,
})

describe('rowToTransaction', () => {
  it('đổi snake_case sang camelCase', () => {
    const tx = rowToTransaction(txRow())
    expect(tx.amountVnd).toBe(65_000)
    expect(tx.categoryId).toBe('cafe')
    expect(tx.accountId).toBe('cash')
  })

  it('note null thành undefined, không phải chuỗi "null"', () => {
    expect(rowToTransaction(txRow({ note: null })).note).toBeUndefined()
  })

  // Bảo vệ bẫy sắp xếp: hai chỗ trong store sắp giao dịch bằng
  // localeCompare trên chuỗi occurredAt. Postgres trả "+00:00", localStorage
  // cũ trả ".000Z" — trộn hai dạng thì so sánh chuỗi ra thứ tự sai.
  it('luôn chuẩn hoá thời gian về dạng Z', () => {
    const tx = rowToTransaction(txRow({ occurred_at: '2026-09-03T02:12:00+00:00' }))
    expect(tx.occurredAt.endsWith('Z')).toBe(true)
    expect(tx.occurredAt).toBe('2026-09-03T02:12:00.000Z')
    expect(rowToTransaction(txRow()).createdAt.endsWith('Z')).toBe(true)
  })

  it('sắp xếp bằng localeCompare vẫn đúng khi trộn hai định dạng nguồn', () => {
    const older = rowToTransaction(txRow({ occurred_at: '2026-09-01T00:00:00+00:00' }))
    const newer = rowToTransaction(txRow({ occurred_at: '2026-09-03T00:00:00.000Z' }))
    const sorted = [older, newer].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    )
    expect(sorted[0].occurredAt).toBe(newer.occurredAt)
  })

  it('giữ nguyên mốc thời gian tuyệt đối để monthKey gom tháng đúng', () => {
    // 2026-09-01 00:30 giờ VN = 2026-08-31 17:30 UTC. Cắt chuỗi ISO sẽ ra
    // tháng 8, còn monthKey() dùng giờ địa phương nên ở UTC+7 phải ra tháng 9.
    // Mapper không được tự dịch múi giờ — chỉ đổi định dạng, giữ nguyên mốc.
    const tx = rowToTransaction(txRow({ occurred_at: '2026-08-31T17:30:00+00:00' }))
    expect(tx.occurredAt).toBe('2026-08-31T17:30:00.000Z')
    expect(new Date(tx.occurredAt).getTime()).toBe(
      Date.parse('2026-08-31T17:30:00+00:00'),
    )
  })
})

describe('rowToCategory', () => {
  it('bỏ cột user_id và sort_order khỏi type của app', () => {
    const row: CategoryRow = {
      user_id: 'u1',
      id: 'an-uong',
      label: 'Ăn uống',
      color: '#3ED6B5',
      sort_order: 0,
      created_at: '2026-09-01T00:00:00+00:00',
    }
    expect(rowToCategory(row)).toEqual({
      id: 'an-uong',
      label: 'Ăn uống',
      color: '#3ED6B5',
    })
  })
})

describe('rowsToBudgets', () => {
  const row = (month: string, categoryId: string, limit: number): BudgetRow => ({
    user_id: 'u1',
    month,
    category_id: categoryId,
    limit_vnd: limit,
    updated_at: '2026-09-01T00:00:00+00:00',
  })

  it('dựng lại map lồng theo tháng rồi tới danh mục', () => {
    const budgets = rowsToBudgets([
      row('2026-09', 'an-uong', 5_000_000),
      row('2026-09', 'cafe', 4_000_000),
      row('2026-08', 'an-uong', 6_000_000),
    ])
    expect(budgets).toEqual({
      '2026-09': { 'an-uong': 5_000_000, cafe: 4_000_000 },
      '2026-08': { 'an-uong': 6_000_000 },
    })
  })

  it('không có dòng nào thì trả về object rỗng', () => {
    expect(rowsToBudgets([])).toEqual({})
  })
})
