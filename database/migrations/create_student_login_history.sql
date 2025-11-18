/**
 * 创建学生登录历史表
 *
 * 目的：
 * 1. 记录学生每次登录的详细信息
 * 2. 支持连续登录天数检测（用于成就系统）
 * 3. 支持首次登录检测
 * 4. 提供登录行为分析数据
 *
 * 创建日期: 2025-11-14
 */

BEGIN;

-- ============================================
-- 创建登录历史表
-- ============================================
CREATE TABLE IF NOT EXISTS student_login_history (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    login_date DATE NOT NULL DEFAULT CURRENT_DATE,
    login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    login_method VARCHAR(50) DEFAULT 'username',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束
    CONSTRAINT fk_student_login_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_login_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 创建索引以提升查询性能
-- ============================================

-- 学生ID索引（用于查询特定学生的登录历史）
CREATE INDEX IF NOT EXISTS idx_student_login_history_student_id
    ON student_login_history(student_id);

-- 用户ID索引
CREATE INDEX IF NOT EXISTS idx_student_login_history_user_id
    ON student_login_history(user_id);

-- 登录日期索引（用于连续登录检测）
CREATE INDEX IF NOT EXISTS idx_student_login_history_login_date
    ON student_login_history(login_date);

-- 组合索引：学生ID + 登录日期（用于快速检测连续登录）
CREATE INDEX IF NOT EXISTS idx_student_login_history_student_date
    ON student_login_history(student_id, login_date DESC);

-- ============================================
-- 添加唯一约束：每天每个学生只记录一次登录
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_login_unique_daily
    ON student_login_history(student_id, login_date);

-- ============================================
-- 添加注释
-- ============================================
COMMENT ON TABLE student_login_history IS '学生登录历史记录表，用于成就系统和行为分析';
COMMENT ON COLUMN student_login_history.student_id IS '学生ID（students.id）';
COMMENT ON COLUMN student_login_history.user_id IS '用户ID（users.id）';
COMMENT ON COLUMN student_login_history.login_date IS '登录日期（用于检测连续天数）';
COMMENT ON COLUMN student_login_history.login_time IS '登录时间（精确到秒）';
COMMENT ON COLUMN student_login_history.login_method IS '登录方式：username/phone/idCard';
COMMENT ON COLUMN student_login_history.ip_address IS 'IP地址';
COMMENT ON COLUMN student_login_history.user_agent IS '用户代理字符串';

COMMIT;

-- ============================================
-- 验证表创建
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'student_login_history'
    ) THEN
        RAISE NOTICE '✅ 登录历史表创建成功';

        -- 统计索引数量
        RAISE NOTICE '✅ 已创建 % 个索引', (
            SELECT COUNT(*)
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename = 'student_login_history'
        );
    ELSE
        RAISE WARNING '❌ 登录历史表创建失败';
    END IF;
END$$;
