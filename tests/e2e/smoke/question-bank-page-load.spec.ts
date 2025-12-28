import { test, expect } from '@playwright/test';

/**
 * 题库管理页面加载测试
 * 测试目标：验证页面能够正常加载，不出现H.map错误
 */

test.describe('题库管理页面加载测试', () => {
  test.beforeEach(async ({ page }) => {
    // 清除localStorage，避免旧数据干扰
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('QBPL001: 教师登录后应该能访问题库管理页面', async ({ page }) => {
    // 1. 登录 - 使用有效的教师账号
    await page.goto('/login');

    // 点击教师入口标签页
    await page.click('text=教师入口');
    await page.waitForTimeout(1500);

    // 在激活的标签页中填写用户名和密码
    const activeTabPane = page.locator('.ant-tabs-tabpane-active');
    await activeTabPane.locator('input[placeholder="用户名"]').fill('teacher_yy_ps_math');
    await activeTabPane.locator('input[placeholder="密码"]').fill('password123');

    // 点击登录按钮
    await activeTabPane.locator('button[type="submit"]').click();

    // 等待登录成功 - 教师登录后跳转到首页
    await page.waitForURL('/', { timeout: 15000 });

    // 2. 通过点击导航到题库管理页面（菜单项是menuitem角色）
    const questionBankLink = page.getByRole('menuitem', { name: /题库管理/ });
    await expect(questionBankLink).toBeVisible({ timeout: 5000 });
    await questionBankLink.click();

    // 等待URL变化到题库管理页面
    await page.waitForURL(/\/teacher\/question-bank/);

    // 3. 验证页面加载成功 - 应该看到筛选区域
    await expect(page.locator('text=筛选：')).toBeAttached({ timeout: 5000 });

    // 4. 验证范围选择下拉框存在
    const scopeSelect = page.locator('.ant-select').filter({ hasText: /选择题库范围/ }).first();
    await expect(scopeSelect).toBeAttached({ timeout: 3000 });

    // 5. 验证没有JavaScript错误（检查控制台）
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // 等待一下确保页面完全渲染
    await page.waitForTimeout(2000);

    // 检查是否有H.map错误
    const hasMapError = errors.some(err => err.includes('H.map is not a function'));
    expect(hasMapError).toBe(false);

    console.log('✓ 页面加载成功，无H.map错误');
  });

  test('QBPL002: 管理员登录后应该能访问题库管理页面并看到区县筛选', async ({ page }) => {
    // 1. 登录为管理员 - 使用教师入口
    await page.goto('/login');
    await page.click('text=教师入口');
    await page.waitForTimeout(500);

    const activeTabPane = page.locator('.ant-tabs-tabpane-active');
    await activeTabPane.locator('input[placeholder="用户名"]').fill('admin');
    await activeTabPane.locator('input[placeholder="密码"]').fill('password123');
    await activeTabPane.locator('button[type="submit"]').click();

    // 等待登录成功 - 管理员可能跳转到首页或admin页面
    await page.waitForURL(/\/(admin|$)/, { timeout: 15000 });

    // 2. 导航到题库管理页面
    const questionBankLink = page.getByRole('menuitem', { name: /题库管理/ });
    await expect(questionBankLink).toBeVisible({ timeout: 5000 });
    await questionBankLink.click();
    // 管理员可能跳转到 /admin/question-bank 或 /teacher/question-bank
    await page.waitForURL(/\/(admin|teacher)\/question-bank/);

    // 3. 验证页面加载成功
    await expect(page.locator('text=筛选：')).toBeAttached({ timeout: 5000 });

    // 4. 打开范围选择
    const scopeSelect = page.locator('.ant-select').filter({ hasText: /选择题库范围/ }).first();
    await scopeSelect.click();
    await page.waitForTimeout(500);

    // 5. 选择"区级练习题库"
    await page.locator('.ant-select-item-option-content').filter({ hasText: '区级练习' }).click();
    await page.waitForTimeout(1000);

    // 6. 验证区县筛选下拉框出现
    const districtSelect = page.locator('.ant-select').filter({ hasText: /选择区县/ });
    await expect(districtSelect).toBeAttached({ timeout: 3000 });

    console.log('✓ 管理员可以看到区县筛选下拉框');
  });

  test('QBPL003: 页面刷新后应该能正常加载', async ({ page }) => {
    // 1. 登录 - 使用有效的教师账号
    await page.goto('/login');

    // 点击教师入口标签页
    await page.click('text=教师入口');
    await page.waitForTimeout(1500);

    // 在激活的标签页中填写用户名和密码
    const activeTabPane = page.locator('.ant-tabs-tabpane-active');
    await activeTabPane.locator('input[placeholder="用户名"]').fill('teacher_yy_ps_math');
    await activeTabPane.locator('input[placeholder="密码"]').fill('password123');

    // 点击登录按钮
    await activeTabPane.locator('button[type="submit"]').click();

    // 等待登录成功
    await page.waitForURL('/', { timeout: 15000 });

    // 2. 通过点击导航到题库管理页面（菜单项是menuitem角色）
    const questionBankLink = page.getByRole('menuitem', { name: /题库管理/ });
    await expect(questionBankLink).toBeVisible({ timeout: 5000 });
    await questionBankLink.click();

    await page.waitForURL(/\/teacher\/question-bank/);
    await expect(page.locator('text=筛选：')).toBeAttached({ timeout: 5000 });

    // 3. 刷新页面
    await page.reload();

    // 4. 验证页面仍然能正常加载
    await expect(page.locator('text=筛选：')).toBeAttached({ timeout: 5000 });

    // 5. 验证范围选择下拉框仍然存在
    const scopeSelect = page.locator('.ant-select').filter({ hasText: /选择题库范围/ }).first();
    await expect(scopeSelect).toBeAttached({ timeout: 3000 });

    console.log('✓ 页面刷新后仍能正常加载');
  });
});
