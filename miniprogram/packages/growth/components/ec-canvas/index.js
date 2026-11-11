/**
 * 精简版 ECharts 小程序组件（canvas type=2d，官方 echarts-for-weapp 的同思路实现）。
 * 用法：<ec-canvas options="{{radarOption}}" bind:inited="..." />
 * options 变更自动 setOption。echarts.js 为按需构建产物（tools/echarts-entry.js）。
 */
const echartsModule = require('./echarts.js');
// esbuild CJS 产物将入口的 export default 挂在 .default 下
const echarts = echartsModule.default || echartsModule;

Component({
  properties: {
    options: {
      type: Object,
      value: null,
      observer(newVal) {
        if (newVal && this.chart) {
          this.chart.setOption(newVal);
        }
      },
    },
  },

  data: {
    inited: false,
  },

  lifetimes: {
    ready() {
      this.init();
    },
    detached() {
      if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }
    },
  },

  methods: {
    init() {
      wx.createSelectorQuery()
        .in(this)
        .select('#ec-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return;
          const { node, width, height } = res[0];
          const winInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
          const dpr = winInfo.pixelRatio || 2;
          node.width = width * dpr;
          node.height = height * dpr;
          this.patchCanvasEvents(node);
          this.canvasNode = node;
          this.chart = echarts.init(node, null, {
            width,
            height,
            devicePixelRatio: dpr,
          });
          this.setData({ inited: true });
          if (this.data.options) {
            this.chart.setOption(this.data.options);
          }
          this.triggerEvent('inited', { chart: this.chart });
        });
    },

    /**
     * 小程序 canvas 2d 节点没有 DOM 事件 API，而 zrender 在 wxa 环境仍通过
     * addEventListener 收集触摸事件。这里把 listener 收集到节点上，再由
     * WXML 的 bindtouch* 转发原生触摸事件（zrender 自行归一化坐标）。
     */
    patchCanvasEvents(node) {
      if (typeof node.addEventListener === 'function') return;
      const listeners = {};
      node.addEventListener = (type, fn) => {
        (listeners[type] = listeners[type] || []).push(fn);
      };
      node.removeEventListener = (type, fn) => {
        const arr = listeners[type] || [];
        const idx = arr.indexOf(fn);
        if (idx > -1) arr.splice(idx, 1);
      };
      node.dispatchEvent = (ev) => {
        const arr = listeners[ev.type] || [];
        for (let i = 0; i < arr.length; i++) arr[i](ev);
      };
      node._ecListeners = listeners;
    },

    /** WXML bindtouch* → zrender 事件代理 */
    onWxTouch(e) {
      const node = this.canvasNode;
      if (!node || !node._ecListeners) return;
      const arr = node._ecListeners[e.type] || [];
      for (let i = 0; i < arr.length; i++) arr[i](e);
    },
  },
});
