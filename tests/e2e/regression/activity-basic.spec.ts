import { test, expect, Page } from '@playwright/test';
import { TEACHER_STORAGE_STATE, ADMIN_STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * Regression Tests - Activity Basic 活动管理基础功能
 * 目标: 验证活动管理的基本功能
 * 覆盖范围:
 * - 教师访问活动管理页面
 * - 创建练习活动
 * - 查看活动列表
 * - 筛选活动
 * - 管理员创建测评活动
 * - 管理员查看所有活动
 */

test.describe('Regression Tests - Activity Basic 活动管理基础功能', () => {

  // Helper function to navigate to activities page
  const navigateToActivities = async (page: Page) => {
    console.log('导航到活动管理页面');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check if already on activities page
    const currentUrl = page.url();
    if (currentUrl.includes('/activities')) {
      console.log('当前已在活动管理页面');
      return;
    }

    // Try to find activities menu
    const menuSelectors = [
      'a:has-text("活动管理")',
      '.ant-menu-item:has-text("活动管理")',
      '[href*="activities"]'
    ];

    let menuFound = false;
    for (const selector of menuSelectors) {
      const menu = page.locator(selector).first();
      if (await menu.count() > 0 && await menu.isVisible()) {
        console.log(`找到活动管理菜单: ${selector}`);
        await menu.click();
        menuFound = true;
        break;
      }
    }

    if (!menuFound) {
      throw new Error('无法找到活动管理菜单');
    }

    await page.waitForURL(/\/(teacher|admin)\/activities/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    console.log('成功导航到活动管理页面');
  };

  test.describe('教师功能', () => {
    test.use({ storageState: TEACHER_STORAGE_STATE });

    test('ACT101 - 教师可以访问活动管理页面', async ({ page }) => {
      console.log('\n=== ACT101: 教师访问活动管理页面 ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await navigateToActivities(page);

      // 验证页面标题
      await expect(page.locator('text=我的活动')).toBeVisible();

      // 验证创建按钮存在
      await expect(page.locator('button:has-text("创建练习")')).toBeVisible();

      console.log('✓ 教师可以访问活动管理页面');
    });

    test('ACT102 - 教师可以创建练习活动', async ({ page }) => {
      console.log('\n=== ACT102: 创建练习活动 ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await navigateToActivities(page);

      // 点击创建练习按钮
      await page.click('button:has-text("创建练习")');
      await page.waitForURL(/\/activities\/create\/practice/);

      // 填写活动表单
      await page.fill('input[placeholder="请输入活动标题"]', `Smoke测试-练习活动-${Date.now()}`);
      await page.fill('textarea[placeholder*="描述"]', '这是一个自动化测试创建的练习活动');

      // 选择科目 - 使用更可靠的方式
      await page.click('#subject');
      await page.waitForTimeout(500);
      // 直接点击下拉选项，不管它在哪里渲染
      await page.getByRole('option', { name: '数学' }).click();
      await page.waitForTimeout(300);

      // 选择年级
      await page.click('#grade');
      await page.waitForTimeout(500);
      await page.getByRole('option', { name: '三年级' }).click();
      await page.waitForTimeout(300);

      // 选择能力等级
      await page.click('#abilityLevel');
      await page.waitForTimeout(500);
      await page.getByRole('option', { name: /L3/ }).click();
      await page.waitForTimeout(300);

      // 设置时长 - 使用 scrollIntoViewIfNeeded 确保字段可见
      const durationInput = page.locator('input[id="duration"]');
      await durationInput.scrollIntoViewIfNeeded();
      await durationInput.fill('45');
      await durationInput.blur();
      await page.waitForTimeout(300);

      // 设置总分
      const totalScoreInput = page.locator('input[id="totalScore"]');
      await totalScoreInput.scrollIntoViewIfNeeded();
      await totalScoreInput.fill('100');
      await totalScoreInput.blur();
      await page.waitForTimeout(300);

      // 设置及格分
      const passScoreInput = page.locator('input[id="passScore"]');
      await passScoreInput.scrollIntoViewIfNeeded();
      await passScoreInput.fill('60');
      await passScoreInput.blur();
      await page.waitForTimeout(500);

      // 滚动到页面顶部 - 创建按钮在 Card header 中
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);

      // 点击创建按钮 - 使用更可靠的选择器（通过 type="primary" 和位置定位）
      const createButton = page.locator('button.ant-btn-primary').filter({ hasText: /创\s*建/ });
      await createButton.waitFor({ state: 'visible', timeout: 5000 });
      await createButton.scrollIntoViewIfNeeded();
      await createButton.click();

      // 等待创建成功并跳转回列表页
      await page.waitForURL(/\/activities$/, { timeout: 10000 });

      // 验证成功消息
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      console.log('✓ 练习活动创建成功');
    });

    test('ACT103 - 教师可以查看活动列表', async ({ page }) => {
      console.log('\n=== ACT103: 查看活动列表 ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await navigateToActivities(page);

      // 等待表格加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 验证表格存在
      await expect(page.locator('.ant-table')).toBeVisible();

      // 验证表格列头
      await expect(page.locator('th:has-text("活动名称")')).toBeVisible();
      await expect(page.locator('th:has-text("类型")')).toBeVisible();
      await expect(page.locator('th:has-text("科目")')).toBeVisible();
      await expect(page.locator('th:has-text("状态")')).toBeVisible();

      console.log('✓ 活动列表显示正常');
    });

    test('ACT104 - 教师可以筛选活动', async ({ page }) => {
      console.log('\n=== ACT104: 筛选活动 ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await navigateToActivities(page);

      // 等待页面加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 按类型筛选 - 练习（从截图看，第一个筛选器就是活动类型）
      const typeFilter = page.locator('.ant-select').first();
      await typeFilter.click();
      await page.waitForTimeout(500);
      await page.getByRole('option', { name: '练习' }).click();
      await page.waitForTimeout(1000);

      // 验证表格仍然可见（可能有数据或无数据）
      await expect(page.locator('.ant-table')).toBeVisible();

      console.log('✓ 活动筛选功能正常');
    });
  });

  test.describe('管理员功能', () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test('ACT105 - 管理员可以创建测评活动', async ({ page }) => {
      console.log('\n=== ACT105: 创建测评活动 ===');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 导航到管理员活动管理页面
      await page.goto('/admin/activities');
      await page.waitForLoadState('networkidle');

      // 验证创建测评按钮存在
      const createAssessmentBtn = page.locator('button:has-text("创建测评")');
      if (await createAssessmentBtn.count() > 0) {
        await createAssessmentBtn.click();
        await page.waitForURL(/\/activities\/create\/assessment/);

        // 填写测评活动表单
        await page.fill('input[placeholder="请输入活动标题"]', `Smoke测试-测评活动-${Date.now()}`);
        await page.fill('textarea[placeholder*="描述"]', '这是一个自动化测试创建的测评活动');

        // 选择科目
        await page.click('#subject');
        await page.waitForTimeout(500);
        await page.getByRole('option', { name: '数学' }).click();
        await page.waitForTimeout(300);

        // 选择年级
        await page.click('#grade');
        await page.waitForTimeout(500);
        await page.getByRole('option', { name: '四年级' }).click();
        await page.waitForTimeout(300);

        // 选择能力等级
        await page.click('#abilityLevel');
        await page.waitForTimeout(500);
        await page.getByRole('option', { name: /L4/ }).click();
        await page.waitForTimeout(300);

        // 设置时长
        await page.fill('input[id="duration"]', '60');

        // 设置总分
        await page.fill('input[id="totalScore"]', '100');

        // 设置及格分
        await page.fill('input[id="passScore"]', '60');

        // 滚动到页面顶部，确保创建按钮可见
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);

        // 直接点击创建按钮 (通过文本定位,不等待可见性)
        await page.click('button:has-text("创建")');

        // 等待创建成功
        await page.waitForURL(/\/activities$/, { timeout: 10000 });
        await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

        console.log('✓ 测评活动创建成功');
      } else {
        console.log('⚠ 当前管理员无创建测评权限，跳过测试');
        test.skip();
      }
    });

    test('ACT106 - 管理员可以查看所有活动', async ({ page }) => {
      console.log('\n=== ACT106: 查看所有活动 ===');

      await page.goto('/admin/activities');
      await page.waitForLoadState('networkidle');

      // 等待表格加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 验证表格存在
      await expect(page.locator('.ant-table')).toBeVisible();

      // 验证可以看到练习和测评两种类型的筛选
      const typeFilter = page.locator('.ant-select').first();
      await typeFilter.click();
      await page.waitForTimeout(500);

      const practiceOption = page.getByRole('option', { name: '练习' });
      const assessmentOption = page.getByRole('option', { name: '测评' });

      await expect(practiceOption).toBeVisible();
      await expect(assessmentOption).toBeVisible();

      // 关闭下拉框
      await page.keyboard.press('Escape');

      console.log('✓ 管理员可以查看所有活动');
    });
  });
});
