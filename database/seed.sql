-- Sample data for demo purposes
-- Run this after the schema is created

-- Insert sample districts (区域数据)
INSERT INTO districts (name, code, level) VALUES
('云岩区', 'YY', 'district'),
('南明区', 'NM', 'district'),
('观山湖区', 'GSH', 'district'),
('白云区', 'BY', 'district'),
('花溪区', 'HX', 'district'),
('乌当区', 'WD', 'district'),
('贵阳市教育局', 'GYSJ', 'municipal');

-- Insert sample schools
INSERT INTO schools (name, code, district, district_id, address, contact_person, contact_phone, type) VALUES
('贵阳市第一小学', 'GY001', '云岩区', 1, '贵阳市云岩区中华北路123号', '李主任', '0851-12345678', 'regular'),
('贵阳市第二小学', 'GY002', '南明区', 2, '贵阳市南明区解放路456号', '王校长', '0851-87654321', 'regular'),
('贵阳市实验小学', 'GY003', '观山湖区', 3, '贵阳市观山湖区金阳街道789号', '张老师', '0851-11223344', 'municipal'),
('贵阳市第三小学', 'GY004', '白云区', 4, '贵阳市白云区白云路100号', '陈校长', '0851-22334455', 'regular'),
('贵阳市信息技术基地校', 'GY005', '观山湖区', 3, '贵阳市观山湖区数博大道999号', '刘校长', '0851-33445566', 'base');

-- Insert system administrator (市级总管理员)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'municipal_admin', '系统管理员', '13800138000', 'admin@guiyang.edu');

-- Insert district administrators (区级管理员)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('yunyan_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'district_admin', '云岩区管理员', '13800138010', 'yunyan@guiyang.edu'),
('nanming_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'district_admin', '南明区管理员', '13800138011', 'nanming@guiyang.edu'),
('guanshanhu_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'district_admin', '观山湖区管理员', '13800138012', 'gsh@guiyang.edu'),
('baiyun_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'district_admin', '白云区管理员', '13800138013', 'baiyun@guiyang.edu'),
('huaxi_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'district_admin', '花溪区管理员', '13800138014', 'huaxi@guiyang.edu'),
('wudang_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'district_admin', '乌当区管理员', '13800138015', 'wudang@guiyang.edu');

-- Insert school administrators (校级管理员)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('school_admin_01', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '第一小学管理员', '13800138020', 'school01@guiyang.edu'),
('school_admin_02', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'school_admin', '第二小学管理员', '13800138021', 'school02@guiyang.edu');

-- Insert municipal school administrator (市直属学校总管理员)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('municipal_school_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'municipal_school_admin', '市直属学校总管理员', '13800138030', 'municipal@guiyang.edu');

-- Insert base school administrator (基地校管理员)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('base_school_admin', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'base_school_admin', '信息技术基地校管理员', '13800138040', 'base@guiyang.edu');

-- Insert school-specific teacher users (3 districts × 3 schools × 2 subjects = 18 teachers)
-- All passwords: password123
-- Districts: BY (白云区), NM (南明区), YY (云岩区)
-- Subjects: 数学 (Math), 信息科技 (Information Technology)

-- 白云区 (Baiyun District) - 6 teachers
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('teacher_by_ps_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '陈刚-白云一小', '13800138101', 'teacher_by_ps_math@guiyang.edu'),
('teacher_by_ps_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '李敏-白云一小', '13800138102', 'teacher_by_ps_it@guiyang.edu'),
('teacher_by_ms_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '张华-白云一中', '13800138103', 'teacher_by_ms_math@guiyang.edu'),
('teacher_by_ms_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '王芳-白云一中', '13800138104', 'teacher_by_ms_it@guiyang.edu'),
('teacher_by_hs_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '刘强-白云一高', '13800138105', 'teacher_by_hs_math@guiyang.edu'),
('teacher_by_hs_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '杨丽-白云一高', '13800138106', 'teacher_by_hs_it@guiyang.edu'),

-- 南明区 (Nanming District) - 6 teachers
('teacher_nm_ps_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '赵勇-南明一小', '13800138111', 'teacher_nm_ps_math@guiyang.edu'),
('teacher_nm_ps_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '孙静-南明一小', '13800138112', 'teacher_nm_ps_it@guiyang.edu'),
('teacher_nm_ms_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '周杰-南明一中', '13800138113', 'teacher_nm_ms_math@guiyang.edu'),
('teacher_nm_ms_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '吴梅-南明一中', '13800138114', 'teacher_nm_ms_it@guiyang.edu'),
('teacher_nm_hs_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '郑鹏-南明一高', '13800138115', 'teacher_nm_hs_math@guiyang.edu'),
('teacher_nm_hs_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '冯娟-南明一高', '13800138116', 'teacher_nm_hs_it@guiyang.edu'),

-- 云岩区 (Yunyan District) - 6 teachers
('teacher_yy_ps_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '蒋磊-云岩一小', '13800138121', 'teacher_yy_ps_math@guiyang.edu'),
('teacher_yy_ps_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '韩雪-云岩一小', '13800138122', 'teacher_yy_ps_it@guiyang.edu'),
('teacher_yy_ms_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '曹斌-云岩一中', '13800138123', 'teacher_yy_ms_math@guiyang.edu'),
('teacher_yy_ms_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '许红-云岩一中', '13800138124', 'teacher_yy_ms_it@guiyang.edu'),
('teacher_yy_hs_math', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '邓涛-云岩一高', '13800138125', 'teacher_yy_hs_math@guiyang.edu'),
('teacher_yy_hs_it', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'teacher', '夏婷-云岩一高', '13800138126', 'teacher_yy_hs_it@guiyang.edu');

-- Insert sample student users (using phone number as username)
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('13800138003', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '张小明', '13800138003', 'student01@example.com'),
('13800138004', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '李小红', '13800138004', 'student02@example.com'),
('13800138005', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '王小刚', '13800138005', 'student03@example.com');

-- Insert teacher records (18 teachers for 3 districts)
-- School mapping: school_id 1 (云岩区), 2 (南明区), 4 (白云区)
INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
-- 白云区 teachers (school_id = 4)
((SELECT id FROM users WHERE username = 'teacher_by_ps_math'), 'T_BY_PS_MATH', 4, ARRAY['数学'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_by_ps_it'), 'T_BY_PS_IT', 4, ARRAY['信息科技'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_by_ms_math'), 'T_BY_MS_MATH', 4, ARRAY['数学'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_by_ms_it'), 'T_BY_MS_IT', 4, ARRAY['信息科技'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_by_hs_math'), 'T_BY_HS_MATH', 4, ARRAY['数学'], '高级教师'),
((SELECT id FROM users WHERE username = 'teacher_by_hs_it'), 'T_BY_HS_IT', 4, ARRAY['信息科技'], '高级教师'),
-- 南明区 teachers (school_id = 2)
((SELECT id FROM users WHERE username = 'teacher_nm_ps_math'), 'T_NM_PS_MATH', 2, ARRAY['数学'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_nm_ps_it'), 'T_NM_PS_IT', 2, ARRAY['信息科技'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_nm_ms_math'), 'T_NM_MS_MATH', 2, ARRAY['数学'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_nm_ms_it'), 'T_NM_MS_IT', 2, ARRAY['信息科技'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_nm_hs_math'), 'T_NM_HS_MATH', 2, ARRAY['数学'], '高级教师'),
((SELECT id FROM users WHERE username = 'teacher_nm_hs_it'), 'T_NM_HS_IT', 2, ARRAY['信息科技'], '高级教师'),
-- 云岩区 teachers (school_id = 1)
((SELECT id FROM users WHERE username = 'teacher_yy_ps_math'), 'T_YY_PS_MATH', 1, ARRAY['数学'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_yy_ps_it'), 'T_YY_PS_IT', 1, ARRAY['信息科技'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_yy_ms_math'), 'T_YY_MS_MATH', 1, ARRAY['数学'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_yy_ms_it'), 'T_YY_MS_IT', 1, ARRAY['信息科技'], '中级教师'),
((SELECT id FROM users WHERE username = 'teacher_yy_hs_math'), 'T_YY_HS_MATH', 1, ARRAY['数学'], '高级教师'),
((SELECT id FROM users WHERE username = 'teacher_yy_hs_it'), 'T_YY_HS_IT', 1, ARRAY['信息科技'], '高级教师');

-- Insert student records
INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone) VALUES
((SELECT id FROM users WHERE username = '520102200801011234'), 'S2024001', 1, '三年级', '3班', '张父亲', '13900139001'),
((SELECT id FROM users WHERE username = '520102200802012345'), 'S2024002', 1, '三年级', '3班', '李母亲', '13900139002'),
((SELECT id FROM users WHERE username = '520102200803013456'), 'S2024003', 1, '三年级', '3班', '王父亲', '13900139003');

-- Insert admin permissions (管理员权限配置)
-- District administrators
INSERT INTO admin_permissions (user_id, district_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'yunyan_admin'), 1, '{"district": "云岩区", "schools": "all", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}'),
((SELECT id FROM users WHERE username = 'nanming_admin'), 2, '{"district": "南明区", "schools": "all", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}'),
((SELECT id FROM users WHERE username = 'guanshanhu_admin'), 3, '{"district": "观山湖区", "schools": "all", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}'),
((SELECT id FROM users WHERE username = 'baiyun_admin'), 4, '{"district": "白云区", "schools": "all", "permissions": ["manage_schools", "manage_teachers", "view_reports", "review_questions"]}'),
((SELECT id FROM users WHERE username = 'huaxi_admin'), 5, '{"district": "花溪区", "schools": "all", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}'),
((SELECT id FROM users WHERE username = 'wudang_admin'), 6, '{"district": "乌当区", "schools": "all", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}');

-- School administrators
INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'school_admin_01'), 1, '{"school": "贵阳市第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}'),
((SELECT id FROM users WHERE username = 'school_admin_02'), 2, '{"school": "贵阳市第二小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}');

-- Base school administrator
INSERT INTO admin_permissions (user_id, school_id, permission_scope) VALUES
((SELECT id FROM users WHERE username = 'base_school_admin'), 5, '{"school": "贵阳市信息技术基地校", "permissions": ["manage_students", "manage_teachers", "manage_exams", "manage_level_5_6_exams", "view_reports"]}');

-- Insert sample activities (using new school-specific teachers)
-- Note: 系统已从 exams 表迁移到 activities 表
INSERT INTO activities (title, description, subject, grade, type, time_limit_type, start_time, end_time, total_score, pass_score, status, created_by, scope, ability_level) VALUES
('2024年春季数学期中考试', '三年级数学期中测试，包含计算、应用题等内容', '数学', '三年级', 'assessment', 'scheduled',
 '2024-03-16 09:00:00', '2024-03-16 10:30:00', 100, 60, 'published',
 (SELECT id FROM users WHERE username = 'teacher_yy_ps_math'), 'school', 'L3'),

('2024年春季信息科技测验', '三年级信息科技测验，包含基础计算机知识', '信息科技', '三年级', 'practice', 'scheduled',
 '2024-03-17 14:00:00', '2024-03-17 15:00:00', 100, 60, 'ongoing',
 (SELECT id FROM users WHERE username = 'teacher_yy_ps_it'), 'school', 'L3');

-- Insert sample questions for math activity (exam_id=1, 对应第一个activity)
-- Note: questions表仍使用exam_id字段，但现在关联到activities表
INSERT INTO questions (exam_id, type, content, options, correct_answer, score, order_no, difficulty) VALUES
(1, 'single', '3 + 5 = ?',
 '["A. 6", "B. 7", "C. 8", "D. 9"]',
 'C', 5, 1, 'easy'),

(1, 'single', '小明有12个苹果，吃了3个，还剩几个？',
 '["A. 8个", "B. 9个", "C. 10个", "D. 15个"]',
 'B', 5, 2, 'easy'),

(1, 'single', '一个正方形的边长是4厘米，它的周长是多少？',
 '["A. 12厘米", "B. 16厘米", "C. 20厘米", "D. 8厘米"]',
 'B', 10, 3, 'medium');

-- Insert sample questions for IT activity (exam_id=2, 对应第二个activity)
INSERT INTO questions (exam_id, type, content, options, correct_answer, score, order_no, difficulty) VALUES
(2, 'single', '计算机的中央处理器的英文缩写是什么？',
 '["A. GPU", "B. CPU", "C. RAM", "D. ROM"]',
 'B', 10, 1, 'easy'),

(2, 'single', '鼠标是计算机的什么设备？',
 '["A. 输入设备", "B. 输出设备", "C. 存储设备", "D. 处理设备"]',
 'A', 10, 2, 'easy'),

(2, 'single', '以下哪个软件可以用来制作演示文稿？',
 '["A. Word", "B. Excel", "C. PowerPoint", "D. 画图"]',
 'C', 10, 3, 'medium');

-- Insert some sample announcements
INSERT INTO announcements (title, content, type, target_audience, is_pinned, created_by, published_at) VALUES
('欢迎使用贵阳市小学生测评平台', '亲爱的同学们，欢迎使用我们的在线测评平台！请认真参加每一次考试。', 'notice', 'student', true, 
 (SELECT id FROM users WHERE username = 'admin'), NOW()),
 
('系统维护通知', '本系统将于本周日晚上10点至11点进行维护，届时可能无法正常访问，敬请谅解。', 'maintenance', 'all', false,
 (SELECT id FROM users WHERE username = 'admin'), NOW());

-- Password for all demo accounts is 'password123'
--
-- 管理员账号:
-- 市级总管理员: username=admin, password=password123
-- 区级管理员:
--   云岩区: username=yunyan_admin, password=password123
--   南明区: username=nanming_admin, password=password123
--   观山湖区: username=guanshanhu_admin, password=password123
--   白云区: username=baiyun_admin, password=password123
--   花溪区: username=huaxi_admin, password=password123
--   乌当区: username=wudang_admin, password=password123
-- 校级管理员:
--   第一小学: username=school_admin_01, password=password123
--   第二小学: username=school_admin_02, password=password123
--   市直属学校: username=municipal_school_admin, password=password123
--   基地校: username=base_school_admin, password=password123
--
-- 教师账号 (18 teachers - 3 districts × 3 schools × 2 subjects):
-- 白云区 (6):
--   username=teacher_by_ps_math (陈刚-白云一小, 数学), password=password123
--   username=teacher_by_ps_it (李敏-白云一小, 信息科技), password=password123
--   username=teacher_by_ms_math (张华-白云一中, 数学), password=password123
--   username=teacher_by_ms_it (王芳-白云一中, 信息科技), password=password123
--   username=teacher_by_hs_math (刘强-白云一高, 数学), password=password123
--   username=teacher_by_hs_it (杨丽-白云一高, 信息科技), password=password123
-- 南明区 (6):
--   username=teacher_nm_ps_math (赵勇-南明一小, 数学), password=password123
--   username=teacher_nm_ps_it (孙静-南明一小, 信息科技), password=password123
--   username=teacher_nm_ms_math (周杰-南明一中, 数学), password=password123
--   username=teacher_nm_ms_it (吴梅-南明一中, 信息科技), password=password123
--   username=teacher_nm_hs_math (郑鹏-南明一高, 数学), password=password123
--   username=teacher_nm_hs_it (冯娟-南明一高, 信息科技), password=password123
-- 云岩区 (6):
--   username=teacher_yy_ps_math (蒋磊-云岩一小, 数学), password=password123
--   username=teacher_yy_ps_it (韩雪-云岩一小, 信息科技), password=password123
--   username=teacher_yy_ms_math (曹斌-云岩一中, 数学), password=password123
--   username=teacher_yy_ms_it (许红-云岩一中, 信息科技), password=password123
--   username=teacher_yy_hs_math (邓涛-云岩一高, 数学), password=password123
--   username=teacher_yy_hs_it (夏婷-云岩一高, 信息科技), password=password123
--
-- 学生账号:
-- Student: ID card=520102200801011234, password=password123
-- Student: ID card=520102200802012345, password=password123
-- Student: ID card=520102200803013456, password=password123

-- ==========================================
-- 成就系统种子数据
-- ==========================================
-- 注意：成就数据源自迁移文件，确保与 database/migrations/ 中的数据保持一致
-- 相关迁移文件:
--   - add_initial_achievements.sql (48个基础成就)
--   - add_additional_achievements.sql (12个补充成就)
-- ==========================================

\i database/migrations/add_initial_achievements.sql
\i database/migrations/add_additional_achievements.sql

COMMENT ON TABLE users IS '所有演示账号的密码都是 password123';
COMMENT ON COLUMN users.password IS '使用 bcrypt 加密，盐值为 10';
COMMENT ON TABLE districts IS '区域管理表，支持区级和市级管理';
COMMENT ON TABLE admin_permissions IS '管理员权限表，定义各级管理员的管理范围和权限';