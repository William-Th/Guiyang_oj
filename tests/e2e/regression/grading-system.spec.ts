/**
 * GRD001-004: 批改系统改进 E2E
 *
 * 本 spec 覆盖 GRADING_SYSTEM_IMPROVEMENT_PLAN 中的 P3 测试项：
 *   GRD001 判断题自动判题  ← 后端单元测试 autoGradingService.trueFalse.test.js 已覆盖（18/18）
 *   GRD002 匹配题自动判题  ← 后端单元测试 autoGradingService.matching.test.js 已覆盖（13/13）
 *   GRD003 学生结果按题型分组显示 ← 本 spec 验证 UI 层
 *   GRD004 教师批改按题型分组显示 ← 本 spec 验证 UI 层
 *
 * 数据依赖（来自演示数据集）：
 *   - student_activity.id = 134, activity_id = 300 (张小明完成的基础数学练习)
 *   - 至少包含 2 种题型，且 status IN ('submitted', 'graded')
 */

import { test, expect } from '@playwright/test';
import { loginAsStudent, loginAsAdmin } from '../../helpers/auth';

const DEMO_ACTIVITY_ID = 300;             // activity.id 用于学生结果页
const DEMO_STUDENT_ACTIVITY_ID = 134;     // student_activity.id 用于教师批改页

test.describe('Grading System Improvements (GRD)', () => {
  test('GRD003: 学生端结果页按题型分组显示', async ({ page }) => {
    await loginAsStudent(page, '13800138003', 'password123');

    await page.goto(`/student/results/${DEMO_ACTIVITY_ID}`);
    await page.waitForLoadState('networkidle');

    // 结果页主标题
    await expect(page.locator('text=/答题详情|答题/').first()).toBeVisible({ timeout: 10000 });

    // 至少出现一个题型分组标题（"一、单选题"、"二、判断题"等）
    // 题型显示顺序：单选题 → 多选题 → 判断题 → 填空题 → 匹配题 → 主观题 → 编程题
    const groupHeader = page.locator(
      'text=/^[一二三四五六七八九]、(单选题|多选题|判断题|填空题|匹配题|主观题|编程题)/'
    );
    await expect(groupHeader.first()).toBeVisible({ timeout: 5000 });

    // 分组标题应包含"共 X 题"统计
    const groupStats = page.locator('text=/共\\s*\\d+\\s*题/');
    await expect(groupStats.first()).toBeVisible();
  });

  test('GRD004: 教师批改详情页按题型分组显示 + 侧边栏分组导航', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto(`/teacher/grading/${DEMO_STUDENT_ACTIVITY_ID}`);
    await page.waitForLoadState('networkidle');

    // 评卷详情主标题
    await expect(page.locator('text=/评卷详情|批改/').first()).toBeVisible({ timeout: 10000 });

    // 主区域：至少一个题型分组带高亮标题（"一、X"格式 + 已评 N/M）
    const mainGroupHeader = page.locator(
      'text=/^[一二三四五六七八九]、(单选题|多选题|判断题|填空题|匹配题|论述题|简答题|编程题)/'
    );
    await expect(mainGroupHeader.first()).toBeVisible({ timeout: 5000 });

    // 分组应展示批改进度统计（"已评 N/M"）
    const progressStat = page.locator('text=/已评\\s*\\d+\\/\\d+/');
    await expect(progressStat.first()).toBeVisible();

    // 侧边栏导航：每个题型分组应有标题（题型名（N/M)）
    // 例："单选题（1/2）"
    const sidebarGroup = page.locator(
      'text=/(单选题|多选题|判断题|填空题|匹配题|论述题|简答题|编程题)（\\d+\\/\\d+）/'
    );
    await expect(sidebarGroup.first()).toBeVisible();
  });
});
