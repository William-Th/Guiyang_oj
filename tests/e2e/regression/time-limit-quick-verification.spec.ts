/**
 * Time Limit Feature - Quick Verification Tests
 * 时间限制功能快速验证
 *
 * 说明：旧版依赖种子数据中的固定活动 ID 2（现为 scheduled 类型），
 * 改为使用 createActivityWithQuestions 自建无限制练习活动，自包含可重复执行。
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsTeacher, loginAsStudent } from '../../helpers/auth';
import { createActivityWithQuestions } from '../../helpers/activity';

async function createAndOpenUnlimitedActivity(page: Page, title: string): Promise<void> {
  // 教师创建带题目的无限制练习活动
  await loginAsTeacher(page, 'teacher_yy_ps_math', 'password123');

  const { activityId } = await createActivityWithQuestions(page, {
    title,
    description: '时间限制快速验证',
    subject: '数学',
    grade: '三年级',
    type: 'practice',
    timeLimitType: 'unlimited',
    totalScore: 50,
    passScore: 30,
    abilityLevel: 'L2'
  }, 3);

  // 发布活动
  await page.waitForLoadState('networkidle');
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: title }).first();
  await activityRow.waitFor({ state: 'attached', timeout: 10000 });
  const publishButton = activityRow.locator('button').filter({ hasText: /发/ });
  await publishButton.waitFor({ state: 'attached', timeout: 5000 });
  await publishButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForTimeout(1000);

  // 学生进入答题页
  await page.goto('/login');
  await loginAsStudent(page, '13800138003', 'password123');
  await page.goto(`/student/activity/${activityId}`);
  await page.waitForLoadState('networkidle');
  // 等待活动数据异步渲染
  await expect(page.locator('.activity-question-card').first()).toBeVisible({ timeout: 15000 });
}

test('VERIFY-PTL001 - 验证无限制时间功能', async ({ page }) => {
  // 创建+挂题+发布+双端登录全流程远超默认 30s
  test.setTimeout(240000);
  const title = `[VERIFY1] 无限制练习 - ${Date.now()}`;
  await createAndOpenUnlimitedActivity(page, title);

  // 无时间限制提示可见
  const unlimitedAlert = page.locator('.ant-alert').filter({ hasText: /无时间限制/ });
  await expect(unlimitedAlert).toBeVisible({ timeout: 10000 });
  console.log('✓ Unlimited time limit alert is visible');

  // 无倒计时
  const countdownTimer = page.locator('text=剩余时间');
  await expect(countdownTimer).not.toBeVisible();
  console.log('✓ Countdown timer is NOT visible (correct for unlimited type)');

  // 进度显示可见
  const progressText = page.locator('.ant-progress-text');
  await expect(progressText).toBeVisible();
  console.log('✓ Progress display is visible');

  // 答一道「可自动作答」的题后进度更新（单选 radio / 多选 checkbox / 主观/填空 textarea；
  // 跳过代码题等无法自动作答的题型；等控件真正渲染完成再作答）
  const cards = page.locator('.activity-question-card');
  const cardCount = await cards.count();
  let answered = false;
  for (let i = 0; i < cardCount && !answered; i++) {
    const q = cards.nth(i);
    const radio = q.locator('input[type="radio"]').first();
    const checkbox = q.locator('.ant-checkbox-wrapper').first();
    const textArea = q.locator('textarea').first();
    const kind = await Promise.race([
      radio.waitFor({ state: 'attached', timeout: 10000 }).then(() => 'radio').catch(() => null),
      checkbox.waitFor({ state: 'attached', timeout: 10000 }).then(() => 'checkbox').catch(() => null),
      textArea.waitFor({ state: 'attached', timeout: 10000 }).then(() => 'textarea').catch(() => null),
    ]);
    if (kind === 'radio') {
      await radio.check();
      answered = true;
    } else if (kind === 'checkbox') {
      await checkbox.click();
      answered = true;
    } else if (kind === 'textarea') {
      await textArea.fill('Test answer');
      answered = true;
    }
  }
  expect(answered, '没有找到可自动作答的题目').toBeTruthy();
  await page.waitForTimeout(1000);
  const progressAfter = page.locator(`.ant-progress-text:has-text("1/")`);
  await expect(progressAfter).toBeVisible();
  console.log('✓ Progress counter updated after answering question');

  console.log('✅ VERIFY-PTL001: All time limit features verified successfully!');
});

test('VERIFY-PTL002 - 验证页面刷新恢复功能', async ({ page }) => {
  const title = `[VERIFY2] 无限制练习 - ${Date.now()}`;
  await createAndOpenUnlimitedActivity(page, title);

  // 答前两题
  const cards = page.locator('.activity-question-card');
  const cardCount = await cards.count();
  for (let i = 0; i < Math.min(2, cardCount); i++) {
    const question = cards.nth(i);
    const radio = question.locator('input[type="radio"]').first();
    const checkbox = question.locator('input[type="checkbox"]').first();
    const textArea = question.locator('textarea').first();
    if (await radio.count() > 0) {
      await radio.check();
    } else if (await checkbox.count() > 0) {
      await question.locator('.ant-checkbox-wrapper').first().click();
    } else if (await textArea.count() > 0) {
      await textArea.fill('Test answer');
    }
    await page.waitForTimeout(500);
  }
  console.log('✓ Answered 2 questions');

  // 等待自动保存
  await page.waitForTimeout(3000);

  // 刷新前进度非 0
  const progressBefore = page.locator('.ant-progress-text');
  await expect(progressBefore).toBeVisible();
  const beforeText = (await progressBefore.textContent()) || '';
  expect(beforeText).not.toContain('0/');
  console.log(`✓ Progress before refresh: ${beforeText.trim()}`);

  // 刷新页面
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500); // 等待活动数据异步渲染与本地答案恢复
  console.log('✓ Page refreshed');

  // 恢复后进度仍非 0（答案已恢复）
  const progressAfter = page.locator('.ant-progress-text');
  await expect(progressAfter).toBeVisible({ timeout: 10000 });
  const afterText = (await progressAfter.textContent()) || '';
  expect(afterText).not.toContain('0/');
  console.log(`✓ Progress after refresh (restored): ${afterText.trim()}`);

  console.log('✅ VERIFY-PTL002: Page refresh recovery verified successfully!');
});
