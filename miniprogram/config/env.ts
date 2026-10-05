/**
 * 后端 API 配置。
 * - 开发者工具需勾选「不校验合法域名」（合规手续延后至提审前，见 docs/MINIPROGRAM_PLAN.md 第 9 章）
 * - docker 后端直连 3003；若走 vite 代理链路可改 3001
 * - 真机预览改为局域网 IP；正式环境必须 HTTPS 并配置 request 合法域名
 */
export const BASE_URL = 'http://localhost:3003';
export const API_PREFIX = '/api';
