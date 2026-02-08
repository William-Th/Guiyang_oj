-- 测试数据：创建草稿状态的活动用于组卷测试
-- 创建日期: 2026-02-01
-- 说明: 为回归测试创建草稿状态的活动，支持筛选、编辑、移除等测试场景

-- 插入草稿状态活动
INSERT INTO activities (
    title,
    description,
    subject,
    grade,
    type,
    status,
    ability_level,
    scope,
    duration,
    total_score,
    pass_score,
    time_limit_type,
    created_by,
    paper_status
) VALUES
(
    '【测试】草稿活动-组卷测试',
    '用于组卷功能回归测试的草稿状态活动',
    '数学',
    '二年级',
    'practice',
    'draft',          -- 草稿状态
    'L4',
    'class',
    60,
    100,
    60,
    'timed',
    40,               -- teacher_yy_ps_01 的ID
    'empty'
)
ON CONFLICT DO NOTHING;

-- 获取刚插入的活动ID并显示
SELECT id, title, status, created_by FROM activities WHERE title LIKE '%【测试】草稿活动%' ORDER BY id DESC LIMIT 1;
