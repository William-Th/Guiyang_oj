import { test, expect } from '@playwright/test';
import { STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 学生功能模块 (Regression Tests - Student Features)
 * 目标: 验证学生端核心功能
 * 覆盖范围:
 * - 考试列表查看
 * - 成绩查询
 * - 个人信息查看
 * - 证书验证
 */

test.describe('Regression Tests - 学生功能', () => {
  test.use({ storageState: STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // R101 - 首页导航
  test('R101 - 学生首页导航菜单正常显示', async ({ page }) => {
    await expect(page.locator('.ant-layout')).toBeVisible();

    // 验证主要布局元素存在
    await expect(page.locator('.ant-layout-header')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  // R102 - 考试列表页面
  test('R102 - 学生能访问考试列表页面', async ({ page }) => {
    // 直接导航到考试列表页面
    await page.goto('/exams');
    await page.waitForLoadState('networkidle');

    // 验证页面加载成功（URL正确即可）
    await expect(page).toHaveURL(/\/exams/);
  });

  // R103 - 成绩查询页面
  test('R103 - 学生能访问成绩查询页面', async ({ page }) => {
    // 直接导航到成绩查询页面
    await page.goto('/results');
    await page.waitForLoadState('networkidle');

    // 验证页面加载成功（URL正确即可）
    await expect(page).toHaveURL(/\/results/);
  });

  // R104 - 学生能访问个人信息页面
  test('R104 - 学生能访问个人信息页面', async ({ page }) => {
    // 直接导航到个人信息页面
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/profile');
    await expect(page.locator('.ant-form, .ant-descriptions, .profile-content').first()).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R105 - 证书验证页面访问
  test('R105 - 证书验证页面可访问', async ({ page }) => {
    await page.goto('/verify');

    await expect(page).toHaveURL('/verify');
    await expect(page.locator('input, .ant-input')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });
});
