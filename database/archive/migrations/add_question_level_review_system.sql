-- 题目级别、建议分值、草稿箱和审核系统
-- Add question level, suggested score, draft box and review system

-- 1. 更新 question_bank 表
ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS level VARCHAR(10) CHECK (level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9')),
ADD COLUMN IF NOT EXISTS suggested_score INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'published')),
ADD COLUMN IF NOT EXISTS scope TEXT[] DEFAULT '{}', -- 题库范围: practice, assessment, competition
ADD COLUMN IF NOT EXISTS reviewer_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS review_comment TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS published_by INTEGER REFERENCES users(id);

-- 重命名 score 为旧字段说明，但保留兼容性
COMMENT ON COLUMN question_bank.score IS '题目分值（已废弃，使用 suggested_score）';
COMMENT ON COLUMN question_bank.suggested_score IS '建议分值';
COMMENT ON COLUMN question_bank.level IS '题目级别 L1-L9';
COMMENT ON COLUMN question_bank.status IS '题目状态：draft草稿，pending_review待审核，approved已批准，rejected已拒绝，published已发布';
COMMENT ON COLUMN question_bank.scope IS '题库范围：practice练习题库，assessment测评题库，competition竞赛题库';

-- 2. 创建教师权限表
CREATE TABLE IF NOT EXISTS teacher_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type VARCHAR(50) NOT NULL, -- question_bank_review, assessment_review, competition_review
  subjects TEXT[], -- 可审核的科目列表
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission_type)
);

-- 3. 创建题目审核记录表
CREATE TABLE IF NOT EXISTS question_reviews (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT,
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 添加索引
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON question_bank(status);
CREATE INDEX IF NOT EXISTS idx_question_bank_level ON question_bank(level);
CREATE INDEX IF NOT EXISTS idx_question_bank_reviewer_id ON question_bank(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_scope ON question_bank USING GIN (scope);

CREATE INDEX IF NOT EXISTS idx_teacher_permissions_user_id ON teacher_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_permissions_permission_type ON teacher_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_teacher_permissions_subjects ON teacher_permissions USING GIN (subjects);

CREATE INDEX IF NOT EXISTS idx_question_reviews_question_id ON question_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_reviewer_id ON question_reviews(reviewer_id);

-- 5. 给 admin 用户添加所有权限
INSERT INTO teacher_permissions (user_id, permission_type, subjects, granted_by, is_active, notes)
VALUES
  (1, 'question_bank_review', ARRAY['数学', '物理', '化学', '生物', '计算机'], 1, true, '系统管理员默认权限'),
  (1, 'assessment_review', ARRAY['数学', '物理', '化学', '生物', '计算机'], 1, true, '系统管理员默认权限'),
  (1, 'competition_review', ARRAY['数学', '物理', '化学', '生物', '计算机'], 1, true, '系统管理员默认权限')
ON CONFLICT (user_id, permission_type) DO NOTHING;

-- 6. 更新现有题目状态为已发布（兼容旧数据）
UPDATE question_bank
SET status = 'published', published_at = created_at, published_by = created_by
WHERE status IS NULL OR status = 'draft';

-- 7. 添加触发器更新 updated_at
CREATE OR REPLACE FUNCTION update_teacher_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teacher_permissions_updated_at
BEFORE UPDATE ON teacher_permissions
FOR EACH ROW EXECUTE FUNCTION update_teacher_permissions_updated_at();
