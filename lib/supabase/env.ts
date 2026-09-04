/**
 * Đọc biến môi trường một chỗ, báo lỗi rõ ràng khi thiếu.
 *
 * Next thay thế `process.env.NEXT_PUBLIC_*` lúc build bằng cách khớp CHÍNH XÁC
 * chuỗi `process.env.TÊN_BIẾN`, nên phải viết đầy đủ từng cái — đọc động kiểu
 * process.env[name] sẽ ra undefined ở phía trình duyệt.
 */
export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_URL. Xem hướng dẫn ở supabase/README.md.',
    )
  }
  return value
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!value) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY. Xem hướng dẫn ở supabase/README.md.',
    )
  }
  return value
}
