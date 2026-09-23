import { expect, test, type Page } from '@playwright/test';

const studentUser = {
  id: 'visual-student',
  username: 'student_demo',
  realName: '小明',
  role: 'student',
};

async function installStudentMocks(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'student-learning-space-test');
    localStorage.setItem('user', JSON.stringify(user));
  }, studentUser);

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/activities/assessments')) {
      return route.fulfill({
        json: {
          activities: [{
            id: 101,
            title: '信息科技能力测评',
            type: 'assessment',
            status: 'published',
            subject: '信息科技',
            start_time: '2026-09-01T08:00:00.000Z',
          }],
        },
      });
    }

    if (url.includes('/student/activities/practice')) {
      return route.fulfill({
        json: {
          practices: [{
            id: 102,
            title: '数学基础练习',
            type: 'practice',
            status: 'available',
            subject: '数学',
          }],
        },
      });
    }

    if (url.includes('/activities/student/history')) {
      return route.fulfill({
        json: {
          history: [{
            id: 99,
            title: '科学探索练习',
            type: 'practice',
            status: 'graded',
            subject: '科学',
            score: 92,
            total_score: 100,
            submit_time: '2026-08-25T08:00:00.000Z',
            grading_status: 'completed',
            attempt_number: 1,
          }],
        },
      });
    }

    if (url.includes('/statistics/student/overview')) {
      return route.fulfill({ json: { success: true, data: { completed_activities: 6 } } });
    }

    if (url.includes('/notifications/unread-count')) {
      return route.fulfill({
        json: { success: true, count: { notifications: 0, announcements: 0, total: 0 } },
      });
    }

    if (url.includes('/notifications')) {
      return route.fulfill({
        json: {
          success: true,
          data: [],
          pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 },
        },
      });
    }

    if (url.includes('/wrong-questions/stats')) {
      return route.fulfill({
        json: { data: { total: 3, bySubject: [], byStatus: { active: 2, mastered: 1, removed: 0 } } },
      });
    }

    if (url.includes('/wrong-questions') && method === 'GET') {
      return route.fulfill({
        json: {
          data: [{
            id: 1,
            question_id: 501,
            subject: '数学',
            difficulty: 'medium',
            error_count: 2,
            review_count: 1,
            last_wrong_at: '2026-08-25T08:00:00.000Z',
            content: '计算 36 ÷ 4 的结果。',
            options: ['A. 8', 'B. 9', 'C. 10', 'D. 12'],
            correct_answer: 'B',
            type: 'single',
            explanation: '36 平均分成 4 份，每份是 9。',
            status: 'active',
          }],
        },
      });
    }

    if (url.endsWith('/student/activities/1/start') && method === 'POST') {
      return route.fulfill({
        json: { studentActivityId: 11, startTime: '2026-08-26T08:00:00.000Z', timeLimitDeadline: null },
      });
    }

    if (url.endsWith('/student/activities/1/questions')) {
      return route.fulfill({
        json: {
          activity: {
            id: 1,
            title: '信息科技基础练习',
            description: '完成下面的题目，检查今天的学习成果。',
            subject: '信息科技',
            grade: '五年级',
            time_limit_type: 'unlimited',
            total_score: 20,
            pass_score: 12,
            questions: [
              { id: 1, type: 'single', content: '下列哪一项属于输入设备？', options: ['A. 键盘', 'B. 显示器'], score: 10 },
              { id: 2, type: 'true_false', content: '计算机可以帮助我们处理信息。', score: 10 },
            ],
          },
        },
      });
    }

    if (url.endsWith('/student/activities/1/my-answers')) {
      return route.fulfill({ json: { answers: [] } });
    }

    return route.fulfill({ json: { success: true, data: [], notifications: [], unread_count: 0 } });
  });
}

test.describe('学生学习空间视觉与响应式回归', () => {
  test.beforeEach(async ({ page }) => {
    await installStudentMocks(page);
  });

  test('首页突出今日练习并保留成绩入口', async ({ page }) => {
    await page.goto('/');

    const primaryAction = page.getByTestId('start-daily-practice');
    await expect(primaryAction).toBeVisible();
    await expect(page.getByRole('tab', { name: /个人成长中心|成绩查询/ })).toHaveCount(0);

    await primaryAction.click();
    await expect(page).toHaveURL(/\/student\/smart-practice$/);

    await page.goto('/student/results');
    await expect(page.getByRole('heading', { name: '成绩查询' })).toBeVisible();
  });

  test('共享导航与测评页面使用统一的未来感主题', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/student/assessments');

    await expect(page.locator('.app-brand')).toContainText('贵阳市小学生测评平台');
    await expect(page.locator('.app-desktop-navigation .ant-menu-item-selected')).toContainText('测评中心');
    await expect(page.locator('.ant-card-head-title')).toContainText('测评中心');

    const visualStyle = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.app-header');
      const card = document.querySelector<HTMLElement>('.ant-card');
      const tableHeader = document.querySelector<HTMLElement>('.ant-table-thead th');
      const button = document.querySelector<HTMLElement>('.ant-card .ant-btn');

      return {
        headerBackground: header ? getComputedStyle(header).backgroundColor : 'transparent',
        cardRadius: card ? Number.parseFloat(getComputedStyle(card).borderRadius) : 0,
        tableHeaderBackground: tableHeader ? getComputedStyle(tableHeader).backgroundColor : 'transparent',
        buttonHeight: button ? button.getBoundingClientRect().height : 0,
      };
    });

    // 2026-09 品牌改版：导航栏由渐变改为纯主题色 #0ea5e9（rgb(14, 165, 233)）
    expect(visualStyle.headerBackground).toBe('rgb(14, 165, 233)');
    expect(visualStyle.cardRadius).toBeGreaterThanOrEqual(16);
    expect(visualStyle.tableHeaderBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(visualStyle.buttonHeight).toBeGreaterThanOrEqual(44);
  });

  test('移动端导航抽屉延续统一配色并可正常跳转', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/student/assessments');

    await expect(page.locator('.app-mobile-navigation-trigger')).toBeVisible();
    await page.getByRole('button', { name: '打开导航菜单' }).click();

    const drawer = page.locator('.app-mobile-navigation-drawer');
    await expect(drawer.getByText('功能导航')).toBeVisible();
    await expect(drawer.locator('.ant-menu-item-selected')).toContainText('测评中心');

    await drawer.getByText('错题集', { exact: true }).click();
    await expect(page).toHaveURL(/\/student\/wrong-questions$/);
    await expect(drawer).not.toHaveClass(/ant-drawer-open/);
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`首页在 ${viewport.name} 视口无页面级横向滚动`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await expect(page.getByTestId('start-daily-practice')).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    });
  }

  test('移动端答题导航、选项与提交操作可见', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/student/activity/1');

    await expect(page.getByRole('heading', { name: '信息科技基础练习' })).toBeVisible();
    await expect(page.getByRole('button', { name: /第 1 题/ })).toBeVisible();
    // 2026-09 版式改版：选项字母为圆形徽标，选项文本不再带 "A." 前缀
    await expect(page.getByText('键盘').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /提交答案/ })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test('移动端错题使用卡片并可打开重新作答', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/student/wrong-questions');

    await expect(page.getByRole('heading', { name: '错题巩固站' })).toBeVisible();
    await expect(page.locator('.wrong-question-card')).toBeVisible();
    await page.getByRole('button', { name: '重新作答' }).click();
    await expect(page.getByText('重新挑战这道题')).toBeVisible();
    await expect(page.getByText('B. 9')).toBeVisible();
  });
});
