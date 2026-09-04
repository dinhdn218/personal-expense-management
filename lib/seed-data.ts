import type { CategoryId } from '@/lib/categories'
import type { Transaction } from '@/types/transaction'

/** Hạn mức chi theo tháng: budgets["2026-09"]["an-uong"] = 5_000_000 */
export type Budgets = Record<string, Record<CategoryId, number>>

const at = (day: string, time = '09:00') =>
  new Date(`${day}T${time}:00`).toISOString()

/**
 * Dữ liệu mẫu — khớp đúng số trong thiết kế: thu 24.500.000đ · chi 16.180.000đ
 * · tiết kiệm 34%, và 6 lát donut đúng như "Nội dung mẫu" trong README.
 *
 * Ngày nằm trong `activeMonth` ("2026-09"). Bản handoff đặt phần lớn khoản chi
 * vào tháng 8 nên các số "tháng 9" trong README không bao giờ ra đúng — số tổng
 * đều là selector lọc theo tháng. Giữ nguyên số tiền, danh mục, nguồn tiền và
 * ghi chú của handoff, chỉ dời ngày.
 *
 * Bộ E2E bám vào chính dữ liệu này: `tx_3` là "Cafe Highlands", `tx_6` là
 * "Netflix", `nhau` cố tình không có giao dịch nào để test xoá danh mục, và
 * `khac` không có hạn mức để thấy nhóm "Chưa đặt hạn mức".
 */
export const SEED: Transaction[] = [
  { id: 'tx_3', type: 'expense', amountVnd: 65_000, categoryId: 'cafe', accountId: 'cash', note: 'Cafe Highlands', occurredAt: at('2026-09-03', '09:12'), createdAt: at('2026-09-03', '09:12') },
  { id: 'tx_1', type: 'income', amountVnd: 22_000_000, categoryId: 'luong', accountId: 'techcombank', note: 'Lương tháng 9', occurredAt: at('2026-09-03', '08:00'), createdAt: at('2026-09-03', '08:00') },
  { id: 'tx_4', type: 'expense', amountVnd: 78_000, categoryId: 'di-lai', accountId: 'momo', note: 'Grab về nhà', occurredAt: at('2026-09-02', '22:40'), createdAt: at('2026-09-02', '22:40') },
  { id: 'tx_5', type: 'expense', amountVnd: 412_000, categoryId: 'an-uong', accountId: 'cash', note: 'Đi chợ nấu ăn cuối tuần', occurredAt: at('2026-09-02', '17:05'), createdAt: at('2026-09-02', '17:05') },
  { id: 'tx_6', type: 'expense', amountVnd: 260_000, categoryId: 'khac', accountId: 'techcombank', note: 'Netflix', occurredAt: at('2026-09-02', '07:00'), createdAt: at('2026-09-02', '07:00') },
  { id: 'tx_7', type: 'expense', amountVnd: 5_500_000, categoryId: 'nha-cua', accountId: 'techcombank', note: 'Tiền nhà tháng 9', occurredAt: at('2026-09-01', '10:00'), createdAt: at('2026-09-01', '10:00') },
  { id: 'tx_2', type: 'income', amountVnd: 2_500_000, categoryId: 'khac', accountId: 'techcombank', note: 'Freelance sửa landing', occurredAt: at('2026-09-01', '08:30'), createdAt: at('2026-09-01', '08:30') },
  { id: 'tx_8', type: 'expense', amountVnd: 4_828_000, categoryId: 'an-uong', accountId: 'cash', note: 'Ăn uống trong tháng', occurredAt: at('2026-09-01', '08:00'), createdAt: at('2026-09-01', '08:00') },
  { id: 'tx_9', type: 'expense', amountVnd: 1_782_000, categoryId: 'di-lai', accountId: 'momo', note: 'Xăng + Grab', occurredAt: at('2026-09-01', '07:30'), createdAt: at('2026-09-01', '07:30') },
  { id: 'tx_10', type: 'expense', amountVnd: 1_420_000, categoryId: 'mua-sam', accountId: 'techcombank', note: 'Áo khoác', occurredAt: at('2026-09-01', '07:00'), createdAt: at('2026-09-01', '07:00') },
  { id: 'tx_11', type: 'expense', amountVnd: 825_000, categoryId: 'cafe', accountId: 'cash', note: 'Cafe làm việc', occurredAt: at('2026-09-01', '06:30'), createdAt: at('2026-09-01', '06:30') },
  { id: 'tx_12', type: 'expense', amountVnd: 1_010_000, categoryId: 'khac', accountId: 'techcombank', note: 'Thuốc + tạp hoá', occurredAt: at('2026-09-01', '06:00'), createdAt: at('2026-09-01', '06:00') },
  // Tháng 8 để màn Báo cáo có gì mà so sánh.
  { id: 'tx_13', type: 'income', amountVnd: 22_000_000, categoryId: 'luong', accountId: 'techcombank', note: 'Lương tháng 8', occurredAt: at('2026-08-03', '08:00'), createdAt: at('2026-08-03', '08:00') },
  { id: 'tx_14', type: 'expense', amountVnd: 5_500_000, categoryId: 'nha-cua', accountId: 'techcombank', note: 'Tiền nhà tháng 8', occurredAt: at('2026-08-01', '10:00'), createdAt: at('2026-08-01', '10:00') },
  { id: 'tx_15', type: 'expense', amountVnd: 6_140_000, categoryId: 'an-uong', accountId: 'cash', note: 'Ăn uống tháng 8', occurredAt: at('2026-08-20', '12:00'), createdAt: at('2026-08-20', '12:00') },
  { id: 'tx_16', type: 'expense', amountVnd: 2_310_000, categoryId: 'di-lai', accountId: 'momo', note: 'Đi lại tháng 8', occurredAt: at('2026-08-18', '12:00'), createdAt: at('2026-08-18', '12:00') },
  { id: 'tx_17', type: 'expense', amountVnd: 1_890_000, categoryId: 'mua-sam', accountId: 'techcombank', note: 'Mua sắm tháng 8', occurredAt: at('2026-08-15', '15:30'), createdAt: at('2026-08-15', '15:30') },
  { id: 'tx_18', type: 'expense', amountVnd: 1_820_000, categoryId: 'khac', accountId: 'techcombank', note: 'Chi khác tháng 8', occurredAt: at('2026-08-10', '18:00'), createdAt: at('2026-08-10', '18:00') },
]

/**
 * Hạn mức mẫu — tổng 24.000.000đ, đúng thẻ "Cả tháng" trong thiết kế (67%).
 * Hai mốc lấy thẳng từ README: Nhà cửa còn 500.000đ ở 92%, Ăn uống vượt
 * 240.000đ ở 105%. "Khác" cố tình để trống để thấy nhóm "Chưa đặt hạn mức".
 */
const MONTH_BUDGET: Record<string, number> = {
  'nha-cua': 6_000_000,
  'an-uong': 5_000_000,
  'di-lai': 4_000_000,
  'mua-sam': 5_000_000,
  cafe: 4_000_000,
}

export const SEED_BUDGETS: Budgets = {
  '2026-09': MONTH_BUDGET,
  '2026-08': MONTH_BUDGET,
}

export const SEED_ACTIVE_MONTH = '2026-09'
