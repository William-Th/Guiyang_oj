-- Migration 043: 阶段一功能（提级 / 积分策略 / 错题集）
-- Date: 2026-06-17
-- Description: 阶段一（P0）所需的新表与配置：
--   1. question_promotions       —— 题目提级申请（区级→市级审核流）
--   2. points_policy              —— 积分策略配置（难度基础分/上限/收益递减系数等）
--   3. student_points_daily       —— 学生单日单难度做题计数（收益递减与上限判断）
--   4. student_wrong_questions    —— 学生错题集（答错自动入库）
--   并补充 question_bank.submit_count / correct_count（使用统计 A5 预留）

BEGIN;

-- ============================================================
-- 1. question_promotions：题目提级申请
-- ============================================================
CREATE TABLE IF NOT EXISTS public.question_promotions (
    id SERIAL PRIMARY KEY,
    draft_id INTEGER NOT NULL,                       -- 关联题目草稿
    source_bank_id INTEGER,                          -- 源发布记录（区级 question_bank.id）
    from_scope TEXT NOT NULL,                        -- 原范围（如 practice_district_xxx）
    to_scope TEXT NOT NULL DEFAULT 'practice_municipal', -- 目标范围（市级）
    requested_by INTEGER NOT NULL,                   -- 发起人（区级所有者）
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending / approved / rejected
    reviewed_by INTEGER,                             -- 审核人（市级管理员）
    reviewed_at TIMESTAMPTZ,
    review_comment TEXT,
    target_bank_id INTEGER,                          -- 审核通过后新建的市级 question_bank.id
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT question_promotions_status_check
        CHECK (status::text = ANY (ARRAY['pending', 'approved', 'rejected']::text[]))
);

CREATE INDEX IF NOT EXISTS idx_question_promotions_draft ON public.question_promotions(draft_id);
CREATE INDEX IF NOT EXISTS idx_question_promotions_status ON public.question_promotions(status);
CREATE INDEX IF NOT EXISTS idx_question_promotions_requested_by ON public.question_promotions(requested_by);

COMMENT ON TABLE public.question_promotions IS '题目提级申请（区级→市级），市级管理员审核';
COMMENT ON COLUMN public.question_promotions.from_scope IS '原范围，如 practice_district_xxx';
COMMENT ON COLUMN public.question_promotions.to_scope IS '目标范围，默认市级 practice_municipal';
COMMENT ON COLUMN public.question_promotions.target_bank_id IS '审核通过后新建的市级发布记录ID';

-- ============================================================
-- 2. points_policy：积分策略配置（key/value）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.points_policy (
    id SERIAL PRIMARY KEY,
    policy_key VARCHAR(50) NOT NULL UNIQUE,          -- 策略键
    policy_value NUMERIC NOT NULL,                   -- 策略值（数值类）
    category VARCHAR(30) NOT NULL DEFAULT 'general', -- 分类：base/cap/streak/wrong
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.points_policy IS '刷题积分策略配置（可后台调整）';

-- 默认策略值（与方案第四节一致，可调）
INSERT INTO public.points_policy (policy_key, policy_value, category, description) VALUES
    ('easy_base',         1,  'base',   '简单题答对基础分'),
    ('medium_base',       3,  'base',   '中等题答对基础分'),
    ('hard_base',         6,  'base',   '困难题答对基础分'),
    ('easy_daily_cap',    20, 'cap',    '简单题每日积分上限'),
    ('medium_daily_cap',  50, 'cap',    '中等题每日积分上限'),
    ('hard_daily_cap',    80, 'cap',    '困难题每日积分上限'),
    ('daily_total_cap',   150,'cap',    '每日总积分上限（三难度合并）'),
    ('decay_lambda',      0.15,'general','收益递减系数：第k题积分 = base × 1/(1+λ·k)'),
    ('streak_step',       5,  'streak', '连胜步长（每连续答对N题触发奖励）'),
    ('streak_bonus',      5,  'streak', '连胜奖励积分'),
    ('wrong_redo_ratio',  0.5,'wrong',  '错题重做答对积分系数（基础分 × 此值）'),
    ('wrong_redo_max',    2,  'wrong',  '同一错题可获积分的重做次数上限')
ON CONFLICT (policy_key) DO NOTHING;

-- ============================================================
-- 3. student_points_daily：学生单日单难度做题计数
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_points_daily (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    stat_date DATE NOT NULL,                         -- 统计日期
    difficulty VARCHAR(20) NOT NULL,                 -- easy / medium / hard
    correct_count INTEGER NOT NULL DEFAULT 0,        -- 当日该难度答对题数（用于收益递减k）
    earned_points INTEGER NOT NULL DEFAULT 0,        -- 当日该难度已获积分
    daily_total_earned INTEGER NOT NULL DEFAULT 0,   -- 当日全部难度累计积分（冗余，便于总上限判断）
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT student_points_daily_unique UNIQUE (student_id, stat_date, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_student_points_daily_student_date
    ON public.student_points_daily(student_id, stat_date);

COMMENT ON TABLE public.student_points_daily IS '学生单日单难度做题计数（收益递减与上限）';
COMMENT ON COLUMN public.student_points_daily.correct_count IS '当日该难度答对题数，作为收益递减的k';
COMMENT ON COLUMN public.student_points_daily.daily_total_earned IS '当日全部难度累计积分（冗余字段）';

-- ============================================================
-- 4. student_wrong_questions：学生错题集
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_wrong_questions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,                    -- 题目ID（answers.question_id）
    draft_id INTEGER,                                -- 关联草稿（去重与内容来源）
    subject VARCHAR(50),                             -- 冗余：科目（筛选用）
    knowledge_points TEXT[] DEFAULT '{}'::text[],    -- 冗余：知识点（筛选用）
    difficulty VARCHAR(20),                          -- 冗余：难度
    error_count INTEGER NOT NULL DEFAULT 1,          -- 累计答错次数
    review_count INTEGER NOT NULL DEFAULT 0,         -- 重做次数
    first_wrong_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_wrong_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_reviewed_at TIMESTAMPTZ,                    -- 最近一次重做时间
    source_activity_id INTEGER,                      -- 来源活动ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',    -- active / mastered / removed
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT student_wrong_questions_unique UNIQUE (student_id, question_id),
    CONSTRAINT student_wrong_questions_status_check
        CHECK (status::text = ANY (ARRAY['active', 'mastered', 'removed']::text[]))
);

CREATE INDEX IF NOT EXISTS idx_wrong_questions_student ON public.student_wrong_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_student_subject ON public.student_wrong_questions(student_id, subject);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_status ON public.student_wrong_questions(status);

COMMENT ON TABLE public.student_wrong_questions IS '学生错题集（答错自动入库）';
COMMENT ON COLUMN public.student_wrong_questions.error_count IS '累计答错次数';
COMMENT ON COLUMN public.student_wrong_questions.review_count IS '重做次数（用于错题重做积分上限）';
COMMENT ON COLUMN public.student_wrong_questions.status IS 'active-练习中 mastered-已掌握 removed-已移除';

-- ============================================================
-- 5. question_bank 预留：提交人数 / 正确人数（A5 使用统计）
-- ============================================================
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS submit_count INTEGER DEFAULT 0;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS correct_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.question_bank.submit_count IS '累计提交人数（A5 使用统计）';
COMMENT ON COLUMN public.question_bank.correct_count IS '累计答对人数（A5，正确率 = correct/submit）';

COMMIT;
