import { test, expect } from '@playwright/test';
import { TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 未登录用户重定向 (Regression Tests - Unauthenticated Redirect)
 * 目标: 验证未登录用户访问受保护页面时被正确重定向到登录页
 * 覆盖Bug:
 * - Bug #12: 主页默认打开不是登录页面而是用户页面
 * - Bug #14: 主页默认不是登录页面而是空白用户页
 */

test.describe('Regression Tests - 未登录用户重定向', () => {
  // 确保测试在未登录状态下运行
  test.use({ storageState: { cookies: [], origins: [] } });

  // BUG012 - 未登录用户访问根路径被重定向到登录页
  test('BUG012 - 未登录用户访问根路径应重定向到登录页', async ({ page }) => {
    // 访问根路径
    await page.goto('/');

    // 等待重定向完成
    await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证已重定向到登录页
    await expect(page).toHaveURL(/\/login/);

    // 验证登录页面元素可见
    await expect(page.locator('text=学生入口')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  // BUG014 - 未登录用户访问主页被重定向到登录页
  test('BUG014 - 未登录用户访问主页应重定向到登录页', async ({ page }) => {
    // 直接访问主页
    await page.goto('/');

    // 等待重定向完成
    await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证已重定向到登录页
    await expect(page).toHaveURL(/\/login/);

    // 验证登录表单可见
    await expect(page.locator('input[placeholder="密码"]')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  // BUG012/14 - 未登录用户访问教师页面被重定向
  test('BUG012/14 - 未登录用户访问教师页面应重定向到登录页', async ({ page }) => {
    // 尝试访问教师页面
    await page.goto('/teacher/question-bank');

    // 等待重定向完成
    await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证已重定向到登录页
    await expect(page).toHaveURL(/\/login/);
  });

  // BUG012/14 - 未登录用户访问管理员页面被重定向
  test('BUG012/14 - 未登录用户访问管理员页面应重定向到登录页', async ({ page }) => {
    // 尝试访问管理员页面
    await page.goto('/admin/home');

    // 等待重定向完成
    await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证已重定向到登录页
    await expect(page).toHaveURL(/\/login/);
  });

  // BUG012/14 - 未登录用户访问学生页面被重定向
  test('BUG012/14 - 未登录用户访问学生页面应重定向到登录页', async ({ page }) => {
    // 尝试访问学生页面
    await page.goto('/student/activities');

    // 等待重定向完成
    await page.waitForURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证已重定向到登录页
    await expect(page).toHaveURL(/\/login/);
  });
});
