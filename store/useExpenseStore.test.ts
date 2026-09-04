import { beforeEach, describe, expect, it, vi } from 'vitest'

// Store gọi thẳng lớp truy vấn Supabase; test chỉ quan tâm mutation có cập
// nhật cache đúng không, nên thay lớp đó bằng bản giả trong bộ nhớ.
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
vi.mock('@/lib/supabase/queries', async () => {
  const { queryMocks } = await import('./test-supabase')
  return { ...queryMocks, FK_VIOLATION: '23503' }
})

import {
  computeAvailableMonths,
  computeBalanceByAccount,
  computeCashflowSeries,
  computeExpenseByCategory,
  computeMonthlySummary,
  computeRecentTransactions,
  useExpenseStore,
} from '@/store/useExpenseStore'
import type { Transaction } from '@/types/transaction'

const base: Omit<Transaction, 'id'> = {
  type: 'expense',
  amountVnd: 100_000,
  categoryId: 'an-uong',
  accountId: 'cash',
  occurredAt: '2026-09-01T09:00:00.000Z',
  createdAt: '2026-09-01T09:00:00.000Z',
}

const tx = (over: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction => ({
  ...base,
  ...over,
})

describe('addTransaction', () => {
  beforeEach(() => {
    useExpenseStore.setState({ transactions: [], userId: 'u1' })
  })

  it('chèn giao dịch mới lên đầu và trả về id', async () => {
    const id = await useExpenseStore.getState().addTransaction({
      type: 'expense',
      amountVnd: 412_000,
      categoryId: 'an-uong',
      accountId: 'cash',
      note: 'Đi chợ',
      occurredAt: '2026-09-02T10:00:00.000Z',
    })

    const { transactions } = useExpenseStore.getState()
    expect(transactions).toHaveLength(1)
    expect(transactions[0].id).toBe(id)
    expect(transactions[0].amountVnd).toBe(412_000)
    expect(Number.isNaN(Date.parse(transactions[0].createdAt))).toBe(false)
  })

  it('luôn giữ số dương, dấu suy ra từ type', async () => {
    await useExpenseStore.getState().addTransaction({
      type: 'expense',
      amountVnd: 65_000,
      categoryId: 'cafe',
      accountId: 'cash',
      occurredAt: '2026-09-02T10:00:00.000Z',
    })
    expect(useExpenseStore.getState().transactions[0].amountVnd).toBeGreaterThan(0)
  })
})

describe('updateTransaction / removeTransaction', () => {
  beforeEach(() => {
    useExpenseStore.setState({ transactions: [tx({ id: 'a' }), tx({ id: 'b' })] })
  })

  it('chỉ sửa đúng giao dịch khớp id', async () => {
    await useExpenseStore.getState().updateTransaction('a', { amountVnd: 999 })
    const rows = useExpenseStore.getState().transactions
    expect(rows.find((t) => t.id === 'a')?.amountVnd).toBe(999)
    expect(rows.find((t) => t.id === 'b')?.amountVnd).toBe(100_000)
  })

  it('không đổi gì khi id lạ', async () => {
    const before = useExpenseStore.getState().transactions
    await useExpenseStore.getState().updateTransaction('zzz', { amountVnd: 1 })
    expect(useExpenseStore.getState().transactions).toEqual(before)
  })

  it('xoá đúng giao dịch', async () => {
    await useExpenseStore.getState().removeTransaction('a')
    expect(useExpenseStore.getState().transactions.map((t) => t.id)).toEqual(['b'])
  })
})

describe('computeMonthlySummary', () => {
  const rows = [
    tx({ id: '1', type: 'income', amountVnd: 24_500_000, occurredAt: '2026-09-01T08:00:00.000Z' }),
    tx({ id: '2', type: 'expense', amountVnd: 16_180_000, occurredAt: '2026-09-05T08:00:00.000Z' }),
    tx({ id: '3', type: 'expense', amountVnd: 9_000_000, occurredAt: '2026-08-05T08:00:00.000Z' }),
  ]

  it('chỉ tính giao dịch trong tháng và ra đúng số thiết kế', () => {
    const s = computeMonthlySummary(rows, '2026-09')
    expect(s.income).toBe(24_500_000)
    expect(s.expense).toBe(16_180_000)
    expect(s.net).toBe(8_320_000)
    expect(Math.round(s.savingRate * 100)).toBe(34)
  })

  it('tháng chưa có thu nhập thì savingRate = 0, không chia cho 0', () => {
    const s = computeMonthlySummary(
      [tx({ id: 'x', type: 'expense', amountVnd: 500_000 })],
      '2026-09',
    )
    expect(s.savingRate).toBe(0)
    expect(Number.isFinite(s.savingRate)).toBe(true)
  })

  it('tháng rỗng trả về toàn số 0', () => {
    expect(computeMonthlySummary(rows, '2025-01')).toEqual({
      income: 0,
      expense: 0,
      net: 0,
      savingRate: 0,
    })
  })
})

describe('computeBalanceByAccount', () => {
  it('cộng thu, trừ chi theo từng nguồn tiền', () => {
    const acc = computeBalanceByAccount([
      tx({ id: '1', type: 'income', amountVnd: 40_000_000, accountId: 'techcombank' }),
      tx({ id: '2', type: 'expense', amountVnd: 800_000, accountId: 'techcombank' }),
      tx({ id: '3', type: 'income', amountVnd: 3_150_000, accountId: 'cash' }),
    ])
    expect(acc.techcombank).toBe(39_200_000)
    expect(acc.cash).toBe(3_150_000)
    expect(acc.momo).toBe(0)
  })
})

describe('computeExpenseByCategory', () => {
  const rows = [
    tx({ id: '1', type: 'expense', amountVnd: 5_500_000, categoryId: 'nha-cua' }),
    tx({ id: '2', type: 'expense', amountVnd: 5_240_000, categoryId: 'an-uong' }),
    tx({ id: '3', type: 'expense', amountVnd: 1_860_000, categoryId: 'di-lai' }),
    tx({ id: '4', type: 'income', amountVnd: 22_000_000, categoryId: 'luong' }),
  ]

  it('gộp theo danh mục, sắp giảm dần, kèm tỉ trọng', () => {
    const slices = computeExpenseByCategory(rows, '2026-09')
    expect(slices.map((s) => s.categoryId)).toEqual(['nha-cua', 'an-uong', 'di-lai'])
    expect(slices[0].amount).toBe(5_500_000)
    // 5.500.000 / 12.600.000 = 43,65%
    expect(Math.round(slices[0].share * 1000) / 10).toBe(43.7)
    expect(slices.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1)
  })

  it('bỏ qua giao dịch thu', () => {
    const slices = computeExpenseByCategory(rows, '2026-09')
    expect(slices.some((s) => s.categoryId === 'luong')).toBe(false)
  })

  it('không có chi tiêu thì trả mảng rỗng, không NaN', () => {
    expect(computeExpenseByCategory([rows[3]], '2026-09')).toEqual([])
  })
})

describe('computeRecentTransactions', () => {
  it('mới nhất lên đầu, cắt theo limit, không sửa mảng gốc', () => {
    const rows = [
      tx({ id: 'cu', occurredAt: '2026-08-01T09:00:00.000Z' }),
      tx({ id: 'moi', occurredAt: '2026-09-02T09:00:00.000Z' }),
      tx({ id: 'giua', occurredAt: '2026-08-20T09:00:00.000Z' }),
    ]
    const order = rows.map((t) => t.id)

    expect(computeRecentTransactions(rows, 2).map((t) => t.id)).toEqual([
      'moi',
      'giua',
    ])
    expect(rows.map((t) => t.id)).toEqual(order)
  })
})

describe('computeCashflowSeries', () => {
  it('trả đủ 6 tháng liên tiếp, kết thúc ở tháng đang xem', () => {
    const series = computeCashflowSeries([], 6, '2026-09')
    expect(series).toHaveLength(6)
    expect(series.map((p) => p.month)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ])
    expect(series.at(-1)?.label).toBe('T9')
  })

  it('cộng thu chi vào đúng tháng', () => {
    const series = computeCashflowSeries(
      [
        tx({ id: '1', type: 'income', amountVnd: 22_000_000, occurredAt: '2026-09-01T08:00:00.000Z' }),
        tx({ id: '2', type: 'expense', amountVnd: 5_500_000, occurredAt: '2026-08-28T08:00:00.000Z' }),
      ],
      6,
      '2026-09',
    )
    expect(series.at(-1)?.income).toBe(22_000_000)
    expect(series.at(-2)?.expense).toBe(5_500_000)
  })
})

describe('computeRecentTransactions — lọc theo tháng', () => {
  const rows = [
    tx({ id: 't9a', occurredAt: '2026-09-02T09:00:00.000Z' }),
    tx({ id: 't8a', occurredAt: '2026-08-20T09:00:00.000Z' }),
    tx({ id: 't9b', occurredAt: '2026-09-01T09:00:00.000Z' }),
  ]

  it('không truyền tháng thì lấy mọi tháng', () => {
    expect(computeRecentTransactions(rows, 10).map((t) => t.id)).toEqual([
      't9a',
      't9b',
      't8a',
    ])
  })

  it('truyền tháng thì chỉ lấy giao dịch trong tháng đó', () => {
    expect(computeRecentTransactions(rows, 10, '2026-09').map((t) => t.id)).toEqual([
      't9a',
      't9b',
    ])
  })

  it('tháng không có giao dịch nào trả về mảng rỗng', () => {
    expect(computeRecentTransactions(rows, 10, '2026-07')).toEqual([])
  })

  it('không sửa mảng gốc', () => {
    const order = rows.map((t) => t.id)
    computeRecentTransactions(rows, 2, '2026-09')
    expect(rows.map((t) => t.id)).toEqual(order)
  })
})

describe('computeAvailableMonths', () => {
  const now = new Date(2026, 8, 3) // 03/09/2026

  it('gom tháng từ giao dịch, mới nhất trước', () => {
    const rows = [
      tx({ id: 'a', occurredAt: '2026-07-10T09:00:00.000Z' }),
      tx({ id: 'b', occurredAt: '2026-09-01T09:00:00.000Z' }),
    ]
    expect(computeAvailableMonths(rows, {}, '2026-09', now)).toEqual([
      '2026-09',
      '2026-07',
    ])
  })

  it('gộp cả tháng chỉ có hạn mức mà chưa có giao dịch', () => {
    const budgets = { '2026-10': { 'an-uong': 1_000_000 } }
    expect(computeAvailableMonths([], budgets, '2026-09', now)).toEqual([
      '2026-10',
      '2026-09',
    ])
  })

  it('bỏ qua tháng có mục hạn mức rỗng', () => {
    expect(computeAvailableMonths([], { '2026-10': {} }, '2026-09', now)).toEqual([
      '2026-09',
    ])
  })

  it('luôn có tháng đang xem dù tháng đó chưa có dữ liệu', () => {
    expect(computeAvailableMonths([], {}, '2026-03', now)).toContain('2026-03')
  })

  it('luôn có tháng hiện tại để còn quay về được', () => {
    expect(computeAvailableMonths([], {}, '2026-03', now)).toContain('2026-09')
  })

  it('không lặp tháng khi trùng nguồn', () => {
    const rows = [tx({ id: 'a', occurredAt: '2026-09-01T09:00:00.000Z' })]
    const budgets = { '2026-09': { 'an-uong': 1_000_000 } }
    expect(computeAvailableMonths(rows, budgets, '2026-09', now)).toEqual(['2026-09'])
  })
})
