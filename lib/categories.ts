/**
 * Danh mục sửa được lúc chạy (màn 2c), nên `CategoryId` là string chứ không
 * phải union đóng — đây là danh sách **mặc định** khi chưa có gì trong store.
 */
export type CategoryId = string

export interface Category {
  id: CategoryId
  label: string
  color: string
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'an-uong', label: 'Ăn uống', color: '#3ED6B5' },
  { id: 'nhau', label: 'Nhậu', color: 'oklch(.78 .13 265)' },
  { id: 'cafe', label: 'Cafe', color: 'oklch(.76 .14 320)' },
  { id: 'di-lai', label: 'Đi lại', color: '#FF7A9C' },
  { id: 'nha-cua', label: 'Nhà cửa', color: '#F5AC3C' },
  { id: 'mua-sam', label: 'Mua sắm', color: 'oklch(.78 .13 220)' },
  { id: 'luong', label: 'Lương', color: '#3ED6B5' },
  { id: 'khac', label: 'Khác', color: 'rgba(246,241,233,.28)' },
]

/** Giữ lại cho code cũ; nguồn sự thật lúc chạy là store. */
export const CATEGORIES = DEFAULT_CATEGORIES

const FALLBACK: Category = { id: 'khac', label: 'Khác', color: 'var(--c6)' }

export function categoryOf(id: CategoryId, list: Category[] = DEFAULT_CATEGORIES) {
  return list.find((c) => c.id === id) ?? { ...FALLBACK, id }
}

/**
 * 6 màu biểu đồ — bảng chọn màu duy nhất khi sửa danh mục (2c).
 * Dùng biến CSS nên tự đổi theo chế độ sáng/tối.
 */
export const CHART_COLORS = [
  'var(--c1)',
  'var(--c2)',
  'var(--c3)',
  'var(--c4)',
  'var(--c5)',
  'var(--c6)',
]

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
