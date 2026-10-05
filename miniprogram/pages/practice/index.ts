import { StudentActivityItem, getStudentAssessmentList, getStudentPracticeList } from '../../services/activities';
import { requireLogin } from '../../utils/auth';

interface DisplayItem {
  id: number;
  title: string;
  statusText: string;
  statusType: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  metaText: string;
  done: boolean;
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
    registrations: [] as DisplayItem[],
  },

  onShow() {
    if (!requireLogin()) return;
    const tabBar = (
      this as unknown as { getTabBar?: () => { setData: (d: Record<string, unknown>) => void } }
    ).getTabBar?.();
    tabBar?.setData({ selected: 1 });
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
      // 报名记录 M1 接测评报名接口（/api/assessments/my-registrations）；先复用测评列表占位
      this.setData({ registrations: this.data.assessmentList });
      return;
    }
    this.setData({ loading: true });
    try {
      const list = key === 'practice' ? await getStudentPracticeList() : await getStudentAssessmentList();
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
    const { id, done } = e.currentTarget.dataset as { id: number; done: boolean };
    if (done) {
      wx.navigateTo({ url: `/packages/practice/pages/result/index?id=${id}` });
    } else {
      wx.navigateTo({ url: `/packages/practice/pages/answer/index?id=${id}` });
    }
  },
});
