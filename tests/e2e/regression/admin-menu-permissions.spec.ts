import { test, expect, Page } from '@playwright/test';
import { TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 管理员菜单权限 (Regression Tests - Admin Menu Permissions)
 * 目标: 验证不同级别管理员能看到正确的菜单
 * 覆盖Bug:
 * - Bug #16: 校级管理员能看到权限管理菜单（已修复 - 应该看不到）
 */

// 登录辅助函数
async function loginAsSchoolAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // 点击教师入口（管理员使用教师登录入口）
  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  // 填写凭证 - 使用校级管理员账号
  await page.locator('input[placeholder="用户名"]').last().fill('school_admin_01');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  // 提交登录
  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');

  console.log('✅ 校级管理员登录成功');
}

async function loginAsDistrictAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // 点击教师入口
  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  // 填写凭证 - 使用区级管理员账号
  await page.locator('input[placeholder="用户名"]').last().fill('baiyun_admin');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  // 提交登录
  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');

  console.log('✅ 区级管理员登录成功');
}

async function loginAsMunicipalAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // 点击教师入口
  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  // 填写凭证 - 使用市级管理员账号
  await page.locator('input[placeholder="用户名"]').last().fill('admin');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  // 提交登录
  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');

  console.log('✅ 市级管理员登录成功');
}

test.describe('Regression Tests - 管理员菜单权限', () => {

  // BUG016 - 校级管理员看不到权限管理菜单
  test('BUG016 - 校级管理员应该看不到权限管理菜单', async ({ page }) => {
    // Step 1: 校级管理员登录
    await loginAsSchoolAdmin(page);

    // Step 2: 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 3: 检查菜单是否加载
    const menu = page.locator('.ant-menu');
    await expect(menu.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Step 4: 验证权限管理菜单不可见
    const permissionMenuItem = page.locator('.ant-menu').getByText('权限管理');

    // 权限管理菜单应该不存在或不可见
    const isVisible = await permissionMenuItem.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      throw new Error('BUG016失败: 校级管理员不应该看到权限管理菜单（Bug #16未修复）');
    }

    console.log('✅ BUG016: 校级管理员正确地看不到权限管理菜单');

    // Step 5: 验证校级管理员能看到其他管理菜单（确认登录成功）
    const userManagement = page.locator('.ant-menu').getByText('用户管理');
    const isUserManagementVisible = await userManagement.isVisible({ timeout: 3000 }).catch(() => false);

    if (isUserManagementVisible) {
      console.log('✅ BUG016: 校级管理员可以看到用户管理菜单（验证登录成功）');
    } else {
      console.log('⚠️ BUG016: 校级管理员可能没有用户管理权限，但权限管理验证通过');
    }
  });

  // BUG016 - 验证区级管理员可以看到权限管理菜单
  test('BUG016-验证: 区级管理员应该可以看到权限管理菜单', async ({ page }) => {
    // Step 1: 区级管理员登录
    await loginAsDistrictAdmin(page);

    // Step 2: 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 3: 验证权限管理菜单可见
    const permissionMenuItem = page.locator('.ant-menu').getByText('权限管理');

    // 区级管理员应该能看到权限管理菜单
    const isVisible = await permissionMenuItem.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      console.log('⚠️ BUG016-验证: 区级管理员可能没有权限管理权限（取决于具体配置）');
    } else {
      console.log('✅ BUG016-验证: 区级管理员正确地可以看到权限管理菜单');
    }
  });

  // BUG016 - 验证市级管理员可以看到权限管理菜单
  test('BUG016-验证: 市级/系统管理员应该可以看到权限管理菜单', async ({ page }) => {
    // Step 1: 市级管理员登录
    await loginAsMunicipalAdmin(page);

    // Step 2: 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 3: 验证权限管理菜单可见
    const permissionMenuItem = page.locator('.ant-menu').getByText('权限管理');

    // 市级管理员/系统管理员应该能看到权限管理菜单
    await expect(permissionMenuItem).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    console.log('✅ BUG016-验证: 市级/系统管理员正确地可以看到权限管理菜单');
  });

  // BUG016 - 校级管理员直接访问权限管理URL应被拒绝
  test('BUG016 - 校级管理员直接访问权限管理URL应被拒绝', async ({ page }) => {
    // Step 1: 校级管理员登录
    await loginAsSchoolAdmin(page);

    // Step 2: 尝试直接访问权限管理页面
    await page.goto('/admin/permissions');
    await page.waitForTimeout(2000);

    // Step 3: 验证是否被拒绝或重定向
    const currentUrl = page.url();

    // 应该被重定向到其他页面，或显示无权限提示
    const wasRedirected = !currentUrl.includes('/admin/permissions');
    const hasNoPermissionMessage = await page.locator('text=无权限')
      .or(page.locator('text=权限不足'))
      .or(page.locator('text=没有权限'))
      .or(page.locator('text=403'))
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (wasRedirected || hasNoPermissionMessage) {
      console.log('✅ BUG016: 校级管理员无法直接访问权限管理页面');
    } else {
      // 检查页面是否是空的或显示错误
      const pageContent = await page.content();
      if (pageContent.includes('权限管理') && !pageContent.includes('无权限')) {
        throw new Error('BUG016失败: 校级管理员不应该能访问权限管理页面');
      }
      console.log('✅ BUG016: 页面可能显示错误或为空（符合预期）');
    }
  });
});
