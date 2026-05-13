/**
 * 匹配题自动判题单元测试
 */

const AutoGradingService = require('../autoGradingService');

describe('AutoGradingService.gradeMatching', () => {
  describe('基本数组格式 {left, right}', () => {
    const correct = [
      { left: 'A', right: '1' },
      { left: 'B', right: '2' },
      { left: 'C', right: '3' }
    ];

    test('全部正确 → 满分', () => {
      const r = AutoGradingService.gradeMatching(correct, correct, 12);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(12);
      expect(r.correctCount).toBe(3);
      expect(r.totalCount).toBe(3);
    });

    test('全部错误 → 0 分', () => {
      const student = [
        { left: 'A', right: '2' },
        { left: 'B', right: '3' },
        { left: 'C', right: '1' }
      ];
      const r = AutoGradingService.gradeMatching(student, correct, 12);
      expect(r.isCorrect).toBe(false);
      expect(r.score).toBe(0);
    });

    test('对 2 错 1 → 8 分（按比例）', () => {
      const student = [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' },
        { left: 'C', right: '99' }
      ];
      const r = AutoGradingService.gradeMatching(student, correct, 12);
      expect(r.isCorrect).toBe(false);
      expect(r.score).toBe(8);
      expect(r.correctCount).toBe(2);
      expect(r.correctRate).toBeCloseTo(2 / 3);
    });
  });

  describe('JSON 字符串格式', () => {
    test('字符串 JSON 学生答案 + 字符串 JSON 正确答案', () => {
      const student = JSON.stringify([
        { left: 'A', right: '1' },
        { left: 'B', right: '2' }
      ]);
      const correct = JSON.stringify([
        { left: 'A', right: '1' },
        { left: 'B', right: '2' }
      ]);
      const r = AutoGradingService.gradeMatching(student, correct, 10);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(10);
    });

    test('无效 JSON → 0 分', () => {
      const r = AutoGradingService.gradeMatching('not json', '[{"left":"A","right":"1"}]', 5);
      expect(r.isCorrect).toBe(false);
      expect(r.score).toBe(0);
    });
  });

  describe('对象包装与单 key 对', () => {
    test('{ pairs: [...] } 包装', () => {
      const correct = { pairs: [{ left: 'A', right: '1' }] };
      const student = [{ left: 'A', right: '1' }];
      const r = AutoGradingService.gradeMatching(student, correct, 5);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(5);
    });

    test('单 key 对 [{ A: "1" }] 形式', () => {
      const correct = [{ A: '1' }, { B: '2' }];
      const student = [{ A: '1' }, { B: '2' }];
      const r = AutoGradingService.gradeMatching(student, correct, 6);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(6);
    });
  });

  describe('边界与异常', () => {
    test('正确答案为空 → 0 分并提示', () => {
      const r = AutoGradingService.gradeMatching([], [], 10);
      expect(r.isCorrect).toBe(false);
      expect(r.totalCount).toBe(0);
      expect(r.message).toMatch(/为空/);
    });

    test('学生未作答 (null) → 0 分', () => {
      const r = AutoGradingService.gradeMatching(null, [{ left: 'A', right: '1' }], 5);
      expect(r.isCorrect).toBe(false);
      expect(r.score).toBe(0);
    });

    test('学生答案少于正确答案 → 按比例', () => {
      const correct = [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' },
        { left: 'C', right: '3' }
      ];
      const student = [{ left: 'A', right: '1' }];
      const r = AutoGradingService.gradeMatching(student, correct, 9);
      expect(r.correctCount).toBe(1);
      expect(r.totalCount).toBe(3);
      expect(r.score).toBe(3);
    });

    test('数值四舍五入到两位小数（10 分 / 3 对 = 3.33）', () => {
      const correct = [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' },
        { left: 'C', right: '3' }
      ];
      const student = [{ left: 'A', right: '1' }];
      const r = AutoGradingService.gradeMatching(student, correct, 10);
      expect(r.score).toBe(3.33);
    });

    test('trim 处理两端空格', () => {
      const correct = [{ left: 'A', right: '1' }];
      const student = [{ left: '  A  ', right: ' 1 ' }];
      const r = AutoGradingService.gradeMatching(student, correct, 5);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(5);
    });
  });

  describe('通过 gradeQuestion 分发', () => {
    test('matching 类型应路由到 gradeMatching', () => {
      const correct = JSON.stringify([{ left: 'A', right: '1' }, { left: 'B', right: '2' }]);
      const student = JSON.stringify([{ left: 'A', right: '1' }, { left: 'B', right: '2' }]);
      const r = AutoGradingService.gradeQuestion('matching', student, correct, 10);
      expect(r.isCorrect).toBe(true);
      expect(r.score).toBe(10);
    });
  });
});
