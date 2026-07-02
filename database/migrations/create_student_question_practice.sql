-- 智能练习答题记录表（碎片化推荐 / 每日推题的答题结果）
-- 用于：
--   1. 推荐时排除“该生已经答对过”的题目（答对→不再推）
--   2. 记录推荐来源答题对错，供后续学情分析
-- 与 answers 表解耦：answers 关联正式活动（student_activities），
--   而推荐答题是独立碎片化练习，不在任何活动内，故单独记录。
-- UNIQUE(student_id, question_id)：同一题只保留最后作答状态（upsert）。

CREATE TABLE IF NOT EXISTS student_question_practice (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  draft_id INTEGER REFERENCES question_drafts(id) ON DELETE CASCADE,
  subject VARCHAR(50),
  is_correct BOOLEAN NOT NULL,
  source VARCHAR(20) DEFAULT 'recommend',  -- recommend / daily
  answered_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_stu_q_practice_student
  ON student_question_practice(student_id);
CREATE INDEX IF NOT EXISTS idx_stu_q_practice_correct_draft
  ON student_question_practice(student_id, is_correct);
