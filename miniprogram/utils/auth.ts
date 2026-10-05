export interface UserInfo {
  id: number;
  username: string;
  role: string;
  realName?: string | null;
}

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user_info';

export function getToken(): string {
  return (wx.getStorageSync(TOKEN_KEY) as string) || '';
}

export function getRefreshToken(): string {
  return (wx.getStorageSync(REFRESH_KEY) as string) || '';
}

export function getUser(): UserInfo | null {
  return (wx.getStorageSync(USER_KEY) as UserInfo) || null;
}

export function isAdmin(): boolean {
  return (getUser()?.role ?? '').includes('admin');
}

export function saveSession(token: string, refreshToken: string, user: UserInfo): void {
  wx.setStorageSync(TOKEN_KEY, token);
  wx.setStorageSync(REFRESH_KEY, refreshToken);
  wx.setStorageSync(USER_KEY, user);
}

export function clearSession(): void {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(REFRESH_KEY);
  wx.removeStorageSync(USER_KEY);
}

/** tab 页 onShow 守卫：未登录跳登录页，返回是否已登录 */
export function requireLogin(): boolean {
  if (!getToken()) {
    wx.reLaunch({ url: '/pages/login/index' });
    return false;
  }
  return true;
}
