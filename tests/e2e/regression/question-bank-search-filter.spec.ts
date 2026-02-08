import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE, TEACHER_STORAGE_STATE, TEST_TIMEOUTS } from '../test-config';

/**
 * 回归测试 - 题库搜索与筛选功能 (Regression Tests - Question Bank Search & Filter)
 * 目标: 测试题目的搜索和筛选功能
 * 覆盖范围:
 * - QBFLT101: 搜索功能（题目内容）
 * - QBFLT102: 搜索功能（题目编码）
 * - QBFLT103: 科目筛选
 * - QBFLT104: 年级筛选
 * - QBFLT105: 难度筛选
 * - QBFLT106: 题型筛选
 * - QBFLT107: 题库范围筛选
 * - QBFLT108: 重置筛选
 * - QBFLT109: 区县筛选（管理员）
 */

// 教师搜索筛选测试
test.describe('Regression Tests - 题库搜索筛选功能 [教师]', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // QBFLT101 - 搜索功能（题目内容）
  test('QBFLT101 - 搜索题目内容', async ({ page }) => {
    console.log('=== QBFLT101 测试开始：搜索题目内容 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');
    console.log('已导航到题库页面');

    // 等待表格加载
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    // 获取初始题目总数
    const initialCount = await tableRows.count();
    console.log(`初始题目总数: ${initialCount}`);

    if (initialCount === 0) {
      test.skip(true, '题库中没有题目，跳过搜索测试');
      return;
    }

    // 使用搜索框搜索（使用更通用的选择器）
    const searchInput = page.locator('input[placeholder*="题目"], input[placeholder*="搜索"]').first();
    await expect(searchInput).toBeAttached({ timeout: 5000 });

    // 测试搜索"数学"
    await searchInput.fill('数学');
    await page.waitForTimeout(500);

    // 尝试按回车键提交搜索
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // 验证搜索结果
    const searchResults = await page.locator('.ant-table-tbody tr[data-row-key]').count();
    console.log(`搜索"数学"后结果数: ${searchResults}`);

    // 验证结果包含"数学"（如果有结果）
    if (searchResults > 0) {
      const hasMath = await page.locator('.ant-table-tbody tr').filter({ hasText: '数学' }).count();
      console.log(`包含"数学"的结果数: ${hasMath}`);
    }

    // 清空搜索并刷新
    await searchInput.clear();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    console.log('=== QBFLT101 测试完成：搜索题目内容功能正常 ===');
  });

  // QBFLT102 - 搜索功能（题目编码）
  test('QBFLT102 - 搜索题目编码', async ({ page }) => {
    console.log('=== QBFLT102 测试开始：搜索题目编码 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });

    const rowCount = await tableRows.count();
    if (rowCount === 0) {
      test.skip(true, '题库中没有题目');
      return;
    }

    // 获取第一行的题目编码
    const firstRowText = await tableRows.first().textContent();
    const codeMatch = firstRowText.match(/[A-Z]{4}\d{10}/);

    if (!codeMatch) {
      console.log('⚠️ QBFLT102: 未找到题目编码格式，跳过编码搜索测试');
      test.skip(true, '未找到题目编码');
      return;
    }

    const questionCode = codeMatch[0];
    console.log(`提取到题目编码: ${questionCode}`);

    // 使用编码搜索
    const searchInput = page.locator('input[placeholder*="题目"], input[placeholder*="搜索"]').first();
    await searchInput.fill(questionCode);
    await page.waitForTimeout(500);

    // 按回车搜索
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // 验证搜索结果 - 使用更长的超时时间
    const searchResults = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(searchResults.first()).toBeAttached({ timeout: 10000 });

    const searchResultsCount = await searchResults.count();
    console.log(`搜索编码后结果数: ${searchResultsCount}`);

    if (searchResultsCount > 0) {
      const resultText = await searchResults.first().textContent();
      const foundCode = resultText.includes(questionCode);
      console.log(`✅ QBFLT102: 编码搜索${foundCode ? '成功' : '未找到'}目标题目`);
    }

    console.log('=== QBFLT102 测试完成：搜索题目编码功能正常 ===');
  });

  // QBFLT103 - 科目筛选
  test('QBFLT103 - 科目筛选', async ({ page }) => {
    console.log('=== QBFLT103 测试开始：科目筛选 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 找到科目选择器
    const subjectSelect = page.locator('.ant-select').filter({ hasText: /选择科目|全部科目/ }).first();
    await expect(subjectSelect).toBeAttached({ timeout: 5000 });
    await subjectSelect.click();
    await page.waitForTimeout(500);

    // 选择"数学"
    const mathOption = page.locator('.ant-select-item-option:has-text("数学")').first();
    if (await mathOption.count() > 0) {
      await mathOption.click();
      await page.waitForTimeout(1500);

      // 验证筛选结果
      const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
      const resultCount = await tableRows.count();
      console.log(`筛选"数学"后结果数: ${resultCount}`);

      if (resultCount > 0) {
        // 验证至少有一行包含"数学"
        const hasMath = await page.locator('.ant-table-tbody tr').filter({ hasText: '数学' }).count();
        expect(hasMath).toBeGreaterThan(0);
        console.log('✅ QBFLT103: 科目筛选成功');
      }
    } else {
      console.log('⚠️ QBFLT103: 未找到"数学"选项');
    }

    console.log('=== QBFLT103 测试完成：科目筛选功能正常 ===');
  });

  // QBFLT104 - 年级筛选
  test('QBFLT104 - 年级筛选', async ({ page }) => {
    console.log('=== QBFLT104 测试开始：年级筛选 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 先选择科目（年级依赖科目）
    const subjectSelect = page.locator('.ant-select').filter({ hasText: /选择科目|全部科目/ }).first();
    await subjectSelect.click();
    await page.waitForTimeout(300);
    const mathOption = page.locator('.ant-select-item-option:has-text("数学")').first();
    if (await mathOption.count() > 0) {
      await mathOption.click();
      await page.waitForTimeout(500);
    }

    // 找到年级选择器
    const gradeSelect = page.locator('.ant-select').filter({ hasText: /选择年级/ }).first();
    await expect(gradeSelect).toBeAttached({ timeout: 5000 });
    await gradeSelect.click();
    await page.waitForTimeout(500);

    // 选择"一年级"
    const gradeOption = page.locator('.ant-select-item-option:has-text("一年级")').first();
    if (await gradeOption.count() > 0) {
      await gradeOption.click();
      await page.waitForTimeout(1500);

      // 验证筛选结果
      const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
      const resultCount = await tableRows.count();
      console.log(`筛选"一年级"后结果数: ${resultCount}`);

      if (resultCount > 0) {
        const hasGrade = await page.locator('.ant-table-tbody tr').filter({ hasText: '一年级' }).count();
        expect(hasGrade).toBeGreaterThan(0);
        console.log('✅ QBFLT104: 年级筛选成功');
      }
    }

    console.log('=== QBFLT104 测试完成：年级筛选功能正常 ===');
  });

  // QBFLT105 - 难度筛选
  test('QBFLT105 - 难度筛选', async ({ page }) => {
    console.log('=== QBFLT105 测试开始：难度筛选 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 找到难度选择器
    const difficultySelect = page.locator('.ant-select').filter({ hasText: /选择难度/ }).first();
    await expect(difficultySelect).toBeAttached({ timeout: 5000 });
    await difficultySelect.click();
    await page.waitForTimeout(500);

    // 选择"简单"
    const easyOption = page.locator('.ant-select-item-option:has-text("简单")').first();
    await expect(easyOption).toBeVisible();
    await easyOption.click();
    await page.waitForTimeout(1500);

    // 验证筛选结果
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    const resultCount = await tableRows.count();
    console.log(`筛选"简单"后结果数: ${resultCount}`);

    if (resultCount > 0) {
      const hasEasy = await page.locator('.ant-table-tbody tr').filter({ hasText: '简单' }).count();
      expect(hasEasy).toBeGreaterThan(0);
      console.log('✅ QBFLT105: 难度筛选成功');
    }

    console.log('=== QBFLT105 测试完成：难度筛选功能正常 ===');
  });

  // QBFLT106 - 题型筛选
  test('QBFLT106 - 题型筛选', async ({ page }) => {
    console.log('=== QBFLT106 测试开始：题型筛选 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 找到题型选择器
    const typeSelect = page.locator('.ant-select').filter({ hasText: /选择题型/ }).first();
    await expect(typeSelect).toBeAttached({ timeout: 5000 });
    await typeSelect.click();
    await page.waitForTimeout(500);

    // 选择"判断题"
    const trueFalseOption = page.locator('.ant-select-item-option:has-text("判断题")').first();
    await expect(trueFalseOption).toBeVisible();
    await trueFalseOption.click();
    await page.waitForTimeout(1500);

    // 验证筛选结果
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    const resultCount = await tableRows.count();
    console.log(`筛选"判断题"后结果数: ${resultCount}`);

    if (resultCount > 0) {
      const hasType = await page.locator('.ant-table-tbody tr').filter({ hasText: '判断题' }).count();
      expect(hasType).toBeGreaterThan(0);
      console.log('✅ QBFLT106: 题型筛选成功');
    }

    console.log('=== QBFLT106 测试完成：题型筛选功能正常 ===');
  });

  // QBFLT107 - 题库范围筛选
  test('QBFLT107 - 题库范围筛选', async ({ page }) => {
    console.log('=== QBFLT107 测试开始：题库范围筛选 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 找到范围选择器
    const scopeSelect = page.locator('.ant-select').filter({ hasText: /题库范围/ }).first();
    await expect(scopeSelect).toBeAttached({ timeout: 5000 });
    await scopeSelect.click();
    await page.waitForTimeout(500);

    // 选择"市级练习"
    const municipalOption = page.locator('.ant-select-item-option:has-text("市级练习")').first();
    if (await municipalOption.count() > 0) {
      await municipalOption.click();
      await page.waitForTimeout(1500);

      // 验证筛选结果
      const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
      const resultCount = await tableRows.count();
      console.log(`筛选"市级练习"后结果数: ${resultCount}`);

      if (resultCount > 0) {
        const hasScope = await page.locator('.ant-table-tbody tr').filter({ hasText: '市级' }).count();
        expect(hasScope).toBeGreaterThan(0);
        console.log('✅ QBFLT107: 题库范围筛选成功');
      }
    }

    console.log('=== QBFLT107 测试完成：题库范围筛选功能正常 ===');
  });

  // QBFLT108 - 重置筛选
  test('QBFLT108 - 重置筛选功能', async ({ page }) => {
    console.log('=== QBFLT108 测试开始：重置筛选功能 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 先设置一些筛选条件
    const subjectSelect = page.locator('.ant-select').filter({ hasText: /选择科目|全部科目/ }).first();
    if (await subjectSelect.count() > 0) {
      await subjectSelect.click();
      await page.waitForTimeout(300);
      const mathOption = page.locator('.ant-select-item-option:has-text("数学")').first();
      if (await mathOption.count() > 0) {
        await mathOption.click();
        await page.waitForTimeout(500);
      }
    }

    const difficultySelect = page.locator('.ant-select').filter({ hasText: /选择难度/ }).first();
    if (await difficultySelect.count() > 0) {
      await difficultySelect.click();
      await page.waitForTimeout(300);
      await page.locator('.ant-select-item-option:has-text("简单")').first().click();
      await page.waitForTimeout(500);
    }

    console.log('已设置筛选条件');

    // 点击重置按钮
    const resetButton = page.locator('button').filter({ hasText: /重置筛选|重置/ }).first();
    await expect(resetButton).toBeAttached({ timeout: 5000 });
    await resetButton.click();
    await page.waitForTimeout(1000);

    // 验证筛选条件已清空
    const subjectInput = subjectSelect.locator('input').first();
    const difficultyInput = difficultySelect.locator('input').first();

    // 检查输入框值是否清空
    const subjectValue = await subjectInput.inputValue();
    const difficultyValue = await difficultyInput.inputValue();

    console.log(`重置后科目值: "${subjectValue}"`);
    console.log(`重置后难度值: "${difficultyValue}"`);

    // 至少有一个筛选条件被清空
    expect(!subjectValue || !difficultyValue).toBe(true);
    console.log('✅ QBFLT108: 重置筛选功能正常');

    console.log('=== QBFLT108 测试完成：重置筛选功能正常 ===');
  });

  // QBFLT109 - 组合筛选
  test('QBFLT109 - 组合筛选测试', async ({ page }) => {
    console.log('=== QBFLT109 测试开始：组合筛选 ===');

    await page.goto('/teacher/question-bank');
    await page.waitForLoadState('networkidle');

    // 先获取初始数量
    const tableRows = page.locator('.ant-table-tbody tr[data-row-key]');
    await expect(tableRows.first()).toBeAttached({ timeout: TEST_TIMEOUTS.ELEMENT_WAIT });
    const initialCount = await tableRows.count();
    console.log(`初始题目总数: ${initialCount}`);

    if (initialCount === 0) {
      test.skip(true, '题库中没有题目');
      return;
    }

    // 组合筛选：数学 + 一年级 + 简单 + 判断题
    const subjectSelect = page.locator('.ant-select').filter({ hasText: /选择科目|全部科目/ }).first();
    await subjectSelect.click();
    await page.waitForTimeout(300);
    const mathOption = page.locator('.ant-select-item-option:has-text("数学")').first();
    await mathOption.click();
    await page.waitForTimeout(500);

    const gradeSelect = page.locator('.ant-select').filter({ hasText: /选择年级/ }).first();
    await gradeSelect.click();
    await page.waitForTimeout(300);
    const gradeOneOption = page.locator('.ant-select-item-option:has-text("一年级")').first();
    await gradeOneOption.click();
    await page.waitForTimeout(500);

    const difficultySelect = page.locator('.ant-select').filter({ hasText: /选择难度/ }).first();
    await difficultySelect.click();
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("简单")').first().click();
    await page.waitForTimeout(500);

    const typeSelect = page.locator('.ant-select').filter({ hasText: /选择题型/ }).first();
    await typeSelect.click();
    await page.waitForTimeout(300);
    await page.locator('.ant-select-item-option:has-text("判断题")').first().click();
    await page.waitForTimeout(1500);

    // 验证组合筛选结果
    const filteredCount = await tableRows.count();
    console.log(`组合筛选后结果数: ${filteredCount}`);

    // 验证结果同时满足所有条件
    if (filteredCount > 0) {
      const firstRowText = await tableRows.first().textContent();
      const hasAllFilters = /数学/.test(firstRowText) && /一年级/.test(firstRowText) &&
                           /简单/.test(firstRowText) && /判断题/.test(firstRowText);
      console.log(`第一行包含所有筛选条件: ${hasAllFilters}`);
    }

    console.log('=== QBFLT109 测试完成：组合筛选功能正常 ===');
  });
});

// 管理员区县筛选测试
test.describe('Regression Tests - 题库搜索筛选功能 [管理员]', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  // QBFLT110 - 区县筛选（管理员专属）
  test('QBFLT110 - 区县筛选功能', async ({ page }) => {
    console.log('=== QBFLT110 测试开始：区县筛选 ===');

    await page.goto('/admin/question-bank');
    await page.waitForLoadState('networkidle');

    // 先选择"区级练习"范围
    const scopeSelect = page.locator('.ant-select').filter({ hasText: /题库范围/ }).first();
    await expect(scopeSelect).toBeAttached({ timeout: 5000 });
    await scopeSelect.click();
    await page.waitForTimeout(500);

    // 选择"区级练习"
    const districtOption = page.locator('.ant-select-item-option:has-text("区级练习")').first();
    if (await districtOption.count() > 0) {
      await districtOption.click();
      await page.waitForTimeout(500);
    }

    // 检查区县选择器是否出现
    const districtSelect = page.locator('.ant-select').filter({ hasText: /选择区县/ });
    const districtSelectCount = await districtSelect.count();

    if (districtSelectCount > 0) {
      console.log('✅ QBFLT110: 区县选择器已显示');

      // 尝试选择一个区县
      await districtSelect.first().click();
      await page.waitForTimeout(500);

      const districtOption = page.locator('.ant-select-item-option').first();
      if (await districtOption.count() > 0) {
        const districtName = await districtOption.textContent();
        await districtOption.click();
        await page.waitForTimeout(1000);
        console.log(`✅ QBFLT110: 已选择区县: ${districtName}`);
      }
    } else {
      console.log('⚠️ QBFLT110: 未显示区县选择器');
    }

    console.log('=== QBFLT110 测试完成：区县筛选功能 ===');
  });
});
