import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Xoá lịch sử gọi + mockRejectedValueOnce còn thừa giữa các test, để
    // assertion đếm số lần gọi không ăn theo test trước.
    clearMocks: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
