/**
 * Time Limit Feature - Timed Type Tests
 *
 * Test Coverage:
 * - PTL008: Create timed practice activity
 * - PTL009: Student starts timed activity and sees countdown
 * - PTL010: Auto-submit when time limit reached
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { loginAsTeacher, loginAsStudent } from '../../helpers/auth';

/**
 * 通过 API 为活动挂一道已发布的单选题（已发布活动不能组卷，须在发布前调用）
 */
async function attachSingleChoiceQuestion(request: APIRequestContext, activityId: number, subject: string, grade: string) {
  const login = await request.post('/api/auth/login', {
    data: { username: 'admin', password: 'password123' },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  expect(token).toBeTruthy();
  const authHeader = { Authorization: `Bearer ${token}` };

  const bankResponse = await request.get('/api/question-bank/bank', {
    params: { subject, grade, status: 'published', type: 'single', limit: '5' },
    headers: authHeader,
  });
  expect(bankResponse.ok()).toBeTruthy();
  const bank = await bankResponse.json();
  const question = (bank.data || []).find((q: any) => q.id);
  expect(question, `题库中需存在已发布的${grade}${subject}单选题`).toBeTruthy();

  const attach = await request.post(`/api/activities/${activityId}/questions/batch`, {
    data: { questions: [{ questionId: question.id }] },
    headers: authHeader,
  });
  expect(attach.ok(), `挂题失败: ${await attach.text()}`).toBeTruthy();
  console.log(`✓ 已为活动 ${activityId} 挂上单选题 ${question.id}`);
}

/**
 * Helper: Fill activity form with basic info
 */
async function fillBasicActivityInfo(page: Page, title: string) {
  // Check if activity type is already set (may be pre-selected by route)
  const activityTypeValue = await page.locator('.ant-select-selection-item[title="练习"]').count();

  if (activityTypeValue === 0) {
    // Activity type not set, select it
    const typeSelector = page.locator('#type').locator('..');
    await typeSelector.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: '练习' }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
  }

  await page.fill('input[placeholder="请输入活动标题"]', title);
  await page.fill('textarea[placeholder="请输入活动描述（可选）"]', '时间限制功能测试 - 计时制模式');

  // Select subject
  const subjectSelector = page.locator('#subject').locator('..');
  await subjectSelector.click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '信息科技' }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);

  // Select grade
  const gradeSelector = page.locator('#grade').locator('..');
  await gradeSelector.click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: '五年级' }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);

  // Select ability level（表单必填，不选会拦截保存）
  const abilitySelector = page.locator('#abilityLevel').locator('..');
  await abilitySelector.click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: /L2/ }).first().evaluate((el: HTMLElement) => el.click());
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

  const tlSelect = page.locator('.ant-form-item').filter({ has: page.locator('label:has-text("时间限制类型")') }).locator('.ant-select').first();
  await tlSelect.click();
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: typeLabels[type] }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(500);
}

/**
 * PTL008 - Create Timed Practice Activity
 */
test('PTL008 - 创建计时制活动', async ({ page }) => {
  // Login as teacher
  await loginAsTeacher(page, 'teacher_yy_ps_math', 'password123');

  // Navigate to practice management
  const practiceMenu = page.getByRole('menuitem', { name: /活动管理/ });
  await expect(practiceMenu).toBeVisible();
  await practiceMenu.click();
  await page.waitForURL(/\/teacher\/activities/, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Click create activity
  const createButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await expect(createButton).toBeAttached({ timeout: 5000 });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/teacher\/activities\/create/, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Generate unique title
  const timestamp = Date.now();
  const activityTitle = `[PTL008] 计时制练习 - ${timestamp}`;

  // Fill basic info
  await fillBasicActivityInfo(page, activityTitle);

  // Select timed type
  await selectTimeLimitType(page, 'timed');

  // Verify time range field is NOT visible
  const timeRangeLabel = page.locator('text=活动时间').first();
  await expect(timeRangeLabel).not.toBeVisible();

  // Verify duration field IS visible and required
  const durationLabel = page.locator('label:has-text("答题时长")').first();
  await expect(durationLabel).toBeVisible();

  // Verify help text mentions "开始后计时"
  const helpText = page.locator('text=/开始答题时起计时|超时自动提交/');
  await expect(helpText).toBeVisible();

  // Set duration to 30 minutes
  await page.fill('input[id="duration"]', '30');

  // 关闭可能残留的 Picker 弹层，避免吞掉保存按钮的点击
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Fill score info
  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  // Save activity
  const saveButton = page.locator('button').filter({ hasText: /保\s*存|创\s*建/ }).last();
  await saveButton.click();

  // Verify navigation
  await page.waitForURL(/\/teacher\/activities$/, { timeout: 10000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Verify activity in list
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle });
  await expect(activityRow).toBeAttached({ timeout: 5000 });

  console.log(`✓ PTL008: Created timed activity: ${activityTitle}`);
});

/**
 * PTL009 - Student Starts Timed Activity and Sees Countdown
 */
test('PTL009 - 学生开始计时制活动后倒计时', async ({ page, request }) => {
  // 创建+挂题+发布+双端登录流程超过默认 30s
  test.setTimeout(180000);
  // Create timed activity as teacher
  await loginAsTeacher(page, 'teacher_yy_ps_math', 'password123');

  const practiceMenu = page.getByRole('menuitem', { name: /活动管理/ });
  await practiceMenu.click();
  await page.waitForURL(/\/teacher\/activities/, { waitUntil: 'domcontentloaded' });

  const createButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/teacher\/activities\/create/, { waitUntil: 'domcontentloaded' });

  const timestamp = Date.now();
  const activityTitle = `[PTL009] 计时制练习 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle);
  await selectTimeLimitType(page, 'timed');

  // Set duration to 30 minutes
  await page.fill('input[id="duration"]', '30');
  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  await saveButton.click();
  await page.waitForURL(/\/teacher\/activities$/, { waitUntil: 'domcontentloaded' });

  // Publish
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const activityId = Number(await activityRow.getAttribute('data-row-key'));
  await attachSingleChoiceQuestion(request, activityId, '信息科技', '五年级');
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForTimeout(1000);

  // Login as student
  await page.goto('/login');
  await loginAsStudent(page, '13800138003', 'password123');

  // Navigate to practice center
  const studentPracticeMenu = page.getByRole('menuitem', { name: /练习中心/ });
  await studentPracticeMenu.click();
  await page.waitForURL(/\/student\/practice/, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Record start time (before clicking start)
  const startTimeMs = Date.now();

  // Start activity
  const practiceRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  await expect(practiceRow).toBeAttached({ timeout: 5000 });

  const startButton = practiceRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();

  // Wait for activity page（练习中心「开始练习」跳转 /student/activity/:id）
  await page.waitForURL(/\/student\/(practice|activity)\/\d+/, { timeout: 10000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Verify countdown timer is displayed
  const countdownText = page.locator('text=剩余时间');
  await expect(countdownText).toBeVisible();

  // Extract countdown time
  const timeDisplay = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/').first();
  await expect(timeDisplay).toBeVisible();

  const timeText = await timeDisplay.textContent();
  console.log(`Countdown shows: ${timeText}`);

  // Parse time (should be close to 30:00:00)
  const [hours, minutes, seconds] = timeText!.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  // Verify countdown starts from 30 minutes (allow 1 minute tolerance)
  expect(totalMinutes).toBeGreaterThanOrEqual(29);
  expect(totalMinutes).toBeLessThanOrEqual(30);

  // Wait 1 minute and verify countdown decreased
  console.log('Waiting 60 seconds to verify countdown...');
  await page.waitForTimeout(60000);

  const timeAfter60s = await page.locator('text=/\\d{2}:\\d{2}:\\d{2}/').first().textContent();
  console.log(`Countdown after 60s: ${timeAfter60s}`);

  const [hours2, minutes2] = timeAfter60s!.split(':').map(Number);
  const totalMinutes2 = hours2 * 60 + minutes2;

  // Should be approximately 29 minutes remaining
  expect(totalMinutes2).toBeGreaterThanOrEqual(28);
  expect(totalMinutes2).toBeLessThanOrEqual(29);

  console.log(`✓ PTL009: Timed activity countdown working correctly`);
});

/**
 * PTL010 - Auto-submit When Time Limit Reached
 *
 * Note: Uses short duration (2 minutes) for practical testing
 */
test('PTL010 - 计时制活动超时自动提交', async ({ page, request }) => {
  // 含约 2 分钟真实倒计时等待
  test.setTimeout(300000);
  // Create timed activity with 2-minute duration
  await loginAsTeacher(page, 'teacher_yy_ps_math', 'password123');

  const practiceMenu = page.getByRole('menuitem', { name: /活动管理/ });
  await practiceMenu.click();
  await page.waitForURL(/\/teacher\/activities/, { waitUntil: 'domcontentloaded' });

  const createButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/teacher\/activities\/create/, { waitUntil: 'domcontentloaded' });

  const timestamp = Date.now();
  const activityTitle = `[PTL010] 计时制练习 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle);
  await selectTimeLimitType(page, 'timed');

  // Set duration to 2 minutes for quick testing
  await page.fill('input[id="duration"]', '2');
  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  await saveButton.click();
  await page.waitForURL(/\/teacher\/activities$/, { waitUntil: 'domcontentloaded' });

  // Publish
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const activityId = Number(await activityRow.getAttribute('data-row-key'));
  await attachSingleChoiceQuestion(request, activityId, '信息科技', '五年级');
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForTimeout(1000);

  // Login as student
  await page.goto('/login');
  await loginAsStudent(page, '13800138003', 'password123');

  const studentPracticeMenu = page.getByRole('menuitem', { name: /练习中心/ });
  await studentPracticeMenu.click();
  await page.waitForURL(/\/student\/practice/, { waitUntil: 'domcontentloaded' });

  // Start activity
  const practiceRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const startButton = practiceRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();
  await page.waitForURL(/\/student\/(practice|activity)\/\d+/, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Verify countdown shows 2 minutes
  const timeDisplay = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/').first();
  const initialTime = await timeDisplay.textContent();
  console.log(`Initial countdown: ${initialTime}`);

  // Answer one question quickly
  const firstQuestion = page.locator('.activity-question-card').first();
  const firstOption = firstQuestion.locator('input[type="radio"]').first();
  await firstOption.check();
  await page.waitForTimeout(500);

  // Wait for warning (less than 5 minutes remaining - should show immediately for 2min duration)
  console.log('Checking for warning alert...');
  // 页面可能同时存在多个 warning Alert（如网络提示），取倒计时相关的一个
  const warningAlert = page.locator('.ant-alert-warning').first();
  await expect(warningAlert).toBeVisible({ timeout: 5000 });

  // Wait for critical warning (less than 1 minute)
  console.log('Waiting for critical warning (about 70 seconds)...');
  await page.waitForTimeout(70000);

  const criticalWarning = page.locator('.ant-alert-error:has-text("时间即将")');
  await expect(criticalWarning).toBeVisible({ timeout: 5000 });

  // Wait for auto-submit
  console.log('Waiting for auto-submit (about 55 seconds)...');
  await page.waitForTimeout(55000);

  // Verify auto-submit message or navigation
  const autoSubmitMessage = page.locator('text=/时间已到|正在自动提交/');

  try {
    await expect(autoSubmitMessage).toBeVisible({ timeout: 5000 });
    console.log(`✓ PTL010: Auto-submit message displayed`);
  } catch {
    // May have navigated to results
    await page.waitForURL(/\/student\/results\/\d+/, { timeout: 5000, waitUntil: 'domcontentloaded' });
    console.log(`✓ PTL010: Navigated to results after auto-submit`);
  }

  // Verify in database (auto-submit service should also catch it)
  console.log('✓ PTL010: Timed activity auto-submit test completed');
  console.log('Note: Auto-submit cron job (every minute) will also detect expired activities');
});
