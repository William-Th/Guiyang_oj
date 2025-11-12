-- =====================================================
-- 成就系统与积分系统 - 数据库迁移脚本
-- =====================================================
-- 迁移编号: 020
-- 创建日期: 2025-11-09
-- 描述: 创建成就系统和积分系统所需的所有数据表
-- 依赖: 需要现有的 students, teachers, users 表
-- =====================================================

-- =====================================================
-- 1. 成就系统表
-- =====================================================

-- 1.1 成就定义表
-- 存储所有成就的定义和规则配置
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id SERIAL PRIMARY KEY,
    achievement_code VARCHAR(50) UNIQUE NOT NULL,          -- 成就代码（唯一标识）如: FIRST_BLOOD
    achievement_name VARCHAR(100) NOT NULL,                -- 成就名称
    achievement_desc TEXT,                                 -- 成就描述
    achievement_icon VARCHAR(255),                         -- 成就图标URL
    category VARCHAR(50) NOT NULL,                         -- 成就分类: exam_certification/learning_growth/social_collaboration/special_event
    subcategory VARCHAR(50),                               -- 子分类
    rarity VARCHAR(20) NOT NULL DEFAULT 'common',          -- 稀有度: common/rare/epic/legendary/mythic
    points_reward INTEGER NOT NULL DEFAULT 0,              -- 积分奖励
    trigger_condition JSON NOT NULL,                       -- 触发条件（JSON格式，包含trigger_mode, condition_type等）
    is_hidden BOOLEAN DEFAULT FALSE,                       -- 是否隐藏成就（在获得前不显示）
    is_active BOOLEAN DEFAULT TRUE,                        -- 是否启用
    max_times INTEGER DEFAULT 1,                           -- 最多获得次数（1=只能获得一次）
    cooldown_days INTEGER,                                 -- 冷却天数
    valid_from TIMESTAMP,                                  -- 生效开始时间
    valid_to TIMESTAMP,                                    -- 生效结束时间
    display_order INTEGER DEFAULT 0,                       -- 显示顺序
    created_by INTEGER REFERENCES users(id),               -- 创建者
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 检查约束
    CONSTRAINT check_rarity CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    CONSTRAINT check_category CHECK (category IN ('exam_certification', 'learning_growth', 'social_collaboration', 'special_event')),
    CONSTRAINT check_points_reward CHECK (points_reward >= 0)
);

-- 索引
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_active ON achievements(is_active);
CREATE INDEX idx_achievements_display_order ON achievements(display_order);

-- 注释
COMMENT ON TABLE achievements IS '成就定义表';
COMMENT ON COLUMN achievements.achievement_code IS '成就唯一代码';
COMMENT ON COLUMN achievements.trigger_condition IS '触发条件JSON，包含trigger_mode, trigger_frequency, condition_type等';
COMMENT ON COLUMN achievements.rarity IS '稀有度：common(普通)/rare(稀有)/epic(史诗)/legendary(传说)/mythic(神话)';

-- =====================================================

-- 1.2 学生成就记录表
-- 记录学生获得的成就
CREATE TABLE IF NOT EXISTS student_achievements (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 获得时间
    points_awarded INTEGER NOT NULL DEFAULT 0,             -- 获得的积分
    is_displayed BOOLEAN DEFAULT TRUE,                     -- 是否在成就墙展示
    display_order INTEGER DEFAULT 0,                       -- 成就墙展示顺序
    times_achieved INTEGER DEFAULT 1,                      -- 获得次数（如果可重复获得）

    -- 唯一约束：同一学生同一成就（如果max_times=1）
    UNIQUE(student_id, achievement_id)
);

-- 索引
CREATE INDEX idx_student_achievements_student ON student_achievements(student_id);
CREATE INDEX idx_student_achievements_achievement ON student_achievements(achievement_id);
CREATE INDEX idx_student_achievements_time ON student_achievements(achieved_at DESC);
CREATE INDEX idx_student_achievements_composite ON student_achievements(student_id, achievement_id);

-- 注释
COMMENT ON TABLE student_achievements IS '学生成就记录表';
COMMENT ON COLUMN student_achievements.is_displayed IS '是否在个人成就墙展示';

-- =====================================================

-- 1.3 成就进度表
-- 跟踪学生正在进行中的成就进度
CREATE TABLE IF NOT EXISTS achievement_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    current_value DECIMAL(10,2) DEFAULT 0,                 -- 当前进度值
    target_value DECIMAL(10,2) NOT NULL,                   -- 目标值
    progress_percentage INTEGER DEFAULT 0,                 -- 进度百分比（0-100）
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束
    UNIQUE(student_id, achievement_id)
);

-- 索引
CREATE INDEX idx_achievement_progress_student ON achievement_progress(student_id);
CREATE INDEX idx_achievement_progress_achievement ON achievement_progress(achievement_id);
CREATE INDEX idx_achievement_progress_percentage ON achievement_progress(progress_percentage);

-- 注释
COMMENT ON TABLE achievement_progress IS '成就进度跟踪表';
COMMENT ON COLUMN achievement_progress.progress_percentage IS '进度百分比，自动计算 = (current_value / target_value) * 100';

-- =====================================================

-- 1.4 成就规则版本表
-- 记录成就规则的历史版本，支持版本回滚
CREATE TABLE IF NOT EXISTS achievement_rule_versions (
    version_id SERIAL PRIMARY KEY,
    achievement_id INTEGER NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,                   -- 版本号: v1.0.0
    rule_config JSON NOT NULL,                             -- 规则配置JSON
    change_description TEXT,                               -- 变更说明
    created_by INTEGER REFERENCES users(id),               -- 创建者
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,                       -- 是否为当前激活版本

    -- 唯一约束
    UNIQUE(achievement_id, version_number)
);

-- 索引
CREATE INDEX idx_achievement_versions_achievement ON achievement_rule_versions(achievement_id);
CREATE INDEX idx_achievement_versions_active ON achievement_rule_versions(is_active);

-- 注释
COMMENT ON TABLE achievement_rule_versions IS '成就规则版本管理表';

-- =====================================================
-- 2. 积分系统表
-- =====================================================

-- 2.1 学生积分账户表
-- 每个学生一条记录，存储积分余额
CREATE TABLE IF NOT EXISTS student_points (
    student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    current_points INTEGER DEFAULT 0 NOT NULL,             -- 当前可用积分
    total_points INTEGER DEFAULT 0 NOT NULL,               -- 总累计积分（永久记录）
    spent_points INTEGER DEFAULT 0 NOT NULL,               -- 已消费积分
    frozen_points INTEGER DEFAULT 0 NOT NULL,              -- 冻结积分（兑换处理中）
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 检查约束
    CONSTRAINT check_current_points CHECK (current_points >= 0),
    CONSTRAINT check_total_points CHECK (total_points >= 0),
    CONSTRAINT check_spent_points CHECK (spent_points >= 0),
    CONSTRAINT check_frozen_points CHECK (frozen_points >= 0),
    CONSTRAINT check_points_balance CHECK (current_points = total_points - spent_points - frozen_points)
);

-- 索引
CREATE INDEX idx_student_points_current ON student_points(current_points DESC);
CREATE INDEX idx_student_points_total ON student_points(total_points DESC);

-- 注释
COMMENT ON TABLE student_points IS '学生积分账户表';
COMMENT ON COLUMN student_points.current_points IS '当前可用积分 = 总积分 - 已消费 - 冻结';
COMMENT ON COLUMN student_points.total_points IS '历史累计获得的所有积分（永久记录）';

-- =====================================================

-- 2.2 积分交易明细表
-- 记录所有积分变动的明细
CREATE TABLE IF NOT EXISTS points_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    points_change INTEGER NOT NULL,                        -- 积分变动（正数=获得，负数=消费）
    transaction_type VARCHAR(50) NOT NULL,                 -- 类型: achievement/daily_task/activity/redemption/manual
    source_id INTEGER,                                     -- 来源ID（成就ID/任务ID/商品ID等）
    source_type VARCHAR(50),                               -- 来源类型
    description TEXT,                                      -- 描述
    balance_before INTEGER NOT NULL,                       -- 交易前余额
    balance_after INTEGER NOT NULL,                        -- 交易后余额
    expires_at TIMESTAMP,                                  -- 积分过期时间（NULL=永久有效）
    is_expired BOOLEAN DEFAULT FALSE,                      -- 是否已过期
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 检查约束
    CONSTRAINT check_transaction_type CHECK (transaction_type IN ('achievement', 'daily_task', 'activity', 'redemption', 'manual', 'teacher_reward', 'expired'))
);

-- 索引
CREATE INDEX idx_points_transactions_student ON points_transactions(student_id);
CREATE INDEX idx_points_transactions_time ON points_transactions(created_at DESC);
CREATE INDEX idx_points_transactions_type ON points_transactions(transaction_type);
CREATE INDEX idx_points_transactions_source ON points_transactions(source_type, source_id);
CREATE INDEX idx_points_transactions_expires ON points_transactions(expires_at) WHERE expires_at IS NOT NULL;

-- 注释
COMMENT ON TABLE points_transactions IS '积分交易明细表';
COMMENT ON COLUMN points_transactions.points_change IS '积分变动：正数表示获得，负数表示消费';
COMMENT ON COLUMN points_transactions.transaction_type IS '交易类型：achievement(成就)/daily_task(日常任务)/redemption(商城兑换)/manual(手动调整)';

-- =====================================================
-- 3. 积分商城表
-- =====================================================

-- 3.1 商城商品表
CREATE TABLE IF NOT EXISTS points_shop_items (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,                       -- 商品名称
    item_desc TEXT,                                        -- 商品描述
    item_image VARCHAR(255),                               -- 商品图片URL
    category VARCHAR(50) NOT NULL,                         -- 分类: physical/virtual/privilege
    points_price INTEGER NOT NULL,                         -- 积分价格
    stock_quantity INTEGER,                                -- 库存数量（NULL=无限供应）
    monthly_limit INTEGER,                                 -- 每月限购数量（NULL=不限制）
    is_active BOOLEAN DEFAULT TRUE,                        -- 是否上架
    validity_days INTEGER,                                 -- 有效期（天数，用于虚拟商品）
    extra_data JSON,                                       -- 额外数据（如虚拟商品的配置）
    display_order INTEGER DEFAULT 0,                       -- 显示顺序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 检查约束
    CONSTRAINT check_category CHECK (category IN ('physical', 'virtual', 'privilege')),
    CONSTRAINT check_points_price CHECK (points_price > 0),
    CONSTRAINT check_stock CHECK (stock_quantity IS NULL OR stock_quantity >= 0)
);

-- 索引
CREATE INDEX idx_shop_items_category ON points_shop_items(category);
CREATE INDEX idx_shop_items_price ON points_shop_items(points_price);
CREATE INDEX idx_shop_items_active ON points_shop_items(is_active);
CREATE INDEX idx_shop_items_order ON points_shop_items(display_order);

-- 注释
COMMENT ON TABLE points_shop_items IS '积分商城商品表';
COMMENT ON COLUMN points_shop_items.category IS '商品分类：physical(实物)/virtual(虚拟)/privilege(特权)';
COMMENT ON COLUMN points_shop_items.stock_quantity IS '库存数量，NULL表示无限供应';

-- =====================================================

-- 3.2 兑换订单表
CREATE TABLE IF NOT EXISTS redemption_orders (
    order_id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,              -- 订单编号: RO202511090001
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES points_shop_items(item_id),
    item_name VARCHAR(100) NOT NULL,                       -- 冗余商品名称（防止商品被删除）
    item_category VARCHAR(50) NOT NULL,                    -- 冗余商品分类
    points_spent INTEGER NOT NULL,                         -- 消费积分
    status VARCHAR(20) NOT NULL DEFAULT 'pending',         -- 状态: pending/processing/shipped/completed/cancelled
    shipping_address TEXT,                                 -- 收货地址（实物商品）
    contact_phone VARCHAR(20),                             -- 联系电话
    tracking_number VARCHAR(100),                          -- 物流单号
    notes TEXT,                                            -- 备注
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_at TIMESTAMP,                               -- 处理时间
    shipped_at TIMESTAMP,                                  -- 发货时间
    completed_at TIMESTAMP,                                -- 完成时间
    cancelled_at TIMESTAMP,                                -- 取消时间
    cancel_reason TEXT,                                    -- 取消原因

    -- 检查约束
    CONSTRAINT check_order_status CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
    CONSTRAINT check_points_spent CHECK (points_spent > 0)
);

-- 索引
CREATE INDEX idx_redemption_orders_student ON redemption_orders(student_id);
CREATE INDEX idx_redemption_orders_status ON redemption_orders(status);
CREATE INDEX idx_redemption_orders_time ON redemption_orders(created_at DESC);
CREATE INDEX idx_redemption_orders_number ON redemption_orders(order_number);

-- 注释
COMMENT ON TABLE redemption_orders IS '积分兑换订单表';
COMMENT ON COLUMN redemption_orders.status IS '订单状态：pending(待处理)/processing(处理中)/shipped(已发货)/completed(已完成)/cancelled(已取消)';

-- =====================================================
-- 4. 日常任务表
-- =====================================================

-- 4.1 日常任务定义表
CREATE TABLE IF NOT EXISTS daily_tasks (
    task_id SERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE NOT NULL,                 -- 任务代码: DAILY_LOGIN
    task_name VARCHAR(100) NOT NULL,                       -- 任务名称
    task_desc TEXT,                                        -- 任务描述
    task_icon VARCHAR(255),                                -- 任务图标
    points_reward INTEGER NOT NULL DEFAULT 0,              -- 积分奖励
    task_type VARCHAR(50) NOT NULL,                        -- 任务类型: daily/weekly/monthly
    trigger_condition JSON NOT NULL,                       -- 完成条件（JSON格式）
    target_value INTEGER NOT NULL DEFAULT 1,               -- 目标值
    is_active BOOLEAN DEFAULT TRUE,                        -- 是否启用
    display_order INTEGER DEFAULT 0,                       -- 显示顺序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 检查约束
    CONSTRAINT check_task_type CHECK (task_type IN ('daily', 'weekly', 'monthly')),
    CONSTRAINT check_task_points CHECK (points_reward >= 0),
    CONSTRAINT check_target_value CHECK (target_value > 0)
);

-- 索引
CREATE INDEX idx_daily_tasks_type ON daily_tasks(task_type);
CREATE INDEX idx_daily_tasks_active ON daily_tasks(is_active);

-- 注释
COMMENT ON TABLE daily_tasks IS '日常任务定义表';
COMMENT ON COLUMN daily_tasks.task_type IS '任务类型：daily(每日)/weekly(每周)/monthly(每月)';

-- =====================================================

-- 4.2 学生任务完成记录表
CREATE TABLE IF NOT EXISTS student_daily_tasks (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES daily_tasks(task_id) ON DELETE CASCADE,
    task_date DATE NOT NULL,                               -- 任务日期（每日重置）
    is_completed BOOLEAN DEFAULT FALSE,                    -- 是否完成
    completed_at TIMESTAMP,                                -- 完成时间
    progress_value INTEGER DEFAULT 0,                      -- 当前进度值
    target_value INTEGER NOT NULL,                         -- 目标值
    points_awarded INTEGER DEFAULT 0,                      -- 已奖励积分

    -- 唯一约束：同一学生同一天同一任务只有一条记录
    UNIQUE(student_id, task_id, task_date)
);

-- 索引
CREATE INDEX idx_student_daily_tasks_student_date ON student_daily_tasks(student_id, task_date);
CREATE INDEX idx_student_daily_tasks_task ON student_daily_tasks(task_id);
CREATE INDEX idx_student_daily_tasks_completed ON student_daily_tasks(is_completed);

-- 注释
COMMENT ON TABLE student_daily_tasks IS '学生日常任务完成记录表';
COMMENT ON COLUMN student_daily_tasks.task_date IS '任务日期，每日凌晨重置';

-- =====================================================
-- 5. 排行榜表
-- =====================================================

-- 5.1 排行榜缓存表
-- 用于缓存各类排行榜数据，提升查询性能
CREATE TABLE IF NOT EXISTS leaderboards (
    id BIGSERIAL PRIMARY KEY,
    leaderboard_type VARCHAR(50) NOT NULL,                 -- 类型: weekly/monthly/total/school/class
    scope VARCHAR(100),                                    -- 范围: school_id/class_id/city等
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(100),                             -- 冗余学生姓名
    school_name VARCHAR(200),                              -- 冗余学校名称
    class_name VARCHAR(100),                               -- 冗余班级名称
    points INTEGER NOT NULL,                               -- 积分
    rank INTEGER NOT NULL,                                 -- 排名
    rank_change INTEGER,                                   -- 排名变化（相比上期）
    period_start DATE,                                     -- 周期开始
    period_end DATE,                                       -- 周期结束
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束
    UNIQUE(leaderboard_type, scope, student_id, period_start),

    -- 检查约束
    CONSTRAINT check_leaderboard_type CHECK (leaderboard_type IN ('weekly', 'monthly', 'total', 'school', 'class')),
    CONSTRAINT check_rank CHECK (rank > 0)
);

-- 索引
CREATE INDEX idx_leaderboard_type_scope ON leaderboards(leaderboard_type, scope);
CREATE INDEX idx_leaderboard_rank ON leaderboards(leaderboard_type, scope, rank);
CREATE INDEX idx_leaderboard_period ON leaderboards(period_start, period_end);
CREATE INDEX idx_leaderboard_student ON leaderboards(student_id);

-- 注释
COMMENT ON TABLE leaderboards IS '排行榜缓存表';
COMMENT ON COLUMN leaderboards.leaderboard_type IS '排行榜类型：weekly(周榜)/monthly(月榜)/total(总榜)/school(校内)/class(班级)';

-- =====================================================
-- 6. 触发器和函数
-- =====================================================

-- 6.1 自动更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6.2 为需要的表添加触发器
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_items_updated_at BEFORE UPDATE ON points_shop_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_tasks_updated_at BEFORE UPDATE ON daily_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 6.3 自动更新成就进度百分比的函数
CREATE OR REPLACE FUNCTION update_achievement_progress_percentage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_value > 0 THEN
        NEW.progress_percentage := LEAST(100, ROUND((NEW.current_value / NEW.target_value * 100)::NUMERIC, 0));
    ELSE
        NEW.progress_percentage := 0;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6.4 添加触发器
CREATE TRIGGER update_progress_percentage BEFORE INSERT OR UPDATE ON achievement_progress
    FOR EACH ROW EXECUTE FUNCTION update_achievement_progress_percentage();

-- =====================================================

-- 6.5 自动更新学生积分账户 last_updated 的函数
CREATE OR REPLACE FUNCTION update_student_points_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6.6 添加触发器
CREATE TRIGGER update_points_timestamp BEFORE UPDATE ON student_points
    FOR EACH ROW EXECUTE FUNCTION update_student_points_timestamp();

-- =====================================================
-- 7. 初始化数据
-- =====================================================

-- 7.1 初始化所有学生的积分账户
INSERT INTO student_points (student_id, current_points, total_points, spent_points, frozen_points)
SELECT id, 0, 0, 0, 0
FROM students
ON CONFLICT (student_id) DO NOTHING;

-- =====================================================
-- 8. 权限设置（可选）
-- =====================================================

-- 根据实际需要设置表权限
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO backend_app;

-- =====================================================
-- 迁移完成
-- =====================================================

-- 验证迁移
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'achievements',
          'student_achievements',
          'achievement_progress',
          'achievement_rule_versions',
          'student_points',
          'points_transactions',
          'points_shop_items',
          'redemption_orders',
          'daily_tasks',
          'student_daily_tasks',
          'leaderboards'
      );

    IF table_count = 11 THEN
        RAISE NOTICE '✅ 成就系统迁移成功：11个表全部创建完成';
    ELSE
        RAISE WARNING '⚠️ 成就系统迁移可能不完整：只找到 % 个表', table_count;
    END IF;
END $$;
