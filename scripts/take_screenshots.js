/**
 * 功能演示文档截图脚本
 * 使用 Playwright 截取所有演示页面的截图，保存到 docs/screenshots/
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:8080';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  ✅ ${name}.png`);
}

async function login(page, username, password = 'password123') {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await sleep(1500);

  const isStudent = /^1\d{10}$/.test(username);

  if (isStudent) {
    // 学生入口 - 直接用手机号
    await page.locator('input[id="phone"]').fill(username);
    await sleep(300);
    // 找可见的密码框
    const passInputs = await page.locator('input[type="password"], .ant-input-password input').all();
    for (const pi of passInputs) {
      if (await pi.isVisible()) { await pi.fill(password); break; }
    }
  } else {
    // 教师/管理员 - 切到教师入口 tab
    const teacherTab = page.locator('.ant-tabs-tab').filter({ hasText: /教师/ });
    await teacherTab.click();
    await sleep(800);
    // 现在教师表单的输入框可见
    await page.locator('input[id="username"]').fill(username);
    await sleep(300);
    const passInputs = await page.locator('input[type="password"], .ant-input-password input').all();
    for (const pi of passInputs) {
      if (await pi.isVisible()) { await pi.fill(password); break; }
    }
  }

  await sleep(300);
  // 点击可见的登录按钮
  const submitBtns = await page.locator('button[type="submit"]').all();
  for (const btn of submitBtns) {
    if (await btn.isVisible()) { await btn.click(); break; }
  }
  await sleep(3000);
  await page.waitForURL('**/*', { timeout: 15000 }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });

  console.log('=== 开始截图 ===\n');

  // ==========================================
  // 公共页面（无需登录）
  // ==========================================
  console.log('📋 公共页面');

  // 01 - 登录页
  const page1 = await context.newPage();
  await page1.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await screenshot(page1, '01_login');
  await page1.close();

  // 02 - 注册页
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await screenshot(page2, '02_register');
  await page2.close();

  // 03 - 证书验证页
  const page3 = await context.newPage();
  await page3.goto(`${BASE}/verify`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await screenshot(page3, '03_cert_verify');
  await page3.close();

  // ==========================================
  // 管理员端（admin）
  // ==========================================
  console.log('\n🛡️ 管理员端');

  const adminPage = await context.newPage();
  await login(adminPage, 'admin');
  await sleep(2000);

  // 04 - 管理员首页
  const adminUrl = adminPage.url();
  console.log(`  Admin redirected to: ${adminUrl}`);
  await sleep(2000);
  // 导航到 admin home
  await adminPage.goto(`${BASE}/admin/home`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '04_admin_home');

  // 05 - 管理概览
  await adminPage.goto(`${BASE}/admin/overview`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '05_admin_overview');

  // 06 - 用户管理
  await adminPage.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '06_admin_users');

  // 07 - 权限管理
  await adminPage.goto(`${BASE}/admin/permissions`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '07_admin_permissions');

  // 08 - 审批中心
  await adminPage.goto(`${BASE}/admin/approval-center`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '08_admin_approval');

  // 09 - 题库列表
  await adminPage.goto(`${BASE}/admin/question-bank`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '09_admin_question_bank');

  // 10 - 创建题目
  await adminPage.goto(`${BASE}/admin/question-bank/create`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '10_admin_question_create');

  // 11 - 成就管理列表
  await adminPage.goto(`${BASE}/admin/achievements`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '11_admin_achievements');

  // 29 - 成就详情弹窗（点击第一个成就的查看按钮）
  try {
    // 查找表格中的查看按钮
    const viewBtn = adminPage.locator('button').filter({ hasText: /查看|详情|眼睛/ }).first();
    if (await viewBtn.isVisible({ timeout: 3000 })) {
      await viewBtn.click();
      await sleep(1500);
      await screenshot(adminPage, '29_achievement_detail_modal');
      // 关闭弹窗
      const closeBtn = adminPage.locator('.ant-modal-close, button').filter({ hasText: /关闭|取消/ }).first();
      if (await closeBtn.isVisible({ timeout: 2000 })) {
        await closeBtn.click();
        await sleep(500);
      }
    } else {
      // 尝试点击行
      const row = adminPage.locator('.ant-table-row').first();
      if (await row.isVisible({ timeout: 3000 })) {
        await row.click();
        await sleep(1500);
        await screenshot(adminPage, '29_achievement_detail_modal');
        const closeBtn = adminPage.locator('.ant-modal-close').first();
        if (await closeBtn.isVisible({ timeout: 2000 })) {
          await closeBtn.click();
          await sleep(500);
        }
      }
    }
  } catch (e) {
    console.log('  ⚠️ 成就详情弹窗截图跳过:', e.message);
  }

  // 30 - 成就编辑弹窗（先确保之前的详情弹窗已关闭）
  try {
    // 先关闭可能残留的弹窗
    const anyClose = adminPage.locator('.ant-modal-close').first();
    if (await anyClose.isVisible({ timeout: 1000 }).catch(() => false)) {
      await anyClose.click();
      await sleep(500);
    }
    // 等页面稳定后，找编辑按钮
    await sleep(500);
    const editBtn = adminPage.locator('button').filter({ hasText: /编辑/ }).first();
    await editBtn.waitFor({ state: 'visible', timeout: 5000 });
    await editBtn.click({ force: true });
    await sleep(1500);
    await screenshot(adminPage, '30_achievement_edit_modal');
    // 关闭弹窗
    const closeBtn = adminPage.locator('.ant-modal-close').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await sleep(500);
    }
  } catch (e) {
    console.log('  ⚠️ 成就编辑弹窗截图跳过:', e.message.split('\n')[0]);
  }

  // 12 - 测评活动管理
  await adminPage.goto(`${BASE}/admin/assessments`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(adminPage, '12_admin_assessments');

  await adminPage.close();

  // ==========================================
  // 教师端
  // ==========================================
  console.log('\n👨‍🏫 教师端');

  const teacherPage = await context.newPage();
  await login(teacherPage, 'teacher_yy_ps_math');
  await sleep(2000);

  // 13 - 教师题库
  await teacherPage.goto(`${BASE}/teacher/question-bank`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(teacherPage, '13_teacher_question_bank');

  // 14 - 教师创建题目
  await teacherPage.goto(`${BASE}/teacher/question-bank/create`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(teacherPage, '14_teacher_question_create');

  // 15 - 审核工作台
  await teacherPage.goto(`${BASE}/teacher/review-workbench`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(teacherPage, '15_teacher_review');

  // 16 - 活动管理
  await teacherPage.goto(`${BASE}/teacher/activities`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(teacherPage, '16_teacher_activities');

  // 32 - 活动详情（点击第一个活动）
  try {
    const activityLink = teacherPage.locator('a, button').filter({ hasText: /详情|查看/ }).first();
    if (await activityLink.isVisible({ timeout: 3000 })) {
      await activityLink.click();
      await sleep(2000);
      await screenshot(teacherPage, '32_activity_detail');
      await teacherPage.goBack();
      await sleep(1000);
    }
  } catch (e) {
    console.log('  ⚠️ 活动详情截图跳过:', e.message);
  }

  // 17 - 评卷列表
  await teacherPage.goto(`${BASE}/teacher/grading`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(teacherPage, '17_teacher_grading');

  // 31 - 评卷详情
  try {
    const gradeLink = teacherPage.locator('a, button').filter({ hasText: /批改|详情|查看/ }).first();
    if (await gradeLink.isVisible({ timeout: 3000 })) {
      await gradeLink.click();
      await sleep(2000);
      await screenshot(teacherPage, '31_grading_detail');
      await teacherPage.goBack();
      await sleep(1000);
    }
  } catch (e) {
    console.log('  ⚠️ 评卷详情截图跳过:', e.message);
  }

  // 18 - 数据分析
  await teacherPage.goto(`${BASE}/teacher/data-analytics`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(teacherPage, '18_teacher_analytics');

  // 19 - 教学班管理
  await teacherPage.goto(`${BASE}/teacher/teaching-classes`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(teacherPage, '19_teacher_classes');

  await teacherPage.close();

  // ==========================================
  // 学生端
  // ==========================================
  console.log('\n🎓 学生端');

  const studentPage = await context.newPage();
  await login(studentPage, '13800138003');
  await sleep(2000);

  // 20 - 学生首页
  await studentPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(studentPage, '20_student_home');

  // 21 - 测评中心
  await studentPage.goto(`${BASE}/student/assessments`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(studentPage, '21_student_assessments');

  // 22 - 练习中心
  await studentPage.goto(`${BASE}/student/practice`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(studentPage, '22_student_practice');

  // 33 - 在线答题页面（直接进入已发布的练习活动30）
  try {
    await studentPage.goto(`${BASE}/student/activity/30`, { waitUntil: 'networkidle' });
    await sleep(3000);
    await screenshot(studentPage, '33_student_taking_activity');
  } catch (e) {
    console.log('  ⚠️ 在线答题页面截图跳过:', e.message.split('\n')[0]);
  }

  // 34 - 成绩查看（从 history API 获取已完成的活动）
  try {
    const token2 = await studentPage.evaluate(() => localStorage.getItem('token'));
    const histResp = await fetch(`${BASE}/api/activities/student/history?page=1&pageSize=5`, {
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    const histData = await histResp.json();
    const history = histData.history || histData.activities || histData.data || [];
    if (history.length > 0) {
      const resultId = history[0].activity_id || history[0].id;
      await studentPage.goto(`${BASE}/student/results/${resultId}`, { waitUntil: 'networkidle' });
      await sleep(2000);
      await screenshot(studentPage, '34_student_result');
    } else {
      console.log('  ⚠️ 无已完成的活动，跳过成绩页面截图');
    }
  } catch (e) {
    console.log('  ⚠️ 成绩查看截图跳过:', e.message.split('\n')[0]);
  }

  // 23 - 成就系统
  await studentPage.goto(`${BASE}/student/achievements`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(studentPage, '23_student_achievements');

  // 24 - 积分系统
  await studentPage.goto(`${BASE}/student/points`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(studentPage, '24_student_points');

  // 25 - 个人统计
  await studentPage.goto(`${BASE}/student/statistics`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(studentPage, '25_student_statistics');

  // 26 - 我的报名
  await studentPage.goto(`${BASE}/student/registrations`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(studentPage, '26_student_registrations');

  await studentPage.close();

  // ==========================================
  // 区级管理员
  // ==========================================
  console.log('\n🏢 区级管理员');

  const districtPage = await context.newPage();
  await login(districtPage, 'yunyan_admin');
  await sleep(2000);

  // 27 - 区级管理员首页
  const distUrl = districtPage.url();
  console.log(`  District admin redirected to: ${distUrl}`);
  await sleep(2000);
  await screenshot(districtPage, '27_district_admin_home');

  // 28 - 区级管理员用户管理
  await districtPage.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await screenshot(districtPage, '28_district_admin_users');

  await districtPage.close();

  // ==========================================
  // 完成
  // ==========================================
  await browser.close();

  // 统计
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n=== 完成！共 ${files.length} 张截图 ===`);
  files.sort().forEach(f => console.log(`  ${f}`));
}

main().catch(err => {
  console.error('截图失败:', err);
  process.exit(1);
});
