-- ===================================================================
-- 编程题测试数据脚本
-- 创建日期: 2025-12-08
-- ===================================================================
-- 说明:
-- 1. 本文件包含编程题（type='code'）的测试数据
-- 2. 包含:
--    - 编程题目草稿（question_drafts）
--    - 测试用例（test_cases）
-- 3. 适用年级: 主要针对4-9年级的信息科技编程入门
-- 4. 语言: 当前仅支持 C++
-- 5. 数据库结构说明:
--    - question_drafts: 存储题目内容（包括编程题的代码模板、时间限制等）
--    - question_bank: 存储发布记录（通过 draft_id 关联到 question_drafts）
--    - test_cases: 存储测试用例（通过 question_id 关联到 question_drafts.id）
-- ===================================================================

BEGIN;

-- ===================================================================
-- 第一部分: 编程题目草稿
-- ===================================================================

-- 题目1: Hello World (入门级)
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score,
    created_by, abilities, knowledge_points,
    code_template, time_limit, memory_limit, judge_mode, supported_languages
) VALUES (
    'code',
    '信息科技',
    '四年级',
    E'# Hello World\n\n## 题目描述\n\n编写一个程序，输出 `Hello, World!`（注意大小写和标点符号）。\n\n## 输入格式\n\n无输入。\n\n## 输出格式\n\n输出一行 `Hello, World!`\n\n## 样例\n\n### 样例输入\n```\n（无）\n```\n\n### 样例输出\n```\nHello, World!\n```',
    NULL,
    NULL,
    'easy',
    'L1',
    10,
    1,  -- admin
    '{基础输出}',
    '{C++基础,输出语句}',
    E'#include <iostream>\nusing namespace std;\n\nint main() {\n    // 在这里编写你的代码\n    \n    return 0;\n}',
    1000,
    256,
    'standard',
    '{cpp}'
);

-- 题目2: A+B Problem (入门级)
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score,
    created_by, abilities, knowledge_points,
    code_template, time_limit, memory_limit, judge_mode, supported_languages
) VALUES (
    'code',
    '信息科技',
    '四年级',
    E'# A+B Problem\n\n## 题目描述\n\n输入两个整数 a 和 b，输出它们的和。\n\n## 输入格式\n\n一行，两个整数 a 和 b，用空格分隔。\n\n## 输出格式\n\n一个整数，表示 a+b 的结果。\n\n## 数据范围\n\n- -1000 ≤ a, b ≤ 1000\n\n## 样例\n\n### 样例输入\n```\n1 2\n```\n\n### 样例输出\n```\n3\n```',
    NULL,
    NULL,
    'easy',
    'L1',
    20,
    1,
    '{基础运算,输入输出}',
    '{C++基础,变量,输入输出}',
    E'#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    // 读取输入\n    cin >> a >> b;\n    \n    // 在这里计算并输出结果\n    \n    return 0;\n}',
    1000,
    256,
    'standard',
    '{cpp}'
);

-- 题目3: 求最大值 (基础级)
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score,
    created_by, abilities, knowledge_points,
    code_template, time_limit, memory_limit, judge_mode, supported_languages
) VALUES (
    'code',
    '信息科技',
    '五年级',
    E'# 求最大值\n\n## 题目描述\n\n输入三个整数，输出其中的最大值。\n\n## 输入格式\n\n一行，三个整数 a, b, c，用空格分隔。\n\n## 输出格式\n\n一个整数，表示三个数中的最大值。\n\n## 数据范围\n\n- -10000 ≤ a, b, c ≤ 10000\n\n## 样例\n\n### 样例输入\n```\n1 5 3\n```\n\n### 样例输出\n```\n5\n```\n\n### 样例输入 2\n```\n-1 -5 -3\n```\n\n### 样例输出 2\n```\n-1\n```',
    NULL,
    NULL,
    'easy',
    'L2',
    20,
    1,
    '{逻辑判断,比较运算}',
    '{条件语句,比较运算符}',
    E'#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    \n    // 找出最大值并输出\n    \n    return 0;\n}',
    1000,
    256,
    'standard',
    '{cpp}'
);

-- 题目4: 数列求和 (基础级)
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score,
    created_by, abilities, knowledge_points,
    code_template, time_limit, memory_limit, judge_mode, supported_languages
) VALUES (
    'code',
    '信息科技',
    '五年级',
    E'# 数列求和\n\n## 题目描述\n\n输入一个正整数 n，计算 1+2+3+...+n 的和。\n\n## 输入格式\n\n一个正整数 n。\n\n## 输出格式\n\n一个整数，表示 1 到 n 的和。\n\n## 数据范围\n\n- 1 ≤ n ≤ 10000\n\n## 样例\n\n### 样例输入\n```\n5\n```\n\n### 样例输出\n```\n15\n```\n\n## 提示\n\n1+2+3+4+5 = 15',
    NULL,
    NULL,
    'easy',
    'L2',
    30,
    1,
    '{循环结构,累加求和}',
    '{for循环,累加器}',
    E'#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    \n    // 计算1到n的和\n    int sum = 0;\n    \n    // 在这里使用循环累加\n    \n    cout << sum << endl;\n    return 0;\n}',
    1000,
    256,
    'standard',
    '{cpp}'
);

-- 题目5: 判断素数 (中等级)
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score,
    created_by, abilities, knowledge_points,
    code_template, time_limit, memory_limit, judge_mode, supported_languages
) VALUES (
    'code',
    '信息科技',
    '六年级',
    E'# 判断素数\n\n## 题目描述\n\n输入一个正整数 n，判断它是否为素数。\n\n素数是指只能被 1 和它本身整除的大于 1 的正整数。\n\n## 输入格式\n\n一个正整数 n。\n\n## 输出格式\n\n如果 n 是素数，输出 `Yes`；否则输出 `No`。\n\n## 数据范围\n\n- 2 ≤ n ≤ 1000000\n\n## 样例\n\n### 样例输入 1\n```\n7\n```\n\n### 样例输出 1\n```\nYes\n```\n\n### 样例输入 2\n```\n8\n```\n\n### 样例输出 2\n```\nNo\n```',
    NULL,
    NULL,
    'medium',
    'L3',
    30,
    1,
    '{循环结构,条件判断,数学思维}',
    '{素数,循环,条件语句}',
    E'#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    \n    // 判断n是否为素数\n    bool isPrime = true;\n    \n    // 在这里编写判断逻辑\n    \n    if (isPrime) {\n        cout << "Yes" << endl;\n    } else {\n        cout << "No" << endl;\n    }\n    \n    return 0;\n}',
    1000,
    256,
    'standard',
    '{cpp}'
);

-- 题目6: 斐波那契数列 (中等级)
INSERT INTO question_drafts (
    type, subject, grade, content, options, correct_answer,
    difficulty, level, suggested_score,
    created_by, abilities, knowledge_points,
    code_template, time_limit, memory_limit, judge_mode, supported_languages
) VALUES (
    'code',
    '信息科技',
    '七年级',
    E'# 斐波那契数列\n\n## 题目描述\n\n斐波那契数列是这样一个数列：1, 1, 2, 3, 5, 8, 13, 21, ...\n\n其中第 1 项和第 2 项都是 1，从第 3 项开始，每一项都等于前两项之和。\n\n输入一个正整数 n，输出斐波那契数列的第 n 项。\n\n## 输入格式\n\n一个正整数 n。\n\n## 输出格式\n\n一个整数，表示斐波那契数列的第 n 项。\n\n## 数据范围\n\n- 1 ≤ n ≤ 40\n\n## 样例\n\n### 样例输入\n```\n7\n```\n\n### 样例输出\n```\n13\n```\n\n## 提示\n\n数列前 7 项为：1, 1, 2, 3, 5, 8, 13',
    NULL,
    NULL,
    'medium',
    'L4',
    40,
    1,
    '{递推,循环结构}',
    '{斐波那契数列,递推,数组}',
    E'#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    \n    // 计算第n项斐波那契数\n    \n    return 0;\n}',
    1000,
    256,
    'standard',
    '{cpp}'
);

COMMIT;


-- ===================================================================
-- 第二部分: 测试用例
-- 需要在题目插入后执行，因为依赖 question_drafts 的 id
-- test_cases.question_id 关联到 question_drafts.id
-- ===================================================================

BEGIN;

-- 获取刚插入的编程题ID并插入测试用例
-- 使用content特征来定位题目

-- Hello World 测试用例
INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 1, '', E'Hello, World!\n', 10, 1000, 256, true, '标准输出测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%Hello World%' AND content LIKE '%Hello, World!%';

-- A+B Problem 测试用例
INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 1, E'1 2\n', E'3\n', 4, 1000, 256, true, '样例测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%A+B Problem%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 2, E'0 0\n', E'0\n', 4, 1000, 256, false, '零值测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%A+B Problem%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 3, E'-5 10\n', E'5\n', 4, 1000, 256, false, '负数测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%A+B Problem%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 4, E'1000 -1000\n', E'0\n', 4, 1000, 256, false, '边界测试1'
FROM question_drafts WHERE type = 'code' AND content LIKE '%A+B Problem%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 5, E'-1000 -1000\n', E'-2000\n', 4, 1000, 256, false, '边界测试2'
FROM question_drafts WHERE type = 'code' AND content LIKE '%A+B Problem%';

-- 求最大值 测试用例
INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 1, E'1 5 3\n', E'5\n', 4, 1000, 256, true, '样例测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%求最大值%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 2, E'-1 -5 -3\n', E'-1\n', 4, 1000, 256, true, '负数测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%求最大值%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 3, E'5 5 5\n', E'5\n', 4, 1000, 256, false, '相等测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%求最大值%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 4, E'10000 -10000 0\n', E'10000\n', 4, 1000, 256, false, '边界测试1'
FROM question_drafts WHERE type = 'code' AND content LIKE '%求最大值%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 5, E'0 0 1\n', E'1\n', 4, 1000, 256, false, '零值测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%求最大值%';

-- 数列求和 测试用例
INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 1, E'5\n', E'15\n', 5, 1000, 256, true, '样例测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%数列求和%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 2, E'1\n', E'1\n', 5, 1000, 256, false, '最小值测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%数列求和%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 3, E'10\n', E'55\n', 5, 1000, 256, false, '基础测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%数列求和%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 4, E'100\n', E'5050\n', 5, 1000, 256, false, '中等数据'
FROM question_drafts WHERE type = 'code' AND content LIKE '%数列求和%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 5, E'10000\n', E'50005000\n', 5, 1000, 256, false, '大数据测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%数列求和%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 6, E'1000\n', E'500500\n', 5, 1000, 256, false, '边界测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%数列求和%';

-- 判断素数 测试用例
INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 1, E'7\n', E'Yes\n', 4, 1000, 256, true, '样例测试-素数'
FROM question_drafts WHERE type = 'code' AND content LIKE '%判断素数%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 2, E'8\n', E'No\n', 4, 1000, 256, true, '样例测试-非素数'
FROM question_drafts WHERE type = 'code' AND content LIKE '%判断素数%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 3, E'2\n', E'Yes\n', 4, 1000, 256, false, '最小素数'
FROM question_drafts WHERE type = 'code' AND content LIKE '%判断素数%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 4, E'1000000\n', E'No\n', 4, 1000, 256, false, '大数非素数'
FROM question_drafts WHERE type = 'code' AND content LIKE '%判断素数%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 5, E'999983\n', E'Yes\n', 5, 1000, 256, false, '大素数测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%判断素数%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 6, E'4\n', E'No\n', 4, 1000, 256, false, '小偶数'
FROM question_drafts WHERE type = 'code' AND content LIKE '%判断素数%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 7, E'97\n', E'Yes\n', 5, 1000, 256, false, '两位素数'
FROM question_drafts WHERE type = 'code' AND content LIKE '%判断素数%';

-- 斐波那契数列 测试用例
INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 1, E'7\n', E'13\n', 5, 1000, 256, true, '样例测试'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 2, E'1\n', E'1\n', 5, 1000, 256, false, '第1项'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 3, E'2\n', E'1\n', 5, 1000, 256, false, '第2项'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 4, E'10\n', E'55\n', 5, 1000, 256, false, '第10项'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 5, E'20\n', E'6765\n', 5, 1000, 256, false, '第20项'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 6, E'30\n', E'832040\n', 5, 1000, 256, false, '第30项'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 7, E'40\n', E'102334155\n', 5, 1000, 256, false, '第40项-边界'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

INSERT INTO test_cases (question_id, case_number, input_data, expected_output, score, time_limit, memory_limit, is_sample, description)
SELECT id, 8, E'15\n', E'610\n', 5, 1000, 256, false, '第15项'
FROM question_drafts WHERE type = 'code' AND content LIKE '%斐波那契数列%';

COMMIT;

-- ===================================================================
-- 输出统计信息
-- ===================================================================
DO $$
DECLARE
    code_count INTEGER;
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO code_count FROM question_drafts WHERE type = 'code';
    SELECT COUNT(*) INTO test_count FROM test_cases;

    RAISE NOTICE '===================================================';
    RAISE NOTICE '编程题测试数据导入完成';
    RAISE NOTICE '===================================================';
    RAISE NOTICE '编程题草稿数量: %', code_count;
    RAISE NOTICE '测试用例数量: %', test_count;
    RAISE NOTICE '===================================================';
END $$;
