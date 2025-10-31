import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置
 * 支持冒烟测试和回归测试两个级别
 */
export default defineConfig({
  testDir: './e2e',

  // 测试超时设置
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },

  // 并行执行配置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // 测试报告
  reporter: [
    ['html', { outputFolder: './test-results/html' }],
    ['json', { outputFile: './test-results/results.json' }],
    ['list']
  ],

  // 测试artifacts输出目录（截图、视频、trace等）
  outputDir: './test-results/artifacts',

  // 全局配置
  use: {
    baseURL: 'http://localhost:80',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // 测试项目配置
  projects: [
    // 设置认证
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chromium 浏览器测试
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

    // Firefox 浏览器测试（可选）
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['setup'],
    // },

    // 移动端测试（可选）
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    //   dependencies: ['setup'],
    // },
  ],

  // Web 服务器配置（如果需要启动本地服务器）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:80',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
