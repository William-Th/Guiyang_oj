# 题库权限管理系统优化实施计划

**版本**: 1.0
**日期**: 2025-11-03
**项目**: 贵阳市小学生测评平台
**优先级**: P1 (高优先级)

---

## 📋 目录

1. [项目概述](#项目概述)
2. [实施阶段规划](#实施阶段规划)
3. [Phase 1: 数据库架构优化](#phase-1-数据库架构优化)
4. [Phase 2: 后端 API 开发](#phase-2-后端-api-开发)
5. [Phase 3: 前端开发](#phase-3-前端开发)
6. [Phase 4: 测试与验证](#phase-4-测试与验证)
7. [Phase 5: 文档与部署](#phase-5-文档与部署)
8. [风险管理](#风险管理)
9. [附录](#附录)

---

## 项目概述

### 背景

当前系统的题库管理权限较为粗放，无法满足分级管理和区域限制的需求。本次优化旨在实现：
- 题库分级管理（测评/市级练习/区级练习/校级练习）
- 精细化权限控制
- 区域自动关联
- 灵活的审核流程

### 目标

✅ **业务目标**:
- 测评题库严格审核，确保题目质量
- 市级练习题库实现优质资源全市共享
- 区级练习题库保护区域教学资源
- 校级题库快速发布，满足日常教学

✅ **技术目标**:
- 数据库架构支持多层级题库
- 权限系统支持按区域和科目授权
- 前端界面支持不同角色的操作流程
- 完整的测试覆盖

### 预期收益

| 维度 | 当前状态 | 优化后 | 提升 |
|------|---------|--------|------|
| 题库层级 | 单一层级 | 4个层级 | ⭐⭐⭐ |
| 权限粒度 | 粗放 | 精细化 | ⭐⭐⭐⭐ |
| 审核效率 | 低（统一审核） | 高（分级审核） | ⭐⭐⭐ |
| 资源保护 | 无 | 区域/校级隔离 | ⭐⭐⭐⭐⭐ |
| 发布速度 | 慢（都需审核） | 快（校级免审核） | ⭐⭐⭐⭐ |

---

## 实施阶段规划

### 时间线

| 阶段 | 任务 | 工期 | 负责人 | 状态 |
|------|------|------|--------|------|
| **Phase 1** | 数据库架构优化 | 1-2天 | Backend Team | ⏳ 待开始 |
| **Phase 2** | 后端 API 开发 | 2-3天 | Backend Team | ⏳ 待开始 |
| **Phase 3** | 前端开发 | 3-4天 | Frontend Team | ⏳ 待开始 |
| **Phase 4** | 测试与验证 | 2-3天 | QA Team | ⏳ 待开始 |
| **Phase 5** | 文档与部署 | 1天 | DevOps Team | ⏳ 待开始 |
| **总计** | - | **9-13天** | - | - |

### 依赖关系

```
Phase 1 (数据库)
    ↓
Phase 2 (后端) → Phase 3 (前端)
    ↓              ↓
    └──────┬───────┘
           ↓
    Phase 4 (测试)
           ↓
    Phase 5 (部署)
```

---

## Phase 1: 数据库架构优化

**工期**: 1-2天
**负责人**: Backend Team
**优先级**: P0 (最高优先级)

### 1.1 任务清单

#### Task 1.1.1: 修改 teacher_permissions 表 ⏰ 3小时

**目标**: 添加层级和区域关联字段

**具体操作**:
```sql
-- 添加字段
ALTER TABLE teacher_permissions
ADD COLUMN scope_level VARCHAR(20) CHECK (scope_level IN ('municipal', 'district', 'school')),
ADD COLUMN district_id INTEGER REFERENCES districts(id),
ADD COLUMN school_id INTEGER REFERENCES schools(id);

-- 添加唯一约束
ALTER TABLE teacher_permissions
ADD CONSTRAINT teacher_permissions_unique_grant
UNIQUE (user_id, permission_type, scope_level, district_id);

-- 创建索引
CREATE INDEX idx_teacher_permissions_scope_level ON teacher_permissions(scope_level);
CREATE INDEX idx_teacher_permissions_district_id ON teacher_permissions(district_id);
```

**验证标准**:
- ✅ 字段成功添加
- ✅ 约束和索引创建成功
- ✅ 无数据丢失

---

#### Task 1.1.2: 更新权限类型 ⏰ 2小时

**目标**: 将旧的 `question_bank_review` 拆分为三种新权限

**具体操作**:
- `question_bank_review` → `assessment_review` (测评审核)
- `question_bank_review` → `practice_municipal_review` (市级练习审核)
- `question_bank_review` → `practice_district_review` (区级练习审核)

**迁移脚本**: `database/migrations/010_question_bank_permission_enhancement.sql`

**验证标准**:
- ✅ 旧权限成功拆分
- ✅ 系统管理员拥有所有权限
- ✅ 区级权限正确关联 district_id

---

#### Task 1.1.3: 更新 question_bank 表 ⏰ 1小时

**目标**: 优化 scope 字段，支持多层级题库

**Scope 格式说明**:
- `assessment` - 测评题库
- `practice_municipal` - 市级练习题库
- `practice_district_BY` - 白云区练习题库
- `practice_district_YY` - 云岩区练习题库
- `practice_school_15` - 15号学校题库

**具体操作**:
```sql
-- 为现有题目添加默认 scope
UPDATE question_bank
SET scope = ARRAY['practice_municipal']
WHERE (scope IS NULL OR scope = '{}')
  AND status = 'published';

-- 添加注释
COMMENT ON COLUMN question_bank.scope IS '题库范围数组...';
```

**验证标准**:
- ✅ 现有题目成功分配 scope
- ✅ scope 格式符合规范

---

#### Task 1.1.4: 创建辅助函数和触发器 ⏰ 2小时

**目标**: 自动验证权限数据完整性

**函数**: `validate_teacher_permission()`
- 区级权限必须有 district_id
- 校级权限必须有 school_id
- 市级权限不应有 district_id/school_id

**触发器**: `trigger_validate_teacher_permission`
- 在 INSERT/UPDATE 时触发
- 验证数据一致性

**验证标准**:
- ✅ 触发器正常工作
- ✅ 无效数据被拒绝

---

#### Task 1.1.5: 创建统计视图 ⏰ 1小时

**视图 1**: `permission_statistics`
- 按层级和权限类型统计教师数量
- 显示覆盖的科目

**视图 2**: `question_bank_distribution`
- 按 scope、科目、年级统计题目数量
- 统计各状态题目数量

**验证标准**:
- ✅ 视图数据准确
- ✅ 查询性能良好

---

#### Task 1.1.6: 数据迁移与验证 ⏰ 3小时

**迁移步骤**:
1. 备份数据库
2. 在测试环境执行迁移脚本
3. 验证数据完整性
4. 验证权限迁移正确性
5. 性能测试

**验证标准**:
- ✅ 备份成功
- ✅ 迁移无错误
- ✅ 数据完整性验证通过
- ✅ 查询性能符合预期

---

### 1.2 输出物

| 文件 | 说明 | 状态 |
|------|------|------|
| `010_question_bank_permission_enhancement.sql` | 数据库迁移脚本 | ✅ 已创建 |
| `010_rollback.sql` | 回滚脚本 | ⏳ 待创建 |
| `migration_validation_report.md` | 验证报告 | ⏳ 待创建 |

---

## Phase 2: 后端 API 开发

**工期**: 2-3天
**负责人**: Backend Team
**依赖**: Phase 1 完成

### 2.1 任务清单

#### Task 2.1.1: 更新 TeacherPermission Model ⏰ 4小时

**文件**: `backend/src/models/TeacherPermission.js`

**新增方法**:
```javascript
// 1. 授予区级权限（自动关联 district_id）
static async grantDistrictPermission(userId, subjects, grantedBy, districtId)

// 2. 获取特定 scope 的审核人列表
static async getReviewersForScope(permissionType, scopeLevel, districtId = null)

// 3. 验证审核人是否有权限审核某题目
static async canReviewQuestion(reviewerId, questionId)

// 4. 获取用户的管理范围（区级管理员视角）
static async getUserManagementScope(userId)
```

**验证标准**:
- ✅ 单元测试通过
- ✅ 代码覆盖率 > 80%

---

#### Task 2.1.2: 更新 QuestionBank Model ⏰ 4小时

**文件**: `backend/src/models/QuestionBank.js`

**新增/修改方法**:
```javascript
// 1. 提交审核（指定 scope）
static async submitForReview(id, reviewerId, targetScope)

// 2. 发布到指定 scope
static async publishToScope(id, scope, publishedBy)

// 3. 按 scope 查询题目（考虑可见性）
static async findByScope(scope, filters = {})

// 4. 获取用户可见的题库范围
static async getAvailableScopes(userId)
```

**关键逻辑**:
- 校级题库发布无需审核
- 其他层级必须通过审核流程
- 查询时自动过滤不可见的题库

**验证标准**:
- ✅ 单元测试通过
- ✅ 可见性规则正确

---

#### Task 2.1.3: 更新权限管理路由 ⏰ 4小时

**文件**: `backend/src/routes/permissions.js`

**修改端点**:

**POST /api/permissions/grant**
```javascript
// 请求体
{
  user_id: 123,
  permission_type: 'practice_district_review',
  subjects: ['数学', '语文'],
  scope_level: 'district',
  district_id: 5, // 区级管理员授权时自动填充
  expires_at: '2025-12-31'
}

// 响应
{
  success: true,
  data: { id: 789, ... }
}
```

**新增端点**:

**GET /api/permissions/available-teachers**
- 区级管理员：只返回本区教师
- 市级管理员：返回所有教师
- 参数: `district_id` (可选)

**GET /api/permissions/available-reviewers**
- 根据题目 scope 和科目返回可用审核人
- 参数: `scope`, `subject`

**验证标准**:
- ✅ API 测试通过
- ✅ 权限校验正确

---

#### Task 2.1.4: 更新题目审核路由 ⏰ 4小时

**文件**: `backend/src/routes/questionReview.js`

**修改端点**:

**POST /api/question-bank/:id/submit-review**
```javascript
// 请求体
{
  reviewer_id: 456,
  target_scope: 'practice_district_BY', // 目标 scope
  comment: '请审核'
}

// 系统自动验证:
// 1. reviewer_id 是否有对应 scope 的审核权限
// 2. reviewer_id 的 subjects 是否包含该科目
// 3. 如果是区级 scope，验证创建者和审核人是否同区
```

**POST /api/question-bank/:id/approve**
```javascript
// 请求体
{
  comment: '审核通过',
  publish_immediately: true // 是否立即发布
}

// 操作:
// 1. 更新 status = 'approved'
// 2. 如果 publish_immediately = true，自动发布到 target_scope
```

**验证标准**:
- ✅ 审核流程测试通过
- ✅ 权限验证正确

---

#### Task 2.1.5: 更新题库查询路由 ⏰ 3小时

**文件**: `backend/src/routes/questionBank.js`

**修改端点**:

**GET /api/question-bank**
```javascript
// 查询参数
?scope=practice_municipal  // 按 scope 过滤
&subject=数学              // 科目
&grade=三年级              // 年级

// 系统自动:
// 1. 根据用户角色和所属区域过滤可见题库
// 2. 教师: 测评 + 市级 + 本区 + 本校
// 3. 学生: 测评 + 市级 + 本区 + 本校
// 4. 管理员: 根据管理范围过滤
```

**新增端点**:

**GET /api/question-bank/my-scopes**
- 返回当前用户可发布和可查看的 scope 列表
- 区分 `can_publish` 和 `can_view`

**验证标准**:
- ✅ 可见性测试通过
- ✅ 查询性能良好

---

### 2.2 输出物

| 文件 | 说明 | 状态 |
|------|------|------|
| `backend/src/models/TeacherPermission.js` | 更新后的模型 | ⏳ 待开发 |
| `backend/src/models/QuestionBank.js` | 更新后的模型 | ⏳ 待开发 |
| `backend/src/routes/permissions.js` | 更新后的路由 | ⏳ 待开发 |
| `backend/src/routes/questionReview.js` | 更新后的路由 | ⏳ 待开发 |
| `backend/src/routes/questionBank.js` | 更新后的路由 | ⏳ 待开发 |
| `tests/api/permissions.test.js` | API 单元测试 | ⏳ 待创建 |
| `tests/api/question-bank.test.js` | API 单元测试 | ⏳ 待创建 |

---

## Phase 3: 前端开发

**工期**: 3-4天
**负责人**: Frontend Team
**依赖**: Phase 2 完成

### 3.1 任务清单

#### Task 3.1.1: 权限管理页面优化 ⏰ 6小时

**文件**: `frontend/src/pages/admin/PermissionManagement.tsx`

**功能需求**:

1. **权限类型选择器**
   - 测评题库审核权限
   - 市级练习题库审核权限
   - 区级练习题库审核权限

2. **区级管理员授权界面优化**
   - 隐藏区域选择器
   - 教师列表自动过滤本区教师
   - 显示管理员所在区（只读）

3. **市级管理员授权界面**
   - 显示所有教师
   - 区级权限时显示区域选择器
   - 支持批量授权

**UI 示例**:
```tsx
{/* 区级管理员视图 */}
<Form>
  <Form.Item label="权限类型">
    <Select>
      <Option value="practice_district_review">区级练习题库审核</Option>
    </Select>
  </Form.Item>

  <Form.Item label="所在区域">
    <Input value="白云区" disabled /> {/* 自动填充，不可修改 */}
  </Form.Item>

  <Form.Item label="选择教师">
    <Select>
      {/* 只显示本区教师 */}
      <Option value="101">张老师 - 白云区第一小学</Option>
      <Option value="102">李老师 - 白云区第二小学</Option>
    </Select>
  </Form.Item>

  <Form.Item label="科目">
    <Select mode="multiple">
      <Option value="数学">数学</Option>
      <Option value="语文">语文</Option>
    </Select>
  </Form.Item>
</Form>
```

**验证标准**:
- ✅ 区级管理员无法看到其他区教师
- ✅ 区域自动关联正确
- ✅ 授权成功后权限立即生效

---

#### Task 3.1.2: 题目创建/编辑页面 ⏰ 5小时

**文件**: `frontend/src/pages/teacher/QuestionFormPage.tsx`

**功能需求**:

1. **目标题库选择器**
   - 根据用户角色和权限动态显示可选项
   - 教师可选: 市级练习、区级练习、校级练习、测评
   - 显示不同题库的说明和审核要求

2. **发布流程提示**
   - 校级: "无需审核，直接发布"
   - 区级/市级/测评: "需要提交审核"

**UI 示例**:
```tsx
<Form.Item label="目标题库" name="target_scope" required>
  <Radio.Group>
    <Radio value="practice_school">
      <Space direction="vertical" size={0}>
        <Text strong>校级题库</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          仅本校可用，无需审核，直接发布
        </Text>
      </Space>
    </Radio>

    <Radio value="practice_district">
      <Space direction="vertical" size={0}>
        <Text strong>区级题库（白云区）</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          本区所有学校可用，需要区级审核人审核
        </Text>
      </Space>
    </Radio>

    <Radio value="practice_municipal">
      <Space direction="vertical" size={0}>
        <Text strong>市级公开题库</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          全市所有学校可用，需要市级审核人审核
        </Text>
      </Space>
    </Radio>

    <Radio value="assessment">
      <Space direction="vertical" size={0}>
        <Text strong>测评题库</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          全市测评可用，需要测评审核人审核
        </Text>
      </Space>
    </Radio>
  </Radio.Group>
</Form.Item>

{/* 根据选择显示操作按钮 */}
{targetScope === 'practice_school' ? (
  <Button type="primary" onClick={handleDirectPublish}>
    直接发布到校级题库
  </Button>
) : (
  <Button type="primary" onClick={handleSubmitForReview}>
    提交审核
  </Button>
)}
```

**验证标准**:
- ✅ 题库选项符合用户权限
- ✅ 校级题库可直接发布
- ✅ 其他题库正确进入审核流程

---

#### Task 3.1.3: 题目审核提交页面 ⏰ 4小时

**文件**: `frontend/src/pages/teacher/QuestionReviewSubmit.tsx`

**功能需求**:

1. **动态加载审核人列表**
   - 根据题目科目和目标 scope 过滤审核人
   - 显示审核人的科目权限

2. **审核说明**
   - 输入框：审核说明或备注
   - 显示提交后的流程说明

**UI 示例**:
```tsx
<Modal title="提交审核" visible={visible} onOk={handleSubmit}>
  <Form>
    <Form.Item label="题目信息">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="科目">{question.subject}</Descriptions.Item>
        <Descriptions.Item label="年级">{question.grade}</Descriptions.Item>
        <Descriptions.Item label="目标题库">
          {getScopeLabel(targetScope)}
        </Descriptions.Item>
      </Descriptions>
    </Form.Item>

    <Form.Item label="选择审核人" name="reviewer_id" required>
      <Select
        placeholder="请选择有权限的审核人"
        loading={loadingReviewers}
      >
        {reviewers.map(r => (
          <Option key={r.id} value={r.id}>
            <Space direction="vertical" size={0}>
              <Text>{r.real_name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                审核科目: {r.subjects.join(', ')}
              </Text>
            </Space>
          </Option>
        ))}
      </Select>
    </Form.Item>

    <Form.Item label="审核说明" name="comment">
      <TextArea rows={3} placeholder="可选：向审核人说明题目特点或审核要点" />
    </Form.Item>

    <Alert
      message="提交后"
      description={`审核人将收到通知。审核通过后，题目将自动发布到${getScopeLabel(targetScope)}。`}
      type="info"
      showIcon
    />
  </Form>
</Modal>
```

**验证标准**:
- ✅ 审核人列表准确
- ✅ 提交成功后状态更新

---

#### Task 3.1.4: 审核人工作台 ⏰ 5小时

**文件**: `frontend/src/pages/teacher/QuestionReviewWorkbench.tsx`

**功能需求**:

1. **待审核题目列表**
   - 按科目筛选
   - 按题库类型筛选
   - 显示提交人和提交时间

2. **题目详情预览**
   - 显示完整题目内容
   - 显示创建者信息
   - 显示审核说明

3. **审核操作**
   - 批准按钮
   - 拒绝按钮
   - 审核意见输入

**UI 示例**:
```tsx
<Card title="待审核题目" extra={<StatisticCards />}>
  <Row gutter={16} style={{ marginBottom: 16 }}>
    <Col span={6}>
      <Select placeholder="科目" onChange={handleSubjectFilter}>
        <Option value="">全部科目</Option>
        <Option value="数学">数学</Option>
        <Option value="语文">语文</Option>
      </Select>
    </Col>
    <Col span={6}>
      <Select placeholder="题库类型" onChange={handleScopeFilter}>
        <Option value="">全部类型</Option>
        <Option value="assessment">测评题库</Option>
        <Option value="practice_municipal">市级练习</Option>
        <Option value="practice_district">区级练习</Option>
      </Select>
    </Col>
  </Row>

  <Table
    dataSource={pendingQuestions}
    columns={[
      { title: '题目编号', dataIndex: 'code' },
      { title: '科目', dataIndex: 'subject' },
      { title: '年级', dataIndex: 'grade' },
      { title: '目标题库', dataIndex: 'target_scope', render: getScopeLabel },
      { title: '提交人', dataIndex: 'creator_name' },
      { title: '提交时间', dataIndex: 'created_at', render: formatDate },
      {
        title: '操作',
        render: (_, record) => (
          <Space>
            <Button type="link" onClick={() => handlePreview(record)}>
              预览
            </Button>
            <Button type="link" onClick={() => handleApprove(record)}>
              批准
            </Button>
            <Button type="link" danger onClick={() => handleReject(record)}>
              拒绝
            </Button>
          </Space>
        )
      }
    ]}
  />
</Card>

{/* 审核对话框 */}
<Modal title="审核题目" visible={reviewVisible} onOk={handleReviewSubmit}>
  <QuestionPreview question={selectedQuestion} />

  <Form.Item label="审核结果" name="action" required>
    <Radio.Group>
      <Radio value="approve">批准</Radio>
      <Radio value="reject">拒绝</Radio>
    </Radio.Group>
  </Form.Item>

  <Form.Item label="审核意见" name="comment">
    <TextArea rows={3} placeholder="必填：请说明审核理由" />
  </Form.Item>

  <Form.Item name="publish_immediately" valuePropName="checked">
    <Checkbox>批准后立即发布到题库</Checkbox>
  </Form.Item>
</Modal>
```

**验证标准**:
- ✅ 列表正确显示待审核题目
- ✅ 审核操作成功
- ✅ 批准后题目正确发布

---

#### Task 3.1.5: 题库浏览页面优化 ⏰ 4小时

**文件**: `frontend/src/pages/teacher/QuestionBankPage.tsx`

**功能需求**:

1. **Scope 筛选器**
   - 测评题库
   - 市级练习题库
   - 区级练习题库（如有权限）
   - 校级题库（本校）

2. **题库来源标签**
   - 每个题目显示来源标签
   - 不同 scope 不同颜色

**UI 示例**:
```tsx
<Card title="题库浏览">
  <Row gutter={16} style={{ marginBottom: 16 }}>
    <Col span={6}>
      <Select placeholder="题库范围" onChange={handleScopeFilter}>
        <Option value="">全部题库</Option>
        <Option value="assessment">
          <Tag color="red">测评题库</Tag>
        </Option>
        <Option value="practice_municipal">
          <Tag color="blue">市级练习</Tag>
        </Option>
        <Option value="practice_district">
          <Tag color="green">区级练习（白云区）</Tag>
        </Option>
        <Option value="practice_school">
          <Tag color="orange">校级题库（本校）</Tag>
        </Option>
      </Select>
    </Col>
    {/* 其他筛选器: 科目、年级、难度等 */}
  </Row>

  <List
    dataSource={questions}
    renderItem={question => (
      <List.Item>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 题库来源标签 */}
            <Space>
              {question.scope.map(s => (
                <Tag key={s} color={getScopeColor(s)}>
                  {getScopeLabel(s)}
                </Tag>
              ))}
            </Space>

            {/* 题目内容 */}
            <div dangerouslySetInnerHTML={{ __html: question.content }} />

            {/* 题目信息 */}
            <Space>
              <Text type="secondary">{question.subject}</Text>
              <Text type="secondary">{question.grade}</Text>
              <Text type="secondary">难度: {question.difficulty}</Text>
            </Space>
          </Space>
        </Card>
      </List.Item>
    )}
  />
</Card>
```

**验证标准**:
- ✅ 筛选功能正常
- ✅ 题库标签显示正确
- ✅ 只能看到有权限的题库

---

### 3.2 输出物

| 文件 | 说明 | 状态 |
|------|------|------|
| `PermissionManagement.tsx` | 权限管理页面 | ⏳ 待开发 |
| `QuestionFormPage.tsx` | 题目创建页面 | ⏳ 待开发 |
| `QuestionReviewSubmit.tsx` | 审核提交页面 | ⏳ 待开发 |
| `QuestionReviewWorkbench.tsx` | 审核工作台 | ⏳ 待开发 |
| `QuestionBankPage.tsx` | 题库浏览页面 | ⏳ 待开发 |

---

## Phase 4: 测试与验证

**工期**: 2-3天
**负责人**: QA Team + Dev Team
**依赖**: Phase 2, Phase 3 完成

### 4.1 任务清单

#### Task 4.1.1: 单元测试 ⏰ 6小时

**后端单元测试**:
- `TeacherPermission.test.js`
  - 授予权限
  - 权限验证
  - 获取审核人列表
- `QuestionBank.test.js`
  - 提交审核
  - 发布到 scope
  - 可见性查询

**前端单元测试**:
- 组件测试 (Jest + React Testing Library)
- 权限管理表单测试
- 审核工作台测试

**目标覆盖率**: ≥ 80%

**验证标准**:
- ✅ 所有单元测试通过
- ✅ 代码覆盖率达标

---

#### Task 4.1.2: 集成测试 ⏰ 6小时

**测试场景**:

1. **完整审核流程**
   - 教师创建题目 → 提交审核 → 审核人审核 → 发布到题库

2. **权限授予流程**
   - 市级管理员授权 → 教师获得权限 → 可审核题目

3. **多角色协作**
   - 多个教师同时创建题目
   - 多个审核人同时审核
   - 并发操作测试

**验证标准**:
- ✅ 流程完整无阻塞
- ✅ 数据一致性正确

---

#### Task 4.1.3: E2E 测试 ⏰ 8小时

**测试用例** (Playwright):

```typescript
// QBPM001: 市级管理员授予测评审核权限
test('QBPM001 - Municipal admin grants assessment review permission', async ({ page }) => {
  await loginAsMunicipalAdmin(page);
  await page.goto('/admin/permissions');

  // 选择权限类型
  await page.selectOption('#permission-type', 'assessment_review');

  // 选择教师
  await page.selectOption('#teacher-id', '教师01');

  // 选择科目
  await page.check('input[value="数学"]');

  // 提交授权
  await page.click('button:has-text("授权")');

  // 验证成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
});

// QBPM002: 区级管理员授予区级审核权限（仅本区教师）
test('QBPM002 - District admin grants district review permission', async ({ page }) => {
  await loginAsDistrictAdmin(page, 'baiyun_admin');
  await page.goto('/admin/permissions');

  // 验证区域自动显示
  await expect(page.locator('input[value="白云区"]')).toBeDisabled();

  // 验证教师列表只显示本区教师
  const teacherOptions = await page.locator('#teacher-id option').allTextContents();
  for (const option of teacherOptions) {
    expect(option).toContain('白云区');
  }

  // 选择教师和科目
  await page.selectOption('#teacher-id', '教师02');
  await page.check('input[value="语文"]');

  // 提交授权
  await page.click('button:has-text("授权")');

  // 验证成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
});

// QBPM003: 教师提交测评题目审核
test('QBPM003 - Teacher submits question for assessment review', async ({ page }) => {
  await loginAsTeacher(page, 'teacher01');

  // 创建题目
  await page.goto('/teacher/question-bank/create');
  await fillQuestionForm(page, {
    type: 'single',
    subject: '数学',
    grade: '三年级',
    content: '1 + 1 = ?',
    options: ['1', '2', '3', '4'],
    correct_answer: '2',
    target_scope: 'assessment'
  });

  // 提交审核
  await page.click('button:has-text("提交审核")');

  // 选择审核人
  await page.selectOption('#reviewer-id', '审核人01');
  await page.fill('textarea[name="comment"]', '请审核');
  await page.click('button:has-text("确定")');

  // 验证提交成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator('text=待审核')).toBeVisible();
});

// QBPM004: 审核人审核通过题目
test('QBPM004 - Reviewer approves question', async ({ page }) => {
  await loginAsReviewer(page, 'reviewer01');
  await page.goto('/teacher/question-review');

  // 找到待审核题目
  const questionRow = page.locator('.ant-table-tbody tr').filter({ hasText: '1 + 1 = ?' }).first();

  // 点击审核
  await questionRow.locator('button:has-text("批准")').click();

  // 填写审核意见
  await page.fill('textarea[name="comment"]', '题目质量良好，批准发布');
  await page.check('input[name="publish_immediately"]');
  await page.click('button:has-text("确定")');

  // 验证审核成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
});

// QBPM005: 教师直接发布校级题目
test('QBPM005 - Teacher directly publishes school-level question', async ({ page }) => {
  await loginAsTeacher(page, 'teacher01');

  // 创建题目
  await page.goto('/teacher/question-bank/create');
  await fillQuestionForm(page, {
    type: 'single',
    subject: '数学',
    grade: '三年级',
    content: '2 + 2 = ?',
    options: ['1', '2', '3', '4'],
    correct_answer: '4',
    target_scope: 'practice_school'
  });

  // 直接发布（无需审核）
  await page.click('button:has-text("直接发布")');

  // 验证发布成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator('text=已发布')).toBeVisible();
});

// QBPM006: 学生查看不同层级题库
test('QBPM006 - Student views different level question banks', async ({ page }) => {
  await loginAsStudent(page, 'student01');
  await page.goto('/student/question-bank');

  // 验证可以看到市级题库
  await page.selectOption('#scope-filter', 'practice_municipal');
  await expect(page.locator('.question-list .question-item')).toHaveCount(gt(0));

  // 验证可以看到区级题库（本区）
  await page.selectOption('#scope-filter', 'practice_district');
  await expect(page.locator('.question-list .question-item')).toHaveCount(gt(0));

  // 验证可以看到校级题库（本校）
  await page.selectOption('#scope-filter', 'practice_school');
  await expect(page.locator('.question-list .question-item')).toHaveCount(gt(0));

  // 验证无法看到其他区的题库
  // (测试逻辑：查询API，验证返回的题目不包含其他区的 scope)
});
```

**验证标准**:
- ✅ 所有 E2E 测试通过
- ✅ 测试覆盖所有关键流程

---

#### Task 4.1.4: 性能测试 ⏰ 4小时

**测试场景**:

1. **大量题目查询**
   - 1000+ 题目时的查询性能
   - 多个 scope 过滤的性能

2. **并发审核**
   - 10个审核人同时审核
   - 无死锁和数据冲突

3. **权限验证性能**
   - 复杂权限规则下的查询性能

**性能目标**:
- 题库查询响应时间 < 500ms
- 审核操作响应时间 < 1s
- 权限验证 < 100ms

**验证标准**:
- ✅ 性能指标达标
- ✅ 无性能瓶颈

---

### 4.2 输出物

| 文件 | 说明 | 状态 |
|------|------|------|
| `tests/api/permissions.test.js` | API 单元测试 | ⏳ 待创建 |
| `tests/api/question-bank.test.js` | API 单元测试 | ⏳ 待创建 |
| `tests/e2e/question-bank-permission.spec.ts` | E2E 测试 | ⏳ 待创建 |
| `tests/docs/QBPM_test_tracking.md` | 测试追踪文档 | ⏳ 待创建 |
| `performance_test_report.md` | 性能测试报告 | ⏳ 待创建 |

---

## Phase 5: 文档与部署

**工期**: 1天
**负责人**: DevOps Team + Doc Team
**依赖**: Phase 4 完成

### 5.1 任务清单

#### Task 5.1.1: 文档更新 ⏰ 3小时

**更新文档列表**:

1. **API_Document.md**
   - 添加新增的 API 端点文档
   - 更新权限管理相关 API
   - 添加请求/响应示例

2. **DEVELOPMENT_STATUS.md**
   - 更新功能完成状态
   - 记录本次优化内容

3. **用户操作手册**
   - 创建 `USER_GUIDE_QUESTION_BANK_PERMISSION.md`
   - 管理员授权操作指南
   - 教师创建和审核操作指南

**验证标准**:
- ✅ 文档完整准确
- ✅ 示例代码可运行

---

#### Task 5.1.2: 数据迁移（生产环境） ⏰ 2小时

**迁移步骤**:

1. **在生产环境备份数据库**
```bash
pg_dump -U postgres guiyang_oj > backup_production_$(date +%Y%m%d_%H%M%S).sql
```

2. **执行迁移脚本**
```bash
psql -U postgres -d guiyang_oj < database/migrations/010_question_bank_permission_enhancement.sql
```

3. **验证数据完整性**
```sql
-- 验证权限数量
SELECT scope_level, COUNT(*) FROM teacher_permissions GROUP BY scope_level;

-- 验证题库分布
SELECT unnest(scope) as scope_type, COUNT(*) FROM question_bank GROUP BY unnest(scope);
```

4. **监控错误日志**
```bash
tail -f /var/log/postgresql/postgresql.log
```

**验证标准**:
- ✅ 迁移无错误
- ✅ 数据完整性验证通过
- ✅ 无用户投诉

---

#### Task 5.1.3: 部署到生产环境 ⏰ 2小时

**部署步骤**:

1. **重新构建 Docker 镜像**
```bash
# Backend
cd backend
docker build -t guiyang_oj_backend:v2.0 .

# Frontend
cd frontend
docker build -t guiyang_oj_frontend:v2.0 .
```

2. **更新 docker-compose.yml**
```yaml
services:
  backend:
    image: guiyang_oj_backend:v2.0
    # ...

  frontend:
    image: guiyang_oj_frontend:v2.0
    # ...
```

3. **部署到生产环境**
```bash
docker-compose down
docker-compose up -d
```

4. **健康检查**
```bash
curl http://localhost:3001/health
curl http://localhost:80
```

**验证标准**:
- ✅ 服务启动成功
- ✅ 健康检查通过
- ✅ 无错误日志

---

#### Task 5.1.4: 用户培训 ⏰ 2小时

**培训内容**:

1. **管理员培训**
   - 权限授予操作演示
   - 区级/市级权限的区别
   - 常见问题解答

2. **教师培训**
   - 题目创建流程演示
   - 不同题库的选择
   - 审核流程说明

**培训方式**:
- 线上视频会议
- 录制操作视频
- 提供 FAQ 文档

**验证标准**:
- ✅ 培训完成
- ✅ 用户反馈良好

---

### 5.2 输出物

| 文件 | 说明 | 状态 |
|------|------|------|
| `API_Document.md` | 更新的 API 文档 | ⏳ 待更新 |
| `DEVELOPMENT_STATUS.md` | 开发状态文档 | ⏳ 待更新 |
| `USER_GUIDE_QUESTION_BANK_PERMISSION.md` | 用户操作手册 | ⏳ 待创建 |
| `deployment_report.md` | 部署报告 | ⏳ 待创建 |
| `training_materials/` | 培训材料 | ⏳ 待创建 |

---

## 风险管理

### 潜在风险与应对措施

| 风险 | 等级 | 影响 | 应对措施 | 状态 |
|------|------|------|---------|------|
| **数据迁移失败** | 高 | 严重 | 1. 充分备份<br>2. 在测试环境多次验证<br>3. 准备回滚脚本 | ✅ 已准备 |
| **权限验证逻辑错误** | 高 | 严重 | 1. 完善单元测试<br>2. 多角色测试<br>3. Code Review | ⏳ 进行中 |
| **前端性能问题** | 中 | 一般 | 1. 虚拟滚动优化<br>2. 数据分页<br>3. 缓存机制 | ⏳ 待实施 |
| **用户接受度低** | 中 | 一般 | 1. 充分的用户培训<br>2. 详细的操作指南<br>3. 反馈渠道 | ⏳ 待实施 |
| **区级管理员权限混乱** | 中 | 一般 | 1. 自动关联区域<br>2. UI 限制操作范围<br>3. 后端验证 | ✅ 已设计 |

---

## 附录

### A. 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| **权限管理规范** | `documents/QUESTION_BANK_PERMISSION_MANAGEMENT.md` | 详细的业务规范 |
| **数据库迁移脚本** | `database/migrations/010_question_bank_permission_enhancement.sql` | 完整的迁移脚本 |
| **当前开发指南** | `CLAUDE.md` | 开发最佳实践 |
| **API 文档** | `documents/API_Document.md` | API 接口文档 |

---

### B. 关键配置

#### 权限类型定义

```javascript
const PERMISSION_TYPES = {
  ASSESSMENT_REVIEW: 'assessment_review',           // 测评审核
  PRACTICE_MUNICIPAL_REVIEW: 'practice_municipal_review', // 市级练习审核
  PRACTICE_DISTRICT_REVIEW: 'practice_district_review',  // 区级练习审核
  COMPETITION_REVIEW: 'competition_review'          // 竞赛审核（保留）
};
```

#### Scope 格式定义

```javascript
const SCOPE_FORMATS = {
  ASSESSMENT: 'assessment',                        // 测评题库
  PRACTICE_MUNICIPAL: 'practice_municipal',        // 市级练习
  PRACTICE_DISTRICT: 'practice_district_{code}',   // 区级练习 (如: practice_district_BY)
  PRACTICE_SCHOOL: 'practice_school_{id}'          // 校级练习 (如: practice_school_15)
};
```

---

### C. 常见问题 FAQ

**Q1: 区级管理员可以看到其他区的教师吗？**
A: 不可以。系统会自动过滤，只显示本区的教师。

**Q2: 教师可以同时拥有多个层级的审核权限吗？**
A: 可以。一个教师可以同时拥有测评审核、市级审核和区级审核权限。

**Q3: 校级题库的题目可以升级到区级或市级吗？**
A: 可以。教师可以将校级题目重新提交审核，审核通过后发布到更高层级的题库。

**Q4: 如果题目被拒绝，可以修改后重新提交吗？**
A: 可以。题目被拒绝后会返回草稿箱，教师可以修改后重新提交审核。

**Q5: 市级管理员可以查看所有区的题库吗？**
A: 可以。市级管理员和系统管理员可以查看和管理所有层级的题库。

---

**📅 文档最后更新**: 2025-11-03
**✅ 文档状态**: 已完成
**👤 文档维护人**: 开发团队
