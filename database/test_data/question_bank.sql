-- ===================================================================
-- 题库测试数据脚本
-- 整合自: supplement_questions.sql, add_question_bank_data.sql, insert_baiyun_questions.sql
-- 创建日期: 2025-11-21
-- ===================================================================
-- 说明:
-- 1. 本文件包含所有题库测试数据（数学 + 信息科技）
-- 2. 数据来源:
--    - 市级练习题库: 数学和信息科技各年级（1-9年级）
--    - 区级题库: 白云区特色题目
--    - 草稿题库: 教师练习用草稿题
-- 3. 题目状态:
--    - published: 市级练习题库，对全市开放
--    - approved: 区级练习题库，经过审核
--    - draft: 草稿题，供教师练习使用
-- 4. 创建者:
--    - ID=1: 系统管理员（市级题库）
--    - ID=9: 陈刚-白云一小（白云区数学）
--    - ID=12: 王芳-白云一中（白云区信息科技）
--    - ID=17: 周杰-南明一中（七年级数学草稿）
--    - ID=22: 韩雪-云岩一小（七年级信息科技草稿）
-- ===================================================================

-- 清理可能存在的旧测试数据（可选，首次导入时注释掉）
-- DELETE FROM question_bank WHERE created_by IN (1, 9, 12, 17, 22);

-- ===================================================================
-- 第一部分: 市级练习题库
-- 来源: add_question_bank_data.sql
-- ===================================================================

-- ===================================================================
-- 题库数据批量添加脚本
-- 任务说明：
-- 1. 为数学和信息科技每个年级增加10道题目（市级练习题库）
-- 2. 为teacher_nm_ms_math(ID:17)创建20道初一数学草稿题
-- 3. 为teacher_yy_ps_it(ID:22)创建20道初一信息科技草稿题
-- 4. 删除非数学和信息科技科目的题目
--
-- 注意：正确的列名和数据格式
-- - type (不是question_type): 'single', 'multiple', 'blank', 'true_false'
-- - difficulty (不是difficulty_level): 'easy', 'medium', 'hard'
-- - abilities (不是ability_dimension): text数组格式 '{能力}'
-- - explanation (不是analysis): text
-- - scope (不是publish_scope): text数组 '{practice_municipal}' 或 '{}'
-- - options: JSONB格式 '["选项1", "选项2"]'::jsonb
-- - correct_answer: JSONB格式 '"A"'::jsonb 或 '["A","B"]'::jsonb
-- ===================================================================

BEGIN;

-- ===================================================================
-- 任务4: 先删除非数学和信息科技科目的题目
-- ===================================================================
DELETE FROM question_bank WHERE subject NOT IN ('数学', '信息科技');

-- ===================================================================
-- 任务1: 为数学各年级增加10道题目（市级练习题库）
-- ===================================================================

-- 数学-一年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH1001', '数学', '一年级', 'single', '5 + 3 = ?', 'easy', '{运算能力}',
 '["6", "7", "8", "9"]'::jsonb, '"C"'::jsonb, '5加3等于8', 1, 'published', '{practice_municipal}', NOW()),
('MATH1002', '数学', '一年级', 'single', '从左数第3个是哪个数字：1 2 3 4 5', 'easy', '{数感}',
 '["1", "2", "3", "4"]'::jsonb, '"C"'::jsonb, '从左边数第三个位置是数字3', 1, 'published', '{practice_municipal}', NOW()),
('MATH1003', '数学', '一年级', 'single', '比7大1的数是多少？', 'easy', '{数感}',
 '["6", "7", "8", "9"]'::jsonb, '"C"'::jsonb, '7加1等于8', 1, 'published', '{practice_municipal}', NOW()),
('MATH1004', '数学', '一年级', 'single', '9 - 4 = ?', 'easy', '{运算能力}',
 '["3", "4", "5", "6"]'::jsonb, '"C"'::jsonb, '9减4等于5', 1, 'published', '{practice_municipal}', NOW()),
('MATH1005', '数学', '一年级', 'single', '一个正方形有几条边？', 'easy', '{图形认知}',
 '["3", "4", "5", "6"]'::jsonb, '"B"'::jsonb, '正方形有4条边', 1, 'published', '{practice_municipal}', NOW()),
('MATH1006', '数学', '一年级', 'multiple', '下面哪些数字比5大？', 'medium', '{数感}',
 '["3", "6", "7", "4"]'::jsonb, '["B", "C"]'::jsonb, '6和7都比5大', 1, 'published', '{practice_municipal}', NOW()),
('MATH1007', '数学', '一年级', 'true_false', '10比5大', 'easy', '{数感}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '10确实比5大', 1, 'published', '{practice_municipal}', NOW()),
('MATH1008', '数学', '一年级', 'blank', '6 + __ = 10', 'medium', '{运算能力}',
 '[]'::jsonb, '"4"'::jsonb, '6加4等于10', 1, 'published', '{practice_municipal}', NOW()),
('MATH1009', '数学', '一年级', 'single', '3个苹果和2个苹果一共几个？', 'easy', '{运算能力}',
 '["4", "5", "6", "7"]'::jsonb, '"B"'::jsonb, '3加2等于5', 1, 'published', '{practice_municipal}', NOW()),
('MATH1010', '数学', '一年级', 'single', '哪个选项是三角形？', 'easy', '{图形认知}',
 '["正方形", "圆形", "三角形", "五角星"]'::jsonb, '"C"'::jsonb, '三角形有三条边和三个角', 1, 'published', '{practice_municipal}', NOW());

-- 数学-二年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH2001', '数学', '二年级', 'single', '25 + 13 = ?', 'easy', '{运算能力}',
 '["36", "37", "38", "39"]'::jsonb, '"C"'::jsonb, '25加13等于38', 1, 'published', '{practice_municipal}', NOW()),
('MATH2002', '数学', '二年级', 'single', '45 - 28 = ?', 'medium', '{运算能力}',
 '["15", "16", "17", "18"]'::jsonb, '"C"'::jsonb, '45减28等于17', 1, 'published', '{practice_municipal}', NOW()),
('MATH2003', '数学', '二年级', 'single', '3 × 4 = ?', 'easy', '{运算能力}',
 '["10", "11", "12", "13"]'::jsonb, '"C"'::jsonb, '3乘4等于12', 1, 'published', '{practice_municipal}', NOW()),
('MATH2004', '数学', '二年级', 'single', '一个长方形有几个直角？', 'easy', '{图形认知}',
 '["2", "3", "4", "5"]'::jsonb, '"C"'::jsonb, '长方形有4个直角', 1, 'published', '{practice_municipal}', NOW()),
('MATH2005', '数学', '二年级', 'single', '100里面有几个10？', 'medium', '{数感}',
 '["5", "8", "10", "12"]'::jsonb, '"C"'::jsonb, '100除以10等于10', 1, 'published', '{practice_municipal}', NOW()),
('MATH2006', '数学', '二年级', 'multiple', '以下哪些是偶数？', 'medium', '{数感}',
 '["3", "6", "7", "8"]'::jsonb, '["B", "D"]'::jsonb, '偶数能被2整除，6和8都是偶数', 1, 'published', '{practice_municipal}', NOW()),
('MATH2007', '数学', '二年级', 'true_false', '5 × 2 = 2 × 5', 'easy', '{运算规律}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '乘法交换律：a×b = b×a', 1, 'published', '{practice_municipal}', NOW()),
('MATH2008', '数学', '二年级', 'blank', '7 × __ = 42', 'medium', '{运算能力}',
 '[]'::jsonb, '"6"'::jsonb, '42除以7等于6', 1, 'published', '{practice_municipal}', NOW()),
('MATH2009', '数学', '二年级', 'single', '1米等于多少厘米？', 'easy', '{单位换算}',
 '["10", "50", "100", "1000"]'::jsonb, '"C"'::jsonb, '1米=100厘米', 1, 'published', '{practice_municipal}', NOW()),
('MATH2010', '数学', '二年级', 'single', '小明有20元，买了5元的笔，还剩多少元？', 'medium', '{应用题}',
 '["10", "12", "15", "18"]'::jsonb, '"C"'::jsonb, '20-5=15元', 1, 'published', '{practice_municipal}', NOW());

-- 数学-三年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH3001', '数学', '三年级', 'single', '125 + 238 = ?', 'easy', '{运算能力}',
 '["353", "363", "373", "383"]'::jsonb, '"B"'::jsonb, '125加238等于363', 1, 'published', '{practice_municipal}', NOW()),
('MATH3002', '数学', '三年级', 'single', '456 - 189 = ?', 'medium', '{运算能力}',
 '["257", "267", "277", "287"]'::jsonb, '"B"'::jsonb, '456减189等于267', 1, 'published', '{practice_municipal}', NOW()),
('MATH3003', '数学', '三年级', 'single', '15 × 6 = ?', 'medium', '{运算能力}',
 '["80", "85", "90", "95"]'::jsonb, '"C"'::jsonb, '15乘6等于90', 1, 'published', '{practice_municipal}', NOW()),
('MATH3004', '数学', '三年级', 'single', '一个正方形的边长是5厘米，周长是多少厘米？', 'medium', '{几何计算}',
 '["15", "20", "25", "30"]'::jsonb, '"B"'::jsonb, '正方形周长=边长×4=5×4=20', 1, 'published', '{practice_municipal}', NOW()),
('MATH3005', '数学', '三年级', 'single', '72 ÷ 8 = ?', 'easy', '{运算能力}',
 '["7", "8", "9", "10"]'::jsonb, '"C"'::jsonb, '72除以8等于9', 1, 'published', '{practice_municipal}', NOW()),
('MATH3006', '数学', '三年级', 'multiple', '以下哪些数字能被3整除？', 'medium', '{数感}',
 '["15", "17", "18", "20"]'::jsonb, '["A", "C"]'::jsonb, '15和18都能被3整除', 1, 'published', '{practice_municipal}', NOW()),
('MATH3007', '数学', '三年级', 'true_false', '1千克=1000克', 'easy', '{单位换算}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '1千克确实等于1000克', 1, 'published', '{practice_municipal}', NOW()),
('MATH3008', '数学', '三年级', 'blank', '一个长方形长8厘米，宽5厘米，面积是__平方厘米', 'medium', '{几何计算}',
 '[]'::jsonb, '"40"'::jsonb, '长方形面积=长×宽=8×5=40', 1, 'published', '{practice_municipal}', NOW()),
('MATH3009', '数学', '三年级', 'single', '分数3/4读作？', 'easy', '{分数认知}',
 '["三分之四", "四分之三", "三比四", "四比三"]'::jsonb, '"B"'::jsonb, '分子在前，分母在后，读作四分之三', 1, 'published', '{practice_municipal}', NOW()),
('MATH3010', '数学', '三年级', 'single', '小红买了3本书，每本12元，一共花了多少元？', 'medium', '{应用题}',
 '["30", "34", "36", "40"]'::jsonb, '"C"'::jsonb, '3×12=36元', 1, 'published', '{practice_municipal}', NOW());

-- 数学-四年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH4001', '数学', '四年级', 'single', '2356 + 1478 = ?', 'easy', '{运算能力}',
 '["3824", "3834", "3844", "3854"]'::jsonb, '"B"'::jsonb, '2356加1478等于3834', 1, 'published', '{practice_municipal}', NOW()),
('MATH4002', '数学', '四年级', 'single', '5000 - 2387 = ?', 'medium', '{运算能力}',
 '["2603", "2613", "2623", "2633"]'::jsonb, '"B"'::jsonb, '5000减2387等于2613', 1, 'published', '{practice_municipal}', NOW()),
('MATH4003', '数学', '四年级', 'single', '125 × 8 = ?', 'medium', '{运算能力}',
 '["900", "950", "1000", "1050"]'::jsonb, '"C"'::jsonb, '125乘8等于1000', 1, 'published', '{practice_municipal}', NOW()),
('MATH4004', '数学', '四年级', 'single', '一个平行四边形的底是10厘米，高是6厘米，面积是多少平方厘米？', 'medium', '{几何计算}',
 '["50", "60", "70", "80"]'::jsonb, '"B"'::jsonb, '平行四边形面积=底×高=10×6=60', 1, 'published', '{practice_municipal}', NOW()),
('MATH4005', '数学', '四年级', 'single', '3.5 + 2.8 = ?', 'easy', '{小数运算}',
 '["6.1", "6.2", "6.3", "6.4"]'::jsonb, '"C"'::jsonb, '3.5加2.8等于6.3', 1, 'published', '{practice_municipal}', NOW()),
('MATH4006', '数学', '四年级', 'multiple', '以下哪些是质数？', 'hard', '{数感}',
 '["4", "7", "9", "11"]'::jsonb, '["B", "D"]'::jsonb, '质数只能被1和自身整除，7和11是质数', 1, 'published', '{practice_municipal}', NOW()),
('MATH4007', '数学', '四年级', 'true_false', '0.5 = 1/2', 'easy', '{分数与小数}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '0.5确实等于二分之一', 1, 'published', '{practice_municipal}', NOW()),
('MATH4008', '数学', '四年级', 'blank', '一个三角形的底是12厘米，高是8厘米，面积是__平方厘米', 'medium', '{几何计算}',
 '[]'::jsonb, '"48"'::jsonb, '三角形面积=底×高÷2=12×8÷2=48', 1, 'published', '{practice_municipal}', NOW()),
('MATH4009', '数学', '四年级', 'single', '比较大小：2/3 __ 3/4', 'medium', '{分数比较}',
 '["大于", "小于", "等于", "无法比较"]'::jsonb, '"B"'::jsonb, '2/3=8/12，3/4=9/12，所以2/3<3/4', 1, 'published', '{practice_municipal}', NOW()),
('MATH4010', '数学', '四年级', 'single', '一辆汽车每小时行驶60千米，3.5小时行驶多少千米？', 'medium', '{应用题}',
 '["200", "210", "220", "230"]'::jsonb, '"B"'::jsonb, '60×3.5=210千米', 1, 'published', '{practice_municipal}', NOW());

-- 数学-五年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH5001', '数学', '五年级', 'single', '2.5 × 4 = ?', 'easy', '{小数运算}',
 '["9", "10", "11", "12"]'::jsonb, '"B"'::jsonb, '2.5乘4等于10', 1, 'published', '{practice_municipal}', NOW()),
('MATH5002', '数学', '五年级', 'single', '7.2 ÷ 0.8 = ?', 'medium', '{小数运算}',
 '["8", "9", "10", "11"]'::jsonb, '"B"'::jsonb, '7.2除以0.8等于9', 1, 'published', '{practice_municipal}', NOW()),
('MATH5003', '数学', '五年级', 'single', '一个圆的半径是5厘米，直径是多少厘米？', 'easy', '{几何计算}',
 '["5", "10", "15", "20"]'::jsonb, '"B"'::jsonb, '直径=半径×2=5×2=10', 1, 'published', '{practice_municipal}', NOW()),
('MATH5004', '数学', '五年级', 'single', '3/4 + 1/4 = ?', 'easy', '{分数运算}',
 '["1/2", "3/4", "1", "5/4"]'::jsonb, '"C"'::jsonb, '同分母分数相加，分子相加，3/4+1/4=4/4=1', 1, 'published', '{practice_municipal}', NOW()),
('MATH5005', '数学', '五年级', 'single', '一个长方体的长是8厘米，宽是5厘米，高是3厘米，体积是多少立方厘米？', 'medium', '{几何计算}',
 '["100", "110", "120", "130"]'::jsonb, '"C"'::jsonb, '长方体体积=长×宽×高=8×5×3=120', 1, 'published', '{practice_municipal}', NOW()),
('MATH5006', '数学', '五年级', 'multiple', '以下哪些分数可以化简？', 'medium', '{分数化简}',
 '["2/3", "4/6", "6/9", "5/7"]'::jsonb, '["B", "C"]'::jsonb, '4/6=2/3，6/9=2/3，都可以化简', 1, 'published', '{practice_municipal}', NOW()),
('MATH5007', '数学', '五年级', 'true_false', '圆的周长公式是 C = 2πr', 'easy', '{几何公式}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '圆的周长公式确实是2πr或πd', 1, 'published', '{practice_municipal}', NOW()),
('MATH5008', '数学', '五年级', 'blank', '一个正方体的棱长是4厘米，表面积是__平方厘米', 'hard', '{几何计算}',
 '[]'::jsonb, '"96"'::jsonb, '正方体表面积=6×棱长²=6×4²=6×16=96', 1, 'published', '{practice_municipal}', NOW()),
('MATH5009', '数学', '五年级', 'single', '小数0.125化成分数是？', 'medium', '{小数与分数}',
 '["1/4", "1/5", "1/6", "1/8"]'::jsonb, '"D"'::jsonb, '0.125=125/1000=1/8', 1, 'published', '{practice_municipal}', NOW()),
('MATH5010', '数学', '五年级', 'single', '一个水池长10米，宽8米，深2米，容积是多少立方米？', 'medium', '{应用题}',
 '["140", "150", "160", "170"]'::jsonb, '"C"'::jsonb, '10×8×2=160立方米', 1, 'published', '{practice_municipal}', NOW());

-- 数学-六年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH6001', '数学', '六年级', 'single', '(-5) + 3 = ?', 'easy', '{有理数运算}',
 '["-8", "-2", "2", "8"]'::jsonb, '"B"'::jsonb, '负5加正3等于负2', 1, 'published', '{practice_municipal}', NOW()),
('MATH6002', '数学', '六年级', 'single', '2 - (-3) = ?', 'medium', '{有理数运算}',
 '["1", "5", "-1", "-5"]'::jsonb, '"B"'::jsonb, '减去一个负数等于加上它的相反数，2-(-3)=2+3=5', 1, 'published', '{practice_municipal}', NOW()),
('MATH6003', '数学', '六年级', 'single', '圆柱的体积公式是？', 'easy', '{几何公式}',
 '["πr²", "πr²h", "2πr", "2πrh"]'::jsonb, '"B"'::jsonb, '圆柱体积=底面积×高=πr²h', 1, 'published', '{practice_municipal}', NOW()),
('MATH6004', '数学', '六年级', 'single', '比例式 3:4 = x:12 中，x等于多少？', 'medium', '{比例}',
 '["6", "7", "8", "9"]'::jsonb, '"D"'::jsonb, '根据比例的基本性质，4x=3×12=36，x=9', 1, 'published', '{practice_municipal}', NOW()),
('MATH6005', '数学', '六年级', 'single', '一个圆的半径扩大2倍，面积扩大多少倍？', 'hard', '{几何变换}',
 '["2倍", "3倍", "4倍", "8倍"]'::jsonb, '"C"'::jsonb, '半径扩大2倍，面积扩大2²=4倍', 1, 'published', '{practice_municipal}', NOW()),
('MATH6006', '数学', '六年级', 'multiple', '以下哪些是负数？', 'easy', '{数感}',
 '["-5", "0", "3", "-0.5"]'::jsonb, '["A", "D"]'::jsonb, '-5和-0.5都是负数', 1, 'published', '{practice_municipal}', NOW()),
('MATH6007', '数学', '六年级', 'true_false', '所有的整数都是有理数', 'easy', '{数的分类}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '整数都可以表示为分数形式，都是有理数', 1, 'published', '{practice_municipal}', NOW()),
('MATH6008', '数学', '六年级', 'blank', '一个圆锥的底面半径是3厘米，高是4厘米，体积是__立方厘米（π取3.14）', 'hard', '{几何计算}',
 '[]'::jsonb, '"37.68"'::jsonb, '圆锥体积=1/3×πr²h=1/3×3.14×3²×4=37.68', 1, 'published', '{practice_municipal}', NOW()),
('MATH6009', '数学', '六年级', 'single', '百分数60%化成小数是？', 'easy', '{百分数}',
 '["0.06", "0.6", "6", "60"]'::jsonb, '"B"'::jsonb, '60%=60/100=0.6', 1, 'published', '{practice_municipal}', NOW()),
('MATH6010', '数学', '六年级', 'single', '某商品原价100元，打8折后价格是多少元？', 'medium', '{应用题}',
 '["70", "75", "80", "85"]'::jsonb, '"C"'::jsonb, '100×80%=80元', 1, 'published', '{practice_municipal}', NOW());

-- 数学-七年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH7001', '数学', '七年级', 'single', '(-8) + (-5) = ?', 'easy', '{有理数运算}',
 '["-13", "-3", "3", "13"]'::jsonb, '"A"'::jsonb, '两个负数相加，绝对值相加，结果为负', 1, 'published', '{practice_municipal}', NOW()),
('MATH7002', '数学', '七年级', 'single', '(-2) × 3 = ?', 'easy', '{有理数运算}',
 '["-6", "-5", "5", "6"]'::jsonb, '"A"'::jsonb, '负数乘正数得负数', 1, 'published', '{practice_municipal}', NOW()),
('MATH7003', '数学', '七年级', 'single', '2x + 5 = 15，求x的值', 'medium', '{一元一次方程}',
 '["3", "4", "5", "6"]'::jsonb, '"C"'::jsonb, '2x=15-5=10，x=5', 1, 'published', '{practice_municipal}', NOW()),
('MATH7004', '数学', '七年级', 'single', '合并同类项：3x + 2x = ?', 'easy', '{代数运算}',
 '["5x", "5x²", "6x", "x"]'::jsonb, '"A"'::jsonb, '系数相加，字母和指数不变', 1, 'published', '{practice_municipal}', NOW()),
('MATH7005', '数学', '七年级', 'single', '平角等于多少度？', 'easy', '{几何基础}',
 '["90°", "180°", "270°", "360°"]'::jsonb, '"B"'::jsonb, '平角等于180度', 1, 'published', '{practice_municipal}', NOW()),
('MATH7006', '数学', '七年级', 'multiple', '以下哪些是单项式？', 'medium', '{代数识别}',
 '["2x", "x+y", "3xy", "5"]'::jsonb, '["A", "C", "D"]'::jsonb, '单项式是数字或字母的乘积', 1, 'published', '{practice_municipal}', NOW()),
('MATH7007', '数学', '七年级', 'true_false', '两条直线被第三条直线所截，同位角相等', 'easy', '{几何定理}',
 '["正确", "错误"]'::jsonb, '"B"'::jsonb, '只有在两直线平行时，同位角才相等', 1, 'published', '{practice_municipal}', NOW()),
('MATH7008', '数学', '七年级', 'blank', '如果 3x - 7 = 8，那么 x = __', 'medium', '{方程求解}',
 '[]'::jsonb, '"5"'::jsonb, '3x=8+7=15，x=5', 1, 'published', '{practice_municipal}', NOW()),
('MATH7009', '数学', '七年级', 'single', '(-3)² = ?', 'easy', '{乘方运算}',
 '["-9", "-6", "6", "9"]'::jsonb, '"D"'::jsonb, '(-3)²=(-3)×(-3)=9', 1, 'published', '{practice_municipal}', NOW()),
('MATH7010', '数学', '七年级', 'single', '小明买了x支铅笔，每支2元，付了20元，应找回多少元？', 'medium', '{应用题}',
 '["20-x", "20-2x", "2x-20", "x-20"]'::jsonb, '"B"'::jsonb, '找零=付款-花费=20-2x', 1, 'published', '{practice_municipal}', NOW());

-- 数学-八年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH8001', '数学', '八年级', 'single', '√16 = ?', 'easy', '{二次根式}',
 '["2", "3", "4", "8"]'::jsonb, '"C"'::jsonb, '16的算术平方根是4', 1, 'published', '{practice_municipal}', NOW()),
('MATH8002', '数学', '八年级', 'single', '勾股定理：直角三角形两直角边长为3和4，斜边长为？', 'medium', '{勾股定理}',
 '["5", "6", "7", "8"]'::jsonb, '"A"'::jsonb, 'c²=a²+b²=9+16=25，c=5', 1, 'published', '{practice_municipal}', NOW()),
('MATH8003', '数学', '八年级', 'single', '因式分解：x² - 9 = ?', 'medium', '{因式分解}',
 '["(x-3)(x-3)", "(x+3)(x+3)", "(x-3)(x+3)", "x(x-9)"]'::jsonb, '"C"'::jsonb, '平方差公式：a²-b²=(a+b)(a-b)', 1, 'published', '{practice_municipal}', NOW()),
('MATH8004', '数学', '八年级', 'single', '一次函数 y = 2x + 1 的图像经过哪个象限？', 'hard', '{函数图像}',
 '["一、二、三", "一、二、四", "二、三、四", "一、三、四"]'::jsonb, '"A"'::jsonb, 'k>0,b>0，图像经过一、二、三象限', 1, 'published', '{practice_municipal}', NOW()),
('MATH8005', '数学', '八年级', 'single', '平行四边形的对角线互相？', 'easy', '{几何性质}',
 '["垂直", "平分", "相等", "平行"]'::jsonb, '"B"'::jsonb, '平行四边形的对角线互相平分', 1, 'published', '{practice_municipal}', NOW()),
('MATH8006', '数学', '八年级', 'multiple', '以下哪些是完全平方公式？', 'medium', '{代数公式}',
 '["(a+b)²=a²+2ab+b²", "(a-b)²=a²-2ab+b²", "a²-b²=(a+b)(a-b)", "(a+b)(a-b)=a²-b²"]'::jsonb, '["A", "B"]'::jsonb, '前两个是完全平方公式', 1, 'published', '{practice_municipal}', NOW()),
('MATH8007', '数学', '八年级', 'true_false', '全等三角形的对应角相等', 'easy', '{全等三角形}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '全等三角形的对应边相等，对应角也相等', 1, 'published', '{practice_municipal}', NOW()),
('MATH8008', '数学', '八年级', 'blank', '分式 (x²-1)/(x-1) 化简后等于__（x≠1）', 'medium', '{分式化简}',
 '[]'::jsonb, '"x+1"'::jsonb, 'x²-1=(x+1)(x-1)，约分后得x+1', 1, 'published', '{practice_municipal}', NOW()),
('MATH8009', '数学', '八年级', 'single', '等腰三角形的两边长为5和10，第三边长为？', 'medium', '{三角形性质}',
 '["5", "10", "15", "5或10"]'::jsonb, '"B"'::jsonb, '如果5是腰，5+5<10不满足三角形不等式，所以10是腰，第三边为10', 1, 'published', '{practice_municipal}', NOW()),
('MATH8010', '数学', '八年级', 'single', '若分式 (x-2)/(x+3) 的值为0，则x的值为？', 'medium', '{分式方程}',
 '["0", "2", "3", "-3"]'::jsonb, '"B"'::jsonb, '分式值为0，分子为0且分母不为0，x-2=0，x=2', 1, 'published', '{practice_municipal}', NOW());

-- 数学-九年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('MATH9001', '数学', '九年级', 'single', '方程 x² - 5x + 6 = 0 的解是？', 'medium', '{一元二次方程}',
 '["x=1或x=6", "x=2或x=3", "x=-2或x=-3", "x=1或x=5"]'::jsonb, '"B"'::jsonb, '因式分解：(x-2)(x-3)=0，x=2或x=3', 1, 'published', '{practice_municipal}', NOW()),
('MATH9002', '数学', '九年级', 'single', '二次函数 y = x² - 2x + 1 的顶点坐标是？', 'hard', '{二次函数}',
 '["(0,1)", "(1,0)", "(2,1)", "(-1,4)"]'::jsonb, '"B"'::jsonb, 'y=(x-1)²，顶点为(1,0)', 1, 'published', '{practice_municipal}', NOW()),
('MATH9003', '数学', '九年级', 'single', '圆的半径为5，圆心到直线的距离为3，直线与圆的位置关系是？', 'medium', '{直线与圆}',
 '["相离", "相切", "相交", "无法确定"]'::jsonb, '"C"'::jsonb, '距离3<半径5，直线与圆相交', 1, 'published', '{practice_municipal}', NOW()),
('MATH9004', '数学', '九年级', 'single', 'sin30° = ?', 'easy', '{三角函数}',
 '["1/2", "√2/2", "√3/2", "1"]'::jsonb, '"A"'::jsonb, 'sin30°=1/2是特殊角三角函数值', 1, 'published', '{practice_municipal}', NOW()),
('MATH9005', '数学', '九年级', 'single', '圆的切线性质：切线与半径的关系？', 'easy', '{圆的性质}',
 '["平行", "垂直", "相等", "相交"]'::jsonb, '"B"'::jsonb, '圆的切线垂直于过切点的半径', 1, 'published', '{practice_municipal}', NOW()),
('MATH9006', '数学', '九年级', 'multiple', '以下哪些方程有实数解？', 'hard', '{方程判别}',
 '["x²+1=0", "x²-4=0", "x²+2x+1=0", "x²+x+1=0"]'::jsonb, '["B", "C"]'::jsonb, 'x²-4=0和x²+2x+1=0的判别式≥0，有实数解', 1, 'published', '{practice_municipal}', NOW()),
('MATH9007', '数学', '九年级', 'true_false', '相似三角形的对应边成比例', 'easy', '{相似三角形}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '相似三角形的定义就是对应边成比例', 1, 'published', '{practice_municipal}', NOW()),
('MATH9008', '数学', '九年级', 'blank', '若抛物线 y = ax² + bx + c 的对称轴为 x = 2，则 b/a = __', 'hard', '{二次函数}',
 '[]'::jsonb, '"-4"'::jsonb, '对称轴 x = -b/(2a) = 2，所以 b/a = -4', 1, 'published', '{practice_municipal}', NOW()),
('MATH9009', '数学', '九年级', 'single', '在Rt△ABC中，∠C=90°，AC=3，BC=4，则tanA=？', 'medium', '{三角函数}',
 '["3/4", "4/3", "3/5", "4/5"]'::jsonb, '"B"'::jsonb, 'tanA=对边/邻边=BC/AC=4/3', 1, 'published', '{practice_municipal}', NOW()),
('MATH9010', '数学', '九年级', 'single', '圆锥的母线长为10cm，底面半径为6cm，侧面积是多少cm²？（π取3.14）', 'hard', '{立体几何}',
 '["180", "188.4", "200", "240"]'::jsonb, '"B"'::jsonb, '侧面积=πrl=3.14×6×10=188.4', 1, 'published', '{practice_municipal}', NOW());

-- ===================================================================
-- 任务1: 为信息科技各年级增加10道题目（市级练习题库）
-- ===================================================================

-- 信息科技-三年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('IT3001', '信息科技', '三年级', 'single', '下列哪个是计算机的输入设备？', 'easy', '{硬件认知}',
 '["显示器", "打印机", "键盘", "音箱"]'::jsonb, '"C"'::jsonb, '键盘用于输入信息到计算机', 1, 'published', '{practice_municipal}', NOW()),
('IT3002', '信息科技', '三年级', 'single', '鼠标的左键通常用来做什么？', 'easy', '{硬件操作}',
 '["删除", "选择和确认", "复制", "取消"]'::jsonb, '"B"'::jsonb, '左键主要用于选择和确认操作', 1, 'published', '{practice_municipal}', NOW()),
('IT3003', '信息科技', '三年级', 'single', '计算机的"大脑"是指？', 'easy', '{硬件认知}',
 '["显示器", "键盘", "CPU", "鼠标"]'::jsonb, '"C"'::jsonb, 'CPU是中央处理器，相当于计算机的大脑', 1, 'published', '{practice_municipal}', NOW()),
('IT3004', '信息科技', '三年级', 'single', '保存文件的快捷键是？', 'medium', '{软件操作}',
 '["Ctrl+C", "Ctrl+V", "Ctrl+S", "Ctrl+Z"]'::jsonb, '"C"'::jsonb, 'Ctrl+S是保存文件的快捷键', 1, 'published', '{practice_municipal}', NOW()),
('IT3005', '信息科技', '三年级', 'single', '下列哪个是文件夹图标？', 'easy', '{基础操作}',
 '["文本文件", "文件夹", "程序", "图片"]'::jsonb, '"B"'::jsonb, '文件夹用于存放文件', 1, 'published', '{practice_municipal}', NOW()),
('IT3006', '信息科技', '三年级', 'multiple', '计算机可以用来做什么？', 'easy', '{计算机应用}',
 '["打字", "画画", "听音乐", "以上都可以"]'::jsonb, '["A", "B", "C"]'::jsonb, '计算机有多种用途', 1, 'published', '{practice_municipal}', NOW()),
('IT3007', '信息科技', '三年级', 'true_false', '关机前需要先关闭所有程序', 'easy', '{安全操作}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '关机前应该正确关闭程序，避免数据丢失', 1, 'published', '{practice_municipal}', NOW()),
('IT3008', '信息科技', '三年级', 'blank', '键盘上的__键可以删除光标前面的字符', 'medium', '{键盘操作}',
 '[]'::jsonb, '"Backspace"'::jsonb, 'Backspace键用于删除光标前的字符', 1, 'published', '{practice_municipal}', NOW()),
('IT3009', '信息科技', '三年级', 'single', '哪个软件可以用来画画？', 'easy', '{软件认知}',
 '["Word", "画图", "记事本", "计算器"]'::jsonb, '"B"'::jsonb, '画图软件用于绘图', 1, 'published', '{practice_municipal}', NOW()),
('IT3010', '信息科技', '三年级', 'single', '双击文件可以？', 'easy', '{基础操作}',
 '["删除文件", "打开文件", "复制文件", "重命名文件"]'::jsonb, '"B"'::jsonb, '双击可以打开文件', 1, 'published', '{practice_municipal}', NOW());

-- 信息科技-四年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('IT4001', '信息科技', '四年级', 'single', '浏览器的主要作用是？', 'easy', '{网络应用}',
 '["编辑文档", "浏览网页", "播放音乐", "编辑图片"]'::jsonb, '"B"'::jsonb, '浏览器用于访问和浏览网页', 1, 'published', '{practice_municipal}', NOW()),
('IT4002', '信息科技', '四年级', 'single', 'URL是什么的缩写？', 'medium', '{网络概念}',
 '["网页地址", "电子邮件", "文件名", "用户名"]'::jsonb, '"A"'::jsonb, 'URL是统一资源定位符，即网址', 1, 'published', '{practice_municipal}', NOW()),
('IT4003', '信息科技', '四年级', 'single', '搜索引擎可以用来？', 'easy', '{网络应用}',
 '["查找信息", "编辑文档", "画图", "计算"]'::jsonb, '"A"'::jsonb, '搜索引擎帮助我们在互联网上查找信息', 1, 'published', '{practice_municipal}', NOW()),
('IT4004', '信息科技', '四年级', 'single', '电子邮件的地址中必须包含什么符号？', 'easy', '{网络应用}',
 '["#", "*", "@", "&"]'::jsonb, '"C"'::jsonb, '电子邮件地址格式为：用户名@域名', 1, 'published', '{practice_municipal}', NOW()),
('IT4005', '信息科技', '四年级', 'single', 'Word软件主要用于？', 'easy', '{软件应用}',
 '["制作表格", "文字处理", "制作演示文稿", "图像处理"]'::jsonb, '"B"'::jsonb, 'Word是文字处理软件', 1, 'published', '{practice_municipal}', NOW()),
('IT4006', '信息科技', '四年级', 'multiple', '以下哪些是存储设备？', 'medium', '{硬件认知}',
 '["U盘", "硬盘", "内存条", "显示器"]'::jsonb, '["A", "B", "C"]'::jsonb, 'U盘、硬盘、内存条都是存储设备', 1, 'published', '{practice_municipal}', NOW()),
('IT4007', '信息科技', '四年级', 'true_false', '在网上不应该随意透露个人信息', 'easy', '{网络安全}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '保护个人信息安全很重要', 1, 'published', '{practice_municipal}', NOW()),
('IT4008', '信息科技', '四年级', 'blank', '复制的快捷键是Ctrl+__', 'medium', '{键盘操作}',
 '[]'::jsonb, '"C"'::jsonb, 'Ctrl+C是复制快捷键', 1, 'published', '{practice_municipal}', NOW()),
('IT4009', '信息科技', '四年级', 'single', 'PowerPoint软件主要用于？', 'easy', '{软件应用}',
 '["文字处理", "表格制作", "演示文稿制作", "图像编辑"]'::jsonb, '"C"'::jsonb, 'PowerPoint用于制作演示文稿', 1, 'published', '{practice_municipal}', NOW()),
('IT4010', '信息科技', '四年级', 'single', '下列哪个不是网络浏览器？', 'medium', '{软件认知}',
 '["Chrome", "Edge", "Word", "Firefox"]'::jsonb, '"C"'::jsonb, 'Word是文字处理软件，不是浏览器', 1, 'published', '{practice_municipal}', NOW());

-- 信息科技-五年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('IT5001', '信息科技', '五年级', 'single', 'Excel软件主要用于？', 'easy', '{软件应用}',
 '["文字处理", "电子表格", "演示文稿", "图像处理"]'::jsonb, '"B"'::jsonb, 'Excel用于制作和处理电子表格', 1, 'published', '{practice_municipal}', NOW()),
('IT5002', '信息科技', '五年级', 'single', '在Excel中，单元格A1表示？', 'medium', '{软件操作}',
 '["第1行第A列", "第A行第1列", "工作表A的第1个单元格", "第1个工作表"]'::jsonb, '"A"'::jsonb, 'A表示列，1表示行', 1, 'published', '{practice_municipal}', NOW()),
('IT5003', '信息科技', '五年级', 'single', '什么是算法？', 'medium', '{编程基础}',
 '["一种编程语言", "解决问题的步骤", "一个软件", "一种硬件"]'::jsonb, '"B"'::jsonb, '算法是解决问题的明确步骤', 1, 'published', '{practice_municipal}', NOW()),
('IT5004', '信息科技', '五年级', 'single', 'Scratch是一种什么软件？', 'easy', '{编程工具}',
 '["文字处理", "图形化编程", "图像处理", "表格制作"]'::jsonb, '"B"'::jsonb, 'Scratch是图形化编程工具', 1, 'published', '{practice_municipal}', NOW()),
('IT5005', '信息科技', '五年级', 'single', '程序的三种基本结构不包括？', 'hard', '{编程基础}',
 '["顺序结构", "选择结构", "循环结构", "递归结构"]'::jsonb, '"D"'::jsonb, '基本结构是顺序、选择、循环', 1, 'published', '{practice_municipal}', NOW()),
('IT5006', '信息科技', '五年级', 'multiple', '以下哪些是编程语言？', 'medium', '{编程认知}',
 '["Python", "Java", "Word", "C++"]'::jsonb, '["A", "B", "D"]'::jsonb, 'Python、Java、C++都是编程语言', 1, 'published', '{practice_municipal}', NOW()),
('IT5007', '信息科技', '五年级', 'true_false', '程序需要按照一定的语法规则编写', 'easy', '{编程基础}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '每种编程语言都有自己的语法规则', 1, 'published', '{practice_municipal}', NOW()),
('IT5008', '信息科技', '五年级', 'blank', '在Scratch中，__模块用于控制程序的流程', 'medium', '{编程工具}',
 '[]'::jsonb, '"控制"'::jsonb, '控制模块包含条件判断和循环等', 1, 'published', '{practice_municipal}', NOW()),
('IT5009', '信息科技', '五年级', 'single', '在Excel中，SUM函数的作用是？', 'easy', '{软件操作}',
 '["求平均值", "求和", "计数", "查找"]'::jsonb, '"B"'::jsonb, 'SUM函数用于求和', 1, 'published', '{practice_municipal}', NOW()),
('IT5010', '信息科技', '五年级', 'single', '下列哪个不属于信息的基本特征？', 'medium', '{信息素养}',
 '["普遍性", "依附性", "价值性", "固定性"]'::jsonb, '"D"'::jsonb, '信息是可变的，不是固定的', 1, 'published', '{practice_municipal}', NOW());

-- 信息科技-六年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('IT6001', '信息科技', '六年级', 'single', '什么是变量？', 'medium', '{编程概念}',
 '["一个常数", "一个存储数据的容器", "一个函数", "一个循环"]'::jsonb, '"B"'::jsonb, '变量用于存储可变的数据', 1, 'published', '{practice_municipal}', NOW()),
('IT6002', '信息科技', '六年级', 'single', '在编程中，if语句属于什么结构？', 'easy', '{编程结构}',
 '["顺序结构", "选择结构", "循环结构", "函数结构"]'::jsonb, '"B"'::jsonb, 'if语句用于条件判断，属于选择结构', 1, 'published', '{practice_municipal}', NOW()),
('IT6003', '信息科技', '六年级', 'single', '什么是循环？', 'medium', '{编程概念}',
 '["程序只执行一次", "重复执行某段代码", "跳过某段代码", "结束程序"]'::jsonb, '"B"'::jsonb, '循环用于重复执行代码', 1, 'published', '{practice_municipal}', NOW()),
('IT6004', '信息科技', '六年级', 'single', '人工智能的英文缩写是？', 'easy', '{前沿技术}',
 '["AI", "VR", "AR", "IT"]'::jsonb, '"A"'::jsonb, 'AI是Artificial Intelligence的缩写', 1, 'published', '{practice_municipal}', NOW()),
('IT6005', '信息科技', '六年级', 'single', '什么是云计算？', 'medium', '{前沿技术}',
 '["在云朵上计算", "通过网络提供计算服务", "一种天气预报", "一种游戏"]'::jsonb, '"B"'::jsonb, '云计算通过互联网提供计算资源', 1, 'published', '{practice_municipal}', NOW()),
('IT6006', '信息科技', '六年级', 'multiple', '以下哪些是人工智能的应用？', 'medium', '{前沿技术}',
 '["语音识别", "图像识别", "文字处理", "智能推荐"]'::jsonb, '["A", "B", "D"]'::jsonb, 'AI可应用于语音、图像识别和智能推荐', 1, 'published', '{practice_municipal}', NOW()),
('IT6007', '信息科技', '六年级', 'true_false', '大数据可以帮助我们发现规律和趋势', 'easy', '{前沿技术}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '大数据分析能发现隐藏的模式和趋势', 1, 'published', '{practice_municipal}', NOW()),
('IT6008', '信息科技', '六年级', 'blank', '在Python中，__语句用于创建循环', 'medium', '{编程语言}',
 '[]'::jsonb, '"for或while"'::jsonb, 'for和while都可以创建循环', 1, 'published', '{practice_municipal}', NOW()),
('IT6009', '信息科技', '六年级', 'single', '物联网的英文缩写是？', 'easy', '{前沿技术}',
 '["AI", "IoT", "VR", "AR"]'::jsonb, '"B"'::jsonb, 'IoT是Internet of Things的缩写', 1, 'published', '{practice_municipal}', NOW()),
('IT6010', '信息科技', '六年级', 'single', '下列哪个是开源操作系统？', 'medium', '{操作系统}',
 '["Windows", "macOS", "Linux", "iOS"]'::jsonb, '"C"'::jsonb, 'Linux是开源操作系统', 1, 'published', '{practice_municipal}', NOW());

-- 信息科技-七年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('IT7001', '信息科技', '七年级', 'single', 'Python中，哪个运算符用于整除？', 'medium', '{编程语言}',
 '["/", "//", "%", "**"]'::jsonb, '"B"'::jsonb, '//是整除运算符', 1, 'published', '{practice_municipal}', NOW()),
('IT7002', '信息科技', '七年级', 'single', 'Python中，print()函数的作用是？', 'easy', '{编程语言}',
 '["输入数据", "输出数据", "计算数据", "存储数据"]'::jsonb, '"B"'::jsonb, 'print()用于输出数据到屏幕', 1, 'published', '{practice_municipal}', NOW()),
('IT7003', '信息科技', '七年级', 'single', '在Python中，如何表示字符串？', 'easy', '{编程语言}',
 '["用括号", "用引号", "用方括号", "用花括号"]'::jsonb, '"B"'::jsonb, '字符串用单引号或双引号表示', 1, 'published', '{practice_municipal}', NOW()),
('IT7004', '信息科技', '七年级', 'single', 'Python中，==运算符的作用是？', 'medium', '{编程语言}',
 '["赋值", "比较相等", "加法", "连接"]'::jsonb, '"B"'::jsonb, '==用于判断两个值是否相等', 1, 'published', '{practice_municipal}', NOW()),
('IT7005', '信息科技', '七年级', 'single', '列表是Python中的什么数据类型？', 'medium', '{编程语言}',
 '["数字", "字符串", "序列", "字典"]'::jsonb, '"C"'::jsonb, '列表是一种序列类型', 1, 'published', '{practice_municipal}', NOW()),
('IT7006', '信息科技', '七年级', 'multiple', 'Python中，以下哪些是循环语句？', 'medium', '{编程语言}',
 '["if", "for", "while", "def"]'::jsonb, '["B", "C"]'::jsonb, 'for和while都是循环语句', 1, 'published', '{practice_municipal}', NOW()),
('IT7007', '信息科技', '七年级', 'true_false', 'Python是一种解释型编程语言', 'easy', '{编程语言}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, 'Python代码逐行解释执行', 1, 'published', '{practice_municipal}', NOW()),
('IT7008', '信息科技', '七年级', 'blank', 'Python中，input()函数用于__数据', 'easy', '{编程语言}',
 '[]'::jsonb, '"输入"'::jsonb, 'input()函数用于从用户获取输入', 1, 'published', '{practice_municipal}', NOW()),
('IT7009', '信息科技', '七年级', 'single', '在Python中，#符号用于？', 'easy', '{编程语法}',
 '["定义变量", "注释", "输出", "计算"]'::jsonb, '"B"'::jsonb, '#用于添加注释', 1, 'published', '{practice_municipal}', NOW()),
('IT7010', '信息科技', '七年级', 'single', 'Python中，range(5)会生成哪些数字？', 'medium', '{编程语言}',
 '["1,2,3,4,5", "0,1,2,3,4", "0,1,2,3,4,5", "1,2,3,4"]'::jsonb, '"B"'::jsonb, 'range(5)生成0到4的数字', 1, 'published', '{practice_municipal}', NOW());

-- 信息科技-八年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('IT8001', '信息科技', '八年级', 'single', 'HTML是什么的缩写？', 'easy', '{网页技术}',
 '["超文本标记语言", "超级文本", "高级语言", "网页语言"]'::jsonb, '"A"'::jsonb, 'HTML是HyperText Markup Language', 1, 'published', '{practice_municipal}', NOW()),
('IT8002', '信息科技', '八年级', 'single', 'CSS主要用于？', 'easy', '{网页技术}',
 '["网页结构", "网页样式", "网页交互", "数据库"]'::jsonb, '"B"'::jsonb, 'CSS用于控制网页的样式和布局', 1, 'published', '{practice_municipal}', NOW()),
('IT8003', '信息科技', '八年级', 'single', 'JavaScript是一种什么语言？', 'medium', '{网页技术}',
 '["标记语言", "样式语言", "脚本语言", "数据库语言"]'::jsonb, '"C"'::jsonb, 'JavaScript是客户端脚本语言', 1, 'published', '{practice_municipal}', NOW()),
('IT8004', '信息科技', '八年级', 'single', '数据库用于？', 'easy', '{数据管理}',
 '["存储和管理数据", "编辑图片", "播放视频", "浏览网页"]'::jsonb, '"A"'::jsonb, '数据库是用于存储和管理数据的系统', 1, 'published', '{practice_municipal}', NOW()),
('IT8005', '信息科技', '八年级', 'single', 'SQL是什么？', 'medium', '{数据管理}',
 '["编程语言", "数据库查询语言", "标记语言", "样式语言"]'::jsonb, '"B"'::jsonb, 'SQL用于数据库操作', 1, 'published', '{practice_municipal}', NOW()),
('IT8006', '信息科技', '八年级', 'multiple', '一个完整的网页通常包含？', 'medium', '{网页技术}',
 '["HTML", "CSS", "JavaScript", "Python"]'::jsonb, '["A", "B", "C"]'::jsonb, '网页由HTML结构、CSS样式、JavaScript交互组成', 1, 'published', '{practice_municipal}', NOW()),
('IT8007', '信息科技', '八年级', 'true_false', '函数可以提高代码的复用性', 'easy', '{编程概念}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '函数可以封装重复使用的代码', 1, 'published', '{practice_municipal}', NOW()),
('IT8008', '信息科技', '八年级', 'blank', 'HTTP协议的默认端口号是__', 'hard', '{网络协议}',
 '[]'::jsonb, '"80"'::jsonb, 'HTTP默认使用80端口', 1, 'published', '{practice_municipal}', NOW()),
('IT8009', '信息科技', '八年级', 'single', '什么是API？', 'medium', '{编程概念}',
 '["应用程序接口", "编程语言", "数据库", "操作系统"]'::jsonb, '"A"'::jsonb, 'API是Application Programming Interface', 1, 'published', '{practice_municipal}', NOW()),
('IT8010', '信息科技', '八年级', 'single', '在HTML中，<p>标签用于？', 'easy', '{网页技术}',
 '["创建段落", "创建标题", "插入图片", "创建链接"]'::jsonb, '"A"'::jsonb, '<p>标签用于定义段落', 1, 'published', '{practice_municipal}', NOW());

-- 信息科技-九年级 (10道题)
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('IT9001', '信息科技', '九年级', 'single', '什么是机器学习？', 'medium', '{人工智能}',
 '["人类学习", "让计算机从数据中学习", "一种编程语言", "一种算法"]'::jsonb, '"B"'::jsonb, '机器学习是AI的一个分支', 1, 'published', '{practice_municipal}', NOW()),
('IT9002', '信息科技', '九年级', 'single', '区块链的主要特点是？', 'hard', '{前沿技术}',
 '["中心化", "去中心化", "单点存储", "不可追溯"]'::jsonb, '"B"'::jsonb, '区块链是分布式去中心化的账本', 1, 'published', '{practice_municipal}', NOW()),
('IT9003', '信息科技', '九年级', 'single', '什么是爬虫？', 'medium', '{网络技术}',
 '["一种昆虫", "自动获取网页数据的程序", "一种病毒", "一种浏览器"]'::jsonb, '"B"'::jsonb, '爬虫用于自动抓取网页内容', 1, 'published', '{practice_municipal}', NOW()),
('IT9004', '信息科技', '九年级', 'single', 'Git是什么？', 'medium', '{开发工具}',
 '["编程语言", "版本控制系统", "数据库", "操作系统"]'::jsonb, '"B"'::jsonb, 'Git用于代码版本管理', 1, 'published', '{practice_municipal}', NOW()),
('IT9005', '信息科技', '九年级', 'single', '什么是深度学习？', 'hard', '{人工智能}',
 '["深入学习知识", "基于神经网络的机器学习", "一种编程方法", "一种数据库"]'::jsonb, '"B"'::jsonb, '深度学习使用多层神经网络', 1, 'published', '{practice_municipal}', NOW()),
('IT9006', '信息科技', '九年级', 'multiple', '以下哪些是常见的数据结构？', 'hard', '{数据结构}',
 '["数组", "链表", "树", "所有选项"]'::jsonb, '["A", "B", "C"]'::jsonb, '数组、链表、树都是基本数据结构', 1, 'published', '{practice_municipal}', NOW()),
('IT9007', '信息科技', '九年级', 'true_false', '算法的时间复杂度用于衡量算法效率', 'easy', '{算法分析}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, '时间复杂度反映算法执行时间随输入规模的增长趋势', 1, 'published', '{practice_municipal}', NOW()),
('IT9008', '信息科技', '九年级', 'blank', 'HTTPS中的S代表__', 'medium', '{网络安全}',
 '[]'::jsonb, '"Secure或安全"'::jsonb, 'HTTPS是HTTP的安全版本', 1, 'published', '{practice_municipal}', NOW()),
('IT9009', '信息科技', '九年级', 'single', '什么是云存储？', 'medium', '{云计算}',
 '["本地硬盘存储", "通过网络提供的存储服务", "U盘存储", "光盘存储"]'::jsonb, '"B"'::jsonb, '云存储通过互联网提供数据存储', 1, 'published', '{practice_municipal}', NOW()),
('IT9010', '信息科技', '九年级', 'single', '排序算法中，冒泡排序的平均时间复杂度是？', 'hard', '{算法分析}',
 '["O(n)", "O(n log n)", "O(n²)", "O(log n)"]'::jsonb, '"C"'::jsonb, '冒泡排序需要嵌套循环，时间复杂度为O(n²)', 1, 'published', '{practice_municipal}', NOW());

-- ===================================================================
-- 任务2: 为teacher_nm_ms_math(ID:17)创建20道初一数学草稿题
-- ===================================================================
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('DRAFT_MATH7_001', '数学', '七年级', 'single', '计算：(-5) + 3 = ?', 'easy', '{有理数运算}',
 '["-8", "-2", "2", "8"]'::jsonb, '"B"'::jsonb, '负5加正3等于负2', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_002', '数学', '七年级', 'single', '计算：(-3) × (-4) = ?', 'easy', '{有理数运算}',
 '["-12", "-7", "7", "12"]'::jsonb, '"D"'::jsonb, '负负得正', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_003', '数学', '七年级', 'single', '绝对值：|-7| = ?', 'easy', '{绝对值}',
 '["-7", "0", "7", "14"]'::jsonb, '"C"'::jsonb, '负数的绝对值是其相反数', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_004', '数学', '七年级', 'single', '解方程：x + 5 = 12', 'easy', '{一元一次方程}',
 '["5", "6", "7", "8"]'::jsonb, '"C"'::jsonb, 'x = 12 - 5 = 7', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_005', '数学', '七年级', 'single', '合并同类项：5a + 3a = ?', 'easy', '{代数运算}',
 '["8", "8a", "8a²", "15a"]'::jsonb, '"B"'::jsonb, '系数相加', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_006', '数学', '七年级', 'single', '计算：2³ = ?', 'easy', '{乘方运算}',
 '["6", "8", "9", "12"]'::jsonb, '"B"'::jsonb, '2的3次方等于8', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_007', '数学', '七年级', 'single', '(-2)³ = ?', 'medium', '{乘方运算}',
 '["-8", "-6", "6", "8"]'::jsonb, '"A"'::jsonb, '(-2)×(-2)×(-2) = -8', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_008', '数学', '七年级', 'single', '解方程：3x - 6 = 9', 'medium', '{一元一次方程}',
 '["3", "4", "5", "6"]'::jsonb, '"C"'::jsonb, '3x = 15, x = 5', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_009', '数学', '七年级', 'single', '一个角的补角是120°，这个角是多少度？', 'medium', '{几何基础}',
 '["30°", "60°", "90°", "120°"]'::jsonb, '"B"'::jsonb, '补角之和为180°', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_010', '数学', '七年级', 'single', '去括号：-(2x - 3) = ?', 'medium', '{代数运算}',
 '["-2x - 3", "-2x + 3", "2x - 3", "2x + 3"]'::jsonb, '"B"'::jsonb, '括号前是负号，去括号要变号', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_011', '数学', '七年级', 'multiple', '以下哪些是有理数？', 'medium', '{数的分类}',
 '["-3", "0", "π", "1/2"]'::jsonb, '["A", "B", "D"]'::jsonb, 'π是无理数', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_012', '数学', '七年级', 'true_false', '两条直线被第三条直线所截，内错角相等', 'medium', '{几何定理}',
 '["正确", "错误"]'::jsonb, '"B"'::jsonb, '需要两直线平行时才成立', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_013', '数学', '七年级', 'blank', '化简：3(x + 2) = __', 'easy', '{代数运算}',
 '[]'::jsonb, '"3x + 6"'::jsonb, '分配律展开', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_014', '数学', '七年级', 'single', '比较大小：-5 __ -3', 'easy', '{有理数比较}',
 '["大于", "小于", "等于", "无法比较"]'::jsonb, '"B"'::jsonb, '负数越大，值越小', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_015', '数学', '七年级', 'single', '数轴上，点A表示-2，点B表示3，AB的距离是？', 'medium', '{数轴}',
 '["1", "5", "-5", "无法确定"]'::jsonb, '"B"'::jsonb, '距离 = |3 - (-2)| = 5', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_016', '数学', '七年级', 'single', '解方程：2(x - 1) = 8', 'medium', '{一元一次方程}',
 '["3", "4", "5", "6"]'::jsonb, '"C"'::jsonb, '2x - 2 = 8, 2x = 10, x = 5', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_017', '数学', '七年级', 'single', '单项式 -3x²y 的系数是？', 'easy', '{代数概念}',
 '["-3", "3", "-3x²", "x²y"]'::jsonb, '"A"'::jsonb, '系数是数字部分-3', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_018', '数学', '七年级', 'single', '单项式 5a²b 的次数是？', 'medium', '{代数概念}',
 '["1", "2", "3", "5"]'::jsonb, '"C"'::jsonb, '次数是所有字母指数之和 2+1=3', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_019', '数学', '七年级', 'single', '多项式 3x² - 2x + 1 的常数项是？', 'easy', '{代数概念}',
 '["3", "-2", "1", "0"]'::jsonb, '"C"'::jsonb, '常数项是不含字母的项', 17, 'draft', '{}', NOW()),
('DRAFT_MATH7_020', '数学', '七年级', 'single', '如果 a > 0, b < 0，则 a + b 的符号？', 'medium', '{有理数运算}',
 '["一定为正", "一定为负", "可能为正可能为负", "等于零"]'::jsonb, '"C"'::jsonb, '取决于|a|和|b|的大小关系', 17, 'draft', '{}', NOW());

-- ===================================================================
-- 任务3: 为teacher_yy_ps_it(ID:22)创建20道初一信息科技草稿题
-- ===================================================================
INSERT INTO question_bank (question_code, subject, grade, type, content, difficulty,
                          abilities, options, correct_answer, explanation, created_by,
                          status, scope, created_at)
VALUES
('DRAFT_IT7_001', '信息科技', '七年级', 'single', 'Python中，注释使用什么符号？', 'easy', '{编程语法}',
 '["//", "#", "/*", "--"]'::jsonb, '"B"'::jsonb, 'Python使用#进行注释', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_002', '信息科技', '七年级', 'single', 'Python中，哪个符号用于赋值？', 'easy', '{编程语法}',
 '["==", "=", "!=", "+="]'::jsonb, '"B"'::jsonb, '=是赋值运算符', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_003', '信息科技', '七年级', 'single', 'Python中，如何输入一个字符串？', 'easy', '{编程语法}',
 '["print()", "input()", "str()", "read()"]'::jsonb, '"B"'::jsonb, 'input()函数用于输入', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_004', '信息科技', '七年级', 'single', 'Python中，10 % 3 的结果是？', 'medium', '{运算符}',
 '["0", "1", "3", "10"]'::jsonb, '"B"'::jsonb, '%是取余运算，10除以3余1', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_005', '信息科技', '七年级', 'single', 'Python中，int()函数的作用是？', 'easy', '{类型转换}',
 '["输入整数", "转换为整数", "输出整数", "判断整数"]'::jsonb, '"B"'::jsonb, 'int()将其他类型转换为整数', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_006', '信息科技', '七年级', 'single', 'Python中，len()函数可以获取什么？', 'easy', '{内置函数}',
 '["长度", "类型", "最大值", "最小值"]'::jsonb, '"A"'::jsonb, 'len()返回序列的长度', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_007', '信息科技', '七年级', 'single', 'Python中，下列哪个是正确的变量名？', 'medium', '{命名规则}',
 '["2name", "name-2", "name_2", "name 2"]'::jsonb, '"C"'::jsonb, '变量名不能以数字开头，不能有空格和-', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_008', '信息科技', '七年级', 'single', 'Python中，如何判断两个值相等？', 'easy', '{运算符}',
 '["=", "==", "!=", "==="]'::jsonb, '"B"'::jsonb, '==用于判断相等', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_009', '信息科技', '七年级', 'single', 'Python中，布尔类型有几个值？', 'easy', '{数据类型}',
 '["1个", "2个", "3个", "4个"]'::jsonb, '"B"'::jsonb, '布尔类型只有True和False两个值', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_010', '信息科技', '七年级', 'single', 'Python中，字符串拼接使用什么运算符？', 'easy', '{字符串操作}',
 '["+", "-", "*", "/"]'::jsonb, '"A"'::jsonb, '+用于连接字符串', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_011', '信息科技', '七年级', 'multiple', 'Python中，以下哪些是数据类型？', 'medium', '{数据类型}',
 '["int", "str", "bool", "all"]'::jsonb, '["A", "B", "C"]'::jsonb, 'int、str、bool都是Python数据类型', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_012', '信息科技', '七年级', 'true_false', 'Python是区分大小写的语言', 'easy', '{语言特性}',
 '["正确", "错误"]'::jsonb, '"A"'::jsonb, 'Python严格区分大小写', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_013', '信息科技', '七年级', 'blank', 'Python中，使用__关键字可以导入模块', 'medium', '{模块导入}',
 '[]'::jsonb, '"import"'::jsonb, 'import用于导入模块', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_014', '信息科技', '七年级', 'single', 'Python中，if语句用于？', 'easy', '{控制结构}',
 '["循环", "条件判断", "函数定义", "输入输出"]'::jsonb, '"B"'::jsonb, 'if用于条件判断', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_015', '信息科技', '七年级', 'single', 'Python中，while循环的作用是？', 'easy', '{控制结构}',
 '["条件判断", "重复执行", "函数定义", "导入模块"]'::jsonb, '"B"'::jsonb, 'while用于循环执行代码', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_016', '信息科技', '七年级', 'single', 'Python中，列表用什么符号表示？', 'easy', '{数据结构}',
 '["()", "[]", "{}", "<>"]'::jsonb, '"B"'::jsonb, '列表使用方括号[]', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_017', '信息科技', '七年级', 'single', 'Python中，缩进的作用是？', 'medium', '{语法规则}',
 '["美观", "表示代码块", "没有作用", "注释"]'::jsonb, '"B"'::jsonb, 'Python通过缩进表示代码块', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_018', '信息科技', '七年级', 'single', 'Python中，type()函数的作用是？', 'easy', '{内置函数}',
 '["输入", "输出", "查看类型", "转换类型"]'::jsonb, '"C"'::jsonb, 'type()返回数据类型', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_019', '信息科技', '七年级', 'single', 'Python中，float类型表示？', 'easy', '{数据类型}',
 '["整数", "小数", "字符串", "布尔"]'::jsonb, '"B"'::jsonb, 'float表示浮点数（小数）', 22, 'draft', '{}', NOW()),
('DRAFT_IT7_020', '信息科技', '七年级', 'single', 'Python中，如何定义一个函数？', 'medium', '{函数定义}',
 '["function", "def", "fun", "define"]'::jsonb, '"B"'::jsonb, 'def关键字用于定义函数', 22, 'draft', '{}', NOW());

COMMIT;

-- ===================================================================
-- 第二部分: 区级练习题库补充数据
-- 来源: supplement_questions.sql
-- ===================================================================

-- Supplement questions to ensure at least 10 questions per grade per subject
-- All question types covered: single, multiple, blank, true_false, essay, code, matching
-- Date: 2025-10-30

-- 数学 - 一年级 (10道新题)
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
('single', '数学', '一年级', '3 + 2 = ?', '["3", "4", "5", "6"]', '"5"', 5, 'easy', 'approved', 9, 'L1', 5, '{加法运算,基础计算}', '{20以内加法,基础运算}', '{练习,测评}'),
('single', '数学', '一年级', '8 - 3 = ?', '["3", "4", "5", "6"]', '"5"', 5, 'easy', 'approved', 9, 'L1', 5, '{减法运算,基础计算}', '{20以内减法,基础运算}', '{练习,测评}'),
('single', '数学', '一年级', '哪个数字最大？', '["2", "5", "3", "1"]', '"5"', 5, 'easy', 'approved', 9, 'L1', 5, '{数字比较,大小概念}', '{数的大小,数序}', '{练习,测评}'),
('multiple', '数学', '一年级', '下列哪些数字大于3？（多选）', '["2", "4", "5", "1"]', '["4", "5"]', 10, 'easy', 'approved', 9, 'L1', 10, '{数字比较,大小判断}', '{数的大小,不等关系}', '{练习,测评}'),
('blank', '数学', '一年级', '填空：5 + ( ) = 10', 'null', '"5"', 5, 'easy', 'approved', 9, 'L1', 5, '{加法运算,逆向思维}', '{加法,填空题}', '{练习,测评}'),
('blank', '数学', '一年级', '填空：10 - ( ) = 6', 'null', '"4"', 5, 'easy', 'approved', 9, 'L1', 5, '{减法运算,逆向思维}', '{减法,填空题}', '{练习,测评}'),
('true_false', '数学', '一年级', '5 + 3 = 8', 'null', 'true', 5, 'easy', 'approved', 9, 'L1', 5, '{加法验证,判断能力}', '{加法,正误判断}', '{练习,测评}'),
('true_false', '数学', '一年级', '6 比 8 大', 'null', 'false', 5, 'easy', 'approved', 9, 'L1', 5, '{大小比较,判断能力}', '{数的大小,正误判断}', '{练习,测评}'),
('essay', '数学', '一年级', '用画图的方式表示：3个苹果加2个苹果一共有几个苹果？', 'null', '"5个苹果"', 10, 'easy', 'approved', 9, 'L1', 10, '{图形表达,应用题}', '{加法应用,图文结合}', '{练习,测评}'),
('matching', '数学', '一年级', '连线匹配：数字与数量（1→一个，2→两个，3→三个）', 'null', '"1-一个,2-两个,3-三个"', 10, 'easy', 'approved', 9, 'L1', 10, '{数字认知,配对能力}', '{数的认识,一一对应}', '{练习,测评}');

-- 数学 - 二年级 (10道新题)
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
('single', '数学', '二年级', '25 + 18 = ?', '["41", "42", "43", "44"]', '"43"', 5, 'easy', 'approved', 9, 'L1', 5, '{两位数加法,进位运算}', '{100以内加法,进位加}', '{练习,测评}'),
('single', '数学', '二年级', '35 - 17 = ?', '["16", "17", "18", "19"]', '"18"', 5, 'easy', 'approved', 9, 'L1', 5, '{两位数减法,退位运算}', '{100以内减法,退位减}', '{练习,测评}'),
('single', '数学', '二年级', '5 × 3 = ?', '["12", "13", "14", "15"]', '"15"', 5, 'medium', 'approved', 9, 'L1', 5, '{乘法运算,乘法口诀}', '{表内乘法,乘法}', '{练习,测评}'),
('multiple', '数学', '二年级', '下列哪些算式的结果是10？（多选）', '["5+5", "6+3", "7+3", "8+2"]', '["5+5", "7+3", "8+2"]', 10, 'medium', 'approved', 9, 'L1', 10, '{加法运算,逆向思维}', '{凑十法,加法}', '{练习,测评}'),
('blank', '数学', '二年级', '填空：6 × ( ) = 18', 'null', '"3"', 5, 'medium', 'approved', 9, 'L1', 5, '{乘法运算,除法思想}', '{乘法口诀,乘除关系}', '{练习,测评}'),
('blank', '数学', '二年级', '1米 = ( )厘米', 'null', '"100"', 5, 'easy', 'approved', 9, 'L1', 5, '{长度单位,单位换算}', '{长度测量,单位转换}', '{练习,测评}'),
('true_false', '数学', '二年级', '长方形有4条边，4个角都是直角。', 'null', 'true', 5, 'easy', 'approved', 9, 'L1', 5, '{图形认知,几何知识}', '{平面图形,长方形}', '{练习,测评}'),
('true_false', '数学', '二年级', '24 ÷ 6 = 5', 'null', 'false', 5, 'medium', 'approved', 9, 'L1', 5, '{除法运算,计算验证}', '{表内除法,正误判断}', '{练习,测评}'),
('essay', '数学', '二年级', '小明有20元钱，买了一本书花了12元，还剩多少钱？请写出算式。', 'null', '"20-12=8，还剩8元"', 10, 'medium', 'approved', 9, 'L1', 10, '{应用题,减法应用}', '{购物问题,减法应用}', '{练习,测评}'),
('matching', '数学', '二年级', '连线匹配：图形与名称（正方形、长方形、三角形、圆形）', 'null', '"正方形-4条相等的边,长方形-对边相等,三角形-3条边,圆形-圆的"', 10, 'easy', 'approved', 9, 'L1', 10, '{图形识别,几何认知}', '{平面图形,图形特征}', '{练习,测评}');

-- 数学 - 三年级 (补充2道)
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
('matching', '数学', '三年级', '连线匹配：分数与图形（1/2对应一半，1/4对应四分之一）', 'null', '"1/2-一半,1/4-四分之一,3/4-四分之三"', 10, 'medium', 'approved', 9, 'L2', 10, '{分数认知,图形分割}', '{分数初步,分数表示}', '{练习,测评}'),
('code', '数学', '三年级', '编写计算正方形周长的简单算法（给定边长a，周长=4×a）', 'null', '"输入边长a，周长=4*a"', 15, 'hard', 'approved', 9, 'L2', 15, '{算法思维,公式应用}', '{周长公式,算法表达}', '{练习,测评}');

-- 数学 - 四年级 (10道新题)
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
('single', '数学', '四年级', '125 × 8 = ?', '["900", "950", "1000", "1100"]', '"1000"', 5, 'medium', 'approved', 9, 'L2', 5, '{三位数乘法,心算技巧}', '{乘法运算,简便计算}', '{练习,测评}'),
('single', '数学', '四年级', '一个角是90度的三角形叫什么三角形？', '["锐角三角形", "直角三角形", "钝角三角形", "等边三角形"]', '"直角三角形"', 5, 'medium', 'approved', 9, 'L2', 5, '{三角形分类,几何知识}', '{三角形,图形分类}', '{练习,测评}'),
('single', '数学', '四年级', '3/4 + 1/4 = ?', '["1/2", "3/8", "1", "4/8"]', '"1"', 5, 'medium', 'approved', 9, 'L2', 5, '{同分母分数加法,分数运算}', '{分数加法,分数计算}', '{练习,测评}'),
('multiple', '数学', '四年级', '下列哪些是质数？（多选）', '["2", "4", "7", "9"]', '["2", "7"]', 10, 'hard', 'approved', 9, 'L2', 10, '{质数判断,数论知识}', '{质数,数的分类}', '{练习,测评}'),
('blank', '数学', '四年级', '长方形的面积公式是：面积 = 长 × ( )', 'null', '"宽"', 5, 'easy', 'approved', 9, 'L2', 5, '{面积公式,几何知识}', '{长方形面积,公式记忆}', '{练习,测评}'),
('blank', '数学', '四年级', '1千克 = ( )克', 'null', '"1000"', 5, 'easy', 'approved', 9, 'L2', 5, '{质量单位,单位换算}', '{质量测量,单位转换}', '{练习,测评}'),
('true_false', '数学', '四年级', '平行四边形的对边平行且相等。', 'null', 'true', 5, 'medium', 'approved', 9, 'L2', 5, '{图形性质,几何知识}', '{平行四边形,图形特征}', '{练习,测评}'),
('true_false', '数学', '四年级', '小数0.5等于分数1/2。', 'null', 'true', 5, 'medium', 'approved', 9, 'L2', 5, '{小数与分数,数的转换}', '{小数,分数,等量关系}', '{练习,测评}'),
('essay', '数学', '四年级', '一辆汽车每小时行驶60千米，行驶了3小时，一共行驶了多少千米？', 'null', '"60×3=180千米"', 10, 'medium', 'approved', 9, 'L2', 10, '{应用题,乘法应用}', '{路程问题,速度时间路程}', '{练习,测评}'),
('matching', '数学', '四年级', '连线匹配：单位换算（1米=100厘米，1千克=1000克，1小时=60分钟）', 'null', '"1米-100厘米,1千克-1000克,1小时-60分钟"', 10, 'medium', 'approved', 9, 'L2', 10, '{单位换算,量的测量}', '{单位转换,常用单位}', '{练习,测评}');

-- 数学 - 五年级 (补充4道)
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
('single', '数学', '五年级', '一个长方体有几个面？', '["4个", "5个", "6个", "8个"]', '"6个"', 5, 'medium', 'approved', 9, 'L3', 5, '{立体图形,几何知识}', '{长方体,立体图形特征}', '{练习,测评}'),
('true_false', '数学', '五年级', '圆的周长等于直径乘以π。', 'null', 'true', 5, 'medium', 'approved', 9, 'L3', 5, '{圆的周长,几何公式}', '{圆,周长公式}', '{练习,测评}'),
('matching', '数学', '五年级', '连线匹配：分数、小数、百分数（1/2=0.5=50%，1/4=0.25=25%）', 'null', '"1/2-0.5-50%,1/4-0.25-25%,3/4-0.75-75%"', 10, 'hard', 'approved', 9, 'L3', 10, '{数的转换,等量关系}', '{分数小数百分数,数的互化}', '{练习,测评}'),
('code', '数学', '五年级', '编写程序：输入圆的半径r，计算圆的面积（面积=πr²，π取3.14）', 'null', '"输入半径r，面积=3.14*r*r"', 15, 'hard', 'approved', 9, 'L3', 15, '{算法编写,公式应用}', '{圆的面积,程序设计}', '{练习,测评}');

-- 数学 - 六年级 (10道新题)
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
('single', '数学', '六年级', '如果x + 5 = 12，那么x等于多少？', '["5", "6", "7", "8"]', '"7"', 5, 'medium', 'approved', 9, 'L3', 5, '{代数方程,解方程}', '{一元一次方程,方程求解}', '{练习,测评}'),
('single', '数学', '六年级', '一个圆柱体的底面半径是3cm，高是10cm，它的体积是多少？（π取3.14）', '["94.2cm³", "188.4cm³", "282.6cm³", "376.8cm³"]', '"282.6cm³"', 5, 'hard', 'approved', 9, 'L3', 5, '{立体图形体积,圆柱体积}', '{圆柱,体积计算}', '{练习,测评}'),
('single', '数学', '六年级', '比例式 3:4 = x:8 中，x的值是多少？', '["4", "5", "6", "7"]', '"6"', 5, 'medium', 'approved', 9, 'L3', 5, '{比例,解比例}', '{比和比例,比例求解}', '{练习,测评}'),
('multiple', '数学', '六年级', '下列哪些是轴对称图形？（多选）', '["正方形", "长方形", "平行四边形", "等腰三角形"]', '["正方形", "长方形", "等腰三角形"]', 10, 'hard', 'approved', 9, 'L3', 10, '{图形对称,几何性质}', '{轴对称,图形特征}', '{练习,测评}'),
('blank', '数学', '六年级', '圆锥的体积公式是：V = (1/3) × ( ) × h', 'null', '"底面积"', 5, 'medium', 'approved', 9, 'L3', 5, '{立体图形体积,圆锥}', '{圆锥体积,公式记忆}', '{练习,测评}'),
('blank', '数学', '六年级', '一个数的20%是8，这个数是( )', 'null', '"40"', 5, 'hard', 'approved', 9, 'L3', 5, '{百分数应用,逆运算}', '{百分数,百分数问题}', '{练习,测评}'),
('true_false', '数学', '六年级', '负数都小于0。', 'null', 'true', 5, 'easy', 'approved', 9, 'L3', 5, '{负数概念,数的认识}', '{正负数,数的大小}', '{练习,测评}'),
('true_false', '数学', '六年级', '两个奇数相加的结果一定是偶数。', 'null', 'true', 5, 'medium', 'approved', 9, 'L3', 5, '{奇偶性,数的性质}', '{奇数偶数,数的规律}', '{练习,测评}'),
('essay', '数学', '六年级', '一件商品原价200元，打8折后是多少元？请写出计算过程。', 'null', '"200×0.8=160元，或200×(1-20%)=160元"', 10, 'medium', 'approved', 9, 'L3', 10, '{百分数应用,折扣问题}', '{打折,百分数应用}', '{练习,测评}'),
('matching', '数学', '六年级', '连线匹配：公式与图形（V=πr²h→圆柱，V=(1/3)πr²h→圆锥，V=abc→长方体）', 'null', '"圆柱-πr²h,圆锥-(1/3)πr²h,长方体-abc"', 10, 'hard', 'approved', 9, 'L3', 10, '{体积公式,立体图形}', '{立体图形体积,公式配对}', '{练习,测评}');

-- 数学 - 八年级 (补充2道)
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
('matching', '数学', '八年级', '连线匹配：函数与图像（一次函数→直线，二次函数→抛物线，反比例函数→双曲线）', 'null', '"一次函数-直线,二次函数-抛物线,反比例函数-双曲线"', 10, 'hard', 'approved', 9, 'L4', 10, '{函数图像,函数识别}', '{函数,图像特征}', '{练习,测评}'),
('code', '数学', '八年级', '编写程序：输入三角形三边a、b、c，判断是否能构成三角形（任意两边之和大于第三边）', 'null', '"if (a+b>c and b+c>a and a+c>b) then 能构成 else 不能构成"', 15, 'hard', 'approved', 9, 'L4', 15, '{算法设计,三角形判定}', '{三角形,程序逻辑}', '{练习,测评}');


-- ===================================================================
-- 第三部分: 白云区特色题库
-- 来源: insert_baiyun_questions.sql
-- ===================================================================

-- 为白云区的数学和信息科技科目添加各种题型的题目
-- 出题人：陈刚(user_id=9, 小学数学), 蒋敏(user_id=12, 初中信息科技)

-- 一年级数学题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
-- 单选题
('single', '数学', '一年级', '1 + 1 = ?',
 '{"A": "1", "B": "2", "C": "3", "D": "4"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', '1加1等于2', 9, 'published', 'L1'),

-- 多选题
('multiple', '数学', '一年级', '以下哪些数字小于5？（多选）',
 '{"A": "2", "B": "3", "C": "6", "D": "7"}'::jsonb,
 '["A", "B"]'::jsonb, 5, 'easy', '小于5的数字是2和3', 9, 'published', 'L1'),

-- 判断题
('true_false', '数学', '一年级', '3比5大。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', '3小于5，所以错误', 9, 'published', 'L1'),

-- 填空题
('blank', '数学', '一年级', '2 + 3 = ___',
 NULL, '"5"'::jsonb, 5, 'easy', '2加3等于5', 9, 'published', 'L1'),

-- 简答题
('essay', '数学', '一年级', '请用自己的话说明什么是加法？',
 NULL, '"加法是把两个或多个数合在一起的运算"'::jsonb, 10, 'medium', '加法是基本运算之一', 9, 'published', 'L2');

-- 二年级数学题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '二年级', '5 × 2 = ?',
 '{"A": "7", "B": "10", "C": "12", "D": "15"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', '5乘以2等于10', 9, 'published', 'L1'),

('multiple', '数学', '二年级', '以下哪些数是偶数？（多选）',
 '{"A": "2", "B": "4", "C": "5", "D": "6"}'::jsonb,
 '["A", "B", "D"]'::jsonb, 5, 'medium', '偶数能被2整除', 9, 'published', 'L2'),

('true_false', '数学', '二年级', '15是奇数。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '15不能被2整除，是奇数', 9, 'published', 'L1'),

('blank', '数学', '二年级', '20 ÷ 4 = ___',
 NULL, '"5"'::jsonb, 5, 'easy', '20除以4等于5', 9, 'published', 'L1'),

('essay', '数学', '二年级', '请解释乘法和加法的关系。',
 NULL, '"乘法是相同加数的连加，如3×4等于3+3+3+3"'::jsonb, 10, 'medium', '理解乘法的本质', 9, 'published', 'L2');

-- 三年级数学题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '三年级', '48 ÷ 6 = ?',
 '{"A": "6", "B": "7", "C": "8", "D": "9"}'::jsonb,
 '"C"'::jsonb, 5, 'easy', '48除以6等于8', 9, 'published', 'L2'),

('multiple', '数学', '三年级', '以下哪些是质数？（多选）',
 '{"A": "2", "B": "3", "C": "4", "D": "5"}'::jsonb,
 '["A", "B", "D"]'::jsonb, 5, 'medium', '质数只能被1和自身整除', 9, 'published', 'L3'),

('true_false', '数学', '三年级', '所有偶数都能被2整除。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '偶数的定义就是能被2整除的数', 9, 'published', 'L2'),

('blank', '数学', '三年级', '7 × 9 = ___',
 NULL, '"63"'::jsonb, 5, 'easy', '7乘以9等于63', 9, 'published', 'L1'),

('essay', '数学', '三年级', '请说明如何判断一个数是质数还是合数。',
 NULL, '"质数只有1和它本身两个因数，合数除了1和它本身外还有其他因数"'::jsonb, 10, 'medium', '理解质数和合数的概念', 9, 'published', 'L3');

-- 四年级数学题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '四年级', '0.5 + 0.3 = ?',
 '{"A": "0.7", "B": "0.8", "C": "0.9", "D": "1.0"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', '小数加法：0.5加0.3等于0.8', 9, 'published', 'L2'),

('multiple', '数学', '四年级', '以下哪些分数大于1/2？（多选）',
 '{"A": "2/3", "B": "3/4", "C": "1/3", "D": "1/4"}'::jsonb,
 '["A", "B"]'::jsonb, 5, 'medium', '2/3和3/4都大于1/2', 9, 'published', 'L3'),

('true_false', '数学', '四年级', '1/4 = 0.25',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '1除以4等于0.25', 9, 'published', 'L2'),

('blank', '数学', '四年级', '1.2 × 5 = ___',
 NULL, '"6"'::jsonb, 5, 'easy', '1.2乘以5等于6', 9, 'published', 'L2'),

('essay', '数学', '四年级', '请解释小数和分数的关系。',
 NULL, '"小数和分数都是表示部分数量的方法，可以相互转换"'::jsonb, 10, 'medium', '理解小数和分数的联系', 9, 'published', 'L3');

-- 五年级数学题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '五年级', '一个长方形的长是8cm，宽是5cm，它的面积是？',
 '{"A": "13平方厘米", "B": "26平方厘米", "C": "40平方厘米", "D": "80平方厘米"}'::jsonb,
 '"C"'::jsonb, 5, 'medium', '长方形面积 = 长 × 宽 = 8 × 5 = 40', 9, 'published', 'L3'),

('multiple', '数学', '五年级', '以下哪些是正方体的特征？（多选）',
 '{"A": "6个面", "B": "12条棱", "C": "8个顶点", "D": "所有棱长都相等"}'::jsonb,
 '["A", "B", "C", "D"]'::jsonb, 5, 'medium', '正方体的所有特征', 9, 'published', 'L4'),

('true_false', '数学', '五年级', '圆的周长等于直径乘以π。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '圆的周长公式：C = πd', 9, 'published', 'L3'),

('blank', '数学', '五年级', '一个圆的半径是3cm，它的面积是___ 平方厘米（π取3.14）',
 NULL, '"28.26"'::jsonb, 5, 'medium', '圆的面积 = πr² = 3.14 × 3² = 28.26', 9, 'published', 'L3'),

('essay', '数学', '五年级', '请说明如何计算组合图形的面积。',
 NULL, '"将组合图形分解成基本图形，分别计算面积后相加或相减"'::jsonb, 10, 'hard', '理解组合图形面积的计算方法', 9, 'published', 'L4');

-- 六年级数学题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '六年级', '如果x + 5 = 12，那么x = ?',
 '{"A": "5", "B": "6", "C": "7", "D": "8"}'::jsonb,
 '"C"'::jsonb, 5, 'medium', 'x = 12 - 5 = 7', 9, 'published', 'L4'),

('multiple', '数学', '六年级', '以下哪些是百分数的应用场景？（多选）',
 '{"A": "利率", "B": "折扣", "C": "增长率", "D": "税率"}'::jsonb,
 '["A", "B", "C", "D"]'::jsonb, 5, 'easy', '百分数在生活中广泛应用', 9, 'published', 'L3'),

('true_false', '数学', '六年级', '圆柱的体积等于底面积乘以高。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '圆柱体积公式：V = Sh', 9, 'published', 'L4'),

('blank', '数学', '六年级', '50的30%是___',
 NULL, '"15"'::jsonb, 5, 'easy', '50 × 30% = 50 × 0.3 = 15', 9, 'published', 'L3'),

('essay', '数学', '六年级', '请解释比例的基本性质。',
 NULL, '"在一个比例中，两个外项的积等于两个内项的积"'::jsonb, 10, 'medium', '理解比例的基本性质', 9, 'published', 'L4');

-- 七年级数学题目（出题人：蒋敏，虽然他是信息科技老师，但为了完整性，我们也让他出初中数学题）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '七年级', '|-5| = ?',
 '{"A": "-5", "B": "0", "C": "5", "D": "10"}'::jsonb,
 '"C"'::jsonb, 5, 'easy', '绝对值是数在数轴上到原点的距离', 12, 'published', 'L3'),

('multiple', '数学', '七年级', '以下哪些是有理数？（多选）',
 '{"A": "整数", "B": "分数", "C": "小数", "D": "无理数"}'::jsonb,
 '["A", "B", "C"]'::jsonb, 5, 'medium', '有理数包括整数、分数和有限小数', 12, 'published', 'L4'),

('true_false', '数学', '七年级', '负数乘以负数等于正数。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '负负得正', 12, 'published', 'L3'),

('blank', '数学', '七年级', '(-3) × 4 = ___',
 NULL, '"-12"'::jsonb, 5, 'easy', '负数乘以正数等于负数', 12, 'published', 'L3'),

('essay', '数学', '七年级', '请解释有理数的运算顺序。',
 NULL, '"先算乘方，再算乘除，最后算加减；同级运算从左到右；有括号先算括号内"'::jsonb, 10, 'medium', '理解运算顺序', 12, 'published', 'L4');

-- 八年级数学题目（出题人：蒋敏）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '八年级', '(x + 2)(x - 2) = ?',
 '{"A": "x² - 4", "B": "x² + 4", "C": "x² - 2", "D": "x² + 2"}'::jsonb,
 '"A"'::jsonb, 5, 'medium', '平方差公式：(a+b)(a-b) = a² - b²', 12, 'published', 'L5'),

('multiple', '数学', '八年级', '以下哪些是二次函数的图像特征？（多选）',
 '{"A": "抛物线", "B": "对称轴", "C": "顶点", "D": "直线"}'::jsonb,
 '["A", "B", "C"]'::jsonb, 5, 'medium', '二次函数图像是抛物线，有对称轴和顶点', 12, 'published', 'L5'),

('true_false', '数学', '八年级', '勾股定理只适用于直角三角形。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '勾股定理是直角三角形的特有性质', 12, 'published', 'L4'),

('blank', '数学', '八年级', '一个直角三角形两条直角边长度分别为3和4，斜边长度是___',
 NULL, '"5"'::jsonb, 5, 'medium', '根据勾股定理：3² + 4² = 5²', 12, 'published', 'L4'),

('essay', '数学', '八年级', '请说明如何因式分解一个二次三项式。',
 NULL, '"找出两个数，它们的和等于一次项系数，积等于常数项，然后用十字相乘法分解"'::jsonb, 10, 'hard', '理解因式分解的方法', 12, 'published', 'L5');

-- 九年级数学题目（出题人：蒋敏）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '数学', '九年级', '一元二次方程x² - 5x + 6 = 0的解是？',
 '{"A": "x=2或x=3", "B": "x=1或x=6", "C": "x=-2或x=-3", "D": "x=-1或x=-6"}'::jsonb,
 '"A"'::jsonb, 5, 'medium', '分解因式：(x-2)(x-3)=0，得x=2或x=3', 12, 'published', 'L5'),

('multiple', '数学', '九年级', '以下哪些是相似三角形的判定方法？（多选）',
 '{"A": "三边成比例", "B": "两角对应相等", "C": "两边成比例且夹角相等", "D": "全等"}'::jsonb,
 '["A", "B", "C"]'::jsonb, 5, 'medium', '相似三角形的判定定理', 12, 'published', 'L6'),

('true_false', '数学', '九年级', '圆的切线垂直于过切点的半径。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '这是圆的切线性质', 12, 'published', 'L5'),

('blank', '数学', '九年级', '若sin30° = 0.5，则cos60° = ___',
 NULL, '"0.5"'::jsonb, 5, 'medium', 'sin30° = cos60° = 0.5', 12, 'published', 'L5'),

('essay', '数学', '九年级', '请说明二次函数的顶点式与一般式的转换方法。',
 NULL, '"通过配方法可以将一般式y=ax²+bx+c转换为顶点式y=a(x-h)²+k"'::jsonb, 10, 'hard', '理解二次函数的不同表示形式', 12, 'published', 'L6');

-- ================================
-- 信息科技题目（三年级到九年级）
-- ================================

-- 三年级信息科技题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '信息科技', '三年级', '计算机的"大脑"是？',
 '{"A": "显示器", "B": "键盘", "C": "CPU", "D": "鼠标"}'::jsonb,
 '"C"'::jsonb, 5, 'easy', 'CPU是中央处理器，负责计算和控制', 9, 'published', 'L1'),

('multiple', '信息科技', '三年级', '以下哪些是计算机的输入设备？（多选）',
 '{"A": "键盘", "B": "鼠标", "C": "显示器", "D": "扫描仪"}'::jsonb,
 '["A", "B", "D"]'::jsonb, 5, 'easy', '输入设备用于向计算机输入信息', 9, 'published', 'L1'),

('true_false', '信息科技', '三年级', '显示器是输出设备。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '显示器用于显示计算机输出的信息', 9, 'published', 'L1'),

('blank', '信息科技', '三年级', '计算机的三大组成部分是：输入设备、___和输出设备',
 NULL, '"主机"'::jsonb, 5, 'easy', '计算机由输入设备、主机和输出设备组成', 9, 'published', 'L1'),

('essay', '信息科技', '三年级', '请说明计算机在我们生活中的应用。',
 NULL, '"计算机用于学习、娱乐、通信、工作等多个方面"'::jsonb, 10, 'easy', '了解计算机的应用', 9, 'published', 'L1');

-- 四年级信息科技题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '信息科技', '四年级', '以下哪个软件是文字处理软件？',
 '{"A": "Photoshop", "B": "Word", "C": "Excel", "D": "PowerPoint"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', 'Word是微软的文字处理软件', 9, 'published', 'L2'),

('multiple', '信息科技', '四年级', '以下哪些是常见的文件格式？（多选）',
 '{"A": ".txt", "B": ".doc", "C": ".jpg", "D": ".mp3"}'::jsonb,
 '["A", "B", "C", "D"]'::jsonb, 5, 'easy', '这些都是常见的文件格式', 9, 'published', 'L2'),

('true_false', '信息科技', '四年级', '文件夹可以包含其他文件夹。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '文件夹可以嵌套，形成层级结构', 9, 'published', 'L2'),

('blank', '信息科技', '四年级', '在Windows系统中，复制文件的快捷键是___',
 NULL, '"Ctrl+C"'::jsonb, 5, 'easy', 'Ctrl+C用于复制', 9, 'published', 'L2'),

('essay', '信息科技', '四年级', '请说明如何创建和管理文件夹。',
 NULL, '"右键点击空白处，选择新建文件夹，输入名称；可以通过拖拽来移动文件"'::jsonb, 10, 'medium', '了解文件管理', 9, 'published', 'L2');

-- 五年级信息科技题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '信息科技', '五年级', 'Scratch中，以下哪个积木块用于移动角色？',
 '{"A": "说", "B": "移动10步", "C": "等待", "D": "停止"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', 'Scratch中移动积木块用于移动角色', 9, 'published', 'L3'),

('multiple', '信息科技', '五年级', '在Scratch中，以下哪些是事件积木？（多选）',
 '{"A": "当绿旗被点击", "B": "当按下空格键", "C": "重复执行", "D": "广播"}'::jsonb,
 '["A", "B"]'::jsonb, 5, 'medium', '事件积木用于触发程序执行', 9, 'published', 'L3'),

('true_false', '信息科技', '五年级', 'Scratch是一种图形化编程语言。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', 'Scratch使用图形化积木进行编程', 9, 'published', 'L3'),

('blank', '信息科技', '五年级', '在Scratch中，让角色重复执行某个动作使用___积木',
 NULL, '"重复执行"'::jsonb, 5, 'easy', '重复执行积木用于循环', 9, 'published', 'L3'),

('essay', '信息科技', '五年级', '请说明什么是循环，并举例说明。',
 NULL, '"循环是重复执行某段代码，如让角色重复移动10步"'::jsonb, 10, 'medium', '理解循环概念', 9, 'published', 'L3');

-- 六年级信息科技题目（出题人：陈刚）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '信息科技', '六年级', '在编程中，以下哪个是条件判断语句？',
 '{"A": "循环", "B": "如果...那么", "C": "变量", "D": "函数"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', '条件判断使用if语句', 9, 'published', 'L4'),

('multiple', '信息科技', '六年级', '以下哪些是编程的基本结构？（多选）',
 '{"A": "顺序", "B": "选择", "C": "循环", "D": "递归"}'::jsonb,
 '["A", "B", "C"]'::jsonb, 5, 'medium', '顺序、选择和循环是三大基本结构', 9, 'published', 'L4'),

('true_false', '信息科技', '六年级', '变量可以用来存储和改变数据。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '变量是存储数据的容器', 9, 'published', 'L4'),

('blank', '信息科技', '六年级', '在编程中，___语句用于根据条件执行不同的代码',
 NULL, '"if"'::jsonb, 5, 'easy', 'if语句用于条件判断', 9, 'published', 'L4'),

('essay', '信息科技', '六年级', '请解释什么是算法，并举一个简单的例子。',
 NULL, '"算法是解决问题的步骤，如计算1到100的和：初始化和为0，从1到100依次相加"'::jsonb, 10, 'medium', '理解算法概念', 9, 'published', 'L4');

-- 七年级信息科技题目（出题人：蒋敏）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '信息科技', '七年级', 'Python中，以下哪个是正确的输出语句？',
 '{"A": "echo()", "B": "print()", "C": "printf()", "D": "cout"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', 'Python使用print()函数输出', 12, 'published', 'L4'),

('multiple', '信息科技', '七年级', 'Python中，以下哪些是数据类型？（多选）',
 '{"A": "整数int", "B": "浮点数float", "C": "字符串str", "D": "布尔bool"}'::jsonb,
 '["A", "B", "C", "D"]'::jsonb, 5, 'medium', 'Python的基本数据类型', 12, 'published', 'L5'),

('true_false', '信息科技', '七年级', 'Python是一种解释型语言。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', 'Python代码逐行解释执行', 12, 'published', 'L4'),

('blank', '信息科技', '七年级', '在Python中，定义变量x等于10的语句是：x = ___',
 NULL, '"10"'::jsonb, 5, 'easy', 'Python使用=赋值', 12, 'published', 'L4'),

('essay', '信息科技', '七年级', '请说明Python中列表和字符串的区别。',
 NULL, '"列表可以包含多种类型的元素且可修改，字符串只包含字符且不可修改"'::jsonb, 10, 'medium', '理解数据类型', 12, 'published', 'L5');

-- 八年级信息科技题目（出题人：蒋敏）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '信息科技', '八年级', '以下哪个不是面向对象编程的特征？',
 '{"A": "封装", "B": "继承", "C": "多态", "D": "编译"}'::jsonb,
 '"D"'::jsonb, 5, 'medium', '面向对象的三大特征是封装、继承和多态', 12, 'published', 'L6'),

('multiple', '信息科技', '八年级', '以下哪些是常见的排序算法？（多选）',
 '{"A": "冒泡排序", "B": "快速排序", "C": "选择排序", "D": "插入排序"}'::jsonb,
 '["A", "B", "C", "D"]'::jsonb, 5, 'medium', '这些都是常见的排序算法', 12, 'published', 'L6'),

('true_false', '信息科技', '八年级', '数组的索引从0开始。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"A"'::jsonb, 5, 'easy', '大多数编程语言中数组索引从0开始', 12, 'published', 'L5'),

('blank', '信息科技', '八年级', '时间复杂度为O(n²)的排序算法有冒泡排序和___排序',
 NULL, '"选择"'::jsonb, 5, 'medium', '冒泡排序和选择排序都是O(n²)', 12, 'published', 'L6'),

('essay', '信息科技', '八年级', '请说明什么是递归，并举例说明。',
 NULL, '"递归是函数调用自己，如计算阶乘：n! = n × (n-1)!"'::jsonb, 10, 'hard', '理解递归概念', 12, 'published', 'L6');

-- 九年级信息科技题目（出题人：蒋敏）
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by, status, level)
VALUES
('single', '信息科技', '九年级', '以下哪个不是数据库管理系统？',
 '{"A": "MySQL", "B": "Oracle", "C": "Photoshop", "D": "MongoDB"}'::jsonb,
 '"C"'::jsonb, 5, 'easy', 'Photoshop是图像处理软件', 12, 'published', 'L6'),

('multiple', '信息科技', '九年级', 'SQL语言中，以下哪些是数据操作语句？（多选）',
 '{"A": "SELECT", "B": "INSERT", "C": "UPDATE", "D": "DELETE"}'::jsonb,
 '["A", "B", "C", "D"]'::jsonb, 5, 'medium', 'SQL的基本操作语句', 12, 'published', 'L7'),

('true_false', '信息科技', '九年级', 'HTML是一种编程语言。',
 '{"A": "正确", "B": "错误"}'::jsonb,
 '"B"'::jsonb, 5, 'easy', 'HTML是标记语言，不是编程语言', 12, 'published', 'L6'),

('blank', '信息科技', '九年级', '在网页开发中，CSS用于控制网页的___',
 NULL, '"样式"'::jsonb, 5, 'easy', 'CSS用于控制网页样式', 12, 'published', 'L6'),

('essay', '信息科技', '九年级', '请说明前端开发和后端开发的区别。',
 NULL, '"前端负责用户界面和交互，后端负责数据处理和业务逻辑"'::jsonb, 10, 'medium', '理解前后端概念', 12, 'published', 'L7');

-- ===================================================================
-- 验证数据导入结果
-- ===================================================================
SELECT '题库数据导入完成！' as message;

SELECT subject, grade, status, COUNT(*) as count
FROM question_bank
GROUP BY subject, grade, status
ORDER BY subject, grade, status;

SELECT '总题目数:' as label, COUNT(*) as total FROM question_bank;
