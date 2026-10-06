/** 诊断探针：连接 IDE 自动化端口，输出当前页/存储/模拟器内请求可达性 */
const automator = require('miniprogram-automator');

async function main() {
  const mini = await automator.connect({ wsEndpoint: process.env.MP_WS || 'ws://127.0.0.1:9420' });
  console.log('connected');

  const page = await mini.currentPage();
  console.log('当前页 path =', page && page.path);
  const data = typeof page.data === 'function' ? await page.data() : page.data;
  console.log('data keys =', Object.keys(data || {}).slice(0, 15).join(', '));
  console.log('data.preview =', JSON.stringify(data).slice(0, 300));

  const sys = await mini.systemInfo();
  console.log('systemInfo platform =', sys.platform);

  const token = await mini.evaluate(() => wx.getStorageSync('access_token'));
  console.log('storage access_token =', typeof token === 'string' ? token.slice(0, 20) + '…' : token);
  const user = await mini.evaluate(() => wx.getStorageSync('user_info'));
  console.log('storage user_info =', JSON.stringify(user).slice(0, 150));

  const req = await mini.evaluate(
    () =>
      new Promise((resolve) => {
        wx.request({
          url: 'http://localhost:3003/api/subjects/simple',
          method: 'GET',
          timeout: 8000,
          success: (r) => resolve('statusCode=' + r.statusCode + ' body=' + JSON.stringify(r.data).slice(0, 80)),
          fail: (e) => resolve('FAIL ' + (e.errMsg || JSON.stringify(e))),
        });
      })
  );
  console.log('模拟器内 wx.request =', req);

  await mini.disconnect();
}

main().catch((err) => {
  console.error('probe error:', err && err.message);
  process.exit(1);
});
