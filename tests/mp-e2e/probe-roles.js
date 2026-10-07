/**
 * 四角色 tab bar / profile 菜单探针：教师 / 家长 / 管理员 / 学生。
 * 断言：各角色自定义 tabBar 的 tab 组合与高亮、profile 页角色旗标。
 * 复用 run.js 实证的自动化桥规律（tab 页只读、写入类操作走非 tab 页）。
 */
const automator = require('miniprogram-automator');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROLES = [
  { label: '教师', creds: { username: 'teacher_yy_ps_math', password: 'password123' }, landing: 'pages/home/index', wantTabs: ['首页', '我的'], wantFlags: { isStudent: false, isParent: false, isAdmin: false } },
  { label: '家长', creds: { username: 'mp_parent_test', password: 'password123' }, landing: 'pages/parent/index', wantTabs: ['看板', '我的'], wantFlags: { isStudent: false, isParent: true, isAdmin: false } },
  { label: '管理员', creds: { username: 'school_admin_01', password: 'password123' }, landing: 'pages/home/index', wantTabs: ['工作台', '我的'], wantFlags: { isStudent: false, isParent: false, isAdmin: true } },
  { label: '学生', creds: { username: '13800138003', password: 'password123' }, landing: 'pages/home/index', wantTabs: ['首页', '练习', '成长', '我的'], wantFlags: { isStudent: true, isParent: false, isAdmin: false } },
];

const TAB_ROUTES = ['pages/home/index', 'pages/practice/index', 'pages/growth/index', 'pages/parent/index', 'pages/profile/index'];
let mini = null;

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
    } catch { /* 下一轮再试 */ }
    await sleep(400);
  }
  throw new Error(`等待超时：${fragment}`);
}
async function pageSetData(patch) {
  return mini.evaluate((d) => { getCurrentPages()[getCurrentPages().length - 1].setData(d); return true; }, patch);
}
async function firePageMethod(name) {
  return mini.evaluate((n) => {
    const ps = getCurrentPages();
    const p = ps[ps.length - 1];
    if (p && typeof p[n] === 'function') { try { p[n](); return 'fired'; } catch (e) { return 'error:' + e.message; } }
    return 'missing';
  }, name);
}
/** 读 tab 页自定义 tabBar 状态（只读 evaluate 在 tab 页实证可靠） */
async function readTabBar() {
  return mini.evaluate(() => {
    const p = getCurrentPages()[getCurrentPages().length - 1];
    const tb = typeof p.getTabBar === 'function' && p.getTabBar();
    if (!tb) return { list: [], selected: -1 };
    return {
      list: tb.data.list.map((t) => t.text),
      selected: tb.data.selected,
      selectedPath: (tb.data.list[tb.data.selected] || {}).pagePath || '',
    };
  });
}
async function readPageData() {
  return mini.evaluate(() => JSON.parse(JSON.stringify(getCurrentPages()[getCurrentPages().length - 1].data || {})));
}

/** 与 run.js login 相同的流程：逃到非 tab 页清存储 → 登录页 → 轮询落点 */
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
    await mini.reLaunch('/pages/login/index');
    await sleep(1500);
  }
  await waitForRoute('pages/login/index', 15000);
  await pageSetData({ username: creds.username, password: creds.password });
  firePageMethod('onLogin');
  await waitForRoute(landingFragment);
  await sleep(1500); // 等 onShow 的 setActive 与数据加载
}

async function main() {
  mini = await automator.connect({ wsEndpoint: process.env.MP_WS || 'ws://127.0.0.1:9420' });
  // 等模拟器就绪（IDE 可能正在重编译）
  const readyDeadline = Date.now() + 90000;
  while (Date.now() < readyDeadline) {
    try { await getRoute(); break; } catch { await sleep(2500); }
  }

  let failed = 0;
  for (const spec of ROLES) {
    try {
      await login(spec.creds, spec.landing);
      const tb = await readTabBar();
      const tbOk = JSON.stringify(tb.list) === JSON.stringify(spec.wantTabs);
      await mini.switchTab('/pages/profile/index');
      await sleep(1500);
      const pd = await readPageData();
      const flags = { isStudent: !!pd.isStudent, isParent: !!pd.isParent, isAdmin: !!pd.isAdmin };
      const flagsOk = JSON.stringify(flags) === JSON.stringify(spec.wantFlags);
      const tb2 = await readTabBar(); // profile 页上的高亮
      const highlightOk = tb2.selectedPath === '/pages/profile/index';
      const ok = tbOk && flagsOk && highlightOk;
      if (!ok) failed++;
      console.log(`${ok ? '✅' : '❌'} ${spec.label}: tabs=[${tb.list.join(' / ')}]${tbOk ? '' : '（期望 ' + spec.wantTabs.join(' / ') + '）'} | profile 旗标 ${JSON.stringify(flags)}${flagsOk ? '' : '（期望 ' + JSON.stringify(spec.wantFlags) + '）'} | profile 高亮 ${tb2.selectedPath}${highlightOk ? '' : '（未定位到我的）'}`);
    } catch (e) {
      failed++;
      let where = '';
      try { where = await getRoute(); } catch { /* 忽略 */ }
      console.log(`❌ ${spec.label}: 异常 ${e.message}（当前页 ${where}）`);
    }
  }
  await mini.disconnect();
  console.log(failed === 0 ? '\n全部角色通过' : `\n${failed} 个角色未通过`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
