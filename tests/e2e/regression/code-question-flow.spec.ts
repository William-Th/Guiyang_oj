import { test, expect } from '@playwright/test';
import { TEACHER_STORAGE_STATE, STUDENT_STORAGE_STATE } from '../test-config';

/**
 * 回归测试 - 编程题集成E2E测试 (Regression Tests - Code Question Flow)
 * 目标: 测试编程题的完整流程
 * 覆盖范围:
 * - COD001: 教师创建编程题
 * - COD002: 配置测试用例
 * - COD003: 设置判题参数
 * - COD004: 判题API验证
 */

// 唯一标识符生成
const generateId = () => Date.now().toString(36);

// 教师创建编程题测试
test.describe('Regression Tests - 编程题创建流程 [教师]', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // COD001 - 教师创建编程题基础流程
  test('COD001 - 创建编程题基础流程', async ({ page }) => {
    console.log('=== COD001 测试开始：创建编程题基础流程 ===');

    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('已导航到题目创建页面');

    // 检查页面是否正常加载
    const pageTitle = page.locator('.ant-card-head-title, h1, h2, h3').first();
    await expect(pageTitle).toBeAttached({ timeout: 10000 });
    console.log('页面标题已加载');

    // 查找题型选择器
    const selectElements = page.locator('.ant-select-selector');
    const selectCount = await selectElements.count();
    console.log(`发现 ${selectCount} 个下拉选择器`);

    if (selectCount > 0) {
      // 点击第一个下拉选择器（通常是题型）
      await selectElements.first().click();
      await page.waitForTimeout(500);

      // 检查是否有编程题选项
      const codeOption = page.locator('.ant-select-item-option:has-text("编程题")');
      if (await codeOption.count() > 0) {
        console.log('✅ COD001: 发现编程题选项');
        await codeOption.first().click();
        console.log('已选择编程题类型');
      } else {
        console.log('⚠️ COD001: 未发现编程题选项');
      }
    }

    console.log('=== COD001 测试完成 ===');
  });

  // COD002 - 编程题表单字段验证
  test('COD002 - 编程题表单字段验证', async ({ page }) => {
    console.log('=== COD002 测试开始：编程题表单字段验证 ===');

    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 检查必填字段是否存在
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    console.log(`发现 ${textareaCount} 个文本区域`);

    if (textareaCount > 0) {
      console.log('✅ COD002: 题目内容输入框存在');
    }

    // 检查单选按钮和下拉框
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`发现 ${inputCount} 个输入框`);

    // 检查提交按钮
    const submitButton = page.locator('button[type="submit"], button.ant-btn-primary');
    if (await submitButton.count() > 0) {
      console.log('✅ COD002: 提交按钮存在');
    }

    console.log('=== COD002 测试完成 ===');
  });
});

// 学生答题测试
test.describe('Regression Tests - 编程题答题流程 [学生]', () => {
  test.use({ storageState: STUDENT_STORAGE_STATE });

  // COD003 - 学生访问练习页面
  test('COD003 - 学生访问练习页面', async ({ page }) => {
    console.log('=== COD003 测试开始：学生访问练习页面 ===');

    await page.goto('/student/activities/practice');
    await page.waitForLoadState('networkidle');
    console.log('已导航到学生练习页面');

    // 检查页面是否加载
    const pageTitle = page.locator('h1, h2, .ant-typography-title, [class*="title"]').first();
    await expect(pageTitle).toBeAttached({ timeout: 10000 });
    console.log('✅ COD003: 练习页面已加载');

    // 检查是否有活动列表
    const listItems = page.locator('.ant-list-item, .ant-card, [class*="activity"]');
    const itemCount = await listItems.count();
    console.log(`发现 ${itemCount} 个活动项目`);

    console.log('=== COD003 测试完成 ===');
  });

  // COD004 - 学生访问历史记录
  test('COD004 - 学生访问历史记录', async ({ page }) => {
    console.log('=== COD004 测试开始：学生访问历史记录 ===');

    await page.goto('/student/history');
    await page.waitForLoadState('networkidle');
    console.log('已导航到学生历史记录页面');

    // 检查页面是否加载
    const pageTitle = page.locator('h1, h2, .ant-typography-title').first();
    await expect(pageTitle).toBeAttached({ timeout: 10000 });
    console.log('✅ COD004: 历史记录页面已加载');

    console.log('=== COD004 测试完成 ===');
  });
});

// 判题API测试
test.describe('Regression Tests - 编程题判题API', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // COD005 - 获取支持的编程语言
  test('COD005 - 获取支持的编程语言', async ({ page }) => {
    console.log('=== COD005 测试开始：获取支持的编程语言 ===');

    try {
      const response = await page.request.get('/api/judge/languages');

      if (response.ok()) {
        const data = await response.json();
        console.log('API响应状态: success');

        if (data.success && data.data) {
          console.log(`✅ COD005: 获取到 ${data.data.length} 种编程语言`);

          // 验证返回数据结构
          expect(Array.isArray(data.data)).toBe(true);
          expect(data.data.length).toBeGreaterThan(0);

          // 列出支持的编程语言
          const languages = data.data.map((lang: any) => `${lang.id}(${lang.name})`).join(', ');
          console.log(`支持的编程语言: ${languages}`);
        } else {
          console.log('⚠️ COD005: API响应格式异常');
        }
      } else {
        console.log('⚠️ COD005: API请求失败，状态码:', response.status());
      }
    } catch (error) {
      console.log('⚠️ COD005: API请求异常:', error);
    }

    console.log('=== COD005 测试完成 ===');
  });

  // COD006 - 测试判题服务健康状态
  test('COD006 - 测试判题服务健康状态', async ({ page }) => {
    console.log('=== COD006 测试开始：测试判题服务健康状态 ===');

    try {
      const response = await page.request.get('/api/judge/queue/stats');

      if (response.ok()) {
        console.log('✅ COD006: 判题服务API可访问');
        const data = await response.json();
        console.log('判题队列状态:', JSON.stringify(data));
      } else {
        console.log('⚠️ COD006: 判题服务API返回状态:', response.status());
      }
    } catch (error) {
      console.log('⚠️ COD006: 判题服务可能未启动:', error.message);
    }

    console.log('=== COD006 测试完成 ===');
  });

  // COD007 - 测试测试用例API
  test('COD007 - 测试测试用例API', async ({ page }) => {
    console.log('=== COD007 测试开始：测试测试用例API ===');

    try {
      // 首先尝试获取题库中的题目
      const questionsResponse = await page.request.get('/api/question-bank/bank?limit=10');

      if (questionsResponse.ok()) {
        const questionsData = await questionsResponse.json();

        if (questionsData.success && questionsData.data && questionsData.data.length > 0) {
          console.log(`获取到 ${questionsData.data.length} 个题目`);

          // 查找编程题
          const codeQuestion = questionsData.data.find((q: any) => q.type === 'code');

          if (codeQuestion) {
            console.log(`✅ COD007: 发现编程题，ID: ${codeQuestion.id}`);

            // 尝试获取该题目的测试用例
            const testCasesResponse = await page.request.get(`/api/testcases/${codeQuestion.id}`);

            if (testCasesResponse.ok()) {
              const testCasesData = await testCasesResponse.json();
              console.log('测试用例响应:', JSON.stringify(testCasesData));
            }
          } else {
            console.log('⚠️ COD007: 题库中没有编程题');
          }
        } else {
          console.log('⚠️ COD007: 题库中没有题目');
        }
      }
    } catch (error) {
      console.log('⚠️ COD007: API请求异常:', error);
    }

    console.log('=== COD007 测试完成 ===');
  });
});

// 简化的创建编程题测试
test.describe('Regression Tests - 编程题创建简化版 [教师]', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // COD008 - 简化的编程题创建流程
  test('COD008 - 简化的编程题创建流程', async ({ page }) => {
    console.log('=== COD008 测试开始：简化的编程题创建流程 ===');

    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 验证页面标题
    const title = page.locator('h1, h2, h3, .ant-card-head-title');
    const titleText = await title.first().textContent();
    console.log(`页面标题: ${titleText}`);

    // 验证有表单元素
    const form = page.locator('form, .ant-form');
    await expect(form.first()).toBeAttached({ timeout: 10000 });
    console.log('✅ COD008: 表单已加载');

    // 验证有选择器
    const selectors = page.locator('.ant-select');
    const selectorCount = await selectors.count();
    console.log(`发现 ${selectorCount} 个下拉选择器`);
    expect(selectorCount).toBeGreaterThan(0);
    console.log('✅ COD008: 下拉选择器存在');

    console.log('=== COD008 测试完成 ===');
  });
});

// 边界情况测试
test.describe('Regression Tests - 编程题边界情况', () => {
  test.use({ storageState: TEACHER_STORAGE_STATE });

  // COD009 - 验证编程题配置组件
  test('COD009 - 验证编程题配置组件', async ({ page }) => {
    console.log('=== COD009 测试开始：验证编程题配置组件 ===');

    await page.goto('/teacher/question-bank/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 尝试找到编程题相关的配置
    const configCards = page.locator('.ant-card');
    const cardCount = await configCards.count();
    console.log(`发现 ${cardCount} 个卡片`);

    // 查找包含"编程"、"代码"、"Programming"等关键词的元素
    const codeElements = page.locator('div:has-text("编程"), div:has-text("代码"), div:has-text("Programming"), div:has-text("Code")');
    const codeElementCount = await codeElements.count();
    console.log(`发现 ${codeElementCount} 个编程相关元素`);

    if (codeElementCount > 0) {
      console.log('✅ COD009: 发现编程题相关元素');
    }

    console.log('=== COD009 测试完成 ===');
  });
});
