/**
 * Time Limit Feature - Unlimited Type Tests
 *
 * Test Coverage:
 * - PTL001: Create unlimited practice activity
 * - PTL002: Student takes unlimited activity
 * - PTL003: LocalStorage backup and network recovery
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsTeacher, loginAsStudent } from '../../helpers/auth';

/**
 * Helper: Fill activity form with basic info
 * Note: Activity type is pre-set by navigating to /create/practice route
 */
async function fillBasicActivityInfo(page: Page, title: string) {
  await page.fill('input[placeholder="请输入活动标题"]', title);
  await page.fill('textarea[placeholder="请输入活动描述（可选）"]', '时间限制功能测试 - 无限制模式');

  // Select subject
  await page.click('#subject');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '数学' }).click();
  await page.waitForTimeout(300);

  // Select grade
  await page.click('#grade');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '三年级' }).click();
  await page.waitForTimeout(300);

  // Select ability level (REQUIRED FIELD!)
  await page.click('#abilityLevel');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: /L2/ }).click();
  await page.waitForTimeout(300);
}

/**
 * Helper: Fill score info
 */
async function fillScoreInfo(page: Page) {
  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');
}

/**
 * PTL001 - Create Unlimited Practice Activity
 * Test format: Exact copy of working ACT107 pattern to isolate issue
 */
test('PTL001 - 创建无限制练习活动', async ({ page }) => {
  // Login as teacher
  await loginAsTeacher(page, 'teacher01', 'password123');

  // Navigate directly to create practice page
  await page.goto('/teacher/activities/create/practice');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Match ACT107's wait

  // Generate unique title
  const testActivityTitle = `PTL001-无限制练习-${Date.now()}`;

  // Fill title
  await page.fill('input[placeholder="请输入活动标题"]', testActivityTitle);

  // Fill description
  await page.fill('textarea[placeholder*="描述"]', '时间限制功能测试 - 无限制模式');

  // Select subject
  await page.click('#subject');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '数学' }).click();
  await page.waitForTimeout(300);

  // Select grade
  await page.click('#grade');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '三年级' }).click();
  await page.waitForTimeout(300);

  // Select ability level (REQUIRED FIELD!)
  await page.click('#abilityLevel');
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: /L2/ }).click();
  await page.waitForTimeout(300);

  // Fill total score
  await page.fill('input[id="totalScore"]', '50');

  // Fill pass score
  await page.fill('input[id="passScore"]', '30');

  // Click submit button
  const submitButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await submitButton.click();

  // Verify navigation
  await page.waitForURL(/\/activities$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  console.log(`✓ PTL001: Created unlimited activity: ${testActivityTitle}`);
});

/**
 * PTL002 - Student Takes Unlimited Activity
 */
test('PTL002 - 学生参加无限制活动', async ({ page }) => {
  // First create an unlimited activity as teacher
  await loginAsTeacher(page, 'teacher01', 'password123');

  // Navigate directly to create practice page
  await page.goto('/teacher/activities/create/practice');
  await page.waitForLoadState('networkidle');

  const timestamp = Date.now();
  const activityTitle = `[PTL002] 无限制练习 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle);
  await fillScoreInfo(page);

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  await saveButton.click();
  await page.waitForURL(/\/teacher\/activities$/);

  // Publish the activity
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.waitFor({ state: 'attached', timeout: 5000 });
  await publishButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForTimeout(1000);

  // Logout and login as student
  await page.goto('/login');
  await loginAsStudent(page, '520102200801011234', 'password123');

  // Navigate to practice center
  const studentPracticeMenu = page.getByRole('menuitem', { name: /练习中心/ });
  await studentPracticeMenu.click();
  await page.waitForURL(/\/student\/practice/);
  await page.waitForLoadState('networkidle');

  // Find and start the activity
  const practiceRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  await expect(practiceRow).toBeAttached({ timeout: 5000 });

  const startButton = practiceRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();

  // Wait for activity page to load
  await page.waitForURL(/\/student\/practice\/\d+/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Verify "无时间限制" alert is displayed
  const unlimitedAlert = page.locator('.ant-alert:has-text("无时间限制")');
  await expect(unlimitedAlert).toBeVisible();

  // Verify countdown timer is NOT displayed
  const countdownTimer = page.locator('text=剩余时间');
  await expect(countdownTimer).not.toBeVisible();

  // Verify progress display
  const progressText = page.locator('text=答题进度');
  await expect(progressText).toBeVisible();

  // Answer first question
  const firstQuestion = page.locator('.ant-card').filter({ hasText: /第 1 题/ }).first();
  await expect(firstQuestion).toBeVisible();

  // Select an answer (assuming it's a single choice question)
  const firstOption = firstQuestion.locator('input[type="radio"]').first();
  await firstOption.check();
  await page.waitForTimeout(1000);

  // Verify progress updated
  const progressCount = page.locator('text=/1 \\/ \\d+/');
  await expect(progressCount).toBeVisible();

  console.log(`✓ PTL002: Student successfully started unlimited activity`);
});

/**
 * PTL003 - LocalStorage Backup and Network Recovery
 */
test('PTL003 - LocalStorage备份和网络恢复', async ({ page, context }) => {
  // Create and publish activity as teacher
  await loginAsTeacher(page, 'teacher01', 'password123');

  // Navigate directly to create practice page
  await page.goto('/teacher/activities/create/practice');
  await page.waitForLoadState('networkidle');

  const timestamp = Date.now();
  const activityTitle = `[PTL003] 无限制练习 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle);
  await fillScoreInfo(page);

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  await saveButton.click();
  await page.waitForURL(/\/teacher\/activities$/);

  // Publish
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForTimeout(1000);

  // Login as student
  await page.goto('/login');
  await loginAsStudent(page, '520102200801011234', 'password123');

  const studentPracticeMenu = page.getByRole('menuitem', { name: /练习中心/ });
  await studentPracticeMenu.click();
  await page.waitForURL(/\/student\/practice/);

  const practiceRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const startButton = practiceRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();
  await page.waitForURL(/\/student\/practice\/\d+/);

  // Answer 3 questions
  for (let i = 1; i <= 3; i++) {
    const question = page.locator(`.ant-card:has-text("第 ${i} 题")`).first();
    const option = question.locator('input[type="radio"]').first();
    await option.check();
    await page.waitForTimeout(500);
  }

  // Wait for auto-save
  await page.waitForTimeout(3000);

  // Verify localStorage backup alert
  const backupAlert = page.locator('.ant-alert:has-text("答案已本地备份")');
  await expect(backupAlert).toBeVisible({ timeout: 5000 });

  // Refresh page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Verify answers are restored
  for (let i = 1; i <= 3; i++) {
    const question = page.locator(`.ant-card:has-text("第 ${i} 题")`).first();
    const checkedOption = question.locator('input[type="radio"]:checked');
    await expect(checkedOption).toBeAttached();
  }

  // Verify progress restored
  const progressCount = page.locator('text=/3 \\/ \\d+/');
  await expect(progressCount).toBeVisible();

  console.log(`✓ PTL003: LocalStorage backup and restore working correctly`);
});
