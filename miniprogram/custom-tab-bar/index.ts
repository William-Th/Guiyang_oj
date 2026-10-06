/**
 * 自定义 tabBar：原生 tabBar 字号固定 10px 且不可按角色切换，这里自绘。
 * 按角色分化（计划书 5.4）：
 * - 学生：首页 / 练习 / 成长 / 我的
 * - 家长：看板 / 我的（只有孩子学生信息相关页面，不暴露练习测评入口）
 * 组件在页面 show 时自同步角色与选中态，各页面无需手动 setData。
 */
const STUDENT_TABS = [
  { pagePath: '/pages/home/index', text: '首页', icon: 'wap-home-o', activeIcon: 'wap-home' },
  { pagePath: '/pages/practice/index', text: '练习', icon: 'edit', activeIcon: 'edit' },
  { pagePath: '/pages/growth/index', text: '成长', icon: 'chart-trending-o', activeIcon: 'chart-trending-o' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'user-o', activeIcon: 'user-o' },
];

const PARENT_TABS = [
  { pagePath: '/pages/parent/index', text: '看板', icon: 'friends-o', activeIcon: 'friends-o' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'user-o', activeIcon: 'user-o' },
];

Component({
  data: {
    selected: 0,
    list: STUDENT_TABS,
  },
  lifetimes: {
    attached() {
      this.sync();
    },
  },
  pageLifetimes: {
    show() {
      this.sync();
    },
  },
  methods: {
    sync() {
      const user = wx.getStorageSync('user_info') || null;
      const isParent = !!user && user.role === 'parent';
      const list = isParent ? PARENT_TABS : STUDENT_TABS;
      const pages = getCurrentPages();
      const route = pages.length ? pages[pages.length - 1].route : '';
      let selected = list.findIndex((t) => '/' + route === t.pagePath);
      if (selected < 0) selected = 0;
      this.setData({ list, selected });
    },
    switchTab(e: WechatMiniprogram.CustomEvent) {
      wx.switchTab({ url: String(e.currentTarget.dataset.path ?? '') });
    },
  },
});
