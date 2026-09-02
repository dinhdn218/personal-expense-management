export const CATEGORIES = [
  { id: 'an-uong', label: 'Ăn uống', color: '#3ED6B5' },
  { id: 'nhau', label: 'Nhậu', color: 'oklch(.78 .13 265)' },
  { id: 'cafe', label: 'Cafe', color: 'oklch(.76 .14 320)' },
  { id: 'di-lai', label: 'Đi lại', color: '#FF7A9C' },
  { id: 'nha-cua', label: 'Nhà cửa', color: '#F5AC3C' },
  { id: 'mua-sam', label: 'Mua sắm', color: 'oklch(.78 .13 220)' },
  { id: 'luong', label: 'Lương', color: '#3ED6B5' },
  { id: 'khac', label: 'Khác', color: 'rgba(246,241,233,.28)' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

export const categoryOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!

/** Danh mục hiện trong form, tách theo loại giao dịch. */
export const EXPENSE_CATEGORY_IDS: CategoryId[] = [
  'an-uong',
  'di-lai',
  'nha-cua',
  'mua-sam',
  'cafe',
  'nhau',
  'khac',
]

export const INCOME_CATEGORY_IDS: CategoryId[] = ['luong', 'khac']
