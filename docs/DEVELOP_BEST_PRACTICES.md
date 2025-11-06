# 开发最佳实践文档 (Development Best Practices)

本文档总结了贵阳市小学生测评平台开发过程中积累的最佳实践经验，包括前端、后端、测试、Docker部署等各方面的实战经验和问题解决模式。

**最后更新**: 2025-10-30

---

## 目录

1. [测试认证状态管理](#测试认证状态管理)
2. [权限系统设计与调试](#权限系统设计与调试)
3. [React组件设计与UI一致性](#react组件设计与ui一致性)
4. [Docker开发工作流](#docker开发工作流)
5. [全栈问题调试策略](#全栈问题调试策略)
6. [Playwright E2E测试最佳实践](#playwright-e2e测试最佳实践)
7. [React Router与权限集成](#react-router与权限集成)
8. [代码审查清单](#代码审查清单)
9. [常见问题速查](#常见问题速查)

---

## 测试认证状态管理

### 问题场景: Playwright Storage State 为空

**问题现象**:
- 运行Playwright测试时，`tests/.auth/admin.json` 文件为空
- 测试失败，提示无权限或未认证
- 手动登录可以成功，但测试无法复用认证状态

**根本原因**:
Playwright 的 `storageState()` API 在保存认证状态时，localStorage 尚未被 React 应用填充。这是一个**时序问题**。

```typescript
// ❌ 错误做法 - 立即保存状态，localStorage 可能为空
await page.fill('input[name="username"]', 'admin');
await page.fill('input[name="password"]', 'password123');
await page.click('button[type="submit"]');
await page.waitForURL(/\/(admin\/home)?/);
await page.context().storageState({ path: ADMIN_STORAGE_STATE }); // ❌ 太早了！
```

**正确解决方案**:

```typescript
// ✅ 正确做法 - 等待 localStorage 被填充后再保存
await page.fill('input[name="username"]', 'admin');
await page.fill('input[name="password"]', 'password123');
await page.click('button[type="submit"]');
await page.waitForURL(/\/(admin\/home)?/, { timeout: 15000 });

// 关键步骤: 等待 localStorage 被填充
await page.waitForFunction(() => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return token !== null && user !== null;
}, { timeout: 5000 });

// 验证认证数据的有效性
const hasAuthData = await page.evaluate(() => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (!token || !userStr) return false;

  try {
    const user = JSON.parse(userStr);
    return user && user.role && user.username === 'admin';
  } catch {
    return false;
  }
});

if (!hasAuthData) {
  throw new Error('Admin authentication failed - localStorage not populated');
}

// 现在安全地保存状态
await page.context().storageState({ path: ADMIN_STORAGE_STATE });
```

**关键要点**:
1. **等待 localStorage 填充**: 使用 `waitForFunction()` 确保数据已写入
2. **验证数据有效性**: 不仅检查存在性，还要检查数据格式正确
3. **提供明确错误**: 失败时抛出清晰的错误信息，便于调试
4. **设置合理超时**: localStorage 填充通常很快，5秒超时足够

**文件位置**: `tests/e2e/auth.setup.ts:74-96`

**修复记录**: 2025-10-25 - ACT130/ACT131 测试修复

---

## 权限系统设计与调试

### 前端与后端权限检查的协同

**设计原则**: 前端权限检查用于**UI控制**，后端权限检查用于**安全保障**。两者必须保持一致。

#### 前端权限检查

```typescript
// frontend/src/pages/teacher/ActivityFormPage.tsx:164-167

const canCreateAssessment = () => {
  // 使用 .includes() 匹配所有包含 "admin" 的角色
  return user?.role && user.role.includes('admin');
};
```

**优点**:
- 简洁易读，易于维护
- 自动匹配所有管理员角色: `system_admin`, `district_admin`, `school_admin`, etc.
- 前端UI响应快，用户体验好

**缺点**:
- 不能作为唯一的安全措施（可被绕过）
- 需要与后端保持同步

#### 后端权限检查

```javascript
// backend/src/middleware/activityPermission.js:34-40

const ASSESSMENT_ALLOWED_ROLES = [
  'system_admin',        // System administrator (highest level)
  'district_admin',
  'base_school_admin',
  'municipal_school_admin',
  'municipal_admin'
];

function canCreateActivity(user, activityType) {
  if (!user || !user.role) {
    return false;
  }

  if (activityType === 'assessment') {
    return ASSESSMENT_ALLOWED_ROLES.includes(user.role);
  }

  if (activityType === 'practice') {
    return PRACTICE_ALLOWED_ROLES.includes(user.role);
  }

  return false;
}
```

**优点**:
- 精确控制，显式列出允许的角色
- 安全可靠，无法被前端绕过
- 便于审计和权限管理

**缺点**:
- 需要手动维护角色列表
- 添加新角色时必须同步更新

### 常见陷阱: 角色列表不完整

**问题场景**:
- 前端显示创建按钮（权限检查通过）
- 点击后后端返回 403 Forbidden
- 用户看到"无权限"错误页面

**根本原因**: 后端 `ASSESSMENT_ALLOWED_ROLES` 缺少 `system_admin` 角色

```javascript
// ❌ 错误配置 - 缺少 system_admin
const ASSESSMENT_ALLOWED_ROLES = [
  'district_admin',
  'base_school_admin',
  'municipal_school_admin',
  'municipal_admin'
];

// ✅ 正确配置 - 包含所有管理员角色
const ASSESSMENT_ALLOWED_ROLES = [
  'system_admin',        // ← 不要遗漏！
  'district_admin',
  'base_school_admin',
  'municipal_school_admin',
  'municipal_admin'
];
```

**调试步骤**:
1. 检查前端权限检查逻辑（`user.role.includes('admin')`）
2. 检查后端角色列表（`ASSESSMENT_ALLOWED_ROLES`）
3. 验证数据库中用户的实际角色（`SELECT role FROM users WHERE username = 'admin'`）
4. 确保三者一致

**最佳实践**:
- 前端和后端权限逻辑应在代码审查时一起检查
- 添加单元测试验证所有角色的权限
- 在文档中明确记录每个角色的权限范围

**文件位置**:
- 前端: `frontend/src/pages/teacher/ActivityFormPage.tsx:164-167`
- 后端: `backend/src/middleware/activityPermission.js:34-62`

### 角色权限与UI一致性

#### 问题：不同角色UI体验不一致

在多角色系统中，不同角色看到的UI界面可能不一致，导致用户体验差异大和维护困难。

**典型问题场景**:
- ❌ 教师登录后没有导航菜单，只能通过直接URL访问页面
- ❌ 用户体验不一致，教师需要记住URL或使用浏览器书签
- ❌ E2E测试使用直接URL跳转，隐藏了导航菜单缺失的问题
- ❌ 难以发现问题：直接URL跳转的测试会通过

#### 正确实践：统一的导航体验

所有角色都应该有清晰的导航菜单，根据角色权限显示不同的菜单选项。

```tsx
// frontend/src/components/layout/MainLayout.tsx - 示例

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  // 检查管理员角色
  const isAdmin = () => {
    const adminRoles = ['school_admin', 'district_admin', 'system_admin'];
    return user && adminRoles.includes(user.role);
  };

  // 检查教师角色
  const isTeacher = () => {
    return user && user.role === 'teacher';
  };

  // 管理员导航菜单
  const adminMenuItems: MenuProps['items'] = [
    { key: '/admin/home', icon: <HomeOutlined />, label: '首页' },
    { key: '/admin/assessments', icon: <ProjectOutlined />, label: '测评管理' },
    { key: '/admin/question-bank', icon: <BookOutlined />, label: '题库管理' },
    { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
  ];

  // 教师导航菜单
  const teacherMenuItems: MenuProps['items'] = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/teacher/activities', icon: <ProjectOutlined />, label: '练习管理' },
    { key: '/teacher/question-bank', icon: <BookOutlined />, label: '题库管理' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <div>贵阳市小学生测评平台</div>

        {/* 管理员导航菜单 */}
        {isAdmin() && (
          <Menu
            mode="horizontal"
            items={adminMenuItems}
            onClick={(e) => navigate(e.key)}
            theme="dark"
          />
        )}

        {/* 教师导航菜单 */}
        {isTeacher() && (
          <Menu
            mode="horizontal"
            items={teacherMenuItems}
            onClick={(e) => navigate(e.key)}
            theme="dark"
          />
        )}

        <UserDropdown />
      </Header>
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
};
```

#### UI一致性核心原则

1. **统一的导航体验** - 所有角色都应该有清晰的导航菜单
2. **角色适配的菜单项** - 根据角色权限显示不同的菜单选项
3. **相似的布局结构** - Header、Content、Footer 结构保持一致
4. **状态同步** - 导航菜单高亮与当前路径同步
5. **可发现性** - 用户应该能够通过UI发现所有功能，不应该要求用户记住URL

#### 实际案例：教师导航菜单缺失修复

**问题发现过程**:
1. 原始测试使用 `page.goto('/teacher/question-bank')` 直接跳转
2. 测试通过 ✅，但隐藏了导航菜单缺失的问题
3. 改用点击导航：`await page.click('a:has-text("题库管理")')`
4. 测试失败 ❌：`TimeoutError: waiting for locator('a:has-text("题库管理")')`
5. 发现问题：教师角色没有导航菜单

**修复步骤**:
1. 在 `MainLayout.tsx` 中添加 `isTeacher()` 函数
2. 定义 `teacherMenuItems` 菜单配置
3. 添加菜单选中状态同步逻辑
4. 在 Header 中添加教师导航菜单渲染
5. 重新构建 Docker 前端容器

**修复后效果**:
- ✅ 教师登录后看到"首页"、"练习管理"、"题库管理"菜单
- ✅ 菜单项与当前页面同步高亮
- ✅ 用户体验与管理员一致
- ✅ E2E测试通过

**文件位置**: `frontend/src/components/layout/MainLayout.tsx`

---

## React组件设计与UI一致性

### 布局组件的职责划分

**MainLayout 组件应该负责**:
- ✅ 顶部导航栏（Header）
- ✅ 主内容区域（Content）
- ✅ 底部信息栏（Footer）
- ✅ 全局状态访问（用户信息、权限）
- ✅ 路由导航逻辑

**MainLayout 不应该负责**:
- ❌ 具体业务逻辑
- ❌ 数据加载和处理
- ❌ 复杂的状态管理

### 组件拆分原则

```tsx
// ✅ 好的实践：拆分为独立组件
// components/layout/MainLayout.tsx
import UserDropdown from './UserDropdown';
import NavigationMenu from './NavigationMenu';

const MainLayout: React.FC = () => {
  return (
    <Layout>
      <Header>
        <Logo />
        <NavigationMenu />
        <UserDropdown />
      </Header>
      <Content>
        <Outlet />
      </Content>
      <Footer />
    </Layout>
  );
};

// components/layout/NavigationMenu.tsx
const NavigationMenu: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  if (isAdmin(user)) return <AdminMenu />;
  if (isTeacher(user)) return <TeacherMenu />;
  if (isStudent(user)) return <StudentMenu />;

  return null;
};
```

### TypeScript 类型定义最佳实践

```tsx
// ✅ 定义清晰的类型
import type { MenuProps } from 'antd';

interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  children?: MenuItem[];
}

interface UserInfo {
  id: number;
  username: string;
  realName: string;
  role: 'student' | 'teacher' | 'school_admin' | 'system_admin';
  permissions?: string[];
}

// ✅ 使用类型守卫
const isAdmin = (user: UserInfo | null): user is UserInfo => {
  if (!user) return false;
  const adminRoles = ['school_admin', 'district_admin', 'system_admin'];
  return adminRoles.includes(user.role);
};

const isTeacher = (user: UserInfo | null): user is UserInfo => {
  return user !== null && user.role === 'teacher';
};
```

**TypeScript 最佳实践**:
1. **明确的类型定义** - 为所有接口和函数定义类型
2. **类型守卫** - 使用类型守卫提供类型安全
3. **避免 any** - 尽量避免使用 `any` 类型
4. **导出类型** - 将常用类型导出供其他模块使用

---

## Docker开发工作流

### 何时需要重建容器

**关键原则**: 代码变更后，必须重建 Docker 镜像才能生效。

#### 需要重建的情况

| 变更类型 | 是否需要重建 | 命令 |
|---------|------------|------|
| 前端代码 (src/) | ✅ 是 | `docker-compose up --build -d frontend` |
| 后端代码 (src/) | ✅ 是 | `docker-compose up --build -d backend` |
| package.json | ✅ 是 | `docker-compose up --build -d [service]` |
| Dockerfile | ✅ 是 | `docker-compose up --build -d [service]` |
| docker-compose.yml | ✅ 是 | `docker-compose up --build -d` |
| 数据库 schema | ❌ 否 | 运行迁移脚本即可 |
| 配置文件 (.env) | ⚠️ 视情况 | 重启即可，或重建更保险 |

#### 正确的重建流程

```bash
# 1. 修改代码 (例如: backend/src/middleware/activityPermission.js)

# 2. 重建受影响的服务
docker-compose up --build -d backend

# 3. 等待服务启动 (约10-30秒)
sleep 15

# 4. 验证服务状态
docker-compose ps

# 5. 检查日志确认无错误
docker-compose logs backend --tail 50

# 6. 验证服务可访问
curl http://localhost:3001/health

# 7. 运行测试
npx playwright test tests/e2e/regression/activity-management.spec.ts -c tests/playwright.config.ts
```

#### 常见错误

```bash
# ❌ 错误 1: 只重启不重建 (代码变更不生效)
docker-compose restart backend

# ❌ 错误 2: 重建后立即测试 (服务未完全启动)
docker-compose up --build -d backend
npx playwright test  # ← 太快了，可能失败

# ✅ 正确做法
docker-compose up --build -d backend
sleep 15  # 等待启动
curl http://localhost:3001/health  # 验证
npx playwright test
```

### Docker 缓存问题排查

**问题现象**: 重建后代码仍然是旧版本

**可能原因**:
1. Docker 构建缓存未失效
2. 卷挂载覆盖了构建的文件
3. 环境变量未更新

**解决方案**:
```bash
# 方案 1: 强制无缓存构建
docker-compose build --no-cache backend
docker-compose up -d backend

# 方案 2: 完全清理后重建
docker-compose down
docker-compose up --build -d

# 方案 3: 清理卷后重建 (谨慎: 会丢失数据)
docker-compose down -v
docker-compose up --build -d
```

**最佳实践**:
- 开发时使用 `--build` 标志确保代码更新
- CI/CD 流程中使用 `--no-cache` 避免缓存问题
- 定期清理未使用的镜像和卷: `docker system prune -a --volumes`

### 前端Docker配置详解

#### 多阶段构建配置

```dockerfile
# frontend/Dockerfile
# 第一阶段：构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 第二阶段：生产镜像
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**关键点**:
- ✅ 多阶段构建减小镜像体积
- ✅ 使用 nginx 服务静态文件
- ✅ 生产构建优化性能
- ❌ 不适合开发环境（无热重载）

#### nginx配置示例

```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # ✅ 所有路径都返回 index.html (支持 React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 请求代理到后端
    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 开发环境 vs 生产环境

| 方面 | 开发环境 | 生产环境 |
|-----|---------|---------|
| **前端运行** | `npm run dev` (Vite) | Docker + Nginx |
| **热重载** | ✅ 支持 | ❌ 不支持 |
| **修改后** | 自动刷新 | 需要重新构建 |
| **端口** | localhost:5173 | localhost:80 |
| **性能** | 开发模式，较慢 | 生产优化，更快 |
| **适用场景** | 快速迭代开发 | 部署和E2E测试 |

**推荐开发流程**:

```bash
# 方案1: 纯本地开发（推荐日常开发）
cd frontend
npm run dev  # 前端热重载
# 后端可以用 Docker 或本地运行

# 方案2: 混合模式（前端本地，其他Docker）
docker-compose up -d postgres redis backend
cd frontend
npm run dev

# 方案3: 完全Docker（推荐E2E测试）
docker-compose up -d --build
```

**最佳实践建议**:
1. **日常开发** - 使用 `npm run dev`，享受热重载
2. **集成测试** - 使用 Docker 环境，测试完整部署
3. **E2E 测试** - 使用 Docker 环境，确保真实环境
4. **生产部署** - 使用 Docker 环境，确保一致性

---

## 全栈问题调试策略

### 系统化的问题定位流程

当遇到测试失败或功能异常时，按以下顺序排查：

#### 1️⃣ 测试代码层

**检查项**:
- [ ] 测试选择器是否正确？
- [ ] 是否有充足的等待时间？
- [ ] 测试数据是否唯一（时间戳）？
- [ ] 认证状态是否正确加载？

**调试工具**:
```bash
# UI 模式调试
npx playwright test --ui -c tests/playwright.config.ts

# 有头模式查看浏览器
npx playwright test --headed tests/e2e/regression/activity-management.spec.ts

# 查看失败截图
ls tests/test-results/artifacts/
```

#### 2️⃣ 前端代码层

**检查项**:
- [ ] 组件是否正确渲染？
- [ ] API 请求是否发送？
- [ ] Redux 状态是否更新？
- [ ] 权限检查逻辑是否正确？
- [ ] 路由配置是否正确？

**调试方法**:
```typescript
// 在测试中检查网络请求
const [response] = await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/activities')),
  page.click('button:has-text("创建活动")')
]);

console.log('Response status:', response.status());
console.log('Response body:', await response.json());

// 检查 localStorage
const authData = await page.evaluate(() => {
  return {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || '{}')
  };
});
console.log('Auth data:', authData);
```

#### 3️⃣ 后端代码层

**检查项**:
- [ ] API 路由是否定义？
- [ ] 中间件是否正确执行？
- [ ] 权限检查是否通过？
- [ ] 数据库查询是否成功？

**调试方法**:
```bash
# 查看后端日志
docker-compose logs backend --tail 100 -f

# 直接测试 API
curl -X POST http://localhost:3001/api/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type":"assessment","title":"测试活动"}'

# 进入容器调试
docker exec -it guiyang_oj_backend bash
```

#### 4️⃣ 数据库层

**检查项**:
- [ ] 用户角色是否正确？
- [ ] 数据是否存在？
- [ ] 外键约束是否满足？

**调试方法**:
```bash
# 连接数据库
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj

# 检查用户角色
SELECT id, username, role, real_name FROM users WHERE username = 'admin';

# 检查活动数据
SELECT id, title, type, status, created_by FROM activities ORDER BY created_at DESC LIMIT 10;
```

### 实战案例: ACT130 测试失败排查

**问题**: 管理员无法创建测评活动

**排查过程**:

1. **测试层**: 发现认证状态文件为空 → 修复 `auth.setup.ts`
2. **前端层**: 权限检查逻辑正确（`.includes('admin')`）
3. **后端层**: 发现 `ASSESSMENT_ALLOWED_ROLES` 缺少 `system_admin` → 修复
4. **数据库层**: 确认 admin 用户角色为 `system_admin`

**修复时间**: 约30分钟（从问题发现到完全解决）

**关键经验**: 不要跳过任何一层的检查，系统化排查才能快速定位问题。

---

## Playwright E2E测试最佳实践

### 认证状态复用

**最佳实践**: 使用 `storageState` API 复用认证，避免每个测试都登录。

```typescript
// tests/e2e/auth.setup.ts

import { test as setup } from '@playwright/test';

const ADMIN_STORAGE_STATE = 'tests/.auth/admin.json';
const TEACHER_STORAGE_STATE = 'tests/.auth/teacher.json';
const STUDENT_STORAGE_STATE = 'tests/.auth/student.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(admin\/home)?/);

  // 关键: 等待 localStorage 填充
  await page.waitForFunction(() => {
    return localStorage.getItem('token') !== null &&
           localStorage.getItem('user') !== null;
  }, { timeout: 5000 });

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
```

**在测试中使用**:
```typescript
// tests/playwright.config.ts

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'admin-tests',
      use: { storageState: ADMIN_STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
});
```

### 测试数据唯一性

**最佳实践**: 每个测试自己创建唯一数据，避免测试间相互影响。

```typescript
// ❌ 错误 - 依赖已存在的数据
test('查看活动详情', async ({ page }) => {
  await page.goto('/teacher/activities');
  const firstRow = page.locator('.ant-table-tbody tr').first();
  // 不知道这是什么活动，可能是其他测试创建的
});

// ✅ 正确 - 自己创建唯一数据
test('ACT108 - 查看活动详情', async ({ page }) => {
  const timestamp = Date.now();
  const uniqueTitle = `ACT108-查看详情-${timestamp}`;

  // 创建测试数据
  await createActivity(page, { title: uniqueTitle });

  // 使用唯一标识定位
  const targetRow = page.locator('.ant-table-tbody tr')
    .filter({ hasText: uniqueTitle });
});
```

### 等待策略

```typescript
// ✅ 等待网络请求完成
await page.waitForLoadState('networkidle');

// ✅ 等待特定 URL
await page.waitForURL(/\/teacher\/activities/);

// ✅ 等待元素出现
await expect(page.locator('.ant-table-tbody tr')).toBeAttached();

// ✅ 等待 localStorage 更新
await page.waitForFunction(() => localStorage.getItem('token') !== null);

// ❌ 避免使用固定延时（脆弱）
await page.waitForTimeout(2000);  // 尽量避免
```

---

## React Router与权限集成

### 灵活的路由参数设计

**场景**: 同一个表单组件用于不同角色创建不同类型的活动

**解决方案**: 使用可选参数 + 路径检测

```typescript
// frontend/src/App.tsx

<Route path="admin/assessments">
  <Route index element={<AssessmentManagementPage />} />
  <Route path="create/:type?" element={<ActivityFormPage />} />  {/* 可选参数 */}
  <Route path="edit/:id" element={<ActivityFormPage />} />
</Route>

<Route path="teacher/activities">
  <Route index element={<ActivityListPage />} />
  <Route path="create/:type?" element={<ActivityFormPage />} />  {/* 可选参数 */}
  <Route path="edit/:id" element={<ActivityFormPage />} />
</Route>
```

**组件中的处理**:
```typescript
// frontend/src/pages/teacher/ActivityFormPage.tsx

import { useParams, useLocation } from 'react-router-dom';

const ActivityFormPage: React.FC = () => {
  const { type } = useParams<{ type?: 'practice' | 'assessment' }>();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);

  // 智能检测活动类型
  const getDefaultActivityType = (): 'practice' | 'assessment' => {
    if (type) return type;  // URL 参数优先
    if (location.pathname.includes('/admin/assessments/')) return 'assessment';  // 路径检测
    return 'practice';  // 默认
  };

  const [activityType] = useState<'practice' | 'assessment'>(getDefaultActivityType());

  // 权限检查
  const canCreateAssessment = () => {
    return user?.role && user.role.includes('admin');
  };

  // 智能返回路径
  const getReturnPath = () => {
    const isAdmin = user?.role && user.role.includes('admin');
    if (isAdmin && activityType === 'assessment') {
      return '/admin/assessments';
    }
    return '/teacher/activities';
  };

  // ...
};
```

**优点**:
- 同一个组件支持多种使用场景
- URL 灵活: 可以带参数或不带参数
- 代码复用性高

**适用场景**:
- 多角色共用表单组件
- 需要根据路径推断行为的场景
- 渐进增强的路由设计

---

## 代码审查清单

### 角色权限检查

在提交代码前检查以下项目：

**UI 一致性**:
- [ ] 所有角色都有合适的导航菜单
- [ ] 菜单项与角色权限匹配
- [ ] 导航状态与当前路由同步
- [ ] 不同角色的UI体验一致

**权限控制**:
- [ ] 路由层有权限检查
- [ ] UI层有条件渲染
- [ ] API层有权限验证
- [ ] 前后端权限逻辑一致
- [ ] 测试覆盖所有角色场景

**代码质量**:
- [ ] 使用 TypeScript 类型定义
- [ ] 提取可复用的工具函数
- [ ] 组件职责单一清晰
- [ ] 有适当的注释说明

### Docker环境检查

**开发流程**:
- [ ] 了解何时需要重新构建 Docker
- [ ] 知道如何查看 Docker 日志
- [ ] 理解开发环境和生产环境的区别
- [ ] 能够在两种环境间切换

**部署准备**:
- [ ] 测试 Docker 完整构建
- [ ] 验证 nginx 配置正确
- [ ] 检查环境变量配置
- [ ] 运行 E2E 测试验证

### 用户体验检查

**可发现性**:
- [ ] 用户能够通过UI发现所有功能
- [ ] 不需要记住URL或使用书签
- [ ] 导航路径清晰直观
- [ ] 错误提示友好明确

**响应性**:
- [ ] 页面加载速度合理
- [ ] 交互反馈及时
- [ ] 没有明显的性能问题
- [ ] 移动端适配良好（如需要）

**测试覆盖**:
- [ ] E2E测试使用点击导航（不是直接URL）
- [ ] 测试数据使用时间戳确保唯一性
- [ ] 等待策略合理（避免固定延时）
- [ ] 测试覆盖所有关键用户流程

---

## 常见问题速查

### 前端相关问题

#### 问题1：菜单不高亮当前页面

**原因**: `selectedKeys` 与当前路径不匹配

**解决**:
```tsx
// ✅ 使用 useLocation() 获取当前路径
const location = useLocation();

const getSelectedKey = () => {
  const path = location.pathname;

  // 使用 includes 而不是精确匹配
  if (path.includes('/admin/question-bank')) return '/admin/question-bank';
  if (path.includes('/admin/assessments')) return '/admin/assessments';

  return '/admin/home';
};

<Menu
  selectedKeys={[getSelectedKey()]}  // ✅ 动态获取
  items={menuItems}
/>
```

#### 问题2：Docker环境端口冲突

**症状**: `Error: bind: address already in use`

**解决**:
```bash
# 查看占用端口的进程
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac

# 修改 docker-compose.yml 端口映射
services:
  frontend:
    ports:
      - "3001:80"  # 改用其他端口
```

#### 问题3：React Router 404错误

**原因**: nginx 配置未正确处理 SPA 路由

**解决**: 参考上文 nginx 配置示例，确保所有路径都返回 `index.html`

#### 问题4：前端代码修改不生效

**原因**: Docker 使用的是构建后的静态文件，不是热重载

**解决**:
```bash
# ✅ 重新构建前端容器
docker-compose up -d --build frontend

# 或者使用本地开发（推荐）
cd frontend
npm run dev
```

### Docker相关问题

#### 问题5：容器启动失败

**排查步骤**:
```bash
# 1. 查看容器状态
docker-compose ps

# 2. 查看日志
docker-compose logs [service_name]

# 3. 检查端口占用
netstat -ano | findstr :3000

# 4. 重新构建
docker-compose down
docker-compose up -d --build
```

#### 问题6：数据库连接失败

**排查步骤**:
```bash
# 1. 检查 PostgreSQL 容器
docker-compose ps postgres

# 2. 测试数据库连接
docker exec -it guiyang_oj_postgres psql -U postgres -d guiyang_oj -c "SELECT 1"

# 3. 查看数据库日志
docker-compose logs postgres

# 4. 检查环境变量
docker exec guiyang_oj_backend env | grep DATABASE
```

### 测试相关问题

#### 问题7：认证状态为空

**原因**: `storageState()` 保存时 localStorage 未填充

**解决**: 参考本文档"测试认证状态管理"章节

#### 问题8：测试找不到元素

**常见原因和解决方案**:
- **虚拟滚动**: 使用 `toBeAttached()` 代替 `toBeVisible()`
- **中文按钮空格**: 使用正则 `/发\s*布/` 匹配
- **Select虚拟滚动**: 使用 `evaluate()` 或禁用虚拟滚动
- **等待不足**: 使用 `waitForLoadState('networkidle')`

### 权限相关问题

#### 问题9：前端显示按钮但后端返回403

**原因**: 前后端权限检查不一致

**解决步骤**:
1. 检查前端权限检查逻辑
2. 检查后端角色列表是否完整
3. 验证数据库中用户的实际角色
4. 确保三者一致

**参考**: 本文档"权限系统设计与调试"章节

---

## 总结

### 核心经验

1. **测试认证状态**: 必须等待 localStorage 填充完成再保存
2. **权限系统**: 前后端权限检查必须保持一致
3. **UI一致性**: 所有角色都应该有统一的导航体验
4. **Docker 工作流**: 代码变更后必须重建容器
5. **系统化调试**: 按层次（测试→前端→后端→数据库）排查问题
6. **测试数据**: 使用时间戳确保唯一性
7. **路由设计**: 使用可选参数提升灵活性
8. **组件设计**: 职责单一，类型明确，可复用

### 开发流程建议

**日常开发**:
1. 使用 `npm run dev` 进行前端开发（热重载）
2. 后端可以用 Docker 或本地运行
3. 及时提交代码，避免大批量修改

**功能完成前**:
1. 使用 Docker 完整环境测试
2. 运行 E2E 测试验证功能
3. 检查代码审查清单
4. 更新相关文档

**遇到问题时**:
1. 参考"常见问题速查"章节
2. 按层次系统化排查
3. 记录解决方案到本文档
4. 分享经验给团队

### 参考文档

- **完整测试指南**: tests/docs/测试指南.md
- **测试最佳实践**: tests/docs/测试脚本最佳实践.md
- **API文档**: documents/API_Document.md
- **开发指南**: CLAUDE.md
- **文档索引**: documents/README.md

---

**文档维护**: 每次重大问题解决后，及时更新本文档
**最后更新**: 2025-10-30 (合并前端最佳实践，新增React组件设计和代码审查章节)
**维护人员**: 开发团队
