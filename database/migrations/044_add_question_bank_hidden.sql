-- Migration 044: 题库隐藏字段（A2）
-- Date: 2026-06-17
-- Description: 为 question_bank 新增 is_hidden 字段，并重建 question_bank_with_draft 视图暴露
--              is_hidden / submit_count / correct_count（submit/correct 由 043 迁移新增）。
--   隐藏语义：is_hidden=true 时，仅出题人/审核人/上级管理员可见；
--             测评开始前对学生与其他老师不可见；测评开始后在测评模式中可见；
--             解除由上级管理员手动操作。

BEGIN;

-- 1. 新增 is_hidden 字段
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.question_bank.is_hidden IS '是否隐藏（A2）：隐藏后仅授权角色可见，测评开始前对学生/其他老师不可见';

-- 2. 重建视图，暴露 is_hidden / submit_count / correct_count
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
       u4.real_name AS withdrawn_by_name,
       qb.is_hidden,
       qb.submit_count,
       qb.correct_count
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
