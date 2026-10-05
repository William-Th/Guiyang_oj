/**
 * 自定义 tabBar：原生 tabBar 字号固定 10px 且不可加图标样式，这里自绘
 * （字号 24rpx、图标高亮、选中主色加粗），数据与 app.json tabBar.list 保持一致。
 */
const ITEMS = [
  { pagePath: '/pages/home/index', text: '首页', icon: 'wap-home-o', activeIcon: 'wap-home' },
  { pagePath: '/pages/practice/index', text: '练习', icon: 'edit', activeIcon: 'edit' },
  { pagePath: '/pages/growth/index', text: '成长', icon: 'chart-trending-o', activeIcon: 'chart-trending-o' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'user-o', activeIcon: 'user-o' },
];

Component({
  data: {
    selected: 0,
    list: ITEMS,
  },
  methods: {
    switchTab(e: WechatMiniprogram.CustomEvent) {
      const path = String(e.currentTarget.dataset.path ?? '');
      const index = Number(e.currentTarget.dataset.index ?? 0);
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    },
  },
});
