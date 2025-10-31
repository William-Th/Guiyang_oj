-- =========================================================================
-- 006_student_registration_system.sql
-- 学生注册申请和分级审核系统
--
-- 功能:
-- 1. 创建学生注册申请表
-- 2. 创建审核日志表
-- 3. 实现分级审核机制（学校 -> 区县 -> 市级）
-- 4. 自动升级机制（超过3天自动升级到上级管理员）
--
-- 执行时间: 2025-10-27
-- =========================================================================

BEGIN;

-- =========================================================================
-- Part 1: 创建学生注册申请表
-- =========================================================================

CREATE TABLE IF NOT EXISTS student_registration_requests (
  id SERIAL PRIMARY KEY,

  -- 申请信息
  phone VARCHAR(11) UNIQUE NOT NULL,          -- 手机号（登录账号）
  real_name VARCHAR(100) NOT NULL,            -- 真实姓名
  birth_date DATE NOT NULL,                   -- 出生日期
  id_card_last4 VARCHAR(4) NOT NULL,          -- 身份证后4位

  -- 学校信息
  district_id INTEGER REFERENCES districts(id), -- 区县ID（外键）
  district_code VARCHAR(20) NOT NULL,         -- 区县代码（如 YY, NM）
  district_name VARCHAR(100) NOT NULL,        -- 区县名称
  school_id INTEGER REFERENCES schools(id),   -- 学校ID（外键）
  school_code VARCHAR(50) NOT NULL,           -- 学校代码（如 YY-PS-01）
  school_name VARCHAR(200) NOT NULL,          -- 学校名称
  grade VARCHAR(20),                          -- 年级

  -- 审核状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending: 待审核
    -- approved: 已批准
    -- rejected: 已拒绝

  current_reviewer_level INTEGER NOT NULL DEFAULT 2,
    -- 当前审核层级:
    -- 2 = 校级管理员 (school_admin)
    -- 3 = 区县级管理员 (district_admin)
    -- 4 = 市级管理员 (municipal_admin)

  current_reviewer_id INTEGER REFERENCES users(id), -- 当前审核人ID

  -- 审核历史
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 提交时间
  last_escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 最后升级时间（用于计算3天期限）
  reviewed_at TIMESTAMP,                               -- 审核完成时间
  reviewed_by INTEGER REFERENCES users(id),            -- 审核人ID
  review_comment TEXT,                                 -- 审核意见

  -- 学生账号（审核通过后创建）
  student_user_id INTEGER REFERENCES users(id),

  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_registration_status ON student_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_reviewer ON student_registration_requests(current_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_registration_school ON student_registration_requests(school_code);
CREATE INDEX IF NOT EXISTS idx_registration_district ON student_registration_requests(district_code);
CREATE INDEX IF NOT EXISTS idx_registration_escalation ON student_registration_requests(last_escalated_at, status);
CREATE INDEX IF NOT EXISTS idx_registration_phone ON student_registration_requests(phone);

-- 添加注释
COMMENT ON TABLE student_registration_requests IS '学生注册申请表，记录学生自主注册申请信息';
COMMENT ON COLUMN student_registration_requests.current_reviewer_level IS '当前审核层级: 2=校级, 3=区县级, 4=市级';
COMMENT ON COLUMN student_registration_requests.last_escalated_at IS '最后升级时间，用于计算3天自动升级';

-- =========================================================================
-- Part 2: 创建审核日志表
-- =========================================================================

CREATE TABLE IF NOT EXISTS registration_audit_log (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES student_registration_requests(id) ON DELETE CASCADE,

  -- 操作信息
  action VARCHAR(50) NOT NULL,
    -- 可能的操作:
    -- 'submitted': 提交申请
    -- 'escalated': 手动升级
    -- 'auto_escalated': 自动升级（3天未审核）
    -- 'approved': 批准
    -- 'rejected': 拒绝
    -- 'assigned': 分配审核人

  action_by INTEGER REFERENCES users(id),  -- 操作人ID（系统自动操作时为NULL）
  action_level INTEGER NOT NULL,           -- 操作层级: 0=系统自动, 2=校级, 3=区县级, 4=市级

  -- 审核意见
  comment TEXT,

  -- 元数据（JSON格式存储额外信息）
  metadata JSONB,
    -- 示例: {"reason": "超过3天未审核", "from_level": 2, "to_level": 3}

  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_audit_request ON registration_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON registration_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON registration_audit_log(action);

-- 添加注释
COMMENT ON TABLE registration_audit_log IS '注册审核日志表，记录所有审核操作历史';
COMMENT ON COLUMN registration_audit_log.action_level IS '操作层级: 0=系统, 2=校级, 3=区县级, 4=市级';
COMMENT ON COLUMN registration_audit_log.metadata IS 'JSON格式元数据，存储升级原因等额外信息';

-- =========================================================================
-- Part 3: 创建触发器函数 - 自动更新 updated_at
-- =========================================================================

-- 创建或替换触发器函数
CREATE OR REPLACE FUNCTION update_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_registration_updated_at ON student_registration_requests;
CREATE TRIGGER trigger_update_registration_updated_at
  BEFORE UPDATE ON student_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_updated_at();

-- =========================================================================
-- Part 4: 创建辅助函数 - 记录审核日志
-- =========================================================================

CREATE OR REPLACE FUNCTION log_registration_action(
  p_request_id INTEGER,
  p_action VARCHAR(50),
  p_action_by INTEGER,
  p_action_level INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO registration_audit_log (
    request_id, action, action_by, action_level, comment, metadata
  ) VALUES (
    p_request_id, p_action, p_action_by, p_action_level, p_comment, p_metadata
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_registration_action IS '记录注册审核操作日志的辅助函数';

-- =========================================================================
-- Part 5: 创建测试数据（可选，用于开发测试）
-- =========================================================================

-- 插入一条测试注册申请（仅在开发环境使用）
-- 注意: 生产环境应该删除此部分

-- 获取云岩区和云岩区第一小学的ID
DO $$
DECLARE
  v_district_id INTEGER;
  v_school_id INTEGER;
  v_request_id INTEGER;
BEGIN
  -- 获取云岩区ID
  SELECT id INTO v_district_id FROM districts WHERE code = 'YY';

  -- 获取云岩区第一小学ID
  SELECT id INTO v_school_id FROM schools WHERE code = 'YY-PS-01';

  -- 插入测试注册申请（仅当不存在时）
  INSERT INTO student_registration_requests (
    phone, real_name, birth_date, id_card_last4,
    district_id, district_code, district_name,
    school_id, school_code, school_name, grade,
    status, current_reviewer_level
  ) VALUES (
    '13800138000',
    '测试学生',
    '2015-05-15',
    '1234',
    v_district_id, 'YY', '云岩区',
    v_school_id, 'YY-PS-01', '云岩区第一小学', '二年级',
    'pending', 2
  )
  ON CONFLICT (phone) DO NOTHING
  RETURNING id INTO v_request_id;

  -- 记录提交日志
  IF v_request_id IS NOT NULL THEN
    PERFORM log_registration_action(
      v_request_id,
      'submitted',
      NULL,  -- 系统自动
      0,     -- 系统级别
      '测试学生提交注册申请',
      '{"test": true}'::jsonb
    );
  END IF;
END $$;

-- =========================================================================
-- Part 6: 数据验证查询
-- =========================================================================

-- 验证表创建成功
SELECT
  'student_registration_requests' as table_name,
  COUNT(*) as record_count
FROM student_registration_requests
UNION ALL
SELECT
  'registration_audit_log' as table_name,
  COUNT(*) as record_count
FROM registration_audit_log;

-- 验证索引创建
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('student_registration_requests', 'registration_audit_log')
ORDER BY tablename, indexname;

-- 验证测试数据
SELECT
  id,
  phone,
  real_name,
  school_name,
  status,
  current_reviewer_level,
  submitted_at
FROM student_registration_requests
LIMIT 5;

COMMIT;

-- =========================================================================
-- 迁移完成
-- =========================================================================
-- 本迁移脚本完成了以下工作:
-- ✅ 创建学生注册申请表 (student_registration_requests)
-- ✅ 创建审核日志表 (registration_audit_log)
-- ✅ 创建自动更新触发器
-- ✅ 创建审核日志辅助函数
-- ✅ 添加必要的索引和注释
-- ✅ 插入测试数据（可选）
--
-- 下一步:
-- 1. 开发后端API（注册申请、审核管理）
-- 2. 开发定时任务（自动升级机制）
-- 3. 开发配置服务（读取区县和学校配置）
-- 4. 开发前端页面（学生注册、管理员审核）
-- =========================================================================
