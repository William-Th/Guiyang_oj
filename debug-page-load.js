/**
 * 调试脚本：测试题库管理页面加载并捕获详细错误
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 捕获所有控制台消息
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });

  // 捕获页面错误
  const errors = [];
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
    console.error('[STACK]', error.stack);
    errors.push(error.message);
  });

  // 捕获请求失败
  page.on('requestfailed', request => {
    console.log('[REQUEST FAILED]', request.url(), request.failure().errorText);
  });

  try {
    console.log('1. 清除 localStorage...');
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      console.log('[DEBUG] localStorage before clear:', JSON.stringify(localStorage));
      localStorage.clear();
      console.log('[DEBUG] localStorage after clear:', JSON.stringify(localStorage));
    });

    console.log('2. 登录为教师...');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(2000);

    await page.fill('input[placeholder="请输入用户名"]', 'teacher_yy_ps_math');
    await page.fill('input[placeholder="请输入密码"]', 'password123');
    await page.click('button:has-text("登录")');

    // 等待登录完成
    await page.waitForURL(/\/teacher/, { timeout: 10000 });
    console.log('✓ 登录成功');

    console.log('3. 访问题库管理页面...');
    await page.goto('http://localhost:3000/teacher/question-bank');

    // 等待一下，看看是否有错误
    await page.waitForTimeout(3000);

    // 检查页面状态
    const pageText = await page.textContent('body');
    console.log('页面内容前100字符:', pageText.substring(0, 100));

    // 检查 localStorage
    const localStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    console.log('\n[localStorage]', JSON.stringify(localStorageData, null, 2));

    // 检查 Redux state
    const reduxState = await page.evaluate(() => {
      return window.__REDUX_STATE__ || window.store?.getState();
    });
    console.log('\n[Redux State]', JSON.stringify(reduxState, null, 2));

    console.log('\n总错误数:', errors.length);
    if (errors.length > 0) {
      console.log('错误列表:', errors);
    }

    console.log('\n按任意键关闭浏览器...');
    await new Promise(resolve => process.stdin.once('data', resolve));

  } catch (error) {
    console.error('脚本执行错误:', error);
  } finally {
    await browser.close();
  }
})();
