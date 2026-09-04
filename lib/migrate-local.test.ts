import { beforeEach, describe, expect, it } from 'vitest'
import {
  BACKUP_KEY,
  DECLINED_KEY,
  STORAGE_KEY,
  backupLocalSnapshot,
  clearLocalSnapshot,
  markDeclined,
  readLocalSnapshot,
} from './migrate-local'

const write = (state: unknown) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 2 }))

const tx = (id: string) => ({
  id,
  type: 'expense',
  amountVnd: 100_000,
  categoryId: 'an-uong',
  accountId: 'cash',
  occurredAt: '2026-09-01T09:00:00.000Z',
  createdAt: '2026-09-01T09:00:00.000Z',
})

describe('readLocalSnapshot', () => {
  beforeEach(() => localStorage.clear())

  it('đọc được dữ liệu cũ do zustand/persist ghi', () => {
    write({
      transactions: [tx('tx_1')],
      categories: [{ id: 'an-uong', label: 'Ăn uống', color: '#3ED6B5' }],
      budgets: { '2026-09': { 'an-uong': 5_000_000 } },
    })

    const snapshot = readLocalSnapshot()
    expect(snapshot?.transactions).toHaveLength(1)
    expect(snapshot?.categories[0].label).toBe('Ăn uống')
    expect(snapshot?.budgets['2026-09']['an-uong']).toBe(5_000_000)
  })

  it('không có gì trong localStorage thì trả null', () => {
    expect(readLocalSnapshot()).toBeNull()
  })

  // Không giao dịch nào thì chẳng có gì đáng để mời chuyển.
  it('bỏ qua khi danh sách giao dịch rỗng', () => {
    write({ transactions: [], categories: [], budgets: {} })
    expect(readLocalSnapshot()).toBeNull()
  })

  // Người dùng đã bấm "Bỏ qua" thì đừng hỏi lại mỗi lần mở app.
  it('im lặng sau khi người dùng đã từ chối', () => {
    write({ transactions: [tx('tx_1')], categories: [], budgets: {} })
    expect(readLocalSnapshot()).not.toBeNull()

    markDeclined()
    expect(readLocalSnapshot()).toBeNull()
  })

  it('cache hỏng thì trả null chứ không ném lỗi', () => {
    localStorage.setItem(STORAGE_KEY, '{ không phải json')
    expect(readLocalSnapshot()).toBeNull()
  })

  it('thiếu hẳn khoá state thì trả null', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }))
    expect(readLocalSnapshot()).toBeNull()
  })

  // Bản lưu cũ có thể thiếu categories/budgets; vẫn phải chuyển được giao dịch.
  it('thiếu categories và budgets thì điền mặc định rỗng', () => {
    write({ transactions: [tx('tx_1')] })
    const snapshot = readLocalSnapshot()
    expect(snapshot?.transactions).toHaveLength(1)
    expect(snapshot?.categories).toEqual([])
    expect(snapshot?.budgets).toEqual({})
  })
})

describe('backupLocalSnapshot', () => {
  beforeEach(() => localStorage.clear())

  // Đây là chốt chặn mất dữ liệu: zustand/persist ghi đè STORAGE_KEY bằng dữ
  // liệu server ngay khi nạp xong, nên phải chép sang khoá riêng trước.
  it('chép dữ liệu cũ sang khoá sao lưu', () => {
    write({ transactions: [tx('tx_1')], categories: [], budgets: {} })
    backupLocalSnapshot()
    expect(localStorage.getItem(BACKUP_KEY)).toContain('tx_1')
  })

  it('vẫn đọc được sau khi STORAGE_KEY bị ghi đè bằng dữ liệu server rỗng', () => {
    write({ transactions: [tx('tx_1')], categories: [], budgets: {} })
    backupLocalSnapshot()

    // persist ghi đè: tài khoản mới trên server chưa có giao dịch nào.
    write({ transactions: [], categories: [], budgets: {} })

    expect(readLocalSnapshot()?.transactions).toHaveLength(1)
  })

  it('không đè lên bản sao lưu đã có', () => {
    write({ transactions: [tx('tx_goc')], categories: [], budgets: {} })
    backupLocalSnapshot()

    write({ transactions: [tx('tx_moi')], categories: [], budgets: {} })
    backupLocalSnapshot()

    expect(localStorage.getItem(BACKUP_KEY)).toContain('tx_goc')
    expect(localStorage.getItem(BACKUP_KEY)).not.toContain('tx_moi')
  })

  it('đã từ chối rồi thì không sao lưu nữa', () => {
    markDeclined()
    write({ transactions: [tx('tx_1')], categories: [], budgets: {} })
    backupLocalSnapshot()
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull()
  })
})

describe('clearLocalSnapshot', () => {
  beforeEach(() => localStorage.clear())

  it('xoá bản sao lưu nhưng GIỮ cờ đã-từ-chối', () => {
    write({ transactions: [tx('tx_1')], categories: [], budgets: {} })
    backupLocalSnapshot()
    markDeclined()

    clearLocalSnapshot()

    expect(localStorage.getItem(BACKUP_KEY)).toBeNull()
    expect(localStorage.getItem(DECLINED_KEY)).toBe('1')
  })
})
