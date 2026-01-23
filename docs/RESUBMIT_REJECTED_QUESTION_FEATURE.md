# 被拒绝题目重新提交功能

## 功能概述

当教师提交的题目被审核人拒绝后，教师可以编辑题目并重新提交审核。系统会更新已有的拒绝记录为待审核状态，而非创建新的提交记录。

## 业务流程

```
┌─────────────┐
│ 创建题目草稿  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ 提交审核     │────▶│ 审核中       │
└──────┬──────┘     └──────┬──────┘
       │                    │
       │                    ▼
       │              ┌─────────────┐
       │              │ 审核通过     │
       │              └─────────────┘
       │
       ▼
┌─────────────┐
│ 审核拒绝     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ 我的提交页面        │
│ - 查看"已拒绝"状态  │
│ - 点击"修改"按钮    │◄────编辑题目内容
│ - 点击"重新提交"    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 重新提交审核模态框   │
│ - 显示拒绝原因       │
│ - 选择目标范围       │
│ - 选择审核人         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 更新记录状态         │
│ inactive→           │
│ pending_review      │
└─────────────────────┘
```

## 操作流程

1. **在"我的提交"页面查看被拒绝的记录**
   - 记录状态显示为"已拒绝"（红色标签）
   - 可以看到拒绝原因和审核人信息

2. **点击"修改"按钮编辑题目内容**
   - 跳转到题目编辑页面
   - 修改题目内容后保存

3. **点击"重新提交"按钮**
   - 返回"我的提交"页面
   - 点击被拒绝记录的"重新提交"按钮
   - 打开重新提交审核模态框

4. **选择新的审核人和目标范围**
   - 显示上次拒绝原因（提醒）
   - 选择目标题库范围（可更改）
   - 选择审核人（根据范围和科目动态加载）
   - 提交审核

## 前端实现

### MySubmissionsPage.tsx 新增功能

#### 1. 状态变量

```typescript
// 重新提交审核相关状态
const [resubmitModalVisible, setResubmitModalVisible] = useState(false);
const [selectedSubmission, setSelectedSubmission] = useState<Question | null>(null);
const [availableReviewers, setAvailableReviewers] = useState<Reviewer[]>([]);
const [selectedReviewer, setSelectedReviewer] = useState<number | null>(null);
const [selectedScope, setSelectedScope] = useState<string>('');
const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');
const [submitting, setSubmitting] = useState(false);
```

#### 2. 重新提交处理函数

```typescript
// 打开重新提交模态框
const handleResubmitClick = (submission: Question) => {
  setSelectedSubmission(submission);
  const scope = submission.scope || 'assessment';
  setSelectedScope(scope.startsWith('practice_district_') ? 'practice_district' : scope);

  if (scope.startsWith('practice_district_')) {
    const districtCode = scope.replace('practice_district_', '');
    setSelectedDistrictCode(districtCode);
  } else {
    setSelectedDistrictCode('');
  }
  setResubmitModalVisible(true);
};

// 处理重新提交
const handleResubmit = async () => {
  // 验证输入
  if (!selectedReviewer || !selectedScope || !selectedSubmission) {
    message.warning('请选择审核人');
    return;
  }

  // 构造完整的scope字符串
  let finalScope = selectedScope;
  if (selectedScope === 'practice_district' && selectedDistrictCode) {
    finalScope = buildDistrictScope(selectedDistrictCode);
  }

  // 调用API
  await questionReviewApi.submitForReview(
    selectedSubmission.draft_id,
    selectedReviewer,
    finalScope
  );

  message.success('重新提交审核成功');
  setResubmitModalVisible(false);
  loadSubmissions(); // 刷新列表
};
```

#### 3. 操作列按钮

```tsx
{(record.status === 'inactive' || record.status === 'rejected') && (
  <>
    <Tooltip title="修改题目内容">
      <Button onClick={() => handleEditRejected(record)}>修改</Button>
    </Tooltip>
    <Tooltip title="重新提交审核">
      <Button type="primary" icon={<SendOutlined />} onClick={() => handleResubmitClick(record)}>
        重新提交
      </Button>
    </Tooltip>
  </>
)}
```

#### 4. 重新提交模态框

```tsx
<Modal
  title="重新提交审核"
  open={resubmitModalVisible}
  onOk={handleResubmit}
  onCancel={() => setResubmitModalVisible(false)}
  confirmLoading={submitting}
  width={600}
>
  {selectedSubmission && (
    <div>
      {/* 上次拒绝原因提示 */}
      {selectedSubmission.review_comment && (
        <Alert message="上次拒绝原因" description={selectedSubmission.review_comment} type="warning" />
      )}

      {/* 目标题库显示 */}
      <p><strong>目标题库：</strong><Tag>{getScopeDisplayText(selectedSubmission.scope)}</Tag></p>

      {/* 选择目标范围 */}
      <Select value={selectedScope} onChange={setSelectedScope} ...>
        <Select.Option value="assessment">测评题库</Select.Option>
        <Select.Option value="practice_municipal">市级练习题库</Select.Option>
        <Select.Option value="practice_district">区级练习题库</Select.Option>
      </Select>

      {/* 选择审核人 */}
      <Select value={selectedReviewer} onChange={setSelectedReviewer} ...>
        {availableReviewers.map(reviewer => (
          <Select.Option key={reviewer.id} value={reviewer.id}>
            {reviewer.real_name}
          </Select.Option>
        ))}
      </Select>
    </div>
  )}
</Modal>
```

## 后端实现

### 提交审核API（支持重新提交）

**路由**: `POST /api/question-review/:id/submit`

**文件**: `backend/src/routes/questionReview.js`

**核心逻辑**:

```javascript
// 检查是否已经提交到该范围
const checkResult = await query(checkSql, [id, target_scope]);

if (checkResult.rows.length > 0) {
  const existingRecord = checkResult.rows[0];

  // 如果是已拒绝(inactive)的记录，允许重新提交（更新已有记录）
  if (existingRecord.status === 'inactive') {
    const updateSql = `
      UPDATE question_bank
      SET status = 'pending_review',
          reviewer_id = $1,
          review_comment = NULL,
          reviewed_at = NULL,
          published_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `已重新提交审核到 ${target_scope}`,
      resubmitted: true
    });
    return;
  }

  // 其他状态则不允许重新提交
  return res.status(400).json({
    success: false,
    error: statusMessages[existingRecord.status]
  });
}
```

## 相关文件清单

### 后端文件
- `backend/src/routes/questionReview.js` - 提交审核API，支持重新提交

### 前端文件
- `frontend/src/pages/teacher/MySubmissionsPage.tsx` - 我的提交页面，添加重新提交功能
- `frontend/src/pages/teacher/QuestionFormPage.tsx` - 编辑页面，保持纯粹的编辑功能
- `frontend/src/services/api.ts` - API服务方法

### 文档
- `docs/DEVELOPMENT_STATUS.md` - 开发状态追踪

## 测试要点

### 功能测试
1. 创建题目 → 提交审核 → 拒绝 → 查看我的提交 → 点击修改 → 编辑内容 → 保存
2. 修改完成后，点击"重新提交"按钮
3. 验证模态框显示拒绝原因
4. 验证可以选择新的审核人和目标范围
5. 验证重新提交后记录状态更新为`pending_review`

### 边界情况
- 已通过(`published`)的提交不显示"重新提交"按钮
- 待审核(`pending_review`)的提交不显示"重新提交"按钮
- 只有被拒绝(`inactive`/`rejected`)的提交显示"重新提交"按钮

## 版本历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-01-21 | 1.0 | 初始版本，在编辑页面实现重新提交功能 |
| 2025-01-21 | 2.0 | 调整UI位置，将重新提交按钮移至"我的提交"表格的操作列中 |
