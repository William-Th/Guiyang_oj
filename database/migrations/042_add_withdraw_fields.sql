-- Migration 042: 为题库添加撤回字段
-- Date: 2026-02-20
-- Description: 新增 withdrawn_by, withdrawn_at, withdraw_reason 字段，
--              并将 'inactive' 添加到 status check 约束中

BEGIN;

-- 添加撤回相关字段
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS withdrawn_by INTEGER REFERENCES users(id);
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS withdraw_reason TEXT;

-- 更新 status check 约束，添加 'inactive' 状态
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_status_check;
ALTER TABLE question_bank ADD CONSTRAINT question_bank_status_check
  CHECK (status::text = ANY (ARRAY[
    'draft', 'pending_review', 'approved', 'rejected', 'published', 'inactive'
  ]::text[]));

-- 添加注释
COMMENT ON COLUMN public.question_bank.withdrawn_by IS '撤回操作人ID';
COMMENT ON COLUMN public.question_bank.withdrawn_at IS '撤回时间';
COMMENT ON COLUMN public.question_bank.withdraw_reason IS '撤回原因';

-- 重建视图，暴露撤回字段供前端列表使用
-- 注意：使用 CREATE OR REPLACE 不能改变现有列的顺序，新增列必须追加到末尾
CREATE OR REPLACE VIEW public.question_bank_with_draft AS
SELECT qb.id,
       qb.draft_id,
       qb.scope,
       qb.district_id,
       qb.school_id,
       qb.status,
       qb.question_code,
       qb.usage_count,
       qb.success_rate,
       qb.published_by,
       qb.published_at,
       qb.reviewer_id,
       qb.review_comment,
       qb.reviewed_at,
       qb.is_active,
       qd.type,
       qd.subject,
       qd.grade,
       qd.content,
       qd.options,
       qd.correct_answer,
       qd.explanation,
       qd.image_url,
       qd.difficulty,
       qd.level,
       qd.suggested_score,
       qd.abilities,
       qd.knowledge_points,
       qd.tags,
       qd.created_by,
       qd.created_at,
       qd.updated_at,
       qd.code_template,
       qd.time_limit,
       qd.memory_limit,
       qd.judge_mode,
       qd.special_judge_code,
       qd.supported_languages,
       u1.real_name AS creator_name,
       u2.real_name AS publisher_name,
       u3.real_name AS reviewer_name,
       d.name AS district_name,
       d.code AS district_code,
       s.name AS school_name,
       qb.withdrawn_by,
       qb.withdrawn_at,
       qb.withdraw_reason,
       u4.real_name AS withdrawn_by_name
FROM question_bank qb
JOIN question_drafts qd ON qb.draft_id = qd.id
LEFT JOIN users u1 ON qd.created_by = u1.id
LEFT JOIN users u2 ON qb.published_by = u2.id
LEFT JOIN users u3 ON qb.reviewer_id = u3.id
LEFT JOIN districts d ON qb.district_id = d.id
LEFT JOIN schools s ON qb.school_id = s.id
LEFT JOIN users u4 ON qb.withdrawn_by = u4.id
WHERE qb.is_active = true AND qd.is_active = true;

COMMIT;
