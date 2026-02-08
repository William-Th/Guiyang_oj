-- 添加结果发布时间字段到activities表
-- 创建日期: 2026-02-01
-- 说明: 为测评类型活动添加结果发布时间控制功能

-- 添加result_publish_time字段
ALTER TABLE activities
ADD COLUMN result_publish_time TIMESTAMP WITHOUT TIME ZONE;

-- 添加注释
COMMENT ON COLUMN activities.result_publish_time IS '结果发布时间 - 仅用于测评类型活动，在此时间之后学生才能查看答案和详细结果';

-- 更新现有测评活动（设置默认为立即发布）
UPDATE activities
SET result_publish_time = CURRENT_TIMESTAMP
WHERE type = 'assessment' AND result_publish_time IS NULL;

-- 练习活动默认为立即发布（设置为NULL表示立即显示）
-- 已存在且类型为practice的不需要修改，NULL表示立即显示

-- 验证修改
SELECT
    id,
    title,
    type,
    result_publish_time,
    CASE
        WHEN type = 'practice' THEN '立即显示'
        WHEN result_publish_time IS NULL THEN '立即显示'
        WHEN result_publish_time > CURRENT_TIMESTAMP THEN '未到发布时间'
        ELSE '已发布'
    END as result_status
FROM activities
ORDER BY id DESC
LIMIT 10;
