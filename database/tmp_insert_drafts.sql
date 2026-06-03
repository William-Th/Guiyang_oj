
-- 数学单选题 x6
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by) VALUES
('single', '数学', '三年级', '下面哪个数是奇数？', '["A. 12", "B. 15", "C. 20", "D. 24"]', '"B"', '奇数是不能被2整除的数。15不能被2整除，所以是奇数。', 'easy', 'L1', 5, '{"数感"}', '{"数的认识"}', '{"奇偶性"}', 12),
('single', '数学', '三年级', '一个三角形的三条边分别是3cm、4cm、5cm，这是什么三角形？', '["A. 锐角三角形", "B. 直角三角形", "C. 钝角三角形", "D. 等腰三角形"]', '"B"', '满足勾股定理，所以是直角三角形。', 'medium', 'L3', 5, '{"几何直观"}', '{"三角形"}', '{"三角形分类"}', 12),
('single', '数学', '四年级', '3.14乘以100的结果是？', '["A. 0.314", "B. 31.4", "C. 314", "D. 3140"]', '"C"', '小数乘以100，小数点向右移动两位。', 'easy', 'L2', 5, '{"运算能力"}', '{"小数乘法"}', '{"小数运算"}', 12),
('single', '数学', '五年级', '一个圆的半径是5cm，面积是多少平方厘米？', '["A. 31.4", "B. 78.5", "C. 157", "D. 15.7"]', '"B"', '面积=3.14*25=78.5', 'medium', 'L4', 5, '{"运算能力"}', '{"圆的面积"}', '{"圆"}', 12),
('single', '数学', '六年级', '一列火车3小时行驶360千米，5小时能行驶多少千米？', '["A. 500", "B. 600", "C. 720", "D. 480"]', '"B"', '速度120千米/时*5=600', 'medium', 'L5', 5, '{"问题解决"}', '{"行程问题"}', '{"速度"}', 12),
('single', '数学', '三年级', '下列哪个分数最大？', '["A. 1/2", "B. 1/3", "C. 2/5", "D. 3/4"]', '"D"', '3/4=0.75最大', 'hard', 'L3', 5, '{"数感"}', '{"分数"}', '{"分数比较"}', 12);

-- 信息科技单选题 x4
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by) VALUES
('single', '信息科技', '三年级', '计算机中用来长期存储数据的设备是？', '["A. 内存", "B. CPU", "C. 硬盘", "D. 显卡"]', '"C"', '硬盘是主要存储设备。', 'easy', 'L1', 5, '{"信息意识"}', '{"计算机基础"}', '{"硬件"}', 13),
('single', '信息科技', '四年级', 'Scratch中让角色移动10步应使用哪个积木？', '["A. 说你好", "B. 移动10步", "C. 等待1秒", "D. 旋转15度"]', '"B"', '移动10步积木可让角色前进。', 'easy', 'L2', 5, '{"计算思维"}', '{"Scratch编程"}', '{"Scratch"}', 13),
('single', '信息科技', '五年级', '二进制1011转十进制是多少？', '["A. 9", "B. 10", "C. 11", "D. 12"]', '"C"', '8+0+2+1=11', 'medium', 'L4', 5, '{"计算思维"}', '{"数制转换"}', '{"二进制"}', 13),
('single', '信息科技', '六年级', '以下哪个是合法的电子邮箱？', '["A. test.com", "B. test@163.com", "C. @test.com", "D. test@com"]', '"B"', '邮箱格式为用户名@域名。', 'medium', 'L5', 5, '{"信息意识"}', '{"网络基础"}', '{"邮箱"}', 13);

-- 判断题 x6
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by) VALUES
('true_false', '数学', '三年级', '所有的正方形都是长方形。', '["A. 正确", "B. 错误"]', '"A"', '正方形是特殊的长方形。', 'easy', 'L2', 5, '{"几何直观"}', '{"四边形"}', '{"正方形"}', 12),
('true_false', '数学', '四年级', '0是最小的自然数。', '["A. 正确", "B. 错误"]', '"A"', '自然数从0开始。', 'easy', 'L2', 5, '{"数感"}', '{"自然数"}', '{"数"}', 12),
('true_false', '数学', '五年级', '两个质数的和一定是偶数。', '["A. 正确", "B. 错误"]', '"B"', '2+3=5是奇数。', 'medium', 'L4', 5, '{"推理能力"}', '{"质数"}', '{"质数"}', 12),
('true_false', '信息科技', '三年级', 'U盘属于计算机的输入设备。', '["A. 正确", "B. 错误"]', '"B"', 'U盘是存储设备。', 'easy', 'L1', 5, '{"信息意识"}', '{"计算机基础"}', '{"硬件"}', 13),
('true_false', '信息科技', '四年级', 'Scratch中的角色只能是小猫。', '["A. 正确", "B. 错误"]', '"B"', '角色可以是任何造型。', 'easy', 'L2', 5, '{"计算思维"}', '{"Scratch编程"}', '{"Scratch"}', 13),
('true_false', '信息科技', '五年级', 'IP地址是每台计算机的唯一标识。', '["A. 正确", "B. 错误"]', '"A"', 'IP地址类似门牌号。', 'medium', 'L3', 5, '{"信息意识"}', '{"网络基础"}', '{"IP地址"}', 13);

-- 填空题 x4
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by) VALUES
('blank', '数学', '三年级', '一年有（）个月，其中大月有（）个。', NULL, '["12", "7"]', '12个月，大月7个。', 'easy', 'L2', 10, '{"常识"}', '{"时间"}', '{"年月日"}', 12),
('blank', '数学', '五年级', '长方体长5cm宽3cm高4cm，体积是（）立方厘米。', NULL, '["60"]', '5*3*4=60', 'medium', 'L4', 10, '{"空间观念"}', '{"长方体"}', '{"体积"}', 12),
('blank', '信息科技', '四年级', 'Scratch中重复执行用（）积木。', NULL, '["重复执行"]', '重复执行积木。', 'easy', 'L2', 5, '{"计算思维"}', '{"Scratch编程"}', '{"循环"}', 13),
('blank', '信息科技', '五年级', '计算机直接识别的语言是（）语言。', NULL, '["机器"]', '机器语言由0和1组成。', 'medium', 'L3', 5, '{"计算思维"}', '{"编程基础"}', '{"编程语言"}', 13);

-- 匹配题 x2
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by) VALUES
('matching', '信息科技', '三年级', '请将计算机部件与功能匹配。', '[{"left":"键盘","right":"输入设备"},{"left":"显示器","right":"输出设备"},{"left":"硬盘","right":"存储设备"},{"left":"CPU","right":"处理设备"}]', '{"键盘":"输入设备","显示器":"输出设备","硬盘":"存储设备","CPU":"处理设备"}', '硬件功能对应。', 'medium', 'L2', 10, '{"信息意识"}', '{"计算机基础"}', '{"硬件"}', 13),
('matching', '数学', '四年级', '请将图形特征与名称匹配。', '[{"left":"三条边","right":"三角形"},{"left":"四条等边","right":"正方形"},{"left":"对边相等","right":"长方形"},{"left":"五条边","right":"五边形"}]', '{"三条边":"三角形","四条等边":"正方形","对边相等":"长方形","五条边":"五边形"}', '图形分类。', 'easy', 'L3', 10, '{"几何直观"}', '{"图形认识"}', '{"多边形"}', 12);

-- 编程题 x1
INSERT INTO question_drafts (type, subject, grade, content, options, correct_answer, explanation, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by, code_template, supported_languages) VALUES
('code', '信息科技', '五年级', '输入两个整数a和b，输出它们的和。', NULL, '"输入3 5输出8"', '读取两个数相加输出。', 'medium', 'L4', 20, '{"计算思维"}', '{"编程基础"}', '{"输入输出"}', 13, '#include <iostream>
using namespace std;
int main() {
    int a, b;
    // 请编写代码
    return 0;
}', '{"cpp"}');
