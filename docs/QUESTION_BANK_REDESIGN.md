# 题库系统重构设计文档

**日期**: 2025-11-22
**版本**: 1.0
**状态**: 设计中

---

## 📋 需求概述

### 当前问题

1. **发布后题目无法复用**: 题目发布到一个范围后，无法再发布到其他范围
2. **区县筛选权限混乱**: 所有用户看到相同的区级题目列表，缺少细粒度权限控制
3. **数据模型不清晰**: 草稿和发布后的题目混在同一张表，状态管理复杂

### 新需求

1. **草稿可多次发布**: 同一道题目可以发布到多个范围（如同时发布到云岩区和南明区）
2. **区县筛选权限控制**:
   - 系统管理员和市级管理员：可查看所有区县的题目，提供区县筛选下拉框
   - 其他角色（区级/校级管理员和教师）：只能查看自己区域的题目，无区县筛选
3. **数据模型分离**: 草稿表（question_drafts）+ 发布表（question_bank）

---

## 🗄️ 数据库设计

### 1. 草稿表 (question_drafts)

**功能**: 存储所有题目的原始内容，作为题目的"母版"

```sql
CREATE TABLE question_drafts (
    id SERIAL PRIMARY KEY,

    -- 题目基本信息
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple', 'blank', 'true_false', 'essay', 'code', 'matching')),
    subject VARCHAR(50) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB,
    explanation TEXT,
    image_url VARCHAR(500),

    -- 分类和难度
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    level VARCHAR(10) CHECK (level IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9')),
    suggested_score INTEGER DEFAULT 5,

    -- 能力和知识点
    abilities TEXT[] DEFAULT '{}',
    knowledge_points TEXT[] DEFAULT '{}',
    tags TEXT[],

    -- 创建者信息
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 统计信息（从发布记录聚合）
    publish_count INTEGER DEFAULT 0, -- 发布次数
    total_usage_count INTEGER DEFAULT 0, -- 总使用次数

    -- 软删除
    is_active BOOLEAN DEFAULT true
);

-- 索引
CREATE INDEX idx_question_drafts_created_by ON question_drafts(created_by);
CREATE INDEX idx_question_drafts_subject ON question_drafts(subject);
CREATE INDEX idx_question_drafts_grade ON question_drafts(grade);
CREATE INDEX idx_question_drafts_level ON question_drafts(level);
CREATE INDEX idx_question_drafts_is_active ON question_drafts(is_active);

-- 注释
COMMENT ON TABLE question_drafts IS '题目草稿表：存储题目的原始内容，可多次发布到不同范围';
COMMENT ON COLUMN question_drafts.publish_count IS '该题目被发布的次数（一个题目可发布到多个范围）';
COMMENT ON COLUMN question_drafts.total_usage_count IS '所有发布版本的累计使用次数';
```

### 2. 发布题目表 (question_bank)

**功能**: 存储题目的发布记录，一个草稿可以有多条发布记录

```sql
-- 重构后的 question_bank 表（保留原表名，但语义改变）
CREATE TABLE question_bank (
    id SERIAL PRIMARY KEY,

    -- 关联草稿表（核心字段）
    draft_id INTEGER NOT NULL REFERENCES question_drafts(id) ON DELETE CASCADE,

    -- 发布范围信息（核心字段）
    scope VARCHAR(100) NOT NULL, -- 单个范围：'assessment', 'practice_municipal', 'practice_district_YY', 'practice_school_123'
    district_id INTEGER REFERENCES districts(id), -- 区级题目时必填
    school_id INTEGER REFERENCES schools(id), -- 校级题目时必填

    -- 审核信息
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'inactive')),
    reviewer_id INTEGER REFERENCES users(id),
    review_comment TEXT,
    reviewed_at TIMESTAMP,

    -- 发布信息
    published_by INTEGER NOT NULL REFERENCES users(id),
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 题目编码（每个发布版本独立编码）
    question_code VARCHAR(20) UNIQUE,

    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2),

    -- 软删除
    is_active BOOLEAN DEFAULT true,

    -- 唯一约束：同一草稿不能在同一范围重复发布
    CONSTRAINT unique_draft_scope UNIQUE (draft_id, scope)
);

-- 索引
CREATE INDEX idx_question_bank_draft_id ON question_bank(draft_id);
CREATE INDEX idx_question_bank_scope ON question_bank(scope);
CREATE INDEX idx_question_bank_district_id ON question_bank(district_id);
CREATE INDEX idx_question_bank_school_id ON question_bank(school_id);
CREATE INDEX idx_question_bank_published_by ON question_bank(published_by);
CREATE INDEX idx_question_bank_status ON question_bank(status);
CREATE INDEX idx_question_bank_is_active ON question_bank(is_active);

-- 注释
COMMENT ON TABLE question_bank IS '题目发布记录表：一个草稿可以有多条发布记录，每条对应一个发布范围';
COMMENT ON COLUMN question_bank.draft_id IS '关联的草稿题目ID';
COMMENT ON COLUMN question_bank.scope IS '发布范围（单值）：assessment, practice_municipal, practice_district_{code}, practice_school_{id}';
COMMENT ON COLUMN question_bank.district_id IS '区级题目时，关联的区ID（从scope解析或手动指定）';
COMMENT ON COLUMN question_bank.school_id IS '校级题目时，关联的学校ID';
COMMENT ON COLUMN question_bank.question_code IS '题目编码，每个发布版本独立生成（格式：科目代码+日期+序号）';

-- 自动触发器：从scope解析district_id和school_id
CREATE OR REPLACE FUNCTION extract_scope_ids() RETURNS TRIGGER AS $$
BEGIN
    -- 解析 practice_district_{code} 获取 district_id
    IF NEW.scope LIKE 'practice_district_%' THEN
        SELECT id INTO NEW.district_id
        FROM districts
        WHERE code = SUBSTRING(NEW.scope FROM 'practice_district_(.+)');
    END IF;

    -- 解析 practice_school_{id} 获取 school_id
    IF NEW.scope LIKE 'practice_school_%' THEN
        NEW.school_id := CAST(SUBSTRING(NEW.scope FROM 'practice_school_(.+)') AS INTEGER);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_question_bank
    BEFORE INSERT OR UPDATE ON question_bank
    FOR EACH ROW
    EXECUTE FUNCTION extract_scope_ids();
```

### 3. 题目发布视图 (用于查询优化)

```sql
CREATE VIEW question_bank_with_draft AS
SELECT
    qb.id,
    qb.draft_id,
    qb.scope,
    qb.district_id,
    qb.school_id,
    qb.status,
    qb.question_code,
    qb.usage_count,
    qb.published_by,
    qb.published_at,

    -- 从草稿表获取题目内容
    qd.type,
    qd.subject,
    qd.grade,
    qd.content,
    qd.options,
    qd.correct_answer,
    qd.explanation,
    qd.image_url,
    qd.difficulty,
    qd.level,
    qd.suggested_score,
    qd.abilities,
    qd.knowledge_points,
    qd.tags,
    qd.created_by,
    qd.created_at,

    -- 关联用户信息
    u1.real_name as creator_name,
    u2.real_name as publisher_name,
    d.name as district_name,
    d.code as district_code,
    s.name as school_name

FROM question_bank qb
INNER JOIN question_drafts qd ON qb.draft_id = qd.id
LEFT JOIN users u1 ON qd.created_by = u1.id
LEFT JOIN users u2 ON qb.published_by = u2.id
LEFT JOIN districts d ON qb.district_id = d.id
LEFT JOIN schools s ON qb.school_id = s.id
WHERE qb.is_active = true AND qd.is_active = true;

COMMENT ON VIEW question_bank_with_draft IS '题目发布记录带草稿内容视图，用于列表查询';
```

---

## 🔄 业务流程设计

### 发布流程

```
┌──────────────────────┐
│ 1. 教师创建草稿题目  │
│   question_drafts    │
│   status: draft      │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────┐
│ 2. 选择发布范围              │
│   - 校级题库（无需审核）     │
│   - 区级/市级/测评（需审核） │
└──────────┬───────────────────┘
           │
     ┌─────┴─────┐
     │           │
     ↓           ↓
┌─────────┐  ┌──────────────┐
│ 直接发布│  │ 提交审核      │
│ (校级)  │  │ (区/市/测评) │
└────┬────┘  └──────┬───────┘
     │              │
     │              ↓
     │       ┌──────────────┐
     │       │ 审核通过/拒绝│
     │       └──────┬───────┘
     │              │
     └──────┬───────┘
            ↓
┌──────────────────────────┐
│ 3. 创建发布记录          │
│   INSERT question_bank   │
│   draft_id = X           │
│   scope = 'practice_...' │
│   草稿保持不变！         │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 4. 可再次发布到其他范围  │
│   同一draft_id可有多条   │
│   question_bank记录      │
└──────────────────────────┘
```

### 筛选逻辑

```
用户角色判断
    │
    ├─ 系统管理员/市级管理员
    │   ├─ 显示区县筛选下拉框
    │   ├─ 未选区县：显示所有区县题目
    │   └─ 选择区县：WHERE district_id = ?
    │
    └─ 区级/校级管理员/教师
        ├─ 不显示区县筛选
        └─ WHERE district_id = user.district_id
```

---

## 🔧 后端API设计

### 1. 创建草稿

```
POST /api/question-drafts
Request Body:
{
  "type": "single",
  "subject": "数学",
  "grade": "三年级",
  "content": "1+1=?",
  "options": {...},
  "correct_answer": {...},
  ...
}

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "type": "single",
    ...
  }
}
```

### 2. 发布题目（新接口）

```
POST /api/question-drafts/:draftId/publish
Request Body:
{
  "scope": "practice_district_YY",
  "reviewer_id": 456 // 可选，校级题库不需要
}

Response:
{
  "success": true,
  "data": {
    "id": 789, // question_bank.id
    "draft_id": 123,
    "scope": "practice_district_YY",
    "question_code": "MATH2511220001",
    "status": "published" // 或 "pending_review"
  }
}
```

### 3. 获取已发布题目列表（区县筛选）

```
GET /api/question-bank?scope=practice_district&district_code=YY
Query Parameters:
  - scope: 题库范围（'assessment', 'practice_municipal', 'practice_district', 'practice_school'）
  - district_code: 区县代码（仅系统/市级管理员可用，可选）
  - subject: 科目
  - grade: 年级
  - difficulty: 难度
  - page: 页码
  - limit: 每页数量

Response:
{
  "success": true,
  "data": [
    {
      "id": 789,
      "draft_id": 123,
      "scope": "practice_district_YY",
      "district_name": "云岩区",
      "content": "1+1=?",
      ...
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}

权限逻辑:
  - 系统管理员/市级管理员:
    * 可传district_code参数
    * 不传则查所有区县
  - 其他角色:
    * district_code参数被忽略
    * 自动筛选为 WHERE district_id = user.district_id
```

### 4. 获取草稿的发布记录

```
GET /api/question-drafts/:draftId/publications
Response:
{
  "success": true,
  "data": [
    {
      "id": 789,
      "scope": "practice_district_YY",
      "district_name": "云岩区",
      "status": "published",
      "published_at": "2025-11-22",
      "usage_count": 50
    },
    {
      "id": 790,
      "scope": "practice_district_NM",
      "district_name": "南明区",
      "status": "published",
      "published_at": "2025-11-23",
      "usage_count": 30
    }
  ]
}
```

---

## 🎨 前端UI设计

### 题库列表页面（QuestionBankPage）

#### 筛选区域

```tsx
// 系统管理员/市级管理员看到的筛选器
<Select
  placeholder="选择题库范围"
  value={filters.scope}
  onChange={(value) => handleFilterChange('scope', value)}
>
  <Option value="assessment">测评题库</Option>
  <Option value="practice_municipal">市级练习题库</Option>
  <Option value="practice_district">区级练习题库</Option>
  <Option value="practice_school">校级练习题库</Option>
</Select>

{/* 仅当选择"区级练习题库"且用户为系统/市级管理员时显示 */}
{filters.scope === 'practice_district' && canSelectDistrict && (
  <Select
    placeholder="选择区县（不选则显示全部）"
    allowClear
    value={filters.districtCode}
    onChange={(value) => handleFilterChange('districtCode', value)}
  >
    {districts.map(d => (
      <Option key={d.code} value={d.code}>{d.name}</Option>
    ))}
  </Select>
)}

// 其他角色（区级/校级）不显示区县筛选
// 他们只能看到自己区域的题目
```

#### 权限检查函数

```tsx
const canSelectDistrict = useMemo(() => {
  const adminLevel = user?.admin?.permission_type;
  return adminLevel === 'system_admin' || adminLevel === 'municipal_admin';
}, [user]);
```

### 草稿发布页面（DraftsPage）

#### 发布按钮

```tsx
<Button
  type="primary"
  onClick={() => handlePublish(draft.id)}
>
  发布
</Button>

// 点击后显示发布对话框
<Modal title="发布题目" visible={publishModalVisible}>
  <Form>
    <Form.Item label="选择发布范围">
      <Select onChange={handleScopeChange}>
        <Option value="practice_school">校级题库</Option>
        <Option value="practice_district">区级题库</Option>
        <Option value="practice_municipal">市级题库</Option>
        <Option value="assessment">测评题库</Option>
      </Select>
    </Form.Item>

    {/* 区级题库自动匹配区域 */}
    {selectedScope === 'practice_district' && (
      <Form.Item label="区域">
        <Input
          value={userDistrictName}
          disabled
          suffix={<InfoCircleOutlined />}
        />
        <Text type="secondary">根据您的账号自动匹配</Text>
      </Form.Item>
    )}

    {/* 需要审核的范围显示审核人选择 */}
    {needsReview && (
      <Form.Item label="选择审核人">
        <Select>
          {reviewers.map(r => (
            <Option key={r.id} value={r.id}>{r.real_name}</Option>
          ))}
        </Select>
      </Form.Item>
    )}
  </Form>
</Modal>
```

---

## 📝 数据迁移策略

### 迁移步骤

1. **创建新表**
   ```sql
   CREATE TABLE question_drafts (...);
   ```

2. **迁移现有数据**
   ```sql
   -- 将现有 question_bank 中状态为 'draft' 的题目迁移到 question_drafts
   INSERT INTO question_drafts (
       type, subject, grade, content, options, correct_answer,
       difficulty, level, suggested_score, abilities, knowledge_points,
       tags, explanation, image_url, created_by, created_at, updated_at
   )
   SELECT
       type, subject, grade, content, options, correct_answer,
       difficulty, level, suggested_score, abilities, knowledge_points,
       tags, explanation, image_url, created_by, created_at, updated_at
   FROM question_bank
   WHERE status = 'draft';

   -- 将已发布的题目重构为发布记录
   -- 1. 先为每个已发布题目创建对应的草稿
   INSERT INTO question_drafts (...)
   SELECT ... FROM question_bank WHERE status = 'published';

   -- 2. 清空旧 question_bank 表
   TRUNCATE question_bank;

   -- 3. 重新创建 question_bank 表结构（添加 draft_id 字段）
   ALTER TABLE question_bank ADD COLUMN draft_id INTEGER REFERENCES question_drafts(id);

   -- 4. 为已发布题目创建发布记录
   INSERT INTO question_bank (draft_id, scope, published_by, ...)
   SELECT ...;
   ```

3. **数据验证**
   ```sql
   -- 验证草稿数量
   SELECT COUNT(*) FROM question_drafts;

   -- 验证发布记录数量
   SELECT COUNT(*) FROM question_bank;

   -- 验证外键关系
   SELECT COUNT(*) FROM question_bank qb
   LEFT JOIN question_drafts qd ON qb.draft_id = qd.id
   WHERE qd.id IS NULL; -- 应该为0
   ```

---

## ✅ 测试计划

### API测试

```javascript
// tests/api/question-bank-redesign.test.js

describe('Question Bank Redesign - API Tests', () => {
  describe('District Filtering - System Admin', () => {
    it('should return all districts when no district_code specified', async () => {
      const response = await request(app)
        .get('/api/question-bank')
        .query({ scope: 'practice_district' })
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).toBe(200);
      // 应包含多个区县的题目
    });

    it('should filter by district_code when specified', async () => {
      const response = await request(app)
        .get('/api/question-bank')
        .query({ scope: 'practice_district', district_code: 'YY' })
        .set('Authorization', `Bearer ${systemAdminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(q => {
        expect(q.district_code).toBe('YY');
      });
    });
  });

  describe('District Filtering - District Admin', () => {
    it('should only return own district questions', async () => {
      const response = await request(app)
        .get('/api/question-bank')
        .query({ scope: 'practice_district' })
        .set('Authorization', `Bearer ${districtAdminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(q => {
        expect(q.district_id).toBe(districtAdminUser.district_id);
      });
    });

    it('should ignore district_code parameter', async () => {
      const response = await request(app)
        .get('/api/question-bank')
        .query({ scope: 'practice_district', district_code: 'NM' }) // 尝试查看其他区
        .set('Authorization', `Bearer ${districtAdminTokenYY}`); // 云岩区管理员

      expect(response.status).toBe(200);
      // 仍然只能看到云岩区的题目
      response.body.data.forEach(q => {
        expect(q.district_code).toBe('YY');
      });
    });
  });

  describe('Multiple Publishing', () => {
    it('should allow publishing same draft to multiple scopes', async () => {
      const draft = await createQuestionDraft();

      // 发布到云岩区
      const pub1 = await publishDraft(draft.id, 'practice_district_YY');
      expect(pub1.scope).toBe('practice_district_YY');

      // 同一草稿再发布到南明区
      const pub2 = await publishDraft(draft.id, 'practice_district_NM');
      expect(pub2.scope).toBe('practice_district_NM');

      // 验证草稿仍然存在
      const draftCheck = await getQuestionDraft(draft.id);
      expect(draftCheck).toBeDefined();
    });

    it('should prevent duplicate publication to same scope', async () => {
      const draft = await createQuestionDraft();

      await publishDraft(draft.id, 'practice_district_YY');

      // 尝试重复发布到同一范围
      await expect(
        publishDraft(draft.id, 'practice_district_YY')
      ).rejects.toThrow('已经发布到该范围');
    });
  });
});
```

### E2E测试

```typescript
// tests/e2e/regression/question-bank-district-filter.spec.ts

test.describe('Question Bank District Filter', () => {
  test('QBDF101: System admin can select district filter', async ({ page }) => {
    // 系统管理员登录
    await loginAsSystemAdmin(page);

    // 进入题库管理
    await page.goto('/teacher/question-bank');

    // 选择区级题库范围
    await page.selectOption('[data-testid="scope-filter"]', 'practice_district');

    // 应显示区县筛选下拉框
    const districtFilter = page.locator('[data-testid="district-filter"]');
    await expect(districtFilter).toBeVisible();

    // 选择云岩区
    await districtFilter.selectOption('YY');

    // 等待列表加载
    await page.waitForSelector('.question-list');

    // 验证所有题目都是云岩区的
    const districtTags = page.locator('.question-item .district-tag');
    const count = await districtTags.count();
    for (let i = 0; i < count; i++) {
      await expect(districtTags.nth(i)).toHaveText('云岩区');
    }
  });

  test('QBDF102: District admin cannot see district filter', async ({ page }) => {
    // 区级管理员登录（云岩区）
    await loginAsDistrictAdmin(page, 'YY');

    // 进入题库管理
    await page.goto('/teacher/question-bank');

    // 选择区级题库范围
    await page.selectOption('[data-testid="scope-filter"]', 'practice_district');

    // 不应显示区县筛选下拉框
    const districtFilter = page.locator('[data-testid="district-filter"]');
    await expect(districtFilter).not.toBeVisible();

    // 自动只显示云岩区的题目
    const districtTags = page.locator('.question-item .district-tag');
    const count = await districtTags.count();
    for (let i = 0; i < count; i++) {
      await expect(districtTags.nth(i)).toHaveText('云岩区');
    }
  });

  test('QBDF103: Multiple publication workflow', async ({ page }) => {
    // 教师登录
    await loginAsTeacher(page);

    // 创建草稿题目
    const draftContent = `多次发布测试-${Date.now()}`;
    await createQuestionDraft(page, { content: draftContent });

    // 进入草稿箱
    await page.goto('/teacher/question-drafts');

    // 找到刚创建的草稿
    const draftRow = page.locator(`.draft-item:has-text("${draftContent}")`);
    await expect(draftRow).toBeVisible();

    // 发布到云岩区
    await draftRow.locator('[data-testid="publish-btn"]').click();
    await page.selectOption('[data-testid="scope-select"]', 'practice_district_YY');
    await page.click('[data-testid="confirm-publish"]');
    await expect(page.locator('.ant-message-success')).toContainText('发布成功');

    // 刷新页面，草稿应该还在
    await page.reload();
    await expect(draftRow).toBeVisible();

    // 再次发布到南明区
    await draftRow.locator('[data-testid="publish-btn"]').click();
    await page.selectOption('[data-testid="scope-select"]', 'practice_district_NM');
    await page.click('[data-testid="confirm-publish"]');
    await expect(page.locator('.ant-message-success')).toContainText('发布成功');

    // 查看发布记录
    await draftRow.locator('[data-testid="view-publications"]').click();
    const publications = page.locator('.publication-item');
    await expect(publications).toHaveCount(2);
    await expect(publications.nth(0)).toContainText('云岩区');
    await expect(publications.nth(1)).toContainText('南明区');
  });
});
```

---

## 🚀 实施计划

### Phase 1: 数据库设计与迁移 (2天)

- [ ] 创建 `question_drafts` 表
- [ ] 修改 `question_bank` 表结构
- [ ] 创建视图 `question_bank_with_draft`
- [ ] 编写数据迁移脚本
- [ ] 执行迁移并验证数据

### Phase 2: 后端API开发 (3天)

- [ ] 实现 `QuestionDraft` 模型
- [ ] 修改 `QuestionBank` 模型（新语义）
- [ ] 实现草稿CRUD接口
- [ ] 实现发布接口（多次发布）
- [ ] 实现区县筛选权限逻辑
- [ ] 修改现有查询接口

### Phase 3: 前端UI开发 (3天)

- [ ] 修改 `QuestionBankPage` 添加区县筛选
- [ ] 实现权限判断逻辑
- [ ] 修改 `DraftsPage` 发布对话框
- [ ] 实现发布记录查看
- [ ] 更新类型定义

### Phase 4: 测试 (2天)

- [ ] 编写API单元测试（8个测试）
- [ ] 编写E2E测试（3个测试）
- [ ] 手动测试不同角色场景
- [ ] Bug修复

### Phase 5: 文档与部署 (1天)

- [ ] 更新API文档
- [ ] 更新用户手册
- [ ] 数据库备份
- [ ] 生产环境部署

**总计**: 约11天

---

## 📌 注意事项

1. **向后兼容**: 旧的API接口需要保留一段时间，逐步迁移前端调用
2. **数据完整性**: 迁移前务必备份数据库
3. **性能优化**: 使用视图简化查询，添加必要索引
4. **权限安全**: 严格验证区县筛选权限，防止越权查询
5. **用户体验**: 草稿发布后保留，用户可以清楚看到发布记录

---

**文档编写者**: Claude
**审核者**: 待定
**批准者**: 待定
