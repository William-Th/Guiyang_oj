-- Migration: Enhance Questions Table for Better Question Bank Management
-- Date: 2024-08-17

-- Add subject column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS subject VARCHAR(50) CHECK (subject IN ('math', 'chinese', 'english', 'science', 'computer', 'art', 'music', 'pe'));

-- Add tags for better categorization
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add metadata for import tracking
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create question bank table (questions not tied to specific exams)
CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple', 'blank', 'essay', 'code', 'true_false', 'matching')),
    subject VARCHAR(50) CHECK (subject IN ('math', 'chinese', 'english', 'science', 'computer', 'art', 'music', 'pe')),
    grade VARCHAR(20),
    content TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB, -- Changed to JSONB to support multiple correct answers
    score INTEGER DEFAULT 1,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    explanation TEXT,
    tags TEXT[],
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    image_url VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create exam_questions relationship table
CREATE TABLE IF NOT EXISTS exam_questions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    question_bank_id INTEGER REFERENCES question_bank(id),
    order_no INTEGER,
    score INTEGER, -- Can override default score for specific exam
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_id, question_bank_id)
);

-- Create question categories table
CREATE TABLE IF NOT EXISTS question_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES question_categories(id),
    subject VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add category to question bank
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES question_categories(id);

-- Create import logs table for tracking bulk imports
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(20),
    total_rows INTEGER,
    successful_rows INTEGER,
    failed_rows INTEGER,
    error_details JSONB,
    imported_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject);
CREATE INDEX IF NOT EXISTS idx_question_bank_grade ON question_bank(grade);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(type);
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_bank_id ON exam_questions(question_bank_id);

-- Add comments for documentation
COMMENT ON TABLE question_bank IS 'Central repository of all questions that can be reused across exams';
COMMENT ON TABLE exam_questions IS 'Links questions from question bank to specific exams';
COMMENT ON TABLE question_categories IS 'Hierarchical categorization of questions';
COMMENT ON TABLE import_logs IS 'Tracks bulk import operations for questions';

COMMENT ON COLUMN question_bank.type IS 'Question type: single, multiple, blank, essay, code, true_false, matching';
COMMENT ON COLUMN question_bank.correct_answer IS 'JSONB format to support various answer types including arrays for multiple choice';
COMMENT ON COLUMN question_bank.tags IS 'Array of tags for flexible categorization';
COMMENT ON COLUMN question_bank.usage_count IS 'Number of times this question has been used in exams';
COMMENT ON COLUMN question_bank.success_rate IS 'Percentage of students who answered correctly';