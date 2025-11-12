-- ===================================================================
-- Migration: 创建科目配置表
-- Date: 2025-11-05
-- Description:
--   将科目配置从前端配置文件迁移到数据库
--   为每个科目分配编号（数学01，信息科技02）
--   支持动态配置年级范围和能力等级
-- ===================================================================

BEGIN;

-- 创建科目配置表
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  subject_code VARCHAR(10) NOT NULL UNIQUE,  -- 科目编号：01, 02, 03...
  subject_name VARCHAR(50) NOT NULL UNIQUE,  -- 科目名称：数学, 信息科技
  description TEXT,                          -- 科目描述
  grade_range JSONB NOT NULL,               -- 支持的年级列表
  ability_levels JSONB NOT NULL,            -- 能力等级配置
  is_active BOOLEAN DEFAULT true,           -- 是否启用
  display_order INTEGER DEFAULT 0,          -- 显示顺序
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_subjects_code ON subjects(subject_code);
CREATE INDEX idx_subjects_name ON subjects(subject_name);
CREATE INDEX idx_subjects_active ON subjects(is_active);
CREATE INDEX idx_subjects_order ON subjects(display_order);

-- 添加更新时间触发器
CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON subjects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 插入初始数据：数学（一年级-九年级）
INSERT INTO subjects (
  subject_code,
  subject_name,
  description,
  grade_range,
  ability_levels,
  is_active,
  display_order
) VALUES (
  '01',
  '数学',
  '数学科目，涵盖一年级到九年级',
  '[
    {"value": "一年级", "label": "一年级"},
    {"value": "二年级", "label": "二年级"},
    {"value": "三年级", "label": "三年级"},
    {"value": "四年级", "label": "四年级"},
    {"value": "五年级", "label": "五年级"},
    {"value": "六年级", "label": "六年级"},
    {"value": "七年级", "label": "七年级"},
    {"value": "八年级", "label": "八年级"},
    {"value": "九年级", "label": "九年级"}
  ]'::jsonb,
  '[
    {"value": "L1", "label": "L1 - 基础运算"},
    {"value": "L2", "label": "L2 - 基础理解"},
    {"value": "L3", "label": "L3 - 综合运用"},
    {"value": "L4", "label": "L4 - 问题解决"},
    {"value": "L5", "label": "L5 - 逻辑推理"},
    {"value": "L6", "label": "L6 - 创新应用"},
    {"value": "L7", "label": "L7 - 拓展探究"}
  ]'::jsonb,
  true,
  1
);

-- 插入初始数据：信息科技（三年级-九年级）
INSERT INTO subjects (
  subject_code,
  subject_name,
  description,
  grade_range,
  ability_levels,
  is_active,
  display_order
) VALUES (
  '02',
  '信息科技',
  '信息科技科目，涵盖三年级到九年级',
  '[
    {"value": "三年级", "label": "三年级"},
    {"value": "四年级", "label": "四年级"},
    {"value": "五年级", "label": "五年级"},
    {"value": "六年级", "label": "六年级"},
    {"value": "七年级", "label": "七年级"},
    {"value": "八年级", "label": "八年级"},
    {"value": "九年级", "label": "九年级"}
  ]'::jsonb,
  '[
    {"value": "L1", "label": "L1 - 基础认知"},
    {"value": "L2", "label": "L2 - 基本操作"},
    {"value": "L3", "label": "L3 - 编程入门"},
    {"value": "L4", "label": "L4 - 算法理解"},
    {"value": "L5", "label": "L5 - 程序设计"},
    {"value": "L6", "label": "L6 - 项目开发"},
    {"value": "L7", "label": "L7 - 创新实践"}
  ]'::jsonb,
  true,
  2
);

-- 验证数据插入成功
DO $$
DECLARE
  subject_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO subject_count FROM subjects;

  IF subject_count >= 2 THEN
    RAISE NOTICE 'SUCCESS: % subjects inserted successfully', subject_count;
  ELSE
    RAISE EXCEPTION 'FAILED: Expected at least 2 subjects, found %', subject_count;
  END IF;
END $$;

COMMIT;
