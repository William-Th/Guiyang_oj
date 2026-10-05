import { AbilityStat, KnowledgeStat, getStudentAbilities, getStudentKnowledgePoints } from '../../../../services/growth';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

interface StatDisplay {
  name: string;
  subject: string;
  pct: number;
  levelClass: 'good' | 'mid' | 'weak';
  total_questions: number;
  correct_count: number;
}

/** accuracy_rate 为 0-1 小数（视图 numeric），按百分比上色：≥80 绿 / ≥60 橙 / <60 红 */
function toDisplay(nameKey: 'ability' | 'knowledge_point', rows: (AbilityStat | KnowledgeStat)[]): StatDisplay[] {
  return rows.map((r) => {
    const raw = parseFloat(String(r.accuracy_rate ?? 0));
    const ratio = raw <= 1 ? raw : raw / 100;
    const pct = Math.round(ratio * 100);
    const levelClass = pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'weak';
    const row = r as unknown as Record<string, unknown>;
    return {
      name: String(row[nameKey] ?? ''),
      subject: r.subject ?? '',
      pct,
      levelClass,
      total_questions: r.total_questions ?? 0,
      correct_count: r.correct_count ?? 0,
    };
  });
}

Page({
  data: {
    loading: true,
    abilities: [] as StatDisplay[],
    knowledge: [] as StatDisplay[],
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const [abilityRes, kpRes] = await Promise.all([
        getStudentAbilities().catch(() => null),
        getStudentKnowledgePoints().catch(() => null),
      ]);
      this.setData({
        abilities: toDisplay('ability', abilityRes?.data ?? []),
        knowledge: toDisplay('knowledge_point', kpRes?.data ?? []),
      });
    } catch (err) {
      toastError(err, '统计数据加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },
});
