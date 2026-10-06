import { AdminDashboardStats, getAdminDashboardStats, getRegistrationRequests } from '../../../../services/api';
import { getPendingTeachingClasses } from '../../../../services/admin';
import { isAdmin, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

Page({
  data: {
    stats: { totalStudents: 0, totalExams: 0, thisMonthExams: 0, onlineTeachers: 0, recentExams: [] } as AdminDashboardStats,
    pendingCount: 0,
    loading: true,
  },

  onShow() {
    if (!requireLogin()) return;
    if (!isAdmin()) {
      wx.reLaunch({ url: '/pages/home/index' });
      return;
    }
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const [statsRes, regRes, clsRes] = await Promise.all([
        getAdminDashboardStats(),
        getRegistrationRequests(1, 'pending').catch(() => null),
        getPendingTeachingClasses().catch(() => null),
      ]);
      this.setData({ stats: statsRes, pendingCount: (regRes?.data?.total ?? 0) + (clsRes?.length ?? 0) });
    } catch (err) {
      toastError(err, '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },

  goApprovals() {
    wx.navigateTo({ url: '/packages/admin/pages/approvals/index' });
  },

  goUsers() {
    wx.navigateTo({ url: '/packages/admin/pages/users/index' });
  },
});
