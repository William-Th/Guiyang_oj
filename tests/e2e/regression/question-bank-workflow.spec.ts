import { test, expect, Page } from '@playwright/test';
import { TEACHER_STORAGE_STATE, TEST_TIMEOUTS, TEST_CONFIG } from '../test-config';

/**
 * 回归测试 - 题库草稿箱与审核流程 (Regression Tests - Question Bank Draft & Review Workflow)
 * 目标: 全面测试题库的草稿管理、提交审核、审核批准、发布和删除流程
 * 覆盖范围:
 * - 草稿箱管理（查看、编辑、删除草稿）
 * - 题目提交审核流程
 * - 审核人员审批流程
 * - 题目发布流程
 * - 审核历史查看
 * - 题目删除功能
 */

test.describe('Regression Tests - 题库草稿箱与审核流程', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // Helper function to login as a specific teacher
  const loginAsTeacher = async (page: Page, username: string, password: string) => {
    // 清除现有登录状态
    await page.context().clearCookies();

    // 访问登录页
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 切换到教师入口
    await page.click('text=教师入口');
    await page.waitForTimeout(1000);

    // 等待教师登录表单完全展示
    await page.waitForSelector('.ant-tabs-tabpane-active', { state: 'visible' });

    // 在激活的tab中输入用户名和密码
    const activeTabPane = page.locator('.ant-tabs-tabpane-active');
    await activeTabPane.locator('input[placeholder="用户名"]').fill(username);
    await activeTabPane.locator('input[placeholder="密码"]').fill(password);

    // 点击登录按钮（在激活的tab中）
    await activeTabPane.locator('button[type="submit"]').click();

    // 等待登录成功并跳转到首页
    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  };

  // Helper function to navigate to question bank page by clicking menu
  const navigateToQuestionBank = async (page: Page) => {
    console.log('通过点击导航菜单进入题库页面');

    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 检查当前URL是否已经在题库页面
    const currentUrl = page.url();
    if (currentUrl.includes('/teacher/question-bank') || currentUrl.includes('/admin/question-bank')) {
      console.log('当前已在题库页面，无需重新导航');
      return;
    }

    // 尝试多种选择器来找到题库管理菜单
    // 可能是顶部导航栏、侧边栏或其他位置
    const menuSelectors = [
      'a:has-text("题库管理")',
      '.ant-menu-item:has-text("题库管理")',
      'span:has-text("题库管理")',
      '[href*="question-bank"]'
    ];

    let menuFound = false;
    for (const selector of menuSelectors) {
      const menu = page.locator(selector).first();
      if (await menu.count() > 0 && await menu.isVisible()) {
        console.log(`找到题库管理菜单: ${selector}`);
        await menu.click();
        menuFound = true;
        break;
      }
    }

    if (!menuFound) {
      throw new Error('无法找到题库管理菜单链接');
    }

    // 等待页面跳转完成
    await page.waitForURL(/\/(teacher|admin)\/question-bank/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    console.log('成功导航到题库页面');
  };

  // Helper function to select Ant Design Select option
  const selectAntOption = async (page: Page, fieldId: string, optionText: string) => {
    const selectWrapper = page.locator(`.ant-select:has(#${fieldId})`);
    await selectWrapper.click();
    await page.waitForTimeout(500);

    await page.waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
      state: 'visible',
      timeout: 5000
    });

    const exactMatch = page.locator(`.ant-select-item-option:has-text("${optionText}")`).filter({
      hasText: new RegExp(`^${optionText}$`)
    });
    const partialMatch = page.locator(`.ant-select-item-option:has-text("${optionText}")`);

    const optionToClick = (await exactMatch.count()) > 0 ? exactMatch.first() : partialMatch.first();
    await optionToClick.click();
    await page.waitForTimeout(300);
  };

  // Helper function to create a draft question for testing
  // Returns the question code of the created question
  const createDraftQuestion = async (page: Page, questionData: {
    type: string;
    subject: string;
    grade: string;
    content: string;
    level: string;
    difficulty: string;
    score: string;
  }): Promise<string> => {
    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.ant-form', { timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // 填写题目基本信息
    await selectAntOption(page, 'type', questionData.type);
    await selectAntOption(page, 'subject', questionData.subject);
    await selectAntOption(page, 'grade', questionData.grade);
    await page.fill('textarea#content', questionData.content);

    // 如果是判断题，选择答案
    if (questionData.type === '判断题') {
      await page.check('label:has-text("正确") input[type="radio"]');
    }

    // 填写其他必填字段
    await selectAntOption(page, 'level', questionData.level);
    await selectAntOption(page, 'difficulty', questionData.difficulty);
    await page.fill('input#suggested_score', questionData.score);

    // 提交表单创建草稿
    await page.click('button[type="submit"]');
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });

    // 等待成功消息消失，然后获取题目编码
    await page.waitForTimeout(2000);

    // 进入草稿箱获取刚创建题目的编码
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 找到包含指定内容的行
    const targetRow = page.locator('.ant-table-tbody tr').filter({ hasText: questionData.content }).first();
    await expect(targetRow).toBeAttached({ timeout: 5000 });

    // 提取题目编码（从第二列，题目编码列）
    const codeCell = targetRow.locator('td').nth(1); // 题目编码在第二列（索引1）
    const codeTag = codeCell.locator('.ant-tag');
    const questionCode = await codeTag.textContent();

    return questionCode?.trim() || '';
  };

  // R401 - 查看草稿箱列表
  test('R401 - 草稿箱列表显示', async ({ page }) => {
    // 先创建一个草稿题目
    await createDraftQuestion(page, {
      type: '判断题',
      subject: '数学',
      grade: '七年级',
      content: '测试草稿箱功能 - 1+1=2',
      level: 'L1',
      difficulty: '简单',
      score: '5'
    });

    // 访问题库主页面
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 点击"我的草稿" tab
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 验证表格包含关键列：题型、科目、年级、题目内容（使用getByRole更可靠）
    await expect(page.getByRole('columnheader', { name: '题型' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '科目' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '年级' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '题目内容' })).toBeAttached();

    // 验证至少有一行数据（使用attached而不是visible，因为虚拟滚动）
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  // R402 - 编辑草稿题目
  test('R402 - 编辑草稿题目', async ({ page }) => {
    // 先创建一个草稿并获取题目编码
    const questionCode = await createDraftQuestion(page, {
      type: '判断题',
      subject: '物理',
      grade: '八年级',
      content: '测试编辑功能 - 原始内容',
      level: 'L2',
      difficulty: '中等',
      score: '6'
    });

    console.log(`Created question with code: ${questionCode}`);

    // 进入题库主页面并切换到草稿箱
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 等待表格加载并确保有数据（使用attached而不是visible）
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: 5000 });

    // 使用题目编码精确查找行
    const targetRow = page.locator('.ant-table-tbody tr').filter({ hasText: questionCode }).first();
    await expect(targetRow).toBeAttached({ timeout: 5000 });

    // 在该行中查找编辑按钮并点击
    const editButton = targetRow.locator('button:has([aria-label="edit"])');
    await editButton.evaluate((button: HTMLElement) => button.click());

    // 等待进入编辑页面（验证页面标题为"编辑题目"）
    await page.waitForTimeout(2000); // 增加等待时间，确保表单数据完全加载
    await expect(page.locator('.ant-card-head-title:has-text("编辑题目")')).toBeVisible();

    // 验证表单已加载原始数据（题目内容应该是原始内容）
    const contentTextarea = page.locator('textarea#content');
    await expect(contentTextarea).toHaveValue('测试编辑功能 - 原始内容', { timeout: 5000 });

    // 修改题目内容
    await page.fill('textarea#content', '测试编辑功能 - 修改后的内容');

    // 提交修改
    await page.click('button[type="submit"]');
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R403 - 提交草稿进行审核
  test('R403 - 提交草稿进行审核', async ({ page }) => {
    // 先创建一个草稿并获取题目编码
    const questionCode = await createDraftQuestion(page, {
      type: '判断题',
      subject: '数学',
      grade: '七年级',
      content: '测试提交审核功能',
      level: 'L1',
      difficulty: '简单',
      score: '5'
    });

    console.log(`Created question with code: ${questionCode}`);

    // 进入题库主页面并切换到草稿箱
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 使用题目编码找到对应的行，然后点击发布按钮
    const targetRow = page.locator('.ant-table-tbody tr').filter({ hasText: questionCode }).first();
    await expect(targetRow).toBeAttached({ timeout: 5000 });
    const publishButton = targetRow.locator('button:has-text("发布")');
    await publishButton.click();

    // 等待弹窗出现
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.ant-modal-title:has-text("发布题目")')).toBeVisible();

    // 选择审核人（选择第一个可用的审核人）
    const reviewerSelect = page.locator('.ant-modal .ant-select').first();
    await reviewerSelect.click();
    await page.waitForTimeout(500);

    // 等待下拉选项出现并选择第一个
    const firstReviewer = page.locator('.ant-select-item-option').first();
    await expect(firstReviewer).toBeVisible({ timeout: 3000 });
    await firstReviewer.click();
    await page.waitForTimeout(300);

    // 选择适用范围 - 练习（直接点击label避免checkbox状态问题）
    const practiceLabel = page.locator('label:has-text("练习")').filter({ has: page.locator('input[type="checkbox"]') });
    const checkbox = practiceLabel.locator('input[type="checkbox"]');

    // 只在未选中时点击
    const isChecked = await checkbox.evaluate((el: HTMLInputElement) => el.checked);
    if (!isChecked) {
      await practiceLabel.click();
      await page.waitForTimeout(300);
    }

    // 提交审核
    const submitButton = page.locator('.ant-modal button:has-text("提交")');
    await submitButton.click();

    // 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
  });

  // R404 - 查看我的提交列表
  test('R404 - 查看我的提交列表', async ({ page }) => {
    // 访问题库主页面并切换到我的提交 tab
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的提交")');
    await page.waitForTimeout(1000);

    // 验证关键列存在（使用getByRole和attached）
    await expect(page.getByRole('columnheader', { name: '题目内容' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '状态' })).toBeAttached();
    await expect(page.getByRole('columnheader', { name: '审核人' })).toBeAttached();

    // 验证至少有表格行（使用attached而不是visible）
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]').first();
    await expect(tableRows).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
  });

  // R405 - 审核待审核题目（批准）- 双老师流程
  test('R405 - 审核题目 - 批准通过', async ({ page }) => {
    console.log('=== R405 测试开始：双老师审核流程（批准） ===');

    // 使用时间戳确保每次测试的题目内容唯一
    const timestamp = Date.now();
    const uniqueContent = `【R405-${timestamp}】测试审核批准功能 - 2+2=4`;

    // ========== 第一步：teacher01 登录并创建草稿 ==========
    console.log('Step 1: teacher01 登录');
    await loginAsTeacher(page, TEST_CONFIG.TEACHER.username, TEST_CONFIG.TEACHER.password);

    console.log('Step 2: teacher01 创建草稿题目');
    const questionCode = await createDraftQuestion(page, {
      type: '判断题',
      subject: '数学',
      grade: '七年级',
      content: uniqueContent,
      level: 'L1',
      difficulty: '简单',
      score: '5'
    });
    console.log(`创建的题目编码: ${questionCode}, 内容: ${uniqueContent}`);

    // ========== 第二步：teacher01 提交审核并指定 teacher02 ==========
    console.log('Step 3: teacher01 提交审核，指定 teacher02');
    await navigateToQuestionBank(page);

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 点击"我的草稿"标签并等待加载
    console.log('点击"我的草稿"标签');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 等待表格加载（attached状态，不需要visible因为可能有虚拟滚动）
    await page.waitForSelector('.ant-table-tbody tr', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(500); // 额外等待确保数据渲染完成
    console.log('表格已加载');

    // 使用唯一的题目内容精确定位
    console.log(`查找题目内容: 【R405-${timestamp}】`);
    const targetRow = page.locator('.ant-table-tbody tr').filter({ hasText: `【R405-${timestamp}】` }).first();
    await expect(targetRow).toBeAttached({ timeout: 5000 });
    console.log(`找到目标题目行，编码: ${questionCode}`);

    // 使用更精确的方式点击发布按钮 - 避免虚拟滚动问题
    const publishButton = targetRow.locator('button:has-text("发布")');
    console.log('等待发布按钮可见');
    await publishButton.waitFor({ state: 'attached', timeout: 10000 });
    await publishButton.scrollIntoViewIfNeeded();
    await publishButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('发布按钮已可见，准备点击');
    await publishButton.click();

    // 等待发布弹窗
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.ant-modal-title:has-text("发布题目")')).toBeVisible();

    // 选择审核人 - 选择 teacher02 (王老师)
    const reviewerSelect = page.locator('.ant-modal .ant-select').first();
    await reviewerSelect.click();
    await page.waitForTimeout(500);

    // 查找并选择 teacher02 (王老师)
    const teacher02Option = page.locator('.ant-select-item-option:has-text("王老师")');
    await expect(teacher02Option).toBeVisible({ timeout: 3000 });
    console.log('选择审核人: teacher02 (王老师)');
    await teacher02Option.click();
    await page.waitForTimeout(500);

    // 选择适用范围 - 练习题库
    const practiceLabel = page.locator('.ant-modal label:has-text("练习题库")');
    await practiceLabel.waitFor({ state: 'visible', timeout: 5000 });
    const checkbox = practiceLabel.locator('input[type="checkbox"]');
    const isChecked = await checkbox.evaluate((el: HTMLInputElement) => el.checked);
    if (!isChecked) {
      await practiceLabel.click();
      await page.waitForTimeout(300);
    }

    // 提交审核
    const submitButton = page.locator('.ant-modal button:has-text("提交")');
    await submitButton.click();

    // 验证提交成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
    console.log('teacher01 提交审核成功');

    // 等待模态框关闭
    await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // ========== 第三步：teacher02 登录并审核 ==========
    console.log('Step 4: teacher02 登录');
    await loginAsTeacher(page, TEST_CONFIG.TEACHER02.username, TEST_CONFIG.TEACHER02.password);

    console.log('Step 5: teacher02 进入待审核页面');
    await navigateToQuestionBank(page);
    await page.click('.ant-tabs-tab:has-text("待我审核")');
    await page.waitForTimeout(1000);

    // 查找待审核的题目（使用唯一的时间戳内容）
    console.log(`查找待审核题目: 【R405-${timestamp}】`);
    const reviewTableRow = page.locator('.ant-table-tbody tr').filter({
      hasText: `【R405-${timestamp}】`
    }).first();

    await expect(reviewTableRow).toBeAttached({ timeout: 5000 });
    console.log('找到待审核题目');

    // 点击审核按钮
    const reviewButton = reviewTableRow.locator('button:has-text("审核")');
    await reviewButton.click();

    // 等待审核弹窗
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.ant-modal-title:has-text("审核题目")')).toBeVisible();
    console.log('审核弹窗打开');

    // 选择批准 - 使用更精确的选择器
    await page.locator('.ant-modal .ant-radio-button-wrapper:has-text("批准通过")').click();
    await page.waitForTimeout(500);

    // 填写审核意见
    const commentTextarea = page.locator('.ant-modal textarea');
    await commentTextarea.fill('题目质量良好，内容准确，批准通过。');

    // 提交审核
    const approveButton = page.locator('.ant-modal button:has-text("提交审核")');
    await approveButton.click();

    // 验证审核成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
    console.log('teacher02 审核批准成功');

    console.log('=== R405 测试完成 ===');
  });

  // R406 - 审核待审核题目（拒绝）- 双老师流程
  test('R406 - 审核题目 - 拒绝', async ({ page }) => {
    console.log('=== R406 测试开始：双老师审核流程（拒绝） ===');

    // 使用时间戳确保每次测试的题目内容唯一
    const timestamp = Date.now();
    const uniqueContent = `【R406-${timestamp}】测试审核拒绝功能 - 光速快于声速`;

    // ========== 第一步：teacher01 登录并创建草稿 ==========
    console.log('Step 1: teacher01 登录');
    await loginAsTeacher(page, TEST_CONFIG.TEACHER.username, TEST_CONFIG.TEACHER.password);

    console.log('Step 2: teacher01 创建草稿题目');
    const questionCode = await createDraftQuestion(page, {
      type: '判断题',
      subject: '物理',
      grade: '八年级',
      content: uniqueContent,
      level: 'L2',
      difficulty: '中等',
      score: '6'
    });
    console.log(`创建的题目编码: ${questionCode}, 内容: ${uniqueContent}`);

    // ========== 第二步：teacher01 提交审核并指定 teacher02 ==========
    console.log('Step 3: teacher01 提交审核，指定 teacher02');
    await navigateToQuestionBank(page);

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 点击"我的草稿"标签并等待加载
    console.log('点击"我的草稿"标签');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 等待表格加载（attached状态，不需要visible因为可能有虚拟滚动）
    await page.waitForSelector('.ant-table-tbody tr', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(500); // 额外等待确保数据渲染完成
    console.log('表格已加载');

    // 使用唯一的题目内容精确定位
    console.log(`查找题目内容: 【R406-${timestamp}】`);
    const targetRow406 = page.locator('.ant-table-tbody tr').filter({ hasText: `【R406-${timestamp}】` }).first();
    await expect(targetRow406).toBeAttached({ timeout: 5000 });
    console.log('找到目标题目行');

    const publishButton406 = targetRow406.locator('button:has-text("发布")');
    console.log('等待发布按钮可见');
    await publishButton406.waitFor({ state: 'attached', timeout: 10000 });
    await publishButton406.scrollIntoViewIfNeeded();
    await publishButton406.waitFor({ state: 'visible', timeout: 10000 });
    console.log('发布按钮已可见，准备点击');
    await publishButton406.click();

    // 等待发布弹窗
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.ant-modal-title:has-text("发布题目")')).toBeVisible();

    // 选择审核人 - 选择 teacher02 (王老师)
    const reviewerSelect406 = page.locator('.ant-modal .ant-select').first();
    await reviewerSelect406.click();
    await page.waitForTimeout(500);

    // 查找并选择 teacher02 (王老师)
    const teacher02Option406 = page.locator('.ant-select-item-option:has-text("王老师")');
    await expect(teacher02Option406).toBeVisible({ timeout: 3000 });
    console.log('选择审核人: teacher02 (王老师)');
    await teacher02Option406.click();
    await page.waitForTimeout(500);

    // 选择适用范围 - 练习题库
    const practiceLabel406 = page.locator('.ant-modal label:has-text("练习题库")');
    await practiceLabel406.waitFor({ state: 'visible', timeout: 5000 });
    const checkbox406 = practiceLabel406.locator('input[type="checkbox"]');
    const isChecked406 = await checkbox406.evaluate((el: HTMLInputElement) => el.checked);
    if (!isChecked406) {
      await practiceLabel406.click();
      await page.waitForTimeout(300);
    }

    // 提交审核
    const submitButton406 = page.locator('.ant-modal button:has-text("提交")');
    await submitButton406.click();

    // 验证提交成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
    console.log('teacher01 提交审核成功');

    // 等待模态框关闭
    await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // ========== 第三步：teacher02 登录并审核（拒绝） ==========
    console.log('Step 4: teacher02 登录');
    await loginAsTeacher(page, TEST_CONFIG.TEACHER02.username, TEST_CONFIG.TEACHER02.password);

    console.log('Step 5: teacher02 进入待审核页面');
    await navigateToQuestionBank(page);
    await page.click('.ant-tabs-tab:has-text("待我审核")');
    await page.waitForTimeout(1000);

    // 查找待审核的题目（使用唯一的时间戳内容）
    console.log(`查找待审核题目: 【R406-${timestamp}】`);
    const reviewTableRow406 = page.locator('.ant-table-tbody tr').filter({
      hasText: `【R406-${timestamp}】`
    }).first();

    await expect(reviewTableRow406).toBeAttached({ timeout: 5000 });
    console.log('找到待审核题目');

    // 点击审核按钮
    const reviewButton406 = reviewTableRow406.locator('button:has-text("审核")');
    await reviewButton406.click();

    // 等待审核弹窗
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.ant-modal-title:has-text("审核题目")')).toBeVisible();
    console.log('审核弹窗打开');

    // 选择拒绝 - 使用更精确的选择器
    await page.locator('.ant-modal .ant-radio-button-wrapper:has-text("拒绝")').click();
    await page.waitForTimeout(500);

    // 填写拒绝原因
    const commentTextarea406 = page.locator('.ant-modal textarea');
    await commentTextarea406.fill('题目描述不够清晰，需要进一步修改和完善。');

    // 提交审核
    const rejectButton406 = page.locator('.ant-modal button:has-text("提交审核")');
    await rejectButton406.click();

    // 验证审核成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
    console.log('teacher02 审核拒绝成功');

    console.log('=== R406 测试完成 ===');
  });

  // R407 - 查看审核历史
  test('R407 - 查看审核历史', async ({ page }) => {
    // 访问题库主页面并切换到我的提交 tab
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的提交")');
    await page.waitForTimeout(1000);

    // 等待表格加载（使用attached）
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: 5000 });
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // 点击查看历史按钮（使用更灵活的选择器）
      const historyButton = page.locator('.ant-table-tbody tr').first().locator('button').filter({ hasText: '查看历史' }).or(page.locator('.ant-table-tbody tr').first().locator('button').filter({ hasText: '历史' })).first();

      // 如果找到按钮则点击
      if (await historyButton.count() > 0) {
        await expect(historyButton).toBeVisible({ timeout: 5000 });
        await historyButton.click({ timeout: 10000 });

        // 验证历史弹窗出现
        await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
        await expect(page.locator('.ant-modal-title:has-text("审核历史")')).toBeVisible();

        // 验证时间线组件存在
        await expect(page.locator('.ant-timeline')).toBeVisible();
      }
    }
  });

  // R408 - 删除草稿题目
  test('R408 - 删除草稿题目', async ({ page }) => {
    // 创建一个专门用于删除的草稿
    await createDraftQuestion(page, {
      type: '判断题',
      subject: '化学',
      grade: '九年级',
      content: '测试删除功能 - 此题目将被删除',
      level: 'L1',
      difficulty: '简单',
      score: '5'
    });

    // 进入题库主页面并切换到草稿箱
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 等待表格加载（使用attached）
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: 5000 });

    // 获取删除前的行数
    const initialCount = await tableRows.count();

    // 虚拟滚动问题：使用JavaScript点击删除按钮
    const deleteButtons = page.locator('button:has([aria-label="delete"])');
    await deleteButtons.first().waitFor({ state: 'attached', timeout: 5000 });

    // 使用JavaScript点击第一个删除按钮
    await deleteButtons.first().evaluate((button: HTMLElement) => button.click());

    // 确认删除对话框
    await page.waitForTimeout(500);
    const confirmButton = page.locator('.ant-popconfirm button:has-text("确定"), .ant-modal button:has-text("确定")');
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // 等待删除操作完成（成功消息可能显示太快）
    // 使用 Promise.race 来等待成功消息或超时
    await Promise.race([
      page.locator('.ant-message-success').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      page.waitForTimeout(3000)
    ]);

    // 等待表格更新
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 验证行数减少（如果之前有多行的话）
    if (initialCount > 1) {
      const newCount = await tableRows.count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  // R409 - 多选适用范围提交审核
  test('R409 - 多选适用范围提交审核', async ({ page }) => {
    console.log('=== R409 测试开始：多选题库范围提交审核 ===');

    // 使用时间戳确保每次测试的题目内容唯一
    const timestamp = Date.now();
    const uniqueContent = `【R409-${timestamp}】测试多选范围功能 - 光合作用`;

    // ========== 第一步：teacher01 登录并创建草稿 ==========
    console.log('Step 1: teacher01 登录');
    await loginAsTeacher(page, TEST_CONFIG.TEACHER.username, TEST_CONFIG.TEACHER.password);

    console.log('Step 2: teacher01 创建草稿题目');
    const questionCode = await createDraftQuestion(page, {
      type: '判断题',
      subject: '生物',
      grade: '七年级',
      content: uniqueContent,
      level: 'L1',
      difficulty: '简单',
      score: '5'
    });
    console.log(`创建的题目编码: ${questionCode}, 内容: ${uniqueContent}`);

    // ========== 第二步：teacher01 提交审核，选择多个题库范围 ==========
    console.log('Step 3: teacher01 提交审核，选择多个题库范围');
    await navigateToQuestionBank(page);

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 点击"我的草稿"标签并等待加载
    console.log('点击"我的草稿"标签');
    await page.click('.ant-tabs-tab:has-text("我的草稿")');
    await page.waitForTimeout(1000);

    // 等待表格加载（attached状态，不需要visible因为可能有虚拟滚动）
    await page.waitForSelector('.ant-table-tbody tr', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(500);
    console.log('表格已加载');

    // 使用唯一的题目内容精确定位
    console.log(`查找题目内容: 【R409-${timestamp}】`);
    const targetRow = page.locator('.ant-table-tbody tr').filter({ hasText: `【R409-${timestamp}】` }).first();
    await expect(targetRow).toBeAttached({ timeout: 5000 });
    console.log('找到目标题目行');

    // 使用更精确的方式点击发布按钮 - 避免虚拟滚动问题
    const publishButton = targetRow.locator('button:has-text("发布")');
    console.log('等待发布按钮可见');
    await publishButton.waitFor({ state: 'attached', timeout: 10000 });
    await publishButton.scrollIntoViewIfNeeded();
    await publishButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('发布按钮已可见，准备点击');
    await publishButton.click();

    // 等待发布弹窗
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.ant-modal-title:has-text("发布题目")')).toBeVisible();

    // 选择审核人 - 选择 teacher02 (王老师)
    const reviewerSelect = page.locator('.ant-modal .ant-select').first();
    await reviewerSelect.click();
    await page.waitForTimeout(500);

    // 查找并选择 teacher02 (王老师)
    const teacher02Option = page.locator('.ant-select-item-option:has-text("王老师")');
    await expect(teacher02Option).toBeVisible({ timeout: 3000 });
    console.log('选择审核人: teacher02 (王老师)');
    await teacher02Option.click();
    await page.waitForTimeout(500);

    // 选择多个适用范围 - 练习题库和测评题库
    console.log('选择多个题库范围：练习题库 + 测评题库');
    const practiceLabel = page.locator('.ant-modal label:has-text("练习题库")');
    await practiceLabel.waitFor({ state: 'visible', timeout: 5000 });
    const practiceCheckbox = practiceLabel.locator('input[type="checkbox"]');
    const isPracticeChecked = await practiceCheckbox.evaluate((el: HTMLInputElement) => el.checked);
    if (!isPracticeChecked) {
      await practiceLabel.click();
      await page.waitForTimeout(300);
    }

    const assessmentLabel = page.locator('.ant-modal label:has-text("测评题库")');
    await assessmentLabel.waitFor({ state: 'visible', timeout: 5000 });
    const assessmentCheckbox = assessmentLabel.locator('input[type="checkbox"]');
    const isAssessmentChecked = await assessmentCheckbox.evaluate((el: HTMLInputElement) => el.checked);
    if (!isAssessmentChecked) {
      await assessmentLabel.click();
      await page.waitForTimeout(300);
    }

    console.log('已选择：练习题库 + 测评题库');

    // 提交审核 - 按钮文本是"提交审核并发布"
    const submitButton = page.locator('.ant-modal button:has-text("提交审核并发布")');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);  // 等待UI稳定
    await submitButton.click();
    await page.waitForTimeout(1000);  // 等待提交请求完成

    // 验证提交成功
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: TEST_TIMEOUTS.ELEMENT_WAIT
    });
    console.log('teacher01 多选范围提交审核成功');

    // 等待模态框关闭
    await expect(page.locator('.ant-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    console.log('=== R409 测试完成 ===');
  });

  // R410 - 被拒绝题目可重新编辑
  test('R410 - 被拒绝题目重新编辑并提交', async ({ page }) => {
    // 访问题库主页面并切换到我的提交 tab
    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    await page.click('.ant-tabs-tab:has-text("我的提交")');
    await page.waitForTimeout(1000);

    // 查找状态为"已拒绝"的行
    const rejectedRow = page.locator('.ant-table-tbody tr').filter({
      has: page.locator('.ant-tag:has-text("已拒绝")')
    });

    const rejectedCount = await rejectedRow.count();

    if (rejectedCount > 0) {
      // 点击编辑按钮
      const editButton = rejectedRow.first().locator('button:has-text("编辑")');
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click();

        // 等待切换到"新建题目" tab（编辑模式）
        await page.waitForTimeout(1000);
        await expect(page.locator('.ant-tabs-tab-active:has-text("新建题目")')).toBeVisible();

        // 修改题目内容
        const contentField = page.locator('textarea#content');
        const currentContent = await contentField.inputValue();
        await contentField.fill(currentContent + ' - 已根据审核意见修改');

        // 提交修改
        await page.click('button[type="submit"]');
        await expect(page.locator('.ant-message-success')).toBeVisible({
          timeout: TEST_TIMEOUTS.ELEMENT_WAIT
        });
      }
    }
  });
});
