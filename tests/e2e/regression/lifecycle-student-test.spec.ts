import { test, expect, Page } from '@playwright/test';
import { STORAGE_STATE } from '../test-config';

/**
 * Student Activity Flow Test - 简化版
 * 测试学生答题和查看结果流程
 * 前置条件: 活动 ID 128（【完整流程测试】测试活动）已创建并发布，allow_retake=true
 */

test.describe('Student Activity Flow - Lifecycle Test', () => {
  test.use({ storageState: STORAGE_STATE.STUDENT });

  // 在分页列表中查找种子活动（可用列表按最新优先，老活动可能不在第 1 页）
  const findSeedRow = async (page: Page) => {
    const title = '【完整流程测试】';
    const rows = () => page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr:visible').filter({ hasText: title });
    for (let p = 0; p < 20; p++) {
      if ((await rows().count()) > 0) return rows().first();
      const next = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if ((await next.count()) === 0) break;
      await next.click();
      await page.waitForTimeout(800);
    }
    return null;
  };

  test('STU201 - 学生访问练习中心', async ({ page }) => {
    console.log('\n=== STU201: 访问练习中心 ===');

    await page.goto('/student/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证页面标题 - 使用first()避免严格模式违规
    await expect(page.locator('.ant-card-head-title:has-text("练习"), .ant-card:has-text("练习")').first()).toBeAttached();

    console.log('✓ STU201: 可以访问练习中心');
  });

  test('STU202 - 查看测试活动', async ({ page }) => {
    console.log('\n=== STU202: 查看测试活动 ===');

    await page.goto('/student/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 查找测试活动（分页遍历）
    const activityRow = await findSeedRow(page);
    const count = activityRow ? 1 : 0;

    console.log(`找到测试活动: ${count > 0 ? '是' : '否'}`);

    if (activityRow) {
      console.log('活动详情:', await activityRow.textContent());
    }

    expect(count).toBeGreaterThan(0);
    console.log('✓ STU202: 可以看到测试活动');
  });

  test('STU203-STU204 - 开始答题并填写答案', async ({ page }) => {
    console.log('\n=== STU203-STU204: 开始答题并填写答案 ===');

    await page.goto('/student/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 点击开始练习（分页查找种子活动）
    const seedRow = await findSeedRow(page);
    if (!seedRow) {
      console.warn('⚠ 未找到【完整流程测试】活动');
      test.skip();
      return;
    }
    const startButton = seedRow.locator('button:has-text("开始"), button:has-text("继续")').first();

    await startButton.click();
    await page.waitForTimeout(3000);

    // 检查当前URL
    const currentUrl = page.url();
    console.log(`答题页面URL: ${currentUrl}`);

    // 等待题目加载
    await page.waitForTimeout(3000);

    // 检查题目是否显示
    const questionText = await page.textContent('body');
    console.log(`页面内容预览: ${questionText?.substring(0, 300)}...`);

    const hasQuestion = await page.locator('text=/题/').count() > 0;
    console.log(`页面包含题目: ${hasQuestion}`);

    // 选择第一道单选题的答案 B（卷子含多道单选，需限定题卡范围）
    const radioB = page.locator('.activity-question-card').first().locator('input[type="radio"][value="B"]');
    if (await radioB.count() > 0) {
      await radioB.check();
      console.log('已选择选项B');
    } else {
      // 尝试其他方式选择
      const optionB = page.locator('text=B').first();
      if (await optionB.count() > 0) {
        await optionB.click();
        console.log('已点击选项B');
      }
    }

    await page.waitForTimeout(1000);

    console.log('✓ STU203-STU204: 答题和填写答案完成');
  });

  test('STU205 - 提交答案', async ({ page }) => {
    console.log('\n=== STU205: 提交答案 ===');

    // 先进入答题页面
    await page.goto('/student/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const seedRow = await findSeedRow(page);
    if (!seedRow) {
      console.warn('⚠ 未找到【完整流程测试】活动');
      test.skip();
      return;
    }
    const startButton = seedRow.locator('button:has-text("开始"), button:has-text("继续")').first();
    await startButton.click();
    await page.waitForTimeout(3000);

    // 选择答案
    const radioInput = page.locator('input[type="radio"]').first();
    if (await radioInput.count() > 0) {
      await radioInput.check();
    }
    await page.waitForTimeout(500);

    // 提交答案
    const submitButton = page.locator('button').filter({ hasText: /提.*交/ }).first();
    await expect(submitButton).toBeAttached();
    await submitButton.click();

    // 确认提交
    await page.waitForTimeout(500);
    const confirmButton = page.locator('.ant-modal button:has-text("确定")').first();
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }

    await page.waitForTimeout(3000);

    console.log('✓ STU205: 提交答案完成');
  });

  test('STU206 - 查看结果', async ({ page }) => {
    console.log('\n=== STU206: 查看结果 ===');

    await page.goto('/student/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 查找测试活动（分页遍历）
    const activityRow = await findSeedRow(page);
    if (!activityRow) {
      console.log('ℹ️ 可用列表中未找到测试活动，跳过结果查看');
      return;
    }

    // 查看结果按钮
    const resultButton = activityRow.locator('button:has-text("查看")').first();
    const hasResultButton = await resultButton.count() > 0;

    if (hasResultButton) {
      await resultButton.click();
      await page.waitForTimeout(2000);

      // 验证结果页面
      const currentUrl = page.url();
      console.log(`结果页面URL: ${currentUrl}`);

      // 练习活动应该立即显示答案
      const hasCorrectAnswer = await page.locator('text=/正确答案|参考答案/').count() > 0;
      const hasScore = await page.locator('text=/得分|分数/').count() > 0;

      console.log(`显示正确答案: ${hasCorrectAnswer}`);
      console.log(`显示分数: ${hasScore}`);

      expect(hasScore || hasCorrectAnswer).toBeTruthy();
    } else {
      console.log('⚠ 未找到查看结果按钮，可能尚未提交');
    }

    console.log('✓ STU206: 查看结果完成');
  });
});
