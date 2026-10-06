import { BASE_URL, API_PREFIX } from '../config/env';
import { logger } from './logger';
import { clearSession, getRefreshToken, getToken } from './auth';

/** wx.request 不支持 PATCH（后端亦未使用 PATCH 路由） */
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiError {
  statusCode?: number;
  /** 家长端接口错误字段为 error，其余多为 message */
  data?: { message?: string; error?: string; errors?: { msg?: string }[] };
}

interface RequestOptions {
  /** 是否携带 JWT（默认 true） */
  auth?: boolean;
}

let refreshing: Promise<boolean> | null = null;

function rawRequest<T>(
  method: Method,
  path: string,
  data: Record<string, unknown> | undefined,
  auth: boolean
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${API_PREFIX}${path}`,
      method,
      data,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          logger.warn('request', method, path, res.statusCode);
          reject({ statusCode: res.statusCode, data: res.data } as ApiError);
        }
      },
      fail: (err) => {
        logger.error('request.network', method, path, err.errMsg);
        reject({ statusCode: 0, data: err } as ApiError);
      },
    });
  });
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await rawRequest<{ token: string; refreshToken: string }>(
      'POST',
      '/auth/refresh',
      { refreshToken },
      false
    );
    wx.setStorageSync('access_token', res.token);
    wx.setStorageSync('refresh_token', res.refreshToken);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

/** 统一请求：JWT 注入；401 自动刷新并重试一次，仍失败回登录页 */
export async function request<T>(
  method: Method,
  path: string,
  data?: Record<string, unknown>,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = true } = options;
  try {
    return await rawRequest<T>(method, path, data, auth);
  } catch (err) {
    const status = (err as ApiError).statusCode ?? 0;
    if (auth && status === 401) {
      refreshing = refreshing || tryRefresh().finally(() => (refreshing = null));
      if (await refreshing) {
        logger.info('auth.refresh', '401 后刷新成功，重试原请求');
        return rawRequest<T>(method, path, data, auth);
      }
      logger.warn('auth.refresh', '刷新失败，回登录页');
      wx.reLaunch({ url: '/pages/login/index' });
    }
    throw err;
  }
}

/** 弱网重试防重复计分：提交类请求携带幂等键（计划书第 8 章） */
export function idempotencyKey(): string {
  return `mp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toastError(err: unknown, fallback = '请求失败，请稍后重试'): void {
  const e = err as ApiError;
  const msg = e?.data?.message || e?.data?.error || e?.data?.errors?.[0]?.msg || fallback;
  wx.showToast({ title: msg, icon: 'none' });
}
