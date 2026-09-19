import { useEffect, useState } from 'react';

/**
 * 每秒刷新的当前时间戳，供列表内时间闸倒计时使用
 */
export const useNowTick = (intervalMs = 1000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};

/**
 * 毫秒 → 「HH:mm:ss」，超过一天时前缀「X天」
 */
export const formatCountdown = (msLeft: number): string => {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return days > 0 ? `${days}天 ${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;
};

/**
 * 时间闸门：活动设置了开始时间且尚未到达时为未开始
 * （与后端 start 接口的时间闸门保持一致口径）
 */
export const getTimeGate = (startTime: string | undefined | null, now: number) => {
  const startMs = startTime ? new Date(startTime).getTime() : NaN;
  const notStarted = Number.isFinite(startMs) && startMs > now;
  return { notStarted, msLeft: notStarted ? startMs - now : 0 };
};
