-- Migration 051: 刷题类成就种子（B2）
-- Date: 2026-06-17
-- Description: 补齐刷题数量类成就，event=student.practice.completed，靠 eventData.count 触发。

BEGIN;

INSERT INTO achievements
  (achievement_code, achievement_name, achievement_desc, category, rarity,
   points_reward, trigger_condition, is_active, max_times, display_order)
VALUES
  ('PRACTICE_CORRECT_10', '初出茅庐', '累计答对 10 道题', 'learning_growth', 'common', 10,
   '{"trigger_mode":"real_time","condition_type":"count","event_name":"student.practice.completed","target_count":10}'::jsonb,
   true, 1, 100),
  ('PRACTICE_CORRECT_100', '勤学苦练', '累计答对 100 道题', 'learning_growth', 'rare', 50,
   '{"trigger_mode":"real_time","condition_type":"count","event_name":"student.practice.completed","target_count":100}'::jsonb,
   true, 1, 101),
  ('PRACTICE_CORRECT_500', '刷题大师', '累计答对 500 道题', 'learning_growth', 'epic', 200,
   '{"trigger_mode":"real_time","condition_type":"count","event_name":"student.practice.completed","target_count":500}'::jsonb,
   true, 1, 102)
ON CONFLICT DO NOTHING;

COMMIT;
