-- Sample data for demo purposes
-- Run this after the schema is created

-- Insert sample schools
INSERT INTO schools (name, code, district, address, contact_person, contact_phone) VALUES
('贵阳市第一小学', 'GY001', '云岩区', '贵阳市云岩区中华北路123号', '李主任', '0851-12345678'),
('贵阳市第二小学', 'GY002', '南明区', '贵阳市南明区解放路456号', '王校长', '0851-87654321'),
('贵阳市实验小学', 'GY003', '观山湖区', '贵阳市观山湖区金阳街道789号', '张老师', '0851-11223344');

-- Insert sample admin user
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '系统管理员', '13800138000', 'admin@guiyang.edu');

-- Insert sample teacher users
INSERT INTO users (username, password, role, real_name, phone, email) VALUES
('teacher01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', '李老师', '13800138001', 'teacher01@guiyang.edu'),
('teacher02', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', '王老师', '13800138002', 'teacher02@guiyang.edu');

-- Insert sample student users with ID cards
INSERT INTO users (username, password, role, real_name, id_card, phone, email) VALUES
('520102200801011234', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '张小明', '520102200801011234', '13800138003', 'student01@example.com'),
('520102200802012345', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '李小红', '520102200802012345', '13800138004', 'student02@example.com'),
('520102200803013456', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '王小刚', '520102200803013456', '13800138005', 'student03@example.com');

-- Insert teacher records
INSERT INTO teachers (user_id, teacher_no, school_id, subjects, title) VALUES
((SELECT id FROM users WHERE username = 'teacher01'), 'T001', 1, ARRAY['语文', '数学'], '高级教师'),
((SELECT id FROM users WHERE username = 'teacher02'), 'T002', 1, ARRAY['科学', '英语'], '中级教师');

-- Insert student records
INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone) VALUES
((SELECT id FROM users WHERE username = '520102200801011234'), 'S2024001', 1, '三年级', '3班', '张父亲', '13900139001'),
((SELECT id FROM users WHERE username = '520102200802012345'), 'S2024002', 1, '三年级', '3班', '李母亲', '13900139002'),
((SELECT id FROM users WHERE username = '520102200803013456'), 'S2024003', 1, '三年级', '3班', '王父亲', '13900139003');

-- Insert sample exams
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024年春季语文期中考试', '三年级语文期中测试，包含阅读理解、写作等内容', '语文', '三年级', 
 '2024-03-15 09:00:00', '2024-03-15 11:00:00', 90, 100, 60, 'published', 
 (SELECT id FROM users WHERE username = 'teacher01')),
 
('2024年春季数学期中考试', '三年级数学期中测试，包含计算、应用题等内容', '数学', '三年级',
 '2024-03-16 09:00:00', '2024-03-16 10:30:00', 60, 100, 60, 'published',
 (SELECT id FROM users WHERE username = 'teacher01')),
 
('2024年春季科学测验', '三年级科学测验，包含基础科学知识', '科学', '三年级',
 '2024-03-17 14:00:00', '2024-03-17 15:00:00', 45, 100, 60, 'ongoing',
 (SELECT id FROM users WHERE username = 'teacher02'));

-- Insert sample questions for language exam
INSERT INTO questions (exam_id, type, content, options, correct_answer, score, order_no, difficulty) VALUES
(1, 'single', '下列哪个字的读音是正确的？', 
 '["A. 着(zháo)急", "B. 着(zhe)急", "C. 着(zhāo)急", "D. 着(zhuó)急"]', 
 'A', 5, 1, 'easy'),

(1, 'single', '"春眠不觉晓"的下一句是？', 
 '["A. 处处闻啼鸟", "B. 夜来风雨声", "C. 花落知多少", "D. 鸟语花香时"]', 
 'A', 5, 2, 'medium'),

(1, 'multiple', '下列哪些是描写春天的词语？（多选）', 
 '["A. 春暖花开", "B. 秋高气爽", "C. 万物复苏", "D. 雪花飞舞", "E. 鸟语花香"]', 
 'A,C,E', 10, 3, 'medium');

-- Insert sample questions for math exam
INSERT INTO questions (exam_id, type, content, options, correct_answer, score, order_no, difficulty) VALUES
(2, 'single', '3 + 5 = ?', 
 '["A. 6", "B. 7", "C. 8", "D. 9"]', 
 'C', 5, 1, 'easy'),

(2, 'single', '小明有12个苹果，吃了3个，还剩几个？', 
 '["A. 8个", "B. 9个", "C. 10个", "D. 15个"]', 
 'B', 5, 2, 'easy'),

(2, 'single', '一个正方形的边长是4厘米，它的周长是多少？', 
 '["A. 12厘米", "B. 16厘米", "C. 20厘米", "D. 8厘米"]', 
 'B', 10, 3, 'medium');

-- Insert sample questions for science exam
INSERT INTO questions (exam_id, type, content, options, correct_answer, score, order_no, difficulty) VALUES
(3, 'single', '植物生长需要哪些基本条件？', 
 '["A. 只要阳光", "B. 只要水分", "C. 阳光、水分、空气", "D. 只要土壤"]', 
 'C', 10, 1, 'medium'),

(3, 'single', '下列哪种动物是哺乳动物？', 
 '["A. 鸟类", "B. 鱼类", "C. 狗", "D. 蛇"]', 
 'C', 10, 2, 'easy');

-- Insert some sample announcements
INSERT INTO announcements (title, content, type, target_audience, is_pinned, created_by, published_at) VALUES
('欢迎使用贵阳市小学生测评平台', '亲爱的同学们，欢迎使用我们的在线测评平台！请认真参加每一次考试。', 'notice', 'student', true, 
 (SELECT id FROM users WHERE username = 'admin'), NOW()),
 
('系统维护通知', '本系统将于本周日晚上10点至11点进行维护，届时可能无法正常访问，敬请谅解。', 'maintenance', 'all', false,
 (SELECT id FROM users WHERE username = 'admin'), NOW());

-- Password for all demo accounts is 'password123'
-- Admin: username=admin, password=password123
-- Teacher: username=teacher01, password=password123
-- Student: ID card=520102200801011234, password=password123

COMMENT ON TABLE users IS '所有演示账号的密码都是 password123';
COMMENT ON COLUMN users.password IS '使用 bcrypt 加密，盐值为 10';