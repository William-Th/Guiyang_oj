-- 手动授予个人成就
-- 创建日期: 2025-11-20
-- 用途: 为已完成10次练习的学生手动授予成就

BEGIN;

-- 获取学生完成的练习数量
SELECT
    '学生完成练习数量' AS check_item,
    COUNT(*) AS count
FROM student_activities
WHERE student_id = 1
  AND status = 'submitted';

-- 授予成就：初试锋芒 (PRACTICE_FIRST - 完成1次练习)
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded)
SELECT
    1,
    achievement_id,
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    points_reward
FROM achievements
WHERE achievement_code = 'PRACTICE_FIRST'
  AND NOT EXISTS (
    SELECT 1 FROM student_achievements
    WHERE student_id = 1 AND achievement_id = achievements.achievement_id
  );

-- 授予成就：勤学苦练 (PRACTICE_5 - 完成5次练习)
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded)
SELECT
    1,
    achievement_id,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    points_reward
FROM achievements
WHERE achievement_code = 'PRACTICE_5'
  AND NOT EXISTS (
    SELECT 1 FROM student_achievements
    WHERE student_id = 1 AND achievement_id = achievements.achievement_id
  );

-- 授予成就：百炼成钢 (PRACTICE_10 - 完成10次练习)
INSERT INTO student_achievements (student_id, achievement_id, achieved_at, points_awarded)
SELECT
    1,
    achievement_id,
    CURRENT_TIMESTAMP,
    points_reward
FROM achievements
WHERE achievement_code = 'PRACTICE_10'
  AND NOT EXISTS (
    SELECT 1 FROM student_achievements
    WHERE student_id = 1 AND achievement_id = achievements.achievement_id
  );

-- 验证授予结果
SELECT
    a.achievement_code,
    a.achievement_name,
    sa.achieved_at,
    sa.points_awarded
FROM student_achievements sa
JOIN achievements a ON sa.achievement_id = a.achievement_id
WHERE sa.student_id = 1
  AND a.achievement_code IN ('PRACTICE_FIRST', 'PRACTICE_5', 'PRACTICE_10')
ORDER BY sa.achieved_at;

COMMIT;
