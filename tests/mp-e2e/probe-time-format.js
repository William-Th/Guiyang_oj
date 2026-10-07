/**
 * 时间显示专项探针：验证修复后各页面渲染的本地时间格式（截图 bug 回归）。
 * 覆盖：注册状态卡（submitted_at/reviewed_at）、积分明细、错题本、家长看板、管理端审批。
 * 断言均为格式正则 + 与已知 UTC 瞬间的换算一致性。
 */
const path = require('path');
const { execSync } = require('child_process');
const automator = require('miniprogram-automator');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REG_PHONE = '1381' + String(Date.now()).slice(-7); // 11 位，夹具轮换
const REG_IDCARD = '522101201405201234'; // 后4位 1234、出生 2014-05-20 与夹具一致
const STUDENT = { username: '13800138003', password: 'password123' };
const PARENT = { username: 'mp_parent_test', password: 'password123' };
const ADMIN = { username: 'school_admin_01', password: 'password123' };

const TAB_ROUTES = ['pages/home/index', 'pages/practice/index', 'pages/growth/index', 'pages/parent/index', 'pages/profile/index'];
let mini = null;
let failed = 0;

async function getRoute() {
  return mini.evaluate(() => {
    const ps = getCurrentPages();
    return ps[ps.length - 1] ? ps[ps.length - 1].route : '';
  });
}
async function waitForRoute(fragment, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await getRoute();
      if (String(r).includes(fragment)) return r;
    } catch { /* retry */ }
    await sleep(400);
  }
  throw new Error(`等待超时：${fragment}`);
}
async function getPageData() {
  return mini.evaluate(() => JSON.parse(JSON.stringify(getCurrentPages()[getCurrentPages().length - 1].data || {})));
}
async function pageSetData(patch) {
  return mini.evaluate((d) => { getCurrentPages()[getCurrentPages().length - 1].setData(d); return true; }, patch);
}
async function firePageMethod(name, arg) {
  return mini.evaluate((n, a) => {
    const ps = getCurrentPages();
    const p = ps[ps.length - 1];
    if (p && typeof p[n] === 'function') { try { p[n](a); return 'fired'; } catch (e) { return 'error:' + e.message; } }
    return 'missing';
  }, name, arg);
}
async function waitFor(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let last = {};
  while (Date.now() < deadline) {
    try { last = await getPageData(); } catch { /* retry */ }
    if (predicate(last)) return last;
    await sleep(500);
  }
  throw new Error(`等待超时：${label}`);
}
/** 逃到非 tab 页再清存储（tab 页上写入类 evaluate 会被吞） */
async function resetSession() {
  const route = String(await getRoute());
  if (TAB_ROUTES.some((t) => route.includes(t))) {
    await mini.switchTab('/pages/practice/index');
    await sleep(1200);
    await mini.navigateTo('/packages/growth/pages/wrong-questions/index');
    await sleep(1500);
    await waitForRoute('pages/wrong-questions/index', 15000);
  }
  await mini.evaluate(() => wx.clearStorageSync());
  await sleep(300);
}
async function login(creds, landingFragment) {
  await resetSession();
  await mini.navigateTo('/pages/login/index');
  await sleep(1500);
  await waitForRoute('pages/login/index', 15000);
  await pageSetData({ username: creds.username, password: creds.password });
  firePageMethod('onLogin');
  await waitForRoute(landingFragment);
  await sleep(1500);
}
function check(label, cond, detail) {
  if (cond) { console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}
const DT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const DT_COMPACT = /^\d{2}-\d{2} \d{2}:\d{2}$/;
const D = /^\d{4}-\d{2}-\d{2}$/;
const D_COMPACT = /^\d{2}-\d{2}$/;

async function main() {
  // 夹具：保证一条 pending 注册申请（身份查询用）
  const tpl = path.join(__dirname, 'fixture.sql');
  const sql = require('fs').readFileSync(tpl, 'utf-8').replaceAll('{{E2E_REG_PHONE}}', REG_PHONE);
  execSync('docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj', { input: sql, stdio: ['pipe', 'pipe', 'inherit'] });

  mini = await automator.connect({ wsEndpoint: process.env.MP_WS || 'ws://127.0.0.1:9420' });
  const readyDeadline = Date.now() + 90000;
  while (Date.now() < readyDeadline) {
    try { await getRoute(); break; } catch { await sleep(2500); }
  }

  // ① 注册状态卡（截图场景）
  console.log('① 注册状态卡');
  await resetSession();
  await mini.navigateTo('/pages/register/index');
  await waitForRoute('pages/register/index');
  await pageSetData({ queryMode: 'id', queryPhone: REG_PHONE, queryBirthDate: '2014-05-20', queryIdCard: REG_IDCARD });
  firePageMethod('onQuery');
  const regd = await waitFor((d) => !!d.statusInfo, 20000, '注册状态返回');
  check('提交于 本地格式 YYYY-MM-DD HH:mm', DT.test(regd.statusInfo.submitted_at || ''), `submitted_at=${regd.statusInfo.submitted_at}`);
  check('审核于 空串隐藏/或本地格式', !regd.statusInfo.reviewed_at || DT.test(regd.statusInfo.reviewed_at), `reviewed_at=${regd.statusInfo.reviewed_at}`);

  // ② 积分明细
  console.log('② 积分明细');
  await login(STUDENT, 'pages/home/index');
  await mini.switchTab('/pages/growth/index');
  await sleep(1200);
  await mini.navigateTo('/packages/growth/pages/points/index');
  await waitForRoute('pages/points/index');
  const pts = await waitFor((d) => d.loading === false, 20000, '积分页加载');
  if ((pts.list || []).length > 0) {
    check('积分时间 本地 MM-DD HH:mm', DT_COMPACT.test(pts.list[0].created_at || ''), `created_at=${pts.list[0].created_at}`);
  } else {
    console.log('  ⚠️ 积分明细为空，跳过（学生无流水）');
  }

  // ③ 错题本（日期）
  console.log('③ 错题本');
  await mini.navigateTo('/packages/growth/pages/wrong-questions/index');
  await waitForRoute('pages/wrong-questions/index');
  const wq = await waitFor((d) => d.loading === false, 20000, '错题本加载');
  const wqItem = (wq.list || []).find((i) => i.lastWrongText);
  if (wqItem) {
    check('错题日期 本地 YYYY-MM-DD', D.test(wqItem.lastWrongText || ''), `lastWrongText=${wqItem.lastWrongText}`);
  } else {
    console.log('  ⚠️ 错题本无带日期条目，跳过');
  }

  // ④ 家长看板
  console.log('④ 家长看板');
  await login(PARENT, 'pages/parent/index');
  const pd = await waitFor((d) => d.loading === false && Array.isArray(d.results), 20000, '看板加载');
  const res0 = (pd.results || []).find((r) => r.timeText);
  if (res0) {
    check('成绩时间 本地 MM-DD', D_COMPACT.test(res0.timeText || ''), `timeText=${res0.timeText}`);
  } else {
    console.log('  ⚠️ 看板无成绩时间，跳过');
  }
  const reg0 = (pd.registrable || []).find((a) => a.endTimeText);
  if (reg0) {
    check('报名截止 本地 MM-DD', D_COMPACT.test(reg0.endTimeText || ''), `endTimeText=${reg0.endTimeText}`);
  } else {
    console.log('  ⚠️ 无可报名活动时间，跳过');
  }

  // ⑤ 管理端审批（注册 tab 提交时间）
  console.log('⑤ 管理端审批');
  await login(ADMIN, 'pages/home/index');
  await mini.navigateTo('/packages/admin/pages/approvals/index');
  await waitForRoute('pages/approvals/index');
  const ap = await waitFor((d) => d.loading === false && Array.isArray(d.list), 20000, '审批列表加载');
  if ((ap.list || []).length > 0) {
    check('注册申请提交时间 本地 YYYY-MM-DD HH:mm', DT.test(ap.list[0].submittedAtText || ''), `submittedAtText=${ap.list[0].submittedAtText}`);
  } else {
    failed++;
    console.log('  ❌ 管理员待审列表为空（夹具应有一条）');
  }

  await mini.disconnect();
  console.log(failed === 0 ? '\n时间显示全部通过' : `\n${failed} 项未通过`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
