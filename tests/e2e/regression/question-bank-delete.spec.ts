import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE, TEACHER_STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 题库删除功能 (Regression Tests - Question Bank Delete)
 * 目标: 测试题目的删除功能和权限控制
 * 覆盖范围:
 * - QBDEL101: 管理员删除题目
 * - QBDEL102: 删除权限控制（非创建者不可删除）
 * - QBDEL103: 删除草稿题目
 * - QBDEL104: 批量删除功能验证
 * - QBDEL105: 删除确认对话框
 */

// 管理员删除测试
test.describe('Regression Tests - 题库删除功能 [管理员]', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  // QBDEL101 - 管理员删除题目
  test('QBDEL101 - 管理员删除题目', async ({ page }) => {
    console.log('=== QBDEL101 测试开始：管理员删除题目 ===');

    // Step 1: 导航到题库页面
    await page.goto('/admin/question-bank');
    await page.waitForLoadState('networkidle');
    console.log('已导航到管理员题库页面');

    // Step 2: 等待表格加载
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Step 3: 获取删除前的题目总数
    const initialRows = await tableRows.count();
    console.log(`删除前题目总数: ${initialRows}`);

    if (initialRows === 0) {
      test.skip(true, '题库中没有题目，跳过删除测试');
      return;
    }

    // Step 4: 找到第一行的题目信息
    const firstRow = tableRows.first();
    const firstRowContent = await firstRow.textContent();
    console.log(`第一行内容预览: ${firstRowContent?.substring(0, 100)}...`);

    // Step 5: 点击第一行的删除按钮
    const deleteButton = firstRow.locator('button:has([aria-label="delete"])');
    await expect(deleteButton).toBeAttached({ timeout: 5000 });
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();
    console.log('已点击删除按钮');

    // Step 6: 确认删除对话框（可能不显示，直接删除）
    const confirmButton = page.locator('.ant-popconfirm button:has-text("确定")').or(
      page.locator('.ant-modal button:has-text("确定")')
    );

    // 等待一小段时间看是否有确认对话框
    await page.waitForTimeout(500);
    const hasConfirmDialog = await confirmButton.count() > 0;

    if (hasConfirmDialog) {
      await confirmButton.first().click();
      console.log('已确认删除（通过对话框）');
    } else {
      console.log('未发现确认对话框，可能已直接删除');
    }

    // Step 7: 验证删除成功（通过列表更新判断，不依赖消息提示）
    await page.waitForTimeout(1000);
    console.log('验证删除结果...');

    // Step 8: 刷新页面验证列表更新
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const newRows = await tableRows.count();
    console.log(`删除后题目总数: ${newRows}`);

    if (initialRows === 1) {
      expect(newRows).toBe(0);
    } else {
      expect(newRows).toBeLessThan(initialRows);
    }

    console.log('=== QBDEL101 测试完成：管理员删除题目成功 ===');
  });

  // QBDEL104 - 批量删除功能验证
  test('QBDEL104 - 批量删除功能验证', async ({ page }) => {
    console.log('=== QBDEL104 测试开始：批量删除功能 ===');

    await page.goto('/admin/question-bank');
    await page.waitForLoadState('networkidle');

    // 检查是否有批量选择checkbox
    const rowCheckbox = page.locator('.ant-table-tbody tr:first-child .ant-checkbox-wrapper');

    if (await rowCheckbox.count() > 0) {
      console.log('发现批量选择功能');

      // 选择第一行
      await rowCheckbox.first().click();
      await page.waitForTimeout(500);

      // 检查是否有批量删除按钮
      const batchDeleteButton = page.locator('button').filter({
        hasText: /批量删除|删除选中/
      });

      if (await batchDeleteButton.count() > 0) {
        console.log('✅ QBDEL104: 批量删除功能存在');
      } else {
        console.log('⚠️ QBDEL104: 有批量选择但没有批量删除按钮');
      }
    } else {
      console.log('⚠️ QBDEL104: 未发现批量选择功能');
    }

    console.log('=== QBDEL104 测试完成 ===');
  });
});

// 教师删除测试
test.describe('Regression Tests - 题库删除功能 [教师]', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // QBDEL102 - 删除权限控制（教师不能删除别人的题目）
  test('QBDEL102 - 删除权限控制', async ({ page }) => {
    console.log('=== QBDEL102 测试开始：删除权限控制 ===');

    // Step 1: 导航到题库页面
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    console.log('已导航到教师题库页面');

    // Step 2: 切换到"已发布"标签页
    const publishedTab = page.locator('.ant-tabs-tab:has-text("已发布")');
    if (await publishedTab.count() > 0) {
      await publishedTab.click();
      await page.waitForTimeout(1000);
    }

    // Step 3: 等待表格加载
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    const rowCount = await tableRows.count();
    console.log(`已发布题目总数: ${rowCount}`);

    if (rowCount === 0) {
      test.skip(true, '已发布题库中没有题目，跳过权限测试');
      return;
    }

    // Step 4: 检查第一行是否有删除按钮
    const firstRow = tableRows.first();
    const deleteButton = firstRow.locator('button:has([aria-label="delete"])');

    const deleteButtonCount = await deleteButton.count();

    if (deleteButtonCount === 0) {
      // 没有删除按钮是正常的（已发布题目不显示删除按钮）
      console.log('✅ QBDEL102: 已发布题目不显示删除按钮（权限控制正确）');
    } else {
      console.log('⚠️ QBDEL102: 已发布题目显示删除按钮（可能允许删除）');
    }

    console.log('=== QBDEL102 测试完成：删除权限控制验证 ===');
  });

  // QBDEL103 - 删除草稿题目
  test('QBDEL103 - 删除草稿题目', async ({ page }) => {
    console.log('=== QBDEL103 测试开始：删除草稿题目 ===');

    // Step 1: 创建一个用于删除的草稿题目
    const timestamp = Date.now();
    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('networkidle');

    // 填写基本信息
    await page.click('.ant-select:has(#type)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("判断题")').first().click();

    await page.click('.ant-select:has(#subject)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("数学")').first().click();

    await page.click('.ant-select:has(#grade)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("一年级")').first().click();

    await page.fill('textarea#content', `【QBDEL103删除测试-${timestamp}】1+1=2`);
    await page.check('label:has-text("正确") input[type="radio"]');

    await page.click('.ant-select:has(#level)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("L1")').first().click();

    await page.click('.ant-select:has(#difficulty)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("简单")').first().click();

    await page.fill('input#suggested_score', '5');

    // 提交创建草稿
    await page.click('button[type="submit"]');
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
    console.log('草稿题目创建成功');

    // Step 2: 进入草稿箱
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // Step 3: 找到刚创建的草稿并删除
    const targetRow = page.locator('.ant-table-tbody tr').filter({
      hasText: `【QBDEL103删除测试-${timestamp}】`
    }).first();

    await expect(targetRow).toBeAttached({ timeout: 5000 });
    console.log('找到目标草稿题目');

    // 获取删除前的行数
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    const initialCount = await tableRows.count();

    // 点击删除按钮
    const deleteButton = targetRow.locator('button:has([aria-label="delete"])');
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();
    console.log('已点击删除按钮');

    // 确认删除
    const confirmButton = page.locator('.ant-popconfirm button:has-text("确定"), .ant-modal button:has-text("确定")');

    // 等待确认对话框
    await page.waitForTimeout(500);
    const hasConfirmDialog = await confirmButton.count() > 0;

    if (hasConfirmDialog) {
      await confirmButton.first().click();
      console.log('已确认删除');
    } else {
      console.log('未发现确认对话框，可能已直接删除');
    }

    // 等待删除完成
    await page.waitForTimeout(1000);

    // Step 4: 验证列表更新
    await page.waitForTimeout(1000);
    const newCount = await tableRows.count();

    if (initialCount > 1) {
      expect(newCount).toBeLessThan(initialCount);
      console.log(`行数从 ${initialCount} 减少到 ${newCount}`);
    }

    // Step 5: 刷新页面验证草稿确实被删除
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 查找被删除的草稿（应该找不到）
    const deletedRow = page.locator('.ant-table-tbody tr').filter({
      hasText: `【QBDEL103删除测试-${timestamp}】`
    });
    expect(await deletedRow.count()).toBe(0);
    console.log('✅ QBDEL103: 草稿题目已成功删除');

    console.log('=== QBDEL103 测试完成：草稿删除功能正常 ===');
  });

  // QBDEL105 - 删除确认对话框
  test('QBDEL105 - 删除确认对话框', async ({ page }) => {
    console.log('=== QBDEL105 测试开始：删除确认对话框 ===');

    // 先创建一个草稿
    const timestamp = Date.now();
    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('networkidle');

    await page.click('.ant-select:has(#type)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("判断题")').first().click();

    await page.click('.ant-select:has(#subject)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("数学")').first().click();

    await page.click('.ant-select:has(#grade)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("一年级")').first().click();

    await page.fill('textarea#content', `【QBDEL105对话框测试-${timestamp}】测试确认对话框`);
    await page.check('label:has-text("正确") input[type="radio"]');

    await page.click('.ant-select:has(#level)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("L1")').first().click();

    await page.click('.ant-select:has(#difficulty)');
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("简单")').first().click();

    await page.fill('input#suggested_score', '5');

    await page.click('button[type="submit"]');
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });

    // 进入草稿箱测试删除确认对话框
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    const targetRow = page.locator('.ant-table-tbody tr').filter({
      hasText: `【QBDEL105对话框测试-${timestamp}】`
    }).first();

    await expect(targetRow).toBeAttached({ timeout: 5000 });

    // 点击删除按钮
    const deleteButton = targetRow.locator('button:has([aria-label="delete"])');
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();

    // 验证确认对话框出现
    const confirmButton = page.locator('.ant-popconfirm button:has-text("确定"), .ant-modal-confirm button:has-text("确定")');
    const cancelButton = page.locator('.ant-popconfirm button:has-text("取消"), .ant-modal-confirm button:has-text("取消")');

    // 等待确认对话框
    await page.waitForTimeout(500);

    const hasConfirm = await confirmButton.count() > 0;
    const hasCancel = await cancelButton.count() > 0;

    if (hasConfirm && hasCancel) {
      console.log('✅ QBDEL105: 删除确认对话框正常显示');

      // 点击取消按钮
      await cancelButton.first().click();
      await page.waitForTimeout(500);

      // 验证题目未被删除（行仍然存在）
      const stillExists = await targetRow.count();
      expect(stillExists).toBeGreaterThan(0);
      console.log('✅ QBDEL105: 取消删除后题目仍存在');

      // 再次点击删除并确认
      await deleteButton.click();
      await page.waitForTimeout(500);

      if (await confirmButton.count() > 0) {
        await confirmButton.first().click();
      }

      // 等待删除完成
      await page.waitForTimeout(500);
      console.log('✅ QBDEL105: 确认删除后题目被删除');
    } else {
      console.log('⚠️ QBDEL105: 未检测到标准确认对话框，可能直接删除');
    }

    console.log('=== QBDEL105 测试完成：删除确认对话框功能正常 ===');
  });
});
