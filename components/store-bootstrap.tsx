'use client'

import { useEffect, useState } from 'react'
import { MigrationPrompt } from '@/components/migration-prompt'
import type { LocalSnapshot } from '@/lib/migrate-local'
import { backupLocalSnapshot, readLocalSnapshot } from '@/lib/migrate-local'
import { createClient } from '@/lib/supabase/client'
import { countTransactions } from '@/lib/supabase/queries'
import { useExpenseStore } from '@/store/useExpenseStore'

/**
 * Nạp dữ liệu từ server sau lần render client đầu tiên, và hỏi chuyện di trú
 * nếu máy này còn dữ liệu cũ trong localStorage.
 *
 * Đi kèm `skipHydration` trong persist: nếu để persist tự đọc localStorage lúc
 * nạp module thì server render sẽ khác client render và React báo lệch.
 */
export function StoreBootstrap() {
  const [pending, setPending] = useState<LocalSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // ⚠️ PHẢI sao lưu TRƯỚC MỌI THỨ KHÁC.
      //
      // loadFromServer ghi đè store bằng dữ liệu server, và persist lập tức lưu
      // trạng thái mới đó đè lên localStorage. Với tài khoản mới (server rỗng),
      // dữ liệu cũ của người dùng bị xoá trắng trong chưa tới một giây. Chép
      // sang khoá sao lưu riêng thì dù người dùng bấm "Bỏ qua", dữ liệu vẫn còn.
      backupLocalSnapshot()
      const local = readLocalSnapshot()

      // Đọc cache localStorage để có gì đó vẽ ngay, rồi mới gọi server.
      await useExpenseStore.persist.rehydrate()

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      await useExpenseStore.getState().loadFromServer(user.id)
      if (cancelled || !local) return

      // Chỉ mời di trú khi server CHƯA có giao dịch nào. Thiếu điều kiện này,
      // người dùng quay lại trên máy còn cache cũ sẽ bị mời đẩy lại thứ đã đẩy
      // -> nhân đôi dữ liệu, mà không có cách nào dedup vì id cũ là tx_xxxx
      // còn id mới là uuid.
      try {
        if ((await countTransactions(supabase)) === 0 && !cancelled) {
          setPending(local)
        }
      } catch {
        // Không đếm được thì thôi, lần sau hỏi lại. Không đoán bừa.
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  if (!pending) return null
  return <MigrationPrompt snapshot={pending} onDone={() => setPending(null)} />
}
