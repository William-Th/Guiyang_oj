
-- ============================================
-- 1. 补充各区学校
-- ============================================
INSERT INTO schools (id, name, code, district, district_id, address, contact_person, contact_phone, type) VALUES
(7,  '南明区第一小学', 'NM001', '南明区', 2, '贵阳市南明区市南路50号', '周主任', '0851-66778899', 'regular'),
(8,  '白云区第一小学', 'BY001', '白云区', 4, '贵阳市白云区白云北路200号', '吴主任', '0851-77889900', 'regular'),
(9,  '花溪区第一小学', 'HX001', '花溪区', 5, '贵阳市花溪区花溪大道300号', '马主任', '0851-88990011', 'regular'),
(10, '乌当区第一小学', 'WD001', '乌当区', 6, '贵阳市乌当区新添大道400号', '林主任', '0851-99001122', 'regular')
ON CONFLICT (code) DO NOTHING;
SELECT setval('schools_id_seq', (SELECT MAX(id) FROM schools));

-- ============================================
-- 2. 修正教师学校归属
-- ============================================
-- 云岩区教师 → 云岩区第一小学(school_id=6)
UPDATE teachers SET school_id = 6 WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'teacher_yy_%');

-- 南明区教师 → 南明区第一小学(school_id=7)
UPDATE teachers SET school_id = 7 WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'teacher_nm_%');

-- 白云区教师 → 白云区第一小学(school_id=8)
UPDATE teachers SET school_id = 8 WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'teacher_by_%');

-- ============================================
-- 3. 补充各区学生（每个区2-3个学生）
-- ============================================

-- 南明区学生
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('13800138006', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '南明一小-陈思', '13800138006', NULL),
('13800138007', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '南明一小-周洋', '13800138007', NULL)
ON CONFLICT (username) DO NOTHING;

-- 白云区学生
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('13800138008', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '白云一小-黄蕾', '13800138008', NULL),
('13800138009', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '白云一小-刘宇', '13800138009', NULL)
ON CONFLICT (username) DO NOTHING;

-- 学生记录
INSERT INTO students (user_id, student_no, school_id, grade, class) VALUES
((SELECT id FROM users WHERE username='13800138006'), 'NM-PS-01-001', 7, '四年级', '2班'),
((SELECT id FROM users WHERE username='13800138007'), 'NM-PS-01-002', 7, '四年级', '2班'),
((SELECT id FROM users WHERE username='13800138008'), 'BY-PS-01-001', 8, '三年级', '1班'),
((SELECT id FROM users WHERE username='13800138009'), 'BY-PS-01-002', 8, '三年级', '1班')
ON CONFLICT (student_no) DO NOTHING;

-- 积分账户
INSERT INTO student_points (student_id, current_points, total_points, spent_points, frozen_points)
SELECT s.id, 0, 0, 0, 0 FROM students s
JOIN users u ON s.user_id = u.id
WHERE u.username IN ('13800138006','13800138007','13800138008','13800138009')
ON CONFLICT (student_id) DO NOTHING;
