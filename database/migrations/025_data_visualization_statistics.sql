-- =====================================================
-- Migration 025: Data Visualization Statistics Tables
-- 数据可视化统计表和视图
-- 创建日期: 2025-11-23
-- 描述: 为学生端和教师端数据展示功能创建统计表和视图
-- =====================================================

-- =====================================================
-- 1. 学生能力统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS student_ability_stats (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_ability UNIQUE(student_id, ability, subject)
);

COMMENT ON TABLE student_ability_stats IS '学生能力统计表 - 记录每个学生在各能力维度上的表现';
COMMENT ON COLUMN student_ability_stats.student_id IS '学生用户ID';
COMMENT ON COLUMN student_ability_stats.ability IS '能力标签';
COMMENT ON COLUMN student_ability_stats.subject IS '科目';
COMMENT ON COLUMN student_ability_stats.total_questions IS '总题数';
COMMENT ON COLUMN student_ability_stats.correct_count IS '正确题数';
COMMENT ON COLUMN student_ability_stats.accuracy_rate IS '正确率(%)';
COMMENT ON COLUMN student_ability_stats.avg_score IS '平均得分';

CREATE INDEX idx_student_ability_stats_student_id ON student_ability_stats(student_id);
CREATE INDEX idx_student_ability_stats_subject ON student_ability_stats(subject);
CREATE INDEX idx_student_ability_stats_ability ON student_ability_stats(ability);
CREATE INDEX idx_student_ability_stats_accuracy ON student_ability_stats(accuracy_rate DESC);

-- =====================================================
-- 2. 学生知识点统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS student_knowledge_stats (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  knowledge_point VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_knowledge UNIQUE(student_id, knowledge_point, subject)
);

COMMENT ON TABLE student_knowledge_stats IS '学生知识点统计表 - 记录每个学生在各知识点上的掌握情况';
COMMENT ON COLUMN student_knowledge_stats.student_id IS '学生用户ID';
COMMENT ON COLUMN student_knowledge_stats.knowledge_point IS '知识点标签';
COMMENT ON COLUMN student_knowledge_stats.subject IS '科目';
COMMENT ON COLUMN student_knowledge_stats.total_questions IS '总题数';
COMMENT ON COLUMN student_knowledge_stats.correct_count IS '正确题数';
COMMENT ON COLUMN student_knowledge_stats.accuracy_rate IS '正确率(%)';
COMMENT ON COLUMN student_knowledge_stats.avg_score IS '平均得分';

CREATE INDEX idx_student_knowledge_stats_student_id ON student_knowledge_stats(student_id);
CREATE INDEX idx_student_knowledge_stats_subject ON student_knowledge_stats(subject);
CREATE INDEX idx_student_knowledge_stats_knowledge ON student_knowledge_stats(knowledge_point);
CREATE INDEX idx_student_knowledge_stats_accuracy ON student_knowledge_stats(accuracy_rate DESC);

-- =====================================================
-- 3. 学校能力统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS school_ability_stats (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  student_count INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_school_ability_period UNIQUE(school_id, ability, subject, period_start, period_end)
);

COMMENT ON TABLE school_ability_stats IS '学校能力统计表 - 记录学校在各能力维度上的整体表现';
COMMENT ON COLUMN school_ability_stats.school_id IS '学校ID';
COMMENT ON COLUMN school_ability_stats.ability IS '能力标签';
COMMENT ON COLUMN school_ability_stats.subject IS '科目';
COMMENT ON COLUMN school_ability_stats.student_count IS '参与学生数';
COMMENT ON COLUMN school_ability_stats.total_attempts IS '总答题次数';
COMMENT ON COLUMN school_ability_stats.correct_count IS '正确次数';
COMMENT ON COLUMN school_ability_stats.accuracy_rate IS '正确率(%)';
COMMENT ON COLUMN school_ability_stats.avg_score IS '平均得分';
COMMENT ON COLUMN school_ability_stats.period_start IS '统计周期开始日期';
COMMENT ON COLUMN school_ability_stats.period_end IS '统计周期结束日期';

CREATE INDEX idx_school_ability_stats_school_id ON school_ability_stats(school_id);
CREATE INDEX idx_school_ability_stats_subject ON school_ability_stats(subject);
CREATE INDEX idx_school_ability_stats_ability ON school_ability_stats(ability);
CREATE INDEX idx_school_ability_stats_period ON school_ability_stats(period_start, period_end);
CREATE INDEX idx_school_ability_stats_accuracy ON school_ability_stats(accuracy_rate DESC);

-- =====================================================
-- 4. 区域能力统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS district_ability_stats (
  id SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  school_count INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_district_ability_period UNIQUE(district_id, ability, subject, period_start, period_end)
);

COMMENT ON TABLE district_ability_stats IS '区域能力统计表 - 记录区域在各能力维度上的整体表现';
COMMENT ON COLUMN district_ability_stats.district_id IS '区县ID';
COMMENT ON COLUMN district_ability_stats.ability IS '能力标签';
COMMENT ON COLUMN district_ability_stats.subject IS '科目';
COMMENT ON COLUMN district_ability_stats.school_count IS '参与学校数';
COMMENT ON COLUMN district_ability_stats.student_count IS '参与学生数';
COMMENT ON COLUMN district_ability_stats.total_attempts IS '总答题次数';
COMMENT ON COLUMN district_ability_stats.correct_count IS '正确次数';
COMMENT ON COLUMN district_ability_stats.accuracy_rate IS '正确率(%)';
COMMENT ON COLUMN district_ability_stats.avg_score IS '平均得分';
COMMENT ON COLUMN district_ability_stats.period_start IS '统计周期开始日期';
COMMENT ON COLUMN district_ability_stats.period_end IS '统计周期结束日期';

CREATE INDEX idx_district_ability_stats_district_id ON district_ability_stats(district_id);
CREATE INDEX idx_district_ability_stats_subject ON district_ability_stats(subject);
CREATE INDEX idx_district_ability_stats_ability ON district_ability_stats(ability);
CREATE INDEX idx_district_ability_stats_period ON district_ability_stats(period_start, period_end);
CREATE INDEX idx_district_ability_stats_accuracy ON district_ability_stats(accuracy_rate DESC);

-- =====================================================
-- 5. 学生能力实时统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_student_ability_realtime AS
SELECT
  sa.student_id,
  unnest(qd.abilities) as ability,
  qd.subject,
  COUNT(*) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.abilities IS NOT NULL
  AND array_length(qd.abilities, 1) > 0
GROUP BY sa.student_id, ability, qd.subject;

COMMENT ON VIEW v_student_ability_realtime IS '学生能力实时统计视图 - 基于最新答题记录实时计算';

-- =====================================================
-- 6. 学生知识点实时统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_student_knowledge_realtime AS
SELECT
  sa.student_id,
  unnest(qd.knowledge_points) as knowledge_point,
  qd.subject,
  COUNT(*) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.knowledge_points IS NOT NULL
  AND array_length(qd.knowledge_points, 1) > 0
GROUP BY sa.student_id, knowledge_point, qd.subject;

COMMENT ON VIEW v_student_knowledge_realtime IS '学生知识点实时统计视图 - 基于最新答题记录实时计算';

-- =====================================================
-- 7. 学生学习概况视图
-- =====================================================
CREATE OR REPLACE VIEW v_student_learning_overview AS
SELECT
  sa.student_id,
  COUNT(DISTINCT sa.activity_id) as total_activities,
  COUNT(DISTINCT CASE WHEN sa.status IN ('submitted', 'graded') THEN sa.activity_id END) as completed_activities,
  ROUND(AVG(CASE WHEN sa.status IN ('submitted', 'graded') THEN sa.score END), 2) as avg_score,
  SUM(EXTRACT(EPOCH FROM (sa.submit_time - sa.start_time))) as total_study_seconds,
  MAX(sa.submit_time) as last_activity_time,
  MIN(sa.created_at) as first_activity_time
FROM student_activities sa
GROUP BY sa.student_id;

COMMENT ON VIEW v_student_learning_overview IS '学生学习概况视图 - 整体学习统计';

-- =====================================================
-- 8. 学校能力实时统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_school_ability_realtime AS
SELECT
  s.school_id,
  s.grade,
  unnest(qd.abilities) as ability,
  qd.subject,
  COUNT(DISTINCT sa.student_id) as student_count,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN students s ON sa.student_id = s.user_id
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.abilities IS NOT NULL
  AND array_length(qd.abilities, 1) > 0
  AND s.school_id IS NOT NULL
GROUP BY s.school_id, s.grade, ability, qd.subject;

COMMENT ON VIEW v_school_ability_realtime IS '学校能力实时统计视图 - 基于学校学生的答题记录';

-- =====================================================
-- 9. 区域能力实时统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_district_ability_realtime AS
SELECT
  sch.district_id,
  s.grade,
  unnest(qd.abilities) as ability,
  qd.subject,
  COUNT(DISTINCT s.school_id) as school_count,
  COUNT(DISTINCT sa.student_id) as student_count,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN students s ON sa.student_id = s.user_id
JOIN schools sch ON s.school_id = sch.id
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.abilities IS NOT NULL
  AND array_length(qd.abilities, 1) > 0
  AND sch.district_id IS NOT NULL
GROUP BY sch.district_id, s.grade, ability, qd.subject;

COMMENT ON VIEW v_district_ability_realtime IS '区域能力实时统计视图 - 基于区域所有学校学生的答题记录';

-- =====================================================
-- 10. 触发器函数：更新学生能力统计
-- =====================================================
CREATE OR REPLACE FUNCTION update_student_ability_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id INTEGER;
  v_abilities TEXT[];
  v_subject VARCHAR(50);
  v_ability TEXT;
BEGIN
  -- 获取学生ID和题目信息
  SELECT sa.student_id INTO v_student_id
  FROM student_activities sa
  WHERE sa.id = NEW.student_exam_id;

  -- 获取题目的能力和科目
  SELECT qd.abilities, qd.subject INTO v_abilities, v_subject
  FROM question_bank qb
  JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qb.id = NEW.question_id;

  -- 如果有能力标签，更新统计
  IF v_abilities IS NOT NULL AND array_length(v_abilities, 1) > 0 THEN
    FOREACH v_ability IN ARRAY v_abilities LOOP
      -- 使用 UPSERT 更新或插入统计数据
      INSERT INTO student_ability_stats (
        student_id, ability, subject,
        total_questions, correct_count, accuracy_rate, avg_score, last_updated_at
      )
      SELECT
        v_student_id,
        v_ability,
        v_subject,
        COUNT(*),
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END),
        ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 2),
        ROUND(AVG(score), 2),
        CURRENT_TIMESTAMP
      FROM (
        SELECT a.is_correct, a.score
        FROM answers a
        JOIN student_activities sa ON a.student_exam_id = sa.id
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN question_drafts qd ON qb.draft_id = qd.id
        WHERE sa.student_id = v_student_id
          AND v_ability = ANY(qd.abilities)
          AND qd.subject = v_subject
      ) subq
      ON CONFLICT (student_id, ability, subject)
      DO UPDATE SET
        total_questions = EXCLUDED.total_questions,
        correct_count = EXCLUDED.correct_count,
        accuracy_rate = EXCLUDED.accuracy_rate,
        avg_score = EXCLUDED.avg_score,
        last_updated_at = CURRENT_TIMESTAMP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_student_ability_stats() IS '触发器函数：学生答题后自动更新能力统计';

-- 创建触发器（仅在答案被评分后触发）
DROP TRIGGER IF EXISTS trigger_update_student_ability_stats ON answers;
CREATE TRIGGER trigger_update_student_ability_stats
AFTER INSERT OR UPDATE OF score, is_correct ON answers
FOR EACH ROW
WHEN (NEW.score IS NOT NULL AND NEW.is_correct IS NOT NULL)
EXECUTE FUNCTION update_student_ability_stats();

-- =====================================================
-- 11. 触发器函数：更新学生知识点统计
-- =====================================================
CREATE OR REPLACE FUNCTION update_student_knowledge_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id INTEGER;
  v_knowledge_points TEXT[];
  v_subject VARCHAR(50);
  v_knowledge TEXT;
BEGIN
  -- 获取学生ID和题目信息
  SELECT sa.student_id INTO v_student_id
  FROM student_activities sa
  WHERE sa.id = NEW.student_exam_id;

  -- 获取题目的知识点和科目
  SELECT qd.knowledge_points, qd.subject INTO v_knowledge_points, v_subject
  FROM question_bank qb
  JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qb.id = NEW.question_id;

  -- 如果有知识点标签，更新统计
  IF v_knowledge_points IS NOT NULL AND array_length(v_knowledge_points, 1) > 0 THEN
    FOREACH v_knowledge IN ARRAY v_knowledge_points LOOP
      -- 使用 UPSERT 更新或插入统计数据
      INSERT INTO student_knowledge_stats (
        student_id, knowledge_point, subject,
        total_questions, correct_count, accuracy_rate, avg_score, last_updated_at
      )
      SELECT
        v_student_id,
        v_knowledge,
        v_subject,
        COUNT(*),
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END),
        ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 2),
        ROUND(AVG(score), 2),
        CURRENT_TIMESTAMP
      FROM (
        SELECT a.is_correct, a.score
        FROM answers a
        JOIN student_activities sa ON a.student_exam_id = sa.id
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN question_drafts qd ON qb.draft_id = qd.id
        WHERE sa.student_id = v_student_id
          AND v_knowledge = ANY(qd.knowledge_points)
          AND qd.subject = v_subject
      ) subq
      ON CONFLICT (student_id, knowledge_point, subject)
      DO UPDATE SET
        total_questions = EXCLUDED.total_questions,
        correct_count = EXCLUDED.correct_count,
        accuracy_rate = EXCLUDED.accuracy_rate,
        avg_score = EXCLUDED.avg_score,
        last_updated_at = CURRENT_TIMESTAMP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_student_knowledge_stats() IS '触发器函数：学生答题后自动更新知识点统计';

-- 创建触发器（仅在答案被评分后触发）
DROP TRIGGER IF EXISTS trigger_update_student_knowledge_stats ON answers;
CREATE TRIGGER trigger_update_student_knowledge_stats
AFTER INSERT OR UPDATE OF score, is_correct ON answers
FOR EACH ROW
WHEN (NEW.score IS NOT NULL AND NEW.is_correct IS NOT NULL)
EXECUTE FUNCTION update_student_knowledge_stats();

-- =====================================================
-- 12. 初始化现有数据的统计（可选）
-- =====================================================
-- 注意：这个步骤可能需要较长时间，建议在低峰期执行
-- 或者通过后台任务逐步初始化

-- 初始化学生能力统计（注释掉，需要时手动执行）
-- INSERT INTO student_ability_stats (student_id, ability, subject, total_questions, correct_count, accuracy_rate, avg_score)
-- SELECT * FROM v_student_ability_realtime
-- ON CONFLICT (student_id, ability, subject) DO NOTHING;

-- 初始化学生知识点统计（注释掉，需要时手动执行）
-- INSERT INTO student_knowledge_stats (student_id, knowledge_point, subject, total_questions, correct_count, accuracy_rate, avg_score)
-- SELECT * FROM v_student_knowledge_realtime
-- ON CONFLICT (student_id, knowledge_point, subject) DO NOTHING;

-- =====================================================
-- Migration Complete
-- =====================================================
