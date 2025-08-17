-- 为certificates表添加score字段
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- 添加分数的检查约束
ALTER TABLE certificates ADD CONSTRAINT check_score_range CHECK (score >= 0 AND score <= 100);

-- 添加索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_certificates_cert_no ON certificates(cert_no);
CREATE INDEX IF NOT EXISTS idx_certificates_student_exam ON certificates(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_certificates_level ON certificates(level);
CREATE INDEX IF NOT EXISTS idx_certificates_score ON certificates(score);