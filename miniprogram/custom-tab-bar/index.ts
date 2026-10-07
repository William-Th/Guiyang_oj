/**
 * 自定义 tabBar：原生 tabBar 字号固定 10px 且不可按角色切换，这里自绘。
 * 按角色分化（计划书 5.4）：
 * - 学生：首页 / 练习 / 成长 / 我的
 * - 家长：看板 / 我的（只有孩子学生信息相关页面，不暴露练习测评入口）
 * - 教师：首页 / 我的（首页为引导页，教师功能在电脑端网页；不得露出学生练习/成长 tab）
 * - 管理员：工作台 / 我的（复用首页 tab 按角色渲染工作台内容，数据按各级管理员权限限定）
 *
 * 选中态：由各 tab 页在自己的 onShow 里调用 setActive(自身路径) 声明（官方推荐模式）。
 * 不要在 pageLifetimes.show 里按 getCurrentPages() 反算选中态——切换瞬间页面栈
 * 仍指向旧页，会把高亮改回旧 tab 造成"延迟选中"。
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

const ADMIN_TABS = [
  { pagePath: '/pages/home/index', text: '工作台', icon: 'manager-o', activeIcon: 'manager-o' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'user-o', activeIcon: 'user-o' },
];

const TEACHER_TABS = [
  { pagePath: '/pages/home/index', text: '首页', icon: 'wap-home-o', activeIcon: 'wap-home' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'user-o', activeIcon: 'user-o' },
];

Component({
  data: {
    selected: 0,
    list: STUDENT_TABS,
  },
  lifetimes: {
    attached() {
      // 列表按角色初始化（登录后角色不变，attached 时读取即可）
      const user = wx.getStorageSync('user_info') || null;
      const role = (user && user.role) || 'student';
      if (role === 'parent') this.setData({ list: PARENT_TABS });
      else if (role === 'teacher') this.setData({ list: TEACHER_TABS });
      else if (role.includes('admin')) this.setData({ list: ADMIN_TABS });
    },
  },
  methods: {
    /** tab 页 onShow 调用：声明自己是当前 tab（按 pagePath 在角色列表中定位，无竞态） */
    setActive(pagePath: string) {
      const idx = this.data.list.findIndex((t) => t.pagePath === pagePath);
      if (idx >= 0 && idx !== this.data.selected) {
        this.setData({ selected: idx });
      }
    },
    switchTab(e: WechatMiniprogram.CustomEvent) {
      const index = Number(e.currentTarget.dataset.index ?? 0);
      this.setData({ selected: index }); // 即时高亮，页面 onShow 的 setActive 会再次确认
      wx.switchTab({ url: String(e.currentTarget.dataset.path ?? '') });
    },
  },
});
