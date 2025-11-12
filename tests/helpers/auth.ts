/**
 * Authentication Helper Functions
 * Reusable login functions for E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Login as student
 */
export async function loginAsStudent(page: Page, idCard: string = '520102200801011234', password: string = 'password123') {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click student tab
  const studentTab = page.locator('text=学生登录').or(page.locator('[role="tab"]:has-text("学生")'));
  await studentTab.click();
  await page.waitForTimeout(300);

  // Fill credentials
  await page.fill('input[placeholder*="身份证"], input[type="text"]', idCard);
  await page.fill('input[placeholder*="密码"], input[type="password"]', password);

  // Submit
  const loginButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("登录")'));
  await loginButton.click();

  // Wait for navigation
  await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Login as teacher
 */
export async function loginAsTeacher(page: Page, username: string = 'teacher_yy_ps_math', password: string = 'password123') {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click teacher tab
  const teacherTab = page.locator('text=教师登录').or(page.locator('[role="tab"]:has-text("教师")'));
  await teacherTab.click();
  await page.waitForTimeout(500);

  // Wait for username input to be visible
  const usernameInput = page.locator('input[placeholder="用户名"]').or(page.locator('input#username'));
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });

  // Fill credentials
  await usernameInput.fill(username);

  // Wait for password input to be visible
  const passwordInput = page.locator('input[type="password"]').last();
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(password);

  // Submit (use .last() to get the teacher tab's button)
  const loginButton = page.locator('button[type="submit"]').last();
  await loginButton.click();

  // Wait for navigation
  await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Login as admin
 * Note: Admin users use the teacher login tab (教师入口)
 */
export async function loginAsAdmin(page: Page, username: string = 'admin', password: string = 'password123') {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click teacher tab (admin uses same tab as teachers)
  const teacherTab = page.locator('[role="tab"]:has-text("教师入口")');
  await teacherTab.click();
  await page.waitForTimeout(500);

  // Wait for username input to be visible
  const usernameInput = page.locator('input[placeholder="用户名"]').or(page.locator('input#username'));
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await usernameInput.fill(username);

  // Wait for password input to be visible (use .last() to get teacher tab's input)
  const passwordInput = page.locator('input[type="password"]').last();
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(password);

  // Submit (use .last() to get the teacher tab's button)
  const loginButton = page.locator('button[type="submit"]').last();
  await loginButton.click();

  // Wait for navigation
  await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Logout
 */
export async function logout(page: Page) {
  // Click user dropdown
  const userDropdown = page.locator('.ant-dropdown-trigger, [role="button"]:has-text("退出")');
  await userDropdown.click();
  await page.waitForTimeout(300);

  // Click logout
  const logoutButton = page.locator('text=退出登录').or(page.locator('[role="menuitem"]:has-text("退出")'));
  await logoutButton.click();

  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 10000 });
}
