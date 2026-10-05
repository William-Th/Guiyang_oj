import { ActivityItem, getAssessmentActivities, getPracticeActivities } from '../../services/api';
import { requireLogin } from '../../utils/auth';

interface DisplayItem {
  id: number;
  title: string;
  statusText: string;
  statusType: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  timeText: string;
}

/** 活动状态 → 小屏标签文案与颜色（字段以 web 端 activities 类型为准，未知状态兜底灰标） */
function decorate(list: ActivityItem[]): DisplayItem[] {
  return list.map((a) => {
    const status = String(a.status ?? '').toLowerCase();
    let statusText = '进行中';
    let statusType: DisplayItem['statusType'] = 'primary';
    if (status === 'finished' || status === 'completed' || status === 'ended') {
      statusText = '已结束';
      statusType = 'default';
    } else if (status === 'draft' || status === 'pending') {
      statusText = '未开始';
      statusType = 'warning';
    }
    const raw = a.end_time || a.startTime || a.endTime;
    return {
      id: a.id,
      title: a.title,
      statusText,
      statusType,
      timeText: raw ? String(raw).slice(0, 10) : '',
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
    registrations: [] as DisplayItem[],
  },

  onShow() {
    if (!requireLogin()) return;
    this.loadTab(this.data.activeTab);
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    const index = Number(e.detail.index ?? 0);
    this.setData({ activeTab: index });
    this.loadTab(index);
  },

  async loadTab(index: number) {
    const key = TAB_KEYS[index] ?? 'practice';
    if (key === 'registrations') {
      // 报名记录 M1 接测评报名接口；先复用测评列表占位
      this.setData({ registrations: this.data.assessmentList });
      return;
    }
    this.setData({ loading: true });
    try {
      const list = key === 'practice' ? await getPracticeActivities() : await getAssessmentActivities();
      this.setData(
        key === 'practice' ? { practiceList: decorate(list) } : { assessmentList: decorate(list) }
      );
    } catch {
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onItemTap(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id;
    // 答题页（packages/practice/answer）随 M1 落地
    wx.showToast({ title: `答题页将在后续版本开放（活动 ${id}）`, icon: 'none' });
  },
});
