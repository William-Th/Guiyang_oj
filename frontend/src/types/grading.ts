/**
 * Grading Type Definitions
 * Grading and assessment-related interfaces
 */

import { Timestamps } from './common';
import { QuestionType } from './question';

/**
 * Grading status
 */
export type GradingStatus =
  | 'pending'      // 待评卷
  | 'in_progress'  // 评卷中
  | 'completed'    // 已完成
  | 'reviewed';    // 已复核

/**
 * Answer grading status
 */
export type AnswerGradingStatus =
  | 'pending'       // 待评分
  | 'auto_graded'   // 自动评分
  | 'manual_graded' // 人工评分
  | 'reviewed';     // 已复核

/**
 * Student answer
 */
export interface Answer extends Timestamps {
  id: number;
  student_activity_id: number;
  question_id: number;
  answer: string | string[] | Record<string, unknown>;  // Flexible answer format

  // Scoring
  score: number | null;
  auto_score: number | null;
  manual_score: number | null;
  is_correct: boolean | null;

  // Grading info
  grading_status: AnswerGradingStatus;
  feedback: string | null;
  graded_by?: number;
  graded_by_name?: string;
  graded_at?: string;
}

/**
 * Question in grading context (with answer)
 */
export interface GradingQuestion {
  id: number;
  type: QuestionType;
  content: string;
  score: number;
  options?: Array<{ label: string; content: string }>;
  correct_answer?: string | string[];
  answer_explanation?: string;

  // Student's answer
  answer: Answer;
}

/**
 * Student activity submission for grading
 */
export interface StudentSubmission extends Timestamps {
  id: number;  // student_activity_id
  student_id: number;
  student_name: string;
  student_number?: string;

  activity_id: number;
  activity_title: string;
  activity_type: 'practice' | 'assessment';

  // Submission info
  submitted_at: string;
  total_score: number;
  obtained_score: number | null;

  // Grading status
  grading_status: GradingStatus;
  pending_count: number;  // Number of questions pending grading
  completed_count: number;  // Number of questions graded

  // Grader info
  graded_by?: number;
  graded_by_name?: string;
  grading_started_at?: string;
  grading_completed_at?: string;
}

/**
 * Detailed grading information
 */
export interface GradingDetail extends Timestamps {
  // Student info
  student_id: number;
  student_name: string;
  student_number?: string;

  // Activity info
  activity_id: number;
  activity_title: string;
  activity_type: 'practice' | 'assessment';
  total_score: number;

  // Submission info
  student_activity_id: number;
  submitted_at: string;

  // Questions and answers
  answers: GradingQuestion[];

  // Current grading status
  grading_status: GradingStatus;
  pending_count: number;
  completed_count: number;
  total_count: number;

  // Scores
  obtained_score: number | null;
  auto_score: number | null;
  manual_score: number | null;
}

/**
 * Grade answer payload
 */
export interface GradeAnswerPayload {
  score: number;
  feedback?: string;
}

/**
 * Batch grade payload
 */
export interface BatchGradePayload {
  answerId: number;
  score: number;
  feedback?: string;
}

/**
 * Grading filter parameters
 */
export interface GradingFilterParams {
  activity_id?: number;
  grading_status?: GradingStatus;
  student_name?: string;
  date_from?: string;
  date_to?: string;
  graded_by?: number;
}

/**
 * Grading statistics
 */
export interface GradingStats {
  total_submissions: number;
  pending_grading: number;
  completed_grading: number;
  avg_score: number;
  pass_rate: number;  // Percentage
  avg_grading_time: number;  // in minutes
}

/**
 * Local grading backup (for offline support)
 */
export interface GradingBackup {
  student_activity_id: number;
  answers: Array<{
    answerId: number;
    score: number;
    feedback?: string;
  }>;
  timestamp: number;
}
