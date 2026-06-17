-- Migration 052: 积分消费虚拟商店（E2）
-- Date: 2026-06-17
-- Description: 虚拟商品（皮肤/头像框/名字颜色，可扩展）+ 学生购买记录。
--   名字颜色仅自己端可见，不影响他人查看。

BEGIN;

CREATE TABLE IF NOT EXISTS public.virtual_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL UNIQUE,        -- 商品编码
    name VARCHAR(100) NOT NULL,                   -- 商品名称
    category VARCHAR(30) NOT NULL,                -- skin/avatar_frame/name_color
    price INTEGER NOT NULL,                       -- 积分价格
    config JSONB DEFAULT '{}'::jsonb,             -- 商品配置（颜色值/资源URL等）
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vi_category_check CHECK (category::text = ANY (ARRAY['skin','avatar_frame','name_color','other']::text[]))
);

CREATE TABLE IF NOT EXISTS public.student_purchases (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES virtual_items(id),
    points_cost INTEGER NOT NULL,                 -- 实际消耗积分
    transaction_id INTEGER,                       -- 关联 points_transactions
    is_equipped BOOLEAN DEFAULT false,            -- 是否装备中
    purchased_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sp_student_item_unique UNIQUE (student_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_student ON public.student_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_sp_equipped ON public.student_purchases(student_id, is_equipped);

COMMENT ON TABLE public.virtual_items IS '积分消费虚拟商品（E2）';
COMMENT ON TABLE public.student_purchases IS '学生购买记录（E2），同商品只买一次，可装备/切换';

-- 默认商品（名字颜色 3 类示例）
INSERT INTO public.virtual_items (item_code, name, category, price, config) VALUES
  ('name_color_blue', '蓝色昵称', 'name_color', 50, '{"color":"#1677ff"}'),
  ('name_color_gold', '金色昵称', 'name_color', 200, '{"color":"#faad14"}'),
  ('name_color_purple', '紫色昵称', 'name_color', 300, '{"color":"#722ed1"}')
ON CONFLICT (item_code) DO NOTHING;

COMMIT;
