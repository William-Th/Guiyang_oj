/**
 * 判断题自动判题单元测试
 * 覆盖布尔/数字/中文/英文等多种表达
 */

const AutoGradingService = require('../autoGradingService');

describe('AutoGradingService.gradeTrueFalse', () => {
  describe('基本布尔与数字', () => {
    test('true vs true → 满分', () => {
      const r = AutoGradingService.gradeTrueFalse(true, true, 10);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(10);
    });

    test('false vs true → 0 分', () => {
      const r = AutoGradingService.gradeTrueFalse(false, true, 10);
      expect(r.isCorrect).toBe(false);
      expect(r.score).toBe(0);
    });

    test('"1" vs "0" → 错', () => {
      const r = AutoGradingService.gradeTrueFalse('1', '0', 5);
      expect(r.isCorrect).toBe(false);
    });

    test('1 vs true → 对', () => {
      const r = AutoGradingService.gradeTrueFalse(1, true, 5);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(5);
    });
  });

  describe('中文表达', () => {
    test('"对" vs "对" → 满分', () => {
      const r = AutoGradingService.gradeTrueFalse('对', '对', 8);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(8);
    });

    test('"是" vs "对" → 对（同义）', () => {
      const r = AutoGradingService.gradeTrueFalse('是', '对', 8);
      expect(r.isCorrect).toBe(true);
    });

    test('"错" vs "对" → 错', () => {
      const r = AutoGradingService.gradeTrueFalse('错', '对', 8);
      expect(r.isCorrect).toBe(false);
    });

    test('"正确" vs true → 对', () => {
      const r = AutoGradingService.gradeTrueFalse('正确', true, 6);
      expect(r.isCorrect).toBe(true);
    });

    test('"错误" vs false → 对', () => {
      const r = AutoGradingService.gradeTrueFalse('错误', false, 6);
      expect(r.isCorrect).toBe(true);
    });
  });

  describe('英文简写', () => {
    test('"T" vs true → 对', () => {
      const r = AutoGradingService.gradeTrueFalse('T', true, 5);
      expect(r.isCorrect).toBe(true);
    });

    test('"F" vs "false" → 对', () => {
      const r = AutoGradingService.gradeTrueFalse('F', 'false', 5);
      expect(r.isCorrect).toBe(true);
    });

    test('"Y" vs "yes" → 对', () => {
      const r = AutoGradingService.gradeTrueFalse('Y', 'yes', 5);
      expect(r.isCorrect).toBe(true);
    });
  });

  describe('对象包装与边界', () => {
    test('对象形式 { answer: "对" } vs true → 对', () => {
      const r = AutoGradingService.gradeTrueFalse({ answer: '对' }, true, 5);
      expect(r.isCorrect).toBe(true);
    });

    test('数组形式 ["true"] vs true → 对', () => {
      const r = AutoGradingService.gradeTrueFalse(['true'], true, 5);
      expect(r.isCorrect).toBe(true);
    });

    test('未填答案（null） → 错', () => {
      const r = AutoGradingService.gradeTrueFalse(null, true, 5);
      expect(r.isCorrect).toBe(false);
      expect(r.message).toMatch(/无法识别/);
    });

    test('无法识别的字符串 → 错', () => {
      const r = AutoGradingService.gradeTrueFalse('maybe', true, 5);
      expect(r.isCorrect).toBe(false);
      expect(r.message).toMatch(/无法识别/);
    });
  });

  describe('通过 gradeQuestion 入口分发', () => {
    test('true_false 类型应路由到 gradeTrueFalse', () => {
      const r = AutoGradingService.gradeQuestion('true_false', '对', 'true', 10);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(10);
    });

    test('true_false 错误答案', () => {
      const r = AutoGradingService.gradeQuestion('true_false', '错', 'true', 10);
      expect(r.isCorrect).toBe(false);
      expect(r.score).toBe(0);
    });
  });
});
