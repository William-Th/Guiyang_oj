/**
 * Profile Page E2E Tests
 * 个人信息页面端到端测试
 *
 * Test Coverage:
 * - PRF001-PRF002: Smoke tests (访问个人信息页面)
 * - PRF101-PRF110: Student profile tests (学生个人信息)
 * - PRF121-PRF129: Teacher profile tests (教师个人信息)
 */

import { test, expect, Page } from '@playwright/test';
import { STORAGE_STATE, TEACHER_STORAGE_STATE } from '../test-config';

// Test configuration
const BASE_URL = 'http://localhost:80';
const API_URL = 'http://localhost:3001/api';

// Test accounts
const STUDENT_ACCOUNT = {
  username: '13800138003',
  password: 'password123',
  role: 'student'
};

const TEACHER_ACCOUNT = {
  username: 'teacher_yy_ps_math',
  password: 'password123',
  role: 'teacher'
};

/**
 * Login helper function
 */
async function loginAs(page: Page, username: string, password: string) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[placeholder*="手机号"], input[placeholder*="用户名"]', username);
  await page.fill('input[type="password"]', password);

  // Click login button
  await page.locator('button:has-text("登录")').click();

  // Wait for navigation
  await page.waitForURL(/\/(student|teacher|admin)/);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to profile page by clicking user dropdown
 * ✅ 最佳实践: 通过点击导航而非直接URL跳转
 */
async function navigateToProfile(page: Page) {
  // Wait for page to be ready
  await page.waitForLoadState('networkidle');

  // Click user avatar to open dropdown menu
  const userAvatar = page.locator('.ant-dropdown-trigger').first();
  await expect(userAvatar).toBeVisible({ timeout: 5000 });
  await userAvatar.click();

  // Wait for dropdown menu to appear
  await page.waitForTimeout(500);

  // Click "个人信息" menu item
  const profileMenuItem = page.locator('.ant-dropdown-menu-item:has-text("个人信息")');
  await expect(profileMenuItem).toBeVisible({ timeout: 5000 });
  await profileMenuItem.click();

  // Verify navigation to profile page
  await page.waitForURL(/\/profile/);
  await page.waitForLoadState('networkidle');
}

/**
 * Get original profile data for restoration
 */
async function getOriginalProfileData(page: Page): Promise<any> {
  const realName = await page.locator('text=/真实姓名/ + *').textContent();
  const phone = await page.locator('text=/手机号/ + *').textContent();
  const email = await page.locator('text=/邮箱/ + *').textContent();

  return {
    realName: realName?.trim(),
    phone: phone?.trim(),
    email: email?.trim()
  };
}

/**
 * Restore profile data
 */
async function restoreProfileData(page: Page, originalData: any, role: string) {
  // Click edit button
  await page.locator('button:has-text("编辑个人信息")').click();
  await page.waitForTimeout(1000);

  // Restore basic fields
  if (originalData.realName && originalData.realName !== '未设置') {
    await page.fill('input[id*="realName"]', originalData.realName);
  }
  if (originalData.phone && originalData.phone !== '未设置') {
    await page.fill('input[id*="phone"]', originalData.phone);
  }
  if (originalData.email && originalData.email !== '未设置') {
    await page.fill('input[id*="email"]', originalData.email);
  }

  // Click save
  const saveButton = page.locator('button:has-text("保存")').first();
  await saveButton.click();

  // Wait for success message
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);
}

// =============================================================================
// Smoke Tests (PRF001-PRF002)
// =============================================================================

test.describe('Profile Page - Smoke Tests - Student', () => {
  test.use({ storageState: STORAGE_STATE });

  test('PRF001 - 学生访问个人信息页面', async ({ page }) => {
    // ✅ 最佳实践: 从首页开始，通过点击导航进入个人信息页面
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Navigate to profile page by clicking user dropdown menu
    await navigateToProfile(page);

    // Verify page loaded
    await expect(page.locator('.ant-card-head-title:has-text("个人信息")')).toBeVisible();

    // Verify user avatar in profile card (not the header avatar)
    await expect(page.locator('.ant-card-body .ant-avatar').first()).toBeVisible();

    // Verify edit button
    await expect(page.locator('button:has-text("编辑个人信息")')).toBeVisible();
  });
});

test.describe('Profile Page - Smoke Tests - Teacher', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  test('PRF002 - 教师访问个人信息页面', async ({ page }) => {
    // ✅ 最佳实践: 从首页开始，通过点击导航进入个人信息页面
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Navigate to profile page by clicking user dropdown menu
    await navigateToProfile(page);

    // Verify page loaded
    await expect(page.locator('.ant-card-head-title:has-text("个人信息")')).toBeVisible();

    // Verify user avatar in profile card (not the header avatar)
    await expect(page.locator('.ant-card-body .ant-avatar').first()).toBeVisible();

    // Verify edit button
    await expect(page.locator('button:has-text("编辑个人信息")')).toBeVisible();
  });
});

// =============================================================================
// Student Profile Tests (PRF101-PRF110)
// =============================================================================

test.describe('Profile Page - Student Tests', () => {
  test.use({ storageState: STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    // ✅ 最佳实践: 从首页开始，通过点击导航进入个人信息页面
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Navigate to profile page by clicking user dropdown menu
    await navigateToProfile(page);
  });

  test('PRF101 - 学生查看个人信息-完整字段显示', async ({ page }) => {
    // Verify all student-specific fields are displayed
    const expectedFields = [
      '真实姓名',
      '用户名',
      '用户角色',
      '学号',
      '年级',
      '班级',
      '所属学校',
      '所属区域',
      '监护人姓名',
      '监护人手机号',
      '邮箱',
      '手机号'
    ];

    for (const field of expectedFields) {
      await expect(page.locator(`text=/^${field}/`)).toBeVisible();
    }

    // Verify role is "学生" (select specific element in descriptions)
    await expect(page.locator('.ant-descriptions-item-content').filter({ hasText: '学生' }).first()).toBeVisible();

    // Bug #2: Verify registration time field is NOT displayed (security concern)
    const registrationTimeField = page.locator('text=/注册时间/');
    await expect(registrationTimeField).not.toBeVisible();
  });

  test('PRF102 - 学生编辑基本信息（姓名、手机、邮箱）', async ({ page }) => {
    const timestamp = Date.now();
    const testName = `PRF102-测试学生-${timestamp}`;
    const testPhone = '13900001102';
    const testEmail = 'prf102@test.com';

    // Get original data
    const originalData = await getOriginalProfileData(page);

    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Verify in edit mode
    await expect(page.locator('button:has-text("保存")')).toBeVisible();

    // Edit fields
    await page.fill('input[id*="realName"]', testName);
    await page.fill('input[id*="phone"]', testPhone);
    await page.fill('input[id*="email"]', testEmail);

    // Save
    await page.locator('button:has-text("保存")').first().click();

    // Wait for success message
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify updated values are displayed
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${testPhone}`)).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();

    // Restore original data
    await restoreProfileData(page, originalData, 'student');
  });

  test('PRF103 - 学生编辑学校信息（学校、年级、班级）', async ({ page }) => {
    const timestamp = Date.now();

    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1500);

    // Click school dropdown
    const schoolSelect = page.locator('label:has-text("所属学校") + * .ant-select-selector').first();
    await schoolSelect.click();
    await page.waitForTimeout(800);

    // Verify school list is displayed (should have at least 10 schools)
    const schoolOptions = page.locator('.ant-select-dropdown .ant-select-item');
    const count = await schoolOptions.count();
    expect(count).toBeGreaterThan(10);

    // Search and select a school
    await page.locator('.ant-select-dropdown input[type="search"]').fill('贵阳市第二小学');
    await page.waitForTimeout(500);

    const targetSchool = page.locator('.ant-select-item:has-text("贵阳市第二小学")').first();
    await targetSchool.click();
    await page.waitForTimeout(500);

    // Fill grade and class
    await page.fill('input[id*="grade"]', '四年级');
    await page.fill('input[id*="class"]', `PRF103班-${timestamp}`);

    // Save
    await page.locator('button:has-text("保存")').first().click();

    // Wait for success
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify updates
    await expect(page.locator('text=贵阳市第二小学')).toBeVisible();
    await expect(page.locator('text=四年级')).toBeVisible();
  });

  test('PRF104 - 学生编辑监护人信息', async ({ page }) => {
    const timestamp = Date.now();
    const guardianName = `PRF104-监护人-${timestamp}`;
    const guardianPhone = '13900001104';

    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Edit guardian fields
    await page.fill('input[id*="guardianName"]', guardianName);
    await page.fill('input[id*="guardianPhone"]', guardianPhone);

    // Save
    await page.locator('button:has-text("保存")').first().click();

    // Wait for success
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify updates
    await expect(page.locator(`text=${guardianName}`)).toBeVisible();
    await expect(page.locator(`text=${guardianPhone}`)).toBeVisible();
  });

  test('PRF105 - 学生编辑-学校下拉选择功能', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1500);

    // Click school dropdown
    const schoolSelect = page.locator('label:has-text("所属学校") + * .ant-select-selector').first();
    await schoolSelect.click();
    await page.waitForTimeout(800);

    // Verify school list displayed
    await expect(page.locator('.ant-select-dropdown')).toBeVisible();

    // Search for schools in 白云区
    await page.locator('.ant-select-dropdown input[type="search"]').fill('白云区');
    await page.waitForTimeout(500);

    // Verify filtered results contain 白云区
    const filteredOptions = page.locator('.ant-select-item:visible');
    const firstOption = filteredOptions.first();
    await expect(firstOption).toContainText('白云区');

    // Select first school
    await firstOption.click();
    await page.waitForTimeout(500);

    // Verify selection displayed in dropdown
    const selectedValue = await schoolSelect.textContent();
    expect(selectedValue).toContain('白云区');

    // Cancel without saving
    await page.locator('button:has-text("取消")').click();
  });

  test('PRF106 - 学生编辑-手机号格式验证', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Enter invalid phone number
    await page.fill('input[id*="phone"]', '1234567890');

    // Try to save
    await page.locator('button:has-text("保存")').first().click();
    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('.ant-form-item-explain-error:has-text("手机号")')).toBeVisible();

    // Enter valid phone number
    await page.fill('input[id*="phone"]', '13900001106');

    // Save should succeed now
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  });

  test('PRF107 - 学生编辑-邮箱格式验证', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Enter invalid email
    await page.fill('input[id*="email"]', 'invalid-email');

    // Try to save
    await page.locator('button:has-text("保存")').first().click();
    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('.ant-form-item-explain-error:has-text("邮箱")')).toBeVisible();

    // Enter valid email
    await page.fill('input[id*="email"]', 'prf107@test.com');

    // Save should succeed now
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  });

  test('PRF108 - 学生编辑-监护人手机号格式验证', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Enter invalid guardian phone
    await page.fill('input[id*="guardianPhone"]', '1234567890');

    // Try to save
    await page.locator('button:has-text("保存")').first().click();
    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('.ant-form-item-explain-error:has-text("手机号")')).toBeVisible();

    // Enter valid phone
    await page.fill('input[id*="guardianPhone"]', '13900001108');

    // Save should succeed
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  });

  test('PRF109 - 学生编辑-取消编辑恢复原值', async ({ page }) => {
    // Get original values
    const originalName = await page.locator('text=/真实姓名/ + *').textContent();

    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Modify fields
    await page.fill('input[id*="realName"]', 'PRF109-临时修改');
    await page.fill('input[id*="phone"]', '13900001109');

    // Click cancel
    await page.locator('button:has-text("取消")').click();
    await page.waitForTimeout(500);

    // Verify values are restored
    await expect(page.locator(`text=${originalName}`)).toBeVisible();
    await expect(page.locator('text=PRF109-临时修改')).not.toBeVisible();
  });

  test('PRF110 - 学生编辑-保存后数据持久化验证', async ({ page }) => {
    const timestamp = Date.now();
    const testName = `PRF110-${timestamp}`;
    const testGrade = `PRF110-五年级`;
    const testClass = `PRF110-1班`;

    // Get original data
    const originalData = await getOriginalProfileData(page);

    // Click edit and modify
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    await page.fill('input[id*="realName"]', testName);
    await page.fill('input[id*="grade"]', testGrade);
    await page.fill('input[id*="class"]', testClass);

    // Save
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify data is displayed
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify data persists after refresh
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${testGrade}`)).toBeVisible();
    await expect(page.locator(`text=${testClass}`)).toBeVisible();

    // Restore original data
    await restoreProfileData(page, originalData, 'student');
  });
});

// =============================================================================
// Teacher Profile Tests (PRF121-PRF129)
// =============================================================================

test.describe('Profile Page - Teacher Tests', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    // ✅ 最佳实践: 从首页开始，通过点击导航进入个人信息页面
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Navigate to profile page by clicking user dropdown menu
    await navigateToProfile(page);
  });

  test('PRF121 - 教师查看个人信息-完整字段显示', async ({ page }) => {
    // Verify all teacher-specific fields are displayed
    const expectedFields = [
      '真实姓名',
      '用户名',
      '用户角色',
      '教师编号',
      '任教科目',
      '职称',
      '所属学校',
      '所属区域',
      '邮箱',
      '手机号'
    ];

    for (const field of expectedFields) {
      await expect(page.locator(`text=/^${field}/`)).toBeVisible();
    }

    // Verify role is "教师" (select specific element in descriptions)
    await expect(page.locator('.ant-descriptions-item-content').filter({ hasText: /^教师$/ }).first()).toBeVisible();

    // Bug #2: Verify registration time field is NOT displayed (security concern)
    const registrationTimeField = page.locator('text=/注册时间/');
    await expect(registrationTimeField).not.toBeVisible();
  });

  test('PRF122 - 教师编辑基本信息（姓名、手机、邮箱）', async ({ page }) => {
    const timestamp = Date.now();
    const testName = `PRF122-测试教师-${timestamp}`;
    const testPhone = '13900001122';
    const testEmail = 'prf122@test.com';

    // Get original data
    const originalData = await getOriginalProfileData(page);

    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Edit fields
    await page.fill('input[id*="realName"]', testName);
    await page.fill('input[id*="phone"]', testPhone);
    await page.fill('input[id*="email"]', testEmail);

    // Save
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify updates
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${testPhone}`)).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();

    // Restore
    await restoreProfileData(page, originalData, 'teacher');
  });

  test('PRF123 - 教师编辑学校和职称', async ({ page }) => {
    const timestamp = Date.now();
    const testTitle = `PRF123-高级教师-${timestamp}`;

    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1500);

    // Select school
    const schoolSelect = page.locator('label:has-text("所属学校") + * .ant-select-selector').first();
    await schoolSelect.click();
    await page.waitForTimeout(800);

    await page.locator('.ant-select-dropdown input[type="search"]').fill('贵阳市第一小学');
    await page.waitForTimeout(500);

    const targetSchool = page.locator('.ant-select-item:has-text("贵阳市第一小学")').first();
    await targetSchool.click();
    await page.waitForTimeout(500);

    // Edit title
    await page.fill('input[id*="title"]', testTitle);

    // Save
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify updates
    await expect(page.locator('text=贵阳市第一小学')).toBeVisible();
    await expect(page.locator(`text=${testTitle}`)).toBeVisible();
  });

  test('PRF124 - 教师编辑任教科目-多选功能', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Click subjects dropdown
    const subjectsSelect = page.locator('label:has-text("任教科目") + * .ant-select-selector').first();
    await subjectsSelect.click();
    await page.waitForTimeout(500);

    // Verify subject list displayed
    await expect(page.locator('.ant-select-dropdown')).toBeVisible();

    // Select multiple subjects
    await page.locator('.ant-select-item:has-text("数学")').first().click();
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item:has-text("物理")').first().click();
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item:has-text("化学")').first().click();
    await page.waitForTimeout(300);

    // Click outside to close dropdown
    await page.locator('label:has-text("任教科目")').click();
    await page.waitForTimeout(500);

    // Verify selected subjects shown as tags
    await expect(subjectsSelect).toContainText('数学');
    await expect(subjectsSelect).toContainText('物理');
    await expect(subjectsSelect).toContainText('化学');

    // Save
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify display shows all subjects
    const subjectsDisplay = await page.locator('text=/任教科目/ + *').textContent();
    expect(subjectsDisplay).toContain('数学');
    expect(subjectsDisplay).toContain('物理');
    expect(subjectsDisplay).toContain('化学');
  });

  test('PRF125 - 教师编辑-学校下拉选择功能', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1500);

    // Click school dropdown
    const schoolSelect = page.locator('label:has-text("所属学校") + * .ant-select-selector').first();
    await schoolSelect.click();
    await page.waitForTimeout(800);

    // Verify school list displayed
    await expect(page.locator('.ant-select-dropdown')).toBeVisible();

    // Search for schools in 云岩区
    await page.locator('.ant-select-dropdown input[type="search"]').fill('云岩区');
    await page.waitForTimeout(500);

    // Verify filtered results
    const filteredOptions = page.locator('.ant-select-item:visible');
    const firstOption = filteredOptions.first();
    await expect(firstOption).toContainText('云岩区');

    // Select first school
    await firstOption.click();
    await page.waitForTimeout(500);

    // Verify selection
    const selectedValue = await schoolSelect.textContent();
    expect(selectedValue).toContain('云岩区');

    // Cancel
    await page.locator('button:has-text("取消")').click();
  });

  test('PRF126 - 教师编辑-手机号格式验证', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Enter invalid phone
    await page.fill('input[id*="phone"]', '1234567890');

    // Try to save
    await page.locator('button:has-text("保存")').first().click();
    await page.waitForTimeout(500);

    // Verify error
    await expect(page.locator('.ant-form-item-explain-error:has-text("手机号")')).toBeVisible();

    // Enter valid phone
    await page.fill('input[id*="phone"]', '13900001126');

    // Save should succeed
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  });

  test('PRF127 - 教师编辑-邮箱格式验证', async ({ page }) => {
    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Enter invalid email
    await page.fill('input[id*="email"]', 'invalid-email');

    // Try to save
    await page.locator('button:has-text("保存")').first().click();
    await page.waitForTimeout(500);

    // Verify error
    await expect(page.locator('.ant-form-item-explain-error:has-text("邮箱")')).toBeVisible();

    // Enter valid email
    await page.fill('input[id*="email"]', 'prf127@test.com');

    // Save should succeed
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  });

  test('PRF128 - 教师编辑-取消编辑恢复原值', async ({ page }) => {
    // Get original values
    const originalName = await page.locator('text=/真实姓名/ + *').textContent();

    // Click edit button
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    // Modify fields
    await page.fill('input[id*="realName"]', 'PRF128-临时修改');
    await page.fill('input[id*="title"]', 'PRF128-临时职称');

    // Click cancel
    await page.locator('button:has-text("取消")').click();
    await page.waitForTimeout(500);

    // Verify values restored
    await expect(page.locator(`text=${originalName}`)).toBeVisible();
    await expect(page.locator('text=PRF128-临时修改')).not.toBeVisible();
  });

  test('PRF129 - 教师编辑-保存后数据持久化验证', async ({ page }) => {
    const timestamp = Date.now();
    const testName = `PRF129-${timestamp}`;
    const testTitle = `PRF129-特级教师`;

    // Get original data
    const originalData = await getOriginalProfileData(page);

    // Click edit and modify
    await page.locator('button:has-text("编辑个人信息")').click();
    await page.waitForTimeout(1000);

    await page.fill('input[id*="realName"]', testName);
    await page.fill('input[id*="title"]', testTitle);

    // Select subjects
    const subjectsSelect = page.locator('label:has-text("任教科目") + * .ant-select-selector').first();
    await subjectsSelect.click();
    await page.waitForTimeout(500);
    await page.locator('.ant-select-item:has-text("数学")').first().click();
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item:has-text("英语")').first().click();
    await page.waitForTimeout(300);
    await page.locator('label:has-text("任教科目")').click();

    // Save
    await page.locator('button:has-text("保存")').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify data displayed
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify data persists
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${testTitle}`)).toBeVisible();

    // Restore
    await restoreProfileData(page, originalData, 'teacher');
  });
});
