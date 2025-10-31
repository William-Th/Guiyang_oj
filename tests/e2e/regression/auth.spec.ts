import { test, expect } from '@playwright/test';
import { TEST_CONFIG, SELECTORS, TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 认证模块 (Regression Tests - Authentication)
 * 目标: 验证用户认证相关的核心功能
 * 覆盖范围:
 * - 登录功能（正常、异常场景）
 * - 登出功能
 * - 权限验证
 */

test.describe('Regression Tests - 认证模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // R001 - 学生登录正常流程
  test('R001 - 学生使用正确凭证登录成功', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, TEST_CONFIG.STUDENT.idCard);
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, TEST_CONFIG.STUDENT.password);
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });
    await expect(page).toHaveURL('/');
  });

  // R002 - 学生登录异常场景
  test('R002 - 学生使用错误密码登录失败', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, TEST_CONFIG.STUDENT.idCard);
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, 'wrongpassword123');
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // 应该停留在登录页面
    await expect(page).toHaveURL('/login');

    // 应显示错误消息
    await expect(page.locator('.ant-message-error, .ant-notification-notice-error')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R003 - 身份证号格式验证
  test('R003 - 学生使用无效身份证号格式', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);
    await page.fill(SELECTORS.LOGIN.ID_CARD_INPUT, '123456');
    await page.fill(SELECTORS.LOGIN.PASSWORD_INPUT, TEST_CONFIG.STUDENT.password);
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // 应显示格式验证错误
    await expect(page.locator('text=请输入正确的身份证号')).toBeVisible();
  });

  // R004 - 空字段验证
  test('R004 - 登录表单空字段验证', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);
    await page.click(SELECTORS.LOGIN.SUBMIT_BUTTON);

    // 应显示必填字段错误
    await expect(page.locator('text=请输入身份证号')).toBeVisible();
  });

  // R005 - 教师登录正常流程
  test('R005 - 教师使用正确凭证登录成功', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await page.waitForTimeout(500);
    await page.locator(SELECTORS.LOGIN.USERNAME_INPUT).fill(TEST_CONFIG.TEACHER.username);
    await page.locator(SELECTORS.LOGIN.PASSWORD_INPUT).last().fill(TEST_CONFIG.TEACHER.password);
    await page.locator(SELECTORS.LOGIN.SUBMIT_BUTTON).last().click();

    await page.waitForURL('/', { timeout: TEST_TIMEOUTS.NAVIGATION });
    await expect(page).toHaveURL('/');
  });

  // R006 - 教师登录异常场景
  test('R006 - 教师使用错误凭证登录失败', async ({ page }) => {
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await page.waitForTimeout(500);
    await page.locator(SELECTORS.LOGIN.USERNAME_INPUT).fill(TEST_CONFIG.TEACHER.username);
    await page.locator(SELECTORS.LOGIN.PASSWORD_INPUT).last().fill('wrongpassword');
    await page.locator(SELECTORS.LOGIN.SUBMIT_BUTTON).last().click();

    await expect(page).toHaveURL('/login');
    await expect(page.locator('.ant-message-error, .ant-notification-notice-error')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R007 - Tab切换功能
  test('R007 - 学生和教师入口切换正常', async ({ page }) => {
    // 默认在学生入口
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);
    await expect(page.locator(SELECTORS.LOGIN.ID_CARD_INPUT)).toBeVisible();

    // 切换到教师入口
    await page.click(SELECTORS.LOGIN.TEACHER_TAB);
    await expect(page.locator(SELECTORS.LOGIN.USERNAME_INPUT)).toBeVisible();

    // 切回学生入口
    await page.click(SELECTORS.LOGIN.STUDENT_TAB);
    await expect(page.locator(SELECTORS.LOGIN.ID_CARD_INPUT)).toBeVisible();
  });
});
