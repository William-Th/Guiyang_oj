/** 二分探针：定位 login() 中挂死的 automator 命令 */
const automator = require('miniprogram-automator');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mini = await automator.connect({ wsEndpoint: process.env.MP_WS || 'ws://127.0.0.1:9420' });
  console.log('connected');

  let page = await mini.currentPage();
  console.log('step0 当前页 =', page && page.path);

  console.log('step1 evaluate clearStorage…');
  await mini.evaluate(() => wx.clearStorageSync());
  console.log('step1 ok');

  console.log('step2 reLaunch login…');
  await mini.reLaunch('/pages/login/index');
  console.log('step2 ok');

  await sleep(2000);
  page = await mini.currentPage();
  console.log('step3 当前页 =', page && page.path);
  const token = await mini.evaluate(() => wx.getStorageSync('access_token'));
  console.log('step3 token =', token ? String(token).slice(0, 12) + '…' : String(token));

  console.log('step4 setData…');
  await page.setData({ username: '13800138003', password: 'password123' });
  console.log('step4 ok');

  console.log('step5 fire onLogin…');
  page.callMethod('onLogin').catch(() => {});
  await sleep(5000);
  page = await mini.currentPage();
  console.log('step5 当前页 =', page && page.path);
  const d = typeof page.data === 'function' ? await page.data() : page.data;
  console.log('step5 data.realName =', d && d.realName);

  await mini.disconnect();
}

main().catch((err) => {
  console.error('bisect error:', err && err.message);
  process.exit(1);
});
