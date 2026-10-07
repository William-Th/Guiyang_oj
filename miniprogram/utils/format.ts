/**
 * 本地时间格式化。
 *
 * 背景（勿改回）：后端全部时间列为 `timestamp without time zone`，写入端
 * （CURRENT_TIMESTAMP / toISOString）均以 UTC 墙钟落库，Node 容器 TZ=UTC，
 * 因此接口返回的 ISO 串（…Z）是正确的 UTC 瞬间。设备在东八区，必须经
 * Date 本地 getter 换算后展示；严禁对 ISO 串直接 slice 截取（会差 8 小时）。
 */

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/**
 * 格式化为本地时间。mode='datetime' → `YYYY-MM-DD HH:mm`；mode='date' → `YYYY-MM-DD`。
 * 非法/空输入返回空串（wxml 的 wx:if 空串隐藏，与原行为一致）。
 */
export function formatDateTime(
  value?: string | number | Date | null,
  mode: 'datetime' | 'date' = 'datetime'
): string {
  if (value === null || value === undefined || value === '') return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (mode === 'date') return date;
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
