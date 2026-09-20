/**
 * 平台主题规范 — Ant Design 5 主题配置
 *
 * 颜色体系：
 * - 品牌主色: #0ea5e9 (sky-500)
 * - 品牌次色: #0284c7 (sky-600)
 * - 品牌渐变: #0284c7 → #38bdf8
 * - 成功: #52c41a / 警告: #faad14 / 错误: #f5222d / 信息: #0ea5e9（跟随主题）
 * - 间距基数: 4px
 */

import type { ThemeConfig } from 'antd';

// 天空蓝主色板（沿用 mintColors 导出名，避免破坏外部引用）
export const mintColors = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',
  600: '#0ea5e9', // 品牌主色
  700: '#0284c7', // active/深色
  800: '#075985',
  900: '#0c4a6e',
};

// 品牌渐变
export const mintGradient = {
  start: '#0284c7',
  end: '#38bdf8',
  css: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
};

// 功能色
export const semanticColors = {
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  info: '#0ea5e9', // 信息色跟随主题色
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

    // 明亮未来感基础界面
    colorBgLayout: '#f9fafb',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBorder: '#d1d5db',
    colorBorderSecondary: '#e5e7eb',

    // 字体
    fontFamily: mintFontStack,
    fontSize: 14,

    // 圆角
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,

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
    controlHeight: 44,
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
      primaryShadow: '0 2px 0 rgba(14, 165, 233, 0.1)',
      algorithm: true,
    },
    // 菜单组件
    Menu: {
      itemSelectedBg: mintColors[50],
      itemSelectedColor: mintColors[700],
      itemHoverBg: mintColors[50],
      itemBorderRadius: 12,
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
      borderRadiusLG: 16,
      headerBg: 'transparent',
    },
    // 表格（紧凑密度，参考 Element Plus / Naive UI）
    Table: {
      headerBg: '#f7f8fa',
      headerColor: '#475569',
      headerSplitColor: 'transparent',
      rowHoverBg: '#f0f9ff',
      borderColor: '#f1f5f9',
      cellFontSize: 13.5,
      cellPaddingBlock: 9,
      cellPaddingInline: 12,
      cellPaddingBlockSM: 6,
      cellPaddingInlineSM: 8,
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
