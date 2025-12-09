-- =====================================================
-- Migration 031: 编程题判题系统
-- Programming Question Judge System
--
-- 创建日期: 2025-12-08
-- 说明: 为编程题（type='code'）添加判题支持
--       包含测试用例管理、代码提交记录、判题结果存储
-- =====================================================

-- =====================================================
-- 1. 测试用例表 (test_cases)
-- 存储编程题的输入输出测试数据
-- =====================================================

CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL,               -- 关联题目草稿ID (question_drafts.id)
    case_number INTEGER NOT NULL,               -- 测试点编号 (1, 2, 3...)
    input_data TEXT NOT NULL DEFAULT '',        -- 输入数据
    expected_output TEXT NOT NULL,              -- 期望输出
    score INTEGER DEFAULT 10,                   -- 该测试点分值
    time_limit INTEGER DEFAULT 1000,            -- 时间限制 (毫秒)
    memory_limit INTEGER DEFAULT 256,           -- 内存限制 (MB)
    is_sample BOOLEAN DEFAULT false,            -- 是否为样例 (展示给学生)
    description VARCHAR(200),                   -- 测试点描述
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束：关联到 question_drafts 表（题目内容表）
    CONSTRAINT fk_test_cases_question
        FOREIGN KEY (question_id) REFERENCES question_drafts(id) ON DELETE CASCADE,

    -- 唯一约束：同一题目的测试点编号唯一
    CONSTRAINT unique_question_case UNIQUE (question_id, case_number)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_test_cases_question ON test_cases(question_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_sample ON test_cases(question_id, is_sample);

-- 注释
COMMENT ON TABLE test_cases IS '编程题测试用例表';
COMMENT ON COLUMN test_cases.question_id IS '关联的题目草稿ID (question_drafts.id)';
COMMENT ON COLUMN test_cases.case_number IS '测试点编号，从1开始递增';
COMMENT ON COLUMN test_cases.input_data IS '测试输入数据，通过stdin传递给程序';
COMMENT ON COLUMN test_cases.expected_output IS '期望的正确输出，用于与程序stdout比对';
COMMENT ON COLUMN test_cases.score IS '该测试点的分值，所有测试点分值之和应等于题目总分';
COMMENT ON COLUMN test_cases.time_limit IS '时间限制(毫秒)，默认1000ms，超时返回TLE';
COMMENT ON COLUMN test_cases.memory_limit IS '内存限制(MB)，默认256MB，超限返回MLE';
COMMENT ON COLUMN test_cases.is_sample IS '是否为样例测试点，样例会展示给学生查看';
COMMENT ON COLUMN test_cases.description IS '测试点描述，如"基础测试"、"边界测试"、"大数据测试"';


-- =====================================================
-- 2. 代码提交记录表 (code_submissions)
-- 记录学生的代码提交和判题结果
-- =====================================================

CREATE TABLE IF NOT EXISTS code_submissions (
    id SERIAL PRIMARY KEY,
    student_activity_id INTEGER NOT NULL,       -- 关联 student_activities.id
    question_id INTEGER NOT NULL,               -- 关联 question_bank.id
    student_id INTEGER NOT NULL,                -- 学生用户ID (users.id)

    -- 提交信息
    source_code TEXT NOT NULL,                  -- 提交的源代码
    language VARCHAR(20) DEFAULT 'cpp',         -- 编程语言
    code_length INTEGER,                        -- 代码长度 (字符数)

    -- 判题结果
    status VARCHAR(20) DEFAULT 'pending',       -- 判题状态
    score INTEGER DEFAULT 0,                    -- 实际得分
    total_score INTEGER,                        -- 该题总分

    -- 执行统计
    time_used INTEGER,                          -- 最大运行时间 (毫秒)
    memory_used INTEGER,                        -- 最大内存使用 (KB)

    -- 详细信息
    compile_output TEXT,                        -- 编译输出/错误信息
    judge_result JSONB,                         -- 详细判题结果 (每个测试点)
    error_message TEXT,                         -- 错误信息

    -- 时间戳
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    judged_at TIMESTAMP,                        -- 判题完成时间

    -- 约束
    CONSTRAINT code_submissions_status_check CHECK (
        status IN (
            'pending',          -- 等待判题
            'judging',          -- 判题中
            'accepted',         -- 全部通过 (AC)
            'wrong_answer',     -- 答案错误 (WA)
            'compile_error',    -- 编译错误 (CE)
            'runtime_error',    -- 运行错误 (RE)
            'time_limit',       -- 超时 (TLE)
            'memory_limit',     -- 内存超限 (MLE)
            'output_limit',     -- 输出超限 (OLE)
            'partial',          -- 部分通过
            'system_error'      -- 系统错误
        )
    ),
    CONSTRAINT code_submissions_language_check CHECK (
        language IN ('cpp', 'c', 'python', 'java', 'javascript')
    ),

    -- 外键
    CONSTRAINT fk_submission_student_activity
        FOREIGN KEY (student_activity_id) REFERENCES student_activities(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_question
        FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_submissions_student_activity ON code_submissions(student_activity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON code_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON code_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_question ON code_submissions(question_id);
CREATE INDEX IF NOT EXISTS idx_submissions_time ON code_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_judged ON code_submissions(judged_at DESC) WHERE judged_at IS NOT NULL;

-- 注释
COMMENT ON TABLE code_submissions IS '编程题代码提交记录表';
COMMENT ON COLUMN code_submissions.student_activity_id IS '关联的学生活动ID，标识这次提交属于哪次考试/练习';
COMMENT ON COLUMN code_submissions.question_id IS '关联的题目ID';
COMMENT ON COLUMN code_submissions.student_id IS '提交代码的学生用户ID';
COMMENT ON COLUMN code_submissions.source_code IS '学生提交的源代码内容';
COMMENT ON COLUMN code_submissions.language IS '编程语言: cpp, c, python, java, javascript';
COMMENT ON COLUMN code_submissions.code_length IS '代码长度（字符数），用于统计和限制';
COMMENT ON COLUMN code_submissions.status IS '判题状态: pending-等待, judging-判题中, accepted-通过, wrong_answer-答案错误, compile_error-编译错误, runtime_error-运行错误, time_limit-超时, memory_limit-内存超限, output_limit-输出超限, partial-部分通过, system_error-系统错误';
COMMENT ON COLUMN code_submissions.score IS '实际得分，等于通过的测试点分值之和';
COMMENT ON COLUMN code_submissions.total_score IS '该题的总分，等于所有测试点分值之和';
COMMENT ON COLUMN code_submissions.time_used IS '所有测试点中的最大运行时间(毫秒)';
COMMENT ON COLUMN code_submissions.memory_used IS '所有测试点中的最大内存使用(KB)';
COMMENT ON COLUMN code_submissions.compile_output IS '编译器输出，包含编译错误信息';
COMMENT ON COLUMN code_submissions.judge_result IS 'JSON格式的详细判题结果，包含每个测试点的状态、用时、内存等';
COMMENT ON COLUMN code_submissions.error_message IS '错误信息，用于记录系统错误或特殊情况';
COMMENT ON COLUMN code_submissions.submitted_at IS '代码提交时间';
COMMENT ON COLUMN code_submissions.judged_at IS '判题完成时间';


-- =====================================================
-- 3. 为 question_drafts 表添加编程题相关字段
-- 注意：题目内容存储在 question_drafts 表中
--       question_bank 是发布记录表，通过 draft_id 关联
-- =====================================================

-- 代码模板（预填充给学生的代码框架）
ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    code_template TEXT;

-- 默认时间限制（毫秒）
ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    time_limit INTEGER DEFAULT 1000;

-- 默认内存限制（MB）
ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    memory_limit INTEGER DEFAULT 256;

-- 判题模式: standard-标准比对, special-特判程序
ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    judge_mode VARCHAR(20) DEFAULT 'standard';

-- 特判程序代码（judge_mode='special'时使用）
ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    special_judge_code TEXT;

-- 支持的编程语言（数组，默认只支持cpp）
ALTER TABLE question_drafts ADD COLUMN IF NOT EXISTS
    supported_languages TEXT[] DEFAULT '{cpp}';

-- 添加 judge_mode 约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'question_drafts_judge_mode_check'
    ) THEN
        ALTER TABLE question_drafts ADD CONSTRAINT question_drafts_judge_mode_check
            CHECK (judge_mode IS NULL OR judge_mode IN ('standard', 'special'));
    END IF;
END $$;

-- 注释
COMMENT ON COLUMN question_drafts.code_template IS '编程题代码模板，预填充给学生作为起始代码';
COMMENT ON COLUMN question_drafts.time_limit IS '编程题默认时间限制(毫秒)，各测试点可单独设置';
COMMENT ON COLUMN question_drafts.memory_limit IS '编程题默认内存限制(MB)，各测试点可单独设置';
COMMENT ON COLUMN question_drafts.judge_mode IS '判题模式: standard-标准输出比对, special-使用特判程序';
COMMENT ON COLUMN question_drafts.special_judge_code IS '特判程序C++代码，用于有多个正确答案的题目';
COMMENT ON COLUMN question_drafts.supported_languages IS '支持的编程语言列表，默认只支持cpp';


-- =====================================================
-- 4. 判题队列表 (judge_queue)
-- 用于异步判题任务管理
-- =====================================================

CREATE TABLE IF NOT EXISTS judge_queue (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL UNIQUE,      -- 关联 code_submissions.id
    priority INTEGER DEFAULT 0,                 -- 优先级 (数值越大优先级越高)
    status VARCHAR(20) DEFAULT 'pending',       -- 队列状态
    worker_id VARCHAR(50),                      -- 处理该任务的判题机ID
    retry_count INTEGER DEFAULT 0,              -- 重试次数
    max_retries INTEGER DEFAULT 3,              -- 最大重试次数
    error_message TEXT,                         -- 错误信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,                       -- 开始判题时间
    completed_at TIMESTAMP,                     -- 完成时间

    CONSTRAINT judge_queue_status_check CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT fk_judge_queue_submission
        FOREIGN KEY (submission_id) REFERENCES code_submissions(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_judge_queue_status ON judge_queue(status);
CREATE INDEX IF NOT EXISTS idx_judge_queue_priority ON judge_queue(priority DESC, created_at ASC)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_judge_queue_worker ON judge_queue(worker_id) WHERE worker_id IS NOT NULL;

-- 注释
COMMENT ON TABLE judge_queue IS '判题任务队列表，用于管理异步判题任务';
COMMENT ON COLUMN judge_queue.submission_id IS '关联的代码提交ID';
COMMENT ON COLUMN judge_queue.priority IS '任务优先级，数值越大越优先处理';
COMMENT ON COLUMN judge_queue.status IS '队列状态: pending-等待, processing-处理中, completed-完成, failed-失败, cancelled-取消';
COMMENT ON COLUMN judge_queue.worker_id IS '处理该任务的判题机标识';
COMMENT ON COLUMN judge_queue.retry_count IS '已重试次数';
COMMENT ON COLUMN judge_queue.max_retries IS '最大重试次数，超过后标记为failed';


-- =====================================================
-- 5. 创建视图：题目测试用例统计
-- 注意：题目内容在 question_drafts 表中
--       test_cases.question_id 关联到 question_drafts.id
-- =====================================================

CREATE OR REPLACE VIEW v_question_test_case_stats AS
SELECT
    qd.id AS draft_id,
    qd.content,
    qd.type,
    qd.subject,
    qd.difficulty,
    qd.time_limit AS default_time_limit,
    qd.memory_limit AS default_memory_limit,
    COUNT(tc.id) AS test_case_count,
    COUNT(tc.id) FILTER (WHERE tc.is_sample = true) AS sample_count,
    COALESCE(SUM(tc.score), 0) AS total_score,
    MIN(tc.time_limit) AS min_time_limit,
    MAX(tc.time_limit) AS max_time_limit,
    MIN(tc.memory_limit) AS min_memory_limit,
    MAX(tc.memory_limit) AS max_memory_limit
FROM question_drafts qd
LEFT JOIN test_cases tc ON qd.id = tc.question_id
WHERE qd.type = 'code'
GROUP BY qd.id, qd.content, qd.type, qd.subject, qd.difficulty, qd.time_limit, qd.memory_limit;

COMMENT ON VIEW v_question_test_case_stats IS '编程题测试用例统计视图';


-- =====================================================
-- 6. 创建视图：学生提交统计
-- =====================================================

CREATE OR REPLACE VIEW v_student_submission_stats AS
SELECT
    cs.student_id,
    u.username,
    u.real_name,
    COUNT(*) AS total_submissions,
    COUNT(*) FILTER (WHERE cs.status = 'accepted') AS accepted_count,
    COUNT(*) FILTER (WHERE cs.status = 'wrong_answer') AS wrong_answer_count,
    COUNT(*) FILTER (WHERE cs.status = 'compile_error') AS compile_error_count,
    COUNT(*) FILTER (WHERE cs.status = 'runtime_error') AS runtime_error_count,
    COUNT(*) FILTER (WHERE cs.status = 'time_limit') AS time_limit_count,
    COUNT(*) FILTER (WHERE cs.status = 'memory_limit') AS memory_limit_count,
    COUNT(DISTINCT cs.question_id) AS attempted_questions,
    COUNT(DISTINCT cs.question_id) FILTER (WHERE cs.status = 'accepted') AS solved_questions,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE cs.status = 'accepted') / NULLIF(COUNT(*), 0),
        2
    ) AS acceptance_rate,
    MAX(cs.submitted_at) AS last_submission_time
FROM code_submissions cs
JOIN users u ON cs.student_id = u.id
GROUP BY cs.student_id, u.username, u.real_name;

COMMENT ON VIEW v_student_submission_stats IS '学生代码提交统计视图';


-- =====================================================
-- 7. 创建视图：题目提交统计
-- 注意：code_submissions.question_id 关联到 question_bank.id
--       然后通过 question_bank.draft_id 获取题目内容
-- =====================================================

CREATE OR REPLACE VIEW v_question_submission_stats AS
SELECT
    cs.question_id,
    qb.question_code,
    LEFT(qd.content, 100) AS content_preview,
    qd.subject,
    qd.difficulty,
    COUNT(*) AS total_submissions,
    COUNT(DISTINCT cs.student_id) AS unique_submitters,
    COUNT(*) FILTER (WHERE cs.status = 'accepted') AS accepted_count,
    COUNT(DISTINCT cs.student_id) FILTER (WHERE cs.status = 'accepted') AS solved_by_count,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE cs.status = 'accepted') / NULLIF(COUNT(*), 0),
        2
    ) AS acceptance_rate,
    ROUND(AVG(cs.time_used) FILTER (WHERE cs.status = 'accepted'), 2) AS avg_time_ms,
    ROUND(AVG(cs.memory_used) FILTER (WHERE cs.status = 'accepted'), 2) AS avg_memory_kb
FROM code_submissions cs
JOIN question_bank qb ON cs.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
GROUP BY cs.question_id, qb.question_code, qd.content, qd.subject, qd.difficulty;

COMMENT ON VIEW v_question_submission_stats IS '编程题提交统计视图';


-- =====================================================
-- 8. 创建函数：获取下一个待判题任务
-- 注意：时间/内存限制和判题模式存储在 question_drafts 表中
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_judge_task(p_worker_id VARCHAR(50))
RETURNS TABLE (
    queue_id INTEGER,
    submission_id INTEGER,
    source_code TEXT,
    language VARCHAR(20),
    question_id INTEGER,
    draft_id INTEGER,
    time_limit INTEGER,
    memory_limit INTEGER,
    judge_mode VARCHAR(20),
    special_judge_code TEXT
) AS $$
DECLARE
    v_queue_id INTEGER;
BEGIN
    -- 使用 FOR UPDATE SKIP LOCKED 实现无锁竞争
    SELECT jq.id INTO v_queue_id
    FROM judge_queue jq
    WHERE jq.status = 'pending'
    ORDER BY jq.priority DESC, jq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_queue_id IS NULL THEN
        RETURN;
    END IF;

    -- 更新状态为处理中
    UPDATE judge_queue
    SET status = 'processing',
        worker_id = p_worker_id,
        started_at = CURRENT_TIMESTAMP
    WHERE id = v_queue_id;

    -- 返回任务详情（从 question_drafts 获取判题配置）
    RETURN QUERY
    SELECT
        jq.id AS queue_id,
        cs.id AS submission_id,
        cs.source_code,
        cs.language,
        cs.question_id,
        qb.draft_id,
        COALESCE(qd.time_limit, 1000) AS time_limit,
        COALESCE(qd.memory_limit, 256) AS memory_limit,
        COALESCE(qd.judge_mode, 'standard')::VARCHAR(20) AS judge_mode,
        qd.special_judge_code
    FROM judge_queue jq
    JOIN code_submissions cs ON jq.submission_id = cs.id
    JOIN question_bank qb ON cs.question_id = qb.id
    JOIN question_drafts qd ON qb.draft_id = qd.id
    WHERE jq.id = v_queue_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_judge_task(VARCHAR) IS '获取下一个待判题任务，使用SKIP LOCKED实现无锁竞争';


-- =====================================================
-- 9. 创建函数：完成判题任务
-- =====================================================

CREATE OR REPLACE FUNCTION complete_judge_task(
    p_queue_id INTEGER,
    p_status VARCHAR(20),
    p_score INTEGER,
    p_time_used INTEGER,
    p_memory_used INTEGER,
    p_compile_output TEXT,
    p_judge_result JSONB,
    p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_submission_id INTEGER;
    v_student_activity_id INTEGER;
    v_question_id INTEGER;
BEGIN
    -- 获取提交信息
    SELECT jq.submission_id, cs.student_activity_id, cs.question_id
    INTO v_submission_id, v_student_activity_id, v_question_id
    FROM judge_queue jq
    JOIN code_submissions cs ON jq.submission_id = cs.id
    WHERE jq.id = p_queue_id;

    IF v_submission_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 更新提交记录
    UPDATE code_submissions
    SET
        status = p_status,
        score = p_score,
        time_used = p_time_used,
        memory_used = p_memory_used,
        compile_output = p_compile_output,
        judge_result = p_judge_result,
        error_message = p_error_message,
        judged_at = CURRENT_TIMESTAMP
    WHERE id = v_submission_id;

    -- 更新队列状态
    UPDATE judge_queue
    SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
    WHERE id = p_queue_id;

    -- 更新 answers 表中对应的记录（如果存在）
    UPDATE answers
    SET
        score = p_score,
        is_correct = (p_status = 'accepted'),
        grading_status = 'auto_graded',
        auto_score = p_score,
        feedback = CASE
            WHEN p_status = 'accepted' THEN '代码通过所有测试点'
            WHEN p_status = 'compile_error' THEN '编译错误: ' || LEFT(p_compile_output, 500)
            WHEN p_status = 'wrong_answer' THEN '答案错误'
            WHEN p_status = 'time_limit' THEN '运行超时'
            WHEN p_status = 'memory_limit' THEN '内存超限'
            WHEN p_status = 'runtime_error' THEN '运行错误'
            WHEN p_status = 'partial' THEN '部分通过，得分: ' || p_score
            ELSE '判题完成'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE student_exam_id = v_student_activity_id
      AND question_id = v_question_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_judge_task IS '完成判题任务，更新提交记录、队列状态和答案记录';


-- =====================================================
-- 10. 创建触发器：自动计算代码长度
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_code_length()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code_length := LENGTH(NEW.source_code);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_code_length ON code_submissions;
CREATE TRIGGER trigger_calculate_code_length
BEFORE INSERT OR UPDATE OF source_code ON code_submissions
FOR EACH ROW
EXECUTE FUNCTION calculate_code_length();

COMMENT ON FUNCTION calculate_code_length() IS '触发器函数：自动计算代码长度';


-- =====================================================
-- 11. 创建触发器：提交代码后自动入队
-- =====================================================

CREATE OR REPLACE FUNCTION auto_enqueue_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- 只有新提交且状态为pending的才入队
    IF NEW.status = 'pending' THEN
        INSERT INTO judge_queue (submission_id, priority)
        VALUES (NEW.id, 0)
        ON CONFLICT (submission_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_enqueue_submission ON code_submissions;
CREATE TRIGGER trigger_auto_enqueue_submission
AFTER INSERT ON code_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_enqueue_submission();

COMMENT ON FUNCTION auto_enqueue_submission() IS '触发器函数：代码提交后自动加入判题队列';


-- =====================================================
-- Migration Complete
-- =====================================================

-- 输出迁移完成信息
DO $$
BEGIN
    RAISE NOTICE '===================================================';
    RAISE NOTICE 'Migration 031: 编程题判题系统 - 完成';
    RAISE NOTICE '===================================================';
    RAISE NOTICE '新建表:';
    RAISE NOTICE '  - test_cases: 测试用例表';
    RAISE NOTICE '  - code_submissions: 代码提交记录表';
    RAISE NOTICE '  - judge_queue: 判题队列表';
    RAISE NOTICE '';
    RAISE NOTICE 'question_bank 表新增字段:';
    RAISE NOTICE '  - code_template: 代码模板';
    RAISE NOTICE '  - time_limit: 时间限制';
    RAISE NOTICE '  - memory_limit: 内存限制';
    RAISE NOTICE '  - judge_mode: 判题模式';
    RAISE NOTICE '  - special_judge_code: 特判代码';
    RAISE NOTICE '  - supported_languages: 支持的语言';
    RAISE NOTICE '';
    RAISE NOTICE '新建视图:';
    RAISE NOTICE '  - v_question_test_case_stats: 题目测试用例统计';
    RAISE NOTICE '  - v_student_submission_stats: 学生提交统计';
    RAISE NOTICE '  - v_question_submission_stats: 题目提交统计';
    RAISE NOTICE '';
    RAISE NOTICE '新建函数:';
    RAISE NOTICE '  - get_next_judge_task(): 获取下一个判题任务';
    RAISE NOTICE '  - complete_judge_task(): 完成判题任务';
    RAISE NOTICE '===================================================';
END $$;
