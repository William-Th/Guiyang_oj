import {
  UserNotification,
  SystemAnnouncement,
  getNotifications,
  getUnreadCounts,
  markNotificationRead,
  markAllNotificationsRead,
  getAnnouncements,
  markAnnouncementRead,
} from '../../services/notification';
import { requireLogin } from '../../utils/auth';
import { toastError } from '../../utils/request';
import { formatDateTime } from '../../utils/format';

const TYPE_TEXT: Record<string, string> = {
  system: '系统',
  achievement: '成就',
  activity: '活动',
  reminder: '提醒',
  announcement: '公告',
};

type Tab = 'notifications' | 'announcements';
type Filter = 'all' | 'unread' | 'read';

interface DisplayNotification extends UserNotification {
  typeText: string;
  timeText: string;
}

interface DisplayAnnouncement extends SystemAnnouncement {
  timeText: string;
  expanded: boolean;
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: '全部', value: 'all' },
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' },
];

Page({
  data: {
    tab: 'notifications' as Tab,
    filters: FILTERS,
    filter: 'all' as Filter,
    loading: true,
    unread: { notifications: 0, announcements: 0 },
    list: [] as DisplayNotification[],
    annList: [] as DisplayAnnouncement[],
    annLoading: false,
    annLoaded: false,
    markingAll: false,
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  /** 通知与未读数并行加载；公告 tab 懒加载（首次切到才拉） */
  async load() {
    try {
      const [listRes, unreadRes] = await Promise.all([
        this.loadNotifications(),
        getUnreadCounts().catch(() => null),
      ]);
      this.setData({
        list: listRes,
        loading: false,
        unread: unreadRes
          ? { notifications: unreadRes.count.notifications, announcements: unreadRes.count.announcements }
          : this.data.unread,
      });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载通知失败');
    }
    if (this.data.tab === 'announcements' && !this.data.annLoaded) this.loadAnnouncements();
  },

  async loadNotifications(): Promise<DisplayNotification[]> {
    const isRead = this.data.filter === 'unread' ? false : this.data.filter === 'read' ? true : undefined;
    const res = await getNotifications(1, isRead);
    return (res.data ?? []).map((n) => ({
      ...n,
      typeText: TYPE_TEXT[n.type] ?? '通知',
      timeText: formatDateTime(n.created_at),
    }));
  },

  async loadAnnouncements() {
    this.setData({ annLoading: true });
    try {
      const res = await getAnnouncements();
      this.setData({
        annList: (res.data ?? []).map((a) => ({
          ...a,
          timeText: formatDateTime(a.published_at),
          expanded: false,
        })),
        annLoaded: true,
      });
    } catch (err) {
      toastError(err, '加载公告失败');
    } finally {
      this.setData({ annLoading: false });
    }
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    const tab = String(e.currentTarget.dataset.tab) as Tab;
    if (tab === this.data.tab) return;
    this.setData({ tab });
    if (tab === 'announcements' && !this.data.annLoaded) this.loadAnnouncements();
  },

  async onFilterChange(e: WechatMiniprogram.CustomEvent) {
    const filter = String(e.currentTarget.dataset.filter) as Filter;
    if (filter === this.data.filter) return;
    this.setData({ filter, loading: true });
    try {
      this.setData({ list: await this.loadNotifications(), loading: false });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载通知失败');
    }
  },

  /** 点开即已读（未读才发请求），本地即时翻转避免整列表刷新 */
  async onTapNotification(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    const target = this.data.list.find((n) => n.id === id);
    if (!target || target.is_read) return;
    try {
      await markNotificationRead(id);
      const unread = Math.max(0, this.data.unread.notifications - 1);
      this.setData({
        list: this.data.list.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        unread: { ...this.data.unread, notifications: unread },
      });
    } catch (err) {
      toastError(err, '标记已读失败');
    }
  },

  async onMarkAllRead() {
    if (this.data.markingAll || this.data.unread.notifications === 0) return;
    this.setData({ markingAll: true });
    try {
      await markAllNotificationsRead();
      wx.showToast({ title: '全部已读', icon: 'success' });
      this.setData({
        list: this.data.list.map((n) => ({ ...n, is_read: true })),
        unread: { ...this.data.unread, notifications: 0 },
      });
    } catch (err) {
      toastError(err, '操作失败');
    } finally {
      this.setData({ markingAll: false });
    }
  },

  /** 公告展开即记已读（失败不打扰） */
  async onTapAnnouncement(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    const target = this.data.annList.find((a) => a.id === id);
    if (!target) return;
    const expanded = !target.expanded;
    this.setData({
      annList: this.data.annList.map((a) => (a.id === id ? { ...a, expanded } : a)),
    });
    if (expanded && target.is_read === false) {
      try {
        await markAnnouncementRead(id);
        this.setData({
          annList: this.data.annList.map((a) => (a.id === id ? { ...a, is_read: true } : a)),
          unread: { ...this.data.unread, announcements: Math.max(0, this.data.unread.announcements - 1) },
        });
      } catch {
        /* 已读记录失败不影响阅读 */
      }
    }
  },
});
