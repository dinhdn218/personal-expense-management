import Link from 'next/link'
import { Brand } from '@/components/layout/brand'
import { GlassCard } from '@/components/ui/glass-card'

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <GlassCard className="w-full max-w-[400px] p-6 md:p-7">
        <Brand />
        <h1 className="mt-6 text-[22px] leading-tight font-extrabold tracking-[-.02em]">
          Liên kết không dùng được
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Liên kết đăng nhập đã hết hạn hoặc đã được dùng rồi. Mỗi liên kết chỉ
          dùng được một lần.
        </p>
        <Link
          href="/dang-nhap"
          className="mt-6 flex h-11 items-center justify-center rounded-[13px] bg-accent text-[14.5px] font-extrabold text-accent-foreground"
        >
          Gửi liên kết mới
        </Link>
      </GlassCard>
    </main>
  )
}
