/**
 * 微信实时日志（计划书 11 章可观测项）：
 * - 体验版/正式版的日志可在小程序后台「开发 → 开发管理 → 运维中心 → 实时日志」按用户/时间检索；
 * - 开发版/接口不可用时静默降级为 console（开发者工具内直接可见）。
 * 约定：error 只用于关键路径失败（请求失败/交卷失败/异常），info 记录关键动作，warn 记录可自愈异常。
 * 登录成功后调用 logger.setFilter(...)，后台即可按学生检索。
 */
type Level = 'info' | 'warn' | 'error';

interface RTLogger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  setFilterMsg(msg: string): void;
  addFilterMsg(msg: string): void;
}

let rt: RTLogger | null = null;
let rtTried = false;

function realtime(): RTLogger | null {
  if (rtTried) return rt;
  rtTried = true;
  try {
    rt = wx.getRealtimeLogManager();
  } catch {
    rt = null; // 低版本基础库/开发环境不可用
  }
  return rt;
}

function toText(v: unknown): string {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function emit(level: Level, tag: string, args: unknown[]) {
  const line = [tag, ...args].map(toText).join(' ');
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  const r = realtime();
  if (r) {
    try {
      (r[level] as (t: string, ...a: unknown[]) => void)(tag, ...args);
    } catch {
      /* 实时日志失败不影响业务 */
    }
  }
}

export const logger = {
  info(tag: string, ...args: unknown[]) {
    emit('info', tag, args);
  },
  warn(tag: string, ...args: unknown[]) {
    emit('warn', tag, args);
  },
  error(tag: string, ...args: unknown[]) {
    emit('error', tag, args);
  },
  /** 设置后台检索过滤字段（覆盖式），登录成功后调用一次 */
  setFilter(msg: string) {
    realtime()?.setFilterMsg(msg);
  },
};
