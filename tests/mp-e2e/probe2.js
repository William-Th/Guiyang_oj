/** 诊断探针2：驱动智能练习页与错题本页，输出真实 data（验证接口数据在页面层是否到位） */
const automator = require('miniprogram-automator');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getData(page) {
  const d = typeof page.data === 'function' ? await page.data() : page.data;
  return d || {};
}

async function main() {
  const mini = await automator.connect({ wsEndpoint: process.env.MP_WS || 'ws://127.0.0.1:9420' });
  console.log('connected');
  console.log('storage token =', String((await mini.evaluate(() => wx.getStorageSync('access_token'))) || '').slice(0, 15));

  await mini.reLaunch('/pages/home/index');
  await sleep(2500);
  let page = await mini.currentPage();
  let d = await getData(page);
  console.log('[home]', page.path, 'realName =', d.realName, '| streak =', d.streakDays);

  await mini.navigateTo('/packages/smart/pages/flow/index');
  await sleep(6000);
  page = await mini.currentPage();
  d = await getData(page);
  console.log('[flow]', page.path, '| loading =', d.loading, '| subject =', d.subject, '| 题数 =', (d.questions || []).length, '| celebration =', !!d.celebration, '| subjects =', (d.subjects || []).length);
  if ((d.questions || []).length > 0) {
    console.log('[flow] q1 =', JSON.stringify(d.questions[0]).slice(0, 150));
  }

  await mini.navigateBack();
  await sleep(1500);
  await mini.navigateTo('/packages/growth/pages/wrong-questions/index');
  await sleep(6000);
  page = await mini.currentPage();
  d = await getData(page);
  console.log('[wrong]', page.path, '| loading =', d.loading, '| 列表 =', (d.list || []).length, '| canRedo数 =', (d.list || []).filter((i) => i.canRedo).length, '| stats =', JSON.stringify(d.stats).slice(0, 120));

  await mini.disconnect();
}

main().catch((err) => {
  console.error('probe error:', err && err.message);
  process.exit(1);
});
