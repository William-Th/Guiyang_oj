import { test, expect } from '@playwright/test';

/**
 * 组卷功能冒烟测试
 * 测试ID: PAP001 - PAP002
 *
 * 快速验证组卷核心功能是否正常工作
 */

// 登录辅助函数
async function loginAsTeacher(page: any) {
  await page.goto('/login');

  // Switch to teacher tab
  await page.click('text=教师入口');
  await page.waitForTimeout(500); // Wait for tab switch animation

  // Use .last() to target the teacher tab's inputs (both tabs have inputs with same placeholder)
  await page.locator('input[placeholder="用户名"]').last().fill('teacher_yy_ps_math');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  // Use .last() to click the teacher tab's submit button
  await page.locator('button[type="submit"]').last().click();

  await page.waitForURL('/', { timeout: 30000 });
}

test.describe('组卷功能 - 冒烟测试', () => {
  test('PAP001 - 教师可以访问组卷页面', async ({ page }) => {
    await loginAsTeacher(page);

    // 导航到活动管理页面 - 菜单项是menuitem角色，不是a标签
    const activityMenu = page.getByRole('menuitem', { name: /活动管理/ });
    await expect(activityMenu).toBeVisible({ timeout: 5000 });
    await activityMenu.click();
    await page.waitForURL(/\/teacher\/activities/);

    // 等待活动列表加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 等待表格数据加载

    // 检查是否有活动数据 - 使用table role选择器
    const noDataCell = page.locator('text=暂无活动数据');
    const hasNoData = await noDataCell.count() > 0;

    if (hasNoData) {
      // 如果没有活动数据，验证页面基本元素存在即可
      console.log('No activity data available - testing page structure only');
      await expect(page.getByRole('columnheader', { name: '活动名称' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '操作' })).toBeVisible();
      await expect(page.getByRole('button', { name: /创建活动/ })).toBeVisible();
      return; // 测试通过 - 页面结构正确
    }

    // 查找第一个活动并点击"查看"按钮进入详情
    const activityRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(activityRows.first()).toBeAttached({ timeout: 5000 });

    const firstRow = activityRows.first();
    const viewButton = firstRow.locator('button:has-text("查看")');
    await viewButton.click();

    // 等待详情页URL变化
    await page.waitForURL(/\/teacher\/activities\/\d+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 等待并点击组卷按钮(use regex to handle potential spaces between characters)
    const paperButton = page.locator('button').filter({ hasText: /组\s*卷/ });
    await expect(paperButton).toBeVisible({ timeout: 10000 });
    await paperButton.click();

    // 验证进入组卷页面
    await page.waitForURL(/\/activities\/\d+\/paper/);

    // 验证页面标题
    await expect(page.locator('.ant-card-head-title')).toContainText('组卷管理');

    // 验证关键元素存在
    await expect(page.locator('h3:has-text("已选题目")')).toBeAttached({ timeout: 10000 });

    // Check if "可用题目" is visible (only shown for editable activities)
    const canEdit = await page.locator('h3:has-text("可用题目")').count() > 0;
    console.log('Can edit:', canEdit);
  });

  test('PAP002 - 教师可以添加题目到活动', async ({ page }) => {
    await loginAsTeacher(page);

    // 导航到组卷页面（假设有活动）- 菜单项是menuitem角色
    const activityMenu = page.getByRole('menuitem', { name: /活动管理/ });
    await expect(activityMenu).toBeVisible({ timeout: 5000 });
    await activityMenu.click();
    await page.waitForURL(/\/teacher\/activities/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 等待表格数据加载

    // 检查是否有活动数据
    const noDataCell = page.locator('text=暂无活动数据');
    const hasNoData = await noDataCell.count() > 0;

    if (hasNoData) {
      console.log('No activity data available - skipping PAP002');
      test.skip(true, '没有活动数据，无法测试添加题目功能');
      return;
    }

    // 进入第一个活动的组卷页面
    const activityRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(activityRows.first()).toBeAttached({ timeout: 5000 });
    const firstRow = activityRows.first();
    const viewButton = firstRow.locator('button:has-text("查看")');
    await viewButton.click();

    // 等待详情页URL变化
    await page.waitForURL(/\/teacher\/activities\/\d+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const paperButton = page.locator('button').filter({ hasText: /组\s*卷/ });
    await expect(paperButton).toBeVisible({ timeout: 10000 });
    await paperButton.click();
    await page.waitForURL(/\/activities\/\d+\/paper/);
    await page.waitForLoadState('networkidle');

    // 获取当前已选题目数量
    const selectedQuestionsTable = page.locator('.ant-table-tbody').first();
    const initialCount = await selectedQuestionsTable.locator('tr[data-row-key]').count();

    // 查找可用题目表格（第二个表格）
    const availableQuestionsTable = page.locator('.ant-table-tbody').nth(1);
    const availableRows = availableQuestionsTable.locator('tr[data-row-key]');
    const availableCount = await availableRows.count();

    if (availableCount > 0) {
      // 点击第一道可用题目的添加按钮
      const firstAvailableRow = availableRows.first();
      const addButton = firstAvailableRow.locator('button:has-text("添加")');

      await addButton.evaluate((button: HTMLElement) => button.click());

      // 等待模态框出现
      await expect(page.locator('.ant-modal:has-text("添加题目")')).toBeVisible();

      // 点击确定
      const confirmButton = page.locator('.ant-modal-footer button:has-text("确定")');
      await confirmButton.click();

      // 等待成功提示
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 });

      // 验证题目已添加（需要等待页面重新加载）
      await page.waitForLoadState('networkidle');
      const newCount = await selectedQuestionsTable.locator('tr[data-row-key]').count();
      expect(newCount).toBe(initialCount + 1);
    }
  });
});
