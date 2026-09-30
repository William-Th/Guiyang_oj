# 开发辅助脚本

## dev-forward-3001.js — Vite 代理端口转发器

Vite 开发服务器（:3000）的 `/api` 代理写死转发到 `localhost:3001`，而 Docker 后端映射在 `:3003`。
本脚本监听 `127.0.0.1:3001`，把流量原样转发到 `:3003`。

```bash
# 后台启动（Git Bash / 任意终端）
node scripts/dev-forward-3001.js &
```

症状对照：`:3000` 页面能打开但登录/接口静默失败、Network 面板 `/api/*` 全部失败 → 多半是这个转发器没在跑。
