/** Chỉ "Tổng quan" có màn hình trong bản này; các mục còn lại là khung điều hướng. */
export const NAV_ITEMS = [
  { id: 'tong-quan', label: 'Tổng quan' },
  { id: 'giao-dich', label: 'Giao dịch' },
  { id: 'danh-muc', label: 'Danh mục' },
  { id: 'ngan-sach', label: 'Ngân sách' },
  { id: 'bao-cao', label: 'Báo cáo' },
] as const

/** Tablet và mobile chỉ đủ chỗ cho 4 mục. */
export const NAV_ITEMS_COMPACT = NAV_ITEMS.slice(0, 4)

export const MONTHLY_BUDGET_VND = 24_000_000
