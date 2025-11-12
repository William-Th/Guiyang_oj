-- 创建白云区区级管理员并赋予审核权限

-- 1. 创建白云区区级管理员用户（密码：password123）
INSERT INTO users (username, password, role, real_name, phone, email, status)
VALUES (
    'baiyun_admin',
    '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', -- password123
    'district_admin',
    '白云区教育局管理员',
    '13800138888',
    'baiyun_admin@guiyang.edu.cn',
    'active'
)
ON CONFLICT (username) DO NOTHING;

-- 2. 获取刚创建的管理员ID（如果已存在则查询）
DO $$
DECLARE
    admin_user_id INTEGER;
    baiyun_district_id INTEGER;
BEGIN
    -- 获取白云区的district_id
    SELECT id INTO baiyun_district_id FROM districts WHERE name = '白云区';

    -- 获取管理员用户ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'baiyun_admin';

    -- 3. 在admin_permissions表中添加权限记录
    INSERT INTO admin_permissions (user_id, district_id, permission_scope)
    VALUES (
        admin_user_id,
        baiyun_district_id,
        '{
            "review_subjects": ["数学", "信息科技"],
            "can_review_questions": true,
            "can_approve_questions": true,
            "can_reject_questions": true,
            "can_manage_teachers": true,
            "can_view_statistics": true
        }'::jsonb
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '白云区管理员创建成功！用户ID: %, 区域ID: %', admin_user_id, baiyun_district_id;
END $$;

-- 4. 验证创建结果
SELECT
    u.id,
    u.username,
    u.real_name,
    u.role,
    ap.district_id,
    d.name as district_name,
    ap.permission_scope
FROM users u
LEFT JOIN admin_permissions ap ON u.id = ap.user_id
LEFT JOIN districts d ON ap.district_id = d.id
WHERE u.username = 'baiyun_admin';
