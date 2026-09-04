import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import './globals.css'

const sans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam-pro',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Ví Riêng — quản lý chi tiêu',
  description: 'Thu chi cá nhân, VND.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0E0C0A' },
    { media: '(prefers-color-scheme: light)', color: '#FBF7F0' },
  ],
}

/**
 * Layout gốc chỉ giữ khung trang, font và nền — không có sidebar hay tabbar.
 * Phần vỏ ứng dụng nằm ở app/(app)/layout.tsx để màn đăng nhập (nhóm (auth))
 * không hiện thanh điều hướng và vòng ngân sách của người chưa đăng nhập.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="vi"
      data-theme="dark"
      className={`${sans.variable} ${mono.variable}`}
      // data-theme được script dưới đây ghi đè trước khi paint.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {/* Nền cho lớp kính: 3 vùng sáng mờ, không phải gradient toàn trang. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background: [
              'radial-gradient(820px 480px at 6% -12%, color-mix(in oklab, var(--accent) 30%, transparent), transparent 62%)',
              'radial-gradient(720px 470px at 94% 4%, oklch(.8 .14 175/.17), transparent 60%)',
              'radial-gradient(760px 540px at 52% 114%, oklch(.72 .15 320/.15), transparent 60%)',
            ].join(','),
          }}
        />
        {children}
      </body>
    </html>
  )
}
