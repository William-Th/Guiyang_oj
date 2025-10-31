-- 样例数据脚本
-- 用于演示和测试的更多样例数据

-- 清理旧的测试数据（可选）
-- DELETE FROM answers WHERE id > 0;
-- DELETE FROM student_exams WHERE id > 0;
-- DELETE FROM questions WHERE id > 0;
-- DELETE FROM exams WHERE id > 0;

-- ========================================
-- 1. 添加更多用户账号
-- ========================================

-- 添加教师账号 (密码都是: password123)
INSERT INTO users (username, password, role, real_name, id_card, phone, email) VALUES
('teacher02', '$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.', 'teacher', '李明', '520102197506152345', '13800138002', 'liming@school.com'),
('teacher03', '$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.', 'teacher', '王芳', '520102198203253456', '13800138003', 'wangfang@school.com')
ON CONFLICT (username) DO NOTHING;

-- 添加学生账号 (密码都是: password123)
INSERT INTO users (username, password, role, real_name, id_card, phone, email) VALUES
('student01', '$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.', 'student', '张小明', '520102201001015678', '13900139001', 'zhangxm@student.com'),
('student02', '$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.', 'student', '李小红', '520102201002026789', '13900139002', 'lixh@student.com'),
('student03', '$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.', 'student', '王小刚', '520102201003037890', '13900139003', 'wangxg@student.com'),
('student04', '$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.', 'student', '刘小丽', '520102201004048901', '13900139004', 'liuxl@student.com'),
('student05', '$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.', 'student', '陈小华', '520102201005059012', '13900139005', 'chenxh@student.com')
ON CONFLICT (username) DO NOTHING;

-- 区级管理员账号已在 seed.sql 中定义，此处不再重复添加
-- 可用账号: yunyan_admin, nanming_admin, guanshanhu_admin

-- ========================================
-- 2. 添加考试数据
-- ========================================

-- 语文考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季语文期中考试', '小学三年级语文期中测试', '语文', '三年级', '2024-04-15 09:00:00', '2024-04-15 11:00:00', 90, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1)),
('2024春季语文期末考试', '小学三年级语文期末测试', '语文', '三年级', '2024-06-20 09:00:00', '2024-06-20 11:00:00', 90, 100, 60, 'draft',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1))
ON CONFLICT DO NOTHING;

-- 数学考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季数学期中考试', '小学三年级数学期中测试', '数学', '三年级', '2024-04-16 09:00:00', '2024-04-16 11:00:00', 90, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher02' LIMIT 1)),
('2024春季数学单元测试', '小学三年级数学第三单元测试', '数学', '三年级', '2024-03-25 14:00:00', '2024-03-25 15:30:00', 60, 100, 60, 'finished',
  (SELECT id FROM users WHERE username = 'teacher02' LIMIT 1))
ON CONFLICT DO NOTHING;

-- 英语考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季英语口语测试', '小学三年级英语口语能力测试', '英语', '三年级', '2024-05-10 14:00:00', '2024-05-10 16:00:00', 60, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher03' LIMIT 1))
ON CONFLICT DO NOTHING;

-- 科学考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季科学实验考试', '小学三年级科学实验操作测试', '科学', '三年级', '2024-05-15 14:00:00', '2024-05-15 15:30:00', 60, 100, 60, 'draft',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1))
ON CONFLICT DO NOTHING;

-- ========================================
-- 3. 添加考试题目
-- ========================================

-- 语文期中考试题目
DO $$
DECLARE
  exam_id_chinese INT;
BEGIN
  SELECT id INTO exam_id_chinese FROM exams WHERE title = '2024春季语文期中考试' LIMIT 1;

  IF exam_id_chinese IS NOT NULL THEN
    -- 单选题
    INSERT INTO questions (exam_id, type, content, options, correct_answer, score, order_no, difficulty, explanation) VALUES
    (exam_id_chinese, 'single', '下列词语中，加点字读音完全正确的一组是（）',
     '["A. 奔跑(bēn) 友谊(yì)", "B. 花朵(duǒ) 音乐(yuè)", "C. 背包(bēi) 数学(shǔ)", "D. 长大(zhǎng) 着急(zháo)"]',
     'B', 5, 1, 'easy', '花朵读duǒ，音乐读yuè，发音正确'),

    (exam_id_chinese, 'single', '"春眠不觉晓"的下一句是（）',
     '["A. 处处闻啼鸟", "B. 夜来风雨声", "C. 花落知多少", "D. 春风吹又生"]',
     'A', 5, 2, 'easy', '这是孟浩然的《春晓》，下一句是"处处闻啼鸟"'),

    -- 多选题
    (exam_id_chinese, 'multiple', '下列句子中，使用了比喻修辞手法的有（）',
     '["A. 天上的星星像眼睛一样眨啊眨", "B. 弯弯的月亮像小船", "C. 太阳从东方升起", "D. 雪花像鹅毛一样飘落"]',
     '["A","B","D"]', 10, 3, 'medium', 'A、B、D都使用了比喻，将某物比作另一物'),

    -- 填空题
    (exam_id_chinese, 'blank', '请填写古诗：日出江花红胜火，___________。',
     '["春来江水绿如蓝"]', '春来江水绿如蓝', 5, 4, 'medium', '这是白居易《忆江南》中的名句'),

    -- 判断题
    (exam_id_chinese, 'single', '"它"字是独体字。', '["正确","错误"]', '错误', 5, 5, 'easy', '"它"字是左右结构，不是独体字');
  END IF;
END $$;

-- 数学期中考试题目
DO $$
DECLARE
  exam_id_math INT;
BEGIN
  SELECT id INTO exam_id_math FROM exams WHERE title = '2024春季数学期中考试' LIMIT 1;

  IF exam_id_math IS NOT NULL THEN
    -- 单选题
    INSERT INTO questions (exam_id, type, content, options, correct_answer, score, order_no, difficulty, explanation) VALUES
    (exam_id_math, 'single', '36 ÷ 4 = ？',
     '["A. 8", "B. 9", "C. 10", "D. 7"]', 'B', 5, 1, 'easy', '36除以4等于9'),

    (exam_id_math, 'single', '一个长方形的长是8厘米，宽是5厘米，它的周长是多少厘米？',
     '["A. 13", "B. 26", "C. 40", "D. 18"]', 'B', 10, 2, 'medium', '周长=(长+宽)×2=(8+5)×2=26厘米'),

    (exam_id_math, 'single', '小明有45元，买了一本书花了28元，还剩多少元？',
     '["A. 15元", "B. 16元", "C. 17元", "D. 18元"]', 'C', 10, 3, 'easy', '45-28=17元'),

    -- 判断题
    (exam_id_math, 'single', '0乘以任何数都得0。', '["正确","错误"]', '正确', 5, 4, 'easy', '0乘以任何数的积都是0'),

    (exam_id_math, 'single', '1000克就是1千克。', '["正确","错误"]', '正确', 5, 5, 'easy', '1千克=1000克');
  END IF;
END $$;

-- ========================================
-- 4. 添加学生考试记录和成绩
-- ========================================

-- 为语文期中考试添加学生成绩
DO $$
DECLARE
  exam_id_chinese INT;
  student_ids INT[];
  student_id INT;
  exam_record_id INT;
BEGIN
  SELECT id INTO exam_id_chinese FROM exams WHERE title = '2024春季语文期中考试' LIMIT 1;
  SELECT ARRAY_AGG(id) INTO student_ids FROM users WHERE role = 'student' LIMIT 5;

  IF exam_id_chinese IS NOT NULL AND student_ids IS NOT NULL THEN
    FOREACH student_id IN ARRAY student_ids LOOP
      -- 插入考试记录
      INSERT INTO student_exams (student_id, exam_id, status, start_time, submit_time, score)
      VALUES (student_id, exam_id_chinese, 'graded',
              NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '80 minutes',
              75 + (RANDOM() * 20)::INT)
      RETURNING id INTO exam_record_id;

      -- 可以在这里添加具体的答题记录到answers表
    END LOOP;
  END IF;
END $$;

-- 为数学单元测试添加学生成绩
DO $$
DECLARE
  exam_id_math INT;
  student_ids INT[];
  student_id INT;
  exam_record_id INT;
BEGIN
  SELECT id INTO exam_id_math FROM exams WHERE title = '2024春季数学单元测试' LIMIT 1;
  SELECT ARRAY_AGG(id) INTO student_ids FROM users WHERE role = 'student' LIMIT 5;

  IF exam_id_math IS NOT NULL AND student_ids IS NOT NULL THEN
    FOREACH student_id IN ARRAY student_ids LOOP
      -- 插入考试记录
      INSERT INTO student_exams (student_id, exam_id, status, start_time, submit_time, score)
      VALUES (student_id, exam_id_math, 'graded',
              NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '55 minutes',
              70 + (RANDOM() * 25)::INT)
      RETURNING id INTO exam_record_id;
    END LOOP;
  END IF;
END $$;

-- ========================================
-- 5. 更新统计信息
-- ========================================

-- 查看新增的数据统计
SELECT '用户统计' as category, role, COUNT(*) as count FROM users GROUP BY role
UNION ALL
SELECT '考试统计', status, COUNT(*) FROM exams GROUP BY status
UNION ALL
SELECT '考试记录统计', status, COUNT(*) FROM student_exams GROUP BY status;

SELECT '数据添加完成！' as message;
