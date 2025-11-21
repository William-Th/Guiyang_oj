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
