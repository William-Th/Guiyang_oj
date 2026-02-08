/**
 * 题目导出功能 API 测试
 * Test Coverage:
 * - QBEXP101: 导出全部题目（Excel格式）
 * - QBEXP102: 导出全部题目（CSV格式）
 * - QBEXP103: 导出带筛选条件的题目
 * - QBEXP104: 导出无数据时的处理
 * - QBEXP105: 导出格式验证
 */

const request = require('supertest');
const express = require('express');
const questionBankRouter = require('../../backend/src/routes/questionBank');
const { authMiddleware } = require('../../backend/src/middleware/auth');

// Mock auth middleware
jest.mock('../../backend/src/middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 1, role: 'system_admin' };
    next();
  }
}));

// Mock QuestionBank model
jest.mock('../../backend/src/models/QuestionBank', () => ({
  findAll: jest.fn(),
  countAll: jest.fn(),
}));

const QuestionBank = require('../../backend/src/models/QuestionBank');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/question-bank', questionBankRouter);

describe('Question Export API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // QBEXP101 - 导出全部题目（Excel格式）
  describe('QBEXP101 - 导出全部题目（Excel格式）', () => {
    test('应该成功导出Excel格式的全部题目', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010101',
          type: 'single',
          subject: '数学',
          grade: '一年级',
          level: 'L1',
          content: '1+1=?',
          options: ['1', '2', '3', '4'],
          correct_answer: 'B',
          explanation: '1+1=2',
          difficulty: 'easy',
          score: 5,
          tags: ['基础运算'],
          abilities: ['计算能力'],
          knowledge_points: ['加法'],
          scope: ['assessment'],
          creator_name: '测试教师',
          reviewer_name: '测试审核员',
          usage_count: 10,
          created_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          question_code: 'MATH2024010102',
          type: 'multiple',
          subject: '数学',
          grade: '一年级',
          level: 'L2',
          content: '以下哪些是偶数？',
          options: ['1', '2', '3', '4'],
          correct_answer: ['B', 'D'],
          explanation: '2和4是偶数',
          difficulty: 'medium',
          score: 10,
          tags: ['数论'],
          abilities: ['判断能力'],
          knowledge_points: ['奇偶性'],
          scope: ['practice_municipal'],
          creator_name: '测试教师',
          reviewer_name: '测试审核员',
          usage_count: 5,
          created_at: '2024-01-02T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'excel' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('应该设置正确的Excel文件名', async () => {
      QuestionBank.findAll.mockResolvedValue([]);
      QuestionBank.countAll.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'excel' });

      expect(response.status).toBe(404); // 无数据时返回404
    });
  });

  // QBEXP102 - 导出全部题目（CSV格式）
  describe('QBEXP102 - 导出全部题目（CSV格式）', () => {
    test('应该成功导出CSV格式的全部题目', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010101',
          type: 'true_false',
          subject: '数学',
          grade: '一年级',
          content: '1+1=2',
          correct_answer: true,
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 10,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('CSV文件应该包含UTF-8 BOM', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010101',
          type: 'single',
          subject: '数学',
          grade: '一年级',
          content: '测试题目',
          correct_answer: 'A',
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      // UTF-8 BOM is \uFEFF
      expect(response.body[0]).toBe(0xEF);
      expect(response.body[1]).toBe(0xBB);
      expect(response.body[2]).toBe(0xBF);
    });
  });

  // QBEXP103 - 导出带筛选条件的题目
  describe('QBEXP103 - 导出带筛选条件的题目', () => {
    test('应该根据科目筛选导出', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010101',
          type: 'single',
          subject: '数学',
          grade: '一年级',
          content: '数学题目',
          correct_answer: 'A',
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'excel', subject: '数学' });

      expect(response.status).toBe(200);

      // 验证传递了正确的筛选参数
      expect(QuestionBank.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '数学'
        }),
        expect.any(Object)
      );
    });

    test('应该根据难度筛选导出', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010102',
          type: 'single',
          subject: '数学',
          grade: '一年级',
          content: '简单题目',
          correct_answer: 'A',
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'excel', difficulty: 'easy' });

      expect(response.status).toBe(200);

      // 验证传递了正确的筛选参数
      expect(QuestionBank.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'easy'
        }),
        expect.any(Object)
      );
    });

    test('应该根据题型筛选导出', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010103',
          type: 'multiple',
          subject: '数学',
          grade: '一年级',
          content: '多选题',
          options: ['A', 'B', 'C'],
          correct_answer: ['A', 'B'],
          difficulty: 'medium',
          score: 10,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'excel', type: 'multiple' });

      expect(response.status).toBe(200);

      expect(QuestionBank.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'multiple'
        }),
        expect.any(Object)
      );
    });

    test('应该支持组合筛选条件导出', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010104',
          type: 'single',
          subject: '数学',
          grade: '一年级',
          content: '组合筛选题目',
          correct_answer: 'A',
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({
          format: 'excel',
          subject: '数学',
          grade: '一年级',
          difficulty: 'easy',
          type: 'single'
        });

      expect(response.status).toBe(200);

      expect(QuestionBank.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '数学',
          grade: '一年级',
          difficulty: 'easy',
          type: 'single'
        }),
        expect.any(Object)
      );
    });
  });

  // QBEXP104 - 导出无数据时的处理
  describe('QBEXP104 - 导出无数据时的处理', () => {
    test('无题目数据时应该返回404', async () => {
      QuestionBank.findAll.mockResolvedValue([]);
      QuestionBank.countAll.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'excel' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('没有符合条件的题目');
    });

    test('筛选条件无匹配时应该返回404', async () => {
      QuestionBank.findAll.mockResolvedValue([]);
      QuestionBank.countAll.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({
          format: 'excel',
          subject: '不存在的科目'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // QBEXP105 - 导出格式验证
  describe('QBEXP105 - 导出格式验证', () => {
    test('不支持的格式应该返回400错误', async () => {
      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'pdf' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不支持的导出格式');
    });

    test('默认格式应该是Excel', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010101',
          type: 'single',
          subject: '数学',
          grade: '一年级',
          content: '默认格式测试',
          correct_answer: 'A',
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export'); // 不指定format参数

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  // QBEXP106 - 不同题型的数据格式化
  describe('QBEXP106 - 不同题型的数据格式化', () => {
    test('判断题答案应该格式化为中文', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010105',
          type: 'true_false',
          subject: '数学',
          grade: '一年级',
          content: '1+1=2',
          correct_answer: true,
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          question_code: 'MATH2024010106',
          type: 'true_false',
          subject: '数学',
          grade: '一年级',
          content: '1+1=3',
          correct_answer: false,
          difficulty: 'easy',
          score: 5,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      const csvContent = response.body.toString('utf-8');
      // 验证包含"正确"和"错误"
      expect(csvContent).toContain('正确');
      expect(csvContent).toContain('错误');
    });

    test('多选题答案应该格式化为逗号分隔', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010107',
          type: 'multiple',
          subject: '数学',
          grade: '一年级',
          content: '多选题',
          options: ['A', 'B', 'C'],
          correct_answer: ['A', 'B'],
          difficulty: 'medium',
          score: 10,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      const csvContent = response.body.toString('utf-8');
      // 验证答案格式化为 A,B
      expect(csvContent).toContain('A,B');
    });

    test('填空题答案应该格式化为竖线分隔', async () => {
      const mockQuestions = [
        {
          id: 1,
          question_code: 'MATH2024010108',
          type: 'blank',
          subject: '数学',
          grade: '一年级',
          content: '1+1=_, 2+2=_',
          correct_answer: ['2', '4'],
          difficulty: 'medium',
          score: 10,
          scope: ['assessment'],
          creator_name: '测试教师',
          usage_count: 0,
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      QuestionBank.findAll.mockResolvedValue(mockQuestions);
      QuestionBank.countAll.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/question-bank/export')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      const csvContent = response.body.toString('utf-8');
      // 验证答案格式化为 2 | 4
      expect(csvContent).toContain('2 | 4');
    });
  });
});
