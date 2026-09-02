import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { StoreHydration } from '@/components/shared/store-hydration'
import './globals.css'

// globals.css maps `@theme inline { --font-sans: var(--font-sans) }`, so the
// font must be exposed under that exact variable name to take effect.
const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Expense Dashboard',
  description: 'Track income and spending at a glance.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <StoreHydration />
        {children}
      </body>
    </html>
  )
}
