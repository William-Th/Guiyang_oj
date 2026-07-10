import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { shopApi } from '../services/api';

/** 装备状态变更事件：装备/卸下后由商店页派发，通知所有 ColoredName 立即刷新 */
export const EQUIPMENT_CHANGED = 'equipment-changed';

/**
 * 获取当前学生装备的名字颜色（E2）
 * 名字颜色仅自己端可见，不影响他人查看。
 * 两种触发：① 路由切换（兜底）；② 装备/卸下后收到 EQUIPMENT_CHANGED 事件（即时，无需切页面）。
 * @returns color 装备中名字颜色的 hex，未装备返回 null
 */
export function useEquippedNameColor(): string | null {
  const [color, setColor] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const r = await shopApi.myItems();
        const items: any[] = r.data || [];
        const equipped = items.find((i) => i.is_equipped && i.category === 'name_color');
        if (mounted) {
          setColor(equipped && equipped.config?.color ? equipped.config.color : null);
        }
      } catch (e) {
        /* ignore */
      }
    };
    refresh();
    const handler = () => refresh();
    window.addEventListener(EQUIPMENT_CHANGED, handler);
    return () => {
      mounted = false;
      window.removeEventListener(EQUIPMENT_CHANGED, handler);
    };
  }, [location.pathname]);

  return color;
}

/**
 * 渲染带装备颜色的名字（仅自己端可见）
 */
export function ColoredName({ name, style }: { name: React.ReactNode; style?: React.CSSProperties }) {
  const color = useEquippedNameColor();
  return <span style={{ color: color || undefined, fontWeight: color ? 'bold' : undefined, ...style }}>{name}</span>;
}
