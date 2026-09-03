import { beforeEach, describe, expect, it } from 'vitest'
import {
  computeBudgetRows,
  computeBudgetStatus,
  computeCategoryUsage,
  computeMonthComparison,
  filterTransactions,
  useExpenseStore,
} from '@/store/useExpenseStore'
import type { Budgets } from '@/store/useExpenseStore'
import type { Transaction } from '@/types/transaction'

const base: Omit<Transaction, 'id'> = {
  type: 'expense',
  amountVnd: 100_000,
  categoryId: 'an-uong',
  accountId: 'cash',
  occurredAt: '2026-09-10T09:00:00.000Z',
  createdAt: '2026-09-10T09:00:00.000Z',
}

const tx = (over: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction => ({
  ...base,
  ...over,
})

describe('computeBudgetStatus', () => {
  it('tính tỉ lệ đã dùng', () => {
    const s = computeBudgetStatus(5_000_000, 10_000_000)
    expect(s.share).toBe(0.5)
    expect(s.over).toBe(false)
    expect(s.overBy).toBe(0)
  })

  it('kẹp share ở 1 để thanh không vẽ quá 100%', () => {
    const s = computeBudgetStatus(12_000_000, 10_000_000)
    expect(s.share).toBe(1)
    expect(s.over).toBe(true)
    expect(s.overBy).toBe(2_000_000)
  })

  it('chưa đặt hạn mức thì share = 0, không chia cho 0', () => {
    const s = computeBudgetStatus(500_000, 0)
    expect(s.share).toBe(0)
    expect(s.over).toBe(false)
    expect(Number.isFinite(s.share)).toBe(true)
  })
})

describe('computeBudgetRows', () => {
  const rows = [
    tx({ id: '1', categoryId: 'nha-cua', amountVnd: 5_500_000 }),
    tx({ id: '2', categoryId: 'an-uong', amountVnd: 5_240_000 }),
    tx({ id: '3', categoryId: 'khac', amountVnd: 1_270_000 }),
    tx({ id: '4', categoryId: 'an-uong', amountVnd: 900_000, occurredAt: '2026-08-10T09:00:00.000Z' }),
    tx({ id: '5', type: 'income', categoryId: 'luong', amountVnd: 22_000_000 }),
  ]
  const budgets: Budgets = {
    '2026-09': { 'nha-cua': 6_000_000, 'an-uong': 5_000_000 },
  }

  it('chỉ tính chi tiêu trong tháng, bỏ qua thu', () => {
    const result = computeBudgetRows(rows, budgets, '2026-09')
    const anUong = result.find((r) => r.categoryId === 'an-uong')!
    expect(anUong.used).toBe(5_240_000)
    expect(result.some((r) => r.categoryId === 'luong')).toBe(false)
  })

  it('đánh dấu vượt hạn mức kèm số vượt', () => {
    const anUong = computeBudgetRows(rows, budgets, '2026-09').find(
      (r) => r.categoryId === 'an-uong',
    )!
    expect(anUong.over).toBe(true)
    expect(anUong.overBy).toBe(240_000)
  })

  it('danh mục có chi nhưng chưa đặt hạn mức được đánh dấu unset và xếp cuối', () => {
    const result = computeBudgetRows(rows, budgets, '2026-09')
    const khac = result.find((r) => r.categoryId === 'khac')!
    expect(khac.unset).toBe(true)
    expect(khac.limit).toBe(0)
    expect(result.at(-1)!.categoryId).toBe('khac')
  })

  it('giữ danh mục đã đặt hạn mức dù tháng này chưa chi đồng nào', () => {
    const result = computeBudgetRows([], budgets, '2026-09')
    expect(result.map((r) => r.categoryId).sort()).toEqual(['an-uong', 'nha-cua'])
    expect(result.every((r) => r.used === 0)).toBe(true)
  })
})

describe('computeCategoryUsage', () => {
  const rows = [
    tx({ id: '1', categoryId: 'cafe', amountVnd: 65_000 }),
    tx({ id: '2', categoryId: 'cafe', amountVnd: 825_000, occurredAt: '2026-08-12T09:00:00.000Z' }),
    tx({ id: '3', categoryId: 'nha-cua', amountVnd: 5_500_000 }),
  ]

  it('đếm giao dịch mọi tháng nhưng chỉ cộng chi của tháng đang xem', () => {
    const usage = computeCategoryUsage(rows, '2026-09')
    expect(usage.get('cafe')!.count).toBe(2)
    expect(usage.get('cafe')!.monthSpend).toBe(65_000)
  })

  it('danh mục không có giao dịch thì không xuất hiện — điều kiện để xoá được', () => {
    const usage = computeCategoryUsage(rows, '2026-09')
    expect(usage.has('nhau')).toBe(false)
  })
})

describe('removeCategory', () => {
  beforeEach(() => {
    useExpenseStore.setState({
      transactions: [tx({ id: '1', categoryId: 'cafe' })],
      categories: [
        { id: 'cafe', label: 'Cafe', color: 'var(--c5)' },
        { id: 'nhau', label: 'Nhậu', color: 'var(--c4)' },
      ],
      budgets: { '2026-09': { cafe: 1_000_000, nhau: 500_000 } },
    })
  })

  it('không xoá danh mục còn giao dịch', () => {
    expect(useExpenseStore.getState().removeCategory('cafe')).toBe(false)
    expect(useExpenseStore.getState().categories).toHaveLength(2)
  })

  it('xoá được danh mục rỗng và dọn luôn hạn mức của nó', () => {
    expect(useExpenseStore.getState().removeCategory('nhau')).toBe(true)
    expect(useExpenseStore.getState().categories.map((c) => c.id)).toEqual(['cafe'])
    expect(useExpenseStore.getState().budgets['2026-09']).toEqual({ cafe: 1_000_000 })
  })
})

describe('updateCategory / setBudget', () => {
  beforeEach(() => {
    useExpenseStore.setState({
      categories: [{ id: 'cafe', label: 'Cafe', color: 'var(--c5)' }],
      budgets: {},
      activeMonth: '2026-09',
    })
  })

  it('sửa tên và màu tại chỗ', () => {
    useExpenseStore.getState().updateCategory('cafe', {
      label: 'Cà phê',
      color: 'var(--c1)',
    })
    expect(useExpenseStore.getState().categories[0]).toEqual({
      id: 'cafe',
      label: 'Cà phê',
      color: 'var(--c1)',
    })
  })

  it('đặt và xoá hạn mức theo tháng đang xem', () => {
    useExpenseStore.getState().setBudget('cafe', 900_000)
    expect(useExpenseStore.getState().budgets['2026-09'].cafe).toBe(900_000)

    useExpenseStore.getState().clearBudget('cafe')
    expect(useExpenseStore.getState().budgets['2026-09'].cafe).toBeUndefined()
  })
})

describe('filterTransactions', () => {
  const rows = [
    tx({ id: 'a', type: 'income', categoryId: 'luong', amountVnd: 22_000_000, occurredAt: '2026-09-01T08:00:00.000Z' }),
    tx({ id: 'b', categoryId: 'cafe', amountVnd: 65_000, occurredAt: '2026-09-02T09:00:00.000Z' }),
    // Trưa 31/8 giờ địa phương — nằm hẳn trong tháng 8 ở mọi múi giờ hợp lý.
    tx({ id: 'c', categoryId: 'an-uong', amountVnd: 412_000, occurredAt: new Date(2026, 7, 31, 12, 0).toISOString() }),
  ]

  it('lọc theo tháng', () => {
    expect(
      filterTransactions(rows, { month: '2026-09' }).map((t) => t.id),
    ).toEqual(['b', 'a'])
  })

  it('lọc theo loại', () => {
    expect(filterTransactions(rows, { type: 'income' }).map((t) => t.id)).toEqual(['a'])
  })

  it('cộng dồn loại và danh mục', () => {
    expect(
      filterTransactions(rows, {
        type: 'expense',
        categoryIds: ['cafe', 'an-uong'],
      }).map((t) => t.id),
    ).toEqual(['b', 'c'])
  })

  it('lọc ra rỗng thì trả mảng rỗng', () => {
    expect(filterTransactions(rows, { categoryIds: ['nhau'] })).toEqual([])
  })

  it('sắp xếp theo cũ nhất và theo số tiền', () => {
    expect(filterTransactions(rows, { sort: 'oldest' }).map((t) => t.id)).toEqual([
      'c',
      'a',
      'b',
    ])
    expect(filterTransactions(rows, { sort: 'amount' }).map((t) => t.id)).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  it('không sửa mảng gốc', () => {
    const order = rows.map((t) => t.id)
    filterTransactions(rows, { sort: 'amount' })
    expect(rows.map((t) => t.id)).toEqual(order)
  })
})

describe('gom tháng theo giờ địa phương', () => {
  it('khoản ghi sáng sớm vẫn nằm trong tháng của giờ địa phương', () => {
    // 06:00 ngày 1/9 giờ địa phương. Ở UTC+7 chuỗi ISO là 2026-08-31T23:00Z,
    // nên cắt chuỗi sẽ ra "2026-08" — phải tính theo giờ địa phương.
    const early = new Date(2026, 8, 1, 6, 0).toISOString()
    const summary = computeMonthComparison(
      [tx({ id: 'som', amountVnd: 1_010_000, occurredAt: early })],
      '2026-09',
    )
    expect(summary.current.expense).toBe(1_010_000)
  })

  it('khoản ghi khuya ngày cuối tháng không rơi sang tháng sau', () => {
    const late = new Date(2026, 8, 30, 23, 30).toISOString()
    const summary = computeMonthComparison(
      [tx({ id: 'khuya', amountVnd: 500_000, occurredAt: late })],
      '2026-09',
    )
    expect(summary.current.expense).toBe(500_000)
  })

  it('ngân sách cũng gom theo giờ địa phương', () => {
    const early = new Date(2026, 8, 1, 6, 0).toISOString()
    const rows = computeBudgetRows(
      [tx({ id: 'som', categoryId: 'cafe', amountVnd: 825_000, occurredAt: early })],
      { '2026-09': { cafe: 4_000_000 } },
      '2026-09',
    )
    expect(rows.find((r) => r.categoryId === 'cafe')!.used).toBe(825_000)
  })
})

describe('computeMonthComparison', () => {
  const rows = [
    tx({ id: '1', amountVnd: 5_000_000, occurredAt: '2026-09-05T09:00:00.000Z' }),
    tx({ id: '2', amountVnd: 6_000_000, occurredAt: '2026-08-05T09:00:00.000Z' }),
  ]

  it('so sánh chi tiêu với tháng liền trước', () => {
    const c = computeMonthComparison(rows, '2026-09')
    expect(c.current.expense).toBe(5_000_000)
    expect(c.previous.expense).toBe(6_000_000)
    expect(c.expenseDelta).toBe(-1_000_000)
    expect(c.expenseShare).toBeCloseTo(-1 / 6)
  })

  it('tháng trước chưa chi gì thì tỉ lệ là null, không chia cho 0', () => {
    const c = computeMonthComparison([rows[0]], '2026-09')
    expect(c.expenseShare).toBeNull()
  })

  it('bắc cầu sang năm trước khi tháng đang xem là tháng 1', () => {
    const c = computeMonthComparison(
      [tx({ id: 'x', amountVnd: 700_000, occurredAt: '2025-12-20T09:00:00.000Z' })],
      '2026-01',
    )
    expect(c.previous.expense).toBe(700_000)
  })
})
