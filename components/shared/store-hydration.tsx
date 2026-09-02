'use client'

import { useEffect } from 'react'
import { useExpenseStore } from '@/store/use-expense-store'

/**
 * Rehydrates the persisted store after the first client render, so the server
 * render and the first client render both start from seed state and match.
 * Pairs with `skipHydration` in the store's persist options.
 */
export function StoreHydration() {
  useEffect(() => {
    void useExpenseStore.persist.rehydrate()
  }, [])

  return null
}
