
-- ============================================
-- 3. 补充学生活动答题数据
-- ============================================

-- 学生张小明(user_id=30, student_id=25) 完成数学考试(activity_id=1) 100分满分
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number)
VALUES (30, 1, 'graded', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 20.00, 'completed', 1);

-- 学生李小红(user_id=31, student_id=26) 完成数学考试 15分
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number)
VALUES (31, 1, 'graded', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 15.00, 'completed', 1);

-- 学生王小刚(user_id=32, student_id=27) 完成数学考试 20分(满分)
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number)
VALUES (32, 1, 'graded', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', 20.00, 'completed', 1);

-- 张小明 完成信息科技测验(activity_id=2) 30分(满分)
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number)
VALUES (30, 2, 'graded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', 30.00, 'completed', 1);

-- 李小红 完成信息科技测验 20分
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number)
VALUES (31, 2, 'graded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', 20.00, 'completed', 1);

-- 王小刚 完成信息科技测验 30分(满分)
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number)
VALUES (32, 2, 'graded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', 30.00, 'completed', 1);

-- ============================================
-- 4. 补充成就数据（模拟已触发的成就）
-- ============================================

-- 张小明(student_id=25) 获得：第一滴血、初体验、满分学霸
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, times_achieved) VALUES
(25, 1, NOW() - INTERVAL '1 day', 50, 1),   -- 第一滴血 EXAM_FIRST_ANY
(25, 10, NOW() - INTERVAL '1 day', 30, 1),  -- 初体验 EXAM_FIRST_COMPLETE
(25, 9, NOW() - INTERVAL '1 hour', 150, 1)  -- 满分学霸 EXAM_FIRST_PERFECT
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- 李小红(student_id=26) 获得：第一滴血、初体验
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, times_achieved) VALUES
(26, 1, NOW() - INTERVAL '1 day', 50, 1),   -- 第一滴血
(26, 10, NOW() - INTERVAL '1 day', 30, 1)   -- 初体验
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- 王小刚(student_id=27) 获得：第一滴血、初体验、满分学霸
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, times_achieved) VALUES
(27, 1, NOW() - INTERVAL '2 days', 50, 1),  -- 第一滴血
(27, 10, NOW() - INTERVAL '2 days', 30, 1), -- 初体验
(27, 9, NOW() - INTERVAL '1 day', 150, 1)   -- 满分学霸
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- ============================================
-- 5. 更新积分账户
-- ============================================
UPDATE student_points SET 
  current_points = 230, 
  total_points = 230, 
  spent_points = 0, 
  frozen_points = 0,
  last_updated = NOW()
WHERE student_id = 25;

UPDATE student_points SET 
  current_points = 80, 
  total_points = 80, 
  spent_points = 0, 
  frozen_points = 0,
  last_updated = NOW()
WHERE student_id = 26;

UPDATE student_points SET 
  current_points = 230, 
  total_points = 230, 
  spent_points = 0, 
  frozen_points = 0,
  last_updated = NOW()
WHERE student_id = 27;

-- ============================================
-- 6. 补充积分交易记录
-- ============================================
INSERT INTO points_transactions (student_id, transaction_type, points_amount, source_type, description, transaction_date) VALUES
(25, 'earn', 50, 'achievement', '获得成就：第一滴血', NOW() - INTERVAL '1 day'),
(25, 'earn', 30, 'achievement', '获得成就：初体验', NOW() - INTERVAL '1 day'),
(25, 'earn', 150, 'achievement', '获得成就：满分学霸', NOW() - INTERVAL '1 hour'),
(26, 'earn', 50, 'achievement', '获得成就：第一滴血', NOW() - INTERVAL '1 day'),
(26, 'earn', 30, 'achievement', '获得成就：初体验', NOW() - INTERVAL '1 day'),
(27, 'earn', 50, 'achievement', '获得成就：第一滴血', NOW() - INTERVAL '2 days'),
(27, 'earn', 30, 'achievement', '获得成就：初体验', NOW() - INTERVAL '2 days'),
(27, 'earn', 150, 'achievement', '获得成就：满分学霸', NOW() - INTERVAL '1 day');

-- ============================================
-- 7. 补充成就进度数据
-- ============================================
INSERT INTO achievement_progress (student_id, achievement_id, current_value, target_value, progress_percentage) VALUES
-- 张小明 - 连续登录3天 (已登录2天)
(25, 17, 2, 3, 67),
-- 张小明 - 学习10小时 (已学6小时)
(25, 11, 360, 600, 60),
-- 李小红 - 连续登录3天 (已登录1天)
(26, 17, 1, 3, 33),
-- 王小刚 - 连续登录3天 (已登录2天)
(27, 17, 2, 3, 67),
-- 王小刚 - 学习50小时 (已学30小时)
(27, 12, 1800, 3000, 60)
ON CONFLICT (student_id, achievement_id) DO NOTHING;
