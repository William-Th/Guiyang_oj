/**
 * Debug Achievement Page - Capture console errors
 */

import { test, expect, Page } from '@playwright/test';

const STUDENT = {
  username: '13800138003',
  password: 'password123'
};

async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.click('text=学生入口');
  await page.fill('input[placeholder="手机号"]', STUDENT.username);
  await page.fill('input[placeholder="密码"]', STUDENT.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 15000 });
}

test('Debug: Capture console messages on achievement page', async ({ page }) => {
  // Capture all console messages
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  // Login
  await loginAsStudent(page);

  // Navigate to achievement page
  await page.goto('/student/achievements');

  // Wait a bit for page to load
  await page.waitForTimeout(5000);

  // Output all captured messages
  console.log('\n=== Console Messages ===');
  consoleMessages.forEach(msg => console.log(msg));

  console.log('\n=== Console Errors ===');
  consoleErrors.forEach(err => console.log(err));

  console.log('\n=== Page Errors ===');
  pageErrors.forEach(err => console.log(err));

  // Check specific elements
  console.log('\n=== Page Elements ===');

  const title = await page.locator('h1, h2').first().textContent();
  console.log('Page title:', title);

  const spinnerExists = await page.locator('.ant-spin').count();
  console.log('Spinner count:', spinnerExists);

  const statsCards = await page.locator('.ant-statistic').count();
  console.log('Statistics cards:', statsCards);

  const tabs = await page.locator('[role="tab"]').count();
  console.log('Tabs count:', tabs);

  const achievementCards = await page.locator('.ant-card').count();
  console.log('Achievement cards:', achievementCards);

  // Check if there's an error message
  const errorMessage = await page.locator('.ant-alert-error, .ant-message-error').count();
  console.log('Error messages:', errorMessage);

  // Take a screenshot for visual inspection
  await page.screenshot({ path: 'D:/CS/Git/tests/test-results/debug-achievement-page.png', fullPage: true });

  // Always pass - this is just for debugging
  expect(true).toBe(true);
});
