import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Làm mới session Supabase và chặn route cho người chưa đăng nhập.
 *
 * ⚠️ Tên file là `proxy.ts`, KHÔNG phải `middleware.ts`: Next 16 đã deprecate
 * `middleware.ts` và đổi tên thành `proxy.ts` (xem
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md).
 * Hầu hết hướng dẫn Supabase trên mạng vẫn viết middleware.ts — sẽ không chạy.
 *
 * Đây chỉ là lớp chặn cho đỡ render nhầm màn hình. Phân quyền THẬT là RLS ở
 * Postgres; tài liệu Next nói rõ proxy "không nhằm thay thế việc quản lý session".
 */

/** Trang vào được khi chưa đăng nhập. */
const PUBLIC_PATHS = ['/dang-nhap', '/auth/callback', '/auth/auth-code-error']

export async function proxy(request: NextRequest) {
  // Phải giữ nguyên object response này xuyên suốt: cookie mà Supabase ghi khi
  // làm mới session nằm trên nó. Tạo một NextResponse mới rồi trả về thay thế
  // sẽ làm mất cookie vừa refresh -> người dùng bị đăng xuất mỗi giờ.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // ⚠️ getUser() chứ KHÔNG phải getSession(): getSession chỉ đọc cookie mà
  // không xác thực chữ ký, nên giả mạo được. getUser() hỏi lại Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/dang-nhap'
    return NextResponse.redirect(url)
  }

  // Đã đăng nhập rồi thì không cần thấy màn đăng nhập nữa.
  if (user && pathname === '/dang-nhap') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Không có matcher thì proxy chạy cho MỌI request, kể cả _next/static và ảnh
  // — chặn nhầm cả CSS/JS. Loại trừ chúng ra.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
