/**
 * 清理未使用的旧成就系统表
 *
 * 目的：
 * 1. 删除 achievement_rule_versions 表 - 成就规则版本管理表（未使用）
 * 2. 删除 points_shop_items 表 - 积分商城商品表（未使用）
 *
 * 原因：
 * - 这两个表在当前实现的成就系统中完全未被使用
 * - achievement_rule_versions: 新系统使用trigger_condition字段存储规则，不需要版本管理
 * - points_shop_items: 积分商城功能尚未实现，且未来实现时会重新设计
 *
 * 创建日期: 2025-11-14
 * 作者: Achievement System Cleanup
 */

-- 开始事务
BEGIN;

-- 1. 删除 achievement_rule_versions 表及其相关对象
DO $$
BEGIN
    -- 检查表是否存在
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public'
               AND table_name = 'achievement_rule_versions') THEN

        -- 删除序列
        DROP SEQUENCE IF EXISTS public.achievement_rule_versions_version_id_seq CASCADE;

        -- 删除表
        DROP TABLE IF EXISTS public.achievement_rule_versions CASCADE;

        RAISE NOTICE '✅ 已删除表: achievement_rule_versions';
    ELSE
        RAISE NOTICE '⚠️ 表不存在: achievement_rule_versions';
    END IF;
END$$;

-- 2. 删除 points_shop_items 表及其相关对象
DO $$
BEGIN
    -- 检查表是否存在
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public'
               AND table_name = 'points_shop_items') THEN

        -- 删除序列
        DROP SEQUENCE IF EXISTS public.points_shop_items_item_id_seq CASCADE;

        -- 删除表
        DROP TABLE IF EXISTS public.points_shop_items CASCADE;

        RAISE NOTICE '✅ 已删除表: points_shop_items';
    ELSE
        RAISE NOTICE '⚠️ 表不存在: points_shop_items';
    END IF;
END$$;

-- 提交事务
COMMIT;

-- 验证清理结果
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '=== 清理验证 ===';

    -- 检查是否还存在这些表
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('achievement_rule_versions', 'points_shop_items');

    IF v_count = 0 THEN
        RAISE NOTICE '✅ 清理成功！所有未使用的表已删除';
    ELSE
        RAISE WARNING '❌ 清理失败！仍有 % 个表未删除', v_count;
    END IF;

    -- 列出保留的成就系统相关表
    RAISE NOTICE '=== 保留的成就系统表 ===';
    FOR v_count IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND (tablename LIKE '%achievement%' OR tablename LIKE '%point%')
        ORDER BY tablename
    ) LOOP
        RAISE NOTICE '  - %', v_count;
    END LOOP;
END$$;
