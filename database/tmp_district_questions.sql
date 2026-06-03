
-- ============================================
-- 云岩区教师创建的题目 (teacher_yy_ps_math user_id=18, teacher_yy_ps_it user_id=22)
-- ============================================
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by) VALUES
-- 云岩-数学
('single', '数学', '三年级', '小明有15颗糖，分给小朋友8颗，还剩几颗？', '["A. 6颗", "B. 7颗", "C. 8颗", "D. 23颗"]', '"B"', '15-8=7', 'easy', 'L1', 5, '{"运算能力"}', '{"减法"}', '{"减法"}', 18),
('true_false', '数学', '四年级', '平行四边形的对边相等。', '["A. 正确", "B. 错误"]', '"A"', '平行四边形的两组对边分别相等。', 'easy', 'L2', 5, '{"几何直观"}', '{"平行四边形"}', '{"四边形"}', 18),
('blank', '数学', '三年级', '24除以6等于（）。', NULL, '["4"]', '24/6=4', 'easy', 'L1', 5, '{"运算能力"}', '{"除法"}', '{"除法"}', 18),

-- 云岩-信息科技
('single', '信息科技', '三年级', '电脑桌面上的小图标叫什么？', '["A. 文件夹", "B. 快捷方式", "C. 回收站", "D. 任务栏"]', '"B"', '桌面图标通常是快捷方式。', 'easy', 'L1', 5, '{"信息意识"}', '{"Windows基础"}', '{"桌面"}', 22),
('true_false', '信息科技', '四年级', '打字时手指应该放在键盘的基准键上。', '["A. 正确", "B. 错误"]', '"A"', '基准键位是正确打字的基础。', 'easy', 'L2', 5, '{"计算思维"}', '{"键盘操作"}', '{"打字"}', 22),
('matching', '信息科技', '四年级', '请将软件与用途匹配。', '[{"left":"Word","right":"文档编辑"},{"left":"Excel","right":"表格处理"},{"left":"PowerPoint","right":"演示文稿"},{"left":"画图","right":"图像绘制"}]', '{"Word":"文档编辑","Excel":"表格处理","PowerPoint":"演示文稿","画图":"图像绘制"}', '常用办公软件对应功能。', 'medium', 'L3', 10, '{"计算思维"}', '{"办公软件"}', '{"软件"}', 22),

-- 南明区教师创建的题目 (teacher_nm_ps_math user_id=24, teacher_nm_ps_it user_id=28)
-- 南明-数学
('single', '数学', '四年级', '一个长方形的长是8厘米，宽是5厘米，面积是多少？', '["A. 13平方厘米", "B. 26平方厘米", "C. 40平方厘米", "D. 80平方厘米"]', '"C"', '8*5=40平方厘米', 'easy', 'L2', 5, '{"几何直观"}', '{"面积"}', '{"长方形"}', 24),
('true_false', '数学', '三年级', '1千米等于100米。', '["A. 正确", "B. 错误"]', '"B"', '1千米=1000米', 'easy', 'L1', 5, '{"数感"}', '{"长度单位"}', '{"单位换算"}', 24),
('blank', '数学', '四年级', '一个正方形的边长是6厘米，周长是（）厘米。', NULL, '["24"]', '6*4=24', 'easy', 'L2', 5, '{"运算能力"}', '{"周长"}', '{"正方形"}', 24),

-- 南明-信息科技
('single', '信息科技', '三年级', '以下哪个是输出设备？', '["A. 键盘", "B. 鼠标", "C. 打印机", "D. 扫描仪"]', '"C"', '打印机将电脑内容输出到纸上。', 'easy', 'L1', 5, '{"信息意识"}', '{"硬件"}', '{"输出设备"}', 28),
('true_false', '信息科技', '五年级', '算法就是解决问题的步骤。', '["A. 正确", "B. 错误"]', '"A"', '算法是解决问题的有序步骤。', 'easy', 'L3', 5, '{"计算思维"}', '{"算法"}', '{"算法"}', 28),
('blank', '信息科技', '四年级', '文件名由主名和（）组成。', NULL, '["扩展名"]', '文件名=主名.扩展名', 'easy', 'L2', 5, '{"信息意识"}', '{"文件管理"}', '{"文件"}', 28);

-- 发布到题库（带区级scope）
INSERT INTO question_bank (draft_id, scope, district_id, status, published_by, published_at, is_active, question_code)
SELECT id, 'practice_district', 1, 'published', created_by, NOW(), true, 'YY-' || LPAD(id::text, 4, '0')
FROM question_drafts WHERE created_by IN (18, 22)
ON CONFLICT DO NOTHING;

INSERT INTO question_bank (draft_id, scope, district_id, status, published_by, published_at, is_active, question_code)
SELECT id, 'practice_district', 2, 'published', created_by, NOW(), true, 'NM-' || LPAD(id::text, 4, '0')
FROM question_drafts WHERE created_by IN (24, 28)
ON CONFLICT DO NOTHING;
