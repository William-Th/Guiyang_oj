/** 诊断探针3：严格复刻 run.js 流程⑧，逐步校验路由并 dump 数据 */
const automator = require('miniprogram-automator');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function route(mini) {
  return mini.evaluate(() => getCurrentPages()[getCurrentPages().length - 1].route);
}
async function data(mini) {
  return mini.evaluate(() => JSON.parse(JSON.stringify(getCurrentPages()[getCurrentPages().length - 1].data || {})));
}
async function fire(mini, name, arg) {
  return mini.evaluate((n, a) => {
    const ps = getCurrentPages();
    const p = ps[ps.length - 1];
    if (p && typeof p[n] === 'function') {
      try { p[n](a); return 'fired'; } catch (e) { return 'error:' + e.message; }
    }
    return 'missing:' + n;
  }, name, arg);
}

async function main() {
  const mini = await automator.connect({ wsEndpoint: process.env.MP_WS || 'ws://127.0.0.1:9420' });
  const phone = '13810' + String(Date.now()).slice(-7);

  await mini.evaluate(() => wx.clearStorageSync());
  await mini.reLaunch('/pages/login/index');
  await sleep(2000);
  console.log('route1:', await route(mini));
  console.log('goRegister:', await fire(mini, 'goRegister'));
  await sleep(1500);
  console.log('route2:', await route(mini));
  await waitFor(mini, (d) => (d.districts || []).length > 0, '区县加载');
  console.log('区县就绪');
  await mini.evaluate((d) => { const p = getCurrentPages().pop(); p.setData(d); return 1; }, {
    phone, realName: 'E2E注册学生', birthDate: '2014-05-20', idCard: '522101201405201234',
  });
  console.log('onDistrictChange:', await fire(mini, 'onDistrictChange', { detail: { value: 0 } }));
  await waitFor(mini, (d) => (d.schoolNames || []).length > 0, '学校加载');
  console.log('onSchoolChange:', await fire(mini, 'onSchoolChange', { detail: { value: 0 } }));
  console.log('onGradeChange:', await fire(mini, 'onGradeChange', { detail: { value: 2 } }));
  const d1 = await data(mini);
  console.log('提交前关键字段:', JSON.stringify({
    phone: d1.phone, birthDate: d1.birthDate, idCard: d1.idCard,
    districtCode: (d1.districts || [])[d1.districtIndex]?.code,
    schoolCode: (d1.schools || [])[d1.schoolIndex]?.code,
    grade: (d1.grades || [])[d1.gradeIndex],
  }));
  console.log('onSubmit:', await fire(mini, 'onSubmit'));
  await sleep(6000);
  const d2 = await data(mini);
  console.log('提交后: submitting =', d2.submitting, '| result =', d2.result ? 'yes' : 'null', '| activeTab =', d2.activeTab);
  if (!d2.result) console.log('full data:', JSON.stringify(d2).slice(0, 600));

  await mini.disconnect();
}

async function waitFor(mini, predicate, label) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const d = await data(mini);
    if (predicate(d)) return d;
    await sleep(500);
  }
  throw new Error('等待超时：' + label);
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
