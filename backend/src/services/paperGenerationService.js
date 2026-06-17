const ActivityQuestion = require('../models/ActivityQuestion');
const Activity = require('../models/Activity');
const QuestionBank = require('../models/QuestionBank');

/**
 * Paper Generation Service
 * Business logic for generating activity papers (test papers)
 */
class PaperGenerationService {
  /**
   * Get available questions for an activity
   * @param {number} activityId - Activity ID
   * @param {Object} filters - Filter criteria
   * @param {Object} user - User object
   * @returns {Promise<Object>} Available questions and metadata
   */
  static async getAvailableQuestions(activityId, filters = {}, user) {
    // Verify activity exists and user has permission
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission: creator, teachers, or any admin role
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    const isCreator = activity.created_by === user.id;
    const isTeacher = user.role === 'teacher';
    const isAdmin = adminRoles.includes(user.role);

    if (!isCreator && !isTeacher && !isAdmin) {
      throw new Error('Permission denied');
    }

    // Get available questions
    const questions = await ActivityQuestion.getAvailableQuestions(activityId, filters);

    // Get current paper stats
    const paperStats = await ActivityQuestion.getActivityPaperStats(activityId);

    return {
      questions,
      paperStats,
      totalAvailable: questions.length
    };
  }

  /**
   * Add a question to an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @param {Object} options - Options {score}
   * @param {Object} user - User object
   * @returns {Promise<Object>} Added question
   */
  static async addQuestionToActivity(activityId, questionId, options = {}, user) {
    // Verify activity exists and user has permission
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission: creator, teachers, or any admin role
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    const isCreator = activity.created_by === user.id;
    const isTeacher = user.role === 'teacher';
    const isAdmin = adminRoles.includes(user.role);

    if (!isCreator && !isTeacher && !isAdmin) {
      throw new Error('Permission denied');
    }

    // Check if activity is already published
    if (activity.status === 'published') {
      throw new Error('该活动已发布，不能继续组卷，请先撤回发布');
    }

    // Check if question already exists
    const exists = await ActivityQuestion.questionExists(activityId, questionId);
    if (exists) {
      throw new Error('Question already added to this activity');
    }

    // Verify question exists and is published
    const question = await QuestionBank.findById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.status !== 'published') {
      throw new Error('Question is not published');
    }

    // Check if question matches activity subject and grade
    if (question.subject !== activity.subject) {
      throw new Error(`Question subject (${question.subject}) does not match activity subject (${activity.subject})`);
    }

    if (question.grade !== activity.grade) {
      throw new Error(`Question grade (${question.grade}) does not match activity grade (${activity.grade})`);
    }

    // Get next order index
    const orderIndex = await ActivityQuestion.getNextOrderIndex(activityId);

    // Default score is question's suggested score
    const score = options.score || question.suggested_score || 5;

    // Add question
    const addedQuestion = await ActivityQuestion.addQuestion({
      activityId,
      questionId,
      orderIndex,
      score
    });

    return addedQuestion;
  }

  /**
   * Add multiple questions to an activity (batch)
   * @param {number} activityId - Activity ID
   * @param {Array} questions - Array of {questionId, score}
   * @param {Object} user - User object
   * @returns {Promise<Object>} Result with added questions and errors
   */
  static async addQuestionsToActivity(activityId, questions, user) {
    // Verify activity exists and user has permission
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission: creator, teachers, or any admin role
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    const isCreator = activity.created_by === user.id;
    const isTeacher = user.role === 'teacher';
    const isAdmin = adminRoles.includes(user.role);

    if (!isCreator && !isTeacher && !isAdmin) {
      throw new Error('Permission denied');
    }

    // Check if activity is already published
    if (activity.status === 'published') {
      throw new Error('该活动已发布，不能继续组卷，请先撤回发布');
    }

    const results = {
      added: [],
      errors: []
    };

    for (const q of questions) {
      try {
        const addedQuestion = await this.addQuestionToActivity(
          activityId,
          q.questionId,
          { score: q.score },
          user
        );
        results.added.push(addedQuestion);
      } catch (error) {
        results.errors.push({
          questionId: q.questionId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Remove a question from an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} Removed question
   */
  static async removeQuestionFromActivity(activityId, questionId, user) {
    // Verify activity exists and user has permission
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission: creator, teachers, or any admin role
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    const isCreator = activity.created_by === user.id;
    const isTeacher = user.role === 'teacher';
    const isAdmin = adminRoles.includes(user.role);

    if (!isCreator && !isTeacher && !isAdmin) {
      throw new Error('Permission denied');
    }

    // Check if activity is already published
    if (activity.status === 'published') {
      throw new Error('该活动已发布，不能继续组卷，请先撤回发布');
    }

    // Remove question
    const removedQuestion = await ActivityQuestion.removeQuestion(activityId, questionId);

    if (!removedQuestion) {
      throw new Error('Question not found in this activity');
    }

    return removedQuestion;
  }

  /**
   * Update question properties in an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @param {Object} updates - Updates {score}
   * @param {Object} user - User object
   * @returns {Promise<Object>} Updated question
   */
  static async updateActivityQuestion(activityId, questionId, updates, user) {
    // Verify activity exists and user has permission
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission: creator, teachers, or any admin role
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    const isCreator = activity.created_by === user.id;
    const isTeacher = user.role === 'teacher';
    const isAdmin = adminRoles.includes(user.role);

    if (!isCreator && !isTeacher && !isAdmin) {
      throw new Error('Permission denied');
    }

    // Check if activity is already published
    if (activity.status === 'published') {
      throw new Error('该活动已发布，不能继续组卷，请先撤回发布');
    }

    // Update question
    const updatedQuestion = await ActivityQuestion.updateQuestion(activityId, questionId, updates);

    if (!updatedQuestion) {
      throw new Error('Question not found in this activity');
    }

    return updatedQuestion;
  }

  /**
   * Reorder questions in an activity
   * @param {number} activityId - Activity ID
   * @param {Array} orderUpdates - Array of {questionId, orderIndex}
   * @param {Object} user - User object
   * @returns {Promise<Array>} Updated questions
   */
  static async reorderQuestions(activityId, orderUpdates, user) {
    // Verify activity exists and user has permission
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission: creator, teachers, or any admin role
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    const isCreator = activity.created_by === user.id;
    const isTeacher = user.role === 'teacher';
    const isAdmin = adminRoles.includes(user.role);

    if (!isCreator && !isTeacher && !isAdmin) {
      throw new Error('Permission denied');
    }

    // Check if activity is already published
    if (activity.status === 'published') {
      throw new Error('该活动已发布，不能继续组卷，请先撤回发布');
    }

    // Update orders
    const updatedQuestions = await ActivityQuestion.batchUpdateOrders(activityId, orderUpdates);

    return updatedQuestions;
  }

  /**
   * Get activity paper (all questions with details)
   * @param {number} activityId - Activity ID
   * @param {Object} user - User object (optional for permissions check)
   * @returns {Promise<Object>} Activity paper with questions
   */
  static async getActivityPaper(activityId, user = null) {
    // Verify activity exists
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // If user provided, check if they have permission to view draft papers
    if (user && activity.status === 'draft') {
      const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
      const isCreator = activity.created_by === user.id;
      const isTeacher = user.role === 'teacher';
      const isAdmin = adminRoles.includes(user.role);

      if (!isCreator && !isTeacher && !isAdmin) {
        throw new Error('Permission denied');
      }
    }

    // Get questions
    const questions = await ActivityQuestion.getActivityQuestions(activityId);

    // Get paper stats
    const paperStats = await ActivityQuestion.getActivityPaperStats(activityId);

    return {
      activity,
      questions,
      paperStats
    };
  }

  /**
   * Get activity paper statistics
   * @param {number} activityId - Activity ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} Paper statistics
   */
  static async getActivityPaperStats(activityId, user) {
    // Verify activity exists
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission for draft activities
    if (activity.status === 'draft') {
      const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
      const isCreator = activity.created_by === user.id;
      const isTeacher = user.role === 'teacher';
      const isAdmin = adminRoles.includes(user.role);

      if (!isCreator && !isTeacher && !isAdmin) {
        throw new Error('Permission denied');
      }
    }

    // Get stats
    const stats = await ActivityQuestion.getActivityPaperStats(activityId);

    return stats;
  }

  /**
   * Clear all questions from an activity
   * @param {number} activityId - Activity ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} Result {removed: number}
   */
  static async clearActivityPaper(activityId, user) {
    // Verify activity exists and user has permission
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check permission: creator, teachers, or any admin role
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    const isCreator = activity.created_by === user.id;
    const isTeacher = user.role === 'teacher';
    const isAdmin = adminRoles.includes(user.role);

    if (!isCreator && !isTeacher && !isAdmin) {
      throw new Error('Permission denied');
    }

    // Check if activity is already published
    if (activity.status === 'published') {
      throw new Error('该活动已发布，不能继续组卷，请先撤回发布');
    }

    // Remove all questions
    const removed = await ActivityQuestion.removeAllQuestions(activityId);

    return { removed };
  }

  /**
   * Smart recommend questions for an activity
   * @deprecated This feature has been removed from the system
   * @param {number} activityId - Activity ID
   * @param {Object} criteria - Criteria {count, difficulty, types}
   * @param {Object} user - User object
   * @returns {Promise<Array>} Recommended questions
   */
  // static async recommendQuestions(activityId, criteria = {}, user) {
  //   // Verify activity exists and user has permission
  //   const activity = await Activity.findById(activityId);
  //   if (!activity) {
  //     throw new Error('Activity not found');
  //   }

  //   // Check permission: creator, teachers, or any admin role
  //   const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
  //   const isCreator = activity.created_by === user.id;
  //   const isTeacher = user.role === 'teacher';
  //   const isAdmin = adminRoles.includes(user.role);

  //   if (!isCreator && !isTeacher && !isAdmin) {
  //     throw new Error('Permission denied');
  //   }

  //   const {
  //     count = 20,
  //     difficulty = { easy: 40, medium: 40, hard: 20 }, // Percentage distribution
  //     types = { single: 40, multiple: 30, blank: 20, essay: 10 } // Percentage distribution
  //   } = criteria;

  //   // Get available questions
  //   const allQuestions = await ActivityQuestion.getAvailableQuestions(activityId);

  //   // Group by type and difficulty
  //   const questionsByType = {};
  //   const questionsByDifficulty = {};

  //   allQuestions.forEach(q => {
  //     if (!questionsByType[q.type]) questionsByType[q.type] = [];
  //     if (!questionsByDifficulty[q.difficulty]) questionsByDifficulty[q.difficulty] = [];

  //     questionsByType[q.type].push(q);
  //     questionsByDifficulty[q.difficulty].push(q);
  //   });

  //   // Select questions based on criteria
  //   const recommended = [];
  //   const selected = new Set();

  //   // Helper function to randomly select questions
  //   const selectRandom = (pool, num) => {
  //     const shuffled = pool.sort(() => 0.5 - Math.random());
  //     return shuffled.slice(0, num);
  //   };

  //   // Select by type distribution
  //   for (const [type, percentage] of Object.entries(types)) {
  //     const numQuestions = Math.round((count * percentage) / 100);
  //     const pool = (questionsByType[type] || []).filter(q => !selected.has(q.id));

  //     const selectedQuestions = selectRandom(pool, numQuestions);
  //     selectedQuestions.forEach(q => {
  //       recommended.push(q);
  //       selected.add(q.id);
  //     });
  //   }

  //   // If we don't have enough questions, fill with any available
  //   if (recommended.length < count) {
  //     const remaining = allQuestions.filter(q => !selected.has(q.id));
  //     const additional = selectRandom(remaining, count - recommended.length);
  //     recommended.push(...additional);
  //   }

  //   return recommended.slice(0, count);
  // }

  /**
   * Validate activity paper before publishing
   * @param {number} activityId - Activity ID
   * @returns {Promise<Object>} Validation result {valid: boolean, errors: []}
   */
  static async validateActivityPaper(activityId) {
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return { valid: false, errors: ['Activity not found'] };
    }

    const questions = await ActivityQuestion.getActivityQuestions(activityId);
    const stats = await ActivityQuestion.getActivityPaperStats(activityId);

    const errors = [];

    // Check if there are questions
    if (!questions || questions.length === 0) {
      errors.push('Activity has no questions');
    }

    // Check if total score matches activity total_score (if set)
    if (activity.total_score && stats.total_score !== parseFloat(activity.total_score)) {
      errors.push(`Total score mismatch: expected ${activity.total_score}, got ${stats.total_score}`);
    }

    // Check for duplicate order indices
    const orderIndices = questions.map(q => q.order_index);
    const duplicates = orderIndices.filter((item, index) => orderIndices.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate order indices found: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      stats
    };
  }
}

module.exports = PaperGenerationService;
