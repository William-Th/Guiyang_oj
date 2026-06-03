/**
 * 自动截图脚本 - 为演示文档生成所有功能页面截图（含丰富演示数据）
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3100';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * 登录函数
 */
async function login(page, type, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  if (type === 'teacher') {
    const teacherTab = page.locator('.ant-tabs-tab').filter({ hasText: '教师入口' });
    await teacherTab.click();
    await page.waitForTimeout(500);
    const teacherPane = page.locator('.ant-tabs-tabpane-active');
    await teacherPane.locator('input').first().fill(username);
    await teacherPane.locator('input[type="password"], .ant-input-password input').first().fill(password);
    await teacherPane.locator('button[type="submit"]').click();
  } else {
    const studentPane = page.locator('.ant-tabs-tabpane-active');
    await studentPane.locator('input').first().fill(username);
    await studentPane.locator('input[type="password"], .ant-input-password input').first().fill(password);
    await studentPane.locator('button[type="submit"]').click();
  }

  await page.waitForTimeout(4000);
  console.log(`  登录后 URL: ${page.url()}`);
}

async function screenshot(page, name, options = {}) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  const { fullPage = true, waitFor = 1500 } = options;

  if (waitFor > 0) {
    await page.waitForTimeout(waitFor);
  }

  await page.screenshot({ path: filePath, fullPage });
  console.log(`  ✅ ${name}.png`);
  return filePath;
}

async function gotoAndScreenshot(page, url, name, options = {}) {
  const { waitUntil = 'networkidle', timeout = 15000, waitFor = 1500, ...rest } = options;
  console.log(`  📸 ${name}: ${url}`);
  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil, timeout });
  } catch (e) {
    console.log(`    [加载超时，继续截图]`);
  }
  return await screenshot(page, name, { waitFor, ...rest });
}

async function main() {
  console.log('🚀 启动浏览器...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });

  // ========================================
  // 一、公共页面
  // ========================================
  console.log('━━━ 一、公共页面 ━━━');
  let page = await context.newPage();

  await gotoAndScreenshot(page, '/login', '01_login');
  await gotoAndScreenshot(page, '/register', '02_register');
  await gotoAndScreenshot(page, '/verify', '03_cert_verify');

  await page.close();

  // ========================================
  // 二、管理员端
  // ========================================
  console.log('\n━━━ 二、管理员端 (admin) ━━━');
  page = await context.newPage();
  await login(page, 'teacher', 'admin', 'password123');

  await gotoAndScreenshot(page, '/admin/home', '04_admin_home');
  await gotoAndScreenshot(page, '/admin/overview', '05_admin_overview');
  await gotoAndScreenshot(page, '/admin/users', '06_admin_users');
  await gotoAndScreenshot(page, '/admin/permissions', '07_admin_permissions');
  await gotoAndScreenshot(page, '/admin/approval-center', '08_admin_approval');
  await gotoAndScreenshot(page, '/admin/question-bank', '09_admin_question_bank');
  await gotoAndScreenshot(page, '/admin/question-bank/create', '10_admin_question_create', { waitFor: 2000 });
  await gotoAndScreenshot(page, '/admin/achievements', '11_admin_achievements');
  await gotoAndScreenshot(page, '/admin/assessments', '12_admin_assessments');

  await page.close();

  // ========================================
  // 三、教师端
  // ========================================
  console.log('\n━━━ 三、教师端 (teacher_yy_ps_math) ━━━');
  page = await context.newPage();
  await login(page, 'teacher', 'teacher_yy_ps_math', 'password123');

  await gotoAndScreenshot(page, '/teacher/question-bank', '13_teacher_question_bank');
  await gotoAndScreenshot(page, '/teacher/question-bank/create', '14_teacher_question_create', { waitFor: 2000 });
  await gotoAndScreenshot(page, '/teacher/review-workbench', '15_teacher_review');
  await gotoAndScreenshot(page, '/teacher/activities', '16_teacher_activities');
  await gotoAndScreenshot(page, '/teacher/grading', '17_teacher_grading');
  await gotoAndScreenshot(page, '/teacher/data-analytics', '18_teacher_analytics');
  await gotoAndScreenshot(page, '/teacher/teaching-classes', '19_teacher_classes');

  await page.close();

  // ========================================
  // 四、学生端 - 核心页面
  // ========================================
  console.log('\n━━━ 四、学生端 (13800138003) ━━━');
  page = await context.newPage();
  await login(page, 'student', '13800138003', 'password123');

  // 学生首页（现在有动态数据）
  await gotoAndScreenshot(page, '/', '20_student_home', { waitFor: 3000 });
  // 测评中心
  await gotoAndScreenshot(page, '/student/assessments', '21_student_assessments', { waitFor: 2000 });
  // 练习中心
  await gotoAndScreenshot(page, '/student/practice', '22_student_practice', { waitFor: 2000 });

  // ========================================
  // 四-2、学生在线答题页面
  // ========================================
  console.log('\n━━━ 四-2、学生在线答题 ━━━');

  // 进入一个练习活动的答题页面（数学基础计算天天练 id=30）
  await gotoAndScreenshot(page, '/student/activity/30', '33_student_taking_activity', { waitFor: 3000 });

  // ========================================
  // 四-3、学生成绩/结果页面
  // ========================================
  console.log('\n━━━ 四-3、学生成绩查看 ━━━');

  // 尝试查看一个已完成的答题结果
  // 找到张小明的已完成活动结果（student_activity id=1 对应活动 id=1）
  await gotoAndScreenshot(page, '/student/results/1', '34_student_result', { waitFor: 3000 });

  // 继续其他学生页面
  await gotoAndScreenshot(page, '/student/achievements', '23_student_achievements');
  await gotoAndScreenshot(page, '/student/points', '24_student_points', { waitFor: 2000 });
  await gotoAndScreenshot(page, '/student/statistics', '25_student_statistics');
  await gotoAndScreenshot(page, '/student/registrations', '26_student_registrations');

  await page.close();

  // ========================================
  // 五、区级管理员
  // ========================================
  console.log('\n━━━ 五、区级管理员 (yunyan_admin) ━━━');
  page = await context.newPage();
  await login(page, 'teacher', 'yunyan_admin', 'password123');

  await gotoAndScreenshot(page, '/admin/home', '27_district_admin_home');
  await gotoAndScreenshot(page, '/admin/users', '28_district_admin_users');

  await page.close();

  // ========================================
  // 六、交互弹窗截图
  // ========================================
  console.log('\n━━━ 六、交互弹窗截图 ━━━');

  // 成就详情弹窗
  page = await context.newPage();
  await login(page, 'teacher', 'admin', 'password123');
  await page.goto(`${BASE_URL}/admin/achievements`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  try {
    const viewBtn = page.locator('button').filter({ hasText: /查看/ }).first();
    if (await viewBtn.isVisible({ timeout: 3000 })) {
      await viewBtn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '29_achievement_detail_modal');
    }
  } catch (e) {
    console.log('  [跳过] 成就详情弹窗');
  }

  // 成就编辑弹窗
  try {
    const closeBtn = page.locator('.ant-modal-close');
    if (await closeBtn.isVisible({ timeout: 2000 })) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    const editBtn = page.locator('button').filter({ hasText: /编辑/ }).first();
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '30_achievement_edit_modal');
    }
  } catch (e) {
    console.log('  [跳过] 成就编辑弹窗');
  }

  await page.close();

  // 评卷详情
  page = await context.newPage();
  await login(page, 'teacher', 'teacher_yy_ps_math', 'password123');
  await page.goto(`${BASE_URL}/teacher/grading`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  try {
    const gradeBtn = page.locator('button').filter({ hasText: /评卷|批改|查看/ }).first();
    if (await gradeBtn.isVisible({ timeout: 3000 })) {
      await gradeBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '31_grading_detail');
    }
  } catch (e) {
    console.log('  [跳过] 评卷详情');
  }

  // 活动详情
  await page.goto(`${BASE_URL}/teacher/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  try {
    const detailBtn = page.locator('a, button').filter({ hasText: /详情|查看/ }).first();
    if (await detailBtn.isVisible({ timeout: 3000 })) {
      await detailBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '32_activity_detail');
    }
  } catch (e) {
    console.log('  [跳过] 活动详情');
  }

  await page.close();

  // 关闭浏览器
  await browser.close();

  // 统计
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n✅ 完成！共生成 ${files.length} 张截图`);
  files.sort().forEach(f => console.log(`  📄 docs/screenshots/${f}`));
}

main().catch(err => {
  console.error('❌ 截图脚本出错:', err.message);
  process.exit(1);
});
