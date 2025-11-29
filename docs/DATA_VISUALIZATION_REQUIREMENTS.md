# 数据展示功能需求文档

## 1. 概述

本文档定义贵阳市小学生测评平台的数据展示功能需求，包括学生端个人能力分析和教师端多层级数据统计。

### 1.1 目标用户
- **学生端**: 查看个人学习表现、能力发展、知识点掌握情况
- **教师端**: 查看学校/区域/市级的整体数据分析和对比

### 1.2 数据源现状

根据数据库调研，现有数据结构：

**题目数据** (`question_drafts`):
- `abilities` (text[]): 考察能力标签数组
- `knowledge_points` (text[]): 知识点标签数组
- `level`: 能力等级 (L1-L9)
- `difficulty`: 难度 (easy/medium/hard)

**作答数据** (`answers`):
- `is_correct`: 是否正确
- `score`: 得分
- 通过 `question_id` 关联到题目

**活动数据** (`student_activities`):
- `score`: 总分
- `status`: 完成状态
- 通过 `activity_id` 关联活动类型和范围

**统计发现**:
- 当前有 280 道题目包含能力标签
- 能力和知识点以文本数组形式存储
- 缺少专门的统计表/视图

---

## 2. 学生端数据展示需求

### 2.1 个人能力雷达图

**功能描述**:
展示学生在不同能力维度上的掌握程度

**数据维度**:
- 各个能力标签的掌握率（正确率）
- 能力等级分布 (L1-L9)
- 各科目能力对比

**数据计算**:
```sql
-- 学生在某个能力上的表现
SELECT
  unnest(qd.abilities) as ability,
  COUNT(*) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  AVG(a.score) as avg_score
FROM answers a
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE a.student_exam_id IN (
  SELECT id FROM student_activities WHERE student_id = ?
)
GROUP BY ability
```

**展示组件**:
- Ant Design Charts 雷达图
- 能力列表 + 进度条
- 对比历史数据（如有）

### 2.2 知识点掌握情况

**功能描述**:
展示学生对各知识点的掌握程度

**数据维度**:
- 知识点列表及掌握率
- 按科目分组
- 薄弱知识点排序

**展示组件**:
- 知识点树状图
- 掌握度热力图
- 薄弱项警示

### 2.3 能力等级分布

**功能描述**:
展示学生在不同能力等级(L1-L9)题目上的表现

**数据维度**:
- 各等级题目完成数量
- 各等级正确率
- 等级提升趋势

**展示组件**:
- 柱状图：各等级正确率
- 折线图：历史趋势
- 当前等级标记

### 2.4 学习进度统计

**功能描述**:
整体学习情况概览

**数据指标**:
- 参与活动总数
- 完成活动数
- 平均分数
- 排名情况（如有）
- 学习时长统计

**展示组件**:
- 统计卡片 (Statistic)
- 进度环形图
- 时间趋势图

---

## 3. 教师端数据展示需求

### 3.1 多层级数据范围

**权限级别**:
1. **校级教师**: 查看本校数据
2. **区级管理员**: 查看本区所有学校数据 + 区域对比
3. **市级管理员**: 查看全市数据 + 区域对比

### 3.2 整体概况仪表板

**功能描述**:
展示整体教学质量和学生表现

**数据指标**:
- 学生总数
- 活动总数（按类型）
- 平均参与率
- 平均完成率
- 平均分数
- 及格率

**展示组件**:
- 统计卡片矩阵
- 趋势折线图
- 同比/环比指标

### 3.3 能力维度分析

**功能描述**:
分析学生群体在各能力维度上的表现

**数据维度**:
- 各能力平均掌握率
- 能力掌握分布（优秀/良好/及格/不及格）
- 薄弱能力识别
- 跨学校/跨区域对比

**数据计算**:
```sql
-- 学校/区域能力统计
SELECT
  unnest(qd.abilities) as ability,
  COUNT(DISTINCT sa.student_id) as student_count,
  AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END) as avg_accuracy,
  COUNT(*) as total_attempts
FROM student_activities sa
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
JOIN students s ON sa.student_id = s.user_id
WHERE s.school_id = ? -- 或 s.district_id = ?
GROUP BY ability
ORDER BY avg_accuracy ASC
```

**展示组件**:
- 能力雷达图（平均值）
- 能力排名表格
- 分布直方图

### 3.4 知识点掌握分析

**功能描述**:
分析学生群体的知识点掌握情况

**数据维度**:
- 各知识点平均掌握率
- 薄弱知识点TOP10
- 按科目分类统计
- 跨校/跨区对比

**展示组件**:
- 知识点矩阵
- 薄弱项列表
- 对比柱状图

### 3.5 难度分布与表现

**功能描述**:
分析不同难度题目的完成情况

**数据维度**:
- 各难度(easy/medium/hard)正确率
- 各能力等级(L1-L9)正确率
- 难度与分数关系

**展示组件**:
- 分组柱状图
- 散点图（难度-得分）
- 对比雷达图

### 3.6 学校/区域排名对比

**功能描述**:
多维度排名和对比分析

**数据维度**:
- 平均分排名
- 参与率排名
- 及格率排名
- 优秀率排名
- 按科目分类排名

**展示组件**:
- 排名表格（可排序）
- 对比柱状图
- 地图可视化（区域级）

### 3.7 时间趋势分析

**功能描述**:
学习数据的时间维度分析

**数据维度**:
- 月度/周度活动参与趋势
- 平均分数变化趋势
- 能力提升趋势
- 季节性分析

**展示组件**:
- 多指标折线图
- 时间选择器
- 同比/环比标记

---

## 4. 数据库设计需求

### 4.1 统计表设计

#### 4.1.1 学生能力统计表 `student_ability_stats`

```sql
CREATE TABLE student_ability_stats (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),
  avg_score DECIMAL(5,2),
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, ability, subject)
);
```

#### 4.1.2 学生知识点统计表 `student_knowledge_stats`

```sql
CREATE TABLE student_knowledge_stats (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  knowledge_point VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),
  avg_score DECIMAL(5,2),
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, knowledge_point, subject)
);
```

#### 4.1.3 学校能力统计表 `school_ability_stats`

```sql
CREATE TABLE school_ability_stats (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  student_count INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),
  avg_score DECIMAL(5,2),
  period_start DATE,
  period_end DATE,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, ability, subject, period_start, period_end)
);
```

#### 4.1.4 区域能力统计表 `district_ability_stats`

```sql
CREATE TABLE district_ability_stats (
  id SERIAL PRIMARY KEY,
  district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  school_count INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),
  avg_score DECIMAL(5,2),
  period_start DATE,
  period_end DATE,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(district_id, ability, subject, period_start, period_end)
);
```

### 4.2 统计视图设计

#### 4.2.1 学生能力实时统计视图

```sql
CREATE OR REPLACE VIEW v_student_ability_realtime AS
SELECT
  sa.student_id,
  unnest(qd.abilities) as ability,
  qd.subject,
  COUNT(*) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score
FROM student_activities sa
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE sa.status = 'submitted' OR sa.status = 'graded'
GROUP BY sa.student_id, ability, qd.subject;
```

### 4.3 触发器设计

创建触发器，在学生提交答题后自动更新统计表：

```sql
CREATE OR REPLACE FUNCTION update_student_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新学生能力统计
  -- 更新学生知识点统计
  -- ...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_on_answer
AFTER INSERT OR UPDATE ON answers
FOR EACH ROW
EXECUTE FUNCTION update_student_stats();
```

---

## 5. API接口设计

### 5.1 学生端API

#### 5.1.1 获取个人能力统计

```
GET /api/statistics/student/abilities
Query: subject?, period?

Response:
{
  "success": true,
  "data": [
    {
      "ability": "乘方运算",
      "subject": "数学",
      "total_questions": 50,
      "correct_count": 42,
      "accuracy_rate": 84.00,
      "avg_score": 8.4
    }
  ]
}
```

#### 5.1.2 获取个人知识点统计

```
GET /api/statistics/student/knowledge-points
Query: subject?, period?

Response: 类似ability统计格式
```

#### 5.1.3 获取个人学习概况

```
GET /api/statistics/student/overview

Response:
{
  "success": true,
  "data": {
    "total_activities": 25,
    "completed_activities": 20,
    "avg_score": 82.5,
    "total_study_time": 7200, // 秒
    "ability_summary": {...},
    "recent_trend": [...]
  }
}
```

### 5.2 教师端API

#### 5.2.1 获取学校/区域能力统计

```
GET /api/statistics/teacher/abilities
Query: scope (school|district|city), school_id?, district_id?, subject?, period?

Response:
{
  "success": true,
  "data": {
    "scope": "school",
    "scope_id": 123,
    "abilities": [
      {
        "ability": "乘方运算",
        "subject": "数学",
        "student_count": 500,
        "total_attempts": 2500,
        "correct_count": 2100,
        "accuracy_rate": 84.00,
        "avg_score": 8.4
      }
    ],
    "meta": {
      "total_students": 1000,
      "total_activities": 50
    }
  }
}
```

#### 5.2.2 获取学校/区域排名

```
GET /api/statistics/teacher/rankings
Query: scope, metric (avg_score|participation|pass_rate), subject?, period?

Response:
{
  "success": true,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "school_id": 123,
        "school_name": "贵阳一中",
        "metric_value": 85.6,
        "student_count": 1200
      }
    ]
  }
}
```

---

## 6. 前端页面设计

### 6.1 学生端页面

#### 页面路径
- `/student/data-analysis` - 个人数据分析主页

#### 页面模块
1. **顶部统计卡片**: 总活动数、平均分、排名
2. **能力雷达图**: 多维度能力展示
3. **知识点掌握情况**: 树状图或列表
4. **能力等级分布**: 柱状图
5. **学习趋势**: 时间折线图

### 6.2 教师端页面

#### 页面路径
- `/teacher/data-analysis` - 数据分析主页

#### 页面模块
1. **范围选择器**: 学校/区域/市级切换
2. **时间范围选择**: 日期范围筛选
3. **整体概况仪表板**: 统计卡片矩阵
4. **能力分析**: 雷达图 + 排名表
5. **知识点分析**: 热力图 + 薄弱项
6. **排名对比**: 学校/区域排名表
7. **趋势分析**: 多指标时间序列图

---

## 7. 技术栈

### 7.1 前端
- **图表库**: Ant Design Charts (基于G2Plot)
  - 雷达图: Radar
  - 柱状图: Column
  - 折线图: Line
  - 热力图: Heatmap
  - 散点图: Scatter

### 7.2 后端
- **统计计算**: PostgreSQL聚合查询
- **缓存**: Redis缓存统计结果（5-15分钟）
- **定时任务**: 每天凌晨更新统计表

---

## 8. 开发优先级

### P0 (最高优先级)
1. 数据库统计表和视图创建
2. 学生端个人能力雷达图
3. 学生端知识点掌握情况
4. 教师端学校能力统计

### P1 (高优先级)
5. 教师端区域对比分析
6. 学生端学习趋势分析
7. 教师端排名功能

### P2 (中优先级)
8. 市级数据统计
9. 高级筛选和导出功能
10. 数据缓存优化

---

## 9. 性能考虑

### 9.1 数据量估算
- 学生数: 10,000+
- 题目数: 5,000+
- 作答记录: 1,000,000+

### 9.2 优化策略
1. **使用统计表**: 避免实时聚合大量数据
2. **定期更新**: 凌晨批量更新统计表
3. **Redis缓存**: 缓存热点统计数据
4. **分页加载**: 大数据集分页返回
5. **索引优化**: 在统计表上创建合适索引

---

## 10. 未来扩展

### 10.1 个性化推荐
- 根据薄弱能力推荐练习题
- 智能学习路径规划

### 10.2 AI分析
- 学习模式识别
- 异常检测
- 预测分析

### 10.3 导出功能
- PDF报告生成
- Excel数据导出
- 图表下载

---

**文档版本**: v1.0
**创建日期**: 2025-11-23
**最后更新**: 2025-11-23
