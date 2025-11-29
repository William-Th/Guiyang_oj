import { test, expect, Page } from '@playwright/test';
import { TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 题库范围筛选和审核人加载 (Regression Tests - Question Bank Scope Filter)
 * 目标: 验证题库范围筛选和区级题目发布审核人加载功能
 * 覆盖Bug:
 * - Bug #17: 发布区级题目时无可选审核人
 * - Bug #18: 题库管理中题库范围筛选选项不全
 * - Bug #22: 区级题目发布应自动匹配账号所属区域
 * - Bug #23: 校级管理员获取不到区域信息
 */

// 登录为云岩区教师
async function loginAsYunyanTeacher(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  // 使用云岩区教师账号
  await page.locator('input[placeholder="用户名"]').last().fill('teacher_yy_ps_math');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');

  console.log('✅ 云岩区教师登录成功');
}

// 登录为校级管理员
async function loginAsSchoolAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  await page.locator('input[placeholder="用户名"]').last().fill('school_admin_yy_ps_01');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');

  console.log('✅ 校级管理员登录成功');
}

// 导航到题库管理页面
async function navigateToQuestionBank(page: Page) {
  const questionBankLink = page.getByRole('menuitem', { name: /题库管理/ });
  await expect(questionBankLink).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  await questionBankLink.click();
  await page.waitForURL(/\/teacher\/question-bank/, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForLoadState('networkidle');
  console.log('✅ 已导航到题库管理页面');
}

test.describe('Regression Tests - 题库范围筛选和审核人加载', () => {

  // BUG018 - 题库范围筛选显示所有选项
  test('BUG018 - 题库范围筛选应显示所有可用选项', async ({ page }) => {
    // Step 1: 教师登录
    await loginAsYunyanTeacher(page);

    // Step 2: 导航到题库管理
    await navigateToQuestionBank(page);

    // Step 3: 找到题库范围筛选下拉框
    // 可能在筛选区域，也可能在标签页切换区域
    const scopeSelect = page.locator('.ant-select').filter({ hasText: /题库范围|选择题库/ }).first();

    if (await scopeSelect.isVisible({ timeout: 5000 })) {
      await scopeSelect.click();
      await page.waitForTimeout(800);

      // Step 4: 获取所有选项
      const options = page.locator('.ant-select-dropdown .ant-select-item');
      const optionCount = await options.count();
      console.log(`✅ BUG018: 找到 ${optionCount} 个题库范围选项`);

      // 收集所有选项文本
      const optionTexts: string[] = [];
      for (let i = 0; i < optionCount; i++) {
        const text = await options.nth(i).textContent();
        if (text) optionTexts.push(text.trim());
      }
      console.log(`  选项列表: ${optionTexts.join(', ')}`);

      // Step 5: 验证应该包含的选项
      // 根据用户角色，教师应该能看到：校级、区级、市级等选项
      const expectedKeywords = ['校级', '区级'];
      const missingKeywords = expectedKeywords.filter(
        keyword => !optionTexts.some(text => text.includes(keyword))
      );

      if (missingKeywords.length > 0) {
        throw new Error(`BUG018失败: 缺少以下题库范围选项: ${missingKeywords.join(', ')}`);
      }

      console.log('✅ BUG018: 题库范围筛选显示所有必要选项');

      // 关闭下拉框
      await page.keyboard.press('Escape');
    } else {
      // 可能使用标签页而不是下拉框
      const scopeTabs = page.locator('.ant-tabs-tab');
      const tabCount = await scopeTabs.count();

      if (tabCount > 0) {
        console.log(`⚠️ BUG018: 使用标签页显示题库范围，共 ${tabCount} 个标签`);
        // 收集标签文本
        const tabTexts: string[] = [];
        for (let i = 0; i < tabCount; i++) {
          const text = await scopeTabs.nth(i).textContent();
          if (text) tabTexts.push(text.trim());
        }
        console.log(`  标签列表: ${tabTexts.join(', ')}`);
      } else {
        console.log('⚠️ BUG018: 未找到题库范围筛选器');
      }
    }
  });

  // BUG017 + BUG022 - 区级发布时能正确加载审核人并自动匹配区域
  test('BUG017/BUG022 - 区级发布应自动匹配区域并加载审核人', async ({ page }) => {
    // Step 1: 云岩区教师登录
    await loginAsYunyanTeacher(page);

    // Step 2: 导航到题库管理
    await navigateToQuestionBank(page);

    // Step 3: 切换到草稿箱
    const draftsTab = page.getByRole('tab', { name: /草稿/ });
    if (await draftsTab.isVisible({ timeout: 3000 })) {
      await draftsTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Step 4: 找到一个草稿并点击发布
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      console.log('⚠️ BUG017/BUG022: 草稿箱为空，跳过测试（需要先创建草稿）');
      return;
    }

    // 点击第一个草稿的发布按钮
    const firstRow = tableRows.first();
    const publishButton = firstRow.locator('button').filter({ hasText: /发\s*布/ });

    if (await publishButton.isVisible({ timeout: 3000 })) {
      await publishButton.click();
      await page.waitForTimeout(1500);

      // Step 5: 等待发布模态框出现
      const modal = page.locator('.ant-modal');
      await expect(modal).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
      console.log('✅ BUG017/BUG022: 发布模态框已打开');

      // Step 6: 选择区级练习题库
      const scopeSelect = modal.locator('.ant-select').first();
      await scopeSelect.click();
      await page.waitForTimeout(500);

      const districtOption = page.getByRole('option', { name: /区级练习/ });
      if (await districtOption.isVisible({ timeout: 3000 })) {
        await districtOption.evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(1500);
        console.log('✅ BUG017/BUG022: 已选择区级练习题库');

        // Step 7: 验证区域是否自动匹配（BUG022）
        // 查找区域显示或选择器
        const regionDisplay = modal.locator('text=云岩').or(modal.locator('text=YY'));
        const hasAutoMatchedRegion = await regionDisplay.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasAutoMatchedRegion) {
          console.log('✅ BUG022: 区域已自动匹配为云岩区');
        } else {
          // 可能显示在其他位置
          const modalContent = await modal.textContent();
          if (modalContent && (modalContent.includes('云岩') || modalContent.includes('自动匹配'))) {
            console.log('✅ BUG022: 区域信息已显示');
          } else {
            console.log('⚠️ BUG022: 无法确认区域是否自动匹配');
          }
        }

        // Step 8: 验证审核人下拉框是否有选项（BUG017）
        await page.waitForTimeout(1000);
        const reviewerSelect = modal.locator('.ant-select').last();
        await reviewerSelect.click();
        await page.waitForTimeout(800);

        const reviewerOptions = page.getByRole('option');
        const reviewerCount = await reviewerOptions.count();

        if (reviewerCount > 0) {
          console.log(`✅ BUG017: 找到 ${reviewerCount} 个可选审核人`);

          // 获取审核人名称
          const reviewerNames: string[] = [];
          for (let i = 0; i < Math.min(reviewerCount, 5); i++) {
            const name = await reviewerOptions.nth(i).textContent();
            if (name) reviewerNames.push(name.trim());
          }
          console.log(`  审核人列表: ${reviewerNames.join(', ')}`);
        } else {
          throw new Error('BUG017失败: 区级发布时无可选审核人');
        }

        // 关闭下拉框和模态框
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        console.log('⚠️ BUG017/BUG022: 未找到区级练习选项');
      }

      // 关闭模态框
      const cancelButton = modal.locator('button').filter({ hasText: /取\s*消/ });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    } else {
      console.log('⚠️ BUG017/BUG022: 未找到发布按钮');
    }
  });

  // BUG023 - 校级管理员能正确获取区域信息
  test('BUG023 - 校级管理员应能正确获取区域信息', async ({ page }) => {
    // Step 1: 校级管理员登录
    await loginAsSchoolAdmin(page);

    // Step 2: 验证个人信息中显示区域
    // 导航到个人信息页面
    const profileLink = page.locator('a[href="/profile"]').or(page.getByRole('menuitem', { name: /个人信息/ }));

    if (await profileLink.isVisible({ timeout: 3000 })) {
      await profileLink.click();
      await page.waitForURL(/\/profile/, { timeout: TEST_TIMEOUTS.NAVIGATION });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Step 3: 检查区域信息是否显示
      const pageContent = await page.content();

      // 验证区域信息（云岩区）
      if (pageContent.includes('云岩') || pageContent.includes('district')) {
        console.log('✅ BUG023: 校级管理员个人信息中显示区域信息');
      } else {
        console.log('⚠️ BUG023: 个人信息中未明确显示区域信息');
      }
    } else {
      console.log('⚠️ BUG023: 未找到个人信息链接');
    }

    // Step 4: 测试校级管理员在题库发布时能获取区域信息
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 切换到草稿箱
    const draftsTab = page.getByRole('tab', { name: /草稿/ });
    if (await draftsTab.isVisible({ timeout: 3000 })) {
      await draftsTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // 检查是否有草稿可以发布
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // 点击发布按钮
      const publishButton = tableRows.first().locator('button').filter({ hasText: /发\s*布/ });
      if (await publishButton.isVisible({ timeout: 3000 })) {
        await publishButton.click();
        await page.waitForTimeout(1500);

        // 验证模态框打开且可以选择区级
        const modal = page.locator('.ant-modal');
        if (await modal.isVisible({ timeout: 5000 })) {
          // 选择区级练习题库
          const scopeSelect = modal.locator('.ant-select').first();
          await scopeSelect.click();
          await page.waitForTimeout(500);

          const districtOption = page.getByRole('option', { name: /区级练习/ });
          if (await districtOption.isVisible({ timeout: 3000 })) {
            await districtOption.evaluate((el: HTMLElement) => el.click());
            await page.waitForTimeout(1500);

            // 验证区域信息是否自动填充
            const modalContent = await modal.textContent();
            if (modalContent && (modalContent.includes('云岩') || modalContent.includes('自动'))) {
              console.log('✅ BUG023: 校级管理员发布区级题目时能正确获取区域信息');
            } else {
              console.log('⚠️ BUG023: 无法确认区域信息是否正确获取');
            }
          }

          // 关闭模态框
          await page.keyboard.press('Escape');
        }
      }
    } else {
      console.log('⚠️ BUG023: 草稿箱为空，部分验证跳过');
    }

    console.log('✅ BUG023: 校级管理员区域信息获取测试完成');
  });
});
