const { query } = require('../../database/connection');
const QuestionSimilarityService = require('../similarity/QuestionSimilarityService');

// 算法② 权重（统一，不按年级区分）
const W = {
  mastery: 0.35,    // 薄弱知识点优先
  zpd: 0.25,        // 难度匹配（最近发展区）
  spaced: 0.20,     // 错题间隔重复（SM-2 到期）
  novelty: 0.15,    // 近期未做过
  homogenize: 0.05  // 同质惩罚
};

const RECENT_DAYS = 7;        // 新鲜度：近 N 天做过视为不新鲜
const ZPD_LOW = 0.6;          // ZPD：期望正确率区间下限
const ZPD_HIGH = 0.85;        // ZPD：期望正确率区间上限
const REVIEW_RATIO = 0.30;    // 碎片化推荐中错题复习占比 ~30%（每日推题另管复习槽，不复用）
const JITTER = 0.03;          // 打分随机扰动幅度：同分附近题目换一批时随机变化（薄弱优先大方向不变）

/**
 * QuestionRecommender (算法② 碎片化学习推荐)
 *
 * Score(q) = α·mastery + β·zpd + γ·spacedRepetition + δ·novelty - ε·homogenizePenalty
 *  - mastery：题目知识点掌握度越低分越高（薄弱优先）
 *  - zpd：难度匹配学生该科目能力，目标正确率落在 [0.6, 0.85]（最近发展区）
 *  - spaced：错题按 SM-2 间隔重复，到期题高分
 *  - novelty：近期未做过
 *  - homogenize：与本批次已选同质则降权（复用算法①）
 */
class QuestionRecommender {
  /**
   * 获取学生某科目能力估计（平均正确率，0~1）
   */
  static async _getAbility(studentId, subject) {
    const r = await query(
      `SELECT AVG(accuracy_rate) AS ability
       FROM student_knowledge_stats
       WHERE student_id = $1 AND subject = $2 AND total_questions > 0`,
      [studentId, subject]
    );
    const v = r.rows[0] && r.rows[0].ability;
    return v == null ? 0.5 : Math.min(1, Math.max(0, parseFloat(v) / 100));
  }

  /**
   * SM-2 间隔重复：错题是否到期（基于上次答错时间 + 重做次数）
   * 返回 [0,1]，越接近/超过到期日越高
   */
  static _spacedScore(wrongRow, now) {
    if (!wrongRow || !wrongRow.last_wrong_at) return 0;
    const n = wrongRow.review_count || 0;          // 重做次数
    // SM-2 间隔(天)：I(0)=1, I(1)=3, I(n)=I(n-1)*2.5（简化）
    const interval = n === 0 ? 1 : (n === 1 ? 3 : Math.round(3 * Math.pow(2.5, n - 1)));
    const lastWrong = new Date(wrongRow.last_wrong_at).getTime();
    const elapsedDays = (now - lastWrong) / 86400000;
    if (elapsedDays >= interval) return 1;          // 到期/过期
    return Math.max(0, elapsedDays / interval);     // 接近到期程度
  }

  /**
   * Fisher-Yates 洗牌（返回新数组，不修改原数组）
   */
  static _shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * 取 SM-2 到期的客观题错题（碎片化推荐的复习槽）
   * 从"较到期"的错题池中随机采样（而非固定取 top N），避免每次换一批都返回相同错题
   * excludeQids：本会话已展示过的 question_id，换一批时排除以强制换内容
   */
  static async _getDueReviews(studentId, subject, limit, excludeQids = []) {
    const r = await query(
      `SELECT qb.id AS question_id, qb.draft_id, wq.review_count, wq.last_wrong_at,
              qd.content, qd.options, qd.difficulty, qd.type
       FROM student_wrong_questions wq
       JOIN question_bank qb ON wq.question_id = qb.id
       JOIN question_drafts qd ON qb.draft_id = qd.id
       WHERE wq.student_id = $1 AND wq.status = 'active'
         AND (wq.subject = $2 OR $2 IS NULL)
         AND qd.type IN ('single','multiple','true_false','blank')
         AND qd.is_active = true
       ORDER BY wq.last_wrong_at ASC
       LIMIT $3`,
      [studentId, subject || null, limit * 5]
    );
    const now = Date.now();
    const exSet = new Set(excludeQids);
    const pool = r.rows
      .filter((row) => !exSet.has(row.question_id))
      .map((row) => ({ ...row, dueScore: QuestionRecommender._spacedScore(row, now) }))
      .sort((a, b) => b.dueScore - a.dueScore);   // 到期优先
    // 从"较到期"的候选池内随机采样 → 错题较多时换一批错题也会变化
    const topPool = pool.slice(0, Math.max(limit * 2, limit));
    return QuestionRecommender._shuffle(topPool).slice(0, limit);
  }

  /**
   * ZPD 难度匹配分：用难度映射期望正确率，落在区间内最高
   */
  static _zpdScore(difficulty, ability) {
    // 难度→对该学生的期望正确率估计（能力越强，同难度越容易）
    const dMap = { easy: 0.85, medium: 0.65, hard: 0.4 };
    const base = dMap[difficulty] != null ? dMap[difficulty] : 0.65;
    const expected = Math.min(1, Math.max(0, base * (0.5 + ability)));
    // 落在 ZPD 区间 [0.6,0.85] 最高，偏离递减
    if (expected >= ZPD_LOW && expected <= ZPD_HIGH) return 1;
    if (expected < ZPD_LOW) return Math.max(0, expected / ZPD_LOW);
    return Math.max(0, (1 - expected) / (1 - ZPD_HIGH));
  }

  /**
   * 推荐 N 道题
   * @param {number} studentId
   * @param {Object} opts - { subject, grade, count, excludeDraftIds, includeReviews, excludeShownIds }
   * @param {boolean} opts.includeReviews - 是否混入 SM-2 到期错题复习槽（碎片化推荐用）
   * @param {number[]} opts.excludeShownIds - 本会话已展示过的 question_id（碎片化"换一批"传入，强制换内容）
   * @returns {Promise<Object>} { recommendations, meta }
   */
  static async recommend(studentId, opts = {}) {
    const subject = opts.subject;
    const count = opts.count || 10;
    const excludeDraftIds = opts.excludeDraftIds || [];
    const excludeShownIds = opts.excludeShownIds || [];
    const includeReviews = opts.includeReviews === true;
    const now = Date.now();
    const shownSet = new Set(excludeShownIds);

    // 学生年级
    const stu = await query(
      'SELECT s.grade FROM students s WHERE s.user_id = $1',
      [studentId]
    );
    const grade = opts.grade || (stu.rows[0] && stu.rows[0].grade);
    if (!subject || !grade) {
      return { recommendations: [], meta: { reason: '需要指定科目和年级' } };
    }

    // 能力估计
    const ability = await QuestionRecommender._getAbility(studentId, subject);

    // 掌握度 map：knowledge_point -> accuracy(0~1)
    const masteryRows = await query(
      `SELECT knowledge_point, accuracy_rate, total_questions
       FROM student_knowledge_stats
       WHERE student_id = $1 AND subject = $2`,
      [studentId, subject]
    );
    const mastery = {};
    masteryRows.rows.forEach((r) => {
      mastery[r.knowledge_point] = {
        accuracy: Math.min(1, parseFloat(r.accuracy_rate || 0) / 100),
        total: parseInt(r.total_questions, 10) || 0
      };
    });

    // 错题 map：draft_id -> wrongRow（用于 SM-2）
    const wrongRows = await query(
      `SELECT wq.* FROM student_wrong_questions wq
       JOIN question_bank qb ON wq.question_id = qb.id
       WHERE wq.student_id = $1 AND wq.subject = $2 AND wq.status = 'active'`,
      [studentId, subject]
    );
    const wrongMap = {};
    wrongRows.rows.forEach((r) => { wrongMap[r.draft_id] = r; });

    // 近期已做 draft_id 集合（新鲜度排除依据）
    const recentRows = await query(
      `SELECT DISTINCT qb.draft_id
       FROM answers a
       JOIN student_activities sa ON a.student_exam_id = sa.id
       JOIN question_bank qb ON a.question_id = qb.id
       JOIN activities act ON sa.activity_id = act.id
       WHERE sa.student_id = $1 AND act.subject = $2
         AND a.created_at >= CURRENT_DATE - INTERVAL '${parseInt(RECENT_DAYS, 10)} days'`,
      [studentId, subject]
    );
    const recentSet = new Set(recentRows.rows.map((r) => r.draft_id));

    // 已答对 draft_id 集合：答对过的题（推荐答题记录 + 正式活动 answers）不再推荐，
    // 避免重复推送已掌握的题目
    const correctRows = await query(
      `(SELECT qb.draft_id
         FROM student_question_practice sqp
         JOIN question_bank qb ON sqp.question_id = qb.id
        WHERE sqp.student_id = $1 AND sqp.is_correct = true)
       UNION
       (SELECT qb.draft_id
         FROM answers a
         JOIN student_activities sa ON a.student_exam_id = sa.id
         JOIN question_bank qb ON a.question_id = qb.id
        WHERE sa.student_id = $1 AND a.is_correct = true)`,
      [studentId]
    );
    const correctSet = new Set(correctRows.rows.map((r) => r.draft_id));

    // 候选池查询：gradeFilter 传 null 时取同科目全年级（用于候选不足时的兜底回退）
    const fetchCand = async (gradeFilter) => {
      const sql = `SELECT qb.id AS question_id, qb.draft_id, qd.difficulty, qd.grade,
              qd.knowledge_points, qd.content, qd.options, qd.type
       FROM question_bank qb
       JOIN question_drafts qd ON qb.draft_id = qd.id
       WHERE qb.status = 'published' AND qb.is_active = true
         AND (qb.is_hidden = false OR qb.is_hidden IS NULL)
         AND qd.subject = $1 AND qd.is_active = true
         AND qd.type IN ('single','multiple','true_false','blank')
         ${gradeFilter ? 'AND qd.grade = $2' : ''}
       LIMIT 500`;
      const r = await query(sql, gradeFilter ? [subject, gradeFilter] : [subject]);
      return r.rows;
    };

    // 同质去重选择器（复习槽优先 → 新题补充），selected 跨重试复用前需清空
    const selected = [];
    const selectedDrafts = [];
    const pickItem = async (item) => {
      if (selected.length >= count) return false;
      if (selectedDrafts.length > 0 && item.draft_id != null) {
        const homo = await QuestionSimilarityService.checkHomogeneity(
          item.draft_id, selectedDrafts
        );
        if (homo.level !== 'none') return false;  // 同质跳过
      }
      selected.push(item);
      if (item.draft_id != null) selectedDrafts.push(item.draft_id);
      return true;
    };

    let sameGradeCandTotal = 0;  // 同年级客观题候选总数（meta 上报）

    /**
     * 一次完整选择流程（抽出便于"shown 排除致空"时清空 shown 重试）
     * - 复习槽(随机采样) → 同年级新题(打分+扰动) → 同年级不足时同科目全年级兜底补足
     */
    const selectWith = async (shown) => {
      const sSet = new Set(shown);
      const localExclude = excludeDraftIds.slice();  // 复习 draft 推到这里，不污染外部

      // 打分单题：返回评分项或 null（已答对 / 调用方排除 / 本会话已展示）
      // _sortScore 含小随机扰动(JITTER)，让候选充足时换一批有真实变化；score 字段保留原始值供前端展示
      const scoreOne = (q) => {
        if (localExclude.includes(q.draft_id)) return null;
        if (correctSet.has(q.draft_id)) return null;
        if (sSet.has(q.question_id)) return null;
        const kps = Array.isArray(q.knowledge_points) ? q.knowledge_points : [];
        let masteryScore = 0.5;
        if (kps.length > 0) {
          const accs = kps.map((kp) => (mastery[kp] ? mastery[kp].accuracy : 0.5));
          masteryScore = 1 - Math.min(...accs);  // 越薄弱越高
        }
        const zpdScore = QuestionRecommender._zpdScore(q.difficulty, ability);
        const wrongRow = wrongMap[q.draft_id];
        const spacedScore = wrongRow ? QuestionRecommender._spacedScore(wrongRow, now) : 0;
        const noveltyScore = recentSet.has(q.draft_id) ? 0 : 1;
        const rawScore = W.mastery * masteryScore
          + W.zpd * zpdScore
          + W.spaced * spacedScore
          + W.novelty * noveltyScore;
        return {
          question_id: q.question_id,
          draft_id: q.draft_id,
          difficulty: q.difficulty,
          content: q.content ? String(q.content) : '',
          options: q.options || null,
          type: q.type,
          score: Number(rawScore.toFixed(4)),
          _sortScore: rawScore + Math.random() * JITTER,
          factors: {
            mastery: Number(masteryScore.toFixed(3)),
            zpd: Number(zpdScore.toFixed(3)),
            spaced: Number(spacedScore.toFixed(3)),
            novelty: noveltyScore
          }
        };
      };

      // 错题复习槽（仅 includeReviews；每日推题自行管理复习槽，不复用）
      let reviewItems = [];
      if (includeReviews) {
        const reviewCount = Math.round(count * REVIEW_RATIO);
        if (reviewCount > 0) {
          const dueReviews = await QuestionRecommender._getDueReviews(studentId, subject, reviewCount, [...sSet]);
          reviewItems = dueReviews.map((r) => ({
            question_id: r.question_id,
            draft_id: r.draft_id,
            difficulty: r.difficulty,
            content: r.content ? String(r.content) : '',
            options: r.options || null,
            type: r.type,
            score: Number((r.dueScore || 0).toFixed(4)),
            _sortScore: (r.dueScore || 0) + Math.random() * JITTER,
            factors: { review: true, dueScore: Number((r.dueScore || 0).toFixed(3)) }
          }));
          // 新题排除这些错题 draft，避免重复推送
          reviewItems.forEach((rv) => {
            if (rv.draft_id != null && !localExclude.includes(rv.draft_id)) {
              localExclude.push(rv.draft_id);
            }
          });
        }
      }

      // 1) 复习槽优先放入（含同质去重）
      for (const rv of reviewItems) {
        await pickItem(rv);
      }
      // 2) 同年级新题（打分 + 扰动排序 + 同质去重）
      const sgRows = await fetchCand(grade);
      sameGradeCandTotal = Math.max(sameGradeCandTotal, sgRows.length);
      const sameGrade = sgRows.map(scoreOne).filter(Boolean)
        .sort((a, b) => b._sortScore - a._sortScore);
      for (const cand of sameGrade) {
        if (selected.length >= count) break;
        await pickItem(cand);
      }
      // 3) 同年级不足 → 回退同科目其他年级补足（应对题库偏小；同年级已在上一阶段处理）
      if (selected.length < count) {
        const seenDrafts = new Set(selectedDrafts);
        const backfill = (await fetchCand(null))
          .filter((q) => q.grade !== grade)
          .map(scoreOne).filter(Boolean)
          .filter((s) => s.draft_id == null || !seenDrafts.has(s.draft_id))
          .sort((a, b) => b._sortScore - a._sortScore);
        for (const cand of backfill) {
          if (selected.length >= count) break;
          await pickItem(cand);
        }
      }
    };

    await selectWith([...shownSet]);
    // 兜底：若 shown 排除导致几乎没选出题，清空 shown 重试，保证总有题可推
    if (selected.length === 0 && shownSet.size > 0) {
      selected.length = 0;
      selectedDrafts.length = 0;
      await selectWith([]);
    }

    // 清理内部排序字段（不返回给前端）
    selected.forEach((s) => { delete s._sortScore; });

    const reviewReturned = selected.filter((s) => s.factors && s.factors.review).length;
    return {
      recommendations: selected,
      meta: {
        subject, grade, ability: Number(ability.toFixed(3)),
        candidateCount: sameGradeCandTotal,
        returned: selected.length,
        reviewCount: reviewReturned
      }
    };
  }
}

QuestionRecommender.WEIGHTS = W;
module.exports = QuestionRecommender;
