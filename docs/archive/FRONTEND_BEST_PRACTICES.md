# React + TypeScript 前端开发实践

## 文档目的

本文档总结了在贵阳小学生测评平台前端开发过程中的经验教训和最佳实践，特别是关于用户界面一致性、角色权限管理、以及 Docker 环境下的开发流程。

---

## 目录

1. [角色权限与UI一致性](#1-角色权限与ui一致性)
2. [React组件设计](#2-react组件设计)
3. [Docker开发环境](#3-docker开发环境)
4. [代码审查清单](#4-代码审查清单)

---

## 1. 角色权限与UI一致性

### 1.1 问题：不同角色UI体验不一致

**问题描述：**
在多角色系统中，不同角色看到的UI界面可能不一致，导致用户体验差异大和维护困难。

#### ❌ 错误示例

```tsx
// MainLayout.tsx - 只为管理员添加导航菜单
const MainLayout: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  // 只检查管理员角色
  const isAdmin = () => {
    const adminRoles = ['school_admin', 'district_admin', 'system_admin'];
    return user && adminRoles.includes(user.role);
  };

  return (
    <Layout>
      <Header>
        <div>贵阳市小学生测评平台</div>

        {/* ❌ 只有管理员有导航菜单 */}
        {isAdmin() && (
          <Menu
            mode="horizontal"
            items={adminMenuItems}
            onClick={handleMenuClick}
          />
        )}

        {/* 教师和学生没有导航菜单 */}
        <UserDropdown />
      </Header>
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
};
```

**问题：**
- ❌ 教师登录后没有导航菜单，只能通过直接URL访问页面
- ❌ 用户体验不一致，教师需要记住URL或使用浏览器书签
- ❌ E2E测试会发现问题：点击导航测试失败
- ❌ 难以发现问题：直接URL跳转的测试会通过

#### ✅ 正确示例

```tsx
// MainLayout.tsx - 为所有角色提供一致的导航体验
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  // 检查管理员角色
  const isAdmin = () => {
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin',
      'base_school_admin', 'municipal_admin', 'system_admin'];
    return user && adminRoles.includes(user.role);
  };

  // ✅ 检查教师角色
  const isTeacher = () => {
    return user && user.role === 'teacher';
  };

  // ✅ 管理员导航菜单
  const adminMenuItems: MenuProps['items'] = [
    { key: '/admin/home', icon: <HomeOutlined />, label: '首页' },
    { key: '/admin/overview', icon: <DashboardOutlined />, label: '数据概览' },
    { key: '/admin/exams', icon: <FileTextOutlined />, label: '考试管理' },
    { key: '/admin/question-bank', icon: <BookOutlined />, label: '题库管理' },
    { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
    { key: '/admin/permissions', icon: <SettingOutlined />, label: '权限管理' },
  ];

  // ✅ 教师导航菜单
  const teacherMenuItems: MenuProps['items'] = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/teacher/question-bank', icon: <BookOutlined />, label: '题库管理' },
  ];

  // ✅ 获取管理员当前选中的菜单项
  const getAdminSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/admin/home')) return '/admin/home';
    if (path.includes('/admin/overview')) return '/admin/overview';
    if (path.includes('/admin/exams')) return '/admin/exams';
    if (path.includes('/admin/question-bank')) return '/admin/question-bank';
    if (path.includes('/admin/users')) return '/admin/users';
    if (path.includes('/admin/permissions')) return '/admin/permissions';
    return '/admin/home';
  };

  // ✅ 获取教师当前选中的菜单项
  const getTeacherSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/teacher/question-bank')) return '/teacher/question-bank';
    if (path === '/') return '/';
    return '/';
  };

  // ✅ 处理管理员菜单点击
  const handleAdminMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  // ✅ 处理教师菜单点击
  const handleTeacherMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        background: '#1677ff',
        padding: '0 24px'
      }}>
        <div style={{
          color: 'white',
          fontSize: '20px',
          marginRight: '48px',
          whiteSpace: 'nowrap'
        }}>
          贵阳市小学生测评平台
        </div>

        {/* ✅ 管理员导航菜单 */}
        {isAdmin() && (
          <Menu
            mode="horizontal"
            selectedKeys={[getAdminSelectedKey()]}
            items={adminMenuItems}
            onClick={handleAdminMenuClick}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              borderBottom: 'none',
              lineHeight: '64px',
            }}
            theme="dark"
          />
        )}

        {/* ✅ 教师导航菜单 */}
        {isTeacher() && (
          <Menu
            mode="horizontal"
            selectedKeys={[getTeacherSelectedKey()]}
            items={teacherMenuItems}
            onClick={handleTeacherMenuClick}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              borderBottom: 'none',
              lineHeight: '64px',
            }}
            theme="dark"
          />
        )}

        {/* 用户菜单 */}
        <UserDropdown />
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          minHeight: '100%'
        }}>
          <Outlet />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
        贵阳市教育局 ©2024 小学生测评服务平台
      </Footer>
    </Layout>
  );
};

export default MainLayout;
```

### 1.2 关键原则

**UI一致性：**
1. **统一的导航体验** - 所有角色都应该有清晰的导航菜单
2. **角色适配的菜单项** - 根据角色权限显示不同的菜单选项
3. **相似的布局结构** - Header、Content、Footer 结构保持一致
4. **状态同步** - 导航菜单高亮与当前路径同步

**角色权限管理：**
1. **清晰的角色检查函数** - `isAdmin()`, `isTeacher()`, `isStudent()`
2. **条件渲染** - 使用角色检查函数控制UI显示
3. **路由保护** - 在路由层也进行权限检查
4. **菜单项配置化** - 将菜单项提取为配置，便于维护

**可发现性：**
1. **避免隐藏功能** - 用户应该能够通过UI发现所有功能
2. **提供导航** - 不应该要求用户记住URL
3. **测试覆盖** - E2E测试应该使用点击导航，能发现UI缺失

### 1.3 实际案例

**案例：教师导航菜单缺失**

**问题发现过程：**
1. 原始测试使用 `page.goto('/teacher/question-bank')` 直接跳转
2. 测试通过 ✅，但隐藏了导航菜单缺失的问题
3. 改用点击导航：`await page.click('a:has-text("题库管理")')`
4. 测试失败 ❌：`TimeoutError: waiting for locator('a:has-text("题库管理")')`
5. 发现问题：教师角色没有导航菜单

**修复步骤：**
1. 在 `MainLayout.tsx` 中添加 `isTeacher()` 函数
2. 定义 `teacherMenuItems` 菜单配置
3. 添加 `getTeacherSelectedKey()` 函数处理选中状态
4. 添加 `handleTeacherMenuClick()` 处理导航
5. 在 Header 中添加教师导航菜单渲染

**修复后效果：**
- ✅ 教师登录后看到"首页"和"题库管理"菜单
- ✅ 菜单项与当前页面同步高亮
- ✅ 用户体验与管理员一致
- ✅ E2E测试通过

---

## 2. React组件设计

### 2.1 布局组件的职责

**MainLayout 组件应该负责：**
- ✅ 顶部导航栏（Header）
- ✅ 主内容区域（Content）
- ✅ 底部信息栏（Footer）
- ✅ 全局状态访问（用户信息、权限）
- ✅ 路由导航逻辑

**MainLayout 不应该负责：**
- ❌ 具体业务逻辑
- ❌ 数据加载和处理
- ❌ 复杂的状态管理

### 2.2 组件拆分原则

```tsx
// ✅ 好的实践：拆分为独立组件
// components/layout/MainLayout.tsx
import UserDropdown from './UserDropdown';
import AdminMenu from './AdminMenu';
import TeacherMenu from './TeacherMenu';

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

### 2.3 TypeScript 类型定义

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
```

---

## 3. Docker开发环境

### 3.1 问题：前端代码修改不生效

**问题描述：**
在 Docker 环境中修改前端代码后，刷新浏览器看不到变化。

**原因分析：**
Docker 中的前端服务使用的是构建后的静态文件，不是热重载的开发服务器。

#### ❌ 错误做法

```bash
# 修改前端代码
vim frontend/src/components/layout/MainLayout.tsx

# 刷新浏览器
# ❌ 看不到变化！

# 重启 Docker 容器
docker-compose restart frontend
# ❌ 还是看不到变化！因为没有重新构建
```

#### ✅ 正确做法

```bash
# 方案1: 重新构建并启动前端容器（推荐）
docker-compose up -d --build frontend

# 方案2: 重新构建所有服务
docker-compose down
docker-compose up -d --build

# 方案3: 使用开发模式（本地开发）
cd frontend
npm run dev  # Vite 开发服务器，支持热重载
```

### 3.2 Docker 环境开发流程

**生产环境部署流程：**
```bash
# 1. 构建并启动所有服务
docker-compose up -d --build

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f frontend
docker-compose logs -f backend

# 4. 停止服务
docker-compose down

# 5. 清理并重建（彻底重置）
docker-compose down -v  # -v 删除 volumes
docker volume rm guiyang_oj_postgres_data
docker-compose up -d --build
```

**开发环境流程（推荐）：**
```bash
# 1. 只用 Docker 运行数据库和后端
docker-compose up -d postgres backend

# 2. 本地运行前端（支持热重载）
cd frontend
npm run dev

# 3. 修改代码后自动刷新
# ✅ 修改后立即看到效果

# 4. 需要测试完整 Docker 环境时
docker-compose down
docker-compose up -d --build
```

### 3.3 前端 Docker 配置

```dockerfile
# frontend/Dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 生产镜像
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**关键点：**
- ✅ 多阶段构建减小镜像体积
- ✅ 使用 nginx 服务静态文件
- ✅ 生产构建优化性能
- ❌ 不适合开发环境（无热重载）

### 3.4 开发环境 vs 生产环境

| 方面 | 开发环境 | 生产环境 |
|-----|---------|---------|
| **前端运行** | `npm run dev` (Vite) | Docker + Nginx |
| **热重载** | ✅ 支持 | ❌ 不支持 |
| **修改后** | 自动刷新 | 需要重新构建 |
| **端口** | localhost:5173 | localhost:80 |
| **性能** | 开发模式，较慢 | 生产优化，更快 |
| **适用场景** | 快速迭代开发 | 部署和E2E测试 |

**最佳实践：**
1. **日常开发** - 使用 `npm run dev`，享受热重载
2. **集成测试** - 使用 Docker 环境，测试完整部署
3. **E2E 测试** - 使用 Docker 环境，确保真实环境
4. **生产部署** - 使用 Docker 环境，确保一致性

---

## 4. 代码审查清单

### 4.1 角色权限检查

在提交代码前检查以下项目：

**UI 一致性：**
- [ ] 所有角色都有合适的导航菜单
- [ ] 菜单项与角色权限匹配
- [ ] 导航状态与当前路由同步
- [ ] 不同角色的UI体验一致

**权限控制：**
- [ ] 路由层有权限检查
- [ ] UI层有条件渲染
- [ ] API层有权限验证
- [ ] 测试覆盖所有角色场景

**代码质量：**
- [ ] 使用 TypeScript 类型定义
- [ ] 提取可复用的工具函数
- [ ] 组件职责单一清晰
- [ ] 有适当的注释说明

### 4.2 Docker 环境检查

**开发流程：**
- [ ] 了解何时需要重新构建 Docker
- [ ] 知道如何查看 Docker 日志
- [ ] 理解开发环境和生产环境的区别
- [ ] 能够在两种环境间切换

**部署准备：**
- [ ] 测试 Docker 完整构建
- [ ] 验证 nginx 配置正确
- [ ] 检查环境变量配置
- [ ] 运行 E2E 测试验证

### 4.3 用户体验检查

**可发现性：**
- [ ] 用户能够通过UI发现所有功能
- [ ] 不需要记住URL或使用书签
- [ ] 导航路径清晰直观
- [ ] 错误提示友好明确

**响应性：**
- [ ] 页面加载速度合理
- [ ] 交互反馈及时
- [ ] 没有明显的性能问题
- [ ] 移动端适配良好

---

## 5. 常见问题和解决方案

### 5.1 问题：菜单不高亮当前页面

**原因：** `selectedKeys` 与当前路径不匹配

**解决：**
```tsx
// ✅ 使用 useLocation() 获取当前路径
const location = useLocation();

const getSelectedKey = () => {
  const path = location.pathname;

  // 使用 includes 而不是精确匹配
  if (path.includes('/admin/question-bank')) return '/admin/question-bank';
  if (path.includes('/admin/exams')) return '/admin/exams';

  return '/admin/home';
};

<Menu
  selectedKeys={[getSelectedKey()]}  // ✅ 动态获取
  items={menuItems}
/>
```

### 5.2 问题：Docker 环境端口冲突

**症状：** `Error: bind: address already in use`

**解决：**
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

### 5.3 问题：React Router 404 错误

**原因：** nginx 配置未正确处理 SPA 路由

**解决：**
```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # ✅ 所有路径都返回 index.html
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

---

## 6. 总结

### 6.1 核心原则

**UI 设计：**
1. **一致性优先** - 不同角色应该有相似的UI体验
2. **可发现性** - 功能应该容易被用户找到
3. **权限适配** - 根据角色显示合适的功能
4. **状态同步** - UI状态应该与数据状态一致

**开发流程：**
1. **本地开发** - 使用 `npm run dev` 快速迭代
2. **Docker 测试** - 定期在 Docker 环境中验证
3. **E2E 验证** - 使用点击导航测试，发现UI问题
4. **生产部署** - 使用 Docker 确保环境一致性

**代码质量：**
1. **TypeScript** - 使用类型系统防止错误
2. **组件拆分** - 保持组件职责单一
3. **代码复用** - 提取公共逻辑和组件
4. **测试覆盖** - 包括单元测试和E2E测试

### 6.2 实际案例总结

**教师导航菜单修复案例：**

**问题：**
- 教师登录后没有导航菜单
- E2E 测试使用直接URL跳转，未发现问题

**解决：**
1. 改用点击导航测试，发现菜单缺失
2. 在 `MainLayout.tsx` 添加教师导航菜单
3. 实现菜单选中状态同步
4. 重新构建 Docker 前端容器
5. E2E 测试通过，用户体验改善

**经验教训：**
- ✅ E2E 测试应该模拟真实用户操作（点击而不是URL）
- ✅ 不同角色应该有一致的UI体验
- ✅ 修改前端代码后需要重新构建 Docker 容器
- ✅ 功能应该通过UI可发现，不应该依赖直接URL

### 6.3 下一步改进

**计划中的优化：**
1. **组件库标准化** - 创建统一的导航组件库
2. **权限配置化** - 将权限规则提取到配置文件
3. **开发环境优化** - 改进 Docker 开发体验
4. **性能监控** - 添加前端性能监控
5. **无障碍支持** - 提升无障碍访问体验

---

**文档版本：** v1.0
**最后更新：** 2025-10-21
**维护人员：** 前端开发团队

如有问题或建议，请联系开发团队或提交 Issue。
