import { defineConfig, devices } from '@playwright/test'
import { authFile } from './e2e/auth-file'

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
  // Chốt cứng để e2e/auth.setup.ts biết phải tạo trước bao nhiêu session.
  workers: Number(process.env.E2E_WORKERS ?? (process.env.CI ? 1 : 4)),
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      // Đăng nhập tài khoản test một lần, lưu cookie ra file cho các project
      // khác dùng lại.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: authFile(),
      },
      testIgnore: /mobile\.spec\.ts|auth\.setup\.ts/,
    },
    {
      // Khổ mobile — kiểm tab bar, header mobile và lối vào /danh-muc.
      // Chạy trên Chromium (Pixel 7) chứ không phải iPhone: preset iPhone dùng
      // WebKit, thêm một browser nữa chỉ để đổi kích thước là không đáng.
      name: 'mobile',
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: authFile() },
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
