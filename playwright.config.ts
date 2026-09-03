import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`

/**
 * Next 16 chỉ cho một `next dev` mỗi thư mục, nên E2E dùng luôn server đang
 * mở ở 3000 (`reuseExistingServer`) và tự khởi động nếu chưa có.
 * Spec đặt trong `e2e/*.spec.ts` — vitest chỉ nhận `*.test.ts` nên hai bộ
 * không giẫm chân nhau.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      // Khổ mobile — kiểm tab bar, header mobile và lối vào /danh-muc.
      // Chạy trên Chromium (Pixel 7) chứ không phải iPhone: preset iPhone dùng
      // WebKit, thêm một browser nữa chỉ để đổi kích thước là không đáng.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
