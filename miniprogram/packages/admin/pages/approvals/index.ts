import {
  RegistrationRequest,
  approveRegistration,
  getRegistrationRequests,
  rejectRegistration,
} from '../../../../services/api';
import { isAdmin, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

interface DisplayRequest extends RegistrationRequest {
  statusText: string;
  statusType: 'primary' | 'success' | 'danger' | 'warning' | 'default';
}

const FILTERS = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

function decorate(list: RegistrationRequest[]): DisplayRequest[] {
  return list.map((r) => {
    const status = String(r.status ?? '').toLowerCase();
    let statusText = '待审核';
    let statusType: DisplayRequest['statusType'] = 'warning';
    if (status === 'approved') {
      statusText = '已通过';
      statusType = 'success';
    } else if (status === 'rejected') {
      statusText = '已驳回';
      statusType = 'danger';
    }
    return { ...r, statusText, statusType };
  });
}

Page({
  data: {
    filters: FILTERS,
    status: 'pending',
    statusText: '待审核申请',
    list: [] as DisplayRequest[],
    total: 0,
    page: 1,
    loading: false,
    actingId: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    if (!isAdmin()) {
      wx.showToast({ title: '无管理权限', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.load(1);
  },

  onStatusChange(e: WechatMiniprogram.CustomEvent) {
    const status = String(e.currentTarget.dataset.status);
    const label = FILTERS.find((f) => f.value === status)?.label ?? '';
    this.setData({ status, statusText: `${label}申请` });
    this.load(1);
  },

  async load(page: number) {
    this.setData({ loading: true });
    try {
      const res = await getRegistrationRequests(page, this.data.status);
      this.setData({
        list: decorate(res.data?.requests ?? []),
        total: res.data?.total ?? 0,
        page,
      });
    } catch (err) {
      toastError(err, '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  async onApprove(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    if (this.data.actingId) return;
    this.setData({ actingId: id });
    try {
      await approveRegistration(id);
      wx.showToast({ title: '已通过', icon: 'success' });
      this.load(this.data.page);
    } catch (err) {
      toastError(err, '操作失败');
    } finally {
      this.setData({ actingId: 0 });
    }
  },

  onReject(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    // 驳回原因后端必填（comment 字段）；M1 换 van-dialog 表单化输入
    wx.showModal({
      title: '驳回申请',
      editable: true,
      placeholderText: '请填写驳回原因（必填）',
      success: async (res) => {
        if (!res.confirm) return;
        const comment = (res.content || '').trim();
        if (!comment) {
          wx.showToast({ title: '驳回原因不能为空', icon: 'none' });
          return;
        }
        try {
          await rejectRegistration(id, comment);
          wx.showToast({ title: '已驳回', icon: 'success' });
          this.load(this.data.page);
        } catch (err) {
          toastError(err, '操作失败');
        }
      },
    });
  },
});
