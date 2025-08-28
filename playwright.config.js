import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__', // 경로 수정
  testMatch: '**/*.e2e.spec.ts', // e2e 테스트 파일만 실행
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 120000, // 2분
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // Vite 기본 포트
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 6 * 120 * 1000, // 6분
  },
});
