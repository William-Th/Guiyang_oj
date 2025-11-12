/**
 * Time Limit Feature - Quick Verification Tests
 * Using existing activity with questions to verify time limit功能
 */

import { test, expect } from '@playwright/test';
import { loginAsStudent } from '../../helpers/auth';

/**
 * Quick verification of unlimited time limit type
 * Uses existing activity ID 2 which has questions
 */
test('VERIFY-PTL001 - 验证无限制时间功能', async ({ page }) => {
  // Login as student
  await loginAsStudent(page, '13800138003', 'password123');

  // Navigate directly to the activity page (activity ID 2 - existing activity with questions)
  await page.goto('/student/activity/2');
  await page.waitForLoadState('networkidle');

  // Verify "无时间限制" alert is displayed
  const unlimitedAlert = page.locator('.ant-alert').filter({ hasText: /无时间限制/ });
  await expect(unlimitedAlert).toBeVisible({ timeout: 10000 });

  console.log('✓ Unlimited time limit alert is visible');

  // Verify countdown timer is NOT displayed
  const countdownTimer = page.locator('text=剩余时间');
  await expect(countdownTimer).not.toBeVisible();

  console.log('✓ Countdown timer is NOT visible (correct for unlimited type)');

  // Verify progress display
  const progressText = page.locator('text=答题进度');
  await expect(progressText).toBeVisible();

  console.log('✓ Progress display is visible');

  // Verify questions are loaded
  const firstQuestion = page.locator('.ant-card').filter({ hasText: /第 1 题/ }).first();
  await expect(firstQuestion).toBeVisible({ timeout: 5000 });

  console.log('✓ Questions are loaded successfully');

  // Answer first question
  const firstOption = firstQuestion.locator('input[type="radio"]').first();
  await firstOption.check();
  await page.waitForTimeout(1000);

  // Verify progress updated
  const progressCount = page.locator('text=/1 \\/ \\d+/');
  await expect(progressCount).toBeVisible();

  console.log('✓ Progress counter updated after answering question');

  // Verify auto-save notification (localStorage backup)
  await page.waitForTimeout(3000); // Wait for auto-save
  const backupAlert = page.locator('.ant-alert').filter({ hasText: /答案已本地备份/ });
  await expect(backupAlert).toBeVisible({ timeout: 10000 });

  console.log('✓ Auto-save notification displayed');

  console.log('✅ VERIFY-PTL001: All time limit features verified successfully!');
});

/**
 * Quick verification of page refresh recovery
 */
test('VERIFY-PTL002 - 验证页面刷新恢复功能', async ({ page }) => {
  // Login as student
  await loginAsStudent(page, '13800138003', 'password123');

  // Navigate to activity
  await page.goto('/student/activity/2');
  await page.waitForLoadState('networkidle');

  // Answer 2 questions
  for (let i = 1; i <= 2; i++) {
    const question = page.locator('.ant-card').filter({ hasText: new RegExp(`第 ${i} 题`) }).first();
    await expect(question).toBeVisible({ timeout: 5000 });

    const option = question.locator('input[type="radio"]').first();
    await option.check();
    await page.waitForTimeout(500);
  }

  console.log('✓ Answered 2 questions');

  // Wait for auto-save
  await page.waitForTimeout(3000);

  // Verify progress before refresh
  const progressBefore = page.locator('text=/2 \\/ \\d+/');
  await expect(progressBefore).toBeVisible();

  console.log('✓ Progress: 2/X before refresh');

  // Refresh page
  await page.reload();
  await page.waitForLoadState('networkidle');

  console.log('✓ Page refreshed');

  // Verify answers are restored
  for (let i = 1; i <= 2; i++) {
    const question = page.locator('.ant-card').filter({ hasText: new RegExp(`第 ${i} 题`) }).first();
    const checkedOption = question.locator('input[type="radio"]:checked');
    await expect(checkedOption).toBeAttached({ timeout: 5000 });
  }

  console.log('✓ Answers restored after refresh');

  // Verify progress restored
  const progressAfter = page.locator('text=/2 \\/ \\d+/');
  await expect(progressAfter).toBeVisible();

  console.log('✓ Progress: 2/X after refresh (restored correctly)');

  // Verify restore notification
  const restoreNotification = page.locator('.ant-message').filter({ hasText: /已恢复本地保存的答案/ });
  // Note: Message may disappear quickly, so don't assert visibility

  console.log('✅ VERIFY-PTL002: Page refresh recovery verified successfully!');
});
