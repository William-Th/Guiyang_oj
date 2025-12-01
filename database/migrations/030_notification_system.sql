-- =====================================================
-- Migration 030: 通知系统
-- 创建用户通知相关表结构
-- =====================================================

-- =====================================================
-- 1. 用户通知表
-- 存储发送给用户的通知消息
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,

    -- 接收者
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 通知类型
    -- system: 系统通知
    -- activity: 活动通知（测评发布、报名确认等）
    -- achievement: 成就通知
    -- reminder: 提醒通知
    -- announcement: 公告通知
    type VARCHAR(50) NOT NULL DEFAULT 'system',

    -- 通知内容
    title VARCHAR(200) NOT NULL,
    content TEXT,

    -- 通知元数据（JSON格式，存储相关链接、图标等）
    metadata JSONB DEFAULT '{}',

    -- 关联实体（可选，用于跳转）
    related_type VARCHAR(50),  -- activity, achievement, question, etc.
    related_id INTEGER,

    -- 状态
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    -- 优先级 (1-5, 5最高)
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),

    -- 过期时间（可选）
    expires_at TIMESTAMP,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_user_notifications_type ON user_notifications(type);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_expires ON user_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 2. 系统公告表
-- 存储全局公告信息
-- =====================================================

CREATE TABLE IF NOT EXISTS system_announcements (
    id SERIAL PRIMARY KEY,

    -- 公告内容
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    summary VARCHAR(500),  -- 摘要，用于列表显示

    -- 公告类型
    -- notice: 普通公告
    -- update: 系统更新
    -- maintenance: 维护公告
    -- event: 活动公告
    type VARCHAR(50) NOT NULL DEFAULT 'notice',

    -- 目标受众
    -- all: 所有用户
    -- student: 学生
    -- teacher: 教师
    -- admin: 管理员
    target_audience VARCHAR(50) DEFAULT 'all',

    -- 适用范围（可指定区域或学校）
    target_district_id INTEGER REFERENCES districts(id),
    target_school_id INTEGER REFERENCES schools(id),

    -- 显示设置
    is_pinned BOOLEAN DEFAULT FALSE,  -- 是否置顶
    is_popup BOOLEAN DEFAULT FALSE,   -- 是否弹窗显示

    -- 状态
    status VARCHAR(20) DEFAULT 'draft',  -- draft, published, archived
    published_at TIMESTAMP,

    -- 有效期
    start_time TIMESTAMP,
    end_time TIMESTAMP,

    -- 创建者
    created_by INTEGER REFERENCES users(id),

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_system_announcements_status ON system_announcements(status);
CREATE INDEX idx_system_announcements_target ON system_announcements(target_audience);
CREATE INDEX idx_system_announcements_published ON system_announcements(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_system_announcements_pinned ON system_announcements(is_pinned, published_at DESC) WHERE status = 'published';

-- =====================================================
-- 3. 公告已读记录表
-- 追踪用户已读的公告
-- =====================================================

CREATE TABLE IF NOT EXISTS announcement_reads (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER NOT NULL REFERENCES system_announcements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束：每个用户对每个公告只有一条记录
    UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);

-- =====================================================
-- 4. 通知模板表
-- 存储可复用的通知模板
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,

    -- 模板标识
    code VARCHAR(100) NOT NULL UNIQUE,  -- 如 'assessment_published', 'registration_confirmed'
    name VARCHAR(200) NOT NULL,

    -- 模板内容（支持变量占位符，如 {{activity_name}}）
    title_template VARCHAR(200) NOT NULL,
    content_template TEXT NOT NULL,

    -- 通知类型
    type VARCHAR(50) NOT NULL DEFAULT 'system',

    -- 默认优先级
    default_priority INTEGER DEFAULT 3,

    -- 是否启用
    is_active BOOLEAN DEFAULT TRUE,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. 用户通知偏好设置表
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- 各类通知开关
    enable_system BOOLEAN DEFAULT TRUE,
    enable_activity BOOLEAN DEFAULT TRUE,
    enable_achievement BOOLEAN DEFAULT TRUE,
    enable_reminder BOOLEAN DEFAULT TRUE,
    enable_announcement BOOLEAN DEFAULT TRUE,

    -- 通知方式（预留）
    enable_email BOOLEAN DEFAULT FALSE,
    enable_sms BOOLEAN DEFAULT FALSE,
    enable_push BOOLEAN DEFAULT TRUE,

    -- 免打扰时段（预留）
    quiet_hours_start TIME,
    quiet_hours_end TIME,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. 插入默认通知模板
-- =====================================================

INSERT INTO notification_templates (code, name, title_template, content_template, type, default_priority) VALUES
-- 测评活动相关
('assessment_published', '测评发布通知', '新测评发布：{{activity_title}}', '{{activity_title}} 已发布，报名时间：{{registration_start}} - {{registration_end}}，请及时报名参加。', 'activity', 4),
('registration_confirmed', '报名确认通知', '报名成功：{{activity_title}}', '您已成功报名 {{activity_title}}{{#location}}，测评地点：{{location}}{{/location}}。请在测评开始前做好准备。', 'activity', 4),
('registration_rejected', '报名拒绝通知', '报名未通过：{{activity_title}}', '很抱歉，您的 {{activity_title}} 报名申请未通过。{{#reason}}原因：{{reason}}{{/reason}}', 'activity', 4),
('registration_cancelled', '报名取消通知', '报名已取消：{{activity_title}}', '您的 {{activity_title}} 报名已取消。{{#reason}}原因：{{reason}}{{/reason}}', 'activity', 3),
('assessment_reminder', '测评提醒', '测评即将开始：{{activity_title}}', '{{activity_title}} 将于 {{start_time}} 开始，请提前做好准备。{{#location}}测评地点：{{location}}{{/location}}', 'reminder', 5),

-- 成就相关
('achievement_unlocked', '成就解锁通知', '恭喜获得成就：{{achievement_name}}', '您已解锁成就「{{achievement_name}}」！{{#description}}{{description}}{{/description}} 继续加油！', 'achievement', 3),

-- 题目审核相关
('question_approved', '题目审核通过', '题目审核通过：{{question_code}}', '您提交的题目（编号：{{question_code}}）已审核通过，将进入题库供使用。', 'system', 3),
('question_rejected', '题目审核未通过', '题目审核未通过：{{question_code}}', '您提交的题目（编号：{{question_code}}）审核未通过。{{#reason}}原因：{{reason}}{{/reason}} 请修改后重新提交。', 'system', 3),

-- 系统通知
('welcome', '欢迎通知', '欢迎加入贵阳市小学生测评平台', '欢迎您加入贵阳市小学生测评平台！在这里您可以参加各类学科测评，提升学习能力。祝您学习进步！', 'system', 3),
('password_changed', '密码修改通知', '密码已修改', '您的账户密码已成功修改。如非本人操作，请立即联系管理员。', 'system', 5)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    title_template = EXCLUDED.title_template,
    content_template = EXCLUDED.content_template,
    type = EXCLUDED.type,
    default_priority = EXCLUDED.default_priority,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 7. 添加触发器：自动更新 updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_system_announcements_updated
    BEFORE UPDATE ON system_announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER trigger_notification_templates_updated
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER trigger_notification_preferences_updated
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

-- =====================================================
-- 8. 清理旧的未使用的 announcements 表（如果存在）
-- =====================================================

-- 检查并迁移旧数据（如果有）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
        -- 如果旧表有数据，可以考虑迁移
        -- INSERT INTO system_announcements (title, content, type, target_audience, is_pinned, created_by, published_at, created_at)
        -- SELECT title, content, COALESCE(type, 'notice'), COALESCE(target_audience, 'all'), is_pinned, created_by, published_at, created_at
        -- FROM announcements;

        -- 删除旧表
        DROP TABLE IF EXISTS announcements CASCADE;
        RAISE NOTICE 'Old announcements table dropped and replaced with system_announcements';
    END IF;
END $$;

-- =====================================================
-- 完成
-- =====================================================

COMMENT ON TABLE user_notifications IS '用户通知表 - 存储发送给用户的个人通知';
COMMENT ON TABLE system_announcements IS '系统公告表 - 存储全局公告信息';
COMMENT ON TABLE announcement_reads IS '公告已读记录表 - 追踪用户已读的公告';
COMMENT ON TABLE notification_templates IS '通知模板表 - 存储可复用的通知模板';
COMMENT ON TABLE notification_preferences IS '用户通知偏好设置表';
