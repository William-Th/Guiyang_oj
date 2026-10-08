import { login, wechatBind, wechatLogin } from '../../services/api';
import { getToken, saveSession } from '../../utils/auth';
import { toastError } from '../../utils/request';
import { logger } from '../../utils/logger';

interface PageData {
  mode: 'password' | 'bind';
  username: string;
  password: string;
  loading: boolean;
  wxLoading: boolean;
  bindTicket: string;
}

function redirectByRole(role?: string) {
  // 角色化落地（计划书 5.4/5.6）：家长进看板、管理员进管理工作台、学生进首页
  if (role === 'parent') wx.reLaunch({ url: '/pages/parent/index' });
  else if (role && role.includes('admin')) wx.reLaunch({ url: '/pages/home/index' });
  else wx.reLaunch({ url: '/pages/home/index' });
}

Page({
  data: {
    mode: 'password',
    username: '',
    password: '',
    loading: false,
    wxLoading: false,
    bindTicket: '',
  } as PageData,

  onLoad() {
    if (getToken()) {
      wx.reLaunch({ url: '/pages/home/index' });
    }
  },

  onFieldChange(e: WechatMiniprogram.CustomEvent) {
    const field = e.currentTarget.dataset.field as 'username' | 'password';
    const patch: Partial<Pick<PageData, 'username' | 'password'>> = {};
    patch[field] = String(e.detail ?? '');
    this.setData(patch);
  },

  switchMode() {
    this.setData({ mode: this.data.mode === 'bind' ? 'password' : 'bind' });
  },

  /** 微信一键登录：code 换会话；未绑定则进入绑定模式（bindTicket 10 分钟有效） */
  async onWxLogin() {
    if (this.data.wxLoading) return;
    this.setData({ wxLoading: true });
    try {
      const code = await new Promise<string>((resolve, reject) => {
        wx.login({ success: (r) => resolve(r.code), fail: reject });
      });
      const res = await wechatLogin(code);
      if (res.needBind && res.bindTicket) {
        logger.info('login.wx', '微信未绑定，进入绑定流程');
        this.setData({ mode: 'bind', bindTicket: res.bindTicket });
        wx.showToast({ title: '请验证已有账号完成绑定', icon: 'none' });
        return;
      }
      if (res.token && res.user && res.refreshToken) {
        saveSession(res.token, res.refreshToken, res.user);
        logger.info('login.wx', '微信登录成功', res.user.role);
        logger.setFilter(`user=${res.user.username} role=${res.user.role}`);
        redirectByRole(res.user.role);
        return;
      }
      wx.showToast({ title: res.message || '微信登录失败', icon: 'none' });
    } catch (err) {
      logger.error('login.wx', '微信登录失败');
      toastError(err, '微信登录不可用，请使用账号密码登录');
    } finally {
      this.setData({ wxLoading: false });
    }
  },

  async onBind() {
    const { username, password, bindTicket, loading } = this.data;
    if (!username.trim() || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }
    if (!bindTicket || loading) return;
    this.setData({ loading: true });
    try {
      const res = await wechatBind(bindTicket, username.trim(), password);
      saveSession(res.token, res.refreshToken, res.user);
      wx.showToast({ title: '绑定成功', icon: 'success' });
      redirectByRole(res.user?.role);
    } catch (err) {
      toastError(err, '绑定失败，请检查账号密码');
      // 票据过期时回密码登录模式重新微信登录
      const e = err as { data?: { message?: string } };
      if (e?.data?.message?.includes('过期')) {
        this.setData({ mode: 'password', bindTicket: '' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  async onLogin() {
    const { username, password, loading } = this.data;
    if (!username.trim() || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }
    if (loading) return;
    this.setData({ loading: true });
    try {
      const res = await login(username.trim(), password);
      saveSession(res.token, res.refreshToken, res.user);
      logger.info('login', '登录成功', res.user.role);
      logger.setFilter(`user=${res.user.username} role=${res.user.role}`);
      redirectByRole(res.user?.role);
    } catch (err) {
      logger.error('login', '账号密码登录失败');
      toastError(err, '登录失败，请检查账号密码');
    } finally {
      this.setData({ loading: false });
    }
  },

  goQueryProgress() {
    wx.navigateTo({ url: '/pages/register/index?tab=query' });
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/index' });
  },
});
