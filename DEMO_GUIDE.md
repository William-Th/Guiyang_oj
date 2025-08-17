# 贵阳小学生测评平台演示指南

## 🎯 平台概述

贵阳小学生测评平台是一个专为小学生设计的在线考试系统，支持多种题型、自动评分和成绩管理。本平台采用现代化架构，确保系统稳定性和用户体验。

## 🚀 快速启动

### 环境要求
- Docker 和 Docker Compose
- 8GB 以上内存
- 20GB 可用磁盘空间

### 启动步骤
```bash
# 1. 启动所有服务
docker-compose up -d

# 2. 查看服务状态
docker-compose ps

# 3. 查看服务日志
docker-compose logs -f
```

### 访问地址
- **前端界面**: http://localhost:3000 或 http://localhost:80
- **后端API**: http://localhost:3001
- **数据库管理**: http://localhost:5050 (pgAdmin)
- **健康检查**: http://localhost:3001/health

## 👥 演示账号

### 管理员账号
- **用户名**: `admin`
- **密码**: `password123`
- **权限**: 系统管理、用户管理、考试管理、题库管理

### 教师账号
- **用户名**: `teacher01`
- **密码**: `password123`
- **权限**: 考试管理、题库管理、成绩查看

### 学生账号
- **身份证号**: `520102200801011234`
- **密码**: `password123`
- **权限**: 参加考试、查看成绩

## 📚 核心功能演示

### 1. 用户登录与身份验证

#### 学生登录
1. 访问 http://localhost:3000
2. 选择"学生登录"
3. 输入身份证号：`520102200801011234`
4. 输入密码：`password123`
5. 点击登录

#### 教师/管理员登录
1. 访问 http://localhost:3000
2. 选择"教师登录"
3. 输入用户名：`admin` 或 `teacher01`
4. 输入密码：`password123`
5. 点击登录

### 2. 题库管理系统 (新功能) ⭐

#### 2.1 查看题库
```bash
# 通过API查看所有题目
curl -H "Authorization: Bearer [TOKEN]" \
  http://localhost:3001/api/question-bank/bank
```

#### 2.2 支持的题型
- **单选题 (single)**: 四选一选择题
- **多选题 (multiple)**: 可选择多个正确答案
- **填空题 (blank)**: 填写关键词或短语
- **判断题 (true_false)**: 对错判断
- **简答题 (essay)**: 需要人工评阅
- **编程题 (code)**: 代码编写题
- **匹配题 (matching)**: 项目匹配

#### 2.3 创建新题目
```bash
# 创建单选题示例
curl -X POST http://localhost:3001/api/question-bank/bank \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "single",
    "subject": "math",
    "grade": "二年级",
    "content": "7 + 5 = ?",
    "options": ["10", "11", "12", "13"],
    "correct_answer": "12",
    "score": 2,
    "difficulty": "easy",
    "explanation": "7加5等于12",
    "tags": ["加法", "基础运算"]
  }'
```

#### 2.4 题目筛选和搜索
```bash
# 按学科筛选
curl -H "Authorization: Bearer [TOKEN]" \
  "http://localhost:3001/api/question-bank/bank?subject=math&grade=二年级"

# 搜索题目内容
curl -H "Authorization: Bearer [TOKEN]" \
  "http://localhost:3001/api/question-bank/bank/search?q=加法"
```

### 3. 考试管理

#### 3.1 教师创建考试
1. 以教师身份登录
2. 进入"考试管理"
3. 点击"创建新考试"
4. 填写考试信息：
   - 考试名称：期中数学测试
   - 科目：数学
   - 年级：二年级
   - 开始时间：选择合适时间
   - 考试时长：60分钟
   - 总分：100分
5. 从题库选择题目
6. 发布考试

#### 3.2 学生参加考试
1. 以学生身份登录
2. 在"考试大厅"查看可参加的考试
3. 点击"开始考试"
4. 系统会显示考试规则和注意事项
5. 确认后进入答题界面
6. 完成答题后提交

#### 3.3 多种题型答题演示

**单选题界面**:
```
题目: 5 + 3 = ?
○ A. 6
● B. 8  (已选择)
○ C. 7
○ D. 9
```

**多选题界面**:
```
题目: 以下哪些是形容词？
☑ A. 红色  (已选择)
☐ B. 跑步
☑ C. 美丽  (已选择)
☑ D. 快速  (已选择)
```

**判断题界面**:
```
题目: 太阳从西边升起
○ 对
● 错  (已选择)
```

**填空题界面**:
```
题目: 中国的首都是 _______
[北京        ]  (输入框)
```

### 4. 自动评分系统

#### 4.1 客观题自动评分
- 单选题、多选题、判断题、填空题支持自动评分
- 系统会立即显示得分和正确答案
- 错题会显示详细解析

#### 4.2 成绩统计
- 实时生成成绩报告
- 按题型统计正确率
- 生成错题分析报告

### 5. 成绩管理与查询

#### 5.1 学生查看成绩
1. 登录学生账号
2. 进入"我的成绩"
3. 查看详细成绩报告：
   - 总分和得分
   - 各题型得分情况
   - 错题解析
   - 成绩排名

#### 5.2 教师查看班级成绩
1. 登录教师账号
2. 进入"成绩管理"
3. 选择特定考试
4. 查看班级整体情况：
   - 平均分
   - 最高分/最低分
   - 各题正确率统计
   - 导出成绩单

## 🔧 系统架构展示

### 数据库结构
```sql
-- 用户表
users (id, username, password, role, real_name, id_card)

-- 题库表 (新增) ⭐
question_bank (id, type, subject, grade, content, options, correct_answer, difficulty, tags)

-- 考试表
exams (id, title, subject, grade, start_time, end_time, duration, total_score)

-- 考试题目关联表 (新增) ⭐
exam_questions (id, exam_id, question_bank_id, order_no, score)

-- 学生考试记录
student_exams (id, student_id, exam_id, status, start_time, submit_time, score)

-- 答题记录
answers (id, student_exam_id, question_id, answer, is_correct, score)
```

### API 接口展示

#### 题库管理API (新增功能) ⭐
```bash
# 获取题库列表
GET /api/question-bank/bank

# 创建新题目
POST /api/question-bank/bank

# 更新题目
PUT /api/question-bank/bank/:id

# 删除题目
DELETE /api/question-bank/bank/:id

# 搜索题目
GET /api/question-bank/bank/search?q=关键词

# 获取题目分类
GET /api/question-bank/categories
```

#### 考试管理API
```bash
# 获取考试列表
GET /api/exams

# 创建考试
POST /api/exams

# 获取考试题目
GET /api/question-bank/exam/:examId/questions

# 添加题目到考试
POST /api/question-bank/exam/:examId/questions
```

## 📊 现有演示数据

### 语文期中考试
- 题目1: 字音辨析 (单选题)
- 题目2: 古诗词理解 (单选题)  
- 题目3: 春天相关词汇 (多选题)

### 数学期中考试
- 题目1: 基础加法 (3 + 5)
- 题目2: 应用题 (苹果问题)
- 题目3: 几何题 (正方形周长)

### 科学测验
- 题目1: 植物生长条件
- 题目2: 哺乳动物识别

### 题库新增样例数据 ⭐
```json
[
  {
    "type": "single",
    "subject": "math",
    "content": "5 + 3 = ?",
    "options": ["6", "7", "8", "9"],
    "correct_answer": "8",
    "explanation": "5加3等于8，这是基本的加法运算"
  },
  {
    "type": "multiple", 
    "subject": "chinese",
    "content": "以下哪些是形容词？",
    "options": ["红色", "跑步", "美丽", "快速"],
    "correct_answer": ["红色", "美丽", "快速"],
    "explanation": "红色、美丽、快速都是形容词，跑步是动词"
  },
  {
    "type": "true_false",
    "subject": "science", 
    "content": "太阳从西边升起",
    "correct_answer": false,
    "explanation": "太阳从东边升起，西边落下"
  }
]
```

## 📈 系统性能指标

### 已测试功能 ✅
- **并发支持**: 支持多用户同时访问
- **响应时间**: API响应时间 < 500ms
- **数据库**: PostgreSQL 稳定运行
- **认证系统**: JWT Token 正常工作

### 健康检查
```bash
# 检查系统状态
curl http://localhost:3001/health

# 预期响应
{
  "status": "OK",
  "timestamp": "2024-08-17T06:20:43.772Z",
  "version": "1.0.0",
  "environment": "development", 
  "database": "connected",
  "uptime": 10.378
}
```

## 🔒 安全特性

### 身份验证
- JWT Token 认证
- 角色权限控制 (学生/教师/管理员)
- 密码bcrypt加密存储

### 数据安全
- SQL参数化查询防注入
- CORS跨域保护
- 环境变量配置敏感信息

### 考试安全
- 考试时间限制
- 答案加密传输
- IP地址记录

## 🎨 用户界面特色

### 适合小学生的设计
- **大字体**: 便于阅读
- **明亮色彩**: 温馨友好
- **简单操作**: 减少复杂步骤
- **图标引导**: 直观易懂

### 响应式设计
- 支持电脑、平板访问
- 自适应屏幕尺寸
- 触屏友好操作

## 🎪 15分钟完整演示流程

### 1. 系统启动演示 (2分钟)
```bash
# 展示启动过程
docker-compose up -d

# 检查服务状态
docker-compose ps

# 健康检查
curl http://localhost:3001/health
```

### 2. 管理员功能演示 (5分钟)
1. **登录管理员**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password123"}'
   ```

2. **题库管理**
   ```bash
   # 查看现有题目
   curl -H "Authorization: Bearer [TOKEN]" \
     http://localhost:3001/api/question-bank/bank
   
   # 创建新题目
   curl -X POST http://localhost:3001/api/question-bank/bank \
     -H "Authorization: Bearer [TOKEN]" \
     -H "Content-Type: application/json" \
     -d '{...题目数据...}'
   ```

3. **按条件筛选题目**
   ```bash
   # 按学科筛选
   curl -H "Authorization: Bearer [TOKEN]" \
     "http://localhost:3001/api/question-bank/bank?subject=math"
   ```

### 3. 教师功能演示 (4分钟)
1. 切换到教师账号
2. 从题库选择题目创建考试
3. 查看学生考试情况
4. 导出成绩报告

### 4. 学生体验演示 (3分钟)
1. 学生身份证登录
2. 参加包含多种题型的考试
3. 查看即时成绩和解析

### 5. 技术架构展示 (1分钟)
- 数据库表结构
- API接口调用
- 系统监控指标

## 💡 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 查看数据库日志
docker-compose logs postgres

# 重启数据库
docker-compose restart postgres
```

#### 2. 前端无法访问
```bash
# 检查前端日志
docker-compose logs frontend

# 检查Nginx配置
docker-compose logs nginx
```

#### 3. API接口错误
```bash
# 查看后端日志
docker-compose logs backend

# 检查健康状态
curl http://localhost:3001/health
```

### 重置演示数据
```bash
# 完全重置
docker-compose down
docker volume rm guiyang_oj_postgres_data
docker-compose up -d
```

### 查看详细日志
```bash
# 所有服务日志
docker-compose logs -f

# 特定服务日志
docker-compose logs -f backend
```

## 📊 数据库访问

### pgAdmin管理界面
- **URL**: http://localhost:5050
- **邮箱**: admin@guiyang.edu
- **密码**: admin123

### 直接数据库连接
- **主机**: localhost
- **端口**: 5432
- **数据库**: guiyang_oj
- **用户名**: postgres
- **密码**: postgres123

## 🔄 开发进度展示

### 已完成功能 ✅
- [x] 用户认证系统
- [x] 多题型支持 (7种题型) ⭐
- [x] 题库管理系统 ⭐
- [x] 题目复用和筛选 ⭐
- [x] 考试创建和管理
- [x] 自动评分系统
- [x] 成绩查询和统计
- [x] 角色权限管理
- [x] 数据库架构优化 ⭐

### 演示重点功能 🎯
1. **多题型题库**: 7种题型统一管理
2. **题目复用**: 同一题目可用于多个考试
3. **智能筛选**: 按科目、年级、难度筛选
4. **API完整性**: 完整的CRUD操作
5. **数据验证**: 严格的题目格式验证

### 临时限制 ⚠️
- 题目批量导入功能 (Excel/CSV) 暂时禁用
- 前端题库管理界面待开发

### 下一阶段计划 🚀
- [ ] 前端题库管理界面
- [ ] 题目批量导入功能
- [ ] 更丰富的统计分析
- [ ] 移动端适配优化

## 📞 技术支持

- **项目地址**: GitHub Repository
- **技术文档**: 查看项目根目录技术文档
- **问题反馈**: 通过GitHub Issues提交

---

*🎓 欢迎体验贵阳小学生测评平台！本演示指南随开发进度持续更新。*