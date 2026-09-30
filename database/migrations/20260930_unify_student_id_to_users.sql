-- ============================================================================
-- 迁移：学生业务表 ID 统一为 users.id（一次性）
-- 日期：2026-09-30
--
-- 背景：平台历史上存在学生双 ID 空间——users.id（登录身份）与 students.id
-- （学生扩展表主键，经 students.user_id 1:1 关联）。不同表挂在不同的空间上，
-- 导致「张冠李戴」类错位 bug（证书验证显示别人名字、连胜永不更新、教学班
-- 加错学生等）。
--
-- 本迁移把所有**奖励/任务/班级成员**类表的 student_id 统一翻转为 users.id；
-- 答卷/错题/推荐练习/知识点统计等表本来就是 users.id，不动。
-- 统一后规则：**所有业务表 student_id = 学生的 users.id**；students 表仅作为
-- 属性扩展表（school/class/student_no/grade），经 students.user_id 关联。
--
-- ⚠️ 一次性迁移：不可重复执行（students.id 与 users.id 数值区间重叠，
--    二次执行会把已翻转的行再次错位）。已通过自检脚本验证翻转结果。
-- ============================================================================

-- 逐表翻转：students.id → users.id（只匹配当前确实挂在 students.id 上的行）
UPDATE student_points sp
   SET student_id = s.user_id
  FROM students s
 WHERE sp.student_id = s.id;

UPDATE points_transactions pt
   SET student_id = s.user_id
  FROM students s
 WHERE pt.student_id = s.id;

UPDATE student_points_daily pd
   SET student_id = s.user_id
  FROM students s
 WHERE pd.student_id = s.id;

UPDATE student_streaks st
   SET student_id = s.user_id
  FROM students s
 WHERE st.student_id = s.id;

UPDATE student_achievements sa
   SET student_id = s.user_id
  FROM students s
 WHERE sa.student_id = s.id;

UPDATE achievement_progress ap
   SET student_id = s.user_id
  FROM students s
 WHERE ap.student_id = s.id;

UPDATE certificates c
   SET student_id = s.user_id
  FROM students s
 WHERE c.student_id = s.id;

UPDATE leaderboards l
   SET student_id = s.user_id
  FROM students s
 WHERE l.student_id = s.id;

UPDATE student_purchases sp2
   SET student_id = s.user_id
  FROM students s
 WHERE sp2.student_id = s.id;

UPDATE student_daily_tasks sdt
   SET student_id = s.user_id
  FROM students s
 WHERE sdt.student_id = s.id;

UPDATE student_task_progress stp
   SET student_id = s.user_id
  FROM students s
 WHERE stp.student_id = s.id;

UPDATE task_completion_history tch
   SET student_id = s.user_id
  FROM students s
 WHERE tch.student_id = s.id;

UPDATE student_login_history slh
   SET student_id = s.user_id
  FROM students s
 WHERE slh.student_id = s.id;

-- teaching_class_members：当前数据已是 users.id 口径，不翻数据；
-- 代码侧 validateStudentScope 已改为按 user_id 校验。

-- ============================================================================
-- 第二部分：外键约束翻转到 users(id)
-- 统一后这些表的 student_id 必须引用 users(id)（原引用 students(id)，
-- 会因 users.id 数值不在 students.id 值域内而插入失败）
-- ============================================================================
ALTER TABLE achievement_progress DROP CONSTRAINT achievement_progress_student_id_fkey;
ALTER TABLE achievement_progress ADD CONSTRAINT achievement_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE leaderboards DROP CONSTRAINT leaderboards_student_id_fkey;
ALTER TABLE leaderboards ADD CONSTRAINT leaderboards_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE points_transactions DROP CONSTRAINT points_transactions_student_id_fkey;
ALTER TABLE points_transactions ADD CONSTRAINT points_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE student_achievements DROP CONSTRAINT student_achievements_student_id_fkey;
ALTER TABLE student_achievements ADD CONSTRAINT student_achievements_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE student_daily_tasks DROP CONSTRAINT student_daily_tasks_student_id_fkey;
ALTER TABLE student_daily_tasks ADD CONSTRAINT student_daily_tasks_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE student_login_history DROP CONSTRAINT fk_student_login_student;
ALTER TABLE student_login_history ADD CONSTRAINT fk_student_login_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE student_points DROP CONSTRAINT student_points_student_id_fkey;
ALTER TABLE student_points ADD CONSTRAINT student_points_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE student_task_progress DROP CONSTRAINT student_task_progress_student_id_fkey;
ALTER TABLE student_task_progress ADD CONSTRAINT student_task_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE task_completion_history DROP CONSTRAINT task_completion_history_student_id_fkey;
ALTER TABLE task_completion_history ADD CONSTRAINT task_completion_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE teaching_class_members DROP CONSTRAINT teaching_class_members_student_id_fkey;
ALTER TABLE teaching_class_members ADD CONSTRAINT teaching_class_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
