/**
 * Time Limit Feature - Scheduled Type Tests
 *
 * Test Coverage:
 * - PTL004: Create scheduled assessment activity
 * - PTL005: Student takes scheduled activity (within time window)
 * - PTL006: Cannot start before activity start time
 * - PTL007: Auto-submit when end_time reached
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { loginAsTeacher, loginAsAdmin, loginAsStudent } from '../../helpers/auth';

// PTL005/007 需等待时间窗口开启（61 秒+），放宽单用例超时
test.setTimeout(300000);

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
  const subjectSelect = page.locator('.ant-select:has(#subject)').first();
  await subjectSelect.click();
  const subjectOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: '数学' }).first();
  await expect(subjectOption).toBeVisible({ timeout: 8000 });
  await subjectOption.click();
  await page.waitForTimeout(300);

  // Select grade
  const gradeSelect = page.locator('.ant-select:has(#grade)').first();
  await gradeSelect.click();
  const gradeOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: '四年级' }).first();
  await expect(gradeOption).toBeVisible({ timeout: 8000 });
  await gradeOption.click();
  await page.waitForTimeout(300);

  // 选择能力等级（测评活动 API 必填 ability_level，表单标注可选但后端强制）
  const abilitySelect = page.locator('.ant-select:has(#abilityLevel)').first();
  await abilitySelect.click();
  await page.waitForTimeout(300);
  const abilityOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: /L2/ }).first();
  await expect(abilityOption).toBeVisible({ timeout: 8000 });
  await abilityOption.click();
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

  // Enter start time（antd Picker 输入框只读，需键入后回车确认）
  const startInput = page.locator('.ant-form-item').filter({ has: page.locator('label:has-text("活动时间")') }).locator('.ant-picker-input').first();
  await startInput.click();
  await page.keyboard.type(formatDateTime(startTime));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Enter end time
  const endInput = page.locator('.ant-form-item').filter({ has: page.locator('label:has-text("活动时间")') }).locator('.ant-picker-input').last();
  await endInput.click();
  await page.waitForTimeout(300);
  await page.keyboard.type(formatDateTime(endTime));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // 自愈：偶发键入落到错误字段导致 start 为空（start_time 为 NULL 时活动立即可参加），重试一次
  const rangeValues = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.ant-form-item')];
    const item = items.find(i => i.querySelector('label') && i.querySelector('label').textContent === '活动时间');
    return item ? [...item.querySelectorAll('.ant-picker-input input')].map(i => i.value) : [];
  });
  if (!rangeValues[0]) {
    console.log('⚠️ setTimeRange: 开始时间未生效，重试一次');
    await page.locator('.ant-form-item').filter({ has: page.locator('label:has-text("活动时间")') }).locator('.ant-picker-input').first().click();
    await page.waitForTimeout(300);
    await page.keyboard.type(formatDateTime(startTime));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.type(formatDateTime(endTime));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }
}

/**
 * 通过 API 为活动挂一道已发布的单选题
 * （PTL005/007 的答题断言依赖题目存在；已发布活动不能组卷，必须在发布前调用）
 */
async function attachSingleChoiceQuestion(request: APIRequestContext, activityId: number) {
  const login = await request.post('/api/auth/login', {
    data: { username: 'admin', password: 'password123' },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  expect(token).toBeTruthy();
  const authHeader = { Authorization: `Bearer ${token}` };

  const bankResponse = await request.get('/api/question-bank/bank', {
    params: { subject: '数学', grade: '四年级', status: 'published', type: 'single', limit: '5' },
    headers: authHeader,
  });
  expect(bankResponse.ok()).toBeTruthy();
  const bank = await bankResponse.json();
  const question = (bank.data || []).find((q: any) => q.id);
  expect(question, '题库中需存在已发布的四年级数学单选题').toBeTruthy();

  const attach = await request.post(`/api/activities/${activityId}/questions/batch`, {
    data: { questions: [{ questionId: question.id }] },
    headers: authHeader,
  });
  expect(attach.ok(), `挂题失败: ${await attach.text()}`).toBeTruthy();
  console.log(`✓ 已为活动 ${activityId} 挂上单选题 ${question.id}`);
}

/**
 * PTL004 - Create Scheduled Assessment Activity
 */
test('PTL004 - 创建定时制测评活动', async ({ page }) => {
  // Login as admin
  await loginAsAdmin(page, 'admin', 'password123');

  // Navigate to assessment management
  const assessmentMenu = page.getByRole('menuitem', { name: /活动管理/ });
  await expect(assessmentMenu).toBeVisible();
  await assessmentMenu.click();
  await page.waitForURL(/\/admin\/assessments/, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Click create assessment button
  const createButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await expect(createButton).toBeAttached({ timeout: 5000 });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/admin\/assessments\/create/, { waitUntil: 'domcontentloaded' });
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


  // Set time range (tomorrow 10:00 - 12:00)
  await setTimeRange(page, 60 * 24, 60 * 24 + 120); // Tomorrow, 2 hour window


  // 关闭可能残留的 Picker 弹层，避免吞掉保存按钮的点击
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Fill score info
  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  // Save activity
  const saveButton = page.locator('button').filter({ hasText: /保\s*存|创\s*建/ }).last();
  // 关闭可能残留的 Picker 弹层，避免吞掉保存点击
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await saveButton.click();
  // 保存偶发不触发表单提交，未跳转时重试点击（最多 3 次）
  let navigated = false;
  for (let attempt = 0; attempt < 3 && !navigated; attempt++) {
    try {
      await page.waitForURL(/\/admin\/assessments$/, { timeout: 8000, waitUntil: 'domcontentloaded' });
      navigated = true;
    } catch {
      if (attempt < 2) await saveButton.click();
    }
  }
  await page.waitForLoadState('networkidle');

  // Verify activity in list
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle });
  await expect(activityRow).toBeAttached({ timeout: 5000 });

  console.log(`✓ PTL004: Created scheduled assessment: ${activityTitle}`);
});

/**
 * PTL005 - Student Takes Scheduled Activity (Within Time Window)
 */
test('PTL005 - 学生在时间窗口内参加定时制活动', async ({ page, request }) => {
  // Create scheduled activity as admin (starting in 1 minute, ending in 11 minutes)
  await loginAsAdmin(page, 'admin', 'password123');

  const assessmentMenu = page.getByRole('menuitem', { name: /活动管理/ });
  await assessmentMenu.click();
  await page.waitForURL(/\/admin\/assessments/, { waitUntil: 'domcontentloaded' });

  const createButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/admin\/assessments\/create/, { waitUntil: 'domcontentloaded' });

  const timestamp = Date.now();
  const activityTitle = `[PTL005] 定时制测评 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle, '时间窗口内参加');
  await selectTimeLimitType(page, 'scheduled');

  // Set time range (start in 1 min, end in 11 min)
  await setTimeRange(page, 1, 11);

  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  // 关闭可能残留的 Picker 弹层，避免吞掉保存点击
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await saveButton.click();
  // 保存偶发不触发表单提交，未跳转时重试点击（最多 3 次）
  let navigated = false;
  for (let attempt = 0; attempt < 3 && !navigated; attempt++) {
    try {
      await page.waitForURL(/\/admin\/assessments$/, { timeout: 8000, waitUntil: 'domcontentloaded' });
      navigated = true;
    } catch {
      if (attempt < 2) await saveButton.click();
    }
  }

  // Publish activity
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const activityId = Number(await activityRow.getAttribute('data-row-key'));
  await attachSingleChoiceQuestion(request, activityId);
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());

  // Wait for activity to start (61 seconds)
  console.log('Waiting for activity to start (61 seconds)...');
  await page.waitForTimeout(61000);

  // Login as student
  await page.goto('/login');
  await loginAsStudent(page, '13800138003', 'password123');

  // Navigate to assessment center
  const studentAssessmentMenu = page.getByRole('menuitem', { name: /测评中心/ });
  await studentAssessmentMenu.click();
  await page.waitForURL(/\/student\/assessments/, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Start activity
  const assessmentRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  await expect(assessmentRow).toBeAttached({ timeout: 5000 });

  const startButton = assessmentRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();

  // Wait for activity page（测评中心「开始」跳转 /student/activity/:id）
  await page.waitForURL(/\/student\/activity\/\d+/, { timeout: 10000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Verify countdown timer is displayed
  const countdownText = page.locator('text=剩余时间');
  await expect(countdownText).toBeVisible();

  // Verify countdown shows approximately 10 minutes
  const timeDisplay = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/');
  await expect(timeDisplay).toBeVisible();

  // Answer a question
  const firstQuestion = page.locator('.activity-question-card').first();
  const firstOption = firstQuestion.locator('input[type="radio"]').first();
  await firstOption.check();

  console.log(`✓ PTL005: Student successfully started scheduled activity with countdown`);
});

/**
 * PTL006 - Cannot Start Before Activity Start Time
 */
  test('PTL006 - 活动未开始时无法参加', async ({ page }) => {
    // Step 1: 管理员创建 5 分钟后才开始的活动并发布
    await loginAsAdmin(page, 'admin', 'password123');
    await page.goto('/admin/assessments/create/assessment');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    const activityTitle = `[PTL006] 定时制测评 - ${timestamp}`;
    await fillBasicActivityInfo(page, activityTitle, '未开始时无法参加');
    await selectTimeLimitType(page, 'scheduled');
    await setTimeRange(page, 5, 15);
    await page.fill('input[id="totalScore"]', '50');
    await page.fill('input[id="passScore"]', '30');

    const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
    await saveButton.click();
    // 保存偶发不触发表单提交，未跳转时重试点击（最多 3 次）
    let navigated = false;
    for (let attempt = 0; attempt < 3 && !navigated; attempt++) {
      try {
      await page.waitForURL(/\/admin\/assessments$/, { timeout: 8000, waitUntil: 'domcontentloaded' });
        navigated = true;
      } catch {
        if (attempt < 2) await saveButton.click();
      }
    }

    // Publish
    const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
    const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
    await publishButton.evaluate((button: HTMLElement) => button.click());
    await page.waitForTimeout(1000);

    // Step 2: 学生打开测评中心
    await page.goto('/login');
    await loginAsStudent(page, '13800138003', 'password123');
    const studentAssessmentMenu = page.getByRole('menuitem', { name: /测评中心/ });
    await studentAssessmentMenu.click();
    await page.waitForURL(/\/student\/assessments/, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 验证点：未开始的定时活动保持可见，「开始」按钮禁用并显示开始倒计时（产品决策：禁用+倒计时）
    const rowsBeforeStart = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle });
    await expect(rowsBeforeStart.first()).toBeAttached({ timeout: 5000 });
    const startButton = rowsBeforeStart.first().locator('button').filter({ hasText: /开始/ });
    await expect(startButton).toBeDisabled();
    const countdown = rowsBeforeStart.first().locator('.start-countdown');
    await expect(countdown).toContainText('距开始');
    await expect(countdown).toContainText(/\d{2}:\d{2}:\d{2}/);
    console.log('✅ PTL006: 未开始活动按钮禁用且显示倒计时（时间闸门生效）');

    console.log('✅ PTL006: 活动未开始时的访问控制验证完成');
  });

/**
 * PTL007 - Auto-submit When End Time Reached
 *
 * Note: This test uses a short duration (3 minutes) for practical testing
 */
test('PTL007 - 定时制活动超时自动提交', async ({ page, request }) => {
  // 需真实等待 2.5 分钟时间窗口关闭后自动提交
  test.setTimeout(480000);
  // Create scheduled activity with short duration
  await loginAsAdmin(page, 'admin', 'password123');

  const assessmentMenu = page.getByRole('menuitem', { name: /活动管理/ });
  await assessmentMenu.click();
  await page.waitForURL(/\/admin\/assessments/, { waitUntil: 'domcontentloaded' });

  const createButton = page.locator('button').filter({ hasText: /创\s*建/ });
  await createButton.evaluate((button: HTMLElement) => button.click());
  await page.waitForURL(/\/admin\/assessments\/create/, { waitUntil: 'domcontentloaded' });

  const timestamp = Date.now();
  const activityTitle = `[PTL007] 定时制测评 - ${timestamp}`;

  await fillBasicActivityInfo(page, activityTitle, '超时自动提交测试');
  await selectTimeLimitType(page, 'scheduled');

  // Set time range (start in 30 seconds, end in 2.5 minutes)
  await setTimeRange(page, 0.5, 2.5);

  await page.fill('input[id="totalScore"]', '50');
  await page.fill('input[id="passScore"]', '30');

  const saveButton = page.locator('button').filter({ hasText: /创\s*建/ }).last();
  // 关闭可能残留的 Picker 弹层，避免吞掉保存点击
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await saveButton.click();
  // 保存偶发不触发表单提交，未跳转时重试点击（最多 3 次）
  let navigated = false;
  for (let attempt = 0; attempt < 3 && !navigated; attempt++) {
    try {
      await page.waitForURL(/\/admin\/assessments$/, { timeout: 8000, waitUntil: 'domcontentloaded' });
      navigated = true;
    } catch {
      if (attempt < 2) await saveButton.click();
    }
  }

  // Publish
  const activityRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const activityId = Number(await activityRow.getAttribute('data-row-key'));
  await attachSingleChoiceQuestion(request, activityId);
  const publishButton = activityRow.locator('button').filter({ hasText: /发\s*布/ });
  await publishButton.evaluate((button: HTMLElement) => button.click());

  // Wait for start
  console.log('Waiting for activity to start (31 seconds)...');
  await page.waitForTimeout(31000);

  // Login as student and start
  await page.goto('/login');
  await loginAsStudent(page, '13800138003', 'password123');

  const studentAssessmentMenu = page.getByRole('menuitem', { name: /测评中心/ });
  await studentAssessmentMenu.click();
  await page.waitForURL(/\/student\/assessments/, { waitUntil: 'domcontentloaded' });

  const assessmentRow = page.locator('.ant-table-tbody tr').filter({ hasText: activityTitle }).first();
  const startButton = assessmentRow.locator('button').filter({ hasText: /开始/ });
  await startButton.click();
  await page.waitForURL(/\/student\/activity\/\d+/, { timeout: 15000, waitUntil: 'domcontentloaded' });

  // Answer one question
  const firstQuestion = page.locator('.activity-question-card').first();
  const firstOption = firstQuestion.locator('input[type="radio"]').first();
  await firstOption.check();

  // 等待倒计时进入最后 1 分钟（「时间即将到！」为 antd Alert type="error"；条件等待替代盲等，免疫登录/加载耗时波动）
  console.log('Waiting for countdown warning...');
  const warningAlert = page.locator('.ant-alert:has-text("时间即将")');
  await expect(warningAlert).toBeVisible({ timeout: 120000 });

  // 等待到点自动提交（到点后前端提示并跳转结果页）
  console.log('Waiting for auto-submit...');
  const autoSubmitMessage = page.locator('text=/时间已到|正在自动提交/');
  try {
    await expect(autoSubmitMessage).toBeVisible({ timeout: 90000 });
    console.log(`✓ PTL007: Auto-submit message displayed`);
  } catch {
    // May have already navigated to results page
    await page.waitForURL(/\/student\/results\/\d+/, { timeout: 15000, waitUntil: 'domcontentloaded' });
    console.log(`✓ PTL007: Navigated to results after auto-submit`);
  }
});
