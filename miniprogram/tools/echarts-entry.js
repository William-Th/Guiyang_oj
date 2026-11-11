/**
 * ECharts 按需构建入口（构建产物放 packages/growth/components/ec-canvas/echarts.js）。
 * 只包含画像页用到的：雷达图、折线图 + 网格/提示/图例 + Canvas 渲染器。
 * 重建命令见同目录 build-echarts.js。
 */
import * as echarts from 'echarts/core';
import { RadarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  RadarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

export default echarts;
