-- ======================================================================
-- Activity Paper Generation System Migration
-- Version: 1.0
-- Date: 2025-10-28
-- Description: 为活动添加组卷功能，支持从题库中选择题目组成试卷
-- ======================================================================

-- IMPORTANT: Backup your database before running this migration!
-- Command: pg_dump -U postgres guiyang_oj > backup_before_paper_generation_$(date +%Y%m%d_%H%M%S).sql

BEGIN;

-- ======================================================================
-- STEP 1: 创建活动题目关联表 (activity_questions)
-- ======================================================================
-- 用途：存储活动与题目的关联关系，支持组卷功能
CREATE TABLE IF NOT EXISTS activity_questions (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL, -- 题目在试卷中的顺序 (从1开始)
  score DECIMAL(5,2) NOT NULL DEFAULT 5.00, -- 该题目在本活动中的分值
  is_required BOOLEAN DEFAULT true, -- 是否必答题
  section VARCHAR(50), -- 题目所属部分 (例如：第一部分、选择题部分等)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(activity_id, question_id), -- 确保同一活动中不重复添加同一题目
  UNIQUE(activity_id, order_index) -- 确保同一活动中题目顺序不重复
);

-- ======================================================================
-- STEP 2: 添加注释说明表和字段用途
-- ======================================================================
COMMENT ON TABLE activity_questions IS '活动题目关联表 - 存储活动（练习/测评）与题目的关联关系，支持组卷功能';
COMMENT ON COLUMN activity_questions.activity_id IS '关联的活动ID (activities表外键)';
COMMENT ON COLUMN activity_questions.question_id IS '关联的题目ID (question_bank表外键)';
COMMENT ON COLUMN activity_questions.order_index IS '题目在试卷中的显示顺序 (1,2,3...)';
COMMENT ON COLUMN activity_questions.score IS '该题目在本活动中的分值 (可与题库中建议分值不同)';
COMMENT ON COLUMN activity_questions.is_required IS '是否必答题 (true=必答, false=选答)';
COMMENT ON COLUMN activity_questions.section IS '题目所属部分或章节 (例如：第一部分、单选题、多选题等)';

-- ======================================================================
-- STEP 3: 创建索引优化查询性能
-- ======================================================================
-- 索引1: 通过活动ID查询所有题目 (最常用查询)
CREATE INDEX idx_activity_questions_activity_id ON activity_questions(activity_id);

-- 索引2: 通过题目ID查询使用该题目的所有活动
CREATE INDEX idx_activity_questions_question_id ON activity_questions(question_id);

-- 索引3: 按活动和顺序排序查询 (用于试卷显示)
CREATE INDEX idx_activity_questions_activity_order ON activity_questions(activity_id, order_index);

-- 索引4: 按活动和章节分组查询
CREATE INDEX idx_activity_questions_activity_section ON activity_questions(activity_id, section);

-- ======================================================================
-- STEP 4: 为activities表添加组卷相关字段
-- ======================================================================
-- 添加总分字段
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS total_score DECIMAL(6,2) DEFAULT 0.00;

-- 添加题目数量统计字段
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;

-- 添加组卷状态字段
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS paper_status VARCHAR(20) DEFAULT 'empty'
  CHECK (paper_status IN ('empty', 'draft', 'completed'));

-- 添加字段注释
COMMENT ON COLUMN activities.total_score IS '试卷总分 (所有题目分值之和)';
COMMENT ON COLUMN activities.question_count IS '试卷题目总数';
COMMENT ON COLUMN activities.paper_status IS '组卷状态: empty=未组卷, draft=草稿中, completed=已完成';

-- ======================================================================
-- STEP 5: 创建触发器自动更新activities表的统计字段
-- ======================================================================

-- 触发器函数：更新活动的总分和题目数量
CREATE OR REPLACE FUNCTION update_activity_paper_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新活动的总分和题目数量
  UPDATE activities
  SET
    total_score = (
      SELECT COALESCE(SUM(score), 0)
      FROM activity_questions
      WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    ),
    question_count = (
      SELECT COUNT(*)
      FROM activity_questions
      WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    ),
    paper_status = CASE
      WHEN (SELECT COUNT(*) FROM activity_questions WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)) = 0 THEN 'empty'
      ELSE 'completed'
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：插入题目时更新统计
CREATE TRIGGER trigger_update_activity_stats_on_insert
AFTER INSERT ON activity_questions
FOR EACH ROW
EXECUTE FUNCTION update_activity_paper_stats();

-- 创建触发器：删除题目时更新统计
CREATE TRIGGER trigger_update_activity_stats_on_delete
AFTER DELETE ON activity_questions
FOR EACH ROW
EXECUTE FUNCTION update_activity_paper_stats();

-- 创建触发器：更新题目分值时更新统计
CREATE TRIGGER trigger_update_activity_stats_on_update
AFTER UPDATE OF score ON activity_questions
FOR EACH ROW
EXECUTE FUNCTION update_activity_paper_stats();

-- ======================================================================
-- STEP 6: 创建触发器自动更新updated_at字段
-- ======================================================================
CREATE TRIGGER update_activity_questions_updated_at
BEFORE UPDATE ON activity_questions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ======================================================================
-- STEP 7: 创建辅助函数 - 获取活动试卷详情
-- ======================================================================
-- 函数：获取活动的完整试卷信息（包含题目详情）
CREATE OR REPLACE FUNCTION get_activity_paper(p_activity_id INTEGER)
RETURNS TABLE (
  question_id INTEGER,
  order_index INTEGER,
  score DECIMAL(5,2),
  is_required BOOLEAN,
  section VARCHAR(50),
  question_code VARCHAR(50),
  question_type VARCHAR(20),
  content TEXT,
  options JSONB,
  correct_answer TEXT,
  difficulty VARCHAR(20),
  subject VARCHAR(50),
  grade VARCHAR(20),
  knowledge_points TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aq.question_id,
    aq.order_index,
    aq.score,
    aq.is_required,
    aq.section,
    qb.question_code,
    qb.type as question_type,
    qb.content,
    qb.options,
    qb.correct_answer,
    qb.difficulty,
    qb.subject,
    qb.grade,
    qb.knowledge_points
  FROM activity_questions aq
  INNER JOIN question_bank qb ON aq.question_id = qb.id
  WHERE aq.activity_id = p_activity_id
  ORDER BY aq.order_index;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_activity_paper(INTEGER) IS '获取活动的完整试卷信息（包含题目详情）';

-- ======================================================================
-- STEP 8: 初始化现有活动的统计字段
-- ======================================================================
-- 将现有活动的组卷状态设置为empty
UPDATE activities
SET
  total_score = 0.00,
  question_count = 0,
  paper_status = 'empty'
WHERE total_score IS NULL OR question_count IS NULL;

-- ======================================================================
-- STEP 9: 创建视图 - 活动组卷统计
-- ======================================================================
CREATE OR REPLACE VIEW activity_paper_stats AS
SELECT
  a.id as activity_id,
  a.title,
  a.type,
  a.subject,
  a.paper_status,
  a.total_score,
  a.question_count,
  COUNT(DISTINCT CASE WHEN qb.type = 'single' THEN aq.id END) as single_choice_count,
  COUNT(DISTINCT CASE WHEN qb.type = 'multiple' THEN aq.id END) as multiple_choice_count,
  COUNT(DISTINCT CASE WHEN qb.type = 'blank' THEN aq.id END) as blank_count,
  COUNT(DISTINCT CASE WHEN qb.type = 'essay' THEN aq.id END) as essay_count,
  COUNT(DISTINCT CASE WHEN qb.type = 'code' THEN aq.id END) as code_count,
  COUNT(DISTINCT CASE WHEN qb.difficulty = 'easy' THEN aq.id END) as easy_count,
  COUNT(DISTINCT CASE WHEN qb.difficulty = 'medium' THEN aq.id END) as medium_count,
  COUNT(DISTINCT CASE WHEN qb.difficulty = 'hard' THEN aq.id END) as hard_count
FROM activities a
LEFT JOIN activity_questions aq ON a.id = aq.activity_id
LEFT JOIN question_bank qb ON aq.question_id = qb.id
GROUP BY a.id, a.title, a.type, a.subject, a.paper_status, a.total_score, a.question_count;

COMMENT ON VIEW activity_paper_stats IS '活动组卷统计视图 - 统计各活动的题目数量、题型分布、难度分布等';

-- ======================================================================
-- STEP 10: 验证迁移
-- ======================================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  activity_count INTEGER;
BEGIN
  -- 检查表是否创建成功
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'activity_questions'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'Migration failed: activity_questions table was not created';
  END IF;

  -- 统计活动数量
  SELECT COUNT(*) INTO activity_count FROM activities;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 007 completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created table: activity_questions';
  RAISE NOTICE 'Created triggers: 3 (insert, delete, update)';
  RAISE NOTICE 'Created function: get_activity_paper()';
  RAISE NOTICE 'Created view: activity_paper_stats';
  RAISE NOTICE 'Total activities: %', activity_count;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ======================================================================
-- Post-migration verification queries (run separately)
-- ======================================================================
-- 1. 查看表结构
-- \d activity_questions

-- 2. 查看所有活动的组卷状态
-- SELECT id, title, paper_status, question_count, total_score FROM activities ORDER BY id;

-- 3. 查看活动组卷统计
-- SELECT * FROM activity_paper_stats WHERE activity_id = 1;

-- 4. 测试获取活动试卷
-- SELECT * FROM get_activity_paper(1);
