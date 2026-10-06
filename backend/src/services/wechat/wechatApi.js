/**
 * 微信开放能力封装（小程序 M3）：
 * - 全部能力依赖 WECHAT_APPID / WECHAT_SECRET 环境变量；未配置时 isConfigured()=false，
 *   调用方按约定优雅降级（登录返回 503 提示、调度器不启动、安检跳过）。
 * - 凭据只允许放后端环境变量（docker-compose env / .env），严禁入库。
 */
const BASE = 'https://api.weixin.qq.com';

let tokenCache = { token: null, expiresAt: 0 };

function isConfigured() {
  return Boolean(process.env.WECHAT_APPID && process.env.WECHAT_SECRET);
}

async function getJson(url, options) {
  const res = await fetch(url, options);
  return res.json();
}

/** 全局 access_token（缓存至过期前 5 分钟） */
async function getStableAccessToken() {
  if (!isConfigured()) return null;
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const url = `${BASE}/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}`;
  const data = await getJson(url);
  if (!data.access_token) {
    throw new Error(`获取 access_token 失败: ${data.errcode} ${data.errmsg}`);
  }
  tokenCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in || 7200) - 300) * 1000 };
  return data.access_token;
}

/** 登录凭证校验：code → { openid, session_key, unionid? } */
async function code2session(code) {
  const url = `${BASE}/sns/jscode2session?appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const data = await getJson(url);
  if (!data.openid) {
    throw new Error(`code2session 失败: ${data.errcode} ${data.errmsg}`);
  }
  return data;
}

/**
 * 发送订阅消息。返回 { errcode }：
 * 0=成功（消耗一条配额）；43101=用户无配额（前端未订阅或已用完）。
 * data 字段名（thing1/thing2 等）以小程序后台申请的模板字段为准。
 */
async function sendSubscribe(openid, templateId, page, data) {
  const token = await getStableAccessToken();
  if (!token) return { errcode: -1, errmsg: 'wechat not configured' };
  return getJson(`${BASE}/cgi-bin/message/subscribe/send?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ touser: openid, template_id: templateId, page, data })
  });
}

/**
 * 内容安全检测（UGC：问答题/纠错文本）。返回 { suggest, label } 或 null（未配置/调用失败——fail-open）。
 * suggest: 'pass' | 'risky' | 'review'
 */
async function msgSecCheck(openid, content) {
  const token = await getStableAccessToken();
  if (!token) return null;
  try {
    const data = await getJson(`${BASE}/wxa/msg_sec_check?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 2, openid, scene: 2, content })
    });
    if (data.errcode !== 0) {
      console.warn('msgSecCheck 调用失败:', data.errcode, data.errmsg);
      return null;
    }
    return data.result;
  } catch (err) {
    console.warn('msgSecCheck 异常（跳过）:', err && err.message);
    return null;
  }
}

module.exports = { isConfigured, getStableAccessToken, code2session, sendSubscribe, msgSecCheck };
