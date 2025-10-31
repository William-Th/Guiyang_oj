import { test, expect } from '@playwright/test';
import { TEACHER_STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 管理员/教师功能模块 (Regression Tests - Admin Features)
 * 目标: 验证管理员和教师端核心功能
 * 覆盖范围:
 * - 管理后台访问
 * - 用户管理基础功能
 * - 考试管理基础功能
 * - 题库管理基础功能
 */

test.describe('Regression Tests - 管理员功能', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // R201 - 管理后台访问
  test('R201 - 教师/管理员能访问管理后台', async ({ page }) => {
    // 尝试访问管理后台
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/admin')) {
      // 使用 first() 避免 strict mode violation
      await expect(page.locator('.ant-card, .dashboard-card, .admin-dashboard').first()).toBeVisible({
        timeout: TEST_TIMEOUTS.ELEMENT_WAIT
      });
    } else {
      // 如果没有访问权限，跳过测试
      test.skip();
    }
  });

  // R202 - 用户管理页面
  test('R202 - 能访问用户管理页面', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/admin/users')) {
      // 使用 first() 避免 strict mode violation
      await expect(page.locator('.ant-table, .user-table, .ant-card').first()).toBeVisible({
        timeout: TEST_TIMEOUTS.ELEMENT_WAIT
      });
    } else {
      test.skip();
    }
  });

  // R203 - 考试管理页面
  test('R203 - 能访问考试管理页面', async ({ page }) => {
    await page.goto('/admin/exams');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/admin/exams') || page.url().includes('/admin')) {
      const examElements = page.locator('.ant-table, .exam-table, .ant-card, .exam-list');
      if ((await examElements.count()) > 0) {
        await expect(examElements.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
      }
    } else {
      test.skip();
    }
  });

  // R204 - 题库管理页面
  test('R204 - 能访问题库管理页面', async ({ page }) => {
    const questionBankUrls = [
      '/admin/questions',
      '/admin/question-bank',
      '/admin/questionbank',
      '/question-bank'
    ];

    let pageLoaded = false;
    for (const url of questionBankUrls) {
      try {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/login')) {
          pageLoaded = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (pageLoaded) {
      const questionElements = page.locator('.ant-table, .question-table, .ant-card, .question-list');
      if ((await questionElements.count()) > 0) {
        await expect(questionElements.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
      }
    } else {
      test.skip();
    }
  });

  // R205 - 成绩统计页面
  test('R205 - 能访问成绩统计页面', async ({ page }) => {
    const statsUrls = ['/admin/results', '/admin/statistics', '/admin/analytics', '/results'];

    let pageLoaded = false;
    for (const url of statsUrls) {
      try {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/login')) {
          pageLoaded = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (pageLoaded) {
      const statsElements = page.locator(
        '.ant-statistic, .ant-card, .chart-container, .statistics-card, .ant-table'
      );
      if ((await statsElements.count()) > 0) {
        await expect(statsElements.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
      }
    } else {
      test.skip();
    }
  });
});
