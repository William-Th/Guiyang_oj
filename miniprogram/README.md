# 贵阳 OJ 微信小程序端

计划书：`docs/MINIPROGRAM_PLAN.md`（v0.3）。技术栈：微信原生 + TypeScript + Vant Weapp。

## 快速开始

1. 安装依赖并构建 npm（等价于开发者工具「构建 npm」）：

   ```bash
   cd miniprogram
   npm install
   npm run build-npm
   ```

2. 微信开发者工具「导入项目」，目录选择 `miniprogram/`，AppID 可先用测试号（project.config.json 已填 `touristappid`）；
3. 详情 → 本地设置 → 勾选「不校验合法域名」（合规手续延后至提审前，见计划书第 9 章执行口径）；
4. 确认 `config/env.ts` 的 `BASE_URL` 指向可用的后端（docker 后端 3003，vite 代理链路 3001）；
5. 用现有学生账号登录（种子账号 13800138003），管理员角色登录后「我的」页出现管理入口。

## 已实现（脚手架 v0.1）

- 工程：TS 类型检查（`npm run typecheck`）、Vant Weapp 主题令牌（theme.wxss，双端视觉同源）
- 请求层：JWT 注入、401 自动刷新重试一次、幂等键工具（计划书第 8 章）、统一错误 toast
- 登录页：账号密码（手机号/用户名）登录，会话本地持久化
- 4 Tab：首页（连胜/未读通知/今日任务卡）、练习（练习/测评列表，真实接口）、成长（入口宫格）、我的（用户卡/管理入口/退出登录）
- 管理分包：管理总览（`/api/admin/dashboard/stats`）、审批中心（注册审批列表 + 通过/驳回）
- build-npm 脚本（脱离开发者工具复制 @vant/weapp 产物）

## 待实现（按计划书里程碑）

- M1：答题页（7 题型作答器 question-renderer）、结果解析页、`/api/mp/home` 聚合接口、`source=mp` 埋点、报名记录页
- M2：智能练习单题流（即答即判/完成庆祝）、成长子页（积分/成就/排行/错题本）、`/api/auth/wechat` 微信绑定
- M3：家长看板分包、订阅消息、msgSecCheck、商店、用户查询页
- M4：合规清单补齐后提审

## 已知限制

- 微信 code2session 登录未接（无 appid/secret），当前用账号密码登录，与计划书第 8 章鉴权方案兼容
- 后端登出会递增 tokenVersion 吊销全端会话（含 web 端），单端登出待 /bohe-plan 核实
- 成长页宫格均为占位（子页随 M2 落地）
