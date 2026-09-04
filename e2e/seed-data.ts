import { DEFAULT_CATEGORIES } from '../lib/categories'
import { SEED, SEED_BUDGETS } from '../lib/seed-data'

export { DEFAULT_CATEGORIES, SEED, SEED_BUDGETS }

/**
 * Id cố định cho các giao dịch mẫu mà spec bám vào.
 *
 * Trước đây id là chuỗi 'tx_3' nằm sẵn trong store. Giờ Postgres cấp uuid, nên
 * seeder ghi thẳng uuid cố định để `data-testid` trong spec vẫn xác định được.
 * Ba id này là ba giao dịch spec đang dùng.
 */
export const SEED_IDS = {
  cafeHighlands: '00000000-0000-4000-8000-000000000003', // tx_3
  grabVeNha: '00000000-0000-4000-8000-000000000004', // tx_4
  netflix: '00000000-0000-4000-8000-000000000006', // tx_6
} as const

/** Ánh xạ id cũ -> uuid cố định; giao dịch khác lấy uuid sinh theo thứ tự. */
const FIXED: Record<string, string> = {
  tx_3: SEED_IDS.cafeHighlands,
  tx_4: SEED_IDS.grabVeNha,
  tx_6: SEED_IDS.netflix,
}

export const serverIdFor = (localId: string, index: number) =>
  FIXED[localId] ??
  `00000000-0000-4000-8000-${String(100 + index).padStart(12, '0')}`
