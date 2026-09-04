'use client'

import { useState } from 'react'
import type { LocalSnapshot } from '@/lib/migrate-local'
import {
  clearLocalSnapshot,
  markDeclined,
  uploadLocalSnapshot,
} from '@/lib/migrate-local'
import { createClient } from '@/lib/supabase/client'
import { useExpenseStore } from '@/store/useExpenseStore'

/**
 * Hộp thoại mời đẩy dữ liệu cũ trên máy lên tài khoản. Chỉ hiện khi máy này có
 * dữ liệu cũ VÀ tài khoản trên server chưa có giao dịch nào.
 */
export function MigrationPrompt({
  snapshot,
  onDone,
}: {
  snapshot: LocalSnapshot
  onDone: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const txCount = snapshot.transactions.length
  const budgetCount = Object.values(snapshot.budgets).reduce(
    (total, limits) => total + Object.keys(limits).length,
    0,
  )

  async function upload() {
    setStatus('saving')
    try {
      const supabase = createClient()
      await uploadLocalSnapshot(supabase, snapshot)

      // Nạp lại từ server: Postgres vừa cấp uuid mới cho từng giao dịch, dùng
      // lại mảng cũ thì màn sửa giao dịch tra theo id sẽ không thấy gì.
      const userId = useExpenseStore.getState().userId
      if (userId) await useExpenseStore.getState().loadFromServer(userId)

      clearLocalSnapshot()
      onDone()
    } catch {
      setStatus('error')
    }
  }

  function decline() {
    // Giữ nguyên dữ liệu cũ trong localStorage: xoá bản sao duy nhất của thứ
    // người dùng vừa từ chối đẩy lên là không cứu lại được.
    markDeclined()
    onDone()
  }

  const saving = status === 'saving'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-[420px] rounded-[20px] border border-glass-border bg-card p-5 shadow-2xl md:p-6">
        <h2
          id="migration-title"
          className="text-[18px] leading-tight font-extrabold tracking-[-.015em]"
        >
          Chuyển dữ liệu trên máy này lên tài khoản?
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
          Tìm thấy <strong className="text-foreground">{txCount} giao dịch</strong>
          {budgetCount > 0 && (
            <>
              {' '}và <strong className="text-foreground">{budgetCount} hạn mức</strong>
            </>
          )}{' '}
          đã lưu trên máy này. Chuyển lên tài khoản để xem được trên mọi thiết bị.
        </p>

        {status === 'error' && (
          <p role="alert" className="mt-3 text-[12.5px] font-semibold text-negative">
            Chuyển không xong. Dữ liệu trên máy vẫn còn nguyên, thử lại được.
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={decline}
            disabled={saving}
            className="h-10 rounded-[12px] border border-glass-border px-4 text-[13.5px] font-bold text-muted transition-colors hover:text-foreground disabled:opacity-60"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={upload}
            disabled={saving}
            className="h-10 rounded-[12px] bg-accent px-4 text-[13.5px] font-extrabold text-accent-foreground transition-opacity disabled:opacity-60"
          >
            {saving ? 'Đang chuyển…' : 'Chuyển lên tài khoản'}
          </button>
        </div>
      </div>
    </div>
  )
}
