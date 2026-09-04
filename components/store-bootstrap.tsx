'use client'

import { useEffect, useState } from 'react'
import { MigrationPrompt } from '@/components/migration-prompt'
import type { LocalSnapshot } from '@/lib/migrate-local'
import { readLocalSnapshot } from '@/lib/migrate-local'
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
      // Đọc cache localStorage trước để có gì đó vẽ ngay, rồi mới gọi server.
      await useExpenseStore.persist.rehydrate()

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      await useExpenseStore.getState().loadFromServer(user.id)
      if (cancelled) return

      // Chỉ mời di trú khi đủ CẢ BA điều kiện. Điều kiện "server chưa có giao
      // dịch nào" là quan trọng nhất: thiếu nó, người dùng quay lại trên máy
      // còn cache cũ sẽ bị mời đẩy lại thứ đã đẩy -> nhân đôi dữ liệu, mà không
      // có cách nào dedup vì id cũ là tx_xxxx còn id mới là uuid.
      const local = readLocalSnapshot()
      if (!local) return

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
