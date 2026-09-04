'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Client phía trình duyệt — dùng cho store, bootstrap và mọi mutation.
 *
 * createBrowserClient tự nhớ instance theo cặp (url, key) nên gọi nhiều lần
 * không tạo nhiều kết nối; vẫn giữ hàm thay vì export sẵn một biến để module
 * không cần biến môi trường ngay lúc nạp (test import store sẽ không nổ).
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey())
}
