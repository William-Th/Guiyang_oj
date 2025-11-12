import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE, TEACHER_STORAGE_STATE, ADMIN_STORAGE_STATE } from './test-config';

setup('authenticate as student', async ({ page }) => {
  // Perform authentication steps
  await page.goto('/login');

  // Click student tab (default, but click to be explicit)
  await page.click('text=学生入口');

  // Fill in student credentials (using phone number login)
  // Note: Students now login with phone number only (ID card field removed)
  await page.fill('input[placeholder="手机号"]', '13800138003');
  await page.fill('input[placeholder="密码"]', 'password123');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for successful login and redirect
  await page.waitForURL('/');

  // Verify login was successful
  await expect(page).toHaveURL('/');

  // Save signed-in state to 'STORAGE_STATE'.
  await page.context().storageState({ path: STORAGE_STATE });
});

setup('authenticate as teacher', async ({ page }) => {
  // Perform authentication steps for teacher
  await page.goto('/login');

  // Click teacher tab and wait for animation
  await page.click('text=教师入口');
  await page.waitForTimeout(1500);

  // Fill username and password - use placeholder to target the right inputs in active tab
  const activeTabPane = page.locator('.ant-tabs-tabpane-active');
  await activeTabPane.locator('input[placeholder="用户名"]').fill('teacher_yy_ps_math');
  await activeTabPane.locator('input[placeholder="密码"]').fill('password123');

  // Click login button within active tab
  await activeTabPane.locator('button[type="submit"]').click();

  // Wait for successful login and redirect
  await page.waitForURL('/', { timeout: 15000 });

  // Verify login was successful
  await expect(page).toHaveURL('/');

  // Save signed-in state
  await page.context().storageState({ path: TEACHER_STORAGE_STATE });
});

setup('authenticate as admin', async ({ page }) => {
  // Perform authentication steps for admin
  await page.goto('/login');

  // Click teacher tab (admin uses same login as teachers) and wait for animation
  await page.click('text=教师入口');
  await page.waitForTimeout(1500);

  // Fill username and password - use placeholder to target the right inputs in active tab
  const activeTabPane = page.locator('.ant-tabs-tabpane-active');
  await activeTabPane.locator('input[placeholder="用户名"]').fill('admin');
  await activeTabPane.locator('input[placeholder="密码"]').fill('password123');

  // Click login button within active tab
  await activeTabPane.locator('button[type="submit"]').click();

  // Wait for successful login and redirect (admin redirects to /admin/home)
  await page.waitForURL(/\/(admin\/home)?/, { timeout: 15000 });

  // Verify login was successful
  await expect(page).toHaveURL(/\/(admin\/home)?/);

  // CRITICAL: Wait for localStorage to be populated with auth data
  await page.waitForFunction(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token !== null && user !== null;
  }, { timeout: 5000 });

  // Verify auth data is actually in localStorage
  const hasAuthData = await page.evaluate(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return user && user.role && user.username === 'admin';
    } catch {
      return false;
    }
  });

  if (!hasAuthData) {
    throw new Error('Admin authentication failed - localStorage not populated');
  }

  // Save signed-in state
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
