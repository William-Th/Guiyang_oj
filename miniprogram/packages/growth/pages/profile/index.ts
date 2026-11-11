import { getLearningProfile } from '../../../../services/activities';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

interface DailyTrendPoint {
  label: string;
  total: number;
  correct: number;
}

interface WeakPoint {
  knowledge_point: string;
  accuracy_rate: number;
  total_questions: number;
  correct_count: number;
  /** 进度条颜色：掌握度低红、中黄、高绿 */
  color: string;
}

Page({
  data: {
    loading: true,
    /** 掌握度 0~100（null = 暂无作答数据） */
    abilityPercent: null as number | null,
    abilityText: '暂无数据',
    practiceTotal: 0,
    practiceCorrectRate: '—',
    last7d: 0,
    dailyTotal: 0,
    weakPoints: [] as WeakPoint[],
    /** 知识点掌握度雷达 option */
    radarOption: null as Record<string, unknown> | null,
    /** 近 14 天练习趋势 option */
    trendOption: null as Record<string, unknown> | null,
    hasRadar: false,
    /** echarts 实例挂载成功的图表数（bind:inited 累加） */
    chartsInited: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    try {
      const res = await getLearningProfile();
      const d = res.data;
      const abilityPercent =
        d.ability == null ? null : Math.round(d.ability * 100);
      const weakPoints: WeakPoint[] = (d.weakPoints ?? []).map((w) => ({
        ...w,
        accuracy_rate: Math.round(w.accuracy_rate),
        color:
          w.accuracy_rate >= 80
            ? '#16a34a'
            : w.accuracy_rate >= 60
              ? '#d97706'
              : '#dc2626',
      }));
      this.setData({
        loading: false,
        abilityPercent,
        abilityText:
          abilityPercent == null
            ? '暂无数据'
            : abilityPercent >= 80
              ? '优秀'
              : abilityPercent >= 60
                ? '良好'
                : '待提升',
        practiceTotal: d.practice?.total ?? 0,
        practiceCorrectRate:
          d.practice?.correctRate == null ? '—' : `${d.practice.correctRate}%`,
        last7d: d.practice?.last7d ?? 0,
        dailyTotal: d.dailyTotal ?? 0,
        weakPoints,
      });
      this.buildCharts(d);
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载学习画像失败');
    }
  },

  onChartInited() {
    this.setData({ chartsInited: this.data.chartsInited + 1 });
  },

  /** 图表 option 组装：知识点掌握度雷达 + 近 14 天练习趋势折线 */
  buildCharts(d: {
    ability: number | null;
    knowledgeStats?: { knowledge_point: string; accuracy_rate: number }[];
    dailyTrend?: DailyTrendPoint[];
  }) {
    const stats = d.knowledgeStats ?? [];
    if (stats.length >= 3) {
      this.setData({
        hasRadar: true,
        radarOption: {
          tooltip: {},
          radar: {
            indicator: stats.map((k) => ({ name: k.knowledge_point, max: 100 })),
            radius: '62%',
            axisName: { color: '#64748b', fontSize: 10 },
            splitArea: { areaStyle: { color: ['#f8fafc', '#ffffff'] } },
            splitLine: { lineStyle: { color: '#e2e8f0' } },
            axisLine: { lineStyle: { color: '#cbd5e1' } },
          },
          series: [
            {
              type: 'radar',
              data: [
                {
                  value: stats.map((k) => Math.round(k.accuracy_rate)),
                  name: '知识点掌握度',
                  areaStyle: { color: 'rgba(14, 165, 233, 0.25)' },
                  lineStyle: { color: '#0ea5e9', width: 2 },
                  itemStyle: { color: '#0ea5e9' },
                },
              ],
            },
          ],
        },
      });
    } else {
      this.setData({ hasRadar: false });
    }

    const trend = d.dailyTrend ?? [];
    this.setData({
      trendOption: {
        grid: { left: 34, right: 12, top: 28, bottom: 24 },
        tooltip: { trigger: 'axis' },
        legend: {
          data: ['练题数', '答对数'],
          top: 0,
          itemWidth: 14,
          textStyle: { color: '#64748b', fontSize: 10 },
        },
        xAxis: {
          type: 'category',
          data: trend.map((t) => t.label),
          axisLabel: { color: '#64748b', fontSize: 9, interval: 3 },
          axisLine: { lineStyle: { color: '#cbd5e1' } },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: { color: '#64748b', fontSize: 9 },
          splitLine: { lineStyle: { color: '#eef2f7' } },
        },
        series: [
          {
            name: '练题数',
            type: 'line',
            smooth: true,
            data: trend.map((t) => t.total),
            symbolSize: 5,
            lineStyle: { color: '#0ea5e9', width: 2 },
            itemStyle: { color: '#0ea5e9' },
            areaStyle: { color: 'rgba(14, 165, 233, 0.12)' },
          },
          {
            name: '答对数',
            type: 'line',
            smooth: true,
            data: trend.map((t) => t.correct),
            symbolSize: 5,
            lineStyle: { color: '#16a34a', width: 2 },
            itemStyle: { color: '#16a34a' },
          },
        ],
      },
    });
  },
});
