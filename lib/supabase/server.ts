import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAnonKey, supabaseUrl } from './env'

/**
 * Client phía server — dùng trong Server Component, Route Handler, Server Action.
 *
 * `cookies()` là async ở Next 16 nên factory này cũng async.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component KHÔNG ghi được cookie — chỉ Server Action, Route
          // Handler và proxy mới ghi được. Nuốt lỗi ở đây là đúng theo tài liệu
          // Supabase: proxy.ts đã làm việc refresh session rồi.
        }
      },
    },
  })
}
