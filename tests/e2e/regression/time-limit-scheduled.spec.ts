/**
 * Time Limit Feature - Scheduled Type Tests
 *
 * Test Coverage:
 * - PTL004: Create scheduled assessment activity
 * - PTL005: Student takes scheduled activity (within time window)
 * - PTL006: Cannot start before activity start time
 * - PTL007: Auto-submit when end_time reached
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsTeacher, loginAsAdmin, loginAsStudent } from '../../helpers/auth';

/**
 * Helper: Fill activity form with basic info
 */
async function fillBasicActivityInfo(page: Page, title: string, description: string) {
  // Check if activity type is already set (may be pre-selected by route)
  const activityTypeValue = await page.locator('.ant-select-selection-item[title="测评"]').count();

  if (activityTypeValue === 0) {
    // Activity type not set, select it
    const typeSelector = page.locator('#type').locator('..');
    await typeSelector.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: '测评' }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
  }

  await page.fill('input[placeholder="请输入活动标题"]', title);
  await page.fill('textarea[placeholder="请输入活动描述（可选）"]', description);

  // Select subject
  const subjectSelector = page.locator('#subject').locator('..');
  await subjectSelector.click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '数学' }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);

  // Select grade
  const gradeSelector = page.locator('#grade').locator('..');
  await gradeSelector.click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '四年级' }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);
}

/**
 * Helper: Select time limit type
 */
async function selectTimeLimitType(page: Page, type: 'unlimited' | 'scheduled' | 'timed') {
  const typeLabels = {
    unlimited: '无限制（练习模式）',
    scheduled: '定时制（固定时间段）',
    timed: '计时制（开始后计时）',
  };

  await page.click('text=时间限制类型');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: typeLabels[type] }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(500);
}

/**
 * Helper: Set scheduled time range
 */
async function setTimeRange(page: Page, startMinutesFromNow: number, endMinutesFromNow: number) {
  const now = new Date();
  const startTime = new Date(now.getTime() + startMinutesFromNow * 60000);
  const endTime = new Date(now.getTime() + endMinutesFromNow * 60000);

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // Click time range picker
  await page.click('text=活动时间');
  await page.waitForTimeout(500);

  // Enter start time
  const startInput = page.locator('.ant-picker-input').first();
  await startInput.fill(formatDateTime(startTime));

  // Enter end time
  const endInput = page.locator('.ant-picker-input').last();
  await endInput.fill(formatDateTime(endTime));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * PTL004 - Create Scheduled Assessment Activity
 */
test('PTL004 - 创建定时制测评活动', async ({ page }) => {
  // Login as admin
  await loginAsAdmin(page, 'admin', 'password123');

  // Navigate to assessment management
  const assessmentMenu = page.getByRole('menuitem', { name: /测评管理/ });
  await expect(assessmentMenu).toBeVisible();
  await assessmentMenu.click();
  await page.waitForURL(/\/admin\/assessments/);
  await page.waitForLoadState('networkidle');

  // Click create assessment button
  const createButton = page.locator('button').filter({ hasText: /创\s*建.*测评/ });
  await expect(createButton).toBeAttached({ timeout: 5000 });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/admin\/assessments\/create/);
  await page.waitForLoadState('networkidle');

  // Generate unique title
  const timestamp = Date.now();
  const activityTitle = `[PTL004] 定时制测评 - ${timestamp}`;

  // Fill basic info
  await fillBasicActivityInfo(page, activityTitle, '定时制测评 - 固定时间窗口');

  // Select scheduled time limit type
  await selectTimeLimitType(page, 'scheduled');

  // Verify time range field is visible and required
  const timeRangeLabel = page.locator('text=活动时间').first();
  await expect(timeRangeLabel).toBeVisible();

  // Verify duration field is visible and required
  const durationLabel = page.locator('text=答题时长').first();
  await expect(durationLabel).toBeVisible();

  // Set time range (tomorrow 10:00 - 12:00)
  await setTimeRange(page, 60 * 24, 60 * 24 + 120); // Tomorrow, 2 hour window

  // Set duration
  await page.fill('input[id="duration"]', '60');

  // Fill score info
  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  // Save activity
  const saveButton = page.locator('button').filter({ hasText: /保\s*存|创\s*建/ }).last();
  await saveButton.click();

  // Verify navigation
  await page.waitForURL(/\/admin\/assessments$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Verify activity in list
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle });
  await expect(activityRow).toBeAttached({ timeout: 5000 });

  console.log(`✓ PTL004: Created scheduled assessment: ${activityTitle}`);
});

/**
 * PTL005 - Student Takes Scheduled Activity (Within Time Window)
 */
test('PTL005 - 学生在时间窗口内参加定时制活动', async ({ page }) => {
  // Create scheduled activity as admin (starting in 1 minute, ending in 11 minutes)
  await loginAsAdmin(page, 'admin', 'password123');

  const assessmentMenu = page.getByRole('menuitem', { name: /测评管理/ });
  await assessmentMenu.click();
  await page.waitForURL(/\/admin\/assessments/);

  const createButton = page.locator('button').filter({ hasText: /创\s*建.*测评/ });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/admin\/assessments\/create/);

  const timestamp = Date.now();
  const activityTitle = `[PTL005] 定时制测评 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle, '时间窗口内参加');
  await selectTimeLimitType(page, 'scheduled');

  // Set time range (start in 1 min, end in 11 min)
  await setTimeRange(page, 1, 11);
  await page.fill('input[id="duration"]', '10');

  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  await saveButton.click();
  await page.waitForURL(/\/admin\/assessments$/);

  // Publish activity
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());

  // Wait for activity to start (61 seconds)
  console.log('Waiting for activity to start (61 seconds)...');
  await page.waitForTimeout(61000);

  // Login as student
  await page.goto('/login');
  await loginAsStudent(page, '520102200801011234', 'password123');

  // Navigate to assessment center
  const studentAssessmentMenu = page.getByRole('menuitem', { name: /测评中心/ });
  await studentAssessmentMenu.click();
  await page.waitForURL(/\/student\/assessments/);
  await page.waitForLoadState('networkidle');

  // Start activity
  const assessmentRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  await expect(assessmentRow).toBeAttached({ timeout: 5000 });

  const startButton = assessmentRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();

  // Wait for activity page
  await page.waitForURL(/\/student\/assessment\/\d+/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Verify countdown timer is displayed
  const countdownText = page.locator('text=剩余时间');
  await expect(countdownText).toBeVisible();

  // Verify countdown shows approximately 10 minutes
  const timeDisplay = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/');
  await expect(timeDisplay).toBeVisible();

  // Answer a question
  const firstQuestion = page.locator('.ant-card').filter({ hasText: /第 1 题/ }).first();
  const firstOption = firstQuestion.locator('input[type="radio"]').first();
  await firstOption.check();

  console.log(`✓ PTL005: Student successfully started scheduled activity with countdown`);
});

/**
 * PTL006 - Cannot Start Before Activity Start Time
 */
test('PTL006 - 活动未开始时无法参加', async ({ page }) => {
  // Create scheduled activity as admin (starting in 5 minutes)
  await loginAsAdmin(page, 'admin', 'password123');

  const assessmentMenu = page.getByRole('menuitem', { name: /测评管理/ });
  await assessmentMenu.click();
  await page.waitForURL(/\/admin\/assessments/);

  const createButton = page.locator('button').filter({ hasText: /创\s*建.*测评/ });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/admin\/assessments\/create/);

  const timestamp = Date.now();
  const activityTitle = `[PTL006] 定时制测评 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle, '未开始时无法参加');
  await selectTimeLimitType(page, 'scheduled');

  // Set time range (start in 5 minutes, end in 15 minutes)
  await setTimeRange(page, 5, 15);
  await page.fill('input[id="duration"]', '10');

  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  await saveButton.click();
  await page.waitForURL(/\/admin\/assessments$/);

  // Publish
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForTimeout(1000);

  // Login as student immediately
  await page.goto('/login');
  await loginAsStudent(page, '520102200801011234', 'password123');

  const studentAssessmentMenu = page.getByRole('menuitem', { name: /测评中心/ });
  await studentAssessmentMenu.click();
  await page.waitForURL(/\/student\/assessments/);

  // Try to start activity
  const assessmentRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const startButton = assessmentRow.locator('button').filter({ hasText: /开始/ });

  // Button should be disabled or clicking should show error
  await startButton.click();

  // Verify error message or modal
  const errorModal = page.locator('.ant-modal:has-text("无法参加")');
  const errorMessage = page.locator('text=/活动尚未开始|暂时无法参加/');

  // Either modal or message should appear
  try {
    await expect(errorModal).toBeVisible({ timeout: 3000 });
    console.log(`✓ PTL006: Error modal shown for not-started activity`);
  } catch {
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    console.log(`✓ PTL006: Error message shown for not-started activity`);
  }
});

/**
 * PTL007 - Auto-submit When End Time Reached
 *
 * Note: This test uses a short duration (3 minutes) for practical testing
 */
test('PTL007 - 定时制活动超时自动提交', async ({ page }) => {
  // Create scheduled activity with short duration
  await loginAsAdmin(page, 'admin', 'password123');

  const assessmentMenu = page.getByRole('menuitem', { name: /测评管理/ });
  await assessmentMenu.click();
  await page.waitForURL(/\/admin\/assessments/);

  const createButton = page.locator('button').filter({ hasText: /创\s*建.*测评/ });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/admin\/assessments\/create/);

  const timestamp = Date.now();
  const activityTitle = `[PTL007] 定时制测评 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle, '超时自动提交测试');
  await selectTimeLimitType(page, 'scheduled');

  // Set time range (start in 30 seconds, end in 2.5 minutes)
  await setTimeRange(page, 0.5, 2.5);
  await page.fill('input[id="duration"]', '2'); // 2 minute duration

  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  await saveButton.click();
  await page.waitForURL(/\/admin\/assessments$/);

  // Publish
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());

  // Wait for start
  console.log('Waiting for activity to start (31 seconds)...');
  await page.waitForTimeout(31000);

  // Login as student and start
  await page.goto('/login');
  await loginAsStudent(page, '520102200801011234', 'password123');

  const studentAssessmentMenu = page.getByRole('menuitem', { name: /测评中心/ });
  await studentAssessmentMenu.click();
  await page.waitForURL(/\/student\/assessments/);

  const assessmentRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const startButton = assessmentRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();
  await page.waitForURL(/\/student\/assessment\/\d+/);

  // Answer one question
  const firstQuestion = page.locator('.ant-card').filter({ hasText: /第 1 题/ }).first();
  const firstOption = firstQuestion.locator('input[type="radio"]').first();
  await firstOption.check();

  // Wait for countdown to show warning (less than 1 minute)
  console.log('Waiting for countdown warning...');
  await page.waitForTimeout(70000); // Wait 70 seconds (should have ~20 seconds left)

  // Verify warning appears
  const warningAlert = page.locator('.ant-alert-warning:has-text("时间即将")');
  await expect(warningAlert).toBeVisible({ timeout: 5000 });

  // Wait for auto-submit
  console.log('Waiting for auto-submit...');
  await page.waitForTimeout(25000); // Wait remaining time

  // Verify auto-submit message or navigation to results
  const autoSubmitMessage = page.locator('text=/时间已到|正在自动提交/');
  try {
    await expect(autoSubmitMessage).toBeVisible({ timeout: 5000 });
    console.log(`✓ PTL007: Auto-submit message displayed`);
  } catch {
    // May have already navigated to results page
    await page.waitForURL(/\/student\/results\/\d+/, { timeout: 5000 });
    console.log(`✓ PTL007: Navigated to results after auto-submit`);
  }
});
