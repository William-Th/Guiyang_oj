-- 修复活动总分触发器
-- 问题：触发器会在添加/修改题目时覆盖用户设置的总分
-- 解决：只更新question_count，保留用户设置的total_score作为目标总分

-- 删除旧触发器
DROP TRIGGER IF EXISTS trigger_update_activity_stats_on_insert ON activity_questions;
DROP TRIGGER IF EXISTS trigger_update_activity_stats_on_update ON activity_questions;
DROP TRIGGER IF EXISTS trigger_update_activity_stats_on_delete ON activity_questions;

-- 更新触发器函数：只更新题目数量，不更新总分
CREATE OR REPLACE FUNCTION update_activity_paper_stats() RETURNS TRIGGER AS $$
BEGIN
   -- 只更新题目数量，不更新总分（保留用户设置的目标总分）
   UPDATE activities
   SET
     question_count = (
       SELECT COUNT(*)
       FROM activity_questions
       WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
     ),
     paper_status = CASE
       WHEN (SELECT COUNT(*) FROM activity_questions WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)) = 0 THEN 'empty'
       ELSE 'completed'
     END,
     updated_at = CURRENT_TIMESTAMP
   WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);

   RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 重新创建触发器
CREATE TRIGGER trigger_update_activity_stats_on_insert
AFTER INSERT ON activity_questions
FOR EACH ROW
EXECUTE FUNCTION update_activity_paper_stats();

CREATE TRIGGER trigger_update_activity_stats_on_update
AFTER UPDATE OF score ON activity_questions
FOR EACH ROW
EXECUTE FUNCTION update_activity_paper_stats();

CREATE TRIGGER trigger_update_activity_stats_on_delete
AFTER DELETE ON activity_questions
FOR EACH ROW
EXECUTE FUNCTION update_activity_paper_stats();

-- 更新说明：
-- total_score: 用户设置的目标总分（不会自动改变）
-- 题目实际分数和需要通过前端计算：SELECT SUM(score) FROM activity_questions WHERE activity_id = ?
