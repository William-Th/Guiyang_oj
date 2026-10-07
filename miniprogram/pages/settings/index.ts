import { SUBSCRIBE_TEMPLATES } from '../../config/env';
import { getUser, requireLogin } from '../../utils/auth';

const VERSION = '0.1.0';
/** 答题草稿缓存前缀（packages/practice/pages/answer CACHE_PREFIX，保持一致） */
const CACHE_PREFIX = 'mp_answers_';
/** 清缓存时保留的登录态键 */
const SESSION_KEYS = ['access_token', 'refresh_token', 'user_info'];

Page({
  data: {
    version: VERSION,
    /** 订阅消息模板是否已配置（未配置时入口灰态，配置于 config/env.ts） */
    streakAvailable: false,
    /** 上次订阅结果提示（仅本次会话内反馈） */
    streakText: '',
    cacheCount: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    this.setData({ streakAvailable: !!SUBSCRIBE_TEMPLATES.streak });
    this.refreshCacheCount();
  },

  refreshCacheCount() {
    try {
      const info = wx.getStorageInfoSync();
      const cacheKeys = (info.keys || []).filter(
        (k) => k.startsWith(CACHE_PREFIX) && !SESSION_KEYS.includes(k)
      );
      this.setData({ cacheCount: cacheKeys.length });
    } catch {
      this.setData({ cacheCount: 0 });
    }
  },

  /** 连胜提醒：微信订阅消息授权（一次性；后端按订阅配额下发） */
  onSubscribeStreak() {
    if (!this.data.streakAvailable) return;
    const tmpl = SUBSCRIBE_TEMPLATES.streak;
    wx.requestSubscribeMessage({
      tmplIds: [tmpl],
      complete: () => {
        /* 授权结果以弹窗为准；失败不打断 */
      },
      success: (res) => {
        const state = res[tmpl];
        this.setData({
          streakText:
            state === 'accept'
              ? '已订阅，断签前会提醒你'
              : state === 'reject'
                ? '已拒绝，可随时再来开启'
                : '',
        });
      },
      fail: () => {
        this.setData({ streakText: '订阅未完成，请稍后再试' });
      },
    });
  },

  /** 清除答题草稿等本地缓存，保留登录态 */
  onClearCache() {
    try {
      const info = wx.getStorageInfoSync();
      const cacheKeys = (info.keys || []).filter(
        (k) => k.startsWith(CACHE_PREFIX) && !SESSION_KEYS.includes(k)
      );
      cacheKeys.forEach((k) => wx.removeStorageSync(k));
      this.refreshCacheCount();
      wx.showToast({ title: `已清除 ${cacheKeys.length} 项缓存`, icon: 'success' });
    } catch {
      wx.showToast({ title: '清除失败，请稍后再试', icon: 'none' });
    }
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notifications/index' });
  },

  onAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '本平台为贵阳市小学生测评平台，仅用于校内教学与测评服务。完整协议将在正式发布时提供。',
      showCancel: false,
    });
  },

  onPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content:
        '本平台收集的信息仅用于学情分析与测评服务（含姓名、学校、答题记录），不向第三方提供。隐私指引将随正式发布上线。',
      showCancel: false,
    });
  },

  onAbout() {
    const user = getUser();
    wx.showModal({
      title: '关于',
      content: `贵阳市小学生测评平台 v${this.data.version}${user?.realName ? `\n当前用户：${user.realName}` : ''}`,
      showCancel: false,
    });
  },
});
