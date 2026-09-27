/**
 * 知识点掌握度全量重建脚本（P0 数据闭环兜底）
 *
 * 从历史作答（正式活动答卷 + 推荐练习）重建 student_knowledge_stats，
 * 替代种子脚本的静态数据，使智能推荐的薄弱知识点/能力值基于真实作答。
 *
 * 用法（在 backend 容器内）: node scripts/rebuild-knowledge-stats.js [studentId]
 */
const KnowledgeStatsService = require('../src/services/recommend/KnowledgeStatsService');

(async () => {
  const studentId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  try {
    const result = await KnowledgeStatsService.rebuildFromAnswers(studentId);
    console.log(`✓ 知识点统计重建完成：共 ${result.n} 行（student_id=${studentId || '全部'}）`);
    process.exit(0);
  } catch (error) {
    console.error('✗ 重建失败:', error.message);
    process.exit(1);
  }
})();
