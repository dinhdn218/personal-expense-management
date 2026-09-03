import type { CategoryId } from '@/lib/categories'

export type { CategoryId }

export type TxType = 'income' | 'expense'
export type AccountId = 'techcombank' | 'cash' | 'momo'

export interface Account {
  id: AccountId
  label: string
}

export const ACCOUNTS: Account[] = [
  { id: 'techcombank', label: 'Techcombank' },
  { id: 'cash', label: 'Tiền mặt' },
  { id: 'momo', label: 'Ví Momo' },
]

export const accountOf = (id: AccountId): Account =>
  ACCOUNTS.find((a) => a.id === id) ?? ACCOUNTS[0]

export interface Transaction {
  id: string
  type: TxType
  /** Số nguyên đồng, LUÔN dương. Dấu suy ra từ `type`. */
  amountVnd: number
  categoryId: CategoryId
  accountId: AccountId
  note?: string
  /** ISO — thời điểm phát sinh (người dùng chọn được). */
  occurredAt: string
  createdAt: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>
