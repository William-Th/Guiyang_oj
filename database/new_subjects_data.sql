-- 新学科样例数据脚本
-- 包含：数学、物理、生物、化学、计算机
-- 年级：七年级、八年级、九年级

-- ========================================
-- 1. 添加新的考试数据
-- ========================================

-- 数学考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季数学七年级期中考试', '七年级数学期中测试', '数学', '七年级', '2024-04-15 09:00:00', '2024-04-15 11:00:00', 120, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1)),
('2024春季数学八年级期中考试', '八年级数学期中测试', '数学', '八年级', '2024-04-16 09:00:00', '2024-04-16 11:00:00', 120, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1)),
('2024春季数学九年级模拟考试', '九年级数学中考模拟', '数学', '九年级', '2024-04-17 09:00:00', '2024-04-17 11:30:00', 120, 120, 72, 'finished',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1))
ON CONFLICT DO NOTHING;

-- 物理考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季物理八年级期中考试', '八年级物理期中测试', '物理', '八年级', '2024-04-18 09:00:00', '2024-04-18 10:30:00', 90, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher02' LIMIT 1)),
('2024春季物理九年级模拟考试', '九年级物理中考模拟', '物理', '九年级', '2024-04-19 09:00:00', '2024-04-19 10:30:00', 90, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher02' LIMIT 1))
ON CONFLICT DO NOTHING;

-- 化学考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季化学九年级期中考试', '九年级化学期中测试', '化学', '九年级', '2024-04-20 14:00:00', '2024-04-20 15:30:00', 90, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher03' LIMIT 1))
ON CONFLICT DO NOTHING;

-- 生物考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季生物七年级期中考试', '七年级生物期中测试', '生物', '七年级', '2024-04-21 14:00:00', '2024-04-21 15:30:00', 90, 100, 60, 'published',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1)),
('2024春季生物八年级期中考试', '八年级生物期中测试', '生物', '八年级', '2024-04-22 14:00:00', '2024-04-22 15:30:00', 90, 100, 60, 'draft',
  (SELECT id FROM users WHERE username = 'teacher01' LIMIT 1))
ON CONFLICT DO NOTHING;

-- 计算机考试
INSERT INTO exams (title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by) VALUES
('2024春季计算机七年级上机考试', '七年级计算机实践操作', '计算机', '七年级', '2024-05-05 14:00:00', '2024-05-05 16:00:00', 60, 100, 60, 'draft',
  (SELECT id FROM users WHERE username = 'teacher02' LIMIT 1))
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. 添加题库数据（覆盖所有题型、科目和年级）
-- ========================================

-- 获取创建者ID（使用admin账号）
DO $$
DECLARE
  admin_id INT;
BEGIN
  SELECT id INTO admin_id FROM users WHERE username = 'admin' LIMIT 1;

  IF admin_id IS NOT NULL THEN
    -- 单选题 (single) - 每个科目每个年级各2题

    -- 数学单选题
    INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by) VALUES
    ('single', '数学', '七年级', '下列各数中，最小的数是（）',
     '["A. -5", "B. -3", "C. 0", "D. 2"]', 'A', 5, 'easy', '负数小于零，负数中绝对值越大的数越小，所以-5最小', admin_id),
    ('single', '数学', '七年级', '已知∠A=35°，则∠A的余角是（）',
     '["A. 55°", "B. 65°", "C. 145°", "D. 155°"]', 'A', 5, 'easy', '余角是两个角的和为90°，90°-35°=55°', admin_id),

    ('single', '数学', '八年级', '下列运算正确的是（）',
     '["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]', 'B', 5, 'medium', '同底数幂相乘，底数不变，指数相加：a³·a²=a⁵', admin_id),
    ('single', '数学', '八年级', '在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）',
     '["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]', 'B', 5, 'medium', '关于x轴对称，x坐标不变，y坐标变为相反数', admin_id),

    ('single', '数学', '九年级', '已知一元二次方程x²-5x+6=0的两根为x₁和x₂，则x₁+x₂的值为（）',
     '["A. -5", "B. 5", "C. -6", "D. 6"]', 'B', 5, 'medium', '根据韦达定理，x₁+x₂=-b/a=5', admin_id),
    ('single', '数学', '九年级', '抛物线y=2(x-1)²+3的顶点坐标是（）',
     '["A. (1,3)", "B. (-1,3)", "C. (1,-3)", "D. (-1,-3)"]', 'A', 5, 'easy', '抛物线顶点式y=a(x-h)²+k，顶点坐标为(h,k)，所以是(1,3)', admin_id),

    -- 物理单选题
    ('single', '物理', '八年级', '下列物理量中，以科学家的名字命名的单位是（）',
     '["A. 长度", "B. 时间", "C. 力", "D. 速度"]', 'C', 5, 'easy', '力的单位是牛顿(N)，以科学家牛顿的名字命名', admin_id),
    ('single', '物理', '八年级', '关于光的传播，下列说法正确的是（）',
     '["A. 光只能在真空中传播", "B. 光在同种均匀介质中沿直线传播", "C. 光的传播不需要时间", "D. 光在任何介质中的速度都相同"]', 'B', 5, 'easy', '光在同种均匀介质中沿直线传播是基本规律', admin_id),

    ('single', '物理', '九年级', '下列说法正确的是（）',
     '["A. 电流的方向是电子移动的方向", "B. 电源是提供电压的装置", "C. 电压的单位是安培", "D. 串联电路中各处电流不相等"]', 'B', 5, 'medium', '电源的作用是提供电压，使电路中形成持续电流', admin_id),
    ('single', '物理', '九年级', '一个物体从静止开始做匀加速直线运动，第1秒内通过的位移是1m，则第2秒内通过的位移是（）',
     '["A. 1m", "B. 2m", "C. 3m", "D. 4m"]', 'C', 5, 'hard', '匀加速直线运动，连续相等时间内位移比为1:3:5...，所以第2秒内位移是3m', admin_id),

    -- 化学单选题
    ('single', '化学', '九年级', '下列变化属于化学变化的是（）',
     '["A. 冰雪融化", "B. 铁生锈", "C. 玻璃破碎", "D. 汽油挥发"]', 'B', 5, 'easy', '铁生锈是铁与氧气、水等发生化学反应，生成新物质，属于化学变化', admin_id),
    ('single', '化学', '九年级', '空气中含量最多的气体是（）',
     '["A. 氧气", "B. 氮气", "C. 二氧化碳", "D. 稀有气体"]', 'B', 5, 'easy', '空气中氮气约占78%，是含量最多的气体', admin_id),

    -- 生物单选题
    ('single', '生物', '七年级', '细胞的控制中心是（）',
     '["A. 细胞膜", "B. 细胞质", "C. 细胞核", "D. 线粒体"]', 'C', 5, 'easy', '细胞核内含有遗传物质，是细胞的控制中心', admin_id),
    ('single', '生物', '七年级', '植物进行光合作用的场所是（）',
     '["A. 细胞核", "B. 线粒体", "C. 叶绿体", "D. 细胞膜"]', 'C', 5, 'easy', '叶绿体是光合作用的场所，含有叶绿素', admin_id),

    ('single', '生物', '八年级', '人体消化食物、吸收营养物质的主要场所是（）',
     '["A. 口腔", "B. 胃", "C. 小肠", "D. 大肠"]', 'C', 5, 'easy', '小肠是消化和吸收的主要场所，其内表面有大量绒毛，增大吸收面积', admin_id),
    ('single', '生物', '八年级', '血液循环系统由心脏和血管组成，其中能进行物质交换的血管是（）',
     '["A. 动脉", "B. 静脉", "C. 毛细血管", "D. 主动脉"]', 'C', 5, 'medium', '毛细血管管壁薄，只有一层上皮细胞，便于物质交换', admin_id),

    -- 计算机单选题
    ('single', '计算机', '七年级', '下列设备中，属于输入设备的是（）',
     '["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]', 'C', 5, 'easy', '键盘是输入设备，用于向计算机输入数据和指令', admin_id),
    ('single', '计算机', '七年级', '计算机的"大脑"是（）',
     '["A. 硬盘", "B. CPU", "C. 内存", "D. 主板"]', 'B', 5, 'easy', 'CPU(中央处理器)是计算机的核心，负责处理数据和执行指令', admin_id);

    -- 多选题 (multiple) - 每个科目2题
    INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by) VALUES
    ('multiple', '数学', '八年级', '下列函数中，y随x增大而增大的有（）',
     '["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]', '["A","C"]', 10, 'medium', 'A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大', admin_id),
    ('multiple', '数学', '九年级', '下列说法正确的有（）',
     '["A. 对角线互相垂直的四边形是菱形", "B. 对角线相等的平行四边形是矩形", "C. 对角线互相垂直平分且相等的四边形是正方形", "D. 一组对边平行的四边形是梯形"]', '["B","C"]', 10, 'medium', 'B、C选项符合矩形和正方形的判定定理', admin_id),

    ('multiple', '物理', '八年级', '下列现象中，能说明分子在不停运动的有（）',
     '["A. 春天柳絮飘扬", "B. 夏天荷花飘香", "C. 秋天落叶飞舞", "D. 冬天雪花飞舞"]', '["B"]', 10, 'medium', '只有B选项是扩散现象，说明分子在运动；其他都是物体的机械运动', admin_id),
    ('multiple', '物理', '九年级', '关于电路，下列说法正确的有（）',
     '["A. 电路中有电源就一定有电流", "B. 电路必须闭合才能有电流", "C. 电流方向是从正极到负极", "D. 导体中有电流通过时，导体发热"]', '["B","C","D"]', 10, 'medium', '电路必须闭合才有电流；电流方向规定为从正极到负极；导体通电会发热', admin_id),

    ('multiple', '化学', '九年级', '下列物质的用途中，利用其化学性质的有（）',
     '["A. 氧气用于医疗急救", "B. 氮气用作保护气", "C. 干冰用于人工降雨", "D. 铜用于制造导线"]', '["A","B"]', 10, 'medium', 'A利用氧气的助呼吸性质，B利用氮气的化学性质不活泼；C、D利用物理性质', admin_id),
    ('multiple', '化学', '九年级', '下列关于水的说法正确的有（）',
     '["A. 水是由氢元素和氧元素组成的", "B. 水是由氢分子和氧分子构成的", "C. 水分子是由氢原子和氧原子构成的", "D. 水是一种氧化物"]', '["A","C","D"]', 10, 'hard', '水由H和O元素组成；水分子由H原子和O原子构成；水是氧化物', admin_id),

    ('multiple', '生物', '七年级', '下列生物属于单细胞生物的有（）',
     '["A. 草履虫", "B. 酵母菌", "C. 细菌", "D. 蚯蚓"]', '["A","B","C"]', 10, 'easy', '草履虫、酵母菌、细菌都是单细胞生物；蚯蚓是多细胞生物', admin_id),
    ('multiple', '生物', '八年级', '下列属于人体免疫的第三道防线的有（）',
     '["A. 皮肤", "B. 黏膜", "C. 吞噬细胞", "D. 特异性免疫"]', '["D"]', 10, 'medium', '第三道防线是特异性免疫，针对特定病原体；A、B是第一道防线，C是第二道防线', admin_id),

    ('multiple', '计算机', '七年级', '下列属于应用软件的有（）',
     '["A. Windows", "B. Word", "C. Excel", "D. PowerPoint"]', '["B","C","D"]', 10, 'easy', 'Windows是操作系统，Word、Excel、PowerPoint是应用软件', admin_id),
    ('multiple', '计算机', '八年级', '下列关于网络安全的做法正确的有（）',
     '["A. 定期更新杀毒软件", "B. 不随意打开陌生邮件", "C. 使用简单密码便于记忆", "D. 不在公共场合输入密码"]', '["A","B","D"]', 10, 'medium', 'A、B、D都是正确的网络安全做法；C使用简单密码不安全', admin_id);

    -- 填空题 (blank) - 每个科目2题
    INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by) VALUES
    ('blank', '数学', '七年级', '一个数的相反数是-5，这个数是______。',
     '["5"]', '5', 5, 'easy', '相反数的定义：只有符号不同的两个数互为相反数', admin_id),
    ('blank', '数学', '八年级', '若x²-6x+m是完全平方式，则m=______。',
     '["9"]', '9', 5, 'medium', '完全平方公式：(x-3)²=x²-6x+9，所以m=9', admin_id),

    ('blank', '物理', '八年级', '物理学中，把物体位置的变化叫做______。',
     '["机械运动", "运动"]', '机械运动', 5, 'easy', '机械运动是物理学中最简单的运动形式', admin_id),
    ('blank', '物理', '九年级', '导体的电阻与导体的______、______和______有关。',
     '["材料", "长度", "横截面积"]', '["材料","长度","横截面积"]', 5, 'medium', '导体电阻由材料、长度、横截面积决定，还与温度有关', admin_id),

    ('blank', '化学', '九年级', '化学变化的本质特征是有______生成。',
     '["新物质"]', '新物质', 5, 'easy', '化学变化的本质是分子破裂、原子重组，生成新物质', admin_id),
    ('blank', '化学', '九年级', '化学式H₂O中，元素H和O的质量比为______。',
     '["1:8", "1：8"]', '1:8', 5, 'medium', 'H的相对原子质量为1，O为16，所以质量比为(1×2):16=1:8', admin_id),

    ('blank', '生物', '七年级', '生物体结构和功能的基本单位是______。',
     '["细胞"]', '细胞', 5, 'easy', '细胞是生物体结构和功能的基本单位', admin_id),
    ('blank', '生物', '八年级', '人体血液循环分为______循环和______循环两条途径。',
     '["体循环", "肺循环"]', '["体循环","肺循环"]', 5, 'medium', '血液循环包括体循环（大循环）和肺循环（小循环）', admin_id),

    ('blank', '计算机', '七年级', '计算机中最小的信息单位是______。',
     '["位", "bit", "比特"]', '位', 5, 'easy', '位(bit)是计算机中最小的信息单位，表示0或1', admin_id),
    ('blank', '计算机', '八年级', 'IP地址由______位二进制数组成。',
     '["32"]', '32', 5, 'medium', 'IPv4地址由32位二进制数组成，通常表示为4组十进制数', admin_id);

    -- 问答题 (essay) - 每个科目2题
    INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by) VALUES
    ('essay', '数学', '八年级', '已知△ABC中，AB=AC，点D在BC上，且AD平分∠BAC。求证：BD=CD。',
     NULL, '证明：因为AB=AC，AD平分∠BAC，所以∠BAD=∠CAD。在△ABD和△ACD中，AB=AC，∠BAD=∠CAD，AD=AD，所以△ABD≌△ACD(SAS)，所以BD=CD。', 15, 'medium', '利用等腰三角形的性质和全等三角形的判定与性质', admin_id),
    ('essay', '数学', '九年级', '某商店销售一种商品，每件成本40元，若售价为50元，每天可售出100件。经调查，售价每提高1元，每天销量减少5件。问：售价定为多少元时，每天的利润最大？最大利润是多少？',
     NULL, '设售价为(50+x)元，则每天销量为(100-5x)件，利润y=(50+x-40)(100-5x)=(10+x)(100-5x)=-5x²+50x+1000=-5(x-5)²+1125。当x=5时，y最大=1125元，此时售价为55元。', 20, 'hard', '利用二次函数求最值，建立数学模型求解实际问题', admin_id),

    ('essay', '物理', '八年级', '小明用弹簧测力计测量一个物体的重力，测得结果为5N。请说明弹簧测力计的工作原理，并指出测量时应注意的事项。',
     NULL, '工作原理：弹簧测力计是利用弹簧的伸长量与受到的拉力成正比的原理制成的。注意事项：1.使用前检查指针是否指在零刻度线；2.测量时拉力方向应与弹簧轴线方向一致；3.读数时视线与刻度盘垂直；4.不能超过测量范围。', 15, 'medium', '考查对测量工具原理的理解和规范操作', admin_id),
    ('essay', '物理', '九年级', '请用所学的电学知识，设计一个实验方案，测量一个小灯泡的额定功率。要求写出实验器材、电路图和主要步骤。',
     NULL, '实验器材：电源、小灯泡、电压表、电流表、滑动变阻器、开关、导线若干。电路图：电源、开关、滑动变阻器、小灯泡串联，电压表并联在小灯泡两端，电流表串联在电路中。步骤：1.连接电路；2.闭合开关，调节滑动变阻器，使电压表示数等于小灯泡额定电压；3.读出此时电流表示数；4.计算P=UI得到额定功率。', 20, 'hard', '综合考查电学实验设计能力', admin_id),

    ('essay', '化学', '九年级', '请写出实验室制取氧气的三种方法，并比较它们的优缺点。',
     NULL, '方法一：加热高锰酸钾，优点是操作简单，缺点是需要加热，成本较高。方法二：加热氯酸钾和二氧化锰混合物，优点是反应速率快，缺点是需要加热。方法三：过氧化氢在二氧化锰催化下分解，优点是不需要加热，反应容易控制，缺点是成本较高。', 15, 'medium', '考查化学实验方法和实验原理的比较', admin_id),
    ('essay', '化学', '九年级', '某同学在实验室配制50g质量分数为10%的NaCl溶液，请写出实验步骤并说明注意事项。',
     NULL, '步骤：1.计算：需要NaCl 5g，水45g；2.称量：用天平称取5g NaCl；3.量取：用量筒量取45mL水；4.溶解：将NaCl倒入烧杯中，加入水，用玻璃棒搅拌至完全溶解。注意事项：1.称量时要用滤纸；2.量水时视线与凹液面最低处相平；3.搅拌时不要碰撞杯壁和杯底。', 20, 'medium', '考查溶液配制的实验操作和计算能力', admin_id),

    ('essay', '生物', '七年级', '请描述植物细胞和动物细胞的结构，并说明它们的主要区别。',
     NULL, '植物细胞结构：细胞壁、细胞膜、细胞质、细胞核、液泡、叶绿体、线粒体等。动物细胞结构：细胞膜、细胞质、细胞核、线粒体等。主要区别：1.植物细胞有细胞壁，动物细胞没有；2.植物细胞有液泡和叶绿体，动物细胞一般没有；3.植物细胞多为规则形状，动物细胞形状多样。', 15, 'easy', '考查细胞结构的掌握和比较能力', admin_id),
    ('essay', '生物', '八年级', '请说明人体呼吸系统的组成，并描述肺泡与血液之间的气体交换过程。',
     NULL, '呼吸系统组成：鼻腔、咽、喉、气管、支气管、肺。气体交换：肺泡壁和毛细血管壁都很薄，只有一层上皮细胞构成。血液中的二氧化碳浓度高于肺泡，氧气浓度低于肺泡，因此二氧化碳从血液扩散到肺泡，氧气从肺泡扩散到血液。这样，静脉血变成动脉血。', 20, 'medium', '考查呼吸系统结构和气体交换原理', admin_id),

    ('essay', '计算机', '七年级', '请说明什么是计算机病毒，并列举三种预防计算机病毒的方法。',
     NULL, '计算机病毒是一种人为编制的、能够自我复制并破坏计算机功能或数据的程序。预防方法：1.安装正版杀毒软件并定期更新；2.不随意打开来历不明的邮件和文件；3.不使用来历不明的U盘和光盘；4.定期备份重要数据；5.及时更新操作系统补丁。', 15, 'easy', '考查网络安全意识和防护措施', admin_id),
    ('essay', '计算机', '八年级', '请简述冯·诺依曼计算机的工作原理，并说明"存储程序"的含义。',
     NULL, '冯·诺依曼计算机工作原理：1.采用二进制；2.存储程序；3.由运算器、控制器、存储器、输入设备和输出设备五部分组成。"存储程序"的含义：将程序和数据事先存入存储器，计算机工作时能自动从存储器取出指令并执行，实现自动化处理。这是现代计算机的基本工作方式。', 20, 'medium', '考查计算机基本原理的理解', admin_id);

    -- 编程题 (code) - 计算机科目2题
    INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by) VALUES
    ('code', '计算机', '七年级', '编写程序：输入三个整数，输出其中的最大值。',
     NULL, 'a = int(input())\nb = int(input())\nc = int(input())\nmax_num = a\nif b > max_num:\n    max_num = b\nif c > max_num:\n    max_num = c\nprint(max_num)', 20, 'easy', '使用条件判断找出最大值', admin_id),
    ('code', '计算机', '八年级', '编写程序：输入一个正整数n，计算并输出1到n之间所有偶数的和。',
     NULL, 'n = int(input())\nsum = 0\nfor i in range(2, n+1, 2):\n    sum += i\nprint(sum)', 20, 'medium', '使用循环累加计算偶数和', admin_id);

    -- 匹配题 (matching) - 每个科目1题
    INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, explanation, created_by) VALUES
    ('blank', '数学', '八年级', '请将下列函数与其图像特征配对：1.y=x² 2.y=2x+1 3.y=1/x  A.双曲线 B.抛物线 C.直线',
     '["1-B", "2-C", "3-A"]', '["1-B","2-C","3-A"]', 10, 'medium', '二次函数图像是抛物线，一次函数图像是直线，反比例函数图像是双曲线', admin_id),
    ('blank', '物理', '九年级', '请将下列物理量与其单位配对：1.电压 2.电流 3.电阻  A.欧姆 B.伏特 C.安培',
     '["1-B", "2-C", "3-A"]', '["1-B","2-C","3-A"]', 10, 'easy', '电压单位伏特，电流单位安培，电阻单位欧姆', admin_id),
    ('blank', '化学', '九年级', '请将下列物质与其化学式配对：1.水 2.二氧化碳 3.氧气  A.O₂ B.H₂O C.CO₂',
     '["1-B", "2-C", "3-A"]', '["1-B","2-C","3-A"]', 10, 'easy', '水H₂O，二氧化碳CO₂，氧气O₂', admin_id),
    ('blank', '生物', '八年级', '请将下列器官与其所属系统配对：1.心脏 2.肺 3.胃  A.消化系统 B.循环系统 C.呼吸系统',
     '["1-B", "2-C", "3-A"]', '["1-B","2-C","3-A"]', 10, 'easy', '心脏属于循环系统，肺属于呼吸系统，胃属于消化系统', admin_id),
    ('blank', '计算机', '七年级', '请将下列存储单位按从小到大排序：1KB、1MB、1GB、1B',
     '["1B", "1KB", "1MB", "1GB"]', '["1B","1KB","1MB","1GB"]', 10, 'easy', '存储单位从小到大：B < KB < MB < GB，1KB=1024B，1MB=1024KB，1GB=1024MB', admin_id);

  END IF;
END $$;

-- ========================================
-- 3. 为部分已完成的考试添加学生成绩
-- ========================================

-- 为数学九年级模拟考试添加学生成绩
DO $$
DECLARE
  exam_id_math INT;
  student_ids INT[];
  student_id INT;
  exam_record_id INT;
BEGIN
  SELECT id INTO exam_id_math FROM exams WHERE title = '2024春季数学九年级模拟考试' LIMIT 1;
  SELECT ARRAY_AGG(id) INTO student_ids FROM users WHERE role = 'student' LIMIT 5;

  IF exam_id_math IS NOT NULL AND student_ids IS NOT NULL THEN
    FOREACH student_id IN ARRAY student_ids LOOP
      -- 插入考试记录
      INSERT INTO student_exams (student_id, exam_id, status, start_time, submit_time, score)
      VALUES (student_id, exam_id_math, 'graded',
              NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '110 minutes',
              70 + (RANDOM() * 30)::INT)
      ON CONFLICT (student_id, exam_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ========================================
-- 4. 显示统计信息
-- ========================================

SELECT '新数据添加完成！' as message;

SELECT '考试统计：' as info;
SELECT subject, grade, COUNT(*) as count FROM exams GROUP BY subject, grade ORDER BY subject, grade;

SELECT '题库统计：' as info;
SELECT subject, type, COUNT(*) as count FROM question_bank GROUP BY subject, type ORDER BY subject, type;

SELECT '总题库数量：' as info;
SELECT subject, COUNT(*) as total FROM question_bank GROUP BY subject ORDER BY subject;
