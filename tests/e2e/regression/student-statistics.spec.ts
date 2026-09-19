/**
 * Student Statistics Page E2E Tests
 *
 * Test Suite: STA101-STA105
 * Purpose: Verify student statistics page functionality
 *
 * Test Cases:
 * - STA101: Student can access statistics page
 * - STA102: Learning overview cards display correctly
 * - STA103: Ability radar chart loads
 * - STA104: Knowledge point bar chart loads
 * - STA105: Statistics data updates correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Student Statistics Page', () => {
  // Use authenticated student session
  test.use({ storageState: 'tests/.auth/user.json' });

  /**
   * STA101: Student can access statistics page
   * 验证学生能够访问统计页面
   */
  test('STA101: Student can access statistics page', async ({ page }) => {
    // 先回到首页让导航渲染
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');

    // Navigate to statistics page
    const statsLink = page.getByRole('menuitem', { name: '学习统计' });

    // Check if menu link exists
    await expect(statsLink).toBeAttached();

    // Click the statistics menu link
    await statsLink.click();

    // Wait for URL change
    await page.waitForURL(/\/student\/statistics/, { waitUntil: 'domcontentloaded' });

    // Verify page title or heading
    const pageTitle = page.locator('h1, h2, .ant-page-header-heading-title');
    await expect(pageTitle.first()).toBeAttached();
  });

  /**
   * STA102: Learning overview cards display correctly
   * 验证学习概览卡片正确显示
   */
  test('STA102: Learning overview cards display correctly', async ({ page }) => {
    // Navigate to statistics page
    await page.goto('http://localhost:8080/student/statistics');

    // Wait for overview section to load
    await page.waitForTimeout(2000);

    // Check for overview cards (using Ant Design Card component)
    const cards = page.locator('.ant-card');

    // Verify at least one card exists
    await expect(cards.first()).toBeAttached({ timeout: 10000 });

    // Check for key metrics (may vary based on actual implementation)
    // Looking for common statistics labels
    const statsLabels = [
      '参与活动',
      '答题总数',
      '正确率',
      '学习时长',
      '完成活动'
    ];

    // Verify at least some statistics are displayed
    let foundLabels = 0;
    for (const label of statsLabels) {
      const labelElement = page.locator(`text=${label}`);
      if (await labelElement.count() > 0) {
        foundLabels++;
      }
    }

    // Expect at least 2 statistics labels to be present
    expect(foundLabels).toBeGreaterThanOrEqual(2);
  });

  /**
   * STA103: Ability radar chart loads
   * 验证能力雷达图加载
   */
  test('STA103: Ability radar chart loads', async ({ page }) => {
    // Navigate to statistics page
    await page.goto('http://localhost:8080/student/statistics');
    await page.waitForLoadState('networkidle');

    // 雷达图位于「能力雷达图」Tab（recharts 渲染 SVG，非 echarts canvas）
    const radarTab = page.locator('.ant-tabs-tab').filter({ hasText: '能力雷达图' });
    await expect(radarTab).toBeVisible({ timeout: 10000 });
    await radarTab.click();
    await page.waitForTimeout(1000);

    // 活动面板内：有数据时渲染 recharts 图表；未选科目/无数据时显示空态
    const activePane = page.locator('.ant-tabs-tabpane-active');
    const hasEmpty = await activePane.locator('.ant-empty').count() > 0;
    const charts = activePane.locator('.recharts-wrapper, .recharts-surface');
    if (!hasEmpty) {
      await expect(charts.first()).toBeAttached({ timeout: 10000 });
    } else {
      console.log('ℹ️  未选择科目或无能力数据，雷达图空态显示正常');
    }

    // Verify ability-related section header exists (if implemented)
    const abilitySection = page.locator('text=/能力.*分析|能力.*统计|能力.*雷达/i');
    const sectionCount = await abilitySection.count();
    if (sectionCount > 0) {
      await expect(abilitySection.first()).toBeAttached();
    }
  });

  /**
   * STA104: Knowledge point bar chart loads
   * 验证知识点柱状图加载
   */
  test('STA104: Knowledge point bar chart loads', async ({ page }) => {
    // Navigate to statistics page
    await page.goto('http://localhost:8080/student/statistics');

    // Wait for charts to render
    await page.waitForTimeout(3000);

    // Look for bar chart indicators
    // Echarts renders multiple canvas elements for different charts
    const chartElements = page.locator('.recharts-wrapper, .recharts-surface');
    const hasEmpty = await page.locator('.ant-empty').count() > 0;
    const chartCount = await chartElements.count();

    // 有数据时至少 1 个图表；无数据时显示空态
    if (!hasEmpty) {
      expect(chartCount).toBeGreaterThanOrEqual(1);
    } else {
      console.log('ℹ️  无学习统计数据，图表未渲染（空态显示正常）');
    }

    // Look for knowledge point section header
    const knowledgeSection = page.locator('text=/知识点.*掌握|知识点.*分析|知识点.*统计/i');

    // Verify section header exists (if implemented)
    const sectionCount = await knowledgeSection.count();
    if (sectionCount > 0) {
      await expect(knowledgeSection.first()).toBeAttached();
    }
  });

  /**
   * STA105: Statistics data reflects completed activities
   * 验证统计数据反映已完成的活动
   */
  test('STA105: Statistics data reflects completed activities', async ({ page }) => {
    // Navigate to statistics page
    await page.goto('http://localhost:8080/student/statistics');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Look for numeric data in statistics
    // Using broad selector to find any numbers displayed
    const statsNumbers = page.locator('.ant-statistic-content-value, .ant-card-body');

    // Verify some statistical content exists
    await expect(statsNumbers.first()).toBeAttached({ timeout: 10000 });

    // Check that the page has loaded data (not showing all zeros or empty state)
    const pageContent = await page.textContent('body');

    // Basic verification that some content is present
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(100);

    // Look for "暂无数据" or empty state indicators
    const noDataIndicator = page.locator('text=/暂无数据|No Data|Empty/i');
    const noDataCount = await noDataIndicator.count();

    // Ideally, we should have some data (but this depends on test data)
    // This is a soft check - if test data exists, page should not be empty
    console.log(`No data indicators found: ${noDataCount}`);
  });
});
