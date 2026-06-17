-- Migration 054: 家长角色（E4）
-- Date: 2026-06-17
-- Description: 新增 parent 角色 + parent_student_relations 关系表（一孩一家长）。
--   家长权限：只读看孩子数据/练习，可代报名测评，不能修改。

BEGIN;

-- users.role 增加 'parent'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role::text = ANY (ARRAY[
    'student', 'teacher', 'school_admin', 'district_admin',
    'municipal_school_admin', 'base_school_admin', 'municipal_admin',
    'system_admin', 'parent'
  ]::text[]));

-- 家长-学生关系（一个学生只关联一个家长：student_user_id 唯一）
CREATE TABLE IF NOT EXISTS public.parent_student_relations (
    id SERIAL PRIMARY KEY,
    parent_user_id INTEGER NOT NULL,             -- 家长 users.id
    student_user_id INTEGER NOT NULL UNIQUE,     -- 学生 users.id（一孩一家长）
    relation VARCHAR(20),                        -- 父亲/母亲/其他
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT psr_parent_student_unique UNIQUE (parent_user_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_psr_parent ON public.parent_student_relations(parent_user_id);

COMMENT ON TABLE public.parent_student_relations IS '家长-学生关系（E4），一个学生只关联一个家长';

COMMIT;
