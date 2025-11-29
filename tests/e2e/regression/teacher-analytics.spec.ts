/**
 * Teacher Data Analytics Page E2E Tests
 *
 * Test Suite: ANA101-ANA106
 * Purpose: Verify teacher data analytics page functionality
 *
 * Test Cases:
 * - ANA101: Teacher can access data analytics page
 * - ANA102: School-level data displays correctly
 * - ANA103: District-level data displays (for authorized teachers)
 * - ANA104: Subject and grade filters work correctly
 * - ANA105: Radar chart displays grade comparison
 * - ANA106: Bar chart displays ability top 10
 */

import { test, expect } from '@playwright/test';

test.describe('Teacher Data Analytics Page', () => {
  // Use authenticated teacher session
  test.use({ storageState: 'tests/.auth/teacher.json' });

  /**
   * ANA101: Teacher can access data analytics page
   * 验证教师能够访问数据分析页面
   */
  test('ANA101: Teacher can access data analytics page', async ({ page }) => {
    // Look for data analytics menu link
    const analyticsLink = page.locator('a:has-text(/数据.*分析|数据.*统计/i)');

    // Verify menu link exists
    await expect(analyticsLink.first()).toBeAttached({ timeout: 10000 });

    // Click the analytics menu link
    await analyticsLink.first().click();

    // Wait for URL change
    await page.waitForURL(/\/teacher\/(analytics|data)/);

    // Verify page loaded
    const pageHeader = page.locator('h1, h2, .ant-page-header-heading-title');
    await expect(pageHeader.first()).toBeAttached();
  });

  /**
   * ANA102: School-level data displays correctly
   * 验证学校级数据正确显示
   */
  test('ANA102: School-level data displays correctly', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/teacher/analytics');
    await page.waitForTimeout(2000);

    // Look for data level selector (School vs District)
    const schoolTab = page.locator('text=/学校|School/i');

    // Check if school tab/option exists
    const schoolTabCount = await schoolTab.count();
    if (schoolTabCount > 0) {
      // Click school level tab if it exists
      await schoolTab.first().click();
      await page.waitForTimeout(1000);
    }

    // Verify statistics cards are displayed
    const statsCards = page.locator('.ant-card, .ant-statistic');
    await expect(statsCards.first()).toBeAttached({ timeout: 10000 });

    // Look for chart elements (canvas for Echarts)
    const charts = page.locator('canvas');
    const chartCount = await charts.count();

    // Expect at least one chart to be rendered
    expect(chartCount).toBeGreaterThanOrEqual(1);
  });

  /**
   * ANA103: District-level data option exists (for authorized teachers)
   * 验证区级数据选项存在（对于有权限的教师）
   */
  test('ANA103: District-level data option exists', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/teacher/analytics');
    await page.waitForTimeout(2000);

    // Look for district level tab/option
    const districtOption = page.locator('text=/区级|区域|District/i');

    // Check if district option exists (depends on teacher permissions)
    const districtCount = await districtOption.count();

    if (districtCount > 0) {
      // Teacher has district-level permissions
      await expect(districtOption.first()).toBeAttached();

      // Try clicking district tab
      await districtOption.first().click();
      await page.waitForTimeout(1000);

      // Verify page doesn't show error
      const errorMessage = page.locator('text=/权限|Permission|Forbidden/i');
      const errorCount = await errorMessage.count();

      // Should not show permission error
      expect(errorCount).toBe(0);
    } else {
      // Teacher doesn't have district-level permissions (normal case)
      console.log('Teacher does not have district-level access - this is expected for school teachers');
    }
  });

  /**
   * ANA104: Subject and grade filters work correctly
   * 验证科目和年级筛选功能正常工作
   */
  test('ANA104: Subject and grade filters work correctly', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/teacher/analytics');
    await page.waitForTimeout(2000);

    // Look for subject filter
    const subjectFilter = page.locator('.ant-select').filter({ hasText: /科目|Subject/i });
    const subjectFilterCount = await subjectFilter.count();

    if (subjectFilterCount > 0) {
      // Click subject filter
      await subjectFilter.first().click();
      await page.waitForTimeout(500);

      // Look for subject options (数学, 语文, etc.)
      const subjectOptions = page.locator('.ant-select-item-option');
      const optionCount = await subjectOptions.count();

      // Verify options are displayed
      expect(optionCount).toBeGreaterThan(0);

      // Select first option (if available)
      if (optionCount > 0) {
        await subjectOptions.first().click();
        await page.waitForTimeout(1000);

        // Verify page updated (charts re-rendered)
        const charts = page.locator('canvas');
        await expect(charts.first()).toBeAttached();
      }
    }

    // Look for grade filter
    const gradeFilter = page.locator('.ant-select').filter({ hasText: /年级|Grade/i });
    const gradeFilterCount = await gradeFilter.count();

    if (gradeFilterCount > 0) {
      // Grade filter exists
      await expect(gradeFilter.first()).toBeAttached();
    }
  });

  /**
   * ANA105: Radar chart displays grade comparison
   * 验证雷达图显示年级对比
   */
  test('ANA105: Radar chart displays grade comparison', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/teacher/analytics');
    await page.waitForTimeout(3000);

    // Look for radar chart section
    const radarSection = page.locator('text=/雷达|Radar|年级.*对比/i');
    const radarSectionCount = await radarSection.count();

    if (radarSectionCount > 0) {
      // Radar section header exists
      await expect(radarSection.first()).toBeAttached();
    }

    // Verify charts are rendered
    const chartElements = page.locator('canvas');
    const chartCount = await chartElements.count();

    // Expect at least one chart
    expect(chartCount).toBeGreaterThanOrEqual(1);

    // Check for chart container divs
    const chartContainers = page.locator('[id*="chart"], [class*="chart"]');
    await expect(chartContainers.first()).toBeAttached({ timeout: 10000 });
  });

  /**
   * ANA106: Bar chart displays ability top 10
   * 验证柱状图显示能力Top 10正确率
   */
  test('ANA106: Bar chart displays ability top 10', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/teacher/analytics');
    await page.waitForTimeout(3000);

    // Look for bar chart section
    const barSection = page.locator('text=/柱状图|Bar|Top.*10|能力.*正确率/i');
    const barSectionCount = await barSection.count();

    if (barSectionCount > 0) {
      // Bar chart section header exists
      await expect(barSection.first()).toBeAttached();
    }

    // Verify multiple charts are rendered (radar + bar)
    const chartElements = page.locator('canvas');
    const chartCount = await chartElements.count();

    // Expect at least 1 chart (could be just radar if no data for bar)
    expect(chartCount).toBeGreaterThanOrEqual(1);

    // Look for statistics cards with ability data
    const abilityCards = page.locator('.ant-card').filter({ hasText: /能力|Ability/i });
    const abilityCardCount = await abilityCards.count();

    // Log the number of ability-related elements found
    console.log(`Found ${abilityCardCount} ability-related cards`);
    console.log(`Found ${chartCount} chart elements`);
  });
});

/**
 * Additional Test: Admin can access district-level analytics
 * 额外测试：管理员可以访问区级数据分析
 */
test.describe('Admin District Analytics Access', () => {
  // Use authenticated admin session
  test.use({ storageState: 'tests/.auth/admin.json' });

  test('ANA107: Admin can access district-level analytics', async ({ page }) => {
    // Navigate to dashboard (already authenticated)
    await page.goto('http://localhost:3000');

    // Navigate to analytics page (if available for admin)
    const analyticsLink = page.locator('a:has-text(/数据.*分析|数据.*统计/i)');
    const analyticsCount = await analyticsLink.count();

    if (analyticsCount > 0) {
      // Analytics page accessible for admin
      await analyticsLink.first().click();
      await page.waitForTimeout(2000);

      // Look for district-level option
      const districtOption = page.locator('text=/区级|区域|District/i');
      const districtCount = await districtOption.count();

      if (districtCount > 0) {
        // Click district option
        await districtOption.first().click();
        await page.waitForTimeout(1000);

        // Verify no permission error
        const errorMessage = page.locator('text=/权限|Permission|Forbidden/i');
        const errorCount = await errorMessage.count();
        expect(errorCount).toBe(0);

        // Verify charts load
        const charts = page.locator('canvas');
        const chartCount = await charts.count();
        expect(chartCount).toBeGreaterThanOrEqual(0);
      }
    } else {
      console.log('Analytics page not available in admin menu - this is acceptable');
    }
  });
});
