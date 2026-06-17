import { useEffect, useState } from 'react';
import { shopApi } from '../services/api';

/**
 * 获取当前学生装备的名字颜色（E2）
 * 名字颜色仅自己端可见，不影响他人查看。
 * @returns color 装备中名字颜色的 hex，未装备返回 null
 */
export function useEquippedNameColor(): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await shopApi.myItems();
        const items: any[] = r.data || [];
        const equipped = items.find((i) => i.is_equipped && i.category === 'name_color');
        if (mounted && equipped && equipped.config?.color) {
          setColor(equipped.config.color);
        }
      } catch (e) {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return color;
}

/**
 * 渲染带装备颜色的名字（仅自己端可见）
 */
export function ColoredName({ name, style }: { name: React.ReactNode; style?: React.CSSProperties }) {
  const color = useEquippedNameColor();
  return <span style={{ color: color || undefined, fontWeight: color ? 'bold' : undefined, ...style }}>{name}</span>;
}
