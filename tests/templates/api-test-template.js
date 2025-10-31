/**
 * API测试模板
 *
 * 使用说明：
 * 1. 复制此文件到 backend/tests/ 目录
 * 2. 重命名为实际功能名称，如 questionComments.test.js
 * 3. 替换所有 [FEATURE_NAME] 为实际功能名称
 * 4. 根据实际API端点修改测试用例
 * 5. 运行测试：npm test
 */

const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('[FEATURE_NAME] API Tests', () => {
  let authToken;
  let testUserId;
  let test[FEATURE_NAME]Id;

  // 测试前准备：登录获取token
  beforeAll(async () => {
    // 创建测试用户（如果需要）
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        role: 'teacher'
      });

    testUserId = userResponse.body.data.id;

    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  // 测试后清理
  afterAll(async () => {
    // 清理测试数据
    await db.query('DELETE FROM [table_name] WHERE created_by = $1', [testUserId]);
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);

    // 关闭数据库连接
    await db.end();
  });

  describe('POST /api/[endpoint]', () => {
    it('应该成功创建[FEATURE_NAME]', async () => {
      const response = await request(app)
        .post('/api/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 测试数据
          name: 'Test [FEATURE_NAME]',
          description: 'Test description'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      test[FEATURE_NAME]Id = response.body.data.id;
    });

    it('缺少必填字段时应该返回400错误', async () => {
      const response = await request(app)
        .post('/api/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必填字段
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('未授权用户应该返回401错误', async () => {
      const response = await request(app)
        .post('/api/[endpoint]')
        .send({
          name: 'Test [FEATURE_NAME]'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/[endpoint]', () => {
    it('应该成功获取[FEATURE_NAME]列表', async () => {
      const response = await request(app)
        .get('/api/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('支持分页参数', async () => {
      const response = await request(app)
        .get('/api/[endpoint]?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/[endpoint]/:id', () => {
    it('应该成功获取[FEATURE_NAME]详情', async () => {
      const response = await request(app)
        .get(`/api/[endpoint]/${test[FEATURE_NAME]Id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(test[FEATURE_NAME]Id);
    });

    it('不存在的ID应该返回404错误', async () => {
      const response = await request(app)
        .get('/api/[endpoint]/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/[endpoint]/:id', () => {
    it('应该成功更新[FEATURE_NAME]', async () => {
      const response = await request(app)
        .put(`/api/[endpoint]/${test[FEATURE_NAME]Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated [FEATURE_NAME]',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated [FEATURE_NAME]');
    });

    it('其他用户不应该能更新', async () => {
      // 创建另一个用户
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          password: 'password123',
          role: 'teacher'
        });

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'otheruser',
          password: 'password123'
        });

      const response = await request(app)
        .put(`/api/[endpoint]/${test[FEATURE_NAME]Id}`)
        .set('Authorization', `Bearer ${otherLoginResponse.body.data.token}`)
        .send({
          name: 'Malicious Update'
        });

      expect(response.status).toBe(403);

      // 清理
      await db.query('DELETE FROM users WHERE id = $1', [otherUserResponse.body.data.id]);
    });
  });

  describe('DELETE /api/[endpoint]/:id', () => {
    it('应该成功删除[FEATURE_NAME]', async () => {
      const response = await request(app)
        .delete(`/api/[endpoint]/${test[FEATURE_NAME]Id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证已删除
      const getResponse = await request(app)
        .get(`/api/[endpoint]/${test[FEATURE_NAME]Id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  // 业务流程测试
  describe('[FEATURE_NAME] 业务流程', () => {
    it('完整的创建-查询-更新-删除流程', async () => {
      // 1. 创建
      const createResponse = await request(app)
        .post('/api/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Workflow Test',
          description: 'Testing complete workflow'
        });

      expect(createResponse.status).toBe(201);
      const itemId = createResponse.body.data.id;

      // 2. 查询
      const getResponse = await request(app)
        .get(`/api/[endpoint]/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.name).toBe('Workflow Test');

      // 3. 更新
      const updateResponse = await request(app)
        .put(`/api/[endpoint]/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Workflow Test'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe('Updated Workflow Test');

      // 4. 删除
      const deleteResponse = await request(app)
        .delete(`/api/[endpoint]/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });
});
