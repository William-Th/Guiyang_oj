/**
 * 薄荷设计系统 Tokens（TypeScript 入口）
 *
 * 单一来源：从 bohe-brain/设计系统/tokens/*.json 复制而来，
 * 修改 JSON 即可同步影响 AntD 主题、内联样式、CSS 变量。
 *
 * 使用方式：
 *   import { colors, spacing, typography } from '@/styles/tokens';
 *   <div style={{ color: colors.brand.mint['600'] }}>...</div>
 */

import colorsJson from './colors.json';
import typographyJson from './typography.json';
import spacingJson from './spacing.json';

export const colors = colorsJson;
export const typography = typographyJson;
export const spacing = spacingJson;

// 便捷别名（频繁使用的）
export const brandColors = {
  primary: colors.alias.primary,         // #16a34a 薄荷绿
  primaryDark: colors.alias['primary-dark'],  // #15803d
  primaryLight: colors.alias['primary-light'], // #dcfce7
  bodyText: colors.alias['body-text'],   // #1a1a1a
  // logo 渐变
  logoGradient: `linear-gradient(135deg, ${colors.brand.logo['gradient-from']} 0%, ${colors.brand.logo['gradient-to']} 100%)`
};

export const semanticColors = colors.semantic;
export const neutralColors = colors.neutral;
export const mintColors = colors.brand.mint;
