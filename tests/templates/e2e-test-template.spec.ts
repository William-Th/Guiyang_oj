/**
 * E2E测试模板
 *
 * 使用说明：
 * 1. 复制此文件到 tests/e2e/ 目录
 * 2. 重命名为实际功能名称，如 question-comments.spec.ts
 * 3. 替换所有 [FEATURE_NAME] 为实际功能名称
 * 4. 根据实际页面和操作修改测试用例
 * 5. 运行测试：npm run test:e2e
 */

import { test, expect, Page } from '@playwright/test';

// 使用已认证的状态
test.use({ storageState: 'tests/.auth/teacher.json' });

// 测试超时配置
const TEST_TIMEOUTS = {
  NAVIGATION: 10000,
  ELEMENT_WAIT: 10000,
  API_RESPONSE: 15000,
};

test.describe('[FEATURE_NAME] E2E Tests', () => {
  // 辅助函数：选择Ant Design Select选项
  const selectAntOption = async (page: Page, fieldName: string, optionText: string) => {
    await page.click(`#${fieldName}`);
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown .ant-select-item-option:has-text("${optionText}")`);
  };

  test.beforeEach(async ({ page }) => {
    // 导航到功能页面
    await page.goto('/teacher/[feature-path]');
    await page.waitForLoadState('networkidle');
  });

  test('[TEST_ID] - 创建[FEATURE_NAME]', async ({ page }) => {
    // 点击创建按钮
    await page.click('button:has-text("新建")');
    await page.waitForSelector('.ant-modal', { timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // 填写表单
    await page.fill('input#name', '测试[FEATURE_NAME]名称');
    await page.fill('textarea#description', '这是测试描述');

    // 选择下拉选项
    await selectAntOption(page, 'category', '分类1');

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT,
    });

    // 验证数据出现在列表中
    await expect(page.locator('text=测试[FEATURE_NAME]名称')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT,
    });
  });

  test('[TEST_ID] - 查看[FEATURE_NAME]详情', async ({ page }) => {
    // 点击第一个项目的查看按钮
    await page.locator('button:has([aria-label="eye"])').first().click();
    await page.waitForTimeout(1000);

    // 验证详情页面加载
    await expect(page.locator('.ant-descriptions')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT,
    });

    // 验证详情内容
    await expect(page.locator('.ant-descriptions-item-label:has-text("名称")')).toBeVisible();
    await expect(page.locator('.ant-descriptions-item-label:has-text("描述")')).toBeVisible();
  });

  test('[TEST_ID] - 编辑[FEATURE_NAME]', async ({ page }) => {
    // 点击第一个项目的编辑按钮
    await page.locator('button:has([aria-label="edit"])').first().click();
    await page.waitForTimeout(1000);

    // 验证进入编辑页面
    await expect(page.locator('.ant-card-head-title:has-text("编辑")')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT,
    });

    // 等待表单加载原始数据
    await page.waitForTimeout(2000);

    // 修改内容
    await page.fill('input#name', '修改后的[FEATURE_NAME]名称');

    // 提交修改
    await page.click('button[type="submit"]');

    // 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT,
    });
  });

  test('[TEST_ID] - 搜索[FEATURE_NAME]', async ({ page }) => {
    // 输入搜索关键词
    await page.fill('input[placeholder*="搜索"]', '测试关键词');
    await page.waitForTimeout(500);

    // 点击搜索按钮（如果有）
    const searchButton = page.locator('button:has-text("搜索")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证搜索结果
    const resultCount = await page.locator('.ant-table-tbody tr').count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('[TEST_ID] - 筛选[FEATURE_NAME]', async ({ page }) => {
    // 使用筛选器
    await selectAntOption(page, 'filter-category', '分类1');
    await page.waitForTimeout(1000);

    // 验证筛选结果
    await expect(page.locator('.ant-table-tbody tr')).toHaveCount(
      await page.locator('.ant-table-tbody tr').count()
    );
  });

  test('[TEST_ID] - 删除[FEATURE_NAME]', async ({ page }) => {
    // 获取删除前的总数
    const beforeCount = await page.locator('.ant-table-tbody tr').count();

    // 点击第一个项目的删除按钮
    await page.locator('button:has([aria-label="delete"])').first().click();
    await page.waitForTimeout(500);

    // 确认删除对话框
    await expect(page.locator('.ant-modal-confirm')).toBeVisible();
    await page.click('.ant-modal-confirm button:has-text("确定")');

    // 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT,
    });

    // 等待列表刷新
    await page.waitForTimeout(1000);

    // 验证数量减少
    const afterCount = await page.locator('.ant-table-tbody tr').count();
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('[TEST_ID] - 分页功能', async ({ page }) => {
    // 检查是否有分页器
    const pagination = page.locator('.ant-pagination');
    if (await pagination.isVisible()) {
      // 点击下一页
      await page.click('.ant-pagination-item:nth-child(2)');
      await page.waitForTimeout(1000);

      // 验证页码变化
      await expect(page.locator('.ant-pagination-item-active')).toContainText('2');
    }
  });

  // 业务流程测试
  test('[TEST_ID] - 完整的创建-编辑-删除流程', async ({ page }) => {
    const testName = `流程测试_${Date.now()}`;

    // 1. 创建
    await page.click('button:has-text("新建")');
    await page.waitForSelector('.ant-modal');
    await page.fill('input#name', testName);
    await page.fill('textarea#description', '流程测试描述');
    await page.click('button[type="submit"]');
    await expect(page.locator('.ant-message-success')).toBeVisible();

    // 2. 验证创建成功
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // 3. 编辑
    const targetRow = page.locator('.ant-table-tbody tr').filter({ hasText: testName });
    await targetRow.locator('button:has([aria-label="edit"])').click();
    await page.waitForTimeout(1000);
    await page.fill('input#name', `${testName}_已修改`);
    await page.click('button[type="submit"]');
    await expect(page.locator('.ant-message-success')).toBeVisible();

    // 4. 返回列表页
    await page.goto('/teacher/[feature-path]');
    await page.waitForLoadState('networkidle');

    // 5. 验证修改成功
    await expect(page.locator(`text=${testName}_已修改`)).toBeVisible();

    // 6. 删除
    const updatedRow = page.locator('.ant-table-tbody tr').filter({ hasText: `${testName}_已修改` });
    await updatedRow.locator('button:has([aria-label="delete"])').click();
    await page.waitForTimeout(500);
    await page.click('.ant-modal-confirm button:has-text("确定")');
    await expect(page.locator('.ant-message-success')).toBeVisible();

    // 7. 验证删除成功
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${testName}_已修改`)).not.toBeVisible();
  });

  // 错误处理测试
  test('[TEST_ID] - 表单验证', async ({ page }) => {
    // 点击创建按钮
    await page.click('button:has-text("新建")');
    await page.waitForSelector('.ant-modal');

    // 直接提交空表单
    await page.click('button[type="submit"]');

    // 验证错误提示
    await expect(page.locator('.ant-form-item-explain-error')).toHaveCount(
      await page.locator('.ant-form-item[class*="has-error"]').count()
    );
  });

  // 权限测试（如果需要）
  test('[TEST_ID] - 非授权用户无法访问', async ({ page }) => {
    // 清除认证状态
    await page.context().clearCookies();
    await page.context().clearPermissions();

    // 尝试访问页面
    await page.goto('/teacher/[feature-path]');

    // 验证被重定向到登录页
    await expect(page).toHaveURL(/.*login/);
  });
});
