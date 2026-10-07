import {
  RegistrableAssessment,
  StudentActivityItem,
  cancelRegistration,
  checkRegistrationEligibility,
  getMyRegistrations,
  getRegistrableAssessments,
  getStudentAssessmentList,
  getStudentPracticeList,
  registerAssessment,
} from '../../services/activities';
import { toastError } from '../../utils/request';
import { getUser, requireLogin } from '../../utils/auth';

interface DisplayItem {
  id: number;
  title: string;
  statusText: string;
  statusType: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  metaText: string;
  done: boolean;
}

interface RegistrableItem {
  id: number;
  title: string;
  subject: string;
  deadlineText: string;
  registering: boolean;
}

function decorateRegistrable(r: RegistrableAssessment): RegistrableItem {
  const deadline = r.registration_end_time
    ? formatShort(r.registration_end_time)
    : r.end_time
      ? formatShort(r.end_time)
      : '';
  return {
    id: r.id,
    title: r.title,
    subject: r.subject ?? '',
    deadlineText: deadline ? `报名截止 ${deadline}` : '报名开放中',
    registering: false,
  };
}

function formatShort(v: string): string {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface RegistrationItem {
  id: number;
  activityId: number;
  title: string;
  statusText: string;
  statusType: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  metaText: string;
  canCancel: boolean;
}

function decorateRegistration(r: {
  id: number;
  activity_id: number;
  status?: string;
  activity_title?: string;
  subject?: string;
  grade?: string;
  activity_status?: string;
  location_name?: string;
  exam_date?: string;
  exam_time_start?: string;
}): RegistrationItem {
  const cancelled = r.status === 'cancelled';
  const examDate = r.exam_date ? String(r.exam_date).slice(0, 10) : '';
  const timeRange = r.exam_time_start ? ` ${String(r.exam_time_start).slice(0, 5)}` : '';
  const metaParts: string[] = [];
  if (r.subject) metaParts.push(r.subject);
  if (r.location_name) metaParts.push(r.location_name);
  if (examDate) metaParts.push(`${examDate}${timeRange}`);
  return {
    id: r.id,
    activityId: r.activity_id,
    title: r.activity_title ?? '测评',
    statusText: cancelled ? '已取消' : '已报名',
    statusType: cancelled ? 'default' : 'primary',
    metaText: metaParts.join(' · '),
    canCancel: !cancelled,
  };
}

/** 学生侧状态：以 my_status（我的 attempt）为准，辅以时间窗 */
function decorate(list: StudentActivityItem[]): DisplayItem[] {
  const now = Date.now();
  return list.map((a) => {
    let statusText = '进行中';
    let statusType: DisplayItem['statusType'] = 'primary';
    if (a.my_status === 'in_progress') {
      statusText = '答题中';
    } else if (a.my_status === 'submitted' || a.my_status === 'graded') {
      statusText = '已交卷';
      statusType = 'success';
    } else if (a.end_time && new Date(a.end_time).getTime() < now) {
      statusText = '已结束';
      statusType = 'default';
    } else if (a.start_time && new Date(a.start_time).getTime() > now) {
      statusText = '未开始';
      statusType = 'warning';
    }
    const metaParts: string[] = [];
    if (a.question_count) metaParts.push(`${a.question_count} 题`);
    if (a.my_status === 'submitted' || a.my_status === 'graded') {
      if (a.my_score !== undefined && a.my_score !== null) metaParts.push(`${a.my_score} 分`);
    } else if (a.end_time) {
      metaParts.push(`截止 ${String(a.end_time).slice(5, 10)}`);
    }
    return {
      id: a.id,
      title: a.title,
      statusText,
      statusType,
      metaText: metaParts.join(' · '),
      done: a.my_status === 'submitted' || a.my_status === 'graded',
    };
  });
}

const TAB_KEYS = ['practice', 'assessment', 'registrations'] as const;

Page({
  data: {
    activeTab: 0,
    loading: false,
    practiceList: [] as DisplayItem[],
    assessmentList: [] as DisplayItem[],
    registrationList: [] as RegistrationItem[],
    registrable: [] as RegistrableItem[],
  },

  onShow() {
    if (!requireLogin()) return;
    // 练习/测评页仅学生使用：家长回看板、管理员回管理工作台
    const role = getUser()?.role ?? '';
    if (role !== 'student') {
      if (role === 'parent') wx.reLaunch({ url: '/pages/parent/index' });
      else wx.switchTab({ url: '/pages/home/index' });
      return;
    }
(
  this as unknown as { getTabBar?: () => { setActive?: (p: string) => void } | undefined }
).getTabBar?.()?.setActive?.('/pages/practice/index');
    this.loadTab(this.data.activeTab);
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    const index = Number(e.detail.index ?? 0);
    this.setData({ activeTab: index });
    this.loadTab(index);
  },

  async loadTab(index: number) {
    const key = TAB_KEYS[index] ?? 'practice';
    this.setData({ loading: true });
    try {
      if (key === 'registrations') {
        const list = await getMyRegistrations();
        this.setData({ registrationList: list.map(decorateRegistration) });
      } else if (key === 'assessment') {
        const [list, registrableRes] = await Promise.all([
          getStudentAssessmentList(),
          getRegistrableAssessments().catch(() => null),
        ]);
        this.setData({
          assessmentList: decorate(list),
          registrable: (registrableRes?.data ?? []).map(decorateRegistrable),
        });
      } else {
        const list = await getStudentPracticeList();
        this.setData({ practiceList: decorate(list) });
      }
    } catch {
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onItemTap(e: WechatMiniprogram.CustomEvent) {
    const { id, done } = e.currentTarget.dataset as { id: number; done: boolean };
    if (done) {
      wx.navigateTo({ url: `/packages/practice/pages/result/index?id=${id}` });
    } else {
      wx.navigateTo({ url: `/packages/practice/pages/answer/index?id=${id}` });
    }
  },

  /** 学生自助报名：先查资格；需测评点的活动弹选择 */
  async onRegister(e: WechatMiniprogram.CustomEvent) {
    const activityId = Number(e.currentTarget.dataset.id);
    const item = this.data.registrable.find((r) => r.id === activityId);
    if (!item || item.registering) return;
    this.setRegistering(activityId, true);
    try {
      const eligibility = await checkRegistrationEligibility(activityId);
      if (!eligibility.eligible) {
        wx.showToast({ title: eligibility.reasons?.[0] || '暂不符合报名条件', icon: 'none', duration: 2500 });
        return;
      }
      if (eligibility.requireLocation) {
        const locations = eligibility.locations ?? [];
        if (locations.length === 0) {
          wx.showToast({ title: '测评点暂未公布', icon: 'none' });
          return;
        }
        wx.showActionSheet({
          itemList: locations.slice(0, 6).map((l) => l.name || l.address || `测评点 ${l.id}`),
          success: async (res) => {
            await this.doRegister(activityId, locations[res.tapIndex].id);
          },
          fail: () => undefined,
        });
        return;
      }
      await this.doRegister(activityId);
    } catch (err) {
      toastError(err, '报名失败');
    } finally {
      this.setRegistering(activityId, false);
    }
  },

  async doRegister(activityId: number, locationId?: number) {
    try {
      const res = await registerAssessment(activityId, locationId);
      wx.showToast({ title: res.message || '报名成功', icon: 'success' });
      this.loadTab(1); // 刷新测评 tab（可报名区消失、列表出现该测评）
    } catch (err) {
      toastError(err, '报名失败');
    }
  },

  setRegistering(id: number, val: boolean) {
    this.setData({
      registrable: this.data.registrable.map((r) => (r.id === id ? { ...r, registering: val } : r)),
    });
  },

  onCancelReg(e: WechatMiniprogram.CustomEvent) {
    const activityId = Number(e.currentTarget.dataset.activityId);
    wx.showModal({
      title: '取消报名',
      content: '确定取消该测评的报名吗？取消后如需参加需重新报名。',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await cancelRegistration(activityId);
          wx.showToast({ title: '已取消报名', icon: 'success' });
          this.loadTab(2);
        } catch (err) {
          toastError(err, '取消失败');
        }
      },
    });
  },
});
