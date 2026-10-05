import { AdminDashboardStats, getAdminDashboardStats } from '../../../../services/api';
import { isAdmin, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

Page({
  data: {
    stats: { totalStudents: 0, totalExams: 0, thisMonthExams: 0, onlineTeachers: 0, recentExams: [] } as AdminDashboardStats,
    loading: true,
  },

  onShow() {
    if (!requireLogin()) return;
    if (!isAdmin()) {
      wx.showToast({ title: '无管理权限', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const stats = await getAdminDashboardStats();
      this.setData({ stats });
    } catch (err) {
      toastError(err, '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  goApprovals() {
    wx.navigateTo({ url: '/packages/admin/pages/approvals/index' });
  },
});
