-- 20261005 小程序端渠道埋点（计划书第8章）：移动端练习占比统计用
-- 学生答题 attempt 记录来源（web/mp），开始作答时写入
ALTER TABLE student_activities ADD COLUMN IF NOT EXISTS start_source VARCHAR(10) NOT NULL DEFAULT 'web';
-- 登录历史记录来源渠道
ALTER TABLE student_login_history ADD COLUMN IF NOT EXISTS client_source VARCHAR(10) NOT NULL DEFAULT 'web';
