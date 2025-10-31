import { test, expect, Page } from '@playwright/test';
import { TEACHER_STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 题库创建功能 (Regression Tests - Question Bank Creation)
 * 目标: 全面测试题库中创建题目的功能
 * 覆盖范围:
 * - 每种题型的创建流程
 * - 所有表单控件的验证
 * - 必填字段验证
 * - 选项动态添加/删除
 * - 答案设置
 */

test.describe('Regression Tests - 题库创建功能', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // Helper function to select Ant Design Select option
  const selectAntOption = async (page: Page, fieldId: string, optionText: string) => {
    // Click the ant-select parent element that wraps the input
    // Use :has() to find the .ant-select that contains our input#fieldId
    const selectWrapper = page.locator(`.ant-select:has(#${fieldId})`);
    await selectWrapper.click();
    await page.waitForTimeout(500);

    // Wait for dropdown to appear (not hidden)
    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'visible',
      timeout: 5000
    });

    // Click the option - use more flexible matching for partial text
    // First try exact match, then fall back to partial match
    const exactMatch = page.locator(`.ant-select-item-option:has-text("${optionText}")`).filter({
      hasText: new RegExp(`^${optionText}$`)
    });
    const partialMatch = page.locator(`.ant-select-item-option:has-text("${optionText}")`);

    const optionToClick = (await exactMatch.count()) > 0 ? exactMatch.first() : partialMatch.first();
    await optionToClick.click();
    await page.waitForTimeout(300);
  };

  test.beforeEach(async ({ page }) => {
    // 直接导航到题库创建页面
    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('networkidle');

    // 等待表单加载
    await page.waitForSelector('.ant-form', { timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  // R301 - 单选题创建功能
  test('R301 - 创建单选题 - 完整流程', async ({ page }) => {
    // 选择题型 - 单选题
    await selectAntOption(page, 'type', '单选题');

    // 选择科目
    await selectAntOption(page, 'subject', '数学');

    // 选择年级
    await selectAntOption(page, 'grade', '七年级');

    // 填写题目内容
    await page.fill('textarea#content', '1 + 1 = ?');

    // 填写选项
    const options = page.locator('input[placeholder="选项内容"]');
    await options.nth(0).fill('1');
    await options.nth(1).fill('2');

    // 添加更多选项
    await page.click('button:has-text("添加选项")');
    await options.nth(2).fill('3');
    await page.click('button:has-text("添加选项")');
    await options.nth(3).fill('4');

    // 选择正确答案 (选项B)
    await page.check('label:has-text("选项 B") input[type="radio"]');

    // 选择题目级别
    await selectAntOption(page, 'level', 'L1');

    // 选择难度
    await selectAntOption(page, 'difficulty', '简单');

    // 填写建议分值
    await page.fill('input#suggested_score', '5');

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R302 - 单选题必填字段验证
  test('R302 - 单选题必填字段验证', async ({ page }) => {
    // 直接提交空表单
    await page.click('button[type="submit"]');

    // 等待验证消息
    await page.waitForTimeout(1000);

    // 验证必填字段错误提示存在
    const errorMessages = page.locator('.ant-form-item-explain-error');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  // R303 - 单选题选项动态管理
  test('R303 - 单选题选项动态添加和删除', async ({ page }) => {
    // 选择单选题类型
    await selectAntOption(page, 'type', '单选题');

    // 初始应该有2个选项
    let options = page.locator('input[placeholder="选项内容"]');
    expect(await options.count()).toBe(2);

    // 添加选项
    await page.click('button:has-text("添加选项")');
    await page.waitForTimeout(300);
    expect(await options.count()).toBe(3);

    await page.click('button:has-text("添加选项")');
    await page.waitForTimeout(300);
    expect(await options.count()).toBe(4);

    // 删除一个选项
    const deleteButton = page.locator('.anticon-minus-circle').first();
    await deleteButton.click();
    await page.waitForTimeout(300);
    expect(await options.count()).toBe(3);
  });

  // R304 - 多选题创建功能
  test('R304 - 创建多选题 - 完整流程', async ({ page }) => {
    // 选择题型
    await selectAntOption(page, 'type', '多选题');

    // 基本信息
    await selectAntOption(page, 'subject', '物理');
    await selectAntOption(page, 'grade', '八年级');
    await page.fill('textarea#content', '以下哪些是基本物理量？');

    // 填写选项
    const options = page.locator('input[placeholder="选项内容"]');
    await options.nth(0).fill('质量');
    await options.nth(1).fill('长度');

    await page.click('button:has-text("添加选项")');
    await page.waitForTimeout(500);
    await options.nth(2).fill('速度');

    await page.click('button:has-text("添加选项")');
    await page.waitForTimeout(500);
    await options.nth(3).fill('时间');

    // Wait for all checkboxes to be rendered (should have 4 options now)
    await page.waitForTimeout(1000);
    await expect(page.locator('.ant-checkbox-group .ant-checkbox-wrapper')).toHaveCount(4, {
      timeout: 5000
    });

    // 选择多个正确答案 (A, B, D)
    // Click the label to check Ant Design checkboxes
    await page.click('label:has-text("选项 A")');
    await page.waitForTimeout(300);
    await page.click('label:has-text("选项 B")');
    await page.waitForTimeout(300);
    await page.click('label:has-text("选项 D")');
    await page.waitForTimeout(300);

    // 其他字段
    await selectAntOption(page, 'level', 'L2');
    await selectAntOption(page, 'difficulty', '中等');
    await page.fill('input#suggested_score', '8');

    // 提交
    await page.click('button[type="submit"]');

    // 验证成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R305 - 填空题创建功能
  test('R305 - 创建填空题 - 多个空格', async ({ page }) => {
    // 选择题型
    await selectAntOption(page, 'type', '填空题');

    // Wait for the type to change and form to re-render
    await page.waitForTimeout(1000);

    // 基本信息
    await selectAntOption(page, 'subject', '化学');
    await selectAntOption(page, 'grade', '九年级');
    await page.fill('textarea#content', '水的化学式是____，它由____元素组成。');

    // Wait for blank form to render with initial answer field
    // The placeholder text might be different, try multiple selectors
    const answerSelector = 'input[placeholder*="正确答案"], input[placeholder*="答案"]';
    await page.waitForSelector(answerSelector, {
      timeout: 10000,
      state: 'visible'
    });

    // 第一个空格的答案
    const answerInputs = page.locator(answerSelector);
    await answerInputs.nth(0).fill('H2O,H₂O');

    // 添加第二个空格
    await page.click('button:has-text("添加填空")');
    await page.waitForTimeout(800);  // Wait for new field to render

    // Verify we have 2 answer fields now
    await expect(answerInputs).toHaveCount(2, { timeout: 3000 });
    await answerInputs.nth(1).fill('氢,氧,氢和氧');

    // 其他字段
    await selectAntOption(page, 'level', 'L2');
    await selectAntOption(page, 'difficulty', '简单');
    await page.fill('input#suggested_score', '6');

    // 提交
    await page.click('button[type="submit"]');

    // 验证成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R306 - 判断题创建功能
  test('R306 - 创建判断题 - 完整流程', async ({ page }) => {
    // 选择题型
    await selectAntOption(page, 'type', '判断题');

    // 基本信息
    await selectAntOption(page, 'subject', '生物');
    await selectAntOption(page, 'grade', '七年级');
    await page.fill('textarea#content', '细胞是生命活动的基本单位。');

    // 选择正确答案 - 正确
    await page.check('label:has-text("正确") input[type="radio"]');

    // 其他字段
    await selectAntOption(page, 'level', 'L1');
    await selectAntOption(page, 'difficulty', '简单');
    await page.fill('input#suggested_score', '3');
    await page.fill('textarea#explanation', '细胞确实是生命活动的基本单位');

    // 提交
    await page.click('button[type="submit"]');

    // 验证成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R307 - 问答题创建功能
  test('R307 - 创建问答题 - 主观题', async ({ page }) => {
    // 选择题型
    await selectAntOption(page, 'type', '问答题');

    // 基本信息
    await selectAntOption(page, 'subject', '数学');
    await selectAntOption(page, 'grade', '九年级');
    await page.fill('textarea#content', '请简述勾股定理的内容及其应用场景。');

    // 参考答案（可选）
    await page.fill('textarea#correct_answer', '勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。');

    // 其他字段
    await selectAntOption(page, 'level', 'L4');
    await selectAntOption(page, 'difficulty', '中等');
    await page.fill('input#suggested_score', '10');

    // 提交
    await page.click('button[type="submit"]');

    // 验证成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R308 - 编程题创建功能
  test('R308 - 创建编程题', async ({ page }) => {
    // 选择题型
    await selectAntOption(page, 'type', '编程题');

    // 基本信息
    await selectAntOption(page, 'subject', '计算机');
    await selectAntOption(page, 'grade', '八年级');
    await page.fill('textarea#content', '编写一个函数，计算斐波那契数列的第n项。');

    // 参考答案
    const referenceCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`;

    await page.fill('textarea#correct_answer', referenceCode);

    // 其他字段
    await selectAntOption(page, 'level', 'L5');
    await selectAntOption(page, 'difficulty', '困难');
    await page.fill('input#suggested_score', '15');

    // 提交
    await page.click('button[type="submit"]');

    // 验证成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R309 - 表单重置功能
  test('R309 - 重置按钮清空表单', async ({ page }) => {
    // 填写一些字段
    await selectAntOption(page, 'type', '单选题');
    await page.waitForTimeout(500);

    await selectAntOption(page, 'subject', '数学');
    await page.waitForTimeout(500);

    await page.fill('textarea#content', '测试内容');
    await page.waitForTimeout(500);

    // Scroll to bottom to reveal buttons
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Use the most straightforward approach - find all buttons in the last Form.Item
    // and click the one that's not the submit button
    const allButtons = page.locator('form .ant-space button');
    const buttonCount = await allButtons.count();

    // Find and click the second button (reset button)
    if (buttonCount >= 2) {
      await allButtons.nth(1).click();
    } else {
      throw new Error('Reset button not found - expected at least 2 buttons in form');
    }

    // 等待重置完成
    await page.waitForTimeout(1000);

    // 验证内容已清空
    const content = await page.locator('textarea#content').inputValue();
    expect(content).toBe('');
  });

  // R310 - 切换题型时表单适配
  test('R310 - 切换题型时答案区域正确更新', async ({ page }) => {
    // 单选题
    await selectAntOption(page, 'type', '单选题');
    await page.waitForTimeout(500);
    await expect(page.locator('input[type="radio"]').first()).toBeVisible();

    // 切换到多选题
    await selectAntOption(page, 'type', '多选题');
    await page.waitForTimeout(500);
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();

    // 切换到判断题
    await selectAntOption(page, 'type', '判断题');
    await page.waitForTimeout(500);
    await expect(page.locator('text=正确').first()).toBeVisible();
    await expect(page.locator('text=错误').first()).toBeVisible();

    // 切换到填空题
    await selectAntOption(page, 'type', '填空题');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("添加填空")')).toBeVisible();
  });
});
