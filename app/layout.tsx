import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileTabbar } from '@/components/layout/mobile-tabbar'
import { StoreHydration } from '@/components/store-hydration'
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

        <StoreHydration />

        <div className="flex h-dvh flex-col xl:flex-row">
          <AppSidebar className="hidden xl:flex" />
          <AppTopbar className="hidden md:flex xl:hidden" />
          <MobileHeader className="md:hidden" />
          {children}
          <MobileTabbar className="md:hidden" />
        </div>
      </body>
    </html>
  )
}
