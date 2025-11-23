/**
 * Question Type Definitions
 * Question bank and question-related interfaces
 *
 * 🆕 Updated for Question Bank Redesign:
 * - Added QuestionDraft interface (草稿表)
 * - Added QuestionPublication interface (发布记录表)
 * - Updated QuestionBankItem to reflect new publication model
 * - Added district filtering support
 */

import { Timestamps } from './common';

/**
 * Question types supported by the system
 */
export type QuestionType =
  | 'single'            // 单选题 (updated from 'single_choice')
  | 'multiple'          // 多选题 (updated from 'multiple_choice')
  | 'true_false'        // 判断题
  | 'blank'             // 填空题 (updated from 'fill_blank')
  | 'essay'             // 问答题
  | 'code'              // 编程题 (updated from 'coding')
  | 'matching';         // 匹配题 (new)

/**
 * Question difficulty level
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Question draft/publication status
 * 🆕 Updated for new question bank system
 */
export type QuestionStatus =
  | 'draft'           // 草稿 (in question_drafts table)
  | 'pending_review'  // 待审核 (publication pending review)
  | 'published'       // 已发布 (publication active)
  | 'inactive';       // 已停用 (publication inactive)

/**
 * Question scope type
 * 🆕 Defines where a question can be published
 */
export type QuestionScope =
  | 'assessment'                  // 测评题库 (district-level)
  | 'practice_municipal'          // 市级练习题库
  | `practice_district_${string}` // 区级练习题库 (e.g., practice_district_YY)
  | `practice_school_${number}`;  // 校级练习题库 (e.g., practice_school_1)

/**
 * Question level (grade difficulty)
 * 🆕 Updated to match database constraints
 */
export type QuestionLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9';

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

// ========================================
// 🆕 New Question Bank Redesign Types
// ========================================

/**
 * Question Draft (草稿表)
 * Represents a question draft that can be published multiple times
 */
export interface QuestionDraft extends Timestamps {
  id: number;
  question_code?: string;
  type: QuestionType;
  subject: string;
  grade: string;
  level?: QuestionLevel;
  content: string;
  options?: string;  // JSON string of options
  correct_answer?: string;
  difficulty?: DifficultyLevel;
  points?: number;
  explanation?: string;
  hint?: string;
  tags?: string[];

  // Metadata
  publish_count: number;        // Number of times published
  total_usage_count: number;    // Total times used in activities

  // Ownership
  created_by: number;
  created_by_name?: string;
}

/**
 * Question Publication (发布记录表)
 * Represents a published instance of a question draft
 */
export interface QuestionPublication extends Timestamps {
  id: number;
  draft_id: number;
  scope: QuestionScope;
  status: QuestionStatus;

  // Extracted IDs from scope (auto-populated by trigger)
  district_id?: number;
  school_id?: number;

  // Joined data from districts/schools
  district_name?: string;
  district_code?: string;
  school_name?: string;

  // Publication metadata
  published_by: number;
  published_by_name?: string;
  reviewer_id?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  review_comment?: string;
  usage_count: number;  // Times used in this scope

  // Draft content (from join)
  draft?: QuestionDraft;
}

/**
 * Question Bank Item (题库题目)
 * 🆕 Updated to use publication model
 * This represents a question as seen in the question bank list
 */
export interface QuestionBankItemNew extends QuestionPublication {
  // All fields from QuestionPublication
  // Plus all fields from QuestionDraft (via join)
  type: QuestionType;
  subject: string;
  grade: string;
  level?: QuestionLevel;
  content: string;
  options?: string;
  correct_answer?: string;
  difficulty?: DifficultyLevel;
  points?: number;
  explanation?: string;
  question_code?: string;
  publish_count: number;
}

/**
 * District filter option
 * 🆕 For district selection dropdown
 */
export interface DistrictOption {
  id: number;
  code: string;
  name: string;
}

/**
 * Question bank filter parameters
 * 🆕 Updated to support district filtering
 */
export interface QuestionBankFilterParams {
  scope?: string;                // Filter by scope type
  district_code?: string;        // 🆕 Filter by district (admin only)
  subject?: string;
  grade?: string;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  level?: QuestionLevel;
  status?: QuestionStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Draft filter parameters
 */
export interface DraftFilterParams {
  subject?: string;
  grade?: string;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  level?: QuestionLevel;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Publish question payload
 * 🆕 For publishing a draft to a scope
 */
export interface PublishQuestionPayload {
  scope: QuestionScope;
  reviewer_id?: number;  // Required for non-school scopes
}

/**
 * Question bank API response
 * 🆕 Updated to include district filter status
 */
export interface QuestionBankResponse {
  success: boolean;
  data: QuestionBankItemNew[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    district_code_filter?: string;  // 🆕 Indicates which district was filtered
  };
}

/**
 * Draft list API response
 */
export interface DraftListResponse {
  success: boolean;
  data: QuestionDraft[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Publication list API response
 */
export interface PublicationListResponse {
  success: boolean;
  data: QuestionPublication[];
  meta: {
    count: number;
    draft_id: number;
  };
}
