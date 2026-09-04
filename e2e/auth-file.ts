import path from 'node:path'

/**
 * Nơi lưu cookie session của tài khoản test (mỗi worker một file).
 *
 * Dùng process.cwd() chứ không import.meta.url: playwright.config.ts được nạp
 * bằng CommonJS nên import.meta không dùng được ở đây. Playwright luôn chạy từ
 * gốc repo (nơi có playwright.config.ts).
 */
export function authFile(index = process.env.TEST_PARALLEL_INDEX ?? '0') {
  return path.join(process.cwd(), 'e2e', '.auth', `w${index}.json`)
}
