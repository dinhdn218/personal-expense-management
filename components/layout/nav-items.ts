export interface NavItem {
  id: string
  label: string
  href: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'tong-quan', label: 'Tổng quan', href: '/' },
  { id: 'giao-dich', label: 'Giao dịch', href: '/giao-dich' },
  { id: 'danh-muc', label: 'Danh mục', href: '/danh-muc' },
  { id: 'ngan-sach', label: 'Ngân sách', href: '/ngan-sach' },
  { id: 'bao-cao', label: 'Báo cáo', href: '/bao-cao' },
]

/**
 * Tablet và mobile chỉ đủ chỗ cho 4 mục. Bỏ "Danh mục" vì thiết kế chỉ vẽ
 * màn đó ở khổ desktop (2c).
 */
export const NAV_ITEMS_COMPACT: NavItem[] = NAV_ITEMS.filter(
  (item) => item.id !== 'danh-muc',
)

export const MONTHLY_BUDGET_VND = 24_000_000

/** Mục nav đang mở, khớp cả route con. */
export function isActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
