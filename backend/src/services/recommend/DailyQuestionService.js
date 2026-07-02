const { query } = require('../../database/connection');
const QuestionRecommender = require('./QuestionRecommender');
const QuestionSimilarityService = require('../similarity/QuestionSimilarityService');

const DAILY_COUNT = 10;
const REVIEW_RATIO = 0.35;   // 错题复习占比 ~35%

/**
 * DailyQuestionService (D3 每日推题，算法③)
 *
 * 每日 N 题 = 错题复习(SM-2 到期，~35%) + 弱项/难度匹配新题(剩余，复用算法②)
 * 约束：批次内同质去重（复用算法①）；当日生成缓存，不重复推。
 */
class DailyQuestionService {
  /**
   * 取 SM-2 到期的错题（复习槽）
   */
  static async _getDueReviews(studentId, subject, limit) {
    const r = await query(
      `SELECT qb.id AS question_id, qb.draft_id, wq.review_count, wq.last_wrong_at,
              qd.content, qd.difficulty, qd.type
       FROM student_wrong_questions wq
       JOIN question_bank qb ON wq.question_id = qb.id
       JOIN question_drafts qd ON qb.draft_id = qd.id
       WHERE wq.student_id = $1 AND wq.status = 'active'
         AND (wq.subject = $2 OR $2 IS NULL)
         AND qd.type IN ('single','multiple','true_false','blank')
       ORDER BY wq.last_wrong_at ASC
       LIMIT $3`,
      [studentId, subject || null, limit * 3]
    );
    const now = Date.now();
    // 按 SM-2 到期程度排序
    const scored = r.rows.map((row) => ({
      ...row,
      dueScore: QuestionRecommender._spacedScore(row, now)
    })).sort((a, b) => b.dueScore - a.dueScore);
    return scored.slice(0, limit);
  }

  /**
   * 为学生生成某科目每日题集（算法③）
   */
  static async generateForStudent(studentId, subject, count = DAILY_COUNT) {
    const reviewCount = Math.round(count * REVIEW_RATIO);
    const newCount = count - reviewCount;

    // 槽1：错题复习
    const reviews = await DailyQuestionService._getDueReviews(studentId, subject, reviewCount);
    const excludeDrafts = reviews.map((r) => r.draft_id);

    // 槽2：弱项/难度匹配新题（复用算法②）
    const recResult = await QuestionRecommender.recommend(studentId, {
      subject, count: newCount + 5, excludeDraftIds: excludeDrafts
    });
    const newOnes = recResult.recommendations.slice(0, newCount);

    // 合并 + 同质去重
    const merged = [
      ...reviews.map((r) => ({
        question_id: r.question_id, draft_id: r.draft_id, slot: 'review',
        difficulty: r.difficulty, type: r.type
      })),
      ...newOnes.map((r) => ({
        question_id: r.question_id, draft_id: r.draft_id, slot: 'new',
        difficulty: r.difficulty, type: r.type
      }))
    ];

    // 批次内同质去重
    const finalQids = [];
    const selectedDrafts = [];
    for (const item of merged) {
      if (finalQids.length >= count) break;
      if (selectedDrafts.length > 0 && item.draft_id) {
        const homo = await QuestionSimilarityService.checkHomogeneity(
          item.draft_id, selectedDrafts
        );
        if (homo.level !== 'none') continue;
      }
      finalQids.push(item.question_id);
      if (item.draft_id) selectedDrafts.push(item.draft_id);
    }

    // 缓存到 daily_question_sets（upsert）
    await query(
      `INSERT INTO daily_question_sets (student_id, stat_date, subject, question_ids)
       VALUES ($1, CURRENT_DATE, $2, $3)
       ON CONFLICT (student_id, stat_date, subject) DO UPDATE SET
         question_ids = EXCLUDED.question_ids,
         created_at = CURRENT_TIMESTAMP`,
      [studentId, subject || null, finalQids]
    );

    return { question_ids: finalQids, reviewCount: reviews.length, newCount: newOnes.length };
  }

  /**
   * 获取今日题集（无则即时生成），并附加题目详情供前端展示与作答
   * 注：不返回 correct_answer/explanation，避免答案泄露；判对错走推荐答题接口
   */
  static async getToday(studentId, subject) {
    const fetchRow = async () => {
      const r = await query(
        `SELECT * FROM daily_question_sets
         WHERE student_id = $1 AND stat_date = CURRENT_DATE AND subject IS NOT DISTINCT FROM $2`,
        [studentId, subject || null]
      );
      return r.rows[0] || null;
    };

    let row = await fetchRow();
    if (!row) {
      // 即时生成
      await DailyQuestionService.generateForStudent(studentId, subject);
      row = await fetchRow();
    }
    if (!row || !Array.isArray(row.question_ids) || row.question_ids.length === 0) {
      return row;
    }

    // 附加题目详情，按 question_ids 原顺序排列（仅客观题，防御旧缓存含非客观题）
    const det = await query(
      `SELECT qb.id AS question_id, qb.draft_id, qd.content, qd.options, qd.type, qd.difficulty
       FROM question_bank qb
       JOIN question_drafts qd ON qb.draft_id = qd.id
       WHERE qb.id = ANY($1::int[]) AND qd.is_active = true
         AND qd.type IN ('single','multiple','true_false','blank')`,
      [row.question_ids]
    );
    const map = {};
    det.rows.forEach((d) => { map[d.question_id] = d; });
    row.questions = row.question_ids
      .map((qid) => map[qid])
      .filter(Boolean);
    return row;
  }

  /**
   * 预热：为近期活跃学生生成今日题集（cron 调用）
   * 范围限制：近 14 天有答题记录的学生，避免全量计算
   */
  static async warmupRecentStudents() {
    const r = await query(
      `SELECT DISTINCT sa.student_id, act.subject
       FROM student_activities sa
       JOIN activities act ON sa.activity_id = act.id
       WHERE sa.submit_time >= CURRENT_DATE - INTERVAL '14 days'
         AND act.subject IS NOT NULL
       LIMIT 500`
    );
    let count = 0;
    for (const row of r.rows) {
      try {
        await DailyQuestionService.generateForStudent(row.student_id, row.subject);
        count += 1;
      } catch (e) {
        // 单个学生失败不影响整体
      }
    }
    return count;
  }
}

module.exports = DailyQuestionService;
