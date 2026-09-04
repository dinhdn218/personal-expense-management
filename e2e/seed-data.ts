import { DEFAULT_CATEGORIES } from '../lib/categories'
import { SEED, SEED_BUDGETS } from '../lib/seed-data'

export { DEFAULT_CATEGORIES, SEED, SEED_BUDGETS }

/**
 * Id cố định cho các giao dịch mẫu mà spec bám vào.
 *
 * Trước đây id là chuỗi 'tx_3' nằm sẵn trong store. Giờ Postgres cấp uuid, nên
 * seeder ghi thẳng uuid cố định để `data-testid` trong spec vẫn xác định được.
 *
 * ⚠️ Phải kèm chỉ số worker: transactions.id là khoá chính của CẢ BẢNG, không
 * phải khoá theo từng user. Dùng chung một uuid cho mọi worker thì worker thứ
 * hai seed sẽ đụng khoá (23505) — dù mỗi worker một tài khoản riêng.
 */
const workerIndex = () => process.env.TEST_PARALLEL_INDEX ?? '0'

/** uuid dạng 0000000W-0000-4000-8000-00000000000N (W = worker, N = số thứ tự). */
const seedUuid = (n: number, worker = workerIndex()) =>
  `${String(worker).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`

export const SEED_IDS = {
  get cafeHighlands() {
    return seedUuid(3) // tx_3
  },
  get grabVeNha() {
    return seedUuid(4) // tx_4
  },
  get netflix() {
    return seedUuid(6) // tx_6
  },
}

/** Ánh xạ id cũ -> uuid cố định; giao dịch khác lấy uuid sinh theo thứ tự. */
const FIXED: Record<string, number> = { tx_3: 3, tx_4: 4, tx_6: 6 }

export const serverIdFor = (localId: string, index: number, worker?: string) =>
  seedUuid(FIXED[localId] ?? 100 + index, worker ?? workerIndex())
