-- ============================================================================
-- Migration 008: 为所有学校分配教师和创建学校管理员账号
-- 创建时间: 2025-10-29
-- 描述:
--   1. 为现有教师分配学校
--   2. 为所有41所学校创建至少1个校级管理员和1个教师账号
--   3. 建立完整的学校-教师-管理员关系
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: 修复现有教师的学校分配
-- ============================================================================

-- teacher03 分配到第一小学
UPDATE teachers
SET school_id = 1
WHERE user_id = (SELECT id FROM users WHERE username = 'teacher03')
  AND school_id IS NULL;

-- ============================================================================
-- Part 2: 为每所学校创建1个校级管理员和1个教师
-- 密码统一为: password123 (bcrypt hash)
-- ============================================================================

-- 密码hash: $2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC (password123)

-- 云岩区学校 (district_id=1)
-- 云岩区第一小学 (school_id=6)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_yy_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '云岩区第一小学管理员', '13800001001', 'admin_yy_ps_01@guiyang.edu'),
('teacher_yy_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '张明', '13900001001', 'teacher_yy_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_yy_ps_01'), 6, '{"school": "云岩区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_yy_ps_01'), 'T-YY-PS-01-001', 6, ARRAY['语文', '数学'], '中级教师');

-- 云岩区第一中学 (school_id=7)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_yy_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '云岩区第一中学管理员', '13800001002', 'admin_yy_ms_01@guiyang.edu'),
('teacher_yy_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '李芳', '13900001002', 'teacher_yy_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_yy_ms_01'), 7, '{"school": "云岩区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_yy_ms_01'), 'T-YY-MS-01-001', 7, ARRAY['英语', '科学'], '高级教师');

-- 云岩区第一高中 (school_id=8)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_yy_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '云岩区第一高中管理员', '13800001003', 'admin_yy_hs_01@guiyang.edu'),
('teacher_yy_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '王强', '13900001003', 'teacher_yy_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_yy_hs_01'), 8, '{"school": "云岩区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_yy_hs_01'), 'T-YY-HS-01-001', 8, ARRAY['数学', '计算机'], '高级教师');

-- 南明区学校 (district_id=2)
-- 南明区第一小学 (school_id=9)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_nm_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '南明区第一小学管理员', '13800002001', 'admin_nm_ps_01@guiyang.edu'),
('teacher_nm_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '赵丽', '13900002001', 'teacher_nm_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_nm_ps_01'), 9, '{"school": "南明区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_nm_ps_01'), 'T-NM-PS-01-001', 9, ARRAY['语文'], '中级教师');

-- 南明区第一中学 (school_id=10)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_nm_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '南明区第一中学管理员', '13800002002', 'admin_nm_ms_01@guiyang.edu'),
('teacher_nm_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '孙伟', '13900002002', 'teacher_nm_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_nm_ms_01'), 10, '{"school": "南明区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_nm_ms_01'), 'T-NM-MS-01-001', 10, ARRAY['数学', '英语'], '高级教师');

-- 南明区第一高中 (school_id=11)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_nm_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '南明区第一高中管理员', '13800002003', 'admin_nm_hs_01@guiyang.edu'),
('teacher_nm_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '周杰', '13900002003', 'teacher_nm_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_nm_hs_01'), 11, '{"school": "南明区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_nm_hs_01'), 'T-NM-HS-01-001', 11, ARRAY['科学', '计算机'], '高级教师');

-- 观山湖区学校 (district_id=3)
-- 观山湖区第一小学 (school_id=12)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gsh_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '观山湖区第一小学管理员', '13800003001', 'admin_gsh_ps_01@guiyang.edu'),
('teacher_gsh_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '吴雪', '13900003001', 'teacher_gsh_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gsh_ps_01'), 12, '{"school": "观山湖区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gsh_ps_01'), 'T-GSH-PS-01-001', 12, ARRAY['语文', '英语'], '中级教师');

-- 观山湖区第一中学 (school_id=13)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gsh_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '观山湖区第一中学管理员', '13800003002', 'admin_gsh_ms_01@guiyang.edu'),
('teacher_gsh_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '郑涛', '13900003002', 'teacher_gsh_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gsh_ms_01'), 13, '{"school": "观山湖区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gsh_ms_01'), 'T-GSH-MS-01-001', 13, ARRAY['数学', '科学'], '高级教师');

-- 观山湖区第一高中 (school_id=14)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gsh_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '观山湖区第一高中管理员', '13800003003', 'admin_gsh_hs_01@guiyang.edu'),
('teacher_gsh_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '冯婷', '13900003003', 'teacher_gsh_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gsh_hs_01'), 14, '{"school": "观山湖区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gsh_hs_01'), 'T-GSH-HS-01-001', 14, ARRAY['英语', '计算机'], '高级教师');

-- 白云区学校 (district_id=4)
-- 白云区第一小学 (school_id=15)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_by_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '白云区第一小学管理员', '13800004001', 'admin_by_ps_01@guiyang.edu'),
('teacher_by_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '陈刚', '13900004001', 'teacher_by_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_by_ps_01'), 15, '{"school": "白云区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_by_ps_01'), 'T-BY-PS-01-001', 15, ARRAY['语文', '数学'], '中级教师');

-- 白云区第一中学 (school_id=16)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_by_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '白云区第一中学管理员', '13800004002', 'admin_by_ms_01@guiyang.edu'),
('teacher_by_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '蒋敏', '13900004002', 'teacher_by_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_by_ms_01'), 16, '{"school": "白云区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_by_ms_01'), 'T-BY-MS-01-001', 16, ARRAY['英语', '科学'], '高级教师');

-- 白云区第一高中 (school_id=17)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_by_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '白云区第一高中管理员', '13800004003', 'admin_by_hs_01@guiyang.edu'),
('teacher_by_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '沈浩', '13900004003', 'teacher_by_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_by_hs_01'), 17, '{"school": "白云区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_by_hs_01'), 'T-BY-HS-01-001', 17, ARRAY['数学', '计算机'], '高级教师');

-- 花溪区学校 (district_id=5)
-- 花溪区第一小学 (school_id=18)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_hx_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '花溪区第一小学管理员', '13800005001', 'admin_hx_ps_01@guiyang.edu'),
('teacher_hx_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '韩冰', '13900005001', 'teacher_hx_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_hx_ps_01'), 18, '{"school": "花溪区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_hx_ps_01'), 'T-HX-PS-01-001', 18, ARRAY['语文'], '中级教师');

-- 花溪区第一中学 (school_id=19)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_hx_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '花溪区第一中学管理员', '13800005002', 'admin_hx_ms_01@guiyang.edu'),
('teacher_hx_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '魏洋', '13900005002', 'teacher_hx_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_hx_ms_01'), 19, '{"school": "花溪区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_hx_ms_01'), 'T-HX-MS-01-001', 19, ARRAY['数学', '英语'], '高级教师');

-- 花溪区第一高中 (school_id=20)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_hx_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '花溪区第一高中管理员', '13800005003', 'admin_hx_hs_01@guiyang.edu'),
('teacher_hx_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '姚鹏', '13900005003', 'teacher_hx_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_hx_hs_01'), 20, '{"school": "花溪区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_hx_hs_01'), 'T-HX-HS-01-001', 20, ARRAY['科学', '计算机'], '高级教师');

-- 乌当区学校 (district_id=6)
-- 乌当区第一小学 (school_id=21)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_wd_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '乌当区第一小学管理员', '13800006001', 'admin_wd_ps_01@guiyang.edu'),
('teacher_wd_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '曹颖', '13900006001', 'teacher_wd_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_wd_ps_01'), 21, '{"school": "乌当区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_wd_ps_01'), 'T-WD-PS-01-001', 21, ARRAY['语文', '数学'], '中级教师');

-- 乌当区第一中学 (school_id=22)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_wd_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '乌当区第一中学管理员', '13800006002', 'admin_wd_ms_01@guiyang.edu'),
('teacher_wd_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '薛磊', '13900006002', 'teacher_wd_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_wd_ms_01'), 22, '{"school": "乌当区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_wd_ms_01'), 'T-WD-MS-01-001', 22, ARRAY['英语', '科学'], '高级教师');

-- 乌当区第一高中 (school_id=23)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_wd_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '乌当区第一高中管理员', '13800006003', 'admin_wd_hs_01@guiyang.edu'),
('teacher_wd_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '潘军', '13900006003', 'teacher_wd_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_wd_hs_01'), 23, '{"school": "乌当区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_wd_hs_01'), 'T-WD-HS-01-001', 23, ARRAY['数学', '计算机'], '高级教师');

-- 清镇市学校 (district_id=8)
-- 清镇市第一小学 (school_id=24)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_qz_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '清镇市第一小学管理员', '13800008001', 'admin_qz_ps_01@guiyang.edu'),
('teacher_qz_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '戴秀', '13900008001', 'teacher_qz_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_qz_ps_01'), 24, '{"school": "清镇市第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_qz_ps_01'), 'T-QZ-PS-01-001', 24, ARRAY['语文'], '中级教师');

-- 清镇市第一中学 (school_id=25)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_qz_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '清镇市第一中学管理员', '13800008002', 'admin_qz_ms_01@guiyang.edu'),
('teacher_qz_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '石娜', '13900008002', 'teacher_qz_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_qz_ms_01'), 25, '{"school": "清镇市第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_qz_ms_01'), 'T-QZ-MS-01-001', 25, ARRAY['数学', '英语'], '高级教师');

-- 清镇市第一高中 (school_id=26)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_qz_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '清镇市第一高中管理员', '13800008003', 'admin_qz_hs_01@guiyang.edu'),
('teacher_qz_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '段宇', '13900008003', 'teacher_qz_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_qz_hs_01'), 26, '{"school": "清镇市第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_qz_hs_01'), 'T-QZ-HS-01-001', 26, ARRAY['科学', '计算机'], '高级教师');

-- 修文县学校 (district_id=9)
-- 修文县第一小学 (school_id=27)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_xw_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '修文县第一小学管理员', '13800009001', 'admin_xw_ps_01@guiyang.edu'),
('teacher_xw_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '傅杰', '13900009001', 'teacher_xw_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_xw_ps_01'), 27, '{"school": "修文县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_xw_ps_01'), 'T-XW-PS-01-001', 27, ARRAY['语文', '数学'], '中级教师');

-- 修文县第一中学 (school_id=28)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_xw_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '修文县第一中学管理员', '13800009002', 'admin_xw_ms_01@guiyang.edu'),
('teacher_xw_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '汤霞', '13900009002', 'teacher_xw_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_xw_ms_01'), 28, '{"school": "修文县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_xw_ms_01'), 'T-XW-MS-01-001', 28, ARRAY['英语', '科学'], '高级教师');

-- 修文县第一高中 (school_id=29)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_xw_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '修文县第一高中管理员', '13800009003', 'admin_xw_hs_01@guiyang.edu'),
('teacher_xw_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '邹斌', '13900009003', 'teacher_xw_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_xw_hs_01'), 29, '{"school": "修文县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_xw_hs_01'), 'T-XW-HS-01-001', 29, ARRAY['数学', '计算机'], '高级教师');

-- 息烽县学校 (district_id=10)
-- 息烽县第一小学 (school_id=30)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_xf_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '息烽县第一小学管理员', '13800010001', 'admin_xf_ps_01@guiyang.edu'),
('teacher_xf_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '熊芬', '13900010001', 'teacher_xf_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_xf_ps_01'), 30, '{"school": "息烽县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_xf_ps_01'), 'T-XF-PS-01-001', 30, ARRAY['语文'], '中级教师');

-- 息烽县第一中学 (school_id=31)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_xf_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '息烽县第一中学管理员', '13800010002', 'admin_xf_ms_01@guiyang.edu'),
('teacher_xf_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '金龙', '13900010002', 'teacher_xf_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_xf_ms_01'), 31, '{"school": "息烽县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_xf_ms_01'), 'T-XF-MS-01-001', 31, ARRAY['数学', '英语'], '高级教师');

-- 息烽县第一高中 (school_id=32)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_xf_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '息烽县第一高中管理员', '13800010003', 'admin_xf_hs_01@guiyang.edu'),
('teacher_xf_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '谷亮', '13900010003', 'teacher_xf_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_xf_hs_01'), 32, '{"school": "息烽县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_xf_hs_01'), 'T-XF-HS-01-001', 32, ARRAY['科学', '计算机'], '高级教师');

-- 开阳县学校 (district_id=11)
-- 开阳县第一小学 (school_id=33)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_ky_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '开阳县第一小学管理员', '13800011001', 'admin_ky_ps_01@guiyang.edu'),
('teacher_ky_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '丁晴', '13900011001', 'teacher_ky_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_ky_ps_01'), 33, '{"school": "开阳县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_ky_ps_01'), 'T-KY-PS-01-001', 33, ARRAY['语文', '数学'], '中级教师');

-- 开阳县第一中学 (school_id=34)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_ky_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '开阳县第一中学管理员', '13800011002', 'admin_ky_ms_01@guiyang.edu'),
('teacher_ky_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '於涛', '13900011002', 'teacher_ky_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_ky_ms_01'), 34, '{"school": "开阳县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_ky_ms_01'), 'T-KY-MS-01-001', 34, ARRAY['英语', '科学'], '高级教师');

-- 开阳县第一高中 (school_id=35)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_ky_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '开阳县第一高中管理员', '13800011003', 'admin_ky_hs_01@guiyang.edu'),
('teacher_ky_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '刁强', '13900011003', 'teacher_ky_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_ky_hs_01'), 35, '{"school": "开阳县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_ky_hs_01'), 'T-KY-HS-01-001', 35, ARRAY['数学', '计算机'], '高级教师');

-- 贵安新区学校 (district_id=12)
-- 贵安新区第一小学 (school_id=36)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gaxq_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '贵安新区第一小学管理员', '13800012001', 'admin_gaxq_ps_01@guiyang.edu'),
('teacher_gaxq_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '毛琴', '13900012001', 'teacher_gaxq_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gaxq_ps_01'), 36, '{"school": "贵安新区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gaxq_ps_01'), 'T-GAXQ-PS-01-001', 36, ARRAY['语文'], '中级教师');

-- 贵安新区第一中学 (school_id=37)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gaxq_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '贵安新区第一中学管理员', '13800012002', 'admin_gaxq_ms_01@guiyang.edu'),
('teacher_gaxq_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '文静', '13900012002', 'teacher_gaxq_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gaxq_ms_01'), 37, '{"school": "贵安新区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gaxq_ms_01'), 'T-GAXQ-MS-01-001', 37, ARRAY['数学', '英语'], '高级教师');

-- 贵安新区第一高中 (school_id=38)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gaxq_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '贵安新区第一高中管理员', '13800012003', 'admin_gaxq_hs_01@guiyang.edu'),
('teacher_gaxq_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '云霞', '13900012003', 'teacher_gaxq_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gaxq_hs_01'), 38, '{"school": "贵安新区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gaxq_hs_01'), 'T-GAXQ-HS-01-001', 38, ARRAY['科学', '计算机'], '高级教师');

-- 贵阳市直属学校 (district_id=13)
-- 贵阳市直属第一小学 (school_id=39)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gyszsx_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '市直属第一小学管理员', '13800013001', 'admin_gyszsx_ps_01@guiyang.edu'),
('teacher_gyszsx_ps_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '卞梅', '13900013001', 'teacher_gyszsx_ps_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gyszsx_ps_01'), 39, '{"school": "贵阳市直属第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gyszsx_ps_01'), 'T-GYSZSX-PS-01-001', 39, ARRAY['语文', '数学'], '中级教师');

-- 贵阳市直属第一中学 (school_id=40)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gyszsx_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '市直属第一中学管理员', '13800013002', 'admin_gyszsx_ms_01@guiyang.edu'),
('teacher_gyszsx_ms_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '廉刚', '13900013002', 'teacher_gyszsx_ms_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gyszsx_ms_01'), 40, '{"school": "贵阳市直属第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gyszsx_ms_01'), 'T-GYSZSX-MS-01-001', 40, ARRAY['英语', '科学'], '高级教师');

-- 贵阳市直属第一高中 (school_id=41)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_gyszsx_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '市直属第一高中管理员', '13800013003', 'admin_gyszsx_hs_01@guiyang.edu'),
('teacher_gyszsx_hs_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '房亮', '13900013003', 'teacher_gyszsx_hs_01@guiyang.edu');

INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_gyszsx_hs_01'), 41, '{"school": "贵阳市直属第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher_gyszsx_hs_01'), 'T-GYSZSX-HS-01-001', 41, ARRAY['数学', '计算机'], '高级教师');

-- ============================================================================
-- Part 3: 验证数据
-- ============================================================================

-- 查看创建的账号数量
SELECT '创建的管理员账号数量:' as info, COUNT(*) FROM users WHERE role = 'school_admin' AND username LIKE 'school_admin_%';
SELECT '创建的教师账号数量:' as info, COUNT(*) FROM users WHERE role = 'teacher' AND username LIKE 'teacher_%';
SELECT '创建的教师记录数量:' as info, COUNT(*) FROM teachers WHERE teacher_no LIKE 'T-%';
SELECT '创建的权限记录数量:' as info, COUNT(*) FROM admin_permissions WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'school_admin_%');

COMMIT;

-- ============================================================================
-- 注意事项
-- ============================================================================
-- 1. 所有新创建账号的密码为: password123
-- 2. 每个学校都有1个校级管理员 + 1个教师
-- 3. 教师编号格式: T-{区域代码}-{学校类型}-{序号}
-- 4. 用户名格式: {角色}_{区域代码}_{学校类型}_{序号}
-- 5. 总计新创建: 36个管理员 + 36个教师 = 72个账号
