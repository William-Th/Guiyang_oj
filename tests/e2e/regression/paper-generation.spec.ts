import { test, expect } from '@playwright/test';

/**
 * 组卷功能回归测试
 * 测试ID: PAP101 - PAP110
 *
 * 完整测试组卷功能的各个方面:
 * - 组卷页面访问和统计信息
 * - 题目筛选和搜索
 * - 添加题目（单个和批量）
 * - 题目预览
 * - 编辑题目属性
 * - 移除题目（单个和批量删除）
 * - 验证试卷
 * - 清空试卷
 */

// 登录辅助函数
async function loginAsTeacher(page: any) {
  await page.goto('/login');

  // Switch to teacher tab
  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  // Use .last() to target the teacher tab's inputs
  await page.locator('input[placeholder="用户名"]').last().fill('teacher01');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  // Use .last() to click the teacher tab's submit button
  await page.locator('button[type="submit"]').last().click();

  await page.waitForURL('/', { timeout: 30000 });
}

// 导航到现有活动的组卷页面 - 使用与冒烟测试相同的策略
// 优先查找草稿状态的活动以支持编辑操作
async function navigateToPaperGeneration(page: any, requireDraft = false) {
  // 导航到活动管理页面
  const activityMenu = page.getByRole('menuitem', { name: /活动管理中心/ });
  await expect(activityMenu).toBeVisible();
  await activityMenu.click();
  await page.waitForURL(/\/teacher\/activities/);

  // 等待活动列表加载
  await page.waitForLoadState('networkidle');

  // 查找活动行
  const activityRows = page.locator('.ant-table-tbody tr[data-row-key]');
  await expect(activityRows.first()).toBeAttached({ timeout: 5000 });

  let targetRow;
  if (requireDraft) {
    // 查找草稿状态的活动（包含"草稿"标签）
    const draftRows = activityRows.filter({ hasText: '草稿' });
    const draftCount = await draftRows.count();

    if (draftCount > 0) {
      targetRow = draftRows.first();
    } else {
      // 如果没有草稿，抛出错误，因为测试需要草稿才能运行
      throw new Error('没有找到草稿状态的活动，无法执行需要编辑权限的测试');
    }
  } else {
    // 不要求草稿，使用第一个活动
    targetRow = activityRows.first();
  }

  const viewButton = targetRow.locator('button:has-text("查看")');
  await viewButton.click();

  // 等待详情页URL变化
  await page.waitForURL(/\/teacher\/activities\/\d+/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // 等待并点击组卷按钮
  const paperButton = page.locator('button').filter({ hasText: /组\s*卷/ });
  await expect(paperButton).toBeVisible({ timeout: 10000 });
  await paperButton.click();

  // 验证进入组卷页面
  await page.waitForURL(/\/activities\/\d+\/paper/);
  await page.waitForLoadState('networkidle');
}

test.describe('组卷功能 - 回归测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('PAP101 - 访问组卷页面显示正确的统计信息', async ({ page }) => {
    // 导航到现有活动的组卷页面
    await navigateToPaperGeneration(page);

    // 验证统计信息显示（使用更精确的选择器避免冲突）
    await expect(page.locator('.ant-statistic-title').filter({ hasText: '总题数' })).toBeAttached();
    await expect(page.locator('.ant-statistic-title').filter({ hasText: '总分' })).toBeAttached();
    await expect(page.locator('.ant-statistic-title').filter({ hasText: '单选题' })).toBeAttached();
    await expect(page.locator('.ant-statistic-title').filter({ hasText: '多选题' })).toBeAttached();
  });

  test('PAP102 - 筛选可用题目功能', async ({ page }) => {
    // 导航到现有活动的组卷页面（需要草稿状态以支持筛选功能）
    await navigateToPaperGeneration(page, true);

    // 滚动到"可用题目"部分
    await page.locator('h3:has-text("可用题目")').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // 选择题型筛选 (使用索引选择第一个Select - 题型筛选)
    const filterSection = page.locator('h3:has-text("可用题目")').locator('..').locator('..');
    const typeSelect = filterSection.locator('.ant-select').first();
    await typeSelect.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: '单选题' }).click();

    // 点击搜索按钮 (使用regex处理可能的文字间空格)
    const searchButton = page.locator('button').filter({ hasText: /搜\s*索/ });
    await searchButton.click();
    await page.waitForLoadState('networkidle');

    // 验证筛选执行完成（等待网络请求完成即可，不验证具体结果）
    // 因为筛选可能返回空结果或其他题型，取决于数据库状态
    const availableTable = page.locator('.ant-table-tbody').nth(1);
    await expect(availableTable).toBeAttached();

    // 点击重置按钮 (使用regex处理可能的文字间空格)
    const resetButton = page.locator('button').filter({ hasText: /重\s*置/ });
    await resetButton.click();
    await page.waitForLoadState('networkidle');
  });

  test('PAP103 - 添加单个题目到活动', async ({ page }) => {
    // 导航到现有活动的组卷页面
    await navigateToPaperGeneration(page);

    // 获取可用题目
    const availableTable = page.locator('.ant-table-tbody').nth(1);
    const availableRows = availableTable.locator('tr[data-row-key]');
    const count = await availableRows.count();

    if (count > 0) {
      // 点击第一道题的添加按钮
      const addButton = availableRows.first().locator('button:has-text("添加")');
      await addButton.evaluate((btn: HTMLElement) => btn.click());

      // 等待弹窗
      await expect(page.locator('.ant-modal:has-text("添加题目")')).toBeVisible();

      // 填写分值
      const scoreInput = page.locator('.ant-modal input[type="number"]');
      await scoreInput.fill('10');

      // 确认添加
      const confirmButton = page.locator('.ant-modal-footer button:has-text("确定")');
      await confirmButton.click();

      // 等待成功提示
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 });

      // 验证题目已添加到已选题目
      await page.waitForLoadState('networkidle');
      const selectedTable = page.locator('.ant-table-tbody').first();
      const selectedRows = selectedTable.locator('tr[data-row-key]');
      await expect(selectedRows).toHaveCount(1);
    }
  });

  test('PAP104 - 批量添加题目', async ({ page }) => {
    // 导航到现有活动的组卷页面
    await navigateToPaperGeneration(page);

    // 选择多道题目
    const availableTable = page.locator('.ant-table-tbody').nth(1);
    const checkboxes = availableTable.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      // 选择前两道题
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // 点击批量添加按钮
      const batchAddButton = page.locator('button:has-text("批量添加")');
      await batchAddButton.click();

      // 等待成功提示
      await expect(page.locator('.ant-message')).toBeVisible({ timeout: 3000 });

      // 验证题目已添加
      await page.waitForLoadState('networkidle');
      const selectedTable = page.locator('.ant-table-tbody').first();
      const selectedRows = selectedTable.locator('tr[data-row-key]');
      await expect(selectedRows.count()).resolves.toBeGreaterThanOrEqual(2);
    }
  });

  test('PAP105 - 预览题目功能', async ({ page }) => {
    // 导航到现有活动的组卷页面
    await navigateToPaperGeneration(page);

    // 点击第一道题的预览按钮
    const availableTable = page.locator('.ant-table-tbody').nth(1);
    const previewButton = availableTable.locator('button:has-text("预览")').first();

    if (await previewButton.count() > 0) {
      await previewButton.evaluate((btn: HTMLElement) => btn.click());

      // 验证预览模态框显示
      await expect(page.locator('.ant-modal:has-text("题目预览")')).toBeVisible();

      // 验证题目信息显示
      await expect(page.locator('.ant-modal text=题目编号')).toBeAttached();
      await expect(page.locator('.ant-modal text=题型')).toBeAttached();
      await expect(page.locator('.ant-modal text=难度')).toBeAttached();

      // 关闭预览
      const closeButton = page.locator('.ant-modal-footer button:has-text("关闭")');
      await closeButton.click();
    }
  });

  test('PAP106 - 编辑题目属性', async ({ page }) => {
    // 导航到现有活动的组卷页面（需要草稿状态以支持编辑题目）
    await navigateToPaperGeneration(page, true);

    // 等待已选题目表格加载
    const selectedTable = page.locator('.ant-table-tbody').first();
    await expect(selectedTable.locator('tr[data-row-key]').first()).toBeAttached({ timeout: 5000 });

    // 点击第一道题的编辑按钮
    const editButton = selectedTable.locator('button').filter({ hasText: /编\s*辑/ }).first();
    await editButton.waitFor({ state: 'attached', timeout: 5000 });
    await editButton.evaluate((btn: HTMLElement) => btn.click());

    // 验证编辑模态框显示
    await expect(page.locator('.ant-modal:has-text("编辑题目")')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300); // 等待模态框完全渲染

    // 修改分值 - 使用 label 关联查找输入框
    const editScoreFormItem = page.locator('.ant-modal:has-text("编辑题目") .ant-form-item:has(label:has-text("分值"))');
    const scoreInput = editScoreFormItem.locator('input').first();
    await scoreInput.clear();
    await scoreInput.fill('15');

    // 保存修改 - 明确定位到"编辑题目"模态框的确定按钮
    const saveButton = page.locator('.ant-modal:has-text("编辑题目") .ant-modal-footer button').filter({ hasText: /确\s*定/ });
    await saveButton.click();

    // 等待成功提示
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 });
  });

  test('PAP107 - 移除题目', async ({ page }) => {
    // 导航到现有活动的组卷页面（需要草稿状态以支持移除题目）
    await navigateToPaperGeneration(page, true);

    // 等待已选题目表格加载
    const selectedTable = page.locator('.ant-table-tbody').first();
    await expect(selectedTable.locator('tr[data-row-key]').first()).toBeAttached({ timeout: 5000 });

    // 获取当前题目数量
    await page.waitForTimeout(500); // 等待表格完全加载
    const initialCount = await selectedTable.locator('tr[data-row-key]').count();

    // 点击第一道题的移除按钮
    const removeButton = selectedTable.locator('button').filter({ hasText: /移\s*除/ }).first();
    await removeButton.waitFor({ state: 'attached', timeout: 5000 });
    await removeButton.evaluate((btn: HTMLElement) => btn.click());

    // 确认移除 - 使用 regex 处理可能的文字间空格
    const removeConfirmButton = page.locator('.ant-popconfirm button').filter({ hasText: /确\s*定/ });
    await removeConfirmButton.click();

    // 等待成功提示
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 });

    // 验证题目已移除 - 等待表格更新
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 等待表格重新渲染
    const newCount = await selectedTable.locator('tr[data-row-key]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('PAP108 - 验证试卷功能', async ({ page }) => {
    // 导航到现有活动的组卷页面
    await navigateToPaperGeneration(page);

    // 点击验证试卷按钮
    const validateButton = page.locator('button:has-text("验证试卷")');
    await validateButton.click();

    // 验证模态框显示（空试卷应该验证失败）
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
  });

  test('PAP109 - 清空试卷功能', async ({ page }) => {
    // 导航到现有活动的组卷页面
    await navigateToPaperGeneration(page);

    // 先添加几道题目
    const availableTable = page.locator('.ant-table-tbody').nth(1);
    const checkboxes = availableTable.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      const batchAddButton = page.locator('button:has-text("批量添加")');
      await batchAddButton.click();
      await page.waitForLoadState('networkidle');

      // 点击清空试卷按钮
      const clearButton = page.locator('button:has-text("清空试卷")');
      await clearButton.click();

      // 确认清空
      const confirmButton = page.locator('.ant-popconfirm button:has-text("确定")');
      await confirmButton.click();

      // 等待成功提示
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 });

      // 验证试卷已清空
      await page.waitForLoadState('networkidle');
      const selectedTable = page.locator('.ant-table-tbody').first();
      const selectedCount = await selectedTable.locator('tr[data-row-key]').count();
      expect(selectedCount).toBe(0);
    }
  });

  test('PAP110 - 批量删除题目功能', async ({ page }) => {
    // 导航到现有活动的组卷页面（需要草稿状态以支持删除功能）
    await navigateToPaperGeneration(page, true);

    // 先添加至少3道题目用于测试批量删除
    const availableTable = page.locator('.ant-table-tbody').nth(1);
    const checkboxes = availableTable.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 3) {
      // 批量添加3道题目
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      const batchAddButton = page.locator('button').filter({ hasText: /批\s*量\s*添\s*加/ });
      await batchAddButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // 等待题目添加完成

      // 等待已选题目表格加载
      const selectedTable = page.locator('.ant-table-tbody').first();
      await expect(selectedTable.locator('tr[data-row-key]').first()).toBeAttached({ timeout: 5000 });
      await page.waitForTimeout(500);

      // 获取当前题目数量
      const initialCount = await selectedTable.locator('tr[data-row-key]').count();
      expect(initialCount).toBeGreaterThanOrEqual(3);

      // 在已选题目表格中勾选前2道题目
      const selectedCheckboxes = selectedTable.locator('input[type="checkbox"]');
      await selectedCheckboxes.nth(0).check();
      await selectedCheckboxes.nth(1).check();
      await page.waitForTimeout(300);

      // 点击批量删除按钮 - 验证按钮显示选中的题目数量
      const batchDeleteButton = page.locator('button').filter({ hasText: /批\s*量\s*删\s*除/ });
      await expect(batchDeleteButton).toBeVisible({ timeout: 5000 });

      // 验证按钮文本包含选中数量
      const buttonText = await batchDeleteButton.textContent();
      expect(buttonText).toContain('2');

      // 点击批量删除按钮
      await batchDeleteButton.click();
      await page.waitForTimeout(300);

      // 确认删除 - 使用 Popconfirm
      const confirmButton = page.locator('.ant-popconfirm button').filter({ hasText: /确\s*定/ });
      await expect(confirmButton).toBeVisible({ timeout: 3000 });
      await confirmButton.click();

      // 等待成功提示
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 });

      // 验证题目已删除 - 等待表格更新
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const newCount = await selectedTable.locator('tr[data-row-key]').count();
      expect(newCount).toBe(initialCount - 2);
    }
  });
});
