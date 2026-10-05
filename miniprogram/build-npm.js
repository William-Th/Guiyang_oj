/**
 * 手动构建 npm（等价于开发者工具「构建 npm」按钮）：
 * 把 @vant/weapp 产物复制到 miniprogram_npm，使项目脱离开发者工具也能完成组件注册。
 * 用法：npm install && npm run build-npm
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'node_modules', '@vant', 'weapp', 'dist');
const destRoot = path.join(__dirname, 'miniprogram_npm');
const dest = path.join(destRoot, '@vant', 'weapp');

if (!fs.existsSync(src)) {
  console.error('未找到 @vant/weapp 产物，请先执行 npm install');
  process.exit(1);
}

fs.rmSync(destRoot, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('miniprogram_npm 构建完成 ->', dest);
