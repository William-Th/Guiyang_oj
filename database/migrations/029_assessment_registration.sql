-- 029_assessment_registration.sql
-- 测评报名功能数据库迁移
-- 创建日期: 2025-11-30
-- 功能说明:
--   1. 创建测评点表 (assessment_locations) - 用于L4+线下现场测评
--   2. 创建测评报名表 (assessment_registrations) - 学生报名记录
--   3. 修改activities表添加报名相关字段
--   4. 创建触发器维护报名计数

-- ============================================
-- 1. 修改 activities 表，添加报名相关字段
-- ============================================

-- 添加报名相关字段
ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_start_time TIMESTAMP;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_end_time TIMESTAMP;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS max_participants INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS require_location BOOLEAN DEFAULT FALSE;

-- 添加字段注释
COMMENT ON COLUMN activities.registration_enabled IS '是否开启报名功能（测评类型默认开启）';
COMMENT ON COLUMN activities.registration_start_time IS '报名开始时间';
COMMENT ON COLUMN activities.registration_end_time IS '报名截止时间';
COMMENT ON COLUMN activities.max_participants IS '最大参与人数限制（L1-L3可选，L4+通过测评点控制）';
COMMENT ON COLUMN activities.require_location IS '是否需要选择测评点（L4+自动设为true）';

-- ============================================
-- 2. 创建测评点表 (assessment_locations)
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_locations (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(300),
    district_id INTEGER REFERENCES districts(id),
    capacity INTEGER NOT NULL DEFAULT 50,
    registered_count INTEGER DEFAULT 0,
    contact_name VARCHAR(50),
    contact_phone VARCHAR(20),
    exam_date DATE,
    exam_time_start TIME,
    exam_time_end TIME,
    check_in_time TIME,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加表注释
COMMENT ON TABLE assessment_locations IS '测评点表 - 用于L4+线下现场测评的考点管理';
COMMENT ON COLUMN assessment_locations.activity_id IS '关联的测评活动ID';
COMMENT ON COLUMN assessment_locations.name IS '测评点名称（如：贵阳一中考点）';
COMMENT ON COLUMN assessment_locations.address IS '测评点详细地址';
COMMENT ON COLUMN assessment_locations.district_id IS '所属区县';
COMMENT ON COLUMN assessment_locations.capacity IS '容纳人数上限';
COMMENT ON COLUMN assessment_locations.registered_count IS '已报名人数（通过触发器自动维护）';
COMMENT ON COLUMN assessment_locations.contact_name IS '联系人姓名';
COMMENT ON COLUMN assessment_locations.contact_phone IS '联系电话';
COMMENT ON COLUMN assessment_locations.exam_date IS '测评日期';
COMMENT ON COLUMN assessment_locations.exam_time_start IS '测评开始时间';
COMMENT ON COLUMN assessment_locations.exam_time_end IS '测评结束时间';
COMMENT ON COLUMN assessment_locations.check_in_time IS '签到时间';
COMMENT ON COLUMN assessment_locations.notes IS '备注说明（如：请携带学生证）';
COMMENT ON COLUMN assessment_locations.is_active IS '是否启用';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_assessment_locations_activity ON assessment_locations(activity_id);
CREATE INDEX IF NOT EXISTS idx_assessment_locations_district ON assessment_locations(district_id);
CREATE INDEX IF NOT EXISTS idx_assessment_locations_active ON assessment_locations(is_active) WHERE is_active = TRUE;

-- ============================================
-- 3. 创建测评报名表 (assessment_registrations)
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_registrations (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES assessment_locations(id) ON DELETE SET NULL,

    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    -- pending: 待确认（如需审核）
    -- confirmed: 已确认
    -- rejected: 已拒绝
    -- cancelled: 已取消
    -- completed: 已完成测评
    -- absent: 缺考

    -- 时间记录
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    -- 取消相关
    cancel_reason TEXT,
    cancelled_by INTEGER REFERENCES users(id),

    -- 审核相关（如需人工审核）
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    review_notes TEXT,

    -- 关联到student_activities（参加测评后关联）
    student_activity_id INTEGER REFERENCES student_activities(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束：同一学生不能重复报名同一活动
    UNIQUE(activity_id, student_id)
);

-- 添加表注释
COMMENT ON TABLE assessment_registrations IS '测评报名表 - 记录学生的测评报名信息';
COMMENT ON COLUMN assessment_registrations.activity_id IS '测评活动ID';
COMMENT ON COLUMN assessment_registrations.student_id IS '学生ID';
COMMENT ON COLUMN assessment_registrations.location_id IS '测评点ID（L4+必填，L1-L3为NULL）';
COMMENT ON COLUMN assessment_registrations.status IS '报名状态: pending/confirmed/rejected/cancelled/completed/absent';
COMMENT ON COLUMN assessment_registrations.registered_at IS '报名时间';
COMMENT ON COLUMN assessment_registrations.confirmed_at IS '确认时间';
COMMENT ON COLUMN assessment_registrations.cancelled_at IS '取消时间';
COMMENT ON COLUMN assessment_registrations.cancel_reason IS '取消原因';
COMMENT ON COLUMN assessment_registrations.cancelled_by IS '取消操作人';
COMMENT ON COLUMN assessment_registrations.reviewed_at IS '审核时间';
COMMENT ON COLUMN assessment_registrations.reviewed_by IS '审核人';
COMMENT ON COLUMN assessment_registrations.review_notes IS '审核备注';
COMMENT ON COLUMN assessment_registrations.student_activity_id IS '关联的学生活动记录（参加测评后关联）';

-- 状态约束
ALTER TABLE assessment_registrations
ADD CONSTRAINT chk_registration_status
CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'absent'));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_registrations_activity ON assessment_registrations(activity_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON assessment_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_location ON assessment_registrations(location_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON assessment_registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_activity_status ON assessment_registrations(activity_id, status);

-- ============================================
-- 4. 创建触发器：维护测评点报名人数
-- ============================================

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_location_registered_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 新增报名，如果状态是confirmed且有location_id，增加计数
        IF NEW.location_id IS NOT NULL AND NEW.status = 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = registered_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.location_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- 状态变为confirmed，增加计数
        IF NEW.location_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status != 'confirmed' OR OLD.status IS NULL) THEN
            UPDATE assessment_locations
            SET registered_count = registered_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.location_id;
        END IF;

        -- 状态从confirmed变为其他，减少计数
        IF OLD.location_id IS NOT NULL AND OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
        END IF;

        -- 如果location_id变更（从一个测评点换到另一个）
        IF OLD.location_id IS NOT NULL AND NEW.location_id IS NOT NULL
           AND OLD.location_id != NEW.location_id
           AND OLD.status = 'confirmed' AND NEW.status = 'confirmed' THEN
            -- 旧测评点减少
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
            -- 新测评点增加（上面的条件已处理）
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- 删除报名记录，如果状态是confirmed，减少计数
        IF OLD.location_id IS NOT NULL AND OLD.status = 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_location_count ON assessment_registrations;
CREATE TRIGGER trigger_update_location_count
AFTER INSERT OR UPDATE OR DELETE ON assessment_registrations
FOR EACH ROW EXECUTE FUNCTION update_location_registered_count();

-- ============================================
-- 5. 创建更新时间触发器
-- ============================================

-- 测评点表更新时间触发器
CREATE OR REPLACE FUNCTION update_assessment_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assessment_location_updated_at ON assessment_locations;
CREATE TRIGGER trigger_assessment_location_updated_at
BEFORE UPDATE ON assessment_locations
FOR EACH ROW EXECUTE FUNCTION update_assessment_location_updated_at();

-- 报名表更新时间触发器
CREATE OR REPLACE FUNCTION update_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registration_updated_at ON assessment_registrations;
CREATE TRIGGER trigger_registration_updated_at
BEFORE UPDATE ON assessment_registrations
FOR EACH ROW EXECUTE FUNCTION update_registration_updated_at();

-- ============================================
-- 6. 创建视图：报名统计视图
-- ============================================

CREATE OR REPLACE VIEW v_registration_statistics AS
SELECT
    a.id AS activity_id,
    a.title AS activity_title,
    a.ability_level,
    a.type AS activity_type,
    COUNT(ar.id) AS total_registrations,
    COUNT(CASE WHEN ar.status = 'confirmed' THEN 1 END) AS confirmed_count,
    COUNT(CASE WHEN ar.status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN ar.status = 'cancelled' THEN 1 END) AS cancelled_count,
    COUNT(CASE WHEN ar.status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS absent_count,
    a.max_participants,
    CASE
        WHEN a.max_participants IS NOT NULL
        THEN a.max_participants - COUNT(CASE WHEN ar.status = 'confirmed' THEN 1 END)
        ELSE NULL
    END AS remaining_slots
FROM activities a
LEFT JOIN assessment_registrations ar ON a.id = ar.activity_id
WHERE a.type = 'assessment'
GROUP BY a.id, a.title, a.ability_level, a.type, a.max_participants;

COMMENT ON VIEW v_registration_statistics IS '测评报名统计视图';

-- ============================================
-- 7. 创建视图：测评点报名详情视图
-- ============================================

CREATE OR REPLACE VIEW v_location_registration_details AS
SELECT
    al.id AS location_id,
    al.activity_id,
    al.name AS location_name,
    al.address,
    al.capacity,
    al.registered_count,
    al.capacity - al.registered_count AS remaining_capacity,
    al.exam_date,
    al.exam_time_start,
    al.exam_time_end,
    al.check_in_time,
    al.is_active,
    d.name AS district_name,
    a.title AS activity_title,
    a.ability_level
FROM assessment_locations al
LEFT JOIN districts d ON al.district_id = d.id
LEFT JOIN activities a ON al.activity_id = a.id;

COMMENT ON VIEW v_location_registration_details IS '测评点报名详情视图';

-- ============================================
-- 8. 初始化：为现有测评活动设置默认值
-- ============================================

-- 为所有测评类型活动开启报名功能
UPDATE activities
SET registration_enabled = TRUE,
    require_location = CASE
        WHEN ability_level IN ('L4', 'L5', 'L6', 'L7') THEN TRUE
        ELSE FALSE
    END
WHERE type = 'assessment' AND registration_enabled IS NULL;

-- ============================================
-- 完成提示
-- ============================================
-- 迁移完成！
--
-- 新增表:
--   - assessment_locations: 测评点管理
--   - assessment_registrations: 报名记录
--
-- 修改表:
--   - activities: 添加报名相关字段
--
-- 新增触发器:
--   - trigger_update_location_count: 自动维护测评点报名人数
--   - trigger_assessment_location_updated_at: 更新时间
--   - trigger_registration_updated_at: 更新时间
--
-- 新增视图:
--   - v_registration_statistics: 报名统计
--   - v_location_registration_details: 测评点详情
