/**
 * 题目编码功能 API测试
 *
 * 测试内容：
 * 1. 题目编码自动生成
 * 2. 编码格式验证
 * 3. 编码唯一性验证
 * 4. 通过编码查询题目
 * 5. 编码解析功能
 */

const questionCodeService = require('../../backend/src/services/questionCodeService');
const { query, getClient } = require('../../backend/src/database/connection');

describe('Question Code Service Tests', () => {
  let testQuestionIds = [];

  // 测试后清理
  afterAll(async () => {
    // 清理测试数据
    if (testQuestionIds.length > 0) {
      await query('DELETE FROM question_bank WHERE id = ANY($1)', [testQuestionIds]);
    }
  });

  describe('生成题目编码', () => {
    it('应该为数学题目生成正确格式的编码', async () => {
      const code = await questionCodeService.generateQuestionCode('数学');

      expect(code).toBeDefined();
      expect(code).toMatch(/^MATH\d{10}$/); // MATH + 10位数字
      expect(code.length).toBe(14);
    });

    it('应该为物理题目生成正确格式的编码', async () => {
      const code = await questionCodeService.generateQuestionCode('物理');

      expect(code).toBeDefined();
      expect(code).toMatch(/^PHYS\d{10}$/);
      expect(code.substring(0, 4)).toBe('PHYS');
    });

    it('应该为化学题目生成正确格式的编码', async () => {
      const code = await questionCodeService.generateQuestionCode('化学');

      expect(code).toBeDefined();
      expect(code).toMatch(/^CHEM\d{10}$/);
    });

    it('应该为未知科目生成OTHR编码', async () => {
      const code = await questionCodeService.generateQuestionCode('未知科目');

      expect(code).toBeDefined();
      expect(code).toMatch(/^OTHR\d{10}$/);
    });

    it('同一天同一科目生成的编码序号应递增', async () => {
      const code1 = await questionCodeService.generateQuestionCode('数学');
      const code2 = await questionCodeService.generateQuestionCode('数学');

      // 提取序号部分（最后4位）
      const seq1 = parseInt(code1.substring(10), 10);
      const seq2 = parseInt(code2.substring(10), 10);

      expect(seq2).toBe(seq1 + 1);
    });
  });

  describe('编码格式验证', () => {
    it('应该包含正确的日期信息', async () => {
      const testDate = new Date('2025-03-15');
      const code = await questionCodeService.generateQuestionCode('数学', testDate);

      // 编码格式：MATH250315XXXX
      expect(code.substring(4, 6)).toBe('25'); // 年份
      expect(code.substring(6, 8)).toBe('03'); // 月份
      expect(code.substring(8, 10)).toBe('15'); // 日期
    });

    it('序号应该是4位数字，不足补0', async () => {
      const code = await questionCodeService.generateQuestionCode('生物');

      const sequence = code.substring(10, 14);
      expect(sequence).toMatch(/^\d{4}$/);
      expect(sequence.length).toBe(4);
    });
  });

  describe('编码唯一性验证', () => {
    it('数据库中不应该有重复的编码', async () => {
      // 创建两个题目
      const sql = `
        INSERT INTO question_bank (type, subject, grade, content, created_by, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result1 = await query(sql, [
        'single', '数学', '一年级', '测试题目1', 1, 'draft'
      ]);
      const result2 = await query(sql, [
        'single', '数学', '一年级', '测试题目2', 1, 'draft'
      ]);

      testQuestionIds.push(result1.rows[0].id, result2.rows[0].id);

      const code1 = result1.rows[0].question_code;
      const code2 = result2.rows[0].question_code;

      expect(code1).not.toBe(code2);
      expect(code1).toBeDefined();
      expect(code2).toBeDefined();
    });

    it('isCodeExists应该正确检测编码是否存在', async () => {
      // 创建一个题目
      const sql = `
        INSERT INTO question_bank (type, subject, grade, content, created_by, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await query(sql, [
        'single', '物理', '二年级', '测试题目', 1, 'draft'
      ]);

      testQuestionIds.push(result.rows[0].id);
      const code = result.rows[0].question_code;

      // 检查存在的编码
      const exists = await questionCodeService.isCodeExists(code);
      expect(exists).toBe(true);

      // 检查不存在的编码
      const notExists = await questionCodeService.isCodeExists('MATH9999990001');
      expect(notExists).toBe(false);
    });
  });

  describe('通过编码查询题目', () => {
    it('应该能通过编码找到题目', async () => {
      // 创建测试题目
      const sql = `
        INSERT INTO question_bank (type, subject, grade, content, created_by, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await query(sql, [
        'single', '化学', '三年级', '通过编码查询测试', 1, 'draft'
      ]);

      testQuestionIds.push(result.rows[0].id);
      const code = result.rows[0].question_code;

      // 通过编码查询
      const question = await questionCodeService.getQuestionByCode(code);

      expect(question).toBeDefined();
      expect(question.id).toBe(result.rows[0].id);
      expect(question.question_code).toBe(code);
      expect(question.content).toBe('通过编码查询测试');
    });

    it('查询不存在的编码应返回null', async () => {
      const question = await questionCodeService.getQuestionByCode('MATH9999990001');
      expect(question).toBeNull();
    });
  });

  describe('编码解析功能', () => {
    it('应该正确解析题目编码', () => {
      const code = 'MATH250315000 1';
      const info = questionCodeService.parseQuestionCode(code);

      expect(info.subjectCode).toBe('MATH');
      expect(info.subject).toBe('数学');
      expect(info.date).toBe('2025-03-15');
      expect(info.sequence).toBe(1);
    });

    it('应该正确解析物理编码', () => {
      const code = 'PHYS250120001';
      const info = questionCodeService.parseQuestionCode(code);

      expect(info.subjectCode).toBe('PHYS');
      expect(info.subject).toBe('物理');
      expect(info.date).toBe('2025-01-20');
      expect(info.sequence).toBe(1);
    });

    it('解析格式错误的编码应抛出异常', () => {
      expect(() => {
        questionCodeService.parseQuestionCode('INVALID');
      }).toThrow('Invalid question code format');

      expect(() => {
        questionCodeService.parseQuestionCode('');
      }).toThrow('Invalid question code format');
    });
  });

  describe('科目代码映射', () => {
    it('应该包含所有支持的科目', () => {
      const { SUBJECT_CODE_MAP } = questionCodeService;

      expect(SUBJECT_CODE_MAP['数学']).toBe('MATH');
      expect(SUBJECT_CODE_MAP['物理']).toBe('PHYS');
      expect(SUBJECT_CODE_MAP['化学']).toBe('CHEM');
      expect(SUBJECT_CODE_MAP['生物']).toBe('BIOL');
      expect(SUBJECT_CODE_MAP['计算机']).toBe('COMP');
    });
  });

  describe('业务流程测试', () => {
    it('完整的创建-查询-解析流程', async () => {
      // 1. 创建题目（数据库触发器自动生成编码）
      const sql = `
        INSERT INTO question_bank (type, subject, grade, content, created_by, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await query(sql, [
        'single', '计算机', '四年级', '完整流程测试', 1, 'draft'
      ]);

      testQuestionIds.push(result.rows[0].id);
      const code = result.rows[0].question_code;

      // 2. 验证编码已生成
      expect(code).toBeDefined();
      expect(code).toMatch(/^COMP\d{10}$/);

      // 3. 通过编码查询题目
      const question = await questionCodeService.getQuestionByCode(code);
      expect(question).toBeDefined();
      expect(question.content).toBe('完整流程测试');

      // 4. 解析编码
      const codeInfo = questionCodeService.parseQuestionCode(code);
      expect(codeInfo.subject).toBe('计算机');
      expect(codeInfo.subjectCode).toBe('COMP');

      // 5. 验证编码存在
      const exists = await questionCodeService.isCodeExists(code);
      expect(exists).toBe(true);
    });
  });
});
