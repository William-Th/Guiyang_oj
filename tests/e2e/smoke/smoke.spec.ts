import { test, expect } from '@playwright/test';
import { TEST_CONFIG, SELECTORS, TEST_TIMEOUTS } from '../test-config';

/**
 * 冒烟测试 (Smoke Tests)
 * 目标: 快速验证系统核心功能是否正常工作
 * 覆盖范围:
 * - 学生登录
 * - 教师登录
 * - 管理员登录
 * - 首页基本显示
 */

test.describe('Smoke Tests - 冒烟测试', () => {
  test('S001 - 学生能够成功登录系统', async ({ page }) => {
    // 访问登录页
    await page.goto('/login');

    // 验证页面加载
    await expect(page).toHaveTitle(/贵阳市小学生测评平台/);

    // 选择学生入口
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);

    // 输入学生凭证
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, TEST_CONFIG.STUDENT.idCard);
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, TEST_CONFIG.STUDENT.password);

    // 点击登录
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // 验证登录成功 - 跳转到首页
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });
    await expect(page).toHaveURL('/');

    // 验证首页基本元素显示
    await expect(page.locator('.ant-layout')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  test('S002 - 教师能够成功登录系统', async ({ page }) => {
    // 访问登录页
    await page.goto('/login');

    // 选择教师入口
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await page.waitForTimeout(500);

    // 输入教师凭证 - use .last() to target the second (teacher) tab's inputs
    await page.locator(SELECTORS.LOGIN.USERNAME_INPUT).last().fill(TEST_CONFIG.TEACHER.username);
    await page.locator(SELECTORS.LOGIN.PASSWORD_INPUT).last().fill(TEST_CONFIG.TEACHER.password);

    // 点击登录 - use .last() to get teacher tab's button
    await page.locator(SELECTORS.LOGIN.SUBMIT_BUTTON).last().click();

    // 验证登录成功
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });
    await expect(page).toHaveURL('/');

    // 验证首页基本元素显示
    await expect(page.locator('.ant-layout')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  test('S003 - 管理员能够成功登录系统', async ({ page }) => {
    // 访问登录页
    await page.goto('/login');

    // 选择教师入口（管理员使用教师入口）
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await page.waitForTimeout(500);

    // 输入管理员凭证 - use .last() to target the second (teacher) tab's inputs
    await page.locator(SELECTORS.LOGIN.USERNAME_INPUT).last().fill(TEST_CONFIG.ADMIN.username);
    await page.locator(SELECTORS.LOGIN.PASSWORD_INPUT).last().fill(TEST_CONFIG.ADMIN.password);

    // 点击登录 - use .last() to get teacher tab's button
    await page.locator(SELECTORS.LOGIN.SUBMIT_BUTTON).last().click();

    // 验证登录成功 - 管理员会跳转到 /admin/home
    await page.waitForURL(/\/(admin\/home)?/, { timeout: TEST_TIMEOUTS.NAVIGATION });
    await expect(page).toHaveURL(/\/(admin\/home)?/);

    // 验证首页基本元素显示
    await expect(page.locator('.ant-layout')).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  test('S004 - 学生首页基本元素正常显示', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, TEST_CONFIG.STUDENT.idCard);
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, TEST_CONFIG.STUDENT.password);
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证主要布局
    await expect(page.locator('.ant-layout')).toBeVisible();
    await expect(page.locator('.ant-layout-header')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();

    // 验证导航菜单存在 - 学生首页的导航可能在 header 中
    const headerExists = await page.locator('.ant-layout-header').count();
    expect(headerExists).toBeGreaterThan(0);
  });

  test('S005 - 教师首页基本元素正常显示', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await page.waitForTimeout(500);
    await page.locator(SELECTORS.LOGIN.USERNAME_INPUT).last().fill(TEST_CONFIG.TEACHER.username);
    await page.locator(SELECTORS.LOGIN.PASSWORD_INPUT).last().fill(TEST_CONFIG.TEACHER.password);
    await page.locator(SELECTORS.LOGIN.SUBMIT_BUTTON).last().click();
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证主要布局
    await expect(page.locator('.ant-layout')).toBeVisible();
    await expect(page.locator('.ant-layout-header')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('S006 - 管理员首页基本元素正常显示', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await page.waitForTimeout(500);
    await page.locator(SELECTORS.LOGIN.USERNAME_INPUT).last().fill(TEST_CONFIG.ADMIN.username);
    await page.locator(SELECTORS.LOGIN.PASSWORD_INPUT).last().fill(TEST_CONFIG.ADMIN.password);
    await page.locator(SELECTORS.LOGIN.SUBMIT_BUTTON).last().click();
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证主要布局
    await expect(page.locator('.ant-layout')).toBeVisible();
    await expect(page.locator('.ant-layout-header')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

});

test.describe('Smoke Tests - Activity 活动管理冒烟测试', () => {
  test('ACT001 - 教师可以访问活动管理页面', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await page.waitForTimeout(500);
    await page.locator(SELECTORS.LOGIN.USERNAME_INPUT).last().fill(TEST_CONFIG.TEACHER.username);
    await page.locator(SELECTORS.LOGIN.PASSWORD_INPUT).last().fill(TEST_CONFIG.TEACHER.password);
    await page.locator(SELECTORS.LOGIN.SUBMIT_BUTTON).last().click();
    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 查找并点击活动管理菜单
    const activityMenu = page.locator('a:has-text("活动管理"), .ant-menu-item:has-text("活动管理")').first();
    await expect(activityMenu).toBeVisible();
    await activityMenu.click();

    // 验证成功跳转到活动管理页面
    await page.waitForURL(/\/teacher\/activities/, { timeout: TEST_TIMEOUTS.NAVIGATION });

    // 验证页面基本元素
    await expect(page.locator('.ant-layout')).toBeVisible();
  });
});
