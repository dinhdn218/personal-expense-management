export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  /** Always positive. Direction comes from `type`. */
  amount: number
  /** Category id, see CATEGORIES. */
  category: string
  /** ISO date, 'YYYY-MM-DD'. */
  date: string
  note?: string
  /** ISO timestamp. */
  createdAt: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>

export interface Category {
  id: string
  label: string
  /** Hex color used for the category dot, bar, and donut slice. */
  color: string
  /** Which transaction types may use this category. */
  kind: TransactionType | 'both'
}

export const CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', color: '#4ade80', kind: 'income' },
  { id: 'freelance', label: 'Freelance', color: '#facc15', kind: 'income' },
  { id: 'food', label: 'Food & Drink', color: '#fb923c', kind: 'expense' },
  { id: 'transport', label: 'Transport', color: '#38bdf8', kind: 'expense' },
  { id: 'shopping', label: 'Shopping', color: '#a78bfa', kind: 'expense' },
  { id: 'bills', label: 'Bills & Utilities', color: '#f43f5e', kind: 'expense' },
  { id: 'entertainment', label: 'Entertainment', color: '#22d3ee', kind: 'expense' },
  { id: 'health', label: 'Health', color: '#34d399', kind: 'expense' },
  { id: 'other', label: 'Other', color: '#94a3b8', kind: 'both' },
]

const FALLBACK_CATEGORY: Category = {
  id: 'other',
  label: 'Other',
  color: '#94a3b8',
  kind: 'both',
}

export function getCategory(id: string): Category {
  return CATEGORIES.find((category) => category.id === id) ?? FALLBACK_CATEGORY
}

export function categoriesForType(type: TransactionType): Category[] {
  return CATEGORIES.filter(
    (category) => category.kind === type || category.kind === 'both',
  )
}
