-- 为每个区县的小学创建测试学生账号
-- password123的bcrypt哈希值: $2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC

-- 1. 南明区第一小学 (id=9)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138006', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '南明测试学生', '1234', '13800138006', 'active')
ON CONFLICT DO NOTHING RETURNING id;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138006'), 'NM-S001', 9, '三年级', '1班', '南明家长', '13900000006'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'NM-S001');

-- 2. 观山湖区第一小学 (id=12)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138007', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '观山湖测试学生', '1234', '13800138007', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138007'), 'GSH-S001', 12, '三年级', '1班', '观山湖家长', '13900000007'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'GSH-S001');

-- 3. 白云区第一小学 (id=15)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138008', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '白云测试学生', '1234', '13800138008', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138008'), 'BY-S001', 15, '三年级', '1班', '白云家长', '13900000008'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'BY-S001');

-- 4. 花溪区第一小学 (id=18)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138009', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '花溪测试学生', '1234', '13800138009', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138009'), 'HX-S001', 18, '三年级', '1班', '花溪家长', '13900000009'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'HX-S001');

-- 5. 乌当区第一小学 (id=21)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138010', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '乌当测试学生', '1234', '13800138010', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138010'), 'WD-S001', 21, '三年级', '1班', '乌当家长', '13900000010'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'WD-S001');

-- 6. 清镇市第一小学 (id=24)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138011', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '清镇测试学生', '1234', '13800138011', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138011'), 'QZ-S001', 24, '三年级', '1班', '清镇家长', '13900000011'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'QZ-S001');

-- 7. 修文县第一小学 (id=27)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138012', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '修文测试学生', '1234', '13800138012', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138012'), 'XW-S001', 27, '三年级', '1班', '修文家长', '13900000012'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'XW-S001');

-- 8. 息烽县第一小学 (id=30)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138013', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '息烽测试学生', '1234', '13800138013', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138013'), 'XF-S001', 30, '三年级', '1班', '息烽家长', '13900000013'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'XF-S001');

-- 9. 开阳县第一小学 (id=33)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138014', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '开阳测试学生', '1234', '13800138014', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138014'), 'KY-S001', 33, '三年级', '1班', '开阳家长', '13900000014'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'KY-S001');

-- 10. 贵安新区第一小学 (id=36)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138015', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '贵安测试学生', '1234', '13800138015', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138015'), 'GAXQ-S001', 36, '三年级', '1班', '贵安家长', '13900000015'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'GAXQ-S001');

-- 11. 贵阳市直属第一小学 (id=39)
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138016', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '市直属测试学生', '1234', '13800138016', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138016'), 'GYSZSX-S001', 39, '三年级', '1班', '市直属家长', '13900000016'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'GYSZSX-S001');

-- 12. 贵阳市第二小学 (id=2) - 南明区
INSERT INTO users (username, password_hash, role, real_name, id_card, phone, status)
VALUES ('13800138017', '$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC', 'student', '市二小测试学生', '1234', '13800138017', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
SELECT (SELECT id FROM users WHERE username='13800138017'), 'GY002-S001', 2, '三年级', '1班', '市二小家长', '13900000017'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_no = 'GY002-S001');
