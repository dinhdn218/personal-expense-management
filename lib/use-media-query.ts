'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Trả `false` khi render trên server và ở lần render client đầu tiên, nên
 * server và client khớp nhau. Chỉ dùng cho thứ xuất hiện sau tương tác
 * (dialog/sheet) hoặc sau khi store hydrate — bố cục vẫn đổi bằng breakpoint CSS.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onStoreChange)
      return () => list.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
