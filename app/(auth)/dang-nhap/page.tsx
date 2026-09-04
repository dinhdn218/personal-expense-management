'use client'

import { useState } from 'react'
import { Brand } from '@/components/layout/brand'
import { GlassCard } from '@/components/ui/glass-card'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [reason, setReason] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const address = email.trim()
    if (!address) return

    setStatus('sending')
    setReason(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setStatus('sent')
    } catch (error) {
      // Hiện lý do thật thay vì nuốt đi: lỗi hay gặp nhất là sai
      // NEXT_PUBLIC_SUPABASE_URL hoặc chưa bật Email provider, mà một dòng
      // "không gửi được" chung chung thì không lần ra được.
      setReason(error instanceof Error ? error.message : String(error))
      setStatus('error')
    }
  }

  const sending = status === 'sending'

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <GlassCard className="w-full max-w-[400px] p-6 md:p-7">
        <Brand />

        <h1 className="mt-6 text-[24px] leading-tight font-extrabold tracking-[-.02em]">
          Đăng nhập
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Nhập email để nhận liên kết đăng nhập. Không cần mật khẩu.
        </p>

        {status === 'sent' ? (
          <div
            role="status"
            className="mt-6 rounded-[14px] border border-positive/45 bg-positive/10 p-4"
          >
            <p className="text-[13.5px] font-bold text-positive">
              Đã gửi liên kết tới {email.trim()}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Mở hộp thư và bấm vào liên kết để vào app. Liên kết chỉ dùng được
              một lần.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-3 text-[12.5px] font-bold text-accent underline underline-offset-4"
            >
              Gửi lại hoặc đổi email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
            <label htmlFor="email" className="text-[12.5px] font-bold text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
              placeholder="ban@email.com"
              className="h-11 w-full rounded-[13px] border border-glass-border bg-well px-3.5 text-[14.5px] outline-none transition-colors placeholder:text-muted/60 focus-visible:border-accent disabled:opacity-60"
            />

            {status === 'error' && (
              <p role="alert" className="text-[12.5px] font-semibold text-negative">
                Không gửi được liên kết. Kiểm tra lại email rồi thử lần nữa.
                {reason && (
                  <span className="mt-1 block font-medium text-negative/80">
                    {reason}
                  </span>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="mt-1 h-11 rounded-[13px] bg-accent text-[14.5px] font-extrabold text-accent-foreground transition-opacity disabled:opacity-60"
            >
              {sending ? 'Đang gửi…' : 'Gửi liên kết đăng nhập'}
            </button>
          </form>
        )}
      </GlassCard>
    </main>
  )
}
