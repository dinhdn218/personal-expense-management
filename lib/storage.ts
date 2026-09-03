const PROBE_KEY = 'vi-rieng/probe'

/**
 * Dữ liệu chỉ nằm ở localStorage, nên "lỗi lưu" ở đây là localStorage bị chặn
 * (chế độ riêng tư) hoặc đã đầy. Dò trước khi ghi để còn giữ nguyên form thay
 * vì mất dữ liệu người dùng vừa gõ.
 */
export function canPersist(): boolean {
  try {
    localStorage.setItem(PROBE_KEY, '1')
    localStorage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}
