-- =====================================================
-- Migration 026: Teaching Class Management System
-- 教学班管理系统
-- 创建日期: 2025-11-26
-- 描述: 创建教学班相关表，支持三级教学班（校级/区级/市级）和审批流程
-- =====================================================

-- =====================================================
-- 1. 教学班主表 (teaching_classes)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                              -- 班级名称
    description TEXT,                                        -- 班级描述
    scope VARCHAR(20) NOT NULL,                              -- 范围: school/district/municipal
    school_id INTEGER REFERENCES schools(id),                -- 所属学校(校级班级必填)
    district_id INTEGER REFERENCES districts(id),            -- 所属区县(区级班级必填)
    subject VARCHAR(50),                                     -- 所属学科(可选)
    grade VARCHAR(20),                                       -- 年级(可选)
    academic_year VARCHAR(30) NOT NULL,                      -- 学年学期，如"2025-2026学年第一学期"
    status VARCHAR(20) NOT NULL DEFAULT 'draft',             -- 状态
    created_by INTEGER NOT NULL REFERENCES users(id),        -- 创建者
    approved_by INTEGER REFERENCES users(id),                -- 审批者
    approved_at TIMESTAMP,                                   -- 审批时间
    rejection_reason TEXT,                                   -- 拒绝原因
    submitted_at TIMESTAMP,                                  -- 提交审批时间
    current_reviewer_level VARCHAR(20),                      -- 当前审核级别: school/district/municipal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_scope CHECK (scope IN ('school', 'district', 'municipal')),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived'))
);

COMMENT ON TABLE teaching_classes IS '教学班主表 - 存储教学班基本信息';
COMMENT ON COLUMN teaching_classes.scope IS '教学班范围: school-校级, district-区级, municipal-市级';
COMMENT ON COLUMN teaching_classes.status IS '状态: draft-草稿, pending-待审批, approved-已批准, rejected-已拒绝, archived-已归档';
COMMENT ON COLUMN teaching_classes.current_reviewer_level IS '当前审核级别，用于超时流转';

-- 索引
CREATE INDEX idx_teaching_classes_scope ON teaching_classes(scope);
CREATE INDEX idx_teaching_classes_status ON teaching_classes(status);
CREATE INDEX idx_teaching_classes_school ON teaching_classes(school_id);
CREATE INDEX idx_teaching_classes_district ON teaching_classes(district_id);
CREATE INDEX idx_teaching_classes_created_by ON teaching_classes(created_by);
CREATE INDEX idx_teaching_classes_academic_year ON teaching_classes(academic_year);

-- =====================================================
-- 2. 教学班成员表 (teaching_class_members)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_members (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_class_student UNIQUE(teaching_class_id, student_id)
);

COMMENT ON TABLE teaching_class_members IS '教学班成员表 - 记录教学班与学生的关联关系';
COMMENT ON COLUMN teaching_class_members.is_active IS '是否在班: true-在班, false-已移除';

-- 索引
CREATE INDEX idx_tcm_class ON teaching_class_members(teaching_class_id);
CREATE INDEX idx_tcm_student ON teaching_class_members(student_id);
CREATE INDEX idx_tcm_active ON teaching_class_members(is_active);

-- =====================================================
-- 3. 教学班教师表 (teaching_class_teachers)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_teachers (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'teacher',             -- 角色: creator/teacher/assistant
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_class_teacher UNIQUE(teaching_class_id, teacher_id),
    CONSTRAINT valid_teacher_role CHECK (role IN ('creator', 'teacher', 'assistant'))
);

COMMENT ON TABLE teaching_class_teachers IS '教学班教师表 - 记录教学班与教师的关联关系';
COMMENT ON COLUMN teaching_class_teachers.role IS '教师角色: creator-创建者, teacher-任课教师, assistant-助教';

-- 索引
CREATE INDEX idx_tct_class ON teaching_class_teachers(teaching_class_id);
CREATE INDEX idx_tct_teacher ON teaching_class_teachers(teacher_id);

-- =====================================================
-- 4. 教学班审批记录表 (teaching_class_approvals)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_approvals (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL,                             -- 动作: approve/reject/escalate/return
    comment TEXT,                                            -- 审批意见
    reviewer_level VARCHAR(20) NOT NULL,                     -- 审核者级别: school/district/municipal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_approval_action CHECK (action IN ('approve', 'reject', 'escalate', 'return'))
);

COMMENT ON TABLE teaching_class_approvals IS '教学班审批记录表 - 记录审批历史';
COMMENT ON COLUMN teaching_class_approvals.action IS '审批动作: approve-批准, reject-拒绝, escalate-流转上级, return-退回修改';

-- 索引
CREATE INDEX idx_tca_class ON teaching_class_approvals(teaching_class_id);
CREATE INDEX idx_tca_reviewer ON teaching_class_approvals(reviewer_id);
CREATE INDEX idx_tca_created_at ON teaching_class_approvals(created_at);

-- =====================================================
-- 5. 教学班活动关联表 (teaching_class_activities)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_activities (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    deadline TIMESTAMP,                                      -- 完成截止时间(可选)
    is_required BOOLEAN DEFAULT FALSE,                       -- 是否必做

    CONSTRAINT unique_class_activity UNIQUE(teaching_class_id, activity_id)
);

COMMENT ON TABLE teaching_class_activities IS '教学班活动关联表 - 记录教学班与活动的关联关系';

-- 索引
CREATE INDEX idx_tcact_class ON teaching_class_activities(teaching_class_id);
CREATE INDEX idx_tcact_activity ON teaching_class_activities(activity_id);

-- =====================================================
-- 6. 创建更新时间触发器
-- =====================================================
CREATE OR REPLACE FUNCTION update_teaching_class_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_teaching_class_updated_at ON teaching_classes;
CREATE TRIGGER trigger_teaching_class_updated_at
    BEFORE UPDATE ON teaching_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_teaching_class_updated_at();

-- =====================================================
-- 7. 教学班统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_teaching_class_summary AS
SELECT
    tc.id,
    tc.name,
    tc.scope,
    tc.status,
    tc.academic_year,
    tc.school_id,
    s.name AS school_name,
    tc.district_id,
    d.name AS district_name,
    tc.subject,
    tc.grade,
    tc.created_by,
    u.real_name AS creator_name,
    tc.created_at,
    tc.submitted_at,
    tc.approved_at,
    (SELECT COUNT(*) FROM teaching_class_members tcm
     WHERE tcm.teaching_class_id = tc.id AND tcm.is_active = TRUE) AS student_count,
    (SELECT COUNT(*) FROM teaching_class_teachers tct
     WHERE tct.teaching_class_id = tc.id AND tct.is_active = TRUE) AS teacher_count,
    (SELECT COUNT(*) FROM teaching_class_activities tca
     WHERE tca.teaching_class_id = tc.id) AS activity_count
FROM teaching_classes tc
LEFT JOIN schools s ON tc.school_id = s.id
LEFT JOIN districts d ON tc.district_id = d.id
LEFT JOIN users u ON tc.created_by = u.id;

COMMENT ON VIEW v_teaching_class_summary IS '教学班汇总视图 - 包含学生数、教师数、活动数等统计信息';

-- =====================================================
-- 8. 待审批教学班视图 (用于管理员审批列表)
-- =====================================================
CREATE OR REPLACE VIEW v_pending_teaching_classes AS
SELECT
    tc.id,
    tc.name,
    tc.scope,
    tc.description,
    tc.academic_year,
    tc.school_id,
    s.name AS school_name,
    tc.district_id,
    d.name AS district_name,
    tc.subject,
    tc.grade,
    tc.created_by,
    u.real_name AS creator_name,
    tc.submitted_at,
    tc.current_reviewer_level,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - tc.submitted_at)) AS pending_days
FROM teaching_classes tc
LEFT JOIN schools s ON tc.school_id = s.id
LEFT JOIN districts d ON tc.district_id = d.id
LEFT JOIN users u ON tc.created_by = u.id
WHERE tc.status = 'pending'
ORDER BY tc.submitted_at ASC;

COMMENT ON VIEW v_pending_teaching_classes IS '待审批教学班视图 - 显示待审批的教学班列表';

-- =====================================================
-- 完成
-- =====================================================
