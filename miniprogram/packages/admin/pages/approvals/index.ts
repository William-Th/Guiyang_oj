import {
  approveRegistration,
  getRegistrationRequests,
  RegistrationRequest,
  rejectRegistration,
} from '../../../../services/api';
import {
  PendingTeachingClass,
  approveTeachingClass,
  getPendingTeachingClasses,
  rejectTeachingClass,
} from '../../../../services/admin';
import { isAdmin, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { formatDateTime } from '../../../../utils/format';

interface DisplayRequest extends RegistrationRequest {
  statusText: string;
  statusType: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  submittedAtText: string;
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
    return { ...r, statusText, statusType, submittedAtText: formatDateTime(r.submitted_at) };
  });
}

Page({
  data: {
    tabs: [
      { value: 'registration', label: '注册申请' },
      { value: 'classes', label: '教学班审批' },
    ],
    tab: 'registration',
    filters: FILTERS,
    status: 'pending',
    statusText: '待审核申请',
    regPending: 0,
    clsPending: 0,
    list: [] as DisplayRequest[],
    classList: [] as (PendingTeachingClass & { submittedAtText: string })[],
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
    this.load();
  },

  /** 按当前 tab 加载列表，并顺带刷新双 tab 角标 */
  async load() {
    this.setData({ loading: true });
    try {
      if (this.data.tab === 'registration') {
        const res = await getRegistrationRequests(1, this.data.status);
        this.setData({
          list: decorate(res.data?.requests ?? []),
          total: res.data?.total ?? 0,
        });
        if (this.data.status === 'pending') this.setData({ regPending: res.data?.total ?? 0 });
      } else {
        const classes = await getPendingTeachingClasses();
        this.setData({
          classList: classes.map((c) => ({
            ...c,
            submittedAtText: formatDateTime(c.submitted_at, 'date'),
          })),
          clsPending: classes.length,
        });
      }
    } catch (err) {
      toastError(err, '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    const tab = String(e.currentTarget.dataset.tab);
    if (tab === this.data.tab) return;
    this.setData({ tab });
    this.load();
  },

  onStatusChange(e: WechatMiniprogram.CustomEvent) {
    const status = String(e.currentTarget.dataset.status);
    const label = FILTERS.find((f) => f.value === status)?.label ?? '';
    this.setData({ status, statusText: `${label}申请` });
    this.load();
  },

  // ---------- 注册审批 ----------

  async onApprove(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    if (this.data.actingId) return;
    this.setData({ actingId: id });
    try {
      const res = await approveRegistration(id);
      // 批准会创建学生账号，后端返回初始密码——提示管理员转告学生
      wx.showModal({
        title: '已通过',
        content: `${res.message ?? '注册申请已批准'}${res.data?.initialPassword ? '，初始密码：' + res.data.initialPassword : ''}`,
        showCancel: false,
      });
      this.load();
    } catch (err) {
      toastError(err, '操作失败');
    } finally {
      this.setData({ actingId: 0 });
    }
  },

  onReject(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    // 驳回原因后端必填（comment 字段）
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
          this.load();
        } catch (err) {
          toastError(err, '操作失败');
        }
      },
    });
  },

  // ---------- 教学班审批 ----------

  async onApproveClass(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    if (this.data.actingId) return;
    this.setData({ actingId: id });
    try {
      await approveTeachingClass(id);
      wx.showToast({ title: '已通过', icon: 'success' });
      this.load();
    } catch (err) {
      toastError(err, '操作失败');
    } finally {
      this.setData({ actingId: 0 });
    }
  },

  onRejectClass(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    // 教学班驳回后端要求 reason 字段必填
    wx.showModal({
      title: '驳回教学班',
      editable: true,
      placeholderText: '请填写驳回原因（必填）',
      success: async (res) => {
        if (!res.confirm) return;
        const reason = (res.content || '').trim();
        if (!reason) {
          wx.showToast({ title: '驳回原因不能为空', icon: 'none' });
          return;
        }
        try {
          await rejectTeachingClass(id, reason);
          wx.showToast({ title: '已驳回', icon: 'success' });
          this.load();
        } catch (err) {
          toastError(err, '操作失败');
        }
      },
    });
  },
});
