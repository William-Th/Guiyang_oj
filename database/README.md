# 数据库脚本说明

本目录包含贵阳市小学生测评平台的数据库脚本文件。

## 📁 目录结构

```
database/
├── README.md                    # 本文件
├── schema.sql                   # 数据库结构定义
├── seed.sql                     # 基础种子数据
├── test_data/                   # 测试数据目录
│   └── question_bank.sql       # 题库测试数据（整合）
├── migrations/                  # 数据库迁移脚本
│   ├── 001_xxx.sql
│   └── ...
└── archived/                    # 已归档的旧脚本
    ├── create_baiyun_admin.sql
    ├── sample_data.sql
    ├── supplement_questions.sql
    ├── add_question_bank_data.sql
    └── insert_baiyun_questions.sql
```

## 🚀 快速开始

### 1️⃣ 首次部署（新数据库）

按照以下顺序执行脚本：

```bash
# 1. 创建数据库结构
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/schema.sql

# 2. 导入基础种子数据（区域、学校、用户、权限）
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/seed.sql

# 3. （可选）导入题库测试数据
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/test_data/question_bank.sql
```

### 2️⃣ 更新现有数据库

```bash
# 执行迁移脚本（按顺序）
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/migrations/001_xxx.sql
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/migrations/002_xxx.sql
```

## 📊 核心文件说明

### schema.sql
- **作用**: 定义完整的数据库表结构
- **包含**: 所有表、索引、约束、触发器
- **更新**: 新表/字段必须同步更新此文件
- **注意**: 每次迁移后必须更新此文件以保持最新状态

### seed.sql
- **作用**: 基础演示数据和系统初始化数据
- **包含**:
  - 区域数据（6个区 + 市教育局）
  - 学校数据（5所示例学校）
  - 用户数据：
    - 1个市级管理员
    - 6个区级管理员（云岩、南明、观山湖、白云、花溪、乌当）
    - 4个校级管理员
    - 18个教师（3区×3学段×2科目）
    - 3个学生
  - 权限配置
  - 示例活动
  - 成就系统数据（通过 \i 引用迁移文件）
- **密码**: 所有演示账号密码均为 `password123`

### test_data/question_bank.sql
- **作用**: 题库测试数据
- **包含**:
  - 市级练习题库：数学+信息科技（1-9年级）
  - 区级练习题库：补充题目
  - 白云区特色题库
  - 教师草稿题（用于练习）
- **总计**: 约329道题目
- **创建者**:
  - ID=1: 系统管理员（市级题库）
  - ID=9: 陈刚-白云一小（白云区数学）
  - ID=12: 王芳-白云一中（白云区信息科技）
  - ID=17: 周杰-南明一中（七年级数学草稿）
  - ID=22: 韩雪-云岩一小（七年级信息科技草稿）

## 🔐 演示账号

所有演示账号密码: `password123`

### 管理员账号

| 角色 | 用户名 | 姓名 | 权限范围 |
|------|--------|------|---------|
| 市级总管理员 | `admin` | 系统管理员 | 全市 |
| 云岩区管理员 | `yunyan_admin` | 云岩区管理员 | 云岩区 |
| 南明区管理员 | `nanming_admin` | 南明区管理员 | 南明区 |
| 观山湖区管理员 | `guanshanhu_admin` | 观山湖区管理员 | 观山湖区 |
| 白云区管理员 | `baiyun_admin` | 白云区管理员 | 白云区 |
| 花溪区管理员 | `huaxi_admin` | 花溪区管理员 | 花溪区 |
| 乌当区管理员 | `wudang_admin` | 乌当区管理员 | 乌当区 |

### 教师账号（部分）

| 用户名 | 姓名 | 学校 | 科目 |
|--------|------|------|------|
| `teacher_by_ps_math` | 陈刚 | 白云一小 | 数学 |
| `teacher_by_ps_it` | 李敏 | 白云一小 | 信息科技 |
| `teacher_nm_ms_math` | 周杰 | 南明一中 | 数学 |
| `teacher_yy_ps_it` | 韩雪 | 云岩一小 | 信息科技 |
| ... | ... | ... | ... |

### 学生账号

学生使用身份证号登录：
- `520102200801011234`
- `520102200802012345`
- `520102200803013456`

## 🗂️ 归档文件说明

`archived/` 目录包含已整合的旧脚本文件，保留供参考：

- **create_baiyun_admin.sql**: 已整合到 seed.sql
- **sample_data.sql**: 混杂数据，部分已整合
- **supplement_questions.sql**: 已整合到 question_bank.sql
- **add_question_bank_data.sql**: 已整合到 question_bank.sql
- **insert_baiyun_questions.sql**: 已整合到 question_bank.sql

## 📝 数据维护规范

### 新增数据表

1. 在 `migrations/` 创建迁移文件（如 `003_add_new_table.sql`）
2. 执行迁移脚本
3. **重要**: 同步更新 `schema.sql`，保持其为最新完整结构
4. 如需演示数据，更新 `seed.sql`

### 新增测试数据

- 题库数据 → 更新 `test_data/question_bank.sql`
- 基础演示数据 → 更新 `seed.sql`

### Git 提交规范

```bash
# 提交新迁移
git add database/migrations/003_xxx.sql database/schema.sql
git commit -m "feat: add new table xxx"

# 提交测试数据
git add database/test_data/
git commit -m "test: add question bank data"
```

## ❓ 常见问题

### Q: 如何重置数据库？

```bash
# 停止服务
docker-compose down

# 删除数据卷
docker volume rm guiyang_oj_postgres_data

# 重新启动并导入数据
docker-compose up -d
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/schema.sql
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/seed.sql
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj < database/test_data/question_bank.sql
```

### Q: 如何备份数据库？

```bash
# 完整备份
docker exec guiyang_oj_postgres pg_dump -U postgres guiyang_oj > backup_$(date +%Y%m%d_%H%M%S).sql

# 仅备份数据（不含结构）
docker exec guiyang_oj_postgres pg_dump -U postgres --data-only guiyang_oj > data_backup.sql
```

### Q: 如何验证数据导入？

```bash
# 查询用户数量
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "SELECT role, COUNT(*) FROM users GROUP BY role;"

# 查询题目数量
docker exec -i guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "SELECT subject, COUNT(*) FROM question_bank GROUP BY subject;"
```

## 📅 更新日志

- **2025-11-21**: 重新整理测试数据结构
  - 整合题库文件到 `test_data/question_bank.sql`
  - 补全所有6个区的区级管理员到 seed.sql
  - 归档旧的测试数据文件
  - 创建本 README 文档

---

**维护**: 开发团队
**最后更新**: 2025-11-21
