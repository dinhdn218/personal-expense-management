import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))

/** Nơi lưu cookie session của tài khoản test (mỗi worker một file). */
export function authFile(index = process.env.TEST_PARALLEL_INDEX ?? '0') {
  return path.join(dir, '.auth', `w${index}.json`)
}
