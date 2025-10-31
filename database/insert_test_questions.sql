-- Insert test questions for missing subjects: 英语, 科学
-- Created for paper generation testing
-- Date: 2025-10-30

-- 英语题目 (English) - 三年级到六年级
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
-- 三年级英语
('single_choice', '英语', '三年级', 'What color is the sky?', '["Blue", "Red", "Green", "Yellow"]', '"Blue"', 5, 'easy', 'approved', 9, 'L1', 5, '{词汇认知,基础表达}', '{颜色词汇,日常英语}', '{练习,测评}'),
('single_choice', '英语', '三年级', 'How do you say "苹果" in English?', '["Apple", "Orange", "Banana", "Grape"]', '"Apple"', 5, 'easy', 'approved', 9, 'L1', 5, '{词汇记忆,中英互译}', '{水果词汇,基础单词}', '{练习,测评}'),
('true_false', '英语', '三年级', 'Is "cat" an animal?', 'null', 'true', 5, 'easy', 'approved', 9, 'L1', 5, '{词汇理解,分类能力}', '{动物词汇,基础认知}', '{练习,测评}'),
('fill_blank', '英语', '三年级', 'Fill in the blank: I have a ( ) pen. (red/blue)', 'null', '"red"', 5, 'easy', 'approved', 9, 'L1', 5, '{形容词使用,句子结构}', '{颜色形容词,简单句}', '{练习,测评}'),
('single_choice', '英语', '三年级', 'Which one is a number?', '["Cat", "Five", "Red", "Happy"]', '"Five"', 5, 'easy', 'approved', 9, 'L1', 5, '{数字词汇,词汇分类}', '{基础数字,词汇认知}', '{练习,测评}'),

-- 四年级英语
('single_choice', '英语', '四年级', 'What is the opposite of "big"?', '["Small", "Large", "Huge", "Tall"]', '"Small"', 5, 'easy', 'approved', 9, 'L2', 5, '{反义词,词汇拓展}', '{形容词反义词,词汇对比}', '{练习,测评}'),
('multiple_choice', '英语', '四年级', 'Which of these are fruits? (Multiple choices)', '["Apple", "Carrot", "Banana", "Potato"]', '["Apple", "Banana"]', 10, 'medium', 'approved', 9, 'L2', 10, '{词汇分类,认知能力}', '{食物分类,水果蔬菜}', '{练习,测评}'),
('fill_blank', '英语', '四年级', 'Fill in the blank: She ( ) to school every day. (go/goes)', 'null', '"goes"', 5, 'medium', 'approved', 9, 'L2', 5, '{动词变化,时态运用}', '{第三人称单数,一般现在时}', '{练习,测评}'),
('short_answer', '英语', '四年级', 'Translate to English: 我喜欢游泳。', 'null', '"I like swimming."', 10, 'medium', 'approved', 9, 'L2', 10, '{翻译能力,句子表达}', '{中译英,兴趣爱好表达}', '{练习,测评}'),
('single_choice', '英语', '四年级', 'What day comes after Monday?', '["Sunday", "Tuesday", "Wednesday", "Thursday"]', '"Tuesday"', 5, 'easy', 'approved', 9, 'L2', 5, '{时间概念,星期词汇}', '{星期表达,日常英语}', '{练习,测评}'),

-- 五年级英语
('single_choice', '英语', '五年级', 'Which sentence is correct?', '["He go to school.", "He goes to school.", "He going to school.", "He is go to school."]', '"He goes to school."', 5, 'medium', 'approved', 9, 'L3', 5, '{语法判断,句子正误}', '{时态语法,主谓一致}', '{练习,测评}'),
('multiple_choice', '英语', '五年级', 'Which words are verbs? (Multiple choices)', '["Run", "Happy", "Jump", "Beautiful"]', '["Run", "Jump"]', 10, 'medium', 'approved', 9, 'L3', 10, '{词性辨析,动词识别}', '{动词,词性分类}', '{练习,测评}'),
('fill_blank', '英语', '五年级', 'Complete the sentence: If it ( ) tomorrow, we will stay at home. (rain/rains)', 'null', '"rains"', 5, 'medium', 'approved', 9, 'L3', 5, '{条件句,时态运用}', '{if条件句,一般现在时}', '{练习,测评}'),
('short_answer', '英语', '五年级', 'Write 3 sentences about your family in English.', 'null', '"I have a happy family. My father is a teacher. My mother is a doctor."', 15, 'hard', 'approved', 9, 'L3', 15, '{写作能力,家庭介绍}', '{英语写作,家庭成员}', '{练习,测评}'),
('true_false', '英语', '五年级', 'The sentence "I am liking apples" is grammatically correct.', 'null', 'false', 5, 'medium', 'approved', 9, 'L3', 5, '{语法知识,时态判断}', '{现在进行时,状态动词}', '{练习,测评}'),

-- 六年级英语
('single_choice', '英语', '六年级', 'What is the past tense of "go"?', '["Go", "Goes", "Went", "Gone"]', '"Went"', 5, 'medium', 'approved', 9, 'L4', 5, '{时态变化,不规则动词}', '{一般过去时,动词变形}', '{练习,测评}'),
('multiple_choice', '英语', '六年级', 'Which of these are prepositions? (Multiple choices)', '["In", "Beautiful", "On", "Happy"]', '["In", "On"]', 10, 'hard', 'approved', 9, 'L4', 10, '{词性辨析,介词识别}', '{介词,语法知识}', '{练习,测评}'),
('fill_blank', '英语', '六年级', 'Complete: I have ( ) this book for two weeks. (read/been reading)', 'null', '"been reading"', 5, 'hard', 'approved', 9, 'L4', 5, '{完成时态,时间状语}', '{现在完成进行时,时态运用}', '{练习,测评}'),
('short_answer', '英语', '六年级', 'Write a short paragraph about your dream job (at least 50 words).', 'null', '"My dream job is to become a scientist. I want to discover new things and help solve problems in the world. I will study hard and learn more about science to achieve my dream."', 20, 'hard', 'approved', 9, 'L4', 20, '{写作能力,职业表达}', '{英语写作,理想职业}', '{练习,测评}'),
('single_choice', '英语', '六年级', 'Which word is an adverb?', '["Quick", "Quickly", "Quickness", "Quicken"]', '"Quickly"', 5, 'hard', 'approved', 9, 'L4', 5, '{词性辨析,副词识别}', '{副词,词性转换}', '{练习,测评}');

-- 科学题目 (Science) - 三年级到六年级
INSERT INTO question_bank (type, subject, grade, content, options, correct_answer, score, difficulty, status, created_by, level, suggested_score, abilities, knowledge_points, scope) VALUES
-- 三年级科学
('single_choice', '科学', '三年级', '植物生长需要哪些基本条件？', '["阳光、水、空气", "只要阳光", "只要水", "只要土壤"]', '"阳光、水、空气"', 5, 'easy', 'approved', 9, 'L1', 5, '{生物常识,观察能力}', '{植物生长,生命科学}', '{练习,测评}'),
('true_false', '科学', '三年级', '太阳从东方升起，从西方落下。', 'null', 'true', 5, 'easy', 'approved', 9, 'L1', 5, '{天文常识,观察能力}', '{太阳运动,天文现象}', '{练习,测评}'),
('single_choice', '科学', '三年级', '下列哪种动物是哺乳动物？', '["鱼", "鸟", "狗", "蛇"]', '"狗"', 5, 'easy', 'approved', 9, 'L1', 5, '{动物分类,生物常识}', '{哺乳动物,动物特征}', '{练习,测评}'),
('fill_blank', '科学', '三年级', '水有三种状态：固态（冰）、液态（水）和（）态（水蒸气）。', 'null', '"气"', 5, 'easy', 'approved', 9, 'L1', 5, '{物质状态,物理常识}', '{水的三态,物态变化}', '{练习,测评}'),
('single_choice', '科学', '三年级', '一天有多少小时？', '["12小时", "24小时", "48小时", "60小时"]', '"24小时"', 5, 'easy', 'approved', 9, 'L1', 5, '{时间概念,基础常识}', '{时间单位,日常知识}', '{练习,测评}'),

-- 四年级科学
('single_choice', '科学', '四年级', '电池的两极分别是什么？', '["正极和负极", "左极和右极", "上极和下极", "前极和后极"]', '"正极和负极"', 5, 'medium', 'approved', 9, 'L2', 5, '{电学常识,基础物理}', '{电池结构,电路知识}', '{练习,测评}'),
('multiple_choice', '科学', '四年级', '下列哪些是可再生能源？（多选）', '["太阳能", "石油", "风能", "煤炭"]', '["太阳能", "风能"]', 10, 'medium', 'approved', 9, 'L2', 10, '{能源分类,环保意识}', '{可再生能源,能源种类}', '{练习,测评}'),
('true_false', '科学', '四年级', '地球是太阳系中唯一有生命的星球。', 'null', 'false', 5, 'medium', 'approved', 9, 'L2', 5, '{天文知识,科学思维}', '{太阳系,生命科学}', '{练习,测评}'),
('short_answer', '科学', '四年级', '请简述水循环的过程。', 'null', '"水从海洋、湖泊蒸发成水蒸气，上升到空中形成云，云中的水滴聚集后形成雨水落下，流入河流最终回到海洋。"', 15, 'medium', 'approved', 9, 'L2', 15, '{理解能力,自然现象}', '{水循环,自然科学}', '{练习,测评}'),
('fill_blank', '科学', '四年级', '月球是地球的（）。', 'null', '"卫星"', 5, 'easy', 'approved', 9, 'L2', 5, '{天文知识,基础常识}', '{天体关系,太阳系}', '{练习,测评}'),

-- 五年级科学
('single_choice', '科学', '五年级', '人体最大的器官是什么？', '["心脏", "肝脏", "皮肤", "大脑"]', '"皮肤"', 5, 'medium', 'approved', 9, 'L3', 5, '{人体结构,生物常识}', '{人体器官,生命科学}', '{练习,测评}'),
('multiple_choice', '科学', '五年级', '下列哪些属于光的特性？（多选）', '["直线传播", "反射", "折射", "重力"]', '["直线传播", "反射", "折射"]', 10, 'hard', 'approved', 9, 'L3', 10, '{光学知识,物理现象}', '{光的性质,物理学}', '{练习,测评}'),
('fill_blank', '科学', '五年级', '声音在空气中的传播速度约为每秒（）米。', 'null', '"340"', 5, 'hard', 'approved', 9, 'L3', 5, '{声学知识,物理常识}', '{声音传播,声速}', '{练习,测评}'),
('short_answer', '科学', '五年级', '请解释为什么冬天呼出的气会变成白雾？', 'null', '"冬天气温低，呼出的热空气中含有水蒸气，遇到冷空气后迅速冷却凝结成小水滴，形成白雾。"', 15, 'hard', 'approved', 9, 'L3', 15, '{物理现象,科学解释}', '{物态变化,凝结现象}', '{练习,测评}'),
('true_false', '科学', '五年级', '声音可以在真空中传播。', 'null', 'false', 5, 'medium', 'approved', 9, 'L3', 5, '{声学知识,物理概念}', '{声音传播,介质}', '{练习,测评}'),

-- 六年级科学
('single_choice', '科学', '六年级', '下列哪种力不是基本力？', '["重力", "电磁力", "摩擦力", "强相互作用力"]', '"摩擦力"', 5, 'hard', 'approved', 9, 'L4', 5, '{力学知识,物理概念}', '{基本力,物理学基础}', '{练习,测评}'),
('multiple_choice', '科学', '六年级', '下列哪些是生态系统的组成部分？（多选）', '["生产者", "消费者", "分解者", "破坏者"]', '["生产者", "消费者", "分解者"]', 10, 'hard', 'approved', 9, 'L4', 10, '{生态学,环境科学}', '{生态系统,生物链}', '{练习,测评}'),
('fill_blank', '科学', '六年级', '地球的自转周期约为（）小时。', 'null', '"24"', 5, 'hard', 'approved', 9, 'L4', 5, '{天文知识,地球运动}', '{地球自转,时间概念}', '{练习,测评}'),
('short_answer', '科学', '六年级', '请解释温室效应产生的原因及影响。', 'null', '"温室效应是由于大气中二氧化碳等温室气体增多，吸收地面辐射的热量，导致地球气温上升。影响包括冰川融化、海平面上升、极端天气增多等。"', 20, 'hard', 'approved', 9, 'L4', 20, '{环境科学,科学思维}', '{温室效应,全球变暖}', '{练习,测评}'),
('single_choice', '科学', '六年级', 'DNA的中文名称是什么？', '["脱氧核糖核酸", "核糖核酸", "蛋白质", "氨基酸"]', '"脱氧核糖核酸"', 5, 'hard', 'approved', 9, 'L4', 5, '{生物学知识,遗传学}', '{DNA,遗传物质}', '{练习,测评}');
