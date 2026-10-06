import { logout } from '../../services/api';
import { clearSession, getUser, isAdmin, requireLogin } from '../../utils/auth';

const ROLE_TEXT: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  parent: '家长',
  school_admin: '校管理员',
  district_admin: '区管理员',
  municipal_school_admin: '市校管理员',
  base_school_admin: '基地校管理员',
  municipal_admin: '市管理员',
  system_admin: '系统管理员',
};

Page({
  data: {
    user: { id: 0, username: '', role: '' },
    avatarText: '',
    roleText: '',
    isAdmin: false,
    isParent: false,
    version: '0.1.0',
  },

  onShow() {
    if (!requireLogin()) return;
    const user = getUser() ?? { id: 0, username: '', role: '' };
    const isParent = user.role === 'parent';
    const name = user.realName || user.username || '';
    this.setData({
      user,
      avatarText: name.slice(0, 1).toUpperCase() || '?',
      roleText: ROLE_TEXT[user.role] ?? user.role,
      isAdmin: !isParent && isAdmin(),
      isParent,
    });
  },

  goParentDashboard() {
    wx.switchTab({ url: '/pages/parent/index' });
  },

  goAdmin() {
    wx.navigateTo({ url: '/packages/admin/pages/home/index' });
  },

  onFeature() {
    wx.showToast({ title: '该功能将在后续版本开放', icon: 'none' });
  },

  onLogout() {
    // 后端登出会递增 tokenVersion 吊销全端会话（含 web），必须提前告知用户
    wx.showModal({
      title: '退出登录',
      content: '退出将同时下线电脑端的登录状态，确定退出吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await logout();
        } catch {
          /* 即使后端失败也清理本地会话 */
        }
        clearSession();
        wx.reLaunch({ url: '/pages/login/index' });
      },
    });
  },
});
