/**
 * 小程序 E2E（miniprogram-automator）——计划书第 11 章六条主流程：
 *   ①登录 ②首页任务 ③整卷作答 ④智能推题流 ⑤错题重练 ⑥家长看板
 *
 * 前置条件：
 *   1. docker 后端在 3003（docker compose up）；微信开发者工具已安装且登录过
 *   2. 开发者工具「设置 → 安全 → 服务端口」已开启
 *   3. CLI 路径见下方 CLI 常量（按机器调整）
 *
 * 运行：npm run test:mp  （自动应用 tests/mp-e2e/fixture.sql 后启动开发者工具）
 */
const path = require('path');
const { execSync } = require('child_process');
const automator = require('miniprogram-automator');

// ===== 可按机器调整的配置 =====
const CLI = process.env.MP_CLI || 'D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat';
const PROJECT = path.resolve(__dirname, '../../miniprogram');
const BACKEND = process.env.MP_BACKEND || 'http://localhost:3003';
const AUTOMATION_PORT = 9420;

const STUDENT = { username: '13800138003', password: 'password123' };
const PARENT = { username: 'mp_parent_test', password: 'password123' };

const AUTO_JUDGE_TYPES = new Set(['single', 'multiple', 'true_false', 'blank']);
const results = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: err && err.message });
    console.log(`  ❌ ${name}\n     ${err && err.message}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function waitForPageData(mini, predicate, timeoutMs = 30000, label = '页面数据') {
  const deadline = Date.now() + timeoutMs;
  let page = await mini.currentPage();
  while (Date.now() < deadline) {
    page = await mini.currentPage();
    if (page && predicate(page.data || {})) return page;
    await sleep(500);
  }
  throw new Error(`等待超时：${label}`);
}

async function waitBackend() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BACKEND}/api/subjects/simple`);
      if (res.ok) return;
    } catch {
      /* 未就绪继续等 */
    }
    await sleep(1000);
  }
  throw new Error(`后端 ${BACKEND} 不可达，请先启动 docker 后端`);
}

function applyFixture() {
  const sql = path.join(__dirname, 'fixture.sql');
  execSync(`docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < "${sql}"`, {
    stdio: 'pipe',
  });
}

async function login(mini, creds) {
  await mini.callWxMethod('clearStorageSync');
  await mini.reLaunch('/pages/login/index');
  const page = await waitForPageData(mini, () => true, 15000, '登录页');
  await page.setData({ username: creds.username, password: creds.password });
  await page.callMethod('onLogin');
  await sleep(2500);
  return mini.currentPage();
}

/** 在当前题目页按题型作答（setData 直填，比模拟点击稳定） */
async function answerCurrentQuestion(page) {
  const data = page.data;
  const q = data.questions[data.current];
  const qid = String(q.question_id);
  const answers = { ...data.answers };
  if (q.type === 'single') {
    const letter = q.parsedOptions[1] ? q.parsedOptions[1].letter : q.parsedOptions[0].letter;
    answers[qid] = letter;
  } else if (q.type === 'multiple') {
    answers[qid] = q.parsedOptions.slice(0, 2).map((o) => o.letter);
  } else if (q.type === 'true_false') {
    answers[qid] = 'true';
  } else if (q.type === 'blank') {
    answers[qid] = '42';
  } else {
    return false; // 非客观题无法即答即判
  }
  await page.setData({ answers });
  await page.callMethod('syncCanSubmit');
  return true;
}

async function main() {
  console.log('⏳ 检查后端…');
  await waitBackend();

  console.log('⏳ 应用 E2E 夹具（家长账号/关联/错题）…');
  applyFixture();

  console.log('⏳ 启动微信开发者工具（自动化模式，首次可能较慢）…');
  const mini = await automator.launch({
    cliPath: CLI,
    projectPath: PROJECT,
    port: AUTOMATION_PORT,
    timeout: 180000,
  });
  console.log('✅ 开发者工具已连接\n');

  try {
    // ① 登录
    await step('① 学生账号登录进入首页', async () => {
      const page = await login(mini, STUDENT);
      const data = page.data || {};
      assert(String(page.path || '').includes('pages/home/index'), `落地页异常：${page.path}`);
      assert(data.realName && data.realName.length > 0, '首页问候语未取到真实姓名');
    });

    // ② 首页任务 + 练习列表
    await step('② 首页数据聚合与练习列表', async () => {
      let page = await mini.currentPage();
      const home = page.data || {};
      assert(Array.isArray(home.gridItems) && home.gridItems.length === 6, '快捷入口宫格异常');
      assert(home.statusText && home.statusText.length > 0, '打卡状态未渲染');
      await mini.switchTab('/pages/practice/index');
      page = await waitForPageData(
        mini,
        (d) => Array.isArray(d.practiceList),
        15000,
        '练习列表'
      );
      assert(page.data.practiceList.length > 0, '练习列表为空（需有已发布练习）');
      await mini.switchTab('/pages/home/index');
    });

    // ③ 整卷作答 → 结果解析
    await step('③ 整卷作答与结果解析', async () => {
      await mini.switchTab('/pages/practice/index');
      const listPage = await mini.currentPage();
      const target = (listPage.data.practiceList || []).find((i) => !i.done);
      assert(target, '没有可作答的练习');
      await mini.navigateTo(`/packages/practice/pages/answer/index?id=${target.id}`);
      const page = await waitForPageData(mini, (d) => d.loading === false, 30000, '答题页加载');
      assert((page.data.questions || []).length > 0, '试卷题目为空');
      await answerCurrentQuestion(page); // 首题若为客观题则作答，否则直接交卷（作答可选）
      await page.callMethod('doSubmit');
      const resultPage = await waitForPageData(
        mini,
        (d, p) => String(p.path).includes('packages/practice/pages/result/index'),
        20000,
        '结果页跳转'
      );
      await waitForPageData(mini, (d) => d.loading === false, 20000, '结果页加载');
      assert(resultPage.data.totalQuestions >= 1, '结果页无题目统计');
    });

    // ④ 智能推题流
    await step('④ 智能练习单题流（即答即判）', async () => {
      await mini.reLaunch('/pages/home/index');
      await waitForPageData(mini, (d) => d.realName, 15000, '首页');
      await mini.navigateTo('/packages/smart/pages/flow/index');
      const page = await waitForPageData(mini, (d) => d.loading === false, 30000, '单题流加载');
      if (page.data.celebration) return; // 今日已完成 → 庆祝页即验证
      assert((page.data.questions || []).length > 0, '每日题集为空');
      const answered = await answerCurrentQuestion(page);
      assert(answered, '每日题集含非客观题，无法即答即判');
      await page.callMethod('onSubmitAnswer');
      const judgedPage = await waitForPageData(mini, (d) => d.judged !== null, 20000, '即答即判结果');
      assert(typeof judgedPage.data.judged.correct === 'boolean', '判题结果缺少 correct 字段');
    });

    // ⑤ 错题重练
    await step('⑤ 错题本与错题重练', async () => {
      await mini.reLaunch('/pages/home/index');
      await waitForPageData(mini, (d) => d.realName, 15000, '首页');
      await mini.navigateTo('/packages/growth/pages/wrong-questions/index');
      const wqPage = await waitForPageData(mini, (d) => d.loading === false, 20000, '错题本加载');
      const first = (wqPage.data.list || []).find((i) => i.canRedo);
      assert(first, '错题本无可重练的客观错题（夹具未生效？）');
      await wqPage.callMethod('onRedo', { currentTarget: { dataset: { id: first.id } } });
      const flowPage = await waitForPageData(mini, (d) => d.loading === false && d.mode === 'redo', 20000, '重练单题流');
      const answered = await answerCurrentQuestion(flowPage);
      assert(answered, '重练题为非客观题');
      await flowPage.callMethod('onSubmitAnswer');
      const judgedPage = await waitForPageData(mini, (d) => d.judged !== null, 20000, '重练判题结果');
      assert(typeof judgedPage.data.judged.correct === 'boolean', '重练判题结果缺少 correct 字段');
    });

    // ⑥ 家长看板
    await step('⑥ 家长登录与看板', async () => {
      const page = await login(mini, PARENT);
      const data = page.data || {};
      assert(
        String(page.path || '').includes('packages/parent/pages/dashboard/index'),
        `家长落地页异常：${page.path}`
      );
      assert((data.children || []).length >= 1, '家长无绑定孩子（夹具未生效？）');
      assert(data.child && data.child.real_name, '看板未选中孩子');
    });
  } finally {
    await mini.close().catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❗ E2E 运行失败：', err && err.message);
  console.error('   常见原因：开发者工具服务端口未开启（设置→安全→服务端口）、CLI 路径不对（MP_CLI 环境变量）、开发者工具已打开同一项目（请先关闭再跑）。');
  process.exit(1);
});
