/**
 * 薄荷编程品牌设计规范 — Ant Design 5 主题配置
 *
 * 基于 bohe-design-guard 规范：
 * - 品牌主色: #16a34a (mint-600)
 * - 品牌次色: #15803d (mint-700, hover)
 * - Logo 渐变: #4D9899 → #7AC99C
 * - 间距基数: 4px
 * - 最小触摸目标: 44×44px
 */

import type { ThemeConfig } from 'antd';

// 薄荷绿色板
export const mintColors = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a', // 品牌主色
  700: '#15803d', // hover 状态
  800: '#166534',
  900: '#14532d',
};

// 薄荷品牌渐变
export const mintGradient = {
  start: '#4D9899',
  end: '#7AC99C',
  css: 'linear-gradient(135deg, #4D9899 0%, #7AC99C 100%)',
};

// 功能色（保持语义化）
export const semanticColors = {
  success: '#16a34a',
  warning: '#fa8c16',
  error: '#f5222d',
  info: '#16a34a', // info 使用品牌色替代蓝色
};

// 薄荷字体栈
export const mintFontStack =
  '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif';

// Ant Design 5 主题配置
const boheTheme: ThemeConfig = {
  token: {
    // 品牌色
    colorPrimary: mintColors[600],
    colorPrimaryHover: mintColors[500],
    colorPrimaryActive: mintColors[700],

    // 功能色
    colorSuccess: semanticColors.success,
    colorWarning: semanticColors.warning,
    colorError: semanticColors.error,
    colorInfo: semanticColors.info,

    // 链接色
    colorLink: mintColors[600],
    colorLinkHover: mintColors[500],
    colorLinkActive: mintColors[700],

    // 高亮色（用于选中背景）
    colorHighlight: mintColors[100],

    // 字体
    fontFamily: mintFontStack,
    fontSize: 14,

    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // 间距（基于 4px 网格）
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,

    // 控件尺寸（确保最小触摸目标 44px）
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,

    // 线宽
    lineWidth: 1,

    // 阴影
    boxShadow:
      '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary:
      '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
  components: {
    // 按钮组件
    Button: {
      primaryShadow: '0 2px 0 rgba(22, 163, 74, 0.1)',
      algorithm: true,
    },
    // 菜单组件
    Menu: {
      itemSelectedBg: mintColors[50],
      itemSelectedColor: mintColors[700],
      itemHoverBg: mintColors[50],
    },
    // 标签页
    Tabs: {
      inkBarColor: mintColors[600],
      itemSelectedColor: mintColors[600],
      itemHoverColor: mintColors[500],
    },
    // 进度条
    Progress: {
      remainingColor: '#f0f0f0',
    },
    // 步骤条
    Steps: {
      colorPrimary: mintColors[600],
    },
    // 开关
    Switch: {
      colorPrimary: mintColors[600],
      colorPrimaryHover: mintColors[500],
    },
    // 标签
    Tag: {
      defaultBg: mintColors[50],
      defaultColor: mintColors[700],
    },
    // 链接
    Typography: {
      colorLink: mintColors[600],
    },
    // 卡片
    Card: {
      borderRadiusLG: 12,
    },
    // 表格
    Table: {
      headerBg: '#fafafa',
      rowHoverBg: mintColors[50],
    },
    // 输入框
    Input: {
      activeBorderColor: mintColors[600],
      hoverBorderColor: mintColors[500],
    },
    // 选择器
    Select: {
      colorPrimary: mintColors[600],
      colorPrimaryHover: mintColors[500],
    },
    // 复选框
    Checkbox: {
      colorPrimary: mintColors[600],
      colorPrimaryHover: mintColors[500],
    },
    // 单选框
    Radio: {
      colorPrimary: mintColors[600],
      colorPrimaryHover: mintColors[500],
    },
    // 徽标
    Badge: {
      colorPrimary: mintColors[600],
    },
    // 时间轴
    Timeline: {
      dotBg: mintColors[600],
    },
    // 分页
    Pagination: {
      colorPrimary: mintColors[600],
    },
    // 面包屑
    Breadcrumb: {
      lastItemColor: mintColors[700],
    },
    // 头像
    Avatar: {
      colorPrimaryBg: mintColors[50],
      colorPrimary: mintColors[600],
    },
  },
};

export default boheTheme;
