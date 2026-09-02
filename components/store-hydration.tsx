'use client'

import { useEffect } from 'react'
import { useExpenseStore } from '@/store/useExpenseStore'

/**
 * Hydrate store sau lần render client đầu tiên. Đi kèm `skipHydration` trong
 * persist: nếu để persist tự đọc localStorage lúc nạp module thì server render
 * (dữ liệu seed) sẽ khác client render (dữ liệu đã lưu) và React báo lệch.
 */
export function StoreHydration() {
  useEffect(() => {
    void useExpenseStore.persist.rehydrate()
  }, [])

  return null
}
