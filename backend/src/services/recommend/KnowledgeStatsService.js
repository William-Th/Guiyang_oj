const { query } = require('../../database/connection');

/**
 * KnowledgeStatsService — 知识点掌握度数据闭环 (P0)
 *
 * 背景：student_knowledge_stats 是智能推荐（算法②/③）掌握度与能力值的数据源，
 * 但此前只有种子脚本写入、运行时无任何更新——推荐算法的最大权重项永远基于静态数据。
 *
 * 本服务把真实作答结果回流到该表：
 *  - applyAnswerResult：单题作答后按题目的知识点增量 upsert（推荐作答/活动判分两处调用）
 *  - rebuildFromAnswers：从历史答卷全量重建（兜底/初始化，scripts/rebuild-knowledge-stats.js 调用）
 *
 * 依赖唯一索引 ux_student_knowledge_stats(student_id, knowledge_point)（ensure-db-support.js 幂等创建）。
 */
class KnowledgeStatsService {
  /**
   * 单题作答结果回流
   * @param {number} studentId
   * @param {{knowledgePoints?: string[], subject?: string|null}} question - 题目知识点与科目
   * @param {boolean} isCorrect
   */
  static async applyAnswerResult(studentId, question, isCorrect) {
    try {
      const kps = Array.isArray(question?.knowledgePoints)
        ? question.knowledgePoints.filter((k) => k != null && String(k).trim() !== '')
        : [];
      if (kps.length === 0 || !question?.subject) return;

      for (const kp of kps) {
        await query(
          `INSERT INTO student_knowledge_stats
             (student_id, knowledge_point, subject, total_questions, correct_count,
              accuracy_rate, last_updated_at)
           VALUES ($1, $2, $3, 1, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (student_id, knowledge_point) DO UPDATE SET
             total_questions = student_knowledge_stats.total_questions + 1,
             correct_count = student_knowledge_stats.correct_count + $4,
             accuracy_rate = ROUND(
               (student_knowledge_stats.correct_count + $4)::numeric * 100
               / (student_knowledge_stats.total_questions + 1), 2),
             last_updated_at = CURRENT_TIMESTAMP`,
          [studentId, String(kp), question.subject, isCorrect ? 1 : 0, isCorrect ? 100 : 0]
        );
      }
    } catch (error) {
      // 统计回流失败不阻断答题主流程
      require('../utils/logger').warn('Knowledge stats update failed:', error.message);
    }
  }

  /**
   * 从历史作答全量重建某学生（或全部学生）的知识点统计。
   * 数据源：正式活动答卷 answers（含 is_correct）+ 推荐练习 student_question_practice。
   */
  static async rebuildFromAnswers(studentId = null) {
    // 保障唯一索引（幂等）：ON CONFLICT 依赖它
    await query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_student_knowledge_stats
         ON student_knowledge_stats (student_id, knowledge_point)`
    );

    const filter = studentId ? 'WHERE agg.student_id = $1' : '';
    const params = studentId ? [studentId] : [];

    await query(
      `WITH per_kp AS (
         SELECT sa.student_id, qd.subject, kp AS knowledge_point,
                COUNT(*) AS total,
                SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) AS correct
         FROM answers a
         JOIN student_activities sa ON sa.id = a.student_exam_id
         JOIN activities act ON act.id = sa.activity_id
         JOIN question_bank qb ON qb.id = a.question_id
         JOIN question_drafts qd ON qd.id = qb.draft_id
         CROSS JOIN LATERAL unnest(COALESCE(qd.knowledge_points, '{}')) AS kp
         WHERE a.is_correct IS NOT NULL AND qd.subject IS NOT NULL
         GROUP BY sa.student_id, qd.subject, kp
         UNION ALL
         SELECT sqp.student_id, sqp.subject, kp AS knowledge_point,
                COUNT(*) AS total,
                SUM(CASE WHEN sqp.is_correct THEN 1 ELSE 0 END) AS correct
         FROM student_question_practice sqp
         JOIN question_drafts qd ON qd.id = sqp.draft_id
         CROSS JOIN LATERAL unnest(COALESCE(qd.knowledge_points, '{}')) AS kp
         WHERE sqp.draft_id IS NOT NULL AND qd.subject IS NOT NULL
         GROUP BY sqp.student_id, sqp.subject, kp
       ), agg AS (
         SELECT student_id, knowledge_point, subject,
                SUM(total) AS total, SUM(correct) AS correct
         FROM per_kp
         GROUP BY student_id, knowledge_point, subject
       )
       INSERT INTO student_knowledge_stats
         (student_id, knowledge_point, subject, total_questions, correct_count,
          accuracy_rate, last_updated_at)
       SELECT student_id, knowledge_point, subject, total, correct,
              ROUND(correct::numeric * 100 / total, 2), CURRENT_TIMESTAMP
       FROM agg ${filter}
       ON CONFLICT (student_id, knowledge_point) DO UPDATE SET
         subject = EXCLUDED.subject,
         total_questions = EXCLUDED.total_questions,
         correct_count = EXCLUDED.correct_count,
         accuracy_rate = EXCLUDED.accuracy_rate,
         last_updated_at = CURRENT_TIMESTAMP`,
      params
    );

    // 清理无作答数据的陈旧行（如种子演示数据被清空后残留）
    await query(
      `DELETE FROM student_knowledge_stats s
       WHERE NOT EXISTS (
         SELECT 1 FROM answers a
         JOIN student_activities sa ON sa.id = a.student_exam_id
         JOIN question_bank qb ON qb.id = a.question_id
         JOIN question_drafts qd ON qd.id = qb.draft_id
         WHERE sa.student_id = s.student_id AND qd.subject = s.subject
           AND s.knowledge_point = ANY(COALESCE(qd.knowledge_points, '{}'))
       )
       AND NOT EXISTS (
         SELECT 1 FROM student_question_practice p
         JOIN question_drafts qd ON qd.id = p.draft_id
         WHERE p.student_id = s.student_id AND qd.subject = s.subject
           AND s.knowledge_point = ANY(COALESCE(qd.knowledge_points, '{}'))
       )`
    );

    const r = await query(
      `SELECT COUNT(*) AS n FROM student_knowledge_stats ${studentId ? 'WHERE student_id = $1' : ''}`,
      params
    );
    return r.rows[0];
  }
}

module.exports = KnowledgeStatsService;
