import { test, expect } from '@playwright/test';
import { TEST_CONFIG, SELECTORS, TEST_TIMEOUTS } from './test-config';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('显示登录页面基本元素', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/贵阳市小学生测评平台/);

    // Check login card is visible
    await expect(page.locator('.login-card')).toBeVisible();

    // Check tabs are present
    await expect(page.locator('text=学生入口')).toBeVisible();
    await expect(page.locator('text=教师入口')).toBeVisible();
  });

  test('学生登录功能', async ({ page }) => {
    // Select student tab
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);

    // Fill form with valid credentials
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, TEST_CONFIG.STUDENT.idCard);
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, TEST_CONFIG.STUDENT.password);

    // Submit form
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // Wait for navigation after successful login
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // Verify successful login by checking URL
    await expect(page).toHaveURL('/');
  });

  test('教师登录功能', async ({ page }) => {
    // Select teacher tab
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);

    // Fill form with valid credentials
    await page.fill(SELECTORS.LOGIN.USERNAME_INPUT, TEST_CONFIG.TEACHER.username);
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, TEST_CONFIG.TEACHER.password);

    // Submit form
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // Wait for navigation after successful login
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // Verify successful login
    await expect(page).toHaveURL('/');
  });

  test('学生登录验证 - 无效身份证号', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);

    // Try with invalid ID card format
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, '123456');
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, 'password123');

    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // Should show validation error
    await expect(page.locator('text=请输入正确的身份证号')).toBeVisible();
  });

  test('登录验证 - 空字段', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);

    // Try to submit without filling fields
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // Should show required field errors
    await expect(page.locator('text=请输入身份证号')).toBeVisible();
  });

  test('错误凭据登录处理', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);

    // Try with wrong credentials
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, '520102200801011234');
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, 'wrongpassword');

    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // Should stay on login page and show error message
    await expect(page).toHaveURL('/login');

    // Wait for error message (using a more general selector since exact error text may vary)
    await expect(page.locator('.ant-message-error, .ant-notification-notice-error')).toBeVisible({ timeout: 5000 });
  });

  test('响应式设计 - 移动端视图', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that elements are still visible and properly sized on mobile
      await expect(page.locator('.login-card')).toBeVisible();
      await expect(page.locator(SELECTORS.LOGIN.STUDENT_TAB)).toBeVisible();
      await expect(page.locator(SELECTORS.LOGIN.TEACHER_TAB)).toBeVisible();

      // Check form inputs are properly sized
      const idCardInput = page.locator(SELECTORS.LOGIN.ID_CARD_INPUT);
      await page.click(SELECTORS.LOGIN.STUDENT_TAB);
      await expect(idCardInput).toBeVisible();
    }
  });
});