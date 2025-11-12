-- =====================================================
-- 科目清理脚本
-- 目的：只保留数学和信息科技两个学科，删除其他所有科目数据
-- 执行日期：2025-10-31
-- =====================================================

-- 开始事务
BEGIN;

-- 显示清理前的统计信息
SELECT '=== 清理前统计 ===' as info;

SELECT 'Activities 科目分布:' as info;
SELECT subject, COUNT(*) as count FROM activities GROUP BY subject ORDER BY subject;

SELECT 'Question Bank 科目分布:' as info;
SELECT subject, COUNT(*) as count FROM question_bank GROUP BY subject ORDER BY subject;

-- =====================================================
-- 第一步：将"计算机"更新为"信息科技"
-- =====================================================

SELECT '=== 步骤1: 更新"计算机"为"信息科技" ===' as info;

-- 更新 activities 表
UPDATE activities
SET subject = '信息科技'
WHERE subject = '计算机';

-- 显示更新结果
SELECT 'Activities 表更新完成，影响行数:' as info,
       (SELECT COUNT(*) FROM activities WHERE subject = '信息科技') as count;

-- 更新 question_bank 表
UPDATE question_bank
SET subject = '信息科技'
WHERE subject = '计算机';

-- 显示更新结果
SELECT 'Question Bank 表更新完成，影响行数:' as info,
       (SELECT COUNT(*) FROM question_bank WHERE subject = '信息科技') as count;

-- =====================================================
-- 第二步：删除其他科目的活动数据
-- =====================================================

SELECT '=== 步骤2: 删除 activities 中的其他科目 ===' as info;

-- 显示即将删除的活动
SELECT '即将删除的 activities:' as info;
SELECT subject, COUNT(*) as count
FROM activities
WHERE subject NOT IN ('数学', '信息科技')
GROUP BY subject;

-- 删除其他科目的活动
-- 注意：由于外键约束 CASCADE，相关的 questions、student_activities、answers 等会自动删除
DELETE FROM activities
WHERE subject NOT IN ('数学', '信息科技');

-- 显示删除结果
SELECT 'Activities 删除完成，剩余记录数:' as info,
       COUNT(*) as remaining_count
FROM activities;

-- =====================================================
-- 第三步：删除其他科目的题库数据
-- =====================================================

SELECT '=== 步骤3: 删除 question_bank 中的其他科目 ===' as info;

-- 显示即将删除的题库
SELECT '即将删除的 question_bank:' as info;
SELECT subject, COUNT(*) as count
FROM question_bank
WHERE subject NOT IN ('数学', '信息科技')
GROUP BY subject;

-- 先删除引用这些题目的 answers（避免外键约束冲突）
SELECT '删除引用待删除题目的 answers:' as info;
DELETE FROM answers
WHERE question_id IN (
  SELECT id FROM question_bank
  WHERE subject NOT IN ('数学', '信息科技')
);

-- 删除其他科目的题库
DELETE FROM question_bank
WHERE subject NOT IN ('数学', '信息科技');

-- 显示删除结果
SELECT 'Question Bank 删除完成，剩余记录数:' as info,
       COUNT(*) as remaining_count
FROM question_bank;

-- =====================================================
-- 第四步：验证清理结果
-- =====================================================

SELECT '=== 清理后验证 ===' as info;

SELECT 'Activities 最终科目分布:' as info;
SELECT subject, COUNT(*) as count FROM activities GROUP BY subject ORDER BY subject;

SELECT 'Question Bank 最终科目分布:' as info;
SELECT subject, COUNT(*) as count FROM question_bank GROUP BY subject ORDER BY subject;

-- =====================================================
-- 第五步：清理相关的孤儿数据（如果有）
-- =====================================================

SELECT '=== 步骤5: 清理孤儿数据 ===' as info;

-- 检查是否有孤儿 questions（exam_id 不存在）
SELECT '孤儿 questions 数量:' as info,
       COUNT(*) as orphan_count
FROM questions q
LEFT JOIN activities a ON q.exam_id = a.id
WHERE a.id IS NULL;

-- 删除孤儿 questions
DELETE FROM questions
WHERE exam_id NOT IN (SELECT id FROM activities);

-- 检查是否有孤儿 student_activities
SELECT '孤儿 student_activities 数量:' as info,
       COUNT(*) as orphan_count
FROM student_activities sa
LEFT JOIN activities a ON sa.activity_id = a.id
WHERE a.id IS NULL;

-- 删除孤儿 student_activities
DELETE FROM student_activities
WHERE activity_id NOT IN (SELECT id FROM activities);

-- 检查是否有孤儿 answers（student_exam_id 不存在）
SELECT '孤儿 answers 数量:' as info,
       COUNT(*) as orphan_count
FROM answers ans
LEFT JOIN student_activities sa ON ans.student_exam_id = sa.id
WHERE sa.id IS NULL;

-- 删除孤儿 answers
DELETE FROM answers
WHERE student_exam_id NOT IN (SELECT id FROM student_activities);

-- =====================================================
-- 提交事务
-- =====================================================

SELECT '=== 清理完成，提交事务 ===' as info;
COMMIT;

SELECT '✅ 科目清理成功完成！系统现在只保留数学和信息科技两个学科。' as result;
