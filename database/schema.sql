-- 贵阳市小学生测评平台数据库架构
-- PostgreSQL Database Schema

-- 创建数据库
-- CREATE DATABASE guiyang_oj;

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('student', 'teacher', 'school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin')),
    real_name VARCHAR(100),
    id_card VARCHAR(18) UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(100),
    avatar_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 区域表
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    level VARCHAR(20) CHECK (level IN ('district', 'municipal')), -- 区级或市级
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 学校表
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    district_id INTEGER REFERENCES districts(id),
    district VARCHAR(50), -- 保留原字段兼容性
    address VARCHAR(255),
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    type VARCHAR(20) DEFAULT 'regular' CHECK (type IN ('regular', 'municipal', 'base')), -- 普通校/市直属/基地校
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 学生信息表
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    student_no VARCHAR(50) UNIQUE,
    school_id INTEGER REFERENCES schools(id),
    grade VARCHAR(20),
    class VARCHAR(20),
    enrollment_date DATE,
    guardian_name VARCHAR(50),
    guardian_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 教师信息表
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    teacher_no VARCHAR(50) UNIQUE,
    school_id INTEGER REFERENCES schools(id),
    subjects TEXT[], -- 教授科目数组
    title VARCHAR(50), -- 职称
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员权限表
CREATE TABLE admin_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    school_id INTEGER REFERENCES schools(id), -- 校级管理员管理的学校
    district_id INTEGER REFERENCES districts(id), -- 区级管理员管理的区域
    permission_scope JSONB, -- 权限范围配置
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 题目表
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('single', 'multiple', 'blank', 'essay', 'code')),
    content TEXT NOT NULL,
    options JSONB, -- 选项（JSON格式存储）
    correct_answer TEXT, -- 正确答案
    score INTEGER NOT NULL,
    order_no INTEGER, -- 题目顺序
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    explanation TEXT, -- 题目解析
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 答题记录表
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    student_exam_id INTEGER REFERENCES student_activities(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id),
    answer TEXT,
    is_correct BOOLEAN,
    score DECIMAL(5,2),
    graded_by INTEGER REFERENCES users(id),
    graded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_exam_id, question_id)
);

-- 证书表
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id),
    exam_id INTEGER REFERENCES activities(id),
    cert_no VARCHAR(100) UNIQUE,
    issue_date DATE,
    level VARCHAR(20), -- 等级（优秀、良好、及格等）
    file_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 活动题目关联表（组卷系统）
CREATE TABLE activity_questions (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    score DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    is_required BOOLEAN DEFAULT true,
    section VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, question_id),
    UNIQUE(activity_id, order_index)
);

-- 公告表
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    type VARCHAR(20),
    target_audience VARCHAR(20), -- student, teacher, all
    is_pinned BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    target_type VARCHAR(50),
    target_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_id_card ON users(id_card);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_districts_code ON districts(code);
CREATE INDEX idx_schools_district_id ON schools(district_id);
CREATE INDEX idx_schools_type ON schools(type);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_school_id ON teachers(school_id);
CREATE INDEX idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX idx_admin_permissions_school_id ON admin_permissions(school_id);
CREATE INDEX idx_admin_permissions_district_id ON admin_permissions(district_id);
CREATE INDEX idx_exams_subject ON exams(subject);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_questions_exam_id ON questions(exam_id);
CREATE INDEX idx_student_exams_student_id ON student_exams(student_id);
CREATE INDEX idx_student_exams_exam_id ON student_exams(exam_id);
CREATE INDEX idx_answers_student_exam_id ON answers(student_exam_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 触发器：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();