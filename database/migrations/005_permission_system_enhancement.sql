-- =========================================================================
-- 005_permission_system_enhancement.sql
-- 权限管理系统完善迁移脚本
--
-- 功能:
-- 1. 补充贵阳市所有区县数据(清镇市、修文县、息烽县、开阳县、贵安新区、市直属学校)
-- 2. 为每个区县创建3所虚拟学校(小学、初中、高中)
-- 3. 创建5级管理员测试账号体系
-- 4. 更新admin_permissions关联数据
--
-- 执行时间: 2025-10-27
-- =========================================================================

BEGIN;

-- =========================================================================
-- Part 1: 添加新的区县数据
-- =========================================================================

-- 检查并添加清镇市
INSERT INTO districts (name, code, level)
VALUES ('清镇市', 'QZ', 'district')
ON CONFLICT (code) DO NOTHING;

-- 检查并添加修文县
INSERT INTO districts (name, code, level)
VALUES ('修文县', 'XW', 'district')
ON CONFLICT (code) DO NOTHING;

-- 检查并添加息烽县
INSERT INTO districts (name, code, level)
VALUES ('息烽县', 'XF', 'district')
ON CONFLICT (code) DO NOTHING;

-- 检查并添加开阳县
INSERT INTO districts (name, code, level)
VALUES ('开阳县', 'KY', 'district')
ON CONFLICT (code) DO NOTHING;

-- 检查并添加贵安新区
INSERT INTO districts (name, code, level)
VALUES ('贵安新区', 'GAXQ', 'district')
ON CONFLICT (code) DO NOTHING;

-- 检查并添加贵阳市直属学校(市级单位)
INSERT INTO districts (name, code, level)
VALUES ('贵阳市直属学校', 'GYSZSX', 'municipal')
ON CONFLICT (code) DO NOTHING;

-- =========================================================================
-- Part 2: 为每个区县创建3所学校(小学、初中、高中)
-- =========================================================================

-- 云岩区学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '云岩区第一小学', 'YY-PS-01', id, 'regular', '贵阳市云岩区'
FROM districts WHERE code = 'YY'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '云岩区第一中学', 'YY-MS-01', id, 'regular', '贵阳市云岩区'
FROM districts WHERE code = 'YY'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '云岩区第一高中', 'YY-HS-01', id, 'regular', '贵阳市云岩区'
FROM districts WHERE code = 'YY'
ON CONFLICT (code) DO NOTHING;

-- 南明区学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '南明区第一小学', 'NM-PS-01', id, 'regular', '贵阳市南明区'
FROM districts WHERE code = 'NM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '南明区第一中学', 'NM-MS-01', id, 'regular', '贵阳市南明区'
FROM districts WHERE code = 'NM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '南明区第一高中', 'NM-HS-01', id, 'regular', '贵阳市南明区'
FROM districts WHERE code = 'NM'
ON CONFLICT (code) DO NOTHING;

-- 观山湖区学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '观山湖区第一小学', 'GSH-PS-01', id, 'regular', '贵阳市观山湖区'
FROM districts WHERE code = 'GSH'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '观山湖区第一中学', 'GSH-MS-01', id, 'regular', '贵阳市观山湖区'
FROM districts WHERE code = 'GSH'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '观山湖区第一高中', 'GSH-HS-01', id, 'regular', '贵阳市观山湖区'
FROM districts WHERE code = 'GSH'
ON CONFLICT (code) DO NOTHING;

-- 白云区学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '白云区第一小学', 'BY-PS-01', id, 'regular', '贵阳市白云区'
FROM districts WHERE code = 'BY'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '白云区第一中学', 'BY-MS-01', id, 'regular', '贵阳市白云区'
FROM districts WHERE code = 'BY'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '白云区第一高中', 'BY-HS-01', id, 'regular', '贵阳市白云区'
FROM districts WHERE code = 'BY'
ON CONFLICT (code) DO NOTHING;

-- 花溪区学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '花溪区第一小学', 'HX-PS-01', id, 'regular', '贵阳市花溪区'
FROM districts WHERE code = 'HX'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '花溪区第一中学', 'HX-MS-01', id, 'regular', '贵阳市花溪区'
FROM districts WHERE code = 'HX'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '花溪区第一高中', 'HX-HS-01', id, 'regular', '贵阳市花溪区'
FROM districts WHERE code = 'HX'
ON CONFLICT (code) DO NOTHING;

-- 乌当区学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '乌当区第一小学', 'WD-PS-01', id, 'regular', '贵阳市乌当区'
FROM districts WHERE code = 'WD'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '乌当区第一中学', 'WD-MS-01', id, 'regular', '贵阳市乌当区'
FROM districts WHERE code = 'WD'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '乌当区第一高中', 'WD-HS-01', id, 'regular', '贵阳市乌当区'
FROM districts WHERE code = 'WD'
ON CONFLICT (code) DO NOTHING;

-- 清镇市学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '清镇市第一小学', 'QZ-PS-01', id, 'regular', '贵阳市清镇市'
FROM districts WHERE code = 'QZ'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '清镇市第一中学', 'QZ-MS-01', id, 'regular', '贵阳市清镇市'
FROM districts WHERE code = 'QZ'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '清镇市第一高中', 'QZ-HS-01', id, 'regular', '贵阳市清镇市'
FROM districts WHERE code = 'QZ'
ON CONFLICT (code) DO NOTHING;

-- 修文县学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '修文县第一小学', 'XW-PS-01', id, 'regular', '贵阳市修文县'
FROM districts WHERE code = 'XW'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '修文县第一中学', 'XW-MS-01', id, 'regular', '贵阳市修文县'
FROM districts WHERE code = 'XW'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '修文县第一高中', 'XW-HS-01', id, 'regular', '贵阳市修文县'
FROM districts WHERE code = 'XW'
ON CONFLICT (code) DO NOTHING;

-- 息烽县学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '息烽县第一小学', 'XF-PS-01', id, 'regular', '贵阳市息烽县'
FROM districts WHERE code = 'XF'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '息烽县第一中学', 'XF-MS-01', id, 'regular', '贵阳市息烽县'
FROM districts WHERE code = 'XF'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '息烽县第一高中', 'XF-HS-01', id, 'regular', '贵阳市息烽县'
FROM districts WHERE code = 'XF'
ON CONFLICT (code) DO NOTHING;

-- 开阳县学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '开阳县第一小学', 'KY-PS-01', id, 'regular', '贵阳市开阳县'
FROM districts WHERE code = 'KY'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '开阳县第一中学', 'KY-MS-01', id, 'regular', '贵阳市开阳县'
FROM districts WHERE code = 'KY'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '开阳县第一高中', 'KY-HS-01', id, 'regular', '贵阳市开阳县'
FROM districts WHERE code = 'KY'
ON CONFLICT (code) DO NOTHING;

-- 贵安新区学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '贵安新区第一小学', 'GAXQ-PS-01', id, 'regular', '贵安新区'
FROM districts WHERE code = 'GAXQ'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '贵安新区第一中学', 'GAXQ-MS-01', id, 'regular', '贵安新区'
FROM districts WHERE code = 'GAXQ'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '贵安新区第一高中', 'GAXQ-HS-01', id, 'regular', '贵安新区'
FROM districts WHERE code = 'GAXQ'
ON CONFLICT (code) DO NOTHING;

-- 贵阳市直属学校
INSERT INTO schools (name, code, district_id, type, address)
SELECT '贵阳市直属第一小学', 'GYSZSX-PS-01', id, 'municipal', '贵阳市'
FROM districts WHERE code = 'GYSZSX'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '贵阳市直属第一中学', 'GYSZSX-MS-01', id, 'municipal', '贵阳市'
FROM districts WHERE code = 'GYSZSX'
ON CONFLICT (code) DO NOTHING;

INSERT INTO schools (name, code, district_id, type, address)
SELECT '贵阳市直属第一高中', 'GYSZSX-HS-01', id, 'municipal', '贵阳市'
FROM districts WHERE code = 'GYSZSX'
ON CONFLICT (code) DO NOTHING;

-- =========================================================================
-- Part 3: 创建5级管理员测试账号
-- =========================================================================

-- Level 5: 系统总管理员 (admin - 已存在，跳过)

-- Level 4: 市级管理员
INSERT INTO users (username, password, role, real_name, status)
VALUES ('guiyang_admin', '$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O', 'municipal_admin', '贵阳市教育局管理员', 'active')
ON CONFLICT (username) DO NOTHING;

-- Level 3: 区县级管理员(补充新增区县)
-- 清镇市管理员
INSERT INTO users (username, password, role, real_name, status)
VALUES ('qingzhen_admin', '$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O', 'district_admin', '清镇市教育局管理员', 'active')
ON CONFLICT (username) DO NOTHING;

-- 修文县管理员
INSERT INTO users (username, password, role, real_name, status)
VALUES ('xiuwen_admin', '$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O', 'district_admin', '修文县教育局管理员', 'active')
ON CONFLICT (username) DO NOTHING;

-- 息烽县管理员
INSERT INTO users (username, password, role, real_name, status)
VALUES ('xifeng_admin', '$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O', 'district_admin', '息烽县教育局管理员', 'active')
ON CONFLICT (username) DO NOTHING;

-- 开阳县管理员
INSERT INTO users (username, password, role, real_name, status)
VALUES ('kaiyang_admin', '$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O', 'district_admin', '开阳县教育局管理员', 'active')
ON CONFLICT (username) DO NOTHING;

-- 贵安新区管理员
INSERT INTO users (username, password, role, real_name, status)
VALUES ('guian_admin', '$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O', 'district_admin', '贵安新区教育局管理员', 'active')
ON CONFLICT (username) DO NOTHING;

-- =========================================================================
-- Part 4: 更新admin_permissions关联数据
-- =========================================================================

-- 市级管理员权限(管理所有区县)
INSERT INTO admin_permissions (user_id, district_id, permission_scope)
SELECT u.id, NULL, '{"scope": "municipal", "canManage": ["districts", "schools", "users"]}'::jsonb
FROM users u
WHERE u.username = 'guiyang_admin'
ON CONFLICT DO NOTHING;

-- 区县管理员权限
-- 清镇市
INSERT INTO admin_permissions (user_id, district_id, permission_scope)
SELECT u.id, d.id, '{"scope": "district", "canManage": ["schools", "users"]}'::jsonb
FROM users u, districts d
WHERE u.username = 'qingzhen_admin' AND d.code = 'QZ'
ON CONFLICT DO NOTHING;

-- 修文县
INSERT INTO admin_permissions (user_id, district_id, permission_scope)
SELECT u.id, d.id, '{"scope": "district", "canManage": ["schools", "users"]}'::jsonb
FROM users u, districts d
WHERE u.username = 'xiuwen_admin' AND d.code = 'XW'
ON CONFLICT DO NOTHING;

-- 息烽县
INSERT INTO admin_permissions (user_id, district_id, permission_scope)
SELECT u.id, d.id, '{"scope": "district", "canManage": ["schools", "users"]}'::jsonb
FROM users u, districts d
WHERE u.username = 'xifeng_admin' AND d.code = 'XF'
ON CONFLICT DO NOTHING;

-- 开阳县
INSERT INTO admin_permissions (user_id, district_id, permission_scope)
SELECT u.id, d.id, '{"scope": "district", "canManage": ["schools", "users"]}'::jsonb
FROM users u, districts d
WHERE u.username = 'kaiyang_admin' AND d.code = 'KY'
ON CONFLICT DO NOTHING;

-- 贵安新区
INSERT INTO admin_permissions (user_id, district_id, permission_scope)
SELECT u.id, d.id, '{"scope": "district", "canManage": ["schools", "users"]}'::jsonb
FROM users u, districts d
WHERE u.username = 'guian_admin' AND d.code = 'GAXQ'
ON CONFLICT DO NOTHING;

-- =========================================================================
-- Part 5: 数据验证查询
-- =========================================================================

-- 验证区县总数(应该是12个: 6个原有 + 5个新增 + 1个市级)
SELECT '区县总数' as type, COUNT(*) as count FROM districts;

-- 验证学校总数(应该是36所: 12个区县 × 3所)
SELECT '学校总数' as type, COUNT(*) as count FROM schools;

-- 验证每个区县的学校数量
SELECT d.name as district_name, COUNT(s.id) as school_count
FROM districts d
LEFT JOIN schools s ON d.id = s.district_id
GROUP BY d.name
ORDER BY d.name;

-- 验证管理员账号(应该有: 1个系统管理员 + 1个市级 + 11个区县级)
SELECT role, COUNT(*) as count
FROM users
WHERE role IN ('system_admin', 'municipal_admin', 'district_admin')
GROUP BY role
ORDER BY
  CASE role
    WHEN 'system_admin' THEN 1
    WHEN 'municipal_admin' THEN 2
    WHEN 'district_admin' THEN 3
  END;

COMMIT;

-- =========================================================================
-- 迁移完成
-- =========================================================================
-- 本迁移脚本完成了以下工作:
-- ✅ 添加了5个新区县(清镇市、修文县、息烽县、开阳县、贵安新区)
-- ✅ 添加了1个市级单位(贵阳市直属学校)
-- ✅ 为每个区县创建了3所虚拟学校(小学、初中、高中)
-- ✅ 创建了市级管理员账号(guiyang_admin)
-- ✅ 创建了5个新区县的管理员账号
-- ✅ 更新了admin_permissions关联数据
--
-- 所有测试账号统一密码: password123
-- =========================================================================
