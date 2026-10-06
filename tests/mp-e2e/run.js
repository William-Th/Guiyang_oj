/**
 * 小程序 E2E（miniprogram-automator）——计划书第 11 章六条主流程：
 *   ①登录 ②首页任务 ③整卷作答 ④智能推题流 ⑤错题重练 ⑥家长看板
 *
 * 实现要点（踩坑换来的，勿随意改回）：
 * - automator 的 page.data() 偶发对存活句柄返回 undefined、跳页方法 await 会因页面销毁
 *   丢失协议响应——因此全部改走 mini.evaluate 在 AppService 上下文直接操作
 *   getCurrentPages() 末尾页：读 route/data、setData、触发方法（fire 不 await）。
 * - 连接前 IDE 需开启自动化：cli auto --project miniprogram --auto-port 9420
 *   （服务端口已通过安全设置开启；每次新增页面后如报“未找到 xxx.js”先清缓存）
 *
 * 运行：MP_WS=ws://127.0.0.1:9420 npm run test:mp
 */
const path = require('path');
const { execSync } = require('child_process');
const automator = require('miniprogram-automator');

const PROJECT = path.resolve(__dirname, '../../miniprogram');
const BACKEND = process.env.MP_BACKEND || 'http://localhost:3003';

const STUDENT = { username: '13800138003', password: 'password123' };
const PARENT = { username: 'mp_parent_test', password: 'password123' };
// 校级管理员（admin_permissions.school_id=1，管到种子学生所在校）
const ADMIN = { username: 'school_admin_01', password: 'password123' };

const results = [];
let mini = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- AppService 上下文直驱（绕开 page 句柄协议） ----------

async function getRoute() {
  return mini.evaluate(() => {
    const ps = getCurrentPages();
    return ps[ps.length - 1] ? ps[ps.length - 1].route : '';
  });
}

async function getPageData() {
  return mini.evaluate(() => {
    const ps = getCurrentPages();
    const p = ps[ps.length - 1];
    return p ? JSON.parse(JSON.stringify(p.data || {})) : {};
  });
}

async function pageSetData(patch) {
  return mini.evaluate((d) => {
    const ps = getCurrentPages();
    ps[ps.length - 1].setData(d);
    return true;
  }, patch);
}

/** 触发页面方法但不等待（跳页类方法会销毁页面，等待会丢协议响应） */
async function firePageMethod(name, arg) {
  return mini.evaluate(
    (n, a) => {
      const ps = getCurrentPages();
      const p = ps[ps.length - 1];
      if (p && typeof p[n] === 'function') {
        try {
          p[n](a);
          return 'fired';
        } catch (e) {
          return 'error:' + e.message;
        }
      }
      return 'missing';
    },
    name,
    arg
  );
}

// ---------- 断言与等待 ----------

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: err && err.message });
    let diag = '';
    try {
      diag = `（当前页：${await getRoute()}）`;
    } catch {
      /* 忽略诊断失败 */
    }
    console.log(`  ❌ ${name}\n     ${err && err.message}${diag}`);
  }
}

async function waitFor(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let d = {};
    try {
      d = (await getPageData()) || {};
    } catch {
      /* 协议抖动下一轮再试 */
    }
    if (predicate(d)) return d;
    await sleep(500);
  }
  throw new Error(`等待超时：${label}`);
}

async function waitForRoute(fragment, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const route = await getRoute();
      if (String(route).includes(fragment)) return route;
    } catch {
      /* 下一轮再试 */
    }
    await sleep(400);
  }
  throw new Error(`等待超时：跳转到 ${fragment}`);
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

function applyFixture(regPhone) {
  const tpl = path.join(__dirname, 'fixture.sql');
  const sql = require('fs').readFileSync(tpl, 'utf-8').replaceAll('{{E2E_REG_PHONE}}', regPhone);
  execSync(`docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj`, { input: sql, stdio: ['pipe', 'pipe', 'inherit'] });
}

const TAB_ROUTES = ['pages/home/index', 'pages/practice/index', 'pages/growth/index', 'pages/profile/index'];

/**
 * 统一登录：清存储 → 登录页填表 → 触发 onLogin → 轮询落点。
 * 自动化桥的实证规律（勿改回）：tab 页上 写入类 evaluate / reLaunch / navigateTo 会被吞或挂桥，
 * 但 switchTab 与 settle 后的 navigateTo 可靠；非 tab 页上全部操作可靠。
 * 故若落在 tab 页：先 switchTab→navigateTo 逃到非 tab 页，在非 tab 页清存储再进登录页。
 */
async function login(creds, landingFragment) {
  const route = String(await getRoute());
  if (!route.includes('pages/login/index')) {
    if (TAB_ROUTES.some((t) => route.includes(t))) {
      await mini.switchTab('/pages/practice/index');
      await sleep(1200);
      await mini.navigateTo('/packages/growth/pages/wrong-questions/index');
      await sleep(1500);
      await waitForRoute('pages/wrong-questions/index', 15000);
    }
    await mini.evaluate(() => wx.clearStorageSync());
    await sleep(300);
    await mini.navigateTo('/pages/login/index');
    await sleep(1500);
  } else {
    await mini.evaluate(() => wx.clearStorageSync());
    await mini.reLaunch('/pages/login/index'); // 登录页非 tab，reLaunch 实证可靠
    await sleep(1500);
  }
  await waitForRoute('pages/login/index', 15000);
  await pageSetData({ username: creds.username, password: creds.password });
  firePageMethod('onLogin');
  await waitForRoute(landingFragment, 25000);
  // 落点页各自的数据断言由调用方完成（首页 realName / 看板 child / 工作台 pendingCount）
  return getPageData();
}

/** 当前题按题型作答：驱动页面真实方法 applyAnswer（会走 800ms 防抖上送），等待持久化完成；返回是否为可判题型 */
async function answerCurrentQuestion() {
  const data = await getPageData();
  const q = (data.questions || [])[data.current];
  if (!q) return false;
  let value = null;
  if (q.type === 'single') {
    value = q.parsedOptions[1] ? q.parsedOptions[1].letter : (q.parsedOptions[0] || {}).letter;
  } else if (q.type === 'multiple') {
    value = (q.parsedOptions || []).slice(0, 2).map((o) => o.letter);
  } else if (q.type === 'true_false') {
    value = 'true';
  } else if (q.type === 'blank') {
    value = '42';
  } else {
    return false;
  }
  if (!value) return false;
  const r = await firePageMethod('applyAnswer', value);
  if (r !== 'fired') return false;
  await sleep(1600); // 等防抖保存上送完成，避免交卷时服务端还没有答案
  return true;
}

async function main() {
  console.log('⏳ 检查后端…');
  await waitBackend();
  const e2eRegPhone = '1390' + String(Date.now()).slice(-7); // 11 位手机号（列宽 varchar(11)） // 每轮轮换，审批建号不撞唯一约束
  console.log(`⏳ 应用 E2E 夹具（家长账号/关联/错题/待审注册 ${e2eRegPhone}）…`);
  applyFixture(e2eRegPhone);
  console.log('⏳ 连接微信开发者工具…');
  mini = await automator.connect({ wsEndpoint: process.env.MP_WS || 'ws://127.0.0.1:9420' });
  console.log('✅ 开发者工具已连接');

  // IDE 可能在重编译（改完小程序文件立即跑会全程协议超时）：等模拟器能响应命令再开跑
  console.log('⏳ 等待模拟器就绪…');
  const readyDeadline = Date.now() + 90000;
  let ready = false;
  while (Date.now() < readyDeadline) {
    try {
      await getRoute();
      ready = true;
      break;
    } catch {
      await sleep(2500);
    }
  }
  if (!ready) throw new Error('模拟器 90 秒内未就绪（IDE 是否卡在编译/登录？）');
  console.log('✅ 模拟器已就绪\n');

  try {
    await step('① 学生账号登录进入首页', async () => {
      await login(STUDENT, 'pages/home/index');
      const d = await waitFor((x) => !!x.realName, 15000, '首页问候语');
      assert(d.realName.length > 0, '首页问候语未取到真实姓名');
    });

    await step('② 首页数据聚合与练习列表', async () => {
      const home = await waitFor((d) => Array.isArray(d.gridItems) && d.gridItems.length === 6 && !!d.statusText, 20000, '首页数据');
      assert(home.statusText.length > 0, '打卡状态未渲染');
      await mini.switchTab('/pages/practice/index');
      await waitFor((d) => Array.isArray(d.practiceList) && d.practiceList.length > 0, 20000, '练习列表加载');
      await mini.switchTab('/pages/home/index');
    });

    await step('③ 整卷作答与结果解析', async () => {
      await mini.switchTab('/pages/practice/index');
      await sleep(1500); // tab 切换过渡期内发起 navigateTo 会被吞掉
      const list = await waitFor((d) => Array.isArray(d.practiceList) && d.practiceList.length > 0, 20000, '练习列表加载');
      // 优先选夹具造的可无限重做活动，与运行历史解耦
      const target = list.practiceList.find((i) => String(i.title || '').startsWith('【E2E】')) || list.practiceList[0];
      assert(target, '练习列表为空');
      await mini.navigateTo(`/packages/practice/pages/answer/index?id=${target.id}`);
      await waitForRoute('pages/answer/index');
      await waitFor((d) => d.loading === false && (d.questions || []).length > 0, 30000, '答题页加载');
      await answerCurrentQuestion(); // 首题若为客观题则作答，否则直接交卷
      firePageMethod('doSubmit'); // 成功后 redirectTo，不等待
      await waitForRoute('pages/result/index');
      await waitFor((d) => d.loading === false, 20000, '结果页加载');
      // 偶发取数为空：重进结果页一次
      if (((await getPageData()).totalQuestions || 0) < 1) {
        await mini.reLaunch(`/packages/practice/pages/result/index?id=${target.id}`);
        await waitFor((d) => d.loading === false, 20000, '结果页重载');
      }
      assert(((await getPageData()).totalQuestions || 0) >= 1, '结果页无题目统计');
    });

    await step('④ 智能练习单题流（即答即判）', async () => {
      await mini.reLaunch('/pages/home/index');
      await waitFor((d) => !!d.realName, 15000, '首页');
      await mini.navigateTo('/packages/smart/pages/flow/index');
      await waitForRoute('packages/smart/pages/flow/index');
      await waitFor((d) => d.loading === false, 30000, '单题流加载');
      if ((await getPageData()).celebration) return; // 今日已完成 → 庆祝页即验证
      if (((await getPageData()).questions || []).length === 0) {
        firePageMethod('loadDailySet'); // 服务端偶发生成失败返回空：重拉一次
        await waitFor((d) => d.loading === false && ((d.questions || []).length > 0 || d.celebration), 30000, '单题流重试');
      }
      const d1 = await getPageData();
      if (d1.celebration) return;
      assert((d1.questions || []).length > 0, '每日题集为空');
      assert(await answerCurrentQuestion(), '每日题集含非客观题，无法即答即判');
      firePageMethod('onSubmitAnswer');
      const d2 = await waitFor((d) => !!d.judged, 20000, '即答即判结果');
      assert(typeof d2.judged.correct === 'boolean', '判题结果缺少 correct 字段');
    });

    await step('⑤ 错题本与错题重练', async () => {
      await mini.reLaunch('/pages/home/index');
      await waitFor((d) => !!d.realName, 15000, '首页');
      await mini.navigateTo('/packages/growth/pages/wrong-questions/index');
      await waitForRoute('pages/wrong-questions/index');
      let list = await waitFor((d) => d.loading === false, 20000, '错题本加载');
      if (!(list.list || []).some((i) => i.canRedo)) {
        firePageMethod('load'); // 偶发空列表：重载一次
        list = await waitFor((d) => d.loading === false && (d.list || []).length > 0, 20000, '错题本重载');
      }
      const first = (await getPageData()).list.find((i) => i.canRedo);
      assert(first, '错题本无可重练的客观错题（夹具未生效？）');
      firePageMethod('onRedo', { currentTarget: { dataset: { id: first.id } } });
      await waitForRoute('packages/smart/pages/flow/index');
      await waitFor((d) => d.loading === false && d.mode === 'redo', 20000, '重练单题流');
      assert(await answerCurrentQuestion(), '重练题为非客观题');
      firePageMethod('onSubmitAnswer');
      const d2 = await waitFor((d) => !!d.judged, 20000, '重练判题结果');
      assert(typeof d2.judged.correct === 'boolean', '重练判题结果缺少 correct 字段');
    });

    await step('⑥ 家长登录与看板', async () => {
      await login(PARENT, 'pages/parent/index');
      await waitFor((d) => (d.children || []).length >= 1, 15000, '孩子列表加载');
      const d = await waitFor((x) => !!(x.child && x.child.real_name), 15000, '看板选中孩子');
      assert(d.child.real_name.length > 0, '看板未选中孩子');
    });

    await step('⑦ 管理端总览与审批', async () => {
      await login(ADMIN, 'packages/admin/pages/home/index'); // 管理员登录直落管理工作台
      const stats = await waitFor(
        (d) => d.loading === false && typeof d.pendingCount === 'number' && d.pendingCount >= 1,
        20000,
        '管理总览待办角标'
      );
      assert(stats.pendingCount >= 1, '待办角标未统计到夹具申请');
      await mini.navigateTo('/packages/admin/pages/approvals/index');
      await waitForRoute('pages/approvals/index');
      await waitFor((d) => d.loading === false, 20000, '待审列表加载');
      const item = ((await getPageData()).list || []).find((i) => i.phone === e2eRegPhone);
      assert(item, '夹具待审申请未出现在列表');
      firePageMethod('onApprove', { currentTarget: { dataset: { id: item.id } } });
      // 批准后列表刷新，该申请消失
      await waitFor((x) => !(x.list || []).some((i) => i.phone === e2eRegPhone), 20000, '审批完成刷新');
    });
  } finally {
    try {
      if (mini && typeof mini.disconnect === 'function') await mini.disconnect();
    } catch {
      /* 断开失败不影响结果 */
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n❗ E2E 运行失败：', err && err.message);
  console.error('   常见原因：IDE 未开自动化（cli auto --project miniprogram --auto-port 9420）、后端 3003 未启动、新增页面未编译（清缓存）。');
  process.exit(1);
});
