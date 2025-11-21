/**
 * Question Type Definitions
 * Question bank and question-related interfaces
 */

import { Timestamps } from './common';

/**
 * Question types supported by the system
 */
export type QuestionType =
  | 'single_choice'     // 单选题
  | 'multiple_choice'   // 多选题
  | 'true_false'        // 判断题
  | 'fill_blank'        // 填空题
  | 'short_answer'      // 简答题
  | 'essay'             // 论述题
  | 'coding';           // 编程题

/**
 * Question difficulty level
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Question status
 */
export type QuestionStatus =
  | 'draft'           // 草稿
  | 'pending_review'  // 待审核
  | 'approved'        // 已批准
  | 'rejected'        // 已拒绝
  | 'published';      // 已发布

/**
 * Question review status
 */
export type ReviewStatus =
  | 'pending'   // 待审核
  | 'approved'  // 已批准
  | 'rejected'; // 已拒绝

/**
 * Choice option for multiple choice questions
 */
export interface ChoiceOption {
  label: string;  // A, B, C, D
  content: string;
  isCorrect?: boolean;
}

/**
 * Question metadata
 */
export interface QuestionMetadata {
  tags?: string[];
  knowledge_points?: string[];
  difficulty?: DifficultyLevel;
  estimated_time?: number;  // in minutes
  source?: string;
  author?: string;
}

/**
 * Base Question interface
 */
export interface Question extends Timestamps {
  id: number;
  question_code?: string;
  type: QuestionType;
  content: string;
  subject: string;
  grade: string;
  difficulty?: DifficultyLevel;
  score: number;
  status: QuestionStatus;

  // Type-specific fields
  options?: ChoiceOption[];        // For choice questions
  correct_answer?: string | string[];  // Flexible: string for single, array for multiple
  answer_explanation?: string;

  // Metadata
  tags?: string[];
  knowledge_points?: string[];
  estimated_time?: number;

  // Ownership
  created_by: number;
  created_by_name?: string;

  // Review info
  review_status?: ReviewStatus;
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_comment?: string;
}

/**
 * Question Bank (组题单元)
 */
export interface QuestionBank extends Timestamps {
  id: number;
  name: string;
  description?: string;
  subject: string;
  grade: string;
  question_count: number;
  total_score: number;
  type?: 'practice' | 'assessment';  // 练习题库 or 测评题库
  status: 'active' | 'inactive';
  created_by: number;
  created_by_name?: string;
}

/**
 * Question in a question bank (with association data)
 */
export interface QuestionBankItem extends Question {
  bank_id: number;
  order: number;  // Position in the bank
  score_override?: number;  // Override the default score
}

/**
 * Question creation payload
 */
export interface QuestionCreatePayload {
  type: QuestionType;
  content: string;
  subject: string;
  grade: string;
  difficulty?: DifficultyLevel;
  score: number;
  options?: ChoiceOption[];
  correct_answer?: string | string[];
  answer_explanation?: string;
  tags?: string[];
  knowledge_points?: string[];
  estimated_time?: number;
  status?: QuestionStatus;
}

/**
 * Question update payload
 */
export interface QuestionUpdatePayload extends Partial<QuestionCreatePayload> {
  id: number;
}

/**
 * Question review payload
 */
export interface QuestionReviewPayload {
  question_id: number;
  action: 'approve' | 'reject';
  comment?: string;
}

/**
 * Question filter parameters
 */
export interface QuestionFilterParams {
  subject?: string;
  grade?: string;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  status?: QuestionStatus;
  review_status?: ReviewStatus;
  tags?: string[];
  created_by?: number;
  search?: string;  // Search in content
}

/**
 * Question import result
 */
export interface QuestionImportResult {
  success: number;
  failed: number;
  total: number;
  errors?: Array<{
    row: number;
    error: string;
  }>;
  imported_ids?: number[];
}
