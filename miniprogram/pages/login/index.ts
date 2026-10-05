import { login } from '../../services/api';
import { getToken, saveSession } from '../../utils/auth';
import { toastError } from '../../utils/request';

interface PageData {
  username: string;
  password: string;
  loading: boolean;
}

Page({
  data: {
    username: '',
    password: '',
    loading: false,
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
      // 角色化落地（计划书 5.4/5.6）：家长进看板，其余进学生首页（管理员经「我的」进管理分包）
      if (res.user?.role === 'parent') {
        wx.reLaunch({ url: '/packages/parent/pages/dashboard/index' });
      } else {
        wx.reLaunch({ url: '/pages/home/index' });
      }
    } catch (err) {
      toastError(err, '登录失败，请检查账号密码');
    } finally {
      this.setData({ loading: false });
    }
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/index' });
  },
});
