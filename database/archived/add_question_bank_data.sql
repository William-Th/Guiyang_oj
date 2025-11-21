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
