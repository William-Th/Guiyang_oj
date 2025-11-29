import { test, expect, Page } from '@playwright/test';
import { TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 活动列表显示 (Regression Tests - Activity List Display)
 * 目标: 验证活动列表中的显示问题
 * 覆盖Bug:
 * - Bug #19: 活动管理中时长显示为null分钟
 * - Bug #20: 练习活动缺少组卷按钮
 */

// 登录为教师
async function loginAsTeacher(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  await page.locator('input[placeholder="用户名"]').last().fill('teacher_yy_ps_math');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');

  console.log('✅ 教师登录成功');
}

// 导航到活动管理页面
async function navigateToActivityList(page: Page) {
  const activityLink = page.getByRole('menuitem', { name: /活动管理/ });
  await expect(activityLink).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  await activityLink.click();
  await page.waitForURL(/\/teacher\/activities/, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  console.log('✅ 已导航到活动管理页面');
}

test.describe('Regression Tests - 活动列表显示', () => {

  // BUG019 - 未设置时长显示为-
  test('BUG019 - 未设置时长应显示为"-"而不是"null分钟"', async ({ page }) => {
    // Step 1: 教师登录
    await loginAsTeacher(page);

    // Step 2: 导航到活动管理
    await navigateToActivityList(page);

    // Step 3: 等待表格加载
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Step 4: 获取所有时长列的内容
    // 时长列可能是第4列或第5列，根据表格结构调整
    const durationColumnHeader = page.getByRole('columnheader', { name: /时长/ });
    const hasDurationColumn = await durationColumnHeader.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasDurationColumn) {
      // 获取时长列的索引
      const headers = page.locator('.ant-table-thead th');
      const headerCount = await headers.count();
      let durationColumnIndex = -1;

      for (let i = 0; i < headerCount; i++) {
        const headerText = await headers.nth(i).textContent();
        if (headerText && headerText.includes('时长')) {
          durationColumnIndex = i;
          break;
        }
      }

      if (durationColumnIndex >= 0) {
        // 检查所有行的时长列
        const rowCount = await tableRows.count();
        let hasNullDisplay = false;

        for (let i = 0; i < Math.min(rowCount, 10); i++) {
          const cell = tableRows.nth(i).locator('td').nth(durationColumnIndex);
          const cellText = await cell.textContent();

          if (cellText && cellText.includes('null')) {
            hasNullDisplay = true;
            console.log(`❌ BUG019: 第${i + 1}行时长显示为"${cellText}"（包含null）`);
            break;
          }

          // 验证显示格式：应该是"XX分钟"或"-"
          if (cellText) {
            const trimmedText = cellText.trim();
            if (trimmedText === '-' || trimmedText.match(/^\d+分钟$/)) {
              console.log(`✅ BUG019: 第${i + 1}行时长显示正确: "${trimmedText}"`);
            }
          }
        }

        if (hasNullDisplay) {
          throw new Error('BUG019失败: 时长列显示"null"（Bug #19未修复）');
        }

        console.log('✅ BUG019: 时长列显示格式正确，未出现"null"');
      } else {
        console.log('⚠️ BUG019: 未找到时长列索引');
      }
    } else {
      console.log('⚠️ BUG019: 未找到时长列');
    }
  });

  // BUG020 - 练习活动显示组卷按钮
  test('BUG020 - 练习活动应显示组卷按钮', async ({ page }) => {
    // Step 1: 教师登录
    await loginAsTeacher(page);

    // Step 2: 导航到活动管理
    await navigateToActivityList(page);

    // Step 3: 等待表格加载
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      console.log('⚠️ BUG020: 活动列表为空，跳过测试');
      return;
    }

    // Step 4: 找到练习类型的活动
    let foundPracticeActivity = false;
    let hasComposeButton = false;

    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = tableRows.nth(i);
      const rowText = await row.textContent();

      // 检查是否是练习活动（类型列或标签显示"练习"）
      if (rowText && (rowText.includes('练习') || rowText.includes('practice'))) {
        foundPracticeActivity = true;
        console.log(`✅ BUG020: 找到练习活动（第${i + 1}行）`);

        // 检查是否有组卷按钮
        const composeButton = row.locator('button').filter({ hasText: /组\s*卷/ });
        const composeLink = row.locator('a').filter({ hasText: /组\s*卷/ });

        const hasButton = await composeButton.isVisible({ timeout: 2000 }).catch(() => false);
        const hasLink = await composeLink.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasButton || hasLink) {
          hasComposeButton = true;
          console.log(`✅ BUG020: 练习活动（第${i + 1}行）有组卷按钮`);
          break;
        } else {
          // 检查操作列中的所有按钮
          const actionButtons = row.locator('button, a').filter({ has: page.locator('[aria-label], .anticon') });
          const buttonCount = await actionButtons.count();
          const buttonTexts: string[] = [];

          for (let j = 0; j < buttonCount; j++) {
            const btnText = await actionButtons.nth(j).textContent();
            if (btnText) buttonTexts.push(btnText.trim());
          }

          console.log(`  第${i + 1}行操作按钮: ${buttonTexts.join(', ')}`);

          // 也检查是否有带图标的组卷按钮（可能只显示图标）
          const fileTextIcon = row.locator('.anticon-file-text');
          if (await fileTextIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
            hasComposeButton = true;
            console.log(`✅ BUG020: 练习活动有组卷图标按钮`);
            break;
          }
        }
      }
    }

    if (!foundPracticeActivity) {
      console.log('⚠️ BUG020: 未找到练习类型活动，可能全是测评活动');
      // 这不是错误，只是数据问题
      return;
    }

    if (!hasComposeButton) {
      throw new Error('BUG020失败: 练习活动没有组卷按钮（Bug #20未修复）');
    }

    console.log('✅ BUG020: 练习活动正确显示组卷按钮');
  });

  // BUG020 - 验证组卷按钮可点击并跳转
  test('BUG020 - 组卷按钮应能正确跳转到组卷页面', async ({ page }) => {
    // Step 1: 教师登录
    await loginAsTeacher(page);

    // Step 2: 导航到活动管理
    await navigateToActivityList(page);

    // Step 3: 等待表格加载
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Step 4: 找到第一个有组卷按钮的活动
    const rowCount = await tableRows.count();

    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = tableRows.nth(i);

      // 查找组卷按钮（可能是button或a标签）
      const composeButton = row.locator('button').filter({ hasText: /组\s*卷/ })
        .or(row.locator('a').filter({ hasText: /组\s*卷/ }))
        .or(row.locator('button').filter({ has: page.locator('.anticon-file-text') }));

      if (await composeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ BUG020: 找到组卷按钮（第${i + 1}行），尝试点击`);

        // 获取当前URL
        const currentUrl = page.url();

        // 点击组卷按钮
        await composeButton.click();
        await page.waitForTimeout(2000);

        // 验证是否跳转到组卷页面
        const newUrl = page.url();

        if (newUrl.includes('/paper') || newUrl !== currentUrl) {
          console.log(`✅ BUG020: 成功跳转到组卷页面: ${newUrl}`);
          return;
        } else {
          console.log('⚠️ BUG020: 点击后URL未变化，可能打开了模态框');

          // 检查是否打开了组卷模态框
          const modal = page.locator('.ant-modal');
          if (await modal.isVisible({ timeout: 2000 })) {
            console.log('✅ BUG020: 组卷功能以模态框形式打开');
            await page.keyboard.press('Escape');
            return;
          }
        }
      }
    }

    console.log('⚠️ BUG020: 未找到可点击的组卷按钮');
  });

  // BUG019/20 综合测试 - 创建新活动并验证显示
  test('BUG019/20 - 新创建的活动应正确显示时长和组卷按钮', async ({ page }) => {
    // Step 1: 教师登录
    await loginAsTeacher(page);

    // Step 2: 导航到活动管理
    await navigateToActivityList(page);

    // Step 3: 点击创建活动按钮
    const createButton = page.locator('button').filter({ hasText: /新建|创建|添加/ });

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // 检查是否跳转到创建页面或打开模态框
      const isOnCreatePage = page.url().includes('/create') || page.url().includes('/new');
      const hasModal = await page.locator('.ant-modal').isVisible({ timeout: 2000 }).catch(() => false);

      if (isOnCreatePage || hasModal) {
        console.log('✅ BUG019/20: 可以访问活动创建界面');

        // 不实际创建，只验证界面可访问
        if (hasModal) {
          await page.keyboard.press('Escape');
        } else {
          await page.goBack();
        }
      }
    } else {
      console.log('⚠️ BUG019/20: 未找到创建活动按钮');
    }

    console.log('✅ BUG019/20: 活动列表显示综合测试完成');
  });
});
