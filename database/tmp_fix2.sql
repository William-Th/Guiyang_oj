
-- 补充云岩一小-李华(user_id=34) 和 云岩一小-张伟(user_id=35) 的活动记录
-- 先删除旧的冲突数据
DELETE FROM student_activities WHERE student_id IN (34, 35);

-- 李华(user_id=34) 数学期中考15分 + 信息科技20分
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number) VALUES
(34, 1, 'graded', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 15.00, 'completed', 1),
(34, 2, 'graded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', 20.00, 'completed', 1);

-- 张伟(user_id=35) 数学期中考满分 + 信息科技满分
INSERT INTO student_activities (student_id, activity_id, status, start_time, submit_time, score, grading_status, attempt_number) VALUES
(35, 1, 'graded', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', 20.00, 'completed', 1),
(35, 2, 'graded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', 30.00, 'completed', 1);

-- 清除旧成就，重新插入（用正确的 student_id=32,33 指向 students 表）
DELETE FROM student_achievements WHERE student_id IN (32, 31);
DELETE FROM achievement_progress WHERE student_id IN (32, 31);

-- 李华(student_id=32) 获得：第一滴血、初体验
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, times_achieved) VALUES
(32, 1, NOW() - INTERVAL '1 day', 50, 1),
(32, 10, NOW() - INTERVAL '1 day', 30, 1)
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- 张伟(student_id=31) 获得：第一滴血、初体验、满分学霸
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded, times_achieved) VALUES
(31, 1, NOW() - INTERVAL '2 days', 50, 1),
(31, 10, NOW() - INTERVAL '2 days', 30, 1),
(31, 9, NOW() - INTERVAL '1 day', 150, 1)
ON CONFLICT (student_id, achievement_id) DO NOTHING;

-- 更新积分
UPDATE student_points SET current_points = 80, total_points = 80, spent_points = 0, frozen_points = 0, last_updated = NOW() WHERE student_id = 32;
UPDATE student_points SET current_points = 230, total_points = 230, spent_points = 0, frozen_points = 0, last_updated = NOW() WHERE student_id = 31;

-- 积分交易
INSERT INTO points_transactions (student_id, points_change, transaction_type, source_type, description, balance_before, balance_after, created_at) VALUES
(32, 50, 'achievement', 'achievement', '获得成就：第一滴血', 0, 50, NOW() - INTERVAL '1 day'),
(32, 30, 'achievement', 'achievement', '获得成就：初体验', 50, 80, NOW() - INTERVAL '1 day'),
(31, 50, 'achievement', 'achievement', '获得成就：第一滴血', 0, 50, NOW() - INTERVAL '2 days'),
(31, 30, 'achievement', 'achievement', '获得成就：初体验', 50, 80, NOW() - INTERVAL '2 days'),
(31, 150, 'achievement', 'achievement', '获得成就：满分学霸', 80, 230, NOW() - INTERVAL '1 day');

-- 成就进度
INSERT INTO achievement_progress (student_id, achievement_id, current_value, target_value, progress_percentage) VALUES
(32, 17, 1, 3, 33),
(31, 17, 2, 3, 67),
(31, 12, 1800, 3000, 60)
ON CONFLICT (student_id, achievement_id) DO NOTHING;
