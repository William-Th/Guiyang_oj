import { MyRegistration, getMyRegistrations } from '../../../../services/api';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { formatDateTime } from '../../../../utils/format';

const STATUS_TEXT: Record<string, string> = {
  pending: '审核中',
  approved: '已通过',
  rejected: '已驳回',
};

const STATUS_TYPE: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

interface DisplayRegistration extends MyRegistration {
  statusText: string;
  statusType: string;
  submittedText: string;
  reviewedText: string;
}

Page({
  data: {
    loading: true,
    list: [] as DisplayRegistration[],
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    try {
      const res = await getMyRegistrations();
      this.setData({
        loading: false,
        list: (res.data ?? []).map((r) => ({
          ...r,
          statusText: STATUS_TEXT[r.status] ?? r.status,
          statusType: STATUS_TYPE[r.status] ?? 'default',
          submittedText: formatDateTime(r.submitted_at),
          reviewedText: formatDateTime(r.reviewed_at),
        })),
      });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载报名记录失败');
    }
  },

  /** 去报名：跳转注册页（未通过的历史申请可重新提交） */
  goRegister() {
    wx.navigateTo({ url: '/pages/register/index' });
  },
});
