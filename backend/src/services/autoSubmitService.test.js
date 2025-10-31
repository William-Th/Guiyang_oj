/**
 * Unit tests for Auto Submit Service
 */

const { autoSubmitExpiredActivities } = require('./autoSubmitService');
const { query } = require('../database/connection');

// Mock dependencies
jest.mock('../database/connection');
jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Auto Submit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('autoSubmitExpiredActivities', () => {
    it('should find and auto-submit expired activities', async () => {
      // Mock finding expired activities
      const mockExpiredActivities = [
        {
          id: 1,
          student_id: 100,
          activity_id: 50,
          time_limit_deadline: '2025-10-27T10:00:00Z',
          title: '数学测试',
          time_limit_type: 'timed'
        },
        {
          id: 2,
          student_id: 101,
          activity_id: 51,
          time_limit_deadline: '2025-10-27T10:05:00Z',
          title: '语文测试',
          time_limit_type: 'scheduled'
        }
      ];

      // Mock calculating scores
      const mockScores = [
        { total_score: 85 },
        { total_score: 90 }
      ];

      // Setup query mock
      query
        .mockResolvedValueOnce({ rows: mockExpiredActivities }) // First call: find expired
        .mockResolvedValueOnce({ rows: [mockScores[0]] })       // Second call: calculate score for activity 1
        .mockResolvedValueOnce({ rows: [] })                     // Third call: update activity 1
        .mockResolvedValueOnce({ rows: [mockScores[1]] })       // Fourth call: calculate score for activity 2
        .mockResolvedValueOnce({ rows: [] });                    // Fifth call: update activity 2

      await autoSubmitExpiredActivities();

      // Verify queries were called correctly
      expect(query).toHaveBeenCalledTimes(5);

      // Verify first query finds expired activities
      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE sa.status = \'in_progress\''));

      // Verify score calculations
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('SUM(score)'), [1]);
      expect(query).toHaveBeenNthCalledWith(4, expect.stringContaining('SUM(score)'), [2]);

      // Verify updates
      expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining('UPDATE student_activities'), [85, 1]);
      expect(query).toHaveBeenNthCalledWith(5, expect.stringContaining('UPDATE student_activities'), [90, 2]);
    });

    it('should handle zero expired activities gracefully', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await autoSubmitExpiredActivities();

      // Should only query once to find expired activities
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should handle activities with null scores', async () => {
      const mockExpiredActivities = [
        {
          id: 1,
          student_id: 100,
          activity_id: 50,
          time_limit_deadline: '2025-10-27T10:00:00Z',
          title: '数学测试',
          time_limit_type: 'timed'
        }
      ];

      query
        .mockResolvedValueOnce({ rows: mockExpiredActivities })
        .mockResolvedValueOnce({ rows: [{ total_score: null }] }) // No answers submitted
        .mockResolvedValueOnce({ rows: [] });

      await autoSubmitExpiredActivities();

      // Should update with score 0
      expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining('UPDATE student_activities'), [0, 1]);
    });

    it('should continue processing if one activity fails', async () => {
      const mockExpiredActivities = [
        {
          id: 1,
          student_id: 100,
          activity_id: 50,
          time_limit_deadline: '2025-10-27T10:00:00Z',
          title: '数学测试',
          time_limit_type: 'timed'
        },
        {
          id: 2,
          student_id: 101,
          activity_id: 51,
          time_limit_deadline: '2025-10-27T10:05:00Z',
          title: '语文测试',
          time_limit_type: 'scheduled'
        }
      ];

      query
        .mockResolvedValueOnce({ rows: mockExpiredActivities })
        .mockRejectedValueOnce(new Error('Database error'))       // Fail on first activity
        .mockResolvedValueOnce({ rows: [{ total_score: 90 }] })   // Succeed on second activity
        .mockResolvedValueOnce({ rows: [] });

      await autoSubmitExpiredActivities();

      // Should have attempted all activities
      expect(query).toHaveBeenCalledTimes(4);
    });

    it('should handle database errors gracefully', async () => {
      query.mockRejectedValueOnce(new Error('Connection failed'));

      // Should not throw
      await expect(autoSubmitExpiredActivities()).resolves.not.toThrow();
    });

    it('should use correct SQL to find expired activities', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await autoSubmitExpiredActivities();

      const sqlQuery = query.mock.calls[0][0];

      // Verify SQL includes key conditions
      expect(sqlQuery).toContain('student_activities sa');
      expect(sqlQuery).toContain('JOIN activities a');
      expect(sqlQuery).toContain('WHERE sa.status = \'in_progress\'');
      expect(sqlQuery).toContain('AND sa.time_limit_deadline IS NOT NULL');
      expect(sqlQuery).toContain('AND sa.time_limit_deadline <= NOW()');
      expect(sqlQuery).toContain('ORDER BY sa.time_limit_deadline ASC');
    });

    it('should set submitted_at timestamp on auto-submit', async () => {
      const mockExpiredActivities = [
        {
          id: 1,
          student_id: 100,
          activity_id: 50,
          time_limit_deadline: '2025-10-27T10:00:00Z',
          title: '数学测试',
          time_limit_type: 'timed'
        }
      ];

      query
        .mockResolvedValueOnce({ rows: mockExpiredActivities })
        .mockResolvedValueOnce({ rows: [{ total_score: 85 }] })
        .mockResolvedValueOnce({ rows: [] });

      await autoSubmitExpiredActivities();

      const updateQuery = query.mock.calls[2][0];

      // Verify update includes timestamp
      expect(updateQuery).toContain('submitted_at = NOW()');
      expect(updateQuery).toContain('updated_at = NOW()');
      expect(updateQuery).toContain('status = \'completed\'');
    });
  });
});
