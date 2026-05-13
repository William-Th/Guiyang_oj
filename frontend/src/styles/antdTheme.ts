/**
 * Ant Design 5 主题配置（薄荷品牌）
 *
 * 单一来源：所有薄荷 token 来自 @/styles/tokens。
 * 修改 src/styles/tokens/*.json 后此处自动同步。
 *
 * 文档：https://ant-design.antgroup.com/docs/react/customize-theme-cn
 */

import type { ThemeConfig } from 'antd';
import { colors, typography } from './tokens';

const mint = colors.brand.mint;
const neutral = colors.neutral;
const semantic = colors.semantic;

const antdTheme: ThemeConfig = {
  token: {
    // === 品牌色 ===
    colorPrimary: mint['600'],            // #16a34a
    colorPrimaryHover: mint['700'],       // #15803d
    colorPrimaryActive: mint['800'],
    colorPrimaryBg: mint['50'],
    colorPrimaryBgHover: mint['100'],
    colorLink: mint['600'],
    colorLinkHover: mint['700'],
    colorLinkActive: mint['800'],

    // === 状态色（来自薄荷 semantic）===
    colorSuccess: semantic.success,       // #22c55e
    colorWarning: semantic.warning,       // #f59e0b
    colorError: semantic.error,           // #ef4444
    colorInfo: semantic.info,             // #3b82f6

    // === 中性色（来自薄荷 neutral）===
    colorText: colors.alias['body-text'],         // #1a1a1a 正文
    colorTextSecondary: neutral['600'],           // #4b5563 次要
    colorTextTertiary: neutral['500'],            // #6b7280 弱化
    colorTextQuaternary: neutral['400'],          // #9ca3af
    colorBorder: neutral['200'],                  // #e5e7eb
    colorBorderSecondary: neutral['100'],         // #f3f4f6
    colorBgLayout: neutral['50'],                 // #f9fafb 页面背景
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',

    // === 字体 ===
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 18,
    fontSizeHeading1: 36,
    fontSizeHeading2: 30,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    lineHeight: 1.5,
    lineHeightHeading1: 1.25,
    lineHeightHeading2: 1.25,

    // === 圆角 ===
    borderRadius: 8,
    borderRadiusLG: 16,                   // card.borderRadius
    borderRadiusSM: 4,

    // === 阴影（柔和品牌阴影）===
    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
    boxShadowSecondary: '0 4px 12px rgba(22,163,74,0.08)',

    // === 触摸目标 ===
    controlHeight: 36,                    // 默认
    controlHeightLG: 44,                  // 大号符合 44px 最小触摸目标
    controlHeightSM: 28
  },

  components: {
    Button: {
      // 主按钮统一用 44px（符合薄荷 button.minHeight）
      controlHeightLG: 44,
      controlHeight: 36,
      borderRadius: 8,
      fontWeight: 500
    },
    Card: {
      borderRadiusLG: 16,                 // 来自 spacing.components.card.borderRadius
      paddingLG: 24
    },
    Menu: {
      itemHoverColor: mint['600'],
      itemSelectedColor: mint['700'],
      itemSelectedBg: mint['50'],
      horizontalItemSelectedColor: mint['600']
    },
    Tabs: {
      itemSelectedColor: mint['600'],
      itemHoverColor: mint['700'],
      inkBarColor: mint['600']
    },
    Tag: {
      defaultBg: neutral['100'],
      defaultColor: neutral['700']
    },
    Layout: {
      headerBg: mint['600'],              // 顶部 Header 用品牌主色（替换默认 #1677ff）
      headerColor: '#ffffff',
      bodyBg: neutral['50'],
      footerBg: neutral['50']
    }
  }
};

export default antdTheme;
