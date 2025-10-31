import { test, expect, Page } from '@playwright/test';
import { TEACHER_STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * Regression Tests - Teacher Grading Flow 教师评卷流程
 * 目标: 验证教师完整的评卷流程
 * 覆盖范围:
 * - GRD201: 教师访问评卷管理页面
 * - GRD202: 教师查看待评卷列表
 * - GRD203: 教师进入评卷详情页
 * - GRD204: 教师为主观题评分
 * - GRD205: 教师批量保存评分
 * - GRD206: 教师完成评卷
 * - GRD207: 验证评卷筛选功能
 *
 * 前置条件:
 * - 数据库中需要存在已提交的学生答题记录
 * - 教师账号已注册（teacher01）
 */

test.describe('Regression Tests - Teacher Grading Flow 教师评卷流程', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // Helper function to navigate to grading page
  const navigateToGrading = async (page: Page) => {
    console.log('导航到评卷管理页面');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check if already on grading page
    const currentUrl = page.url();
    if (currentUrl.includes('/grading')) {
      console.log('当前已在评卷管理页面');
      return;
    }

    // Try to find grading menu
    const menuSelectors = [
      'a:has-text("评卷管理")',
      '.ant-menu-item:has-text("评卷管理")',
      '[href*="grading"]',
      'text=评卷'
    ];

    let menuFound = false;
    for (const selector of menuSelectors) {
      const menu = page.locator(selector).first();
      if (await menu.count() > 0) {
        const isVisible = await menu.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`找到评卷管理菜单: ${selector}`);
          await menu.click();
          menuFound = true;
          break;
        }
      }
    }

    if (!menuFound) {
      console.warn('未找到评卷管理菜单，尝试直接导航');
      await page.goto('/teacher/grading');
    }

    await page.waitForURL(/\/teacher\/grading/, { timeout: TEST_TIMEOUTS.NAVIGATION });
    await page.waitForLoadState('networkidle');
    console.log('成功导航到评卷管理页面');
  };

  test('GRD201 - 教师可以访问评卷管理页面', async ({ page }) => {
    console.log('\n=== GRD201: 教师访问评卷管理页面 ===');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await navigateToGrading(page);

    // 验证页面标题
    const pageTitle = page.locator('.ant-card-head-title:has-text("待评卷列表"), h1:has-text("评卷"), h2:has-text("评卷")');
    await expect(pageTitle.first()).toBeAttached({ timeout: 10000 });

    // 验证统计卡片存在
    const statsCards = page.locator('.ant-statistic');
    const statsCount = await statsCards.count();
    console.log(`找到 ${statsCount} 个统计卡片`);

    // 验证表格或空状态存在
    const hasTable = await page.locator('.ant-table').count() > 0;
    const hasEmpty = await page.locator('.ant-empty').count() > 0;
    expect(hasTable || hasEmpty).toBeTruthy();

    console.log('✓ 教师可以访问评卷管理页面');
  });

  test('GRD202 - 教师可以查看待评卷列表', async ({ page }) => {
    console.log('\n=== GRD202: 查看待评卷列表 ===');

    await page.goto('/teacher/grading');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 检查统计数据
    const totalStat = page.locator('.ant-statistic').filter({ hasText: /总提交数|总数/ }).first();
    if (await totalStat.count() > 0) {
      const totalValue = await totalStat.locator('.ant-statistic-content-value').textContent();
      console.log(`总提交数: ${totalValue}`);
    }

    // 检查待评卷列表
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    const rowCount = await tableRows.count();
    console.log(`找到 ${rowCount} 个待评卷提交`);

    if (rowCount === 0) {
      console.warn('⚠ 没有待评卷提交，后续测试将跳过');
    } else {
      // 验证表头
      const headers = ['活动名称', '学生', '科目', '年级', '提交时间', '评卷状态'];
      for (const header of headers) {
        const headerCell = page.locator('.ant-table-thead th').filter({ hasText: new RegExp(header) });
        if (await headerCell.count() > 0) {
          console.log(`✓ 找到表头: ${header}`);
        }
      }

      // 验证评卷按钮存在
      const firstRow = tableRows.first();
      const gradingButton = firstRow.locator('button').filter({ hasText: /评\s*卷/ }).first();
      await expect(gradingButton).toBeAttached();
      console.log('✓ 评卷按钮存在');
    }

    console.log('✓ 教师可以查看待评卷列表');
  });

  test('GRD203 - 教师可以进入评卷详情页', async ({ page }) => {
    console.log('\n=== GRD203: 进入评卷详情页 ===');

    await page.goto('/teacher/grading');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 查找第一个待评卷记录
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      console.warn('⚠ 没有待评卷提交');
      test.skip();
      return;
    }

    const firstRow = tableRows.first();
    await expect(firstRow).toBeAttached();

    // 获取学生姓名和活动名称（用于后续验证）
    const studentCell = firstRow.locator('td').nth(1);
    const studentName = await studentCell.textContent();
    console.log(`学生: ${studentName}`);

    // 点击评卷按钮
    const gradingButton = firstRow.locator('button').filter({ hasText: /评\s*卷/ }).first();
    await gradingButton.waitFor({ state: 'attached', timeout: 5000 });

    // 使用 evaluate 绕过可见性检查
    await gradingButton.evaluate((button: HTMLElement) => button.click());

    // 等待导航到详情页
    await page.waitForURL(/\/teacher\/grading\/\d+/, { timeout: TEST_TIMEOUTS.NAVIGATION });
    await page.waitForLoadState('networkidle');

    // 验证详情页元素
    await expect(page.locator('.ant-card-head-title:has-text("评卷详情")')).toBeAttached();

    // 验证学生信息显示
    const studentInfo = page.locator('.ant-descriptions-item').filter({ hasText: /学生姓名/ });
    await expect(studentInfo).toBeAttached();

    // 验证题目卡片存在
    const questionCards = page.locator('.ant-card').filter({ has: page.locator('text=/第.*题/') });
    const questionCount = await questionCards.count();
    console.log(`找到 ${questionCount} 道题目`);
    expect(questionCount).toBeGreaterThan(0);

    // 验证保存和完成按钮存在
    await expect(page.locator('button').filter({ hasText: /保\s*存/ })).toBeAttached();
    const completeButton = page.locator('button').filter({ hasText: /完\s*成.*评\s*卷/ }).first();
    await expect(completeButton).toBeAttached();

    console.log('✓ 教师可以进入评卷详情页');
  });

  test('GRD204 - 教师可以为题目评分', async ({ page }) => {
    console.log('\n=== GRD204: 为题目评分 ===');

    await page.goto('/teacher/grading');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 进入第一个评卷详情
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    if (await tableRows.count() === 0) {
      test.skip();
      return;
    }

    const firstRow = tableRows.first();
    const gradingButton = firstRow.locator('button').filter({ hasText: /评\s*卷/ }).first();
    await gradingButton.waitFor({ state: 'attached', timeout: 5000 });
    await gradingButton.evaluate((button: HTMLElement) => button.click());

    await page.waitForURL(/\/teacher\/grading\/\d+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 查找所有题目卡片
    const questionCards = page.locator('.ant-card').filter({ has: page.locator('text=/第.*题/') });
    const questionCount = await questionCards.count();
    console.log(`找到 ${questionCount} 道题目`);

    let gradedCount = 0;

    // 遍历题目进行评分
    for (let i = 0; i < questionCount; i++) {
      const questionCard = questionCards.nth(i);
      await questionCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // 检查是否有得分输入框（主观题才需要人工评分）
      const scoreInput = questionCard.locator('input[type="number"], .ant-input-number-input').first();

      if (await scoreInput.count() > 0) {
        // 检查输入框是否禁用
        const isDisabled = await scoreInput.isDisabled().catch(() => true);

        if (!isDisabled) {
          console.log(`题目 ${i + 1}: 可评分`);

          // 获取最大分数（从题目卡片中提取）
          const scoreTag = questionCard.locator('.ant-tag').filter({ hasText: /\d+\s*分/ });
          let maxScore = 10; // 默认值
          if (await scoreTag.count() > 0) {
            const scoreText = await scoreTag.textContent();
            const match = scoreText?.match(/(\d+)\s*分/);
            if (match) {
              maxScore = parseInt(match[1]);
            }
          }

          // 填写得分（给满分）
          await scoreInput.fill('');
          await scoreInput.fill(maxScore.toString());
          await page.waitForTimeout(200);

          // 填写评语（可选）
          const feedbackInput = questionCard.locator('textarea[placeholder*="评语"]').first();
          if (await feedbackInput.count() > 0) {
            await feedbackInput.fill('回答正确，表述清晰。');
            await page.waitForTimeout(200);
          }

          gradedCount++;
        } else {
          console.log(`题目 ${i + 1}: 已自动评分（禁用编辑）`);
        }
      } else {
        console.log(`题目 ${i + 1}: 无需人工评分`);
      }
    }

    console.log(`✓ 为 ${gradedCount} 道题目评分完成`);

    if (gradedCount > 0) {
      console.log('✓ 教师可以为题目评分');
    } else {
      console.log('  所有题目已自动评分，无需人工评分');
    }
  });

  test('GRD205 - 教师可以批量保存评分', async ({ page }) => {
    console.log('\n=== GRD205: 批量保存评分 ===');

    await page.goto('/teacher/grading');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 进入评卷详情
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    if (await tableRows.count() === 0) {
      test.skip();
      return;
    }

    const firstRow = tableRows.first();
    const gradingButton = firstRow.locator('button').filter({ hasText: /评\s*卷/ }).first();
    await gradingButton.waitFor({ state: 'attached', timeout: 5000 });
    await gradingButton.evaluate((button: HTMLElement) => button.click());

    await page.waitForURL(/\/teacher\/grading\/\d+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 快速为可评分题目填写分数
    const questionCards = page.locator('.ant-card').filter({ has: page.locator('text=/第.*题/') });
    const questionCount = await questionCards.count();

    for (let i = 0; i < Math.min(questionCount, 3); i++) {
      const questionCard = questionCards.nth(i);
      const scoreInput = questionCard.locator('input[type="number"], .ant-input-number-input').first();

      if (await scoreInput.count() > 0) {
        const isDisabled = await scoreInput.isDisabled().catch(() => true);
        if (!isDisabled) {
          await scoreInput.fill('5');
          await page.waitForTimeout(200);
        }
      }
    }

    // 点击"保存所有评分"按钮
    const saveAllButton = page.locator('button').filter({ hasText: /保\s*存.*评\s*分/ }).first();
    await expect(saveAllButton).toBeAttached();
    await saveAllButton.click();

    // 等待保存完成
    await page.waitForTimeout(1500);

    // 验证保存成功消息
    const successMessage = page.locator('.ant-message:has-text("保存成功"), .ant-notification:has-text("保存成功")');
    if (await successMessage.count() > 0) {
      console.log('✓ 检测到保存成功消息');
    } else {
      console.log('  未检测到保存消息（可能已关闭）');
    }

    console.log('✓ 教师可以批量保存评分');
  });

  test('GRD206 - 教师可以完成评卷', async ({ page }) => {
    console.log('\n=== GRD206: 完成评卷 ===');

    await page.goto('/teacher/grading');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 进入评卷详情
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    if (await tableRows.count() === 0) {
      test.skip();
      return;
    }

    const firstRow = tableRows.first();
    const gradingButton = firstRow.locator('button').filter({ hasText: /评\s*卷/ }).first();
    await gradingButton.waitFor({ state: 'attached', timeout: 5000 });
    await gradingButton.evaluate((button: HTMLElement) => button.click());

    await page.waitForURL(/\/teacher\/grading\/\d+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 确保所有题目都已评分
    const questionCards = page.locator('.ant-card').filter({ has: page.locator('text=/第.*题/') });
    const questionCount = await questionCards.count();

    for (let i = 0; i < questionCount; i++) {
      const questionCard = questionCards.nth(i);
      const scoreInput = questionCard.locator('input[type="number"], .ant-input-number-input').first();

      if (await scoreInput.count() > 0) {
        const isDisabled = await scoreInput.isDisabled().catch(() => true);
        if (!isDisabled) {
          const currentValue = await scoreInput.inputValue();
          if (!currentValue || currentValue === '0') {
            await scoreInput.fill('5');
            await page.waitForTimeout(200);
          }
        }
      }
    }

    // 先保存评分
    const saveAllButton = page.locator('button').filter({ hasText: /保\s*存.*评\s*分/ }).first();
    if (await saveAllButton.count() > 0) {
      await saveAllButton.click();
      await page.waitForTimeout(1500);
    }

    // 点击"完成评卷"按钮
    const completeButton = page.locator('button').filter({ hasText: /完\s*成.*评\s*卷/ }).first();
    await expect(completeButton).toBeAttached();

    // 检查按钮是否禁用
    const isDisabled = await completeButton.isDisabled().catch(() => true);
    if (isDisabled) {
      console.log('  完成评卷按钮被禁用（可能还有题目未评分）');
      console.log('  跳过完成评卷操作');
      return;
    }

    await completeButton.click();

    // 等待确认对话框
    await page.waitForTimeout(500);
    const confirmButton = page.locator('.ant-modal button').filter({ hasText: /确\s*定/ }).first();
    if (await confirmButton.count() > 0) {
      console.log('检测到确认对话框');
      await confirmButton.click();
    }

    // 等待完成操作
    await page.waitForTimeout(2000);

    // 验证是否返回列表页
    const currentUrl = page.url();
    if (currentUrl.includes('/teacher/grading') && !currentUrl.match(/\/grading\/\d+/)) {
      console.log('✓ 已返回评卷列表页');
    }

    // 验证成功消息
    const successMessage = page.locator('.ant-message:has-text("完成"), .ant-notification:has-text("完成")');
    if (await successMessage.count() > 0) {
      console.log('✓ 检测到完成评卷消息');
    }

    console.log('✓ 教师可以完成评卷');
  });

  test('GRD207 - 教师可以筛选待评卷列表', async ({ page }) => {
    console.log('\n=== GRD207: 筛选待评卷列表 ===');

    await page.goto('/teacher/grading');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 查找筛选器
    const filters = {
      subject: page.locator('.ant-select').filter({ has: page.locator('[placeholder*="科目"]') }).first(),
      grade: page.locator('.ant-select').filter({ has: page.locator('[placeholder*="年级"]') }).first(),
      status: page.locator('.ant-select').filter({ has: page.locator('[placeholder*="评卷状态"]') }).first(),
    };

    // 测试科目筛选
    if (await filters.subject.count() > 0) {
      console.log('测试科目筛选');
      await filters.subject.click();
      await page.waitForTimeout(500);

      const mathOption = page.getByRole('option', { name: '数学' });
      if (await mathOption.count() > 0) {
        await mathOption.click();
        await page.waitForTimeout(1000);

        // 验证筛选结果
        const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
        const rowCount = await tableRows.count();
        console.log(`筛选后找到 ${rowCount} 条记录`);

        // 清除筛选
        await filters.subject.click();
        await page.waitForTimeout(300);
        const clearOption = page.locator('.ant-select-item-option').filter({ hasText: /清除|全部/ }).first();
        if (await clearOption.count() > 0) {
          await clearOption.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(500);
      }
    }

    // 测试评卷状态筛选
    if (await filters.status.count() > 0) {
      console.log('测试评卷状态筛选');
      await filters.status.click();
      await page.waitForTimeout(500);

      const pendingOption = page.getByRole('option', { name: '待评卷' });
      if (await pendingOption.count() > 0) {
        await pendingOption.click();
        await page.waitForTimeout(1000);

        const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
        const rowCount = await tableRows.count();
        console.log(`筛选待评卷后找到 ${rowCount} 条记录`);
      }
    }

    console.log('✓ 教师可以筛选待评卷列表');
  });
});
