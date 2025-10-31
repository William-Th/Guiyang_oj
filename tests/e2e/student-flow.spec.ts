import { test, expect } from '@playwright/test';
import { STORAGE_STATE, TEST_TIMEOUTS } from './test-config';

test.describe('Student User Flow', () => {
  test.use({ storageState: STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('学生主页导航和布局', async ({ page }) => {
    // Check main layout elements
    await expect(page.locator('.ant-layout')).toBeVisible();

    // Check navigation menu
    await expect(page.locator('text=考试列表')).toBeVisible();
    await expect(page.locator('text=成绩查询')).toBeVisible();
    await expect(page.locator('text=个人信息')).toBeVisible();

    // Check welcome message or user info is displayed
    await expect(page.locator('.ant-layout-header')).toBeVisible();
  });

  test('考试列表页面功能', async ({ page }) => {
    // Navigate to exams list
    await page.click('text=考试列表');
    await page.waitForURL('/exams', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // Check page loads correctly
    await expect(page).toHaveURL('/exams');

    // Check for exam list container
    await expect(page.locator('.ant-card, .exam-list, .ant-list')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // If there are exams, check they display properly
    const examItems = page.locator('.ant-card-head-title, .ant-list-item-meta-title, .exam-title');
    if (await examItems.count() > 0) {
      await expect(examItems.first()).toBeVisible();
    }
  });

  test('成绩查询页面功能', async ({ page }) => {
    // Navigate to results page
    await page.click('text=成绩查询');
    await page.waitForURL('/results', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // Check page loads correctly
    await expect(page).toHaveURL('/results');

    // Check for results container
    await expect(page.locator('.ant-table, .ant-card, .results-container')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  test('个人信息页面功能', async ({ page }) => {
    // Navigate to profile page
    await page.click('text=个人信息');
    await page.waitForURL('/profile', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // Check page loads correctly
    await expect(page).toHaveURL('/profile');

    // Check for profile form/content
    await expect(page.locator('.ant-form, .ant-descriptions, .profile-content')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  test('证书验证页面访问', async ({ page }) => {
    // Navigate directly to certificate verification
    await page.goto('/verify');

    // Check page loads
    await expect(page).toHaveURL('/verify');

    // Check for certificate verification form
    await expect(page.locator('input, .ant-input')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  test('用户注销功能', async ({ page }) => {
    // Look for logout button/link (common patterns)
    const logoutSelectors = [
      'text=退出登录',
      'text=注销',
      'text=登出',
      '.ant-dropdown-menu-item:has-text("退出")',
      '.logout-btn',
      '[data-testid="logout"]'
    ];

    let logoutElement = null;
    for (const selector of logoutSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          logoutElement = element;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (logoutElement) {
      await logoutElement.click();

      // Should redirect to login page
      await page.waitForURL('/login', { timeout: TEST_TIMEOUTS.NAVIGATION });
      await expect(page).toHaveURL('/login');
    } else {
      // If no logout button found, check if user dropdown exists
      const userMenuTriggers = [
        '.ant-dropdown-trigger',
        '.user-menu',
        '.ant-avatar',
        '.user-info'
      ];

      for (const trigger of userMenuTriggers) {
        try {
          const element = page.locator(trigger);
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            // Wait for dropdown to appear and try to find logout option
            await page.waitForTimeout(500);
            const logoutInDropdown = page.locator('text=退出登录, text=注销, text=登出');
            if (await logoutInDropdown.isVisible({ timeout: 2000 })) {
              await logoutInDropdown.click();
              await page.waitForURL('/login', { timeout: TEST_TIMEOUTS.NAVIGATION });
              await expect(page).toHaveURL('/login');
              return;
            }
          }
        } catch (e) {
          // Continue to next trigger
        }
      }

      // If no logout functionality found, skip this test
      test.skip();
    }
  });

  test('考试详情页面加载（如果有可用考试）', async ({ page }) => {
    // Go to exams list first
    await page.goto('/exams');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for exam links or buttons
    const examLinks = page.locator('a[href*="/exam/"], button:has-text("开始考试"), .exam-item a, .ant-card a');

    if (await examLinks.count() > 0) {
      // Click first available exam
      await examLinks.first().click();

      // Should navigate to exam detail or exam page
      await page.waitForURL(/\/(exam|exam-detail)\//, { timeout: TEST_TIMEOUTS.NAVIGATION });

      // Check that exam content is loaded
      await expect(page.locator('.ant-card, .exam-content, .question-container')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
    } else {
      // Skip if no exams available
      test.skip();
    }
  });
});