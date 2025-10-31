-- 清理旧学科数据脚本
-- 删除语文、英语、科学相关的考试和题目

-- 删除与这些考试相关的答题记录
DELETE FROM answers
WHERE student_exam_id IN (
  SELECT se.id FROM student_exams se
  JOIN exams e ON se.exam_id = e.id
  WHERE e.subject IN ('语文', '英语', '科学')
);

-- 删除这些考试的学生考试记录
DELETE FROM student_exams
WHERE exam_id IN (
  SELECT id FROM exams
  WHERE subject IN ('语文', '英语', '科学')
);

-- 删除这些考试的题目
DELETE FROM questions
WHERE exam_id IN (
  SELECT id FROM exams
  WHERE subject IN ('语文', '英语', '科学')
);

-- 删除题库中的相关题目
DELETE FROM question_bank
WHERE subject IN ('语文', '英语', '科学');

-- 删除考试
DELETE FROM exams
WHERE subject IN ('语文', '英语', '科学');

-- 显示清理结果
SELECT '清理完成！' as message;
SELECT '剩余考试统计：' as info;
SELECT subject, COUNT(*) as count FROM exams GROUP BY subject;

SELECT '剩余题库统计：' as info;
SELECT subject, COUNT(*) as count FROM question_bank GROUP BY subject;
