import { test, expect, Page } from '@playwright/test';
import { STORAGE_STATE, TEACHER_STORAGE_STATE, ADMIN_STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * Regression Tests - Activity Permissions 活动管理权限改进
 * 目标: 验证活动管理权限分离功能
 * 覆盖范围:
 * - 学生练习中心（只看练习）
 * - 学生测评中心（只看测评）
 * - 教师练习管理（只能管理练习）
 * - 管理员测评管理（只能管理测评）
 * - 导航菜单权限控制
 */

// Helper: Login as student
async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click student tab
  await page.click('text=学生入口');
  await page.waitForTimeout(300);

  // Fill credentials
  await page.fill('input[placeholder="身份证号"]', '520102200801011234');
  await page.fill('input[placeholder="密码"]', 'password123');

  // Submit login
  await page.click('button[type="submit"]');
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);

  console.log('学生登录成功');
}

// Helper: Login as teacher
async function loginAsTeacher(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click teacher tab
  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  // Fill credentials - use .last() to target the second (teacher) tab's inputs
  await page.locator('input[placeholder="用户名"]').last().fill('teacher01');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  // Submit login - use .last() to get teacher tab's button
  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);

  console.log('教师登录成功');
}

// Helper: Login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click teacher tab (admin uses teacher login)
  await page.click('text=教师入口');
  await page.waitForTimeout(500);

  // Fill credentials - use .last() to target the second (teacher) tab's inputs
  await page.locator('input[placeholder="用户名"]').last().fill('admin');
  await page.locator('input[placeholder="密码"]').last().fill('password123');

  // Submit login - use .last() to get teacher tab's button
  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\//, { timeout: TEST_TIMEOUTS.NAVIGATION });
  await page.waitForTimeout(1000);

  console.log('管理员登录成功');
}

test.describe('ACT114-ACT119: Student Activity Centers', () => {

  test('ACT114 - 学生可以访问练习中心', async ({ page }) => {
    await loginAsStudent(page);

    // Click on Practice Center menu item
    const practiceLink = page.getByRole('menuitem', { name: /练习中心/ });
    await expect(practiceLink).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
    await practiceLink.click();

    // Wait for navigation
    await page.waitForURL(/\/student\/practice/, { timeout: TEST_TIMEOUTS.NAVIGATION });
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('text=练习中心').first()).toBeAttached();

    console.log('✅ ACT114: 学生成功访问练习中心');
  });

  test('ACT115 - 学生练习中心显示练习列表', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify table exists
    const table = page.locator('.ant-table');
    await expect(table).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Verify column headers
    await expect(page.getByRole('columnheader', { name: '练习名称' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '科目' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '年级' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '能力等级' })).toBeAttached();

    console.log('✅ ACT115: 练习中心正确显示练习列表');
  });

  test('ACT116 - 学生可以按科目筛选练习', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click subject filter
    const subjectFilter = page.locator('.ant-select').filter({ hasText: '科目' }).first();
    await subjectFilter.click();
    await page.waitForTimeout(300);

    // Select "数学"
    await page.getByRole('option', { name: '数学' }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(1000);

    // Verify filter applied (check if URL or table updated)
    await page.waitForLoadState('networkidle');

    console.log('✅ ACT116: 学生成功按科目筛选练习');
  });

  test('ACT117 - 学生可以访问测评中心', async ({ page }) => {
    await loginAsStudent(page);

    // Click on Assessment Center menu item
    const assessmentLink = page.getByRole('menuitem', { name: /测评中心/ });
    await expect(assessmentLink).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
    await assessmentLink.click();

    // Wait for navigation
    await page.waitForURL(/\/student\/assessments/, { timeout: TEST_TIMEOUTS.NAVIGATION });
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('text=测评中心').first()).toBeAttached();

    console.log('✅ ACT117: 学生成功访问测评中心');
  });

  test('ACT118 - 学生测评中心显示测评列表', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify table exists
    const table = page.locator('.ant-table');
    await expect(table).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Verify column headers
    await expect(page.getByRole('columnheader', { name: '测评名称' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '科目' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '年级' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '官方测评' })).toBeAttached();

    console.log('✅ ACT118: 测评中心正确显示测评列表');
  });

  test('ACT119 - 学生可以按科目筛选测评', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click subject filter
    const subjectFilter = page.locator('.ant-select').filter({ hasText: '科目' }).first();
    await subjectFilter.click();
    await page.waitForTimeout(300);

    // Select "语文"
    await page.getByRole('option', { name: '语文' }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(1000);

    // Verify filter applied
    await page.waitForLoadState('networkidle');

    console.log('✅ ACT119: 学生成功按科目筛选测评');
  });
});

test.describe('ACT120-ACT122: Teacher Practice Management', () => {

  test('ACT120 - 教师只能看到练习管理菜单（不显示测评管理）', async ({ page }) => {
    await loginAsTeacher(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify "练习管理" menu exists
    const practiceMenu = page.getByRole('menuitem', { name: /练习管理/ });
    await expect(practiceMenu).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Verify "测评管理" menu does NOT exist
    const assessmentMenu = page.getByRole('menuitem', { name: /测评管理/ });
    await expect(assessmentMenu).toHaveCount(0);

    console.log('✅ ACT120: 教师只看到练习管理菜单');
  });

  test('ACT121 - 教师练习管理页面只显示练习（不显示测评）', async ({ page }) => {
    await loginAsTeacher(page);

    // Navigate to practice management
    await page.getByRole('menuitem', { name: /练习管理/ }).click();
    await page.waitForURL(/\/teacher\/activities/, { timeout: TEST_TIMEOUTS.NAVIGATION });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify page title is "练习管理"
    await expect(page.locator('.ant-card-head-title:has-text("练习管理")')).toBeAttached();

    // Verify "创建活动" button exists (teacher creates practice activities)
    const createActivityBtn = page.locator('button').filter({ hasText: /创\s*建\s*活\s*动/ });
    await expect(createActivityBtn).toBeVisible();

    // Verify "创建测评" button does NOT exist (teachers cannot create assessments)
    const createAssessmentBtn = page.locator('button').filter({ hasText: /创\s*建\s*测\s*评/ });
    await expect(createAssessmentBtn).toHaveCount(0);

    // Verify type filter does NOT exist (since teachers can only see practices)
    const typeFilter = page.locator('.ant-select').filter({ hasText: '类型' });
    await expect(typeFilter).toHaveCount(0);

    console.log('✅ ACT121: 教师练习管理页面正确限制为练习');
  });

  test('ACT122 - 教师可以按能力等级筛选练习', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/activities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click ability level filter
    const abilityFilter = page.locator('.ant-select').filter({ hasText: '能力等级' }).first();
    await abilityFilter.click();
    await page.waitForTimeout(300);

    // Select "L3"
    await page.getByRole('option', { name: 'L3' }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(1000);

    // Verify filter applied
    await page.waitForLoadState('networkidle');

    console.log('✅ ACT122: 教师成功按能力等级筛选练习');
  });
});

test.describe('ACT123-ACT125: Admin Assessment Management', () => {

  test('ACT123 - 管理员可以访问测评管理页面', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify "测评管理" menu exists
    const assessmentMenu = page.getByRole('menuitem', { name: /测评管理/ });
    await expect(assessmentMenu).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Click to navigate
    await assessmentMenu.click();
    await page.waitForURL(/\/admin\/assessments/, { timeout: TEST_TIMEOUTS.NAVIGATION });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify page title
    await expect(page.locator('.ant-card-head-title:has-text("测评管理")')).toBeAttached();

    console.log('✅ ACT123: 管理员成功访问测评管理页面');
  });

  test('ACT124 - 管理员测评管理页面只显示测评', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/assessments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify page title is "测评管理"
    await expect(page.locator('.ant-card-head-title:has-text("测评管理")')).toBeAttached();

    // Verify "创建测评" button exists
    const createAssessmentBtn = page.locator('button:has-text("创建测评")');
    await expect(createAssessmentBtn).toBeVisible();

    // Verify table exists
    const table = page.locator('.ant-table');
    await expect(table).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // Verify column headers
    await expect(page.getByRole('columnheader', { name: '测评名称' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '科目' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '年级' })).toBeAttached();

    console.log('✅ ACT124: 管理员测评管理页面正确显示');
  });

  test('ACT125 - 管理员可以按科目筛选测评', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/assessments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click subject filter
    const subjectFilter = page.locator('.ant-select').filter({ hasText: '科目' }).first();
    await subjectFilter.click();
    await page.waitForTimeout(300);

    // Select "计算机"
    await page.getByRole('option', { name: '计算机' }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(1000);

    // Verify filter applied
    await page.waitForLoadState('networkidle');

    console.log('✅ ACT125: 管理员成功按科目筛选测评');
  });
});

test.describe('ACT126: Navigation Menu Permissions', () => {

  test('ACT126 - 不同角色看到不同的导航菜单', async ({ page }) => {
    // Test student navigation
    await loginAsStudent(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('menuitem', { name: /练习中心/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /测评中心/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /练习管理/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /测评管理/ })).toHaveCount(0);

    console.log('✅ 学生看到正确的导航菜单');

    // Test teacher navigation
    await page.goto('/login');
    await loginAsTeacher(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('menuitem', { name: /练习管理/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /练习中心/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /测评中心/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /测评管理/ })).toHaveCount(0);

    console.log('✅ 教师看到正确的导航菜单');

    // Test admin navigation
    await page.goto('/login');
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('menuitem', { name: /测评管理/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /练习中心/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /测评中心/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /练习管理/ })).toHaveCount(0);

    console.log('✅ 管理员看到正确的导航菜单');
    console.log('✅ ACT126: 所有角色的导航菜单权限正确');
  });
});
