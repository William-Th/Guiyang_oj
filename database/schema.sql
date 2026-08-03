--
-- PostgreSQL database dump
--

\restrict HK0EMHpmNsaXRi0j9nGSI4uhc9TB7bJE68V9sPo4JCc6HJ1Z0eV5tgkR7tnC1h7

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: auto_enqueue_submission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_enqueue_submission() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 只有新提交且状态为pending的才入队
    IF NEW.status = 'pending' THEN
        INSERT INTO judge_queue (submission_id, priority)
        VALUES (NEW.id, 0)
        ON CONFLICT (submission_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_enqueue_submission(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_enqueue_submission() IS '触发器函数：代码提交后自动加入判题队列';


--
-- Name: auto_generate_question_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_generate_question_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.question_code IS NULL THEN
    NEW.question_code := generate_question_code(NEW.subject, NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: calculate_code_length(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_code_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.code_length := LENGTH(NEW.source_code);
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION calculate_code_length(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_code_length() IS '触发器函数：自动计算代码长度';


--
-- Name: calculate_task_completion_rate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_task_completion_rate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 计算完成率
    IF NEW.target_value > 0 THEN
        NEW.completion_rate = LEAST((NEW.current_value::DECIMAL / NEW.target_value::DECIMAL) * 100, 100);
    ELSE
        NEW.completion_rate = 0;
    END IF;

    -- 检查是否完成
    IF NEW.current_value >= NEW.target_value AND NOT NEW.is_completed THEN
        NEW.is_completed = TRUE;
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: check_practice_publish_permission(integer, character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_practice_publish_permission(p_user_id integer, p_scope character varying, p_district_id integer DEFAULT NULL::integer, p_school_id integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_role VARCHAR(50);
  v_user_district_id INTEGER;
  v_user_school_id INTEGER;
  v_permission_type VARCHAR(50);
  v_has_permission BOOLEAN;
BEGIN
  -- 班级练习不需要权限
  IF p_scope = 'class' THEN
    RETURN TRUE;
  END IF;

  -- 获取用户角色和所属区域/学校信息
  SELECT u.role INTO v_user_role FROM users u WHERE u.id = p_user_id;

  -- 管理员默认有对应范围的权限
  IF v_user_role = 'system_admin' OR v_user_role = 'municipal_admin' THEN
    -- 系统管理员和市级管理员有所有权限
    RETURN TRUE;
  END IF;

  IF v_user_role = 'district_admin' AND p_scope = 'district' THEN
    -- 区级管理员默认有区级发布权限
    -- 检查是否在同一区域
    SELECT ap.district_id INTO v_user_district_id
    FROM admin_permissions ap WHERE ap.user_id = p_user_id;
    IF v_user_district_id = p_district_id OR p_district_id IS NULL THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF v_user_role = 'school_admin' AND p_scope = 'school' THEN
    -- 校级管理员默认有校级发布权限
    SELECT ap.school_id INTO v_user_school_id
    FROM admin_permissions ap WHERE ap.user_id = p_user_id;
    IF v_user_school_id = p_school_id OR p_school_id IS NULL THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF v_user_role = 'base_school_admin' AND p_scope = 'base_school' THEN
    RETURN TRUE;
  END IF;

  IF v_user_role = 'municipal_school_admin' AND p_scope = 'municipal_school' THEN
    RETURN TRUE;
  END IF;

  -- 检查 teacher_permissions 表中是否有授权
  v_permission_type := 'practice_publish_' || p_scope;

  SELECT EXISTS(
    SELECT 1 FROM teacher_permissions tp
    WHERE tp.user_id = p_user_id
      AND tp.permission_type = v_permission_type
      AND tp.is_active = true
      AND (tp.expires_at IS NULL OR tp.expires_at > CURRENT_TIMESTAMP)
      AND (p_district_id IS NULL OR tp.district_id IS NULL OR tp.district_id = p_district_id)
      AND (p_school_id IS NULL OR tp.school_id IS NULL OR tp.school_id = p_school_id)
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$;


--
-- Name: FUNCTION check_practice_publish_permission(p_user_id integer, p_scope character varying, p_district_id integer, p_school_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_practice_publish_permission(p_user_id integer, p_scope character varying, p_district_id integer, p_school_id integer) IS '检查用户是否有指定范围的练习发布权限。
参数:
  p_user_id: 用户ID
  p_scope: 范围 (class, school, district, base_school, municipal_school, municipal)
  p_district_id: 区域ID (可选)
  p_school_id: 学校ID (可选)
返回: BOOLEAN';


--
-- Name: complete_judge_task(integer, character varying, integer, integer, integer, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_judge_task(p_queue_id integer, p_status character varying, p_score integer, p_time_used integer, p_memory_used integer, p_compile_output text, p_judge_result jsonb, p_error_message text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: FUNCTION complete_judge_task(p_queue_id integer, p_status character varying, p_score integer, p_time_used integer, p_memory_used integer, p_compile_output text, p_judge_result jsonb, p_error_message text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_judge_task(p_queue_id integer, p_status character varying, p_score integer, p_time_used integer, p_memory_used integer, p_compile_output text, p_judge_result jsonb, p_error_message text) IS '完成判题任务，更新提交记录、队列状态和答案记录';


--
-- Name: extract_scope_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_scope_ids() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 解析 practice_district_{code} 获取 district_id
    IF NEW.scope LIKE 'practice_district_%' THEN
        SELECT id INTO NEW.district_id
        FROM districts
        WHERE code = SUBSTRING(NEW.scope FROM 'practice_district_(.+)');
    END IF;

    -- 解析 practice_school_{id} 获取 school_id
    IF NEW.scope LIKE 'practice_school_%' THEN
        NEW.school_id := CAST(SUBSTRING(NEW.scope FROM 'practice_school_(.+)') AS INTEGER);
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: generate_question_code(character varying, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_question_code(p_subject character varying, p_created_at timestamp without time zone) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_subject_code VARCHAR(4);
  v_date_part VARCHAR(6);
  v_sequence INT;
  v_code VARCHAR(20);
BEGIN
  -- 获取科目代码
  CASE p_subject
    WHEN '数学' THEN v_subject_code := 'MATH';
    WHEN '物理' THEN v_subject_code := 'PHYS';
    WHEN '化学' THEN v_subject_code := 'CHEM';
    WHEN '生物' THEN v_subject_code := 'BIOL';
    WHEN '计算机' THEN v_subject_code := 'COMP';
    ELSE v_subject_code := 'OTHR';
  END CASE;

  -- 获取日期部分 (YYMMDD)
  v_date_part := TO_CHAR(p_created_at, 'YYMMDD');

  -- 获取当天该科目的序号（从新表查询）
  SELECT COALESCE(MAX(CAST(SUBSTRING(question_code FROM 11) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM question_bank
  WHERE question_code LIKE v_subject_code || v_date_part || '%';

  -- 组合生成编码
  v_code := v_subject_code || v_date_part || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_code;
END;
$$;


--
-- Name: get_activity_paper(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_activity_paper(p_activity_id integer) RETURNS TABLE(question_id integer, order_index integer, score numeric, question_code character varying, question_type character varying, content text, options jsonb, correct_answer text, difficulty character varying, subject character varying, grade character varying, knowledge_points text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    aq.question_id,
    aq.order_index,
    aq.score,
    qb.question_code,
    qb.type as question_type,
    qb.content,
    qb.options,
    qb.correct_answer,
    qb.difficulty,
    qb.subject,
    qb.grade,
    qb.knowledge_points
  FROM activity_questions aq
  INNER JOIN question_bank qb ON aq.question_id = qb.id
  WHERE aq.activity_id = p_activity_id
  ORDER BY aq.order_index;
END;
$$;


--
-- Name: get_next_judge_task(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_judge_task(p_worker_id character varying) RETURNS TABLE(queue_id integer, submission_id integer, source_code text, language character varying, question_id integer, draft_id integer, time_limit integer, memory_limit integer, judge_mode character varying, special_judge_code text)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: FUNCTION get_next_judge_task(p_worker_id character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_next_judge_task(p_worker_id character varying) IS '获取下一个待判题任务，使用SKIP LOCKED实现无锁竞争';


--
-- Name: log_registration_action(integer, character varying, integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_registration_action(p_request_id integer, p_action character varying, p_action_by integer, p_action_level integer, p_comment text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO registration_audit_log (
    request_id, action, action_by, action_level, comment, metadata
  ) VALUES (
    p_request_id, p_action, p_action_by, p_action_level, p_comment, p_metadata
  );
END;
$$;


--
-- Name: FUNCTION log_registration_action(p_request_id integer, p_action character varying, p_action_by integer, p_action_level integer, p_comment text, p_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_registration_action(p_request_id integer, p_action character varying, p_action_by integer, p_action_level integer, p_comment text, p_metadata jsonb) IS '记录注册审核操作日志的辅助函数';


--
-- Name: update_achievement_progress_percentage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_achievement_progress_percentage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.target_value > 0 THEN
        NEW.progress_percentage := LEAST(100, ROUND((NEW.current_value / NEW.target_value * 100)::NUMERIC, 0));
    ELSE
        NEW.progress_percentage := 0;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_activity_paper_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_activity_paper_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 更新活动的总分和题目数量
  UPDATE activities
  SET
    total_score = (
      SELECT COALESCE(SUM(score), 0)
      FROM activity_questions
      WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    ),
    question_count = (
      SELECT COUNT(*)
      FROM activity_questions
      WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    ),
    paper_status = CASE
      WHEN (SELECT COUNT(*) FROM activity_questions WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)) = 0 THEN 'empty'
      ELSE 'completed'
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_assessment_location_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_assessment_location_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_daily_tasks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_daily_tasks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_location_registered_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_location_registered_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 新增报名，如果状态是confirmed且有location_id，增加计数
        IF NEW.location_id IS NOT NULL AND NEW.status = 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = registered_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.location_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- 状态变为confirmed，增加计数
        IF NEW.location_id IS NOT NULL AND NEW.status = 'confirmed' AND (OLD.status != 'confirmed' OR OLD.status IS NULL) THEN
            UPDATE assessment_locations
            SET registered_count = registered_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.location_id;
        END IF;

        -- 状态从confirmed变为其他，减少计数
        IF OLD.location_id IS NOT NULL AND OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
        END IF;

        -- 如果location_id变更（从一个测评点换到另一个）
        IF OLD.location_id IS NOT NULL AND NEW.location_id IS NOT NULL
           AND OLD.location_id != NEW.location_id
           AND OLD.status = 'confirmed' AND NEW.status = 'confirmed' THEN
            -- 旧测评点减少
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
            -- 新测评点增加（上面的条件已处理）
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- 删除报名记录，如果状态是confirmed，减少计数
        IF OLD.location_id IS NOT NULL AND OLD.status = 'confirmed' THEN
            UPDATE assessment_locations
            SET registered_count = GREATEST(0, registered_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.location_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$;


--
-- Name: update_notification_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_registration_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_registration_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_student_ability_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_student_ability_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_student_id INTEGER;
  v_abilities TEXT[];
  v_subject VARCHAR(50);
  v_ability TEXT;
BEGIN
  -- 获取学生ID和题目信息
  SELECT sa.student_id INTO v_student_id
  FROM student_activities sa
  WHERE sa.id = NEW.student_exam_id;

  -- 获取题目的能力和科目
  SELECT qd.abilities, qd.subject INTO v_abilities, v_subject
  FROM question_bank qb
  JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qb.id = NEW.question_id;

  -- 如果有能力标签，更新统计
  IF v_abilities IS NOT NULL AND array_length(v_abilities, 1) > 0 THEN
    FOREACH v_ability IN ARRAY v_abilities LOOP
      -- 使用 UPSERT 更新或插入统计数据
      INSERT INTO student_ability_stats (
        student_id, ability, subject,
        total_questions, correct_count, accuracy_rate, avg_score, last_updated_at
      )
      SELECT
        v_student_id,
        v_ability,
        v_subject,
        COUNT(*),
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END),
        ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 2),
        ROUND(AVG(score), 2),
        CURRENT_TIMESTAMP
      FROM (
        SELECT a.is_correct, a.score
        FROM answers a
        JOIN student_activities sa ON a.student_exam_id = sa.id
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN question_drafts qd ON qb.draft_id = qd.id
        WHERE sa.student_id = v_student_id
          AND v_ability = ANY(qd.abilities)
          AND qd.subject = v_subject
      ) subq
      ON CONFLICT (student_id, ability, subject)
      DO UPDATE SET
        total_questions = EXCLUDED.total_questions,
        correct_count = EXCLUDED.correct_count,
        accuracy_rate = EXCLUDED.accuracy_rate,
        avg_score = EXCLUDED.avg_score,
        last_updated_at = CURRENT_TIMESTAMP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_student_ability_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_student_ability_stats() IS '触发器函数：学生答题后自动更新能力统计';


--
-- Name: update_student_activity_grading_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_student_activity_grading_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  pending_count INTEGER;
  total_count INTEGER;
  auto_graded_count INTEGER;
BEGIN
  -- Count answers for this student_activities
  SELECT
    COUNT(*),
    COUNT(CASE WHEN grading_status = 'pending' THEN 1 END),
    COUNT(CASE WHEN grading_status = 'auto_graded' THEN 1 END)
  INTO total_count, pending_count, auto_graded_count
  FROM answers
  WHERE student_exam_id = NEW.student_exam_id;

  -- Update student_activities grading_status
  IF pending_count = 0 THEN
    -- All answers graded
    UPDATE student_activities
    SET grading_status = 'completed'
    WHERE id = NEW.student_exam_id;
  ELSIF pending_count < total_count THEN
    -- Some answers graded
    UPDATE student_activities
    SET grading_status = 'partial_graded'
    WHERE id = NEW.student_exam_id;
  ELSIF auto_graded_count = total_count THEN
    -- All answers auto-graded
    UPDATE student_activities
    SET grading_status = 'auto_graded'
    WHERE id = NEW.student_exam_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_student_activity_grading_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_student_activity_grading_status() IS '自动更新学生活动的评卷状态';


--
-- Name: update_student_knowledge_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_student_knowledge_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_student_id INTEGER;
  v_knowledge_points TEXT[];
  v_subject VARCHAR(50);
  v_knowledge TEXT;
BEGIN
  -- 获取学生ID和题目信息
  SELECT sa.student_id INTO v_student_id
  FROM student_activities sa
  WHERE sa.id = NEW.student_exam_id;

  -- 获取题目的知识点和科目
  SELECT qd.knowledge_points, qd.subject INTO v_knowledge_points, v_subject
  FROM question_bank qb
  JOIN question_drafts qd ON qb.draft_id = qd.id
  WHERE qb.id = NEW.question_id;

  -- 如果有知识点标签，更新统计
  IF v_knowledge_points IS NOT NULL AND array_length(v_knowledge_points, 1) > 0 THEN
    FOREACH v_knowledge IN ARRAY v_knowledge_points LOOP
      -- 使用 UPSERT 更新或插入统计数据
      INSERT INTO student_knowledge_stats (
        student_id, knowledge_point, subject,
        total_questions, correct_count, accuracy_rate, avg_score, last_updated_at
      )
      SELECT
        v_student_id,
        v_knowledge,
        v_subject,
        COUNT(*),
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END),
        ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END), 2),
        ROUND(AVG(score), 2),
        CURRENT_TIMESTAMP
      FROM (
        SELECT a.is_correct, a.score
        FROM answers a
        JOIN student_activities sa ON a.student_exam_id = sa.id
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN question_drafts qd ON qb.draft_id = qd.id
        WHERE sa.student_id = v_student_id
          AND v_knowledge = ANY(qd.knowledge_points)
          AND qd.subject = v_subject
      ) subq
      ON CONFLICT (student_id, knowledge_point, subject)
      DO UPDATE SET
        total_questions = EXCLUDED.total_questions,
        correct_count = EXCLUDED.correct_count,
        accuracy_rate = EXCLUDED.accuracy_rate,
        avg_score = EXCLUDED.avg_score,
        last_updated_at = CURRENT_TIMESTAMP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_student_knowledge_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_student_knowledge_stats() IS '触发器函数：学生答题后自动更新知识点统计';


--
-- Name: update_student_points_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_student_points_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_student_task_progress_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_student_task_progress_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_teacher_permissions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_teacher_permissions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_teaching_class_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_teaching_class_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: validate_activity_time_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_activity_time_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Validate unlimited type
  IF NEW.time_limit_type = 'unlimited' THEN
    IF NEW.start_time IS NOT NULL OR NEW.end_time IS NOT NULL OR NEW.duration IS NOT NULL THEN
      RAISE EXCEPTION '无时间限制类型不应设置时间字段';
    END IF;
  END IF;

  -- Validate scheduled type
  IF NEW.time_limit_type = 'scheduled' THEN
    IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
      RAISE EXCEPTION '固定时间段类型必须设置开始和结束时间';
    END IF;
    IF NEW.duration IS NOT NULL THEN
      RAISE EXCEPTION '固定时间段类型不应设置作答时长';
    END IF;
    IF NEW.end_time <= NEW.start_time THEN
      RAISE EXCEPTION '结束时间必须晚于开始时间';
    END IF;
  END IF;

  -- Validate timed type
  IF NEW.time_limit_type = 'timed' THEN
    IF NEW.duration IS NULL OR NEW.duration <= 0 THEN
      RAISE EXCEPTION '限时作答类型必须设置正确的作答时长（分钟）';
    END IF;
    IF NEW.start_time IS NOT NULL OR NEW.end_time IS NOT NULL THEN
      RAISE EXCEPTION '限时作答类型不应设置固定时间段';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_teacher_permission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_teacher_permission() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 区级权限必须有 district_id
  IF NEW.scope_level = 'district' AND NEW.district_id IS NULL THEN
    RAISE EXCEPTION 'District-level permissions must have a district_id';
  END IF;

  -- 校级权限必须有 school_id（当前预留）
  IF NEW.scope_level = 'school' AND NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'School-level permissions must have a school_id';
  END IF;

  -- 市级权限不应该有 district_id 或 school_id
  IF NEW.scope_level = 'municipal' AND (NEW.district_id IS NOT NULL OR NEW.school_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Municipal-level permissions should not have district_id or school_id';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_teacher_permission(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_teacher_permission() IS '验证教师权限的 scope_level 与 district_id/school_id 匹配性';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievement_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievement_progress (
    id integer NOT NULL,
    student_id integer NOT NULL,
    achievement_id integer NOT NULL,
    current_value numeric(10,2) DEFAULT 0,
    target_value numeric(10,2) NOT NULL,
    progress_percentage integer DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE achievement_progress; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.achievement_progress IS '成就进度跟踪表';


--
-- Name: COLUMN achievement_progress.progress_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.achievement_progress.progress_percentage IS '进度百分比，自动计算 = (current_value / target_value) * 100';


--
-- Name: achievement_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.achievement_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: achievement_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.achievement_progress_id_seq OWNED BY public.achievement_progress.id;


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    achievement_id integer NOT NULL,
    achievement_code character varying(50) NOT NULL,
    achievement_name character varying(100) NOT NULL,
    achievement_desc text,
    achievement_icon character varying(255),
    category character varying(50) NOT NULL,
    subcategory character varying(50),
    rarity character varying(20) DEFAULT 'common'::character varying NOT NULL,
    points_reward integer DEFAULT 0 NOT NULL,
    trigger_condition json NOT NULL,
    is_hidden boolean DEFAULT false,
    is_active boolean DEFAULT true,
    max_times integer DEFAULT 1,
    cooldown_days integer,
    valid_from timestamp without time zone,
    valid_to timestamp without time zone,
    display_order integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_category CHECK (((category)::text = ANY (ARRAY[('exam_certification'::character varying)::text, ('learning_growth'::character varying)::text, ('social_collaboration'::character varying)::text, ('special_event'::character varying)::text]))),
    CONSTRAINT check_points_reward CHECK ((points_reward >= 0)),
    CONSTRAINT check_rarity CHECK (((rarity)::text = ANY (ARRAY[('common'::character varying)::text, ('rare'::character varying)::text, ('epic'::character varying)::text, ('legendary'::character varying)::text, ('mythic'::character varying)::text])))
);


--
-- Name: TABLE achievements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.achievements IS '成就定义表';


--
-- Name: COLUMN achievements.achievement_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.achievements.achievement_code IS '成就唯一代码';


--
-- Name: COLUMN achievements.rarity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.achievements.rarity IS '稀有度：common(普通)/rare(稀有)/epic(史诗)/legendary(传说)/mythic(神话)';


--
-- Name: COLUMN achievements.trigger_condition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.achievements.trigger_condition IS '触发条件JSON，包含trigger_mode, trigger_frequency, condition_type等';


--
-- Name: achievements_achievement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.achievements_achievement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: achievements_achievement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.achievements_achievement_id_seq OWNED BY public.achievements.achievement_id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    subject character varying(50) NOT NULL,
    grade character varying(20),
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    duration integer,
    total_score integer DEFAULT 100,
    pass_score integer DEFAULT 60,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying(20) DEFAULT 'practice'::character varying NOT NULL,
    ability_level character varying(10),
    scope character varying(50),
    allow_retake boolean DEFAULT false,
    max_attempts integer DEFAULT 1,
    is_official boolean DEFAULT false,
    target_audience jsonb DEFAULT '{"grades": [], "classes": [], "schools": []}'::jsonb,
    certificate_config jsonb DEFAULT '{"enabled": false, "template": null}'::jsonb,
    time_limit_type character varying(20) DEFAULT 'unlimited'::character varying NOT NULL,
    question_count integer DEFAULT 0,
    paper_status character varying(20) DEFAULT 'empty'::character varying,
    registration_enabled boolean DEFAULT false,
    registration_start_time timestamp without time zone,
    registration_end_time timestamp without time zone,
    max_participants integer,
    require_location boolean DEFAULT false,
    CONSTRAINT activities_paper_status_check CHECK (((paper_status)::text = ANY (ARRAY[('empty'::character varying)::text, ('draft'::character varying)::text, ('completed'::character varying)::text]))),
    CONSTRAINT activities_time_limit_type_check CHECK (((time_limit_type)::text = ANY (ARRAY[('unlimited'::character varying)::text, ('scheduled'::character varying)::text, ('timed'::character varying)::text]))),
    CONSTRAINT check_scheduled_time_range CHECK (((((time_limit_type)::text = 'scheduled'::text) AND (start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (duration IS NULL) AND (end_time > start_time)) OR ((time_limit_type)::text <> 'scheduled'::text))),
    CONSTRAINT check_timed_duration CHECK (((((time_limit_type)::text = 'timed'::text) AND (duration IS NOT NULL) AND (duration > 0) AND (start_time IS NULL) AND (end_time IS NULL)) OR ((time_limit_type)::text <> 'timed'::text))),
    CONSTRAINT check_unlimited_no_time CHECK (((((time_limit_type)::text = 'unlimited'::text) AND (start_time IS NULL) AND (end_time IS NULL) AND (duration IS NULL)) OR ((time_limit_type)::text <> 'unlimited'::text))),
    CONSTRAINT exams_ability_level_check CHECK (((ability_level)::text = ANY (ARRAY[('L1'::character varying)::text, ('L2'::character varying)::text, ('L3'::character varying)::text, ('L4'::character varying)::text, ('L5'::character varying)::text, ('L6'::character varying)::text, ('L7'::character varying)::text]))),
    CONSTRAINT exams_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT exams_scope_check CHECK (((scope)::text = ANY (ARRAY[('system'::character varying)::text, ('municipal'::character varying)::text, ('district'::character varying)::text, ('base_school'::character varying)::text, ('municipal_school'::character varying)::text, ('school'::character varying)::text, ('class'::character varying)::text]))),
    CONSTRAINT exams_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text, ('ongoing'::character varying)::text, ('finished'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT exams_type_check CHECK (((type)::text = ANY (ARRAY[('assessment'::character varying)::text, ('practice'::character varying)::text])))
);


--
-- Name: TABLE activities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activities IS 'Stores all learning activities including assessments and practice exercises';


--
-- Name: COLUMN activities.total_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.total_score IS '试卷总分 (所有题目分值之和)';


--
-- Name: COLUMN activities.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.type IS 'Activity type: assessment (formal evaluation) or practice (informal exercise)';


--
-- Name: COLUMN activities.ability_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.ability_level IS 'Target ability level: L1-L7 (basic to excellence)';


--
-- Name: COLUMN activities.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.scope IS 'Distribution scope: municipal, district, school, or class';


--
-- Name: COLUMN activities.allow_retake; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.allow_retake IS 'Whether students can retake this activity';


--
-- Name: COLUMN activities.max_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.max_attempts IS 'Maximum number of attempts allowed';


--
-- Name: COLUMN activities.is_official; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.is_official IS 'Whether this is an official activity that can issue certificates';


--
-- Name: COLUMN activities.target_audience; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.target_audience IS 'JSON specification of target grades, schools, classes';


--
-- Name: COLUMN activities.certificate_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.certificate_config IS 'JSON configuration for certificate generation';


--
-- Name: COLUMN activities.time_limit_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.time_limit_type IS '时间限制类型: unlimited(无限制), scheduled(固定时间段), timed(限时作答)';


--
-- Name: COLUMN activities.question_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.question_count IS '试卷题目总数';


--
-- Name: COLUMN activities.paper_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.paper_status IS '组卷状态: empty=未组卷, draft=草稿中, completed=已完成';


--
-- Name: COLUMN activities.registration_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.registration_enabled IS '是否开启报名功能（测评类型默认开启）';


--
-- Name: COLUMN activities.registration_start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.registration_start_time IS '报名开始时间';


--
-- Name: COLUMN activities.registration_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.registration_end_time IS '报名截止时间';


--
-- Name: COLUMN activities.max_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.max_participants IS '最大参与人数限制（L1-L3可选，L4+通过测评点控制）';


--
-- Name: COLUMN activities.require_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.require_location IS '是否需要选择测评点（L4+自动设为true）';


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: student_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_activities (
    id integer NOT NULL,
    student_id integer,
    activity_id integer,
    session_id integer,
    status character varying(20) DEFAULT 'registered'::character varying,
    start_time timestamp without time zone,
    submit_time timestamp without time zone,
    score numeric(5,2),
    rank integer,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attempt_number integer DEFAULT 1,
    is_retake boolean DEFAULT false,
    previous_attempt_id integer,
    started_at timestamp without time zone,
    time_limit_deadline timestamp without time zone,
    grading_status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT student_activities_grading_status_check CHECK (((grading_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('auto_graded'::character varying)::text, ('partial_graded'::character varying)::text, ('completed'::character varying)::text]))),
    CONSTRAINT student_exams_status_check CHECK (((status)::text = ANY (ARRAY[('registered'::character varying)::text, ('in_progress'::character varying)::text, ('submitted'::character varying)::text, ('graded'::character varying)::text, ('absent'::character varying)::text])))
);


--
-- Name: COLUMN student_activities.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_activities.started_at IS '开始作答时间 (用于timed类型计算deadline)';


--
-- Name: COLUMN student_activities.time_limit_deadline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_activities.time_limit_deadline IS '时间限制截止时间 (scheduled类型使用activity.end_time, timed类型使用started_at + duration)';


--
-- Name: COLUMN student_activities.grading_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_activities.grading_status IS '评卷状态: pending-待评卷, auto_graded-自动评卷完成, partial_graded-部分评卷, completed-全部完成';


--
-- Name: activity_grading_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.activity_grading_stats AS
 SELECT a.id AS activity_id,
    a.title,
    a.type,
    count(sa.id) AS total_submissions,
    count(
        CASE
            WHEN ((sa.grading_status)::text = 'pending'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_count,
    count(
        CASE
            WHEN ((sa.grading_status)::text = 'auto_graded'::text) THEN 1
            ELSE NULL::integer
        END) AS auto_graded_count,
    count(
        CASE
            WHEN ((sa.grading_status)::text = 'partial_graded'::text) THEN 1
            ELSE NULL::integer
        END) AS partial_graded_count,
    count(
        CASE
            WHEN ((sa.grading_status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_count,
    round(avg(
        CASE
            WHEN (sa.score IS NOT NULL) THEN sa.score
            ELSE NULL::numeric
        END), 2) AS avg_score,
    max(sa.score) AS max_score,
    min(sa.score) AS min_score
   FROM (public.activities a
     LEFT JOIN public.student_activities sa ON (((a.id = sa.activity_id) AND ((sa.status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('graded'::character varying)::text])))))
  GROUP BY a.id, a.title, a.type;


--
-- Name: VIEW activity_grading_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.activity_grading_stats IS '活动评卷统计视图';


--
-- Name: activity_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_history (
    id integer NOT NULL,
    activity_id integer,
    action character varying(50) NOT NULL,
    changed_by integer,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: activity_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_history_id_seq OWNED BY public.activity_history.id;


--
-- Name: activity_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_questions (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    question_id integer NOT NULL,
    order_index integer NOT NULL,
    score numeric(5,2) DEFAULT 5.00 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE activity_questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activity_questions IS '活动题目关联表 - 存储活动（练习/测评）与题目的关联关系，支持组卷功能';


--
-- Name: COLUMN activity_questions.activity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_questions.activity_id IS '关联的活动ID (activities表外键)';


--
-- Name: COLUMN activity_questions.question_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_questions.question_id IS '关联的题目ID (question_bank表外键)';


--
-- Name: COLUMN activity_questions.order_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_questions.order_index IS '题目在试卷中的显示顺序 (1,2,3...)';


--
-- Name: COLUMN activity_questions.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_questions.score IS '该题目在本活动中的分值 (可与题库中建议分值不同)';


--
-- Name: question_bank_old_backup_20251122; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_bank_old_backup_20251122 (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    subject character varying(50) NOT NULL,
    grade character varying(20) NOT NULL,
    content text NOT NULL,
    options jsonb,
    correct_answer jsonb,
    score integer DEFAULT 1,
    difficulty character varying(20) DEFAULT 'medium'::character varying,
    explanation text,
    tags text[],
    image_url character varying(500),
    category_id integer,
    created_by integer NOT NULL,
    usage_count integer DEFAULT 0,
    success_rate numeric(5,2),
    is_active boolean DEFAULT true,
    import_batch_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    abilities text[] DEFAULT '{}'::text[],
    knowledge_points text[] DEFAULT '{}'::text[],
    level character varying(10),
    suggested_score integer DEFAULT 5,
    status character varying(20) DEFAULT 'draft'::character varying,
    scope text[] DEFAULT '{}'::text[],
    reviewer_id integer,
    review_comment text,
    reviewed_at timestamp without time zone,
    published_at timestamp without time zone,
    published_by integer,
    question_code character varying(20),
    CONSTRAINT question_bank_difficulty_check CHECK (((difficulty)::text = ANY (ARRAY[('easy'::character varying)::text, ('medium'::character varying)::text, ('hard'::character varying)::text]))),
    CONSTRAINT question_bank_level_check CHECK (((level)::text = ANY (ARRAY[('L1'::character varying)::text, ('L2'::character varying)::text, ('L3'::character varying)::text, ('L4'::character varying)::text, ('L5'::character varying)::text, ('L6'::character varying)::text, ('L7'::character varying)::text, ('L8'::character varying)::text, ('L9'::character varying)::text]))),
    CONSTRAINT question_bank_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('pending_review'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('published'::character varying)::text]))),
    CONSTRAINT question_bank_type_check CHECK (((type)::text = ANY (ARRAY[('single'::character varying)::text, ('multiple'::character varying)::text, ('blank'::character varying)::text, ('true_false'::character varying)::text, ('essay'::character varying)::text, ('code'::character varying)::text, ('matching'::character varying)::text])))
);


--
-- Name: TABLE question_bank_old_backup_20251122; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_bank_old_backup_20251122 IS 'BACKUP: 2025-11-22 重构前的 question_bank 表备份，建议保留7天后删除';


--
-- Name: COLUMN question_bank_old_backup_20251122.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.score IS '题目分值（已废弃，使用 suggested_score）';


--
-- Name: COLUMN question_bank_old_backup_20251122.abilities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.abilities IS '题目考察的能力列表（如抽象思维、计算思维等），存储能力ID数组';


--
-- Name: COLUMN question_bank_old_backup_20251122.knowledge_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.knowledge_points IS '题目涉及的知识点列表，存储知识点ID数组';


--
-- Name: COLUMN question_bank_old_backup_20251122.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.level IS '题目级别 L1-L9';


--
-- Name: COLUMN question_bank_old_backup_20251122.suggested_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.suggested_score IS '建议分值';


--
-- Name: COLUMN question_bank_old_backup_20251122.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.status IS '题目状态：draft草稿，pending_review待审核，approved已批准，rejected已拒绝，published已发布';


--
-- Name: COLUMN question_bank_old_backup_20251122.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.scope IS '题库范围数组: assessment-测评题库, practice_municipal-市级练习, practice_district_{code}-区级练习, practice_school_{id}-校级练习';


--
-- Name: COLUMN question_bank_old_backup_20251122.question_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.question_code IS '题目唯一编码，格式：科目代码+年月日+序号，如MATH250120001';


--
-- Name: activity_paper_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.activity_paper_stats AS
 SELECT a.id AS activity_id,
    a.title,
    a.type,
    a.subject,
    a.paper_status,
    a.total_score,
    a.question_count,
    count(DISTINCT
        CASE
            WHEN ((qb.type)::text = 'single'::text) THEN aq.id
            ELSE NULL::integer
        END) AS single_choice_count,
    count(DISTINCT
        CASE
            WHEN ((qb.type)::text = 'multiple'::text) THEN aq.id
            ELSE NULL::integer
        END) AS multiple_choice_count,
    count(DISTINCT
        CASE
            WHEN ((qb.type)::text = 'blank'::text) THEN aq.id
            ELSE NULL::integer
        END) AS blank_count,
    count(DISTINCT
        CASE
            WHEN ((qb.type)::text = 'essay'::text) THEN aq.id
            ELSE NULL::integer
        END) AS essay_count,
    count(DISTINCT
        CASE
            WHEN ((qb.type)::text = 'code'::text) THEN aq.id
            ELSE NULL::integer
        END) AS code_count,
    count(DISTINCT
        CASE
            WHEN ((qb.difficulty)::text = 'easy'::text) THEN aq.id
            ELSE NULL::integer
        END) AS easy_count,
    count(DISTINCT
        CASE
            WHEN ((qb.difficulty)::text = 'medium'::text) THEN aq.id
            ELSE NULL::integer
        END) AS medium_count,
    count(DISTINCT
        CASE
            WHEN ((qb.difficulty)::text = 'hard'::text) THEN aq.id
            ELSE NULL::integer
        END) AS hard_count
   FROM ((public.activities a
     LEFT JOIN public.activity_questions aq ON ((a.id = aq.activity_id)))
     LEFT JOIN public.question_bank_old_backup_20251122 qb ON ((aq.question_id = qb.id)))
  GROUP BY a.id, a.title, a.type, a.subject, a.paper_status, a.total_score, a.question_count;


--
-- Name: VIEW activity_paper_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.activity_paper_stats IS '活动组卷统计视图 - 统计各活动的题目数量、题型分布、难度分布等';


--
-- Name: activity_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_questions_id_seq OWNED BY public.activity_questions.id;


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_permissions (
    id integer NOT NULL,
    user_id integer,
    school_id integer,
    district_id integer,
    permission_scope jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE admin_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_permissions IS '管理员权限表，定义各级管理员的管理范围和权限';


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_permissions_id_seq OWNED BY public.admin_permissions.id;


--
-- Name: announcement_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_reads (
    id integer NOT NULL,
    announcement_id integer NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE announcement_reads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.announcement_reads IS '公告已读记录表 - 追踪用户已读的公告';


--
-- Name: announcement_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcement_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcement_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcement_reads_id_seq OWNED BY public.announcement_reads.id;


--
-- Name: answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answers (
    id integer NOT NULL,
    student_exam_id integer,
    question_id integer,
    answer text,
    is_correct boolean,
    score numeric(5,2),
    graded_by integer,
    graded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    grading_status character varying(20) DEFAULT 'pending'::character varying,
    feedback text,
    auto_score numeric(5,2),
    manual_score numeric(5,2),
    CONSTRAINT answers_grading_status_check CHECK (((grading_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('auto_graded'::character varying)::text, ('manual_graded'::character varying)::text])))
);


--
-- Name: COLUMN answers.grading_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.answers.grading_status IS '该题评卷状态: pending-待评卷, auto_graded-自动评卷, manual_graded-人工评卷';


--
-- Name: COLUMN answers.feedback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.answers.feedback IS '评卷批注和反馈';


--
-- Name: COLUMN answers.auto_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.answers.auto_score IS '自动判题得分';


--
-- Name: COLUMN answers.manual_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.answers.manual_score IS '人工评分';


--
-- Name: answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.answers_id_seq OWNED BY public.answers.id;


--
-- Name: assessment_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_locations (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    name character varying(100) NOT NULL,
    address character varying(300),
    district_id integer,
    capacity integer DEFAULT 50 NOT NULL,
    registered_count integer DEFAULT 0,
    contact_name character varying(50),
    contact_phone character varying(20),
    exam_date date,
    exam_time_start time without time zone,
    exam_time_end time without time zone,
    check_in_time time without time zone,
    notes text,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE assessment_locations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assessment_locations IS '测评点表 - 用于L4+线下现场测评的考点管理';


--
-- Name: COLUMN assessment_locations.activity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.activity_id IS '关联的测评活动ID';


--
-- Name: COLUMN assessment_locations.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.name IS '测评点名称（如：贵阳一中考点）';


--
-- Name: COLUMN assessment_locations.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.address IS '测评点详细地址';


--
-- Name: COLUMN assessment_locations.district_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.district_id IS '所属区县';


--
-- Name: COLUMN assessment_locations.capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.capacity IS '容纳人数上限';


--
-- Name: COLUMN assessment_locations.registered_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.registered_count IS '已报名人数（通过触发器自动维护）';


--
-- Name: COLUMN assessment_locations.contact_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.contact_name IS '联系人姓名';


--
-- Name: COLUMN assessment_locations.contact_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.contact_phone IS '联系电话';


--
-- Name: COLUMN assessment_locations.exam_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.exam_date IS '测评日期';


--
-- Name: COLUMN assessment_locations.exam_time_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.exam_time_start IS '测评开始时间';


--
-- Name: COLUMN assessment_locations.exam_time_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.exam_time_end IS '测评结束时间';


--
-- Name: COLUMN assessment_locations.check_in_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.check_in_time IS '签到时间';


--
-- Name: COLUMN assessment_locations.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.notes IS '备注说明（如：请携带学生证）';


--
-- Name: COLUMN assessment_locations.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_locations.is_active IS '是否启用';


--
-- Name: assessment_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessment_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_locations_id_seq OWNED BY public.assessment_locations.id;


--
-- Name: assessment_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_registrations (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    student_id integer NOT NULL,
    location_id integer,
    status character varying(20) DEFAULT 'confirmed'::character varying NOT NULL,
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    cancel_reason text,
    cancelled_by integer,
    reviewed_at timestamp without time zone,
    reviewed_by integer,
    review_notes text,
    student_activity_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_registration_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('confirmed'::character varying)::text, ('rejected'::character varying)::text, ('cancelled'::character varying)::text, ('completed'::character varying)::text, ('absent'::character varying)::text])))
);


--
-- Name: TABLE assessment_registrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assessment_registrations IS '测评报名表 - 记录学生的测评报名信息';


--
-- Name: COLUMN assessment_registrations.activity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.activity_id IS '测评活动ID';


--
-- Name: COLUMN assessment_registrations.student_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.student_id IS '学生ID';


--
-- Name: COLUMN assessment_registrations.location_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.location_id IS '测评点ID（L4+必填，L1-L3为NULL）';


--
-- Name: COLUMN assessment_registrations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.status IS '报名状态: pending/confirmed/rejected/cancelled/completed/absent';


--
-- Name: COLUMN assessment_registrations.registered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.registered_at IS '报名时间';


--
-- Name: COLUMN assessment_registrations.confirmed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.confirmed_at IS '确认时间';


--
-- Name: COLUMN assessment_registrations.cancelled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.cancelled_at IS '取消时间';


--
-- Name: COLUMN assessment_registrations.cancel_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.cancel_reason IS '取消原因';


--
-- Name: COLUMN assessment_registrations.cancelled_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.cancelled_by IS '取消操作人';


--
-- Name: COLUMN assessment_registrations.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.reviewed_at IS '审核时间';


--
-- Name: COLUMN assessment_registrations.reviewed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.reviewed_by IS '审核人';


--
-- Name: COLUMN assessment_registrations.review_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.review_notes IS '审核备注';


--
-- Name: COLUMN assessment_registrations.student_activity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assessment_registrations.student_activity_id IS '关联的学生活动记录（参加测评后关联）';


--
-- Name: assessment_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessment_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_registrations_id_seq OWNED BY public.assessment_registrations.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100),
    target_type character varying(50),
    target_id integer,
    ip_address character varying(45),
    user_agent text,
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id integer NOT NULL,
    student_id integer,
    exam_id integer,
    cert_no character varying(100),
    issue_date date,
    level character varying(20),
    file_url character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.certificates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: certificates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.certificates_id_seq OWNED BY public.certificates.id;


--
-- Name: code_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_submissions (
    id integer NOT NULL,
    student_activity_id integer,
    question_id integer NOT NULL,
    student_id integer NOT NULL,
    source_code text NOT NULL,
    language character varying(20) DEFAULT 'cpp'::character varying,
    code_length integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    score integer DEFAULT 0,
    total_score integer,
    time_used integer,
    memory_used integer,
    compile_output text,
    judge_result jsonb,
    error_message text,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    judged_at timestamp without time zone,
    CONSTRAINT code_submissions_language_check CHECK (((language)::text = ANY (ARRAY[('cpp'::character varying)::text, ('c'::character varying)::text, ('python'::character varying)::text, ('java'::character varying)::text, ('javascript'::character varying)::text]))),
    CONSTRAINT code_submissions_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('judging'::character varying)::text, ('accepted'::character varying)::text, ('wrong_answer'::character varying)::text, ('compile_error'::character varying)::text, ('runtime_error'::character varying)::text, ('time_limit'::character varying)::text, ('memory_limit'::character varying)::text, ('output_limit'::character varying)::text, ('partial'::character varying)::text, ('system_error'::character varying)::text])))
);


--
-- Name: TABLE code_submissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.code_submissions IS '编程题代码提交记录表';


--
-- Name: COLUMN code_submissions.student_activity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.student_activity_id IS 'Optional reference to student_activities.id. NULL for quick-run tests outside of an activity context.';


--
-- Name: COLUMN code_submissions.question_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.question_id IS '关联的题目ID';


--
-- Name: COLUMN code_submissions.student_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.student_id IS '提交代码的学生用户ID';


--
-- Name: COLUMN code_submissions.source_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.source_code IS '学生提交的源代码内容';


--
-- Name: COLUMN code_submissions.language; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.language IS '编程语言: cpp, c, python, java, javascript';


--
-- Name: COLUMN code_submissions.code_length; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.code_length IS '代码长度（字符数），用于统计和限制';


--
-- Name: COLUMN code_submissions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.status IS '判题状态: pending-等待, judging-判题中, accepted-通过, wrong_answer-答案错误, compile_error-编译错误, runtime_error-运行错误, time_limit-超时, memory_limit-内存超限, output_limit-输出超限, partial-部分通过, system_error-系统错误';


--
-- Name: COLUMN code_submissions.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.score IS '实际得分，等于通过的测试点分值之和';


--
-- Name: COLUMN code_submissions.total_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.total_score IS '该题的总分，等于所有测试点分值之和';


--
-- Name: COLUMN code_submissions.time_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.time_used IS '所有测试点中的最大运行时间(毫秒)';


--
-- Name: COLUMN code_submissions.memory_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.memory_used IS '所有测试点中的最大内存使用(KB)';


--
-- Name: COLUMN code_submissions.compile_output; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.compile_output IS '编译器输出，包含编译错误信息';


--
-- Name: COLUMN code_submissions.judge_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.judge_result IS 'JSON格式的详细判题结果，包含每个测试点的状态、用时、内存等';


--
-- Name: COLUMN code_submissions.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.error_message IS '错误信息，用于记录系统错误或特殊情况';


--
-- Name: COLUMN code_submissions.submitted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.submitted_at IS '代码提交时间';


--
-- Name: COLUMN code_submissions.judged_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_submissions.judged_at IS '判题完成时间';


--
-- Name: code_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.code_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: code_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.code_submissions_id_seq OWNED BY public.code_submissions.id;


--
-- Name: daily_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_tasks (
    task_id integer NOT NULL,
    task_code character varying(50) NOT NULL,
    task_name character varying(100) NOT NULL,
    task_desc text,
    task_icon character varying(255),
    points_reward integer DEFAULT 0 NOT NULL,
    task_type character varying(50) NOT NULL,
    trigger_condition json NOT NULL,
    target_value integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50) DEFAULT 'daily'::character varying,
    bonus_points integer DEFAULT 0,
    progress_type character varying(50) DEFAULT 'count'::character varying,
    reset_period character varying(20) DEFAULT 'daily'::character varying,
    reset_time time without time zone DEFAULT '00:00:00'::time without time zone,
    valid_from date,
    valid_to date,
    CONSTRAINT check_category CHECK (((category)::text = ANY (ARRAY[('daily'::character varying)::text, ('weekly'::character varying)::text, ('monthly'::character varying)::text]))),
    CONSTRAINT check_progress_type CHECK (((progress_type)::text = ANY (ARRAY[('count'::character varying)::text, ('duration'::character varying)::text, ('score'::character varying)::text]))),
    CONSTRAINT check_reset_period CHECK (((reset_period)::text = ANY (ARRAY[('daily'::character varying)::text, ('weekly'::character varying)::text, ('monthly'::character varying)::text]))),
    CONSTRAINT check_target_value CHECK ((target_value > 0)),
    CONSTRAINT check_task_points CHECK ((points_reward >= 0)),
    CONSTRAINT check_task_type CHECK (((task_type)::text = ANY (ARRAY[('login'::character varying)::text, ('practice'::character varying)::text, ('exam'::character varying)::text, ('social'::character varying)::text, ('weekly'::character varying)::text, ('monthly'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: TABLE daily_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.daily_tasks IS '日常任务定义表';


--
-- Name: COLUMN daily_tasks.task_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.task_code IS '任务唯一代码';


--
-- Name: COLUMN daily_tasks.points_reward; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.points_reward IS '基础积分奖励';


--
-- Name: COLUMN daily_tasks.task_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.task_type IS '任务类型：login/practice/exam/social';


--
-- Name: COLUMN daily_tasks.trigger_condition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.trigger_condition IS 'JSON格式的触发条件';


--
-- Name: COLUMN daily_tasks.target_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.target_value IS '任务目标数值';


--
-- Name: COLUMN daily_tasks.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.category IS '任务周期类别：daily/weekly/monthly';


--
-- Name: COLUMN daily_tasks.bonus_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.bonus_points IS '连续完成额外奖励';


--
-- Name: COLUMN daily_tasks.progress_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.progress_type IS '进度类型：count/duration/score';


--
-- Name: COLUMN daily_tasks.reset_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.reset_period IS '重置周期';


--
-- Name: COLUMN daily_tasks.reset_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.reset_time IS '每日重置时间点';


--
-- Name: COLUMN daily_tasks.valid_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.valid_from IS '任务有效期起始日期';


--
-- Name: COLUMN daily_tasks.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_tasks.valid_to IS '任务有效期结束日期';


--
-- Name: daily_tasks_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_tasks_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_tasks_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_tasks_task_id_seq OWNED BY public.daily_tasks.task_id;


--
-- Name: district_ability_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.district_ability_stats (
    id integer NOT NULL,
    district_id integer NOT NULL,
    ability character varying(100) NOT NULL,
    subject character varying(50) NOT NULL,
    school_count integer DEFAULT 0,
    student_count integer DEFAULT 0,
    total_attempts integer DEFAULT 0,
    correct_count integer DEFAULT 0,
    accuracy_rate numeric(5,2) DEFAULT 0.00,
    avg_score numeric(5,2) DEFAULT 0.00,
    period_start date NOT NULL,
    period_end date NOT NULL,
    last_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE district_ability_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.district_ability_stats IS '区域能力统计表 - 记录区域在各能力维度上的整体表现';


--
-- Name: COLUMN district_ability_stats.district_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.district_id IS '区县ID';


--
-- Name: COLUMN district_ability_stats.ability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.ability IS '能力标签';


--
-- Name: COLUMN district_ability_stats.subject; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.subject IS '科目';


--
-- Name: COLUMN district_ability_stats.school_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.school_count IS '参与学校数';


--
-- Name: COLUMN district_ability_stats.student_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.student_count IS '参与学生数';


--
-- Name: COLUMN district_ability_stats.total_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.total_attempts IS '总答题次数';


--
-- Name: COLUMN district_ability_stats.correct_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.correct_count IS '正确次数';


--
-- Name: COLUMN district_ability_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN district_ability_stats.avg_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.avg_score IS '平均得分';


--
-- Name: COLUMN district_ability_stats.period_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.period_start IS '统计周期开始日期';


--
-- Name: COLUMN district_ability_stats.period_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.district_ability_stats.period_end IS '统计周期结束日期';


--
-- Name: district_ability_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.district_ability_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: district_ability_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.district_ability_stats_id_seq OWNED BY public.district_ability_stats.id;


--
-- Name: districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.districts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    level character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT districts_level_check CHECK (((level)::text = ANY (ARRAY[('district'::character varying)::text, ('municipal'::character varying)::text])))
);


--
-- Name: TABLE districts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.districts IS '区域管理表，支持区级和市级管理';


--
-- Name: districts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: districts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;


--
-- Name: exams; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.exams AS
 SELECT activities.id,
    activities.title,
    activities.description,
    activities.subject,
    activities.grade,
    activities.start_time,
    activities.end_time,
    activities.duration,
    activities.total_score,
    activities.pass_score,
    activities.status,
    activities.created_by,
    activities.created_at,
    activities.updated_at,
    activities.type,
    activities.ability_level,
    activities.scope,
    activities.allow_retake,
    activities.max_attempts,
    activities.is_official,
    activities.target_audience,
    activities.certificate_config
   FROM public.activities;


--
-- Name: import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_logs (
    id integer NOT NULL,
    batch_id character varying(100) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(20) NOT NULL,
    total_rows integer NOT NULL,
    successful_rows integer DEFAULT 0,
    failed_rows integer DEFAULT 0,
    error_details jsonb,
    imported_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: import_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_logs_id_seq OWNED BY public.import_logs.id;


--
-- Name: judge_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.judge_queue (
    id integer NOT NULL,
    submission_id integer NOT NULL,
    priority integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    worker_id character varying(50),
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    CONSTRAINT judge_queue_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: TABLE judge_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.judge_queue IS '判题任务队列表，用于管理异步判题任务';


--
-- Name: COLUMN judge_queue.submission_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.judge_queue.submission_id IS '关联的代码提交ID';


--
-- Name: COLUMN judge_queue.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.judge_queue.priority IS '任务优先级，数值越大越优先处理';


--
-- Name: COLUMN judge_queue.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.judge_queue.status IS '队列状态: pending-等待, processing-处理中, completed-完成, failed-失败, cancelled-取消';


--
-- Name: COLUMN judge_queue.worker_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.judge_queue.worker_id IS '处理该任务的判题机标识';


--
-- Name: COLUMN judge_queue.retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.judge_queue.retry_count IS '已重试次数';


--
-- Name: COLUMN judge_queue.max_retries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.judge_queue.max_retries IS '最大重试次数，超过后标记为failed';


--
-- Name: judge_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.judge_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: judge_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.judge_queue_id_seq OWNED BY public.judge_queue.id;


--
-- Name: leaderboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboards (
    id bigint NOT NULL,
    leaderboard_type character varying(50) NOT NULL,
    scope character varying(100),
    student_id integer NOT NULL,
    student_name character varying(100),
    school_name character varying(200),
    class_name character varying(100),
    points integer NOT NULL,
    rank integer NOT NULL,
    rank_change integer,
    period_start date,
    period_end date,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_leaderboard_type CHECK (((leaderboard_type)::text = ANY (ARRAY[('weekly'::character varying)::text, ('monthly'::character varying)::text, ('total'::character varying)::text, ('school'::character varying)::text, ('class'::character varying)::text]))),
    CONSTRAINT check_rank CHECK ((rank > 0))
);


--
-- Name: TABLE leaderboards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.leaderboards IS '排行榜缓存表';


--
-- Name: COLUMN leaderboards.leaderboard_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leaderboards.leaderboard_type IS '排行榜类型：weekly(周榜)/monthly(月榜)/total(总榜)/school(校内)/class(班级)';


--
-- Name: leaderboards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leaderboards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leaderboards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leaderboards_id_seq OWNED BY public.leaderboards.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    enable_system boolean DEFAULT true,
    enable_activity boolean DEFAULT true,
    enable_achievement boolean DEFAULT true,
    enable_reminder boolean DEFAULT true,
    enable_announcement boolean DEFAULT true,
    enable_email boolean DEFAULT false,
    enable_sms boolean DEFAULT false,
    enable_push boolean DEFAULT true,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE notification_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_preferences IS '用户通知偏好设置表';


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    title_template character varying(200) NOT NULL,
    content_template text NOT NULL,
    type character varying(50) DEFAULT 'system'::character varying NOT NULL,
    default_priority integer DEFAULT 3,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE notification_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_templates IS '通知模板表 - 存储可复用的通知模板';


--
-- Name: notification_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_templates_id_seq OWNED BY public.notification_templates.id;


--
-- Name: teacher_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission_type character varying(50) NOT NULL,
    subjects text[],
    granted_by integer,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    scope_level character varying(20),
    district_id integer,
    school_id integer,
    CONSTRAINT teacher_permissions_scope_level_check CHECK (((scope_level)::text = ANY (ARRAY[('municipal'::character varying)::text, ('district'::character varying)::text, ('school'::character varying)::text])))
);


--
-- Name: COLUMN teacher_permissions.permission_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_permissions.permission_type IS '权限类型:
  审核权限:
    assessment_review - 测评题库审核
    practice_municipal_review - 市级练习题库审核
    practice_district_review - 区级练习题库审核
  发布权限:
    practice_publish_municipal - 市级练习发布
    practice_publish_district - 区级练习发布
    practice_publish_school - 校级练习发布
    practice_publish_base_school - 基地学校练习发布
    practice_publish_municipal_school - 市直学校练习发布
  注意: 班级练习不需要权限，所有教师都可以创建';


--
-- Name: COLUMN teacher_permissions.scope_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_permissions.scope_level IS '权限层级: municipal-市级, district-区级, school-校级';


--
-- Name: COLUMN teacher_permissions.district_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_permissions.district_id IS '区级权限关联的区ID（scope_level=district时必填）';


--
-- Name: COLUMN teacher_permissions.school_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_permissions.school_id IS '校级权限关联的学校ID（scope_level=school时必填，当前预留）';


--
-- Name: permission_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.permission_statistics AS
 SELECT tp.permission_type,
    tp.scope_level,
    d.name AS district_name,
    count(DISTINCT tp.user_id) AS teacher_count,
    ARRAY( SELECT DISTINCT unnest(array_agg(tp2.subjects)) AS unnest
           FROM public.teacher_permissions tp2
          WHERE (((tp2.permission_type)::text = (tp.permission_type)::text) AND ((tp2.scope_level)::text = (tp.scope_level)::text) AND ((tp2.district_id = tp.district_id) OR ((tp2.district_id IS NULL) AND (tp.district_id IS NULL))) AND (tp2.is_active = true) AND ((tp2.expires_at IS NULL) OR (tp2.expires_at > CURRENT_TIMESTAMP)))) AS covered_subjects
   FROM (public.teacher_permissions tp
     LEFT JOIN public.districts d ON ((tp.district_id = d.id)))
  WHERE ((tp.is_active = true) AND ((tp.expires_at IS NULL) OR (tp.expires_at > CURRENT_TIMESTAMP)))
  GROUP BY tp.permission_type, tp.scope_level, d.name, tp.district_id
  ORDER BY tp.scope_level, tp.permission_type;


--
-- Name: VIEW permission_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.permission_statistics IS '权限统计视图：按层级和权限类型统计教师数量和覆盖科目';


--
-- Name: points_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points_transactions (
    transaction_id bigint NOT NULL,
    student_id integer NOT NULL,
    points_change integer NOT NULL,
    transaction_type character varying(50) NOT NULL,
    source_id integer,
    source_type character varying(50),
    description text,
    balance_before integer NOT NULL,
    balance_after integer NOT NULL,
    expires_at timestamp without time zone,
    is_expired boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_transaction_type CHECK (((transaction_type)::text = ANY (ARRAY[('achievement'::character varying)::text, ('daily_task'::character varying)::text, ('activity'::character varying)::text, ('redemption'::character varying)::text, ('manual'::character varying)::text, ('teacher_reward'::character varying)::text, ('expired'::character varying)::text])))
);


--
-- Name: TABLE points_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.points_transactions IS '积分交易明细表';


--
-- Name: COLUMN points_transactions.points_change; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.points_transactions.points_change IS '积分变动：正数表示获得，负数表示消费';


--
-- Name: COLUMN points_transactions.transaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.points_transactions.transaction_type IS '交易类型：achievement(成就)/daily_task(日常任务)/redemption(商城兑换)/manual(手动调整)';


--
-- Name: points_transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.points_transactions_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: points_transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.points_transactions_transaction_id_seq OWNED BY public.points_transactions.transaction_id;


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    district_id integer,
    district character varying(50),
    address character varying(255),
    contact_person character varying(50),
    contact_phone character varying(20),
    type character varying(20) DEFAULT 'regular'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schools_type_check CHECK (((type)::text = ANY (ARRAY[('regular'::character varying)::text, ('municipal'::character varying)::text, ('base'::character varying)::text])))
);


--
-- Name: practice_publish_permission_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.practice_publish_permission_statistics AS
 SELECT tp.permission_type,
    tp.scope_level,
    d.name AS district_name,
    s.name AS school_name,
    count(DISTINCT tp.user_id) AS teacher_count,
    ARRAY( SELECT DISTINCT unnest(array_agg(tp2.subjects)) AS unnest
           FROM public.teacher_permissions tp2
          WHERE (((tp2.permission_type)::text = (tp.permission_type)::text) AND ((tp2.scope_level)::text = (tp.scope_level)::text) AND ((tp2.district_id = tp.district_id) OR ((tp2.district_id IS NULL) AND (tp.district_id IS NULL))) AND (tp2.is_active = true) AND ((tp2.expires_at IS NULL) OR (tp2.expires_at > CURRENT_TIMESTAMP)))) AS covered_subjects
   FROM ((public.teacher_permissions tp
     LEFT JOIN public.districts d ON ((tp.district_id = d.id)))
     LEFT JOIN public.schools s ON ((tp.school_id = s.id)))
  WHERE ((tp.is_active = true) AND ((tp.expires_at IS NULL) OR (tp.expires_at > CURRENT_TIMESTAMP)) AND ((tp.permission_type)::text ~~ 'practice_publish_%'::text))
  GROUP BY tp.permission_type, tp.scope_level, d.name, s.name, tp.district_id
  ORDER BY tp.scope_level, tp.permission_type;


--
-- Name: VIEW practice_publish_permission_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.practice_publish_permission_statistics IS '练习发布权限统计视图';


--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_bank (
    id integer NOT NULL,
    draft_id integer NOT NULL,
    scope character varying(100) NOT NULL,
    district_id integer,
    school_id integer,
    status character varying(20) DEFAULT 'published'::character varying,
    reviewer_id integer,
    review_comment text,
    reviewed_at timestamp without time zone,
    published_by integer NOT NULL,
    published_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    question_code character varying(20),
    usage_count integer DEFAULT 0,
    success_rate numeric(5,2),
    is_active boolean DEFAULT true,
    CONSTRAINT question_bank_status_check1 CHECK (((status)::text = ANY (ARRAY[('published'::character varying)::text, ('inactive'::character varying)::text, ('pending_review'::character varying)::text])))
);


--
-- Name: TABLE question_bank; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_bank IS '题目发布记录表：一个草稿可以有多条发布记录，每条对应一个发布范围';


--
-- Name: COLUMN question_bank.draft_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.draft_id IS '关联的草稿题目ID';


--
-- Name: COLUMN question_bank.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.scope IS '发布范围（单值）：assessment, practice_municipal, practice_district_{code}, practice_school_{id}';


--
-- Name: COLUMN question_bank.district_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.district_id IS '区级题目时，关联的区ID（从scope解析或手动指定）';


--
-- Name: COLUMN question_bank.school_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.school_id IS '校级题目时，关联的学校ID';


--
-- Name: COLUMN question_bank.question_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.question_code IS '题目编码，每个发布版本独立生成（格式：科目代码+日期+序号）';


--
-- Name: question_bank_distribution; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.question_bank_distribution AS
 SELECT s.scope_type,
    qb.subject,
    qb.grade,
    count(*) AS question_count,
    count(
        CASE
            WHEN ((qb.status)::text = 'published'::text) THEN 1
            ELSE NULL::integer
        END) AS published_count,
    count(
        CASE
            WHEN ((qb.status)::text = 'draft'::text) THEN 1
            ELSE NULL::integer
        END) AS draft_count,
    count(
        CASE
            WHEN ((qb.status)::text = 'pending_review'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_review_count
   FROM (public.question_bank_old_backup_20251122 qb
     CROSS JOIN LATERAL unnest(qb.scope) s(scope_type))
  WHERE (qb.is_active = true)
  GROUP BY s.scope_type, qb.subject, qb.grade
  ORDER BY s.scope_type, qb.subject, qb.grade;


--
-- Name: VIEW question_bank_distribution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.question_bank_distribution IS '题库分布统计：按 scope、科目、年级统计题目数量';


--
-- Name: question_bank_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_bank_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_bank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_bank_id_seq OWNED BY public.question_bank_old_backup_20251122.id;


--
-- Name: question_bank_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_bank_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_bank_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_bank_id_seq1 OWNED BY public.question_bank.id;


--
-- Name: question_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_drafts (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    subject character varying(50) NOT NULL,
    grade character varying(20) NOT NULL,
    content text NOT NULL,
    options jsonb,
    correct_answer jsonb,
    explanation text,
    image_url character varying(500),
    difficulty character varying(20) DEFAULT 'medium'::character varying,
    level character varying(10),
    suggested_score integer DEFAULT 5,
    abilities text[] DEFAULT '{}'::text[],
    knowledge_points text[] DEFAULT '{}'::text[],
    tags text[],
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    publish_count integer DEFAULT 0,
    total_usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    code_template text,
    time_limit integer DEFAULT 1000,
    memory_limit integer DEFAULT 256,
    judge_mode character varying(20) DEFAULT 'standard'::character varying,
    special_judge_code text,
    supported_languages text[] DEFAULT '{cpp}'::text[],
    CONSTRAINT question_drafts_difficulty_check CHECK (((difficulty)::text = ANY (ARRAY[('easy'::character varying)::text, ('medium'::character varying)::text, ('hard'::character varying)::text]))),
    CONSTRAINT question_drafts_judge_mode_check CHECK (((judge_mode IS NULL) OR ((judge_mode)::text = ANY (ARRAY[('standard'::character varying)::text, ('special'::character varying)::text])))),
    CONSTRAINT question_drafts_level_check CHECK (((level)::text = ANY (ARRAY[('L1'::character varying)::text, ('L2'::character varying)::text, ('L3'::character varying)::text, ('L4'::character varying)::text, ('L5'::character varying)::text, ('L6'::character varying)::text, ('L7'::character varying)::text, ('L8'::character varying)::text, ('L9'::character varying)::text]))),
    CONSTRAINT question_drafts_type_check CHECK (((type)::text = ANY (ARRAY[('single'::character varying)::text, ('multiple'::character varying)::text, ('blank'::character varying)::text, ('true_false'::character varying)::text, ('essay'::character varying)::text, ('code'::character varying)::text, ('matching'::character varying)::text])))
);


--
-- Name: TABLE question_drafts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_drafts IS '题目草稿表：存储题目的原始内容，可多次发布到不同范围';


--
-- Name: COLUMN question_drafts.publish_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.publish_count IS '该题目被发布的次数（一个题目可发布到多个范围）';


--
-- Name: COLUMN question_drafts.total_usage_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.total_usage_count IS '所有发布版本的累计使用次数';


--
-- Name: COLUMN question_drafts.code_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.code_template IS '编程题代码模板，预填充给学生作为起始代码';


--
-- Name: COLUMN question_drafts.time_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.time_limit IS '编程题默认时间限制(毫秒)，各测试点可单独设置';


--
-- Name: COLUMN question_drafts.memory_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.memory_limit IS '编程题默认内存限制(MB)，各测试点可单独设置';


--
-- Name: COLUMN question_drafts.judge_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.judge_mode IS '判题模式: standard-标准输出比对, special-使用特判程序';


--
-- Name: COLUMN question_drafts.special_judge_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.special_judge_code IS '特判程序C++代码，用于有多个正确答案的题目';


--
-- Name: COLUMN question_drafts.supported_languages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_drafts.supported_languages IS '支持的编程语言列表，默认只支持cpp';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(30) NOT NULL,
    real_name character varying(100),
    phone character varying(20),
    email character varying(100),
    avatar_url character varying(255),
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('student'::character varying)::text, ('teacher'::character varying)::text, ('school_admin'::character varying)::text, ('district_admin'::character varying)::text, ('municipal_school_admin'::character varying)::text, ('base_school_admin'::character varying)::text, ('municipal_admin'::character varying)::text, ('system_admin'::character varying)::text])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS '所有演示账号的密码都是 password123';


--
-- Name: COLUMN users.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password IS '使用 bcrypt 加密，盐值为 10';


--
-- Name: question_bank_with_draft; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.question_bank_with_draft AS
 SELECT qb.id,
    qb.draft_id,
    qb.scope,
    qb.district_id,
    qb.school_id,
    qb.status,
    qb.question_code,
    qb.usage_count,
    qb.success_rate,
    qb.published_by,
    qb.published_at,
    qb.reviewer_id,
    qb.review_comment,
    qb.reviewed_at,
    qb.is_active,
    qd.type,
    qd.subject,
    qd.grade,
    qd.content,
    qd.options,
    qd.correct_answer,
    qd.explanation,
    qd.image_url,
    qd.difficulty,
    qd.level,
    qd.suggested_score,
    qd.abilities,
    qd.knowledge_points,
    qd.tags,
    qd.created_by,
    qd.created_at,
    qd.updated_at,
    qd.code_template,
    qd.time_limit,
    qd.memory_limit,
    qd.judge_mode,
    qd.special_judge_code,
    qd.supported_languages,
    u1.real_name AS creator_name,
    u2.real_name AS publisher_name,
    u3.real_name AS reviewer_name,
    d.name AS district_name,
    d.code AS district_code,
    s.name AS school_name
   FROM ((((((public.question_bank qb
     JOIN public.question_drafts qd ON ((qb.draft_id = qd.id)))
     LEFT JOIN public.users u1 ON ((qd.created_by = u1.id)))
     LEFT JOIN public.users u2 ON ((qb.published_by = u2.id)))
     LEFT JOIN public.users u3 ON ((qb.reviewer_id = u3.id)))
     LEFT JOIN public.districts d ON ((qb.district_id = d.id)))
     LEFT JOIN public.schools s ON ((qb.school_id = s.id)))
  WHERE ((qb.is_active = true) AND (qd.is_active = true));


--
-- Name: VIEW question_bank_with_draft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.question_bank_with_draft IS 'Question bank records with draft content view (includes programming question fields)';


--
-- Name: question_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer,
    subject character varying(50),
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: question_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_categories_id_seq OWNED BY public.question_categories.id;


--
-- Name: question_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_drafts_id_seq OWNED BY public.question_drafts.id;


--
-- Name: question_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_reviews (
    id integer NOT NULL,
    question_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    status character varying(20) NOT NULL,
    comment text,
    reviewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT question_reviews_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: question_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_reviews_id_seq OWNED BY public.question_reviews.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    exam_id integer,
    type character varying(20) NOT NULL,
    content text NOT NULL,
    options jsonb,
    correct_answer text,
    score integer NOT NULL,
    order_no integer,
    difficulty character varying(20),
    explanation text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT questions_difficulty_check CHECK (((difficulty)::text = ANY (ARRAY[('easy'::character varying)::text, ('medium'::character varying)::text, ('hard'::character varying)::text]))),
    CONSTRAINT questions_type_check CHECK (((type)::text = ANY (ARRAY[('single'::character varying)::text, ('multiple'::character varying)::text, ('blank'::character varying)::text, ('essay'::character varying)::text, ('code'::character varying)::text])))
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: registration_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_audit_log (
    id integer NOT NULL,
    request_id integer NOT NULL,
    action character varying(50) NOT NULL,
    action_by integer,
    action_level integer NOT NULL,
    comment text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE registration_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.registration_audit_log IS '注册审核日志表，记录所有审核操作历史';


--
-- Name: COLUMN registration_audit_log.action_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.registration_audit_log.action_level IS '操作层级: 0=系统, 2=校级, 3=区县级, 4=市级';


--
-- Name: COLUMN registration_audit_log.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.registration_audit_log.metadata IS 'JSON格式元数据，存储升级原因等额外信息';


--
-- Name: registration_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registration_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registration_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registration_audit_log_id_seq OWNED BY public.registration_audit_log.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(10) NOT NULL,
    description text,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: school_ability_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_ability_stats (
    id integer NOT NULL,
    school_id integer NOT NULL,
    ability character varying(100) NOT NULL,
    subject character varying(50) NOT NULL,
    student_count integer DEFAULT 0,
    total_attempts integer DEFAULT 0,
    correct_count integer DEFAULT 0,
    accuracy_rate numeric(5,2) DEFAULT 0.00,
    avg_score numeric(5,2) DEFAULT 0.00,
    period_start date NOT NULL,
    period_end date NOT NULL,
    last_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE school_ability_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.school_ability_stats IS '学校能力统计表 - 记录学校在各能力维度上的整体表现';


--
-- Name: COLUMN school_ability_stats.school_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.school_id IS '学校ID';


--
-- Name: COLUMN school_ability_stats.ability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.ability IS '能力标签';


--
-- Name: COLUMN school_ability_stats.subject; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.subject IS '科目';


--
-- Name: COLUMN school_ability_stats.student_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.student_count IS '参与学生数';


--
-- Name: COLUMN school_ability_stats.total_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.total_attempts IS '总答题次数';


--
-- Name: COLUMN school_ability_stats.correct_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.correct_count IS '正确次数';


--
-- Name: COLUMN school_ability_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN school_ability_stats.avg_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.avg_score IS '平均得分';


--
-- Name: COLUMN school_ability_stats.period_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.period_start IS '统计周期开始日期';


--
-- Name: COLUMN school_ability_stats.period_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.school_ability_stats.period_end IS '统计周期结束日期';


--
-- Name: school_ability_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.school_ability_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: school_ability_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.school_ability_stats_id_seq OWNED BY public.school_ability_stats.id;


--
-- Name: schools_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schools_id_seq OWNED BY public.schools.id;


--
-- Name: student_ability_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_ability_stats (
    id integer NOT NULL,
    student_id integer NOT NULL,
    ability character varying(100) NOT NULL,
    subject character varying(50) NOT NULL,
    total_questions integer DEFAULT 0,
    correct_count integer DEFAULT 0,
    accuracy_rate numeric(5,2) DEFAULT 0.00,
    avg_score numeric(5,2) DEFAULT 0.00,
    last_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE student_ability_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_ability_stats IS '学生能力统计表 - 记录每个学生在各能力维度上的表现';


--
-- Name: COLUMN student_ability_stats.student_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_ability_stats.student_id IS '学生用户ID';


--
-- Name: COLUMN student_ability_stats.ability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_ability_stats.ability IS '能力标签';


--
-- Name: COLUMN student_ability_stats.subject; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_ability_stats.subject IS '科目';


--
-- Name: COLUMN student_ability_stats.total_questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_ability_stats.total_questions IS '总题数';


--
-- Name: COLUMN student_ability_stats.correct_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_ability_stats.correct_count IS '正确题数';


--
-- Name: COLUMN student_ability_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_ability_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN student_ability_stats.avg_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_ability_stats.avg_score IS '平均得分';


--
-- Name: student_ability_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_ability_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_ability_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_ability_stats_id_seq OWNED BY public.student_ability_stats.id;


--
-- Name: student_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_achievements (
    id integer NOT NULL,
    student_id integer NOT NULL,
    achievement_id integer NOT NULL,
    achieved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    points_awarded integer DEFAULT 0 NOT NULL,
    is_displayed boolean DEFAULT true,
    display_order integer DEFAULT 0,
    times_achieved integer DEFAULT 1
);


--
-- Name: TABLE student_achievements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_achievements IS '学生成就记录表';


--
-- Name: COLUMN student_achievements.is_displayed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_achievements.is_displayed IS '是否在个人成就墙展示';


--
-- Name: student_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_achievements_id_seq OWNED BY public.student_achievements.id;


--
-- Name: student_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_activities_id_seq OWNED BY public.student_activities.id;


--
-- Name: student_daily_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_daily_tasks (
    id bigint NOT NULL,
    student_id integer NOT NULL,
    task_id integer NOT NULL,
    task_date date NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    progress_value integer DEFAULT 0,
    target_value integer NOT NULL,
    points_awarded integer DEFAULT 0
);


--
-- Name: TABLE student_daily_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_daily_tasks IS '学生日常任务完成记录表';


--
-- Name: COLUMN student_daily_tasks.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_daily_tasks.task_date IS '任务日期，每日凌晨重置';


--
-- Name: student_daily_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_daily_tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_daily_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_daily_tasks_id_seq OWNED BY public.student_daily_tasks.id;


--
-- Name: student_exams; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.student_exams AS
 SELECT student_activities.id,
    student_activities.student_id,
    student_activities.activity_id,
    student_activities.session_id,
    student_activities.status,
    student_activities.start_time,
    student_activities.submit_time,
    student_activities.score,
    student_activities.rank,
    student_activities.ip_address,
    student_activities.created_at,
    student_activities.attempt_number,
    student_activities.is_retake,
    student_activities.previous_attempt_id
   FROM public.student_activities;


--
-- Name: student_knowledge_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_knowledge_stats (
    id integer NOT NULL,
    student_id integer NOT NULL,
    knowledge_point character varying(100) NOT NULL,
    subject character varying(50) NOT NULL,
    total_questions integer DEFAULT 0,
    correct_count integer DEFAULT 0,
    accuracy_rate numeric(5,2) DEFAULT 0.00,
    avg_score numeric(5,2) DEFAULT 0.00,
    last_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE student_knowledge_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_knowledge_stats IS '学生知识点统计表 - 记录每个学生在各知识点上的掌握情况';


--
-- Name: COLUMN student_knowledge_stats.student_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_knowledge_stats.student_id IS '学生用户ID';


--
-- Name: COLUMN student_knowledge_stats.knowledge_point; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_knowledge_stats.knowledge_point IS '知识点标签';


--
-- Name: COLUMN student_knowledge_stats.subject; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_knowledge_stats.subject IS '科目';


--
-- Name: COLUMN student_knowledge_stats.total_questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_knowledge_stats.total_questions IS '总题数';


--
-- Name: COLUMN student_knowledge_stats.correct_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_knowledge_stats.correct_count IS '正确题数';


--
-- Name: COLUMN student_knowledge_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_knowledge_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN student_knowledge_stats.avg_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_knowledge_stats.avg_score IS '平均得分';


--
-- Name: student_knowledge_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_knowledge_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_knowledge_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_knowledge_stats_id_seq OWNED BY public.student_knowledge_stats.id;


--
-- Name: student_login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_login_history (
    id integer NOT NULL,
    student_id integer NOT NULL,
    user_id integer NOT NULL,
    login_date date DEFAULT CURRENT_DATE NOT NULL,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    login_method character varying(50) DEFAULT 'username'::character varying,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE student_login_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_login_history IS '学生登录历史记录表，用于成就系统和行为分析';


--
-- Name: COLUMN student_login_history.student_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_login_history.student_id IS '学生ID（students.id）';


--
-- Name: COLUMN student_login_history.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_login_history.user_id IS '用户ID（users.id）';


--
-- Name: COLUMN student_login_history.login_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_login_history.login_date IS '登录日期（用于检测连续天数）';


--
-- Name: COLUMN student_login_history.login_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_login_history.login_time IS '登录时间（精确到秒）';


--
-- Name: COLUMN student_login_history.login_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_login_history.login_method IS '登录方式：username/phone/idCard';


--
-- Name: COLUMN student_login_history.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_login_history.ip_address IS 'IP地址';


--
-- Name: COLUMN student_login_history.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_login_history.user_agent IS '用户代理字符串';


--
-- Name: student_login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_login_history_id_seq OWNED BY public.student_login_history.id;


--
-- Name: student_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_points (
    student_id integer NOT NULL,
    current_points integer DEFAULT 0 NOT NULL,
    total_points integer DEFAULT 0 NOT NULL,
    spent_points integer DEFAULT 0 NOT NULL,
    frozen_points integer DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_current_points CHECK ((current_points >= 0)),
    CONSTRAINT check_frozen_points CHECK ((frozen_points >= 0)),
    CONSTRAINT check_points_balance CHECK ((current_points = ((total_points - spent_points) - frozen_points))),
    CONSTRAINT check_spent_points CHECK ((spent_points >= 0)),
    CONSTRAINT check_total_points CHECK ((total_points >= 0))
);


--
-- Name: TABLE student_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_points IS '学生积分账户表';


--
-- Name: COLUMN student_points.current_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_points.current_points IS '当前可用积分 = 总积分 - 已消费 - 冻结';


--
-- Name: COLUMN student_points.total_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_points.total_points IS '历史累计获得的所有积分（永久记录）';


--
-- Name: student_registration_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_registration_requests (
    id integer NOT NULL,
    phone character varying(11) NOT NULL,
    real_name character varying(100) NOT NULL,
    birth_date date NOT NULL,
    id_card_last4 character varying(4) NOT NULL,
    district_id integer,
    district_code character varying(20) NOT NULL,
    district_name character varying(100) NOT NULL,
    school_id integer,
    school_code character varying(50) NOT NULL,
    school_name character varying(200) NOT NULL,
    grade character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    current_reviewer_level integer DEFAULT 2 NOT NULL,
    current_reviewer_id integer,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_escalated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    reviewed_by integer,
    review_comment text,
    student_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    inquiry_code_hash character(64)
);


--
-- Name: TABLE student_registration_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_registration_requests IS '学生注册申请表，记录学生自主注册申请信息';


--
-- Name: COLUMN student_registration_requests.current_reviewer_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_registration_requests.current_reviewer_level IS '当前审核层级: 2=校级, 3=区县级, 4=市级';


--
-- Name: COLUMN student_registration_requests.last_escalated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_registration_requests.last_escalated_at IS '最后升级时间，用于计算3天自动升级';


--
-- Name: COLUMN student_registration_requests.inquiry_code_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_registration_requests.inquiry_code_hash IS 'SHA-256 digest of the random registration status inquiry code; never store plaintext';


--
-- Name: student_registration_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_registration_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_registration_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_registration_requests_id_seq OWNED BY public.student_registration_requests.id;


--
-- Name: student_task_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_task_progress (
    progress_id integer NOT NULL,
    student_id integer NOT NULL,
    task_id integer NOT NULL,
    current_value integer DEFAULT 0,
    target_value integer NOT NULL,
    completion_rate numeric(5,2) DEFAULT 0.00,
    is_completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    points_awarded integer DEFAULT 0,
    bonus_awarded integer DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    reset_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE student_task_progress; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_task_progress IS '学生日常任务进度表';


--
-- Name: COLUMN student_task_progress.current_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.current_value IS '当前完成进度值';


--
-- Name: COLUMN student_task_progress.completion_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.completion_rate IS '完成率百分比';


--
-- Name: COLUMN student_task_progress.bonus_awarded; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.bonus_awarded IS '获得的奖励积分';


--
-- Name: COLUMN student_task_progress.period_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.period_start IS '任务周期开始日期';


--
-- Name: COLUMN student_task_progress.period_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.period_end IS '任务周期结束日期';


--
-- Name: COLUMN student_task_progress.reset_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.reset_count IS '任务重置次数，用于连续完成追踪';


--
-- Name: student_task_progress_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_task_progress_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_task_progress_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_task_progress_progress_id_seq OWNED BY public.student_task_progress.progress_id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    user_id integer,
    student_no character varying(50),
    school_id integer,
    grade character varying(20),
    class character varying(20),
    enrollment_date date,
    guardian_name character varying(50),
    guardian_phone character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    subject_code character varying(10) NOT NULL,
    subject_name character varying(50) NOT NULL,
    description text,
    grade_range jsonb NOT NULL,
    ability_levels jsonb NOT NULL,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: system_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_announcements (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    summary character varying(500),
    type character varying(50) DEFAULT 'notice'::character varying NOT NULL,
    target_audience character varying(50) DEFAULT 'all'::character varying,
    target_district_id integer,
    target_school_id integer,
    is_pinned boolean DEFAULT false,
    is_popup boolean DEFAULT false,
    status character varying(20) DEFAULT 'draft'::character varying,
    published_at timestamp without time zone,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE system_announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_announcements IS '系统公告表 - 存储全局公告信息';


--
-- Name: system_announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_announcements_id_seq OWNED BY public.system_announcements.id;


--
-- Name: task_completion_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_completion_history (
    history_id integer NOT NULL,
    student_id integer NOT NULL,
    task_id integer NOT NULL,
    completed_value integer NOT NULL,
    target_value integer NOT NULL,
    points_earned integer DEFAULT 0,
    bonus_earned integer DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    completion_time timestamp without time zone NOT NULL,
    streak_count integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE task_completion_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.task_completion_history IS '任务完成历史记录表';


--
-- Name: COLUMN task_completion_history.bonus_earned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_completion_history.bonus_earned IS '获得的奖励积分';


--
-- Name: COLUMN task_completion_history.streak_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_completion_history.streak_count IS '连续完成次数（用于计算连续奖励）';


--
-- Name: task_completion_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_completion_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_completion_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_completion_history_history_id_seq OWNED BY public.task_completion_history.history_id;


--
-- Name: teacher_grading_workload; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.teacher_grading_workload AS
 SELECT a.id AS activity_id,
    a.title,
    a.created_by AS teacher_id,
    u.real_name AS teacher_name,
    count(DISTINCT sa.id) AS total_submissions,
    count(DISTINCT
        CASE
            WHEN ((sa.grading_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('partial_graded'::character varying)::text])) THEN sa.id
            ELSE NULL::integer
        END) AS pending_submissions,
    count(ans.id) AS total_answers_to_grade,
    count(
        CASE
            WHEN ((ans.grading_status)::text = 'pending'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_answers
   FROM (((public.activities a
     JOIN public.users u ON ((a.created_by = u.id)))
     LEFT JOIN public.student_activities sa ON (((a.id = sa.activity_id) AND ((sa.status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('graded'::character varying)::text])))))
     LEFT JOIN public.answers ans ON (((sa.id = ans.student_exam_id) AND ((ans.grading_status)::text = 'pending'::text))))
  WHERE ((a.status)::text = 'published'::text)
  GROUP BY a.id, a.title, a.created_by, u.real_name;


--
-- Name: VIEW teacher_grading_workload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.teacher_grading_workload IS '教师评卷工作量统计视图';


--
-- Name: teacher_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teacher_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teacher_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teacher_permissions_id_seq OWNED BY public.teacher_permissions.id;


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id integer NOT NULL,
    user_id integer,
    teacher_no character varying(50),
    school_id integer,
    subjects text[],
    title character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teachers_id_seq OWNED BY public.teachers.id;


--
-- Name: teaching_class_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teaching_class_activities (
    id integer NOT NULL,
    teaching_class_id integer NOT NULL,
    activity_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by integer NOT NULL,
    deadline timestamp without time zone,
    is_required boolean DEFAULT false
);


--
-- Name: TABLE teaching_class_activities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teaching_class_activities IS '教学班活动关联表 - 记录教学班与活动的关联关系';


--
-- Name: teaching_class_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teaching_class_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teaching_class_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teaching_class_activities_id_seq OWNED BY public.teaching_class_activities.id;


--
-- Name: teaching_class_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teaching_class_approvals (
    id integer NOT NULL,
    teaching_class_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    action character varying(20) NOT NULL,
    comment text,
    reviewer_level character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_approval_action CHECK (((action)::text = ANY (ARRAY[('approve'::character varying)::text, ('reject'::character varying)::text, ('escalate'::character varying)::text, ('return'::character varying)::text])))
);


--
-- Name: TABLE teaching_class_approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teaching_class_approvals IS '教学班审批记录表 - 记录审批历史';


--
-- Name: COLUMN teaching_class_approvals.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teaching_class_approvals.action IS '审批动作: approve-批准, reject-拒绝, escalate-流转上级, return-退回修改';


--
-- Name: teaching_class_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teaching_class_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teaching_class_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teaching_class_approvals_id_seq OWNED BY public.teaching_class_approvals.id;


--
-- Name: teaching_class_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teaching_class_members (
    id integer NOT NULL,
    teaching_class_id integer NOT NULL,
    student_id integer NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    removed_at timestamp without time zone,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE teaching_class_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teaching_class_members IS '教学班成员表 - 记录教学班与学生的关联关系';


--
-- Name: COLUMN teaching_class_members.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teaching_class_members.is_active IS '是否在班: true-在班, false-已移除';


--
-- Name: teaching_class_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teaching_class_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teaching_class_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teaching_class_members_id_seq OWNED BY public.teaching_class_members.id;


--
-- Name: teaching_class_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teaching_class_teachers (
    id integer NOT NULL,
    teaching_class_id integer NOT NULL,
    teacher_id integer NOT NULL,
    role character varying(20) DEFAULT 'teacher'::character varying NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    CONSTRAINT valid_teacher_role CHECK (((role)::text = ANY (ARRAY[('creator'::character varying)::text, ('teacher'::character varying)::text, ('assistant'::character varying)::text])))
);


--
-- Name: TABLE teaching_class_teachers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teaching_class_teachers IS '教学班教师表 - 记录教学班与教师的关联关系';


--
-- Name: COLUMN teaching_class_teachers.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teaching_class_teachers.role IS '教师角色: creator-创建者, teacher-任课教师, assistant-助教';


--
-- Name: teaching_class_teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teaching_class_teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teaching_class_teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teaching_class_teachers_id_seq OWNED BY public.teaching_class_teachers.id;


--
-- Name: teaching_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teaching_classes (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    scope character varying(20) NOT NULL,
    school_id integer,
    district_id integer,
    subject character varying(50),
    grade character varying(20),
    academic_year character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    rejection_reason text,
    submitted_at timestamp without time zone,
    current_reviewer_level character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_scope CHECK (((scope)::text = ANY (ARRAY[('school'::character varying)::text, ('district'::character varying)::text, ('municipal'::character varying)::text]))),
    CONSTRAINT valid_status CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('archived'::character varying)::text])))
);


--
-- Name: TABLE teaching_classes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teaching_classes IS '教学班主表 - 存储教学班基本信息';


--
-- Name: COLUMN teaching_classes.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teaching_classes.scope IS '教学班范围: school-校级, district-区级, municipal-市级';


--
-- Name: COLUMN teaching_classes.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teaching_classes.status IS '状态: draft-草稿, pending-待审批, approved-已批准, rejected-已拒绝, archived-已归档';


--
-- Name: COLUMN teaching_classes.current_reviewer_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teaching_classes.current_reviewer_level IS '当前审核级别，用于超时流转';


--
-- Name: teaching_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teaching_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teaching_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teaching_classes_id_seq OWNED BY public.teaching_classes.id;


--
-- Name: test_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cases (
    id integer NOT NULL,
    question_id integer NOT NULL,
    case_number integer NOT NULL,
    input_data text DEFAULT ''::text NOT NULL,
    expected_output text NOT NULL,
    score integer DEFAULT 10,
    time_limit integer DEFAULT 1000,
    memory_limit integer DEFAULT 256,
    is_sample boolean DEFAULT false,
    description character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE test_cases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.test_cases IS '编程题测试用例表';


--
-- Name: COLUMN test_cases.question_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.question_id IS '关联的题目草稿ID (question_drafts.id)';


--
-- Name: COLUMN test_cases.case_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.case_number IS '测试点编号，从1开始递增';


--
-- Name: COLUMN test_cases.input_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.input_data IS '测试输入数据，通过stdin传递给程序';


--
-- Name: COLUMN test_cases.expected_output; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.expected_output IS '期望的正确输出，用于与程序stdout比对';


--
-- Name: COLUMN test_cases.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.score IS '该测试点的分值，所有测试点分值之和应等于题目总分';


--
-- Name: COLUMN test_cases.time_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.time_limit IS '时间限制(毫秒)，默认1000ms，超时返回TLE';


--
-- Name: COLUMN test_cases.memory_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.memory_limit IS '内存限制(MB)，默认256MB，超限返回MLE';


--
-- Name: COLUMN test_cases.is_sample; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.is_sample IS '是否为样例测试点，样例会展示给学生查看';


--
-- Name: COLUMN test_cases.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.test_cases.description IS '测试点描述，如"基础测试"、"边界测试"、"大数据测试"';


--
-- Name: test_cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.test_cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: test_cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.test_cases_id_seq OWNED BY public.test_cases.id;


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) DEFAULT 'system'::character varying NOT NULL,
    title character varying(200) NOT NULL,
    content text,
    metadata jsonb DEFAULT '{}'::jsonb,
    related_type character varying(50),
    related_id integer,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    priority integer DEFAULT 3,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_notifications_priority_check CHECK (((priority >= 1) AND (priority <= 5)))
);


--
-- Name: TABLE user_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_notifications IS '用户通知表 - 存储发送给用户的个人通知';


--
-- Name: user_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_notifications_id_seq OWNED BY public.user_notifications.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_district_ability_realtime; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_district_ability_realtime AS
 SELECT sch.district_id,
    s.grade,
    unnest(qd.abilities) AS ability,
    qd.subject,
    count(DISTINCT s.school_id) AS school_count,
    count(DISTINCT sa.student_id) AS student_count,
    count(*) AS total_attempts,
    sum(
        CASE
            WHEN a.is_correct THEN 1
            ELSE 0
        END) AS correct_count,
    round(avg(
        CASE
            WHEN a.is_correct THEN 100
            ELSE 0
        END), 2) AS accuracy_rate,
    round(avg(a.score), 2) AS avg_score,
    max(sa.submit_time) AS last_activity_time
   FROM (((((public.student_activities sa
     JOIN public.students s ON ((sa.student_id = s.user_id)))
     JOIN public.schools sch ON ((s.school_id = sch.id)))
     JOIN public.answers a ON ((sa.id = a.student_exam_id)))
     JOIN public.question_bank qb ON ((a.question_id = qb.id)))
     JOIN public.question_drafts qd ON ((qb.draft_id = qd.id)))
  WHERE ((((sa.status)::text = 'submitted'::text) OR ((sa.status)::text = 'graded'::text)) AND (qd.abilities IS NOT NULL) AND (array_length(qd.abilities, 1) > 0) AND (sch.district_id IS NOT NULL))
  GROUP BY sch.district_id, s.grade, (unnest(qd.abilities)), qd.subject;


--
-- Name: v_location_registration_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_location_registration_details AS
 SELECT al.id AS location_id,
    al.activity_id,
    al.name AS location_name,
    al.address,
    al.capacity,
    al.registered_count,
    (al.capacity - al.registered_count) AS remaining_capacity,
    al.exam_date,
    al.exam_time_start,
    al.exam_time_end,
    al.check_in_time,
    al.is_active,
    d.name AS district_name,
    a.title AS activity_title,
    a.ability_level
   FROM ((public.assessment_locations al
     LEFT JOIN public.districts d ON ((al.district_id = d.id)))
     LEFT JOIN public.activities a ON ((al.activity_id = a.id)));


--
-- Name: VIEW v_location_registration_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_location_registration_details IS '测评点报名详情视图';


--
-- Name: v_pending_teaching_classes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_pending_teaching_classes AS
 SELECT tc.id,
    tc.name,
    tc.scope,
    tc.description,
    tc.academic_year,
    tc.school_id,
    s.name AS school_name,
    tc.district_id,
    d.name AS district_name,
    tc.subject,
    tc.grade,
    tc.created_by,
    u.real_name AS creator_name,
    tc.submitted_at,
    tc.current_reviewer_level,
    EXTRACT(day FROM (CURRENT_TIMESTAMP - (tc.submitted_at)::timestamp with time zone)) AS pending_days
   FROM (((public.teaching_classes tc
     LEFT JOIN public.schools s ON ((tc.school_id = s.id)))
     LEFT JOIN public.districts d ON ((tc.district_id = d.id)))
     LEFT JOIN public.users u ON ((tc.created_by = u.id)))
  WHERE ((tc.status)::text = 'pending'::text)
  ORDER BY tc.submitted_at;


--
-- Name: VIEW v_pending_teaching_classes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_pending_teaching_classes IS '待审批教学班视图 - 显示待审批的教学班列表';


--
-- Name: v_question_submission_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_question_submission_stats AS
 SELECT cs.question_id,
    qb.question_code,
    "left"(qd.content, 100) AS content_preview,
    qd.subject,
    qd.difficulty,
    count(*) AS total_submissions,
    count(DISTINCT cs.student_id) AS unique_submitters,
    count(*) FILTER (WHERE ((cs.status)::text = 'accepted'::text)) AS accepted_count,
    count(DISTINCT cs.student_id) FILTER (WHERE ((cs.status)::text = 'accepted'::text)) AS solved_by_count,
    round(((100.0 * (count(*) FILTER (WHERE ((cs.status)::text = 'accepted'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS acceptance_rate,
    round(avg(cs.time_used) FILTER (WHERE ((cs.status)::text = 'accepted'::text)), 2) AS avg_time_ms,
    round(avg(cs.memory_used) FILTER (WHERE ((cs.status)::text = 'accepted'::text)), 2) AS avg_memory_kb
   FROM ((public.code_submissions cs
     JOIN public.question_bank qb ON ((cs.question_id = qb.id)))
     JOIN public.question_drafts qd ON ((qb.draft_id = qd.id)))
  GROUP BY cs.question_id, qb.question_code, qd.content, qd.subject, qd.difficulty;


--
-- Name: VIEW v_question_submission_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_question_submission_stats IS '编程题提交统计视图';


--
-- Name: v_question_test_case_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_question_test_case_stats AS
 SELECT qd.id AS draft_id,
    qd.content,
    qd.type,
    qd.subject,
    qd.difficulty,
    qd.time_limit AS default_time_limit,
    qd.memory_limit AS default_memory_limit,
    count(tc.id) AS test_case_count,
    count(tc.id) FILTER (WHERE (tc.is_sample = true)) AS sample_count,
    COALESCE(sum(tc.score), (0)::bigint) AS total_score,
    min(tc.time_limit) AS min_time_limit,
    max(tc.time_limit) AS max_time_limit,
    min(tc.memory_limit) AS min_memory_limit,
    max(tc.memory_limit) AS max_memory_limit
   FROM (public.question_drafts qd
     LEFT JOIN public.test_cases tc ON ((qd.id = tc.question_id)))
  WHERE ((qd.type)::text = 'code'::text)
  GROUP BY qd.id, qd.content, qd.type, qd.subject, qd.difficulty, qd.time_limit, qd.memory_limit;


--
-- Name: VIEW v_question_test_case_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_question_test_case_stats IS '编程题测试用例统计视图';


--
-- Name: v_registration_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_registration_statistics AS
 SELECT a.id AS activity_id,
    a.title AS activity_title,
    a.ability_level,
    a.type AS activity_type,
    count(ar.id) AS total_registrations,
    count(
        CASE
            WHEN ((ar.status)::text = 'confirmed'::text) THEN 1
            ELSE NULL::integer
        END) AS confirmed_count,
    count(
        CASE
            WHEN ((ar.status)::text = 'pending'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_count,
    count(
        CASE
            WHEN ((ar.status)::text = 'cancelled'::text) THEN 1
            ELSE NULL::integer
        END) AS cancelled_count,
    count(
        CASE
            WHEN ((ar.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_count,
    count(
        CASE
            WHEN ((ar.status)::text = 'absent'::text) THEN 1
            ELSE NULL::integer
        END) AS absent_count,
    a.max_participants,
        CASE
            WHEN (a.max_participants IS NOT NULL) THEN (a.max_participants - count(
            CASE
                WHEN ((ar.status)::text = 'confirmed'::text) THEN 1
                ELSE NULL::integer
            END))
            ELSE NULL::bigint
        END AS remaining_slots
   FROM (public.activities a
     LEFT JOIN public.assessment_registrations ar ON ((a.id = ar.activity_id)))
  WHERE ((a.type)::text = 'assessment'::text)
  GROUP BY a.id, a.title, a.ability_level, a.type, a.max_participants;


--
-- Name: VIEW v_registration_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_registration_statistics IS '测评报名统计视图';


--
-- Name: v_school_ability_realtime; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_school_ability_realtime AS
 SELECT s.school_id,
    s.grade,
    unnest(qd.abilities) AS ability,
    qd.subject,
    count(DISTINCT sa.student_id) AS student_count,
    count(*) AS total_attempts,
    sum(
        CASE
            WHEN a.is_correct THEN 1
            ELSE 0
        END) AS correct_count,
    round(avg(
        CASE
            WHEN a.is_correct THEN 100
            ELSE 0
        END), 2) AS accuracy_rate,
    round(avg(a.score), 2) AS avg_score,
    max(sa.submit_time) AS last_activity_time
   FROM ((((public.student_activities sa
     JOIN public.students s ON ((sa.student_id = s.user_id)))
     JOIN public.answers a ON ((sa.id = a.student_exam_id)))
     JOIN public.question_bank qb ON ((a.question_id = qb.id)))
     JOIN public.question_drafts qd ON ((qb.draft_id = qd.id)))
  WHERE ((((sa.status)::text = 'submitted'::text) OR ((sa.status)::text = 'graded'::text)) AND (qd.abilities IS NOT NULL) AND (array_length(qd.abilities, 1) > 0) AND (s.school_id IS NOT NULL))
  GROUP BY s.school_id, s.grade, (unnest(qd.abilities)), qd.subject;


--
-- Name: v_student_ability_realtime; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_student_ability_realtime AS
 SELECT sa.student_id,
    unnest(qd.abilities) AS ability,
    qd.subject,
    count(*) AS total_questions,
    sum(
        CASE
            WHEN a.is_correct THEN 1
            ELSE 0
        END) AS correct_count,
    round(avg(
        CASE
            WHEN a.is_correct THEN 100
            ELSE 0
        END), 2) AS accuracy_rate,
    round(avg(a.score), 2) AS avg_score,
    max(sa.submit_time) AS last_activity_time
   FROM (((public.student_activities sa
     JOIN public.answers a ON ((sa.id = a.student_exam_id)))
     JOIN public.question_bank qb ON ((a.question_id = qb.id)))
     JOIN public.question_drafts qd ON ((qb.draft_id = qd.id)))
  WHERE ((((sa.status)::text = 'submitted'::text) OR ((sa.status)::text = 'graded'::text)) AND (qd.abilities IS NOT NULL) AND (array_length(qd.abilities, 1) > 0))
  GROUP BY sa.student_id, (unnest(qd.abilities)), qd.subject;


--
-- Name: VIEW v_student_ability_realtime; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_student_ability_realtime IS '学生能力实时统计视图 - 基于最新答题记录实时计算';


--
-- Name: v_student_knowledge_realtime; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_student_knowledge_realtime AS
 SELECT sa.student_id,
    unnest(qd.knowledge_points) AS knowledge_point,
    qd.subject,
    count(*) AS total_questions,
    sum(
        CASE
            WHEN a.is_correct THEN 1
            ELSE 0
        END) AS correct_count,
    round(avg(
        CASE
            WHEN a.is_correct THEN 100
            ELSE 0
        END), 2) AS accuracy_rate,
    round(avg(a.score), 2) AS avg_score,
    max(sa.submit_time) AS last_activity_time
   FROM (((public.student_activities sa
     JOIN public.answers a ON ((sa.id = a.student_exam_id)))
     JOIN public.question_bank qb ON ((a.question_id = qb.id)))
     JOIN public.question_drafts qd ON ((qb.draft_id = qd.id)))
  WHERE ((((sa.status)::text = 'submitted'::text) OR ((sa.status)::text = 'graded'::text)) AND (qd.knowledge_points IS NOT NULL) AND (array_length(qd.knowledge_points, 1) > 0))
  GROUP BY sa.student_id, (unnest(qd.knowledge_points)), qd.subject;


--
-- Name: VIEW v_student_knowledge_realtime; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_student_knowledge_realtime IS '学生知识点实时统计视图 - 基于最新答题记录实时计算';


--
-- Name: v_student_learning_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_student_learning_overview AS
 SELECT sa.student_id,
    count(DISTINCT sa.activity_id) AS total_activities,
    count(DISTINCT
        CASE
            WHEN ((sa.status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('graded'::character varying)::text])) THEN sa.activity_id
            ELSE NULL::integer
        END) AS completed_activities,
    round(avg(
        CASE
            WHEN ((sa.status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('graded'::character varying)::text])) THEN sa.score
            ELSE NULL::numeric
        END), 2) AS avg_score,
    sum(EXTRACT(epoch FROM (sa.submit_time - sa.start_time))) AS total_study_seconds,
    max(sa.submit_time) AS last_activity_time,
    min(sa.created_at) AS first_activity_time
   FROM public.student_activities sa
  GROUP BY sa.student_id;


--
-- Name: VIEW v_student_learning_overview; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_student_learning_overview IS '学生学习概况视图 - 整体学习统计';


--
-- Name: v_student_submission_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_student_submission_stats AS
 SELECT cs.student_id,
    u.username,
    u.real_name,
    count(*) AS total_submissions,
    count(*) FILTER (WHERE ((cs.status)::text = 'accepted'::text)) AS accepted_count,
    count(*) FILTER (WHERE ((cs.status)::text = 'wrong_answer'::text)) AS wrong_answer_count,
    count(*) FILTER (WHERE ((cs.status)::text = 'compile_error'::text)) AS compile_error_count,
    count(*) FILTER (WHERE ((cs.status)::text = 'runtime_error'::text)) AS runtime_error_count,
    count(*) FILTER (WHERE ((cs.status)::text = 'time_limit'::text)) AS time_limit_count,
    count(*) FILTER (WHERE ((cs.status)::text = 'memory_limit'::text)) AS memory_limit_count,
    count(DISTINCT cs.question_id) AS attempted_questions,
    count(DISTINCT cs.question_id) FILTER (WHERE ((cs.status)::text = 'accepted'::text)) AS solved_questions,
    round(((100.0 * (count(*) FILTER (WHERE ((cs.status)::text = 'accepted'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS acceptance_rate,
    max(cs.submitted_at) AS last_submission_time
   FROM (public.code_submissions cs
     JOIN public.users u ON ((cs.student_id = u.id)))
  GROUP BY cs.student_id, u.username, u.real_name;


--
-- Name: VIEW v_student_submission_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_student_submission_stats IS '学生代码提交统计视图';


--
-- Name: v_teaching_class_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_teaching_class_summary AS
 SELECT tc.id,
    tc.name,
    tc.scope,
    tc.status,
    tc.academic_year,
    tc.school_id,
    s.name AS school_name,
    tc.district_id,
    d.name AS district_name,
    tc.subject,
    tc.grade,
    tc.created_by,
    u.real_name AS creator_name,
    tc.created_at,
    tc.submitted_at,
    tc.approved_at,
    ( SELECT count(*) AS count
           FROM public.teaching_class_members tcm
          WHERE ((tcm.teaching_class_id = tc.id) AND (tcm.is_active = true))) AS student_count,
    ( SELECT count(*) AS count
           FROM public.teaching_class_teachers tct
          WHERE ((tct.teaching_class_id = tc.id) AND (tct.is_active = true))) AS teacher_count,
    ( SELECT count(*) AS count
           FROM public.teaching_class_activities tca
          WHERE (tca.teaching_class_id = tc.id)) AS activity_count
   FROM (((public.teaching_classes tc
     LEFT JOIN public.schools s ON ((tc.school_id = s.id)))
     LEFT JOIN public.districts d ON ((tc.district_id = d.id)))
     LEFT JOIN public.users u ON ((tc.created_by = u.id)));


--
-- Name: VIEW v_teaching_class_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_teaching_class_summary IS '教学班汇总视图 - 包含学生数、教师数、活动数等统计信息';


--
-- Name: achievement_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress ALTER COLUMN id SET DEFAULT nextval('public.achievement_progress_id_seq'::regclass);


--
-- Name: achievements achievement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements ALTER COLUMN achievement_id SET DEFAULT nextval('public.achievements_achievement_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_history ALTER COLUMN id SET DEFAULT nextval('public.activity_history_id_seq'::regclass);


--
-- Name: activity_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_questions ALTER COLUMN id SET DEFAULT nextval('public.activity_questions_id_seq'::regclass);


--
-- Name: admin_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions ALTER COLUMN id SET DEFAULT nextval('public.admin_permissions_id_seq'::regclass);


--
-- Name: announcement_reads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads ALTER COLUMN id SET DEFAULT nextval('public.announcement_reads_id_seq'::regclass);


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: assessment_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_locations ALTER COLUMN id SET DEFAULT nextval('public.assessment_locations_id_seq'::regclass);


--
-- Name: assessment_registrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations ALTER COLUMN id SET DEFAULT nextval('public.assessment_registrations_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq'::regclass);


--
-- Name: code_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions ALTER COLUMN id SET DEFAULT nextval('public.code_submissions_id_seq'::regclass);


--
-- Name: daily_tasks task_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_tasks ALTER COLUMN task_id SET DEFAULT nextval('public.daily_tasks_task_id_seq'::regclass);


--
-- Name: district_ability_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.district_ability_stats ALTER COLUMN id SET DEFAULT nextval('public.district_ability_stats_id_seq'::regclass);


--
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- Name: import_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs ALTER COLUMN id SET DEFAULT nextval('public.import_logs_id_seq'::regclass);


--
-- Name: judge_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_queue ALTER COLUMN id SET DEFAULT nextval('public.judge_queue_id_seq'::regclass);


--
-- Name: leaderboards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboards ALTER COLUMN id SET DEFAULT nextval('public.leaderboards_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.notification_preferences_id_seq'::regclass);


--
-- Name: notification_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN id SET DEFAULT nextval('public.notification_templates_id_seq'::regclass);


--
-- Name: points_transactions transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.points_transactions_transaction_id_seq'::regclass);


--
-- Name: question_bank id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank ALTER COLUMN id SET DEFAULT nextval('public.question_bank_id_seq1'::regclass);


--
-- Name: question_bank_old_backup_20251122 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122 ALTER COLUMN id SET DEFAULT nextval('public.question_bank_id_seq'::regclass);


--
-- Name: question_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_categories ALTER COLUMN id SET DEFAULT nextval('public.question_categories_id_seq'::regclass);


--
-- Name: question_drafts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_drafts ALTER COLUMN id SET DEFAULT nextval('public.question_drafts_id_seq'::regclass);


--
-- Name: question_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reviews ALTER COLUMN id SET DEFAULT nextval('public.question_reviews_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: registration_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_audit_log ALTER COLUMN id SET DEFAULT nextval('public.registration_audit_log_id_seq'::regclass);


--
-- Name: school_ability_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_ability_stats ALTER COLUMN id SET DEFAULT nextval('public.school_ability_stats_id_seq'::regclass);


--
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: student_ability_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_ability_stats ALTER COLUMN id SET DEFAULT nextval('public.student_ability_stats_id_seq'::regclass);


--
-- Name: student_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements ALTER COLUMN id SET DEFAULT nextval('public.student_achievements_id_seq'::regclass);


--
-- Name: student_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_activities ALTER COLUMN id SET DEFAULT nextval('public.student_activities_id_seq'::regclass);


--
-- Name: student_daily_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_daily_tasks ALTER COLUMN id SET DEFAULT nextval('public.student_daily_tasks_id_seq'::regclass);


--
-- Name: student_knowledge_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_knowledge_stats ALTER COLUMN id SET DEFAULT nextval('public.student_knowledge_stats_id_seq'::regclass);


--
-- Name: student_login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_login_history ALTER COLUMN id SET DEFAULT nextval('public.student_login_history_id_seq'::regclass);


--
-- Name: student_registration_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests ALTER COLUMN id SET DEFAULT nextval('public.student_registration_requests_id_seq'::regclass);


--
-- Name: student_task_progress progress_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_task_progress ALTER COLUMN progress_id SET DEFAULT nextval('public.student_task_progress_progress_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: system_announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_announcements ALTER COLUMN id SET DEFAULT nextval('public.system_announcements_id_seq'::regclass);


--
-- Name: task_completion_history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_completion_history ALTER COLUMN history_id SET DEFAULT nextval('public.task_completion_history_history_id_seq'::regclass);


--
-- Name: teacher_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_permissions ALTER COLUMN id SET DEFAULT nextval('public.teacher_permissions_id_seq'::regclass);


--
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- Name: teaching_class_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_activities ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_activities_id_seq'::regclass);


--
-- Name: teaching_class_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_approvals ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_approvals_id_seq'::regclass);


--
-- Name: teaching_class_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_members ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_members_id_seq'::regclass);


--
-- Name: teaching_class_teachers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_teachers ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_teachers_id_seq'::regclass);


--
-- Name: teaching_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_classes ALTER COLUMN id SET DEFAULT nextval('public.teaching_classes_id_seq'::regclass);


--
-- Name: test_cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases ALTER COLUMN id SET DEFAULT nextval('public.test_cases_id_seq'::regclass);


--
-- Name: user_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications ALTER COLUMN id SET DEFAULT nextval('public.user_notifications_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: achievement_progress achievement_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_pkey PRIMARY KEY (id);


--
-- Name: achievement_progress achievement_progress_student_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_student_id_achievement_id_key UNIQUE (student_id, achievement_id);


--
-- Name: achievements achievements_achievement_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_achievement_code_key UNIQUE (achievement_code);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (achievement_id);


--
-- Name: activity_history activity_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT activity_history_pkey PRIMARY KEY (id);


--
-- Name: activity_questions activity_questions_activity_id_order_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_activity_id_order_index_key UNIQUE (activity_id, order_index);


--
-- Name: activity_questions activity_questions_activity_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_activity_id_question_id_key UNIQUE (activity_id, question_id);


--
-- Name: activity_questions activity_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: announcement_reads announcement_reads_announcement_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id);


--
-- Name: announcement_reads announcement_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_pkey PRIMARY KEY (id);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: answers answers_student_exam_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_student_exam_id_question_id_key UNIQUE (student_exam_id, question_id);


--
-- Name: assessment_locations assessment_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_pkey PRIMARY KEY (id);


--
-- Name: assessment_registrations assessment_registrations_activity_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_activity_id_student_id_key UNIQUE (activity_id, student_id);


--
-- Name: assessment_registrations assessment_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_cert_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_cert_no_key UNIQUE (cert_no);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: code_submissions code_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT code_submissions_pkey PRIMARY KEY (id);


--
-- Name: daily_tasks daily_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_tasks
    ADD CONSTRAINT daily_tasks_pkey PRIMARY KEY (task_id);


--
-- Name: daily_tasks daily_tasks_task_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_tasks
    ADD CONSTRAINT daily_tasks_task_code_key UNIQUE (task_code);


--
-- Name: district_ability_stats district_ability_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.district_ability_stats
    ADD CONSTRAINT district_ability_stats_pkey PRIMARY KEY (id);


--
-- Name: districts districts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_code_key UNIQUE (code);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: activities exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: import_logs import_logs_batch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_batch_id_key UNIQUE (batch_id);


--
-- Name: import_logs import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_pkey PRIMARY KEY (id);


--
-- Name: judge_queue judge_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_queue
    ADD CONSTRAINT judge_queue_pkey PRIMARY KEY (id);


--
-- Name: judge_queue judge_queue_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_queue
    ADD CONSTRAINT judge_queue_submission_id_key UNIQUE (submission_id);


--
-- Name: leaderboards leaderboards_leaderboard_type_scope_student_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboards
    ADD CONSTRAINT leaderboards_leaderboard_type_scope_student_id_period_start_key UNIQUE (leaderboard_type, scope, student_id, period_start);


--
-- Name: leaderboards leaderboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboards
    ADD CONSTRAINT leaderboards_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notification_templates notification_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_code_key UNIQUE (code);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: points_transactions points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: question_bank_old_backup_20251122 question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey1 PRIMARY KEY (id);


--
-- Name: question_bank_old_backup_20251122 question_bank_question_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_question_code_key UNIQUE (question_code);


--
-- Name: question_bank question_bank_question_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_question_code_key1 UNIQUE (question_code);


--
-- Name: question_categories question_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_pkey PRIMARY KEY (id);


--
-- Name: question_drafts question_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_drafts
    ADD CONSTRAINT question_drafts_pkey PRIMARY KEY (id);


--
-- Name: question_reviews question_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: registration_audit_log registration_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_audit_log
    ADD CONSTRAINT registration_audit_log_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: school_ability_stats school_ability_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_ability_stats
    ADD CONSTRAINT school_ability_stats_pkey PRIMARY KEY (id);


--
-- Name: schools schools_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_code_key UNIQUE (code);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: student_ability_stats student_ability_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_ability_stats
    ADD CONSTRAINT student_ability_stats_pkey PRIMARY KEY (id);


--
-- Name: student_achievements student_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_pkey PRIMARY KEY (id);


--
-- Name: student_achievements student_achievements_student_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_student_id_achievement_id_key UNIQUE (student_id, achievement_id);


--
-- Name: student_daily_tasks student_daily_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_pkey PRIMARY KEY (id);


--
-- Name: student_daily_tasks student_daily_tasks_student_id_task_id_task_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_student_id_task_id_task_date_key UNIQUE (student_id, task_id, task_date);


--
-- Name: student_activities student_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_exams_pkey PRIMARY KEY (id);


--
-- Name: student_activities student_exams_student_id_exam_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_exams_student_id_exam_id_key UNIQUE (student_id, activity_id);


--
-- Name: student_knowledge_stats student_knowledge_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_knowledge_stats
    ADD CONSTRAINT student_knowledge_stats_pkey PRIMARY KEY (id);


--
-- Name: student_login_history student_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT student_login_history_pkey PRIMARY KEY (id);


--
-- Name: student_points student_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_points
    ADD CONSTRAINT student_points_pkey PRIMARY KEY (student_id);


--
-- Name: student_registration_requests student_registration_requests_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_phone_key UNIQUE (phone);


--
-- Name: student_registration_requests student_registration_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_pkey PRIMARY KEY (id);


--
-- Name: student_task_progress student_task_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_pkey PRIMARY KEY (progress_id);


--
-- Name: student_task_progress student_task_progress_student_id_task_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_student_id_task_id_period_start_key UNIQUE (student_id, task_id, period_start);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_student_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_no_key UNIQUE (student_no);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_subject_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_subject_code_key UNIQUE (subject_code);


--
-- Name: subjects subjects_subject_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_subject_name_key UNIQUE (subject_name);


--
-- Name: system_announcements system_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_pkey PRIMARY KEY (id);


--
-- Name: task_completion_history task_completion_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_completion_history
    ADD CONSTRAINT task_completion_history_pkey PRIMARY KEY (history_id);


--
-- Name: teacher_permissions teacher_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_pkey PRIMARY KEY (id);


--
-- Name: teacher_permissions teacher_permissions_unique_grant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_unique_grant UNIQUE (user_id, permission_type, scope_level, district_id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_teacher_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_teacher_no_key UNIQUE (teacher_no);


--
-- Name: teaching_class_activities teaching_class_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_approvals teaching_class_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_approvals
    ADD CONSTRAINT teaching_class_approvals_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_members teaching_class_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT teaching_class_members_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_teachers teaching_class_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT teaching_class_teachers_pkey PRIMARY KEY (id);


--
-- Name: teaching_classes teaching_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_pkey PRIMARY KEY (id);


--
-- Name: test_cases test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_activities unique_class_activity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT unique_class_activity UNIQUE (teaching_class_id, activity_id);


--
-- Name: teaching_class_members unique_class_student; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT unique_class_student UNIQUE (teaching_class_id, student_id);


--
-- Name: teaching_class_teachers unique_class_teacher; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT unique_class_teacher UNIQUE (teaching_class_id, teacher_id);


--
-- Name: district_ability_stats unique_district_ability_period; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.district_ability_stats
    ADD CONSTRAINT unique_district_ability_period UNIQUE (district_id, ability, subject, period_start, period_end);


--
-- Name: question_bank unique_draft_scope; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT unique_draft_scope UNIQUE (draft_id, scope);


--
-- Name: test_cases unique_question_case; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT unique_question_case UNIQUE (question_id, case_number);


--
-- Name: school_ability_stats unique_school_ability_period; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_ability_stats
    ADD CONSTRAINT unique_school_ability_period UNIQUE (school_id, ability, subject, period_start, period_end);


--
-- Name: student_ability_stats unique_student_ability; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_ability_stats
    ADD CONSTRAINT unique_student_ability UNIQUE (student_id, ability, subject);


--
-- Name: student_knowledge_stats unique_student_knowledge; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_knowledge_stats
    ADD CONSTRAINT unique_student_knowledge UNIQUE (student_id, knowledge_point, subject);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_achievement_progress_achievement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_achievement ON public.achievement_progress USING btree (achievement_id);


--
-- Name: idx_achievement_progress_percentage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_percentage ON public.achievement_progress USING btree (progress_percentage);


--
-- Name: idx_achievement_progress_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_student ON public.achievement_progress USING btree (student_id);


--
-- Name: idx_achievements_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_active ON public.achievements USING btree (is_active);


--
-- Name: idx_achievements_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_category ON public.achievements USING btree (category);


--
-- Name: idx_achievements_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_display_order ON public.achievements USING btree (display_order);


--
-- Name: idx_achievements_rarity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_rarity ON public.achievements USING btree (rarity);


--
-- Name: idx_activities_ability_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_ability_level ON public.activities USING btree (ability_level);


--
-- Name: idx_activities_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_created_by ON public.activities USING btree (created_by);


--
-- Name: idx_activities_is_official; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_is_official ON public.activities USING btree (is_official);


--
-- Name: idx_activities_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_scope ON public.activities USING btree (scope);


--
-- Name: idx_activities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_status ON public.activities USING btree (status);


--
-- Name: idx_activities_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_subject ON public.activities USING btree (subject);


--
-- Name: idx_activities_subject_ability_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_subject_ability_level ON public.activities USING btree (subject, ability_level);


--
-- Name: idx_activities_time_limit_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_time_limit_type ON public.activities USING btree (time_limit_type);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_type ON public.activities USING btree (type);


--
-- Name: idx_activities_type_ability_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_type_ability_level ON public.activities USING btree (type, ability_level);


--
-- Name: idx_activities_type_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_type_subject ON public.activities USING btree (type, subject);


--
-- Name: idx_activity_history_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_history_activity_id ON public.activity_history USING btree (activity_id);


--
-- Name: idx_activity_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_history_created_at ON public.activity_history USING btree (created_at DESC);


--
-- Name: idx_activity_questions_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_questions_activity_id ON public.activity_questions USING btree (activity_id);


--
-- Name: idx_activity_questions_activity_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_questions_activity_order ON public.activity_questions USING btree (activity_id, order_index);


--
-- Name: idx_activity_questions_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_questions_question_id ON public.activity_questions USING btree (question_id);


--
-- Name: idx_admin_permissions_district_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_permissions_district_id ON public.admin_permissions USING btree (district_id);


--
-- Name: idx_admin_permissions_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_permissions_school_id ON public.admin_permissions USING btree (school_id);


--
-- Name: idx_admin_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_permissions_user_id ON public.admin_permissions USING btree (user_id);


--
-- Name: idx_announcement_reads_announcement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcement_reads_announcement ON public.announcement_reads USING btree (announcement_id);


--
-- Name: idx_announcement_reads_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcement_reads_user ON public.announcement_reads USING btree (user_id);


--
-- Name: idx_answers_graded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_graded_by ON public.answers USING btree (graded_by, graded_at) WHERE (graded_by IS NOT NULL);


--
-- Name: idx_answers_grading_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_grading_status ON public.answers USING btree (grading_status, student_exam_id) WHERE ((grading_status)::text = 'pending'::text);


--
-- Name: idx_answers_student_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_student_exam_id ON public.answers USING btree (student_exam_id);


--
-- Name: idx_assessment_locations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_locations_active ON public.assessment_locations USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_assessment_locations_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_locations_activity ON public.assessment_locations USING btree (activity_id);


--
-- Name: idx_assessment_locations_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_locations_district ON public.assessment_locations USING btree (district_id);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_action ON public.registration_audit_log USING btree (action);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.registration_audit_log USING btree (created_at);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_request ON public.registration_audit_log USING btree (request_id);


--
-- Name: idx_daily_tasks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_tasks_active ON public.daily_tasks USING btree (is_active);


--
-- Name: idx_daily_tasks_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_tasks_category ON public.daily_tasks USING btree (category);


--
-- Name: idx_daily_tasks_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_tasks_is_active ON public.daily_tasks USING btree (is_active);


--
-- Name: idx_daily_tasks_task_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_tasks_task_type ON public.daily_tasks USING btree (task_type);


--
-- Name: idx_daily_tasks_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_tasks_type ON public.daily_tasks USING btree (task_type);


--
-- Name: idx_daily_tasks_valid_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_tasks_valid_dates ON public.daily_tasks USING btree (valid_from, valid_to);


--
-- Name: idx_district_ability_stats_ability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_district_ability_stats_ability ON public.district_ability_stats USING btree (ability);


--
-- Name: idx_district_ability_stats_accuracy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_district_ability_stats_accuracy ON public.district_ability_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_district_ability_stats_district_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_district_ability_stats_district_id ON public.district_ability_stats USING btree (district_id);


--
-- Name: idx_district_ability_stats_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_district_ability_stats_period ON public.district_ability_stats USING btree (period_start, period_end);


--
-- Name: idx_district_ability_stats_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_district_ability_stats_subject ON public.district_ability_stats USING btree (subject);


--
-- Name: idx_districts_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_districts_code ON public.districts USING btree (code);


--
-- Name: idx_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_status ON public.activities USING btree (status);


--
-- Name: idx_exams_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_subject ON public.activities USING btree (subject);


--
-- Name: idx_judge_queue_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_judge_queue_priority ON public.judge_queue USING btree (priority DESC, created_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_judge_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_judge_queue_status ON public.judge_queue USING btree (status);


--
-- Name: idx_judge_queue_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_judge_queue_worker ON public.judge_queue USING btree (worker_id) WHERE (worker_id IS NOT NULL);


--
-- Name: idx_leaderboard_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_period ON public.leaderboards USING btree (period_start, period_end);


--
-- Name: idx_leaderboard_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_rank ON public.leaderboards USING btree (leaderboard_type, scope, rank);


--
-- Name: idx_leaderboard_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_student ON public.leaderboards USING btree (student_id);


--
-- Name: idx_leaderboard_type_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_type_scope ON public.leaderboards USING btree (leaderboard_type, scope);


--
-- Name: idx_points_transactions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_transactions_expires ON public.points_transactions USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_points_transactions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_transactions_source ON public.points_transactions USING btree (source_type, source_id);


--
-- Name: idx_points_transactions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_transactions_student ON public.points_transactions USING btree (student_id);


--
-- Name: idx_points_transactions_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_transactions_time ON public.points_transactions USING btree (created_at DESC);


--
-- Name: idx_points_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_transactions_type ON public.points_transactions USING btree (transaction_type);


--
-- Name: idx_question_bank_abilities; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_abilities ON public.question_bank_old_backup_20251122 USING gin (abilities);


--
-- Name: idx_question_bank_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_active ON public.question_bank_old_backup_20251122 USING btree (is_active);


--
-- Name: idx_question_bank_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_category ON public.question_bank_old_backup_20251122 USING btree (category_id);


--
-- Name: idx_question_bank_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_code ON public.question_bank_old_backup_20251122 USING btree (question_code);


--
-- Name: idx_question_bank_difficulty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_difficulty ON public.question_bank_old_backup_20251122 USING btree (difficulty);


--
-- Name: idx_question_bank_district_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_district_id ON public.question_bank USING btree (district_id);


--
-- Name: idx_question_bank_draft_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_draft_id ON public.question_bank USING btree (draft_id);


--
-- Name: idx_question_bank_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_grade ON public.question_bank_old_backup_20251122 USING btree (grade);


--
-- Name: idx_question_bank_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_is_active ON public.question_bank USING btree (is_active);


--
-- Name: idx_question_bank_knowledge_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_knowledge_points ON public.question_bank_old_backup_20251122 USING gin (knowledge_points);


--
-- Name: idx_question_bank_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_level ON public.question_bank_old_backup_20251122 USING btree (level);


--
-- Name: idx_question_bank_published_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_published_by ON public.question_bank USING btree (published_by);


--
-- Name: idx_question_bank_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_reviewer_id ON public.question_bank_old_backup_20251122 USING btree (reviewer_id);


--
-- Name: idx_question_bank_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_school_id ON public.question_bank USING btree (school_id);


--
-- Name: idx_question_bank_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_scope ON public.question_bank_old_backup_20251122 USING gin (scope);


--
-- Name: idx_question_bank_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_status ON public.question_bank_old_backup_20251122 USING btree (status);


--
-- Name: idx_question_bank_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_subject ON public.question_bank_old_backup_20251122 USING btree (subject);


--
-- Name: idx_question_bank_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_tags ON public.question_bank_old_backup_20251122 USING gin (tags);


--
-- Name: idx_question_bank_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_type ON public.question_bank_old_backup_20251122 USING btree (type);


--
-- Name: idx_question_drafts_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_drafts_created_by ON public.question_drafts USING btree (created_by);


--
-- Name: idx_question_drafts_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_drafts_grade ON public.question_drafts USING btree (grade);


--
-- Name: idx_question_drafts_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_drafts_is_active ON public.question_drafts USING btree (is_active);


--
-- Name: idx_question_drafts_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_drafts_level ON public.question_drafts USING btree (level);


--
-- Name: idx_question_drafts_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_drafts_subject ON public.question_drafts USING btree (subject);


--
-- Name: idx_question_reviews_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_reviews_question_id ON public.question_reviews USING btree (question_id);


--
-- Name: idx_question_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_reviews_reviewer_id ON public.question_reviews USING btree (reviewer_id);


--
-- Name: idx_questions_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_exam_id ON public.questions USING btree (exam_id);


--
-- Name: idx_registration_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registration_district ON public.student_registration_requests USING btree (district_code);


--
-- Name: idx_registration_escalation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registration_escalation ON public.student_registration_requests USING btree (last_escalated_at, status);


--
-- Name: idx_registration_inquiry_code_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_registration_inquiry_code_hash ON public.student_registration_requests USING btree (inquiry_code_hash) WHERE (inquiry_code_hash IS NOT NULL);


--
-- Name: idx_registration_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registration_phone ON public.student_registration_requests USING btree (phone);


--
-- Name: idx_registration_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registration_reviewer ON public.student_registration_requests USING btree (current_reviewer_id);


--
-- Name: idx_registration_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registration_school ON public.student_registration_requests USING btree (school_code);


--
-- Name: idx_registration_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registration_status ON public.student_registration_requests USING btree (status);


--
-- Name: idx_registrations_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_activity ON public.assessment_registrations USING btree (activity_id);


--
-- Name: idx_registrations_activity_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_activity_status ON public.assessment_registrations USING btree (activity_id, status);


--
-- Name: idx_registrations_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_location ON public.assessment_registrations USING btree (location_id);


--
-- Name: idx_registrations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_status ON public.assessment_registrations USING btree (status);


--
-- Name: idx_registrations_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_student ON public.assessment_registrations USING btree (student_id);


--
-- Name: idx_school_ability_stats_ability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_school_ability_stats_ability ON public.school_ability_stats USING btree (ability);


--
-- Name: idx_school_ability_stats_accuracy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_school_ability_stats_accuracy ON public.school_ability_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_school_ability_stats_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_school_ability_stats_period ON public.school_ability_stats USING btree (period_start, period_end);


--
-- Name: idx_school_ability_stats_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_school_ability_stats_school_id ON public.school_ability_stats USING btree (school_id);


--
-- Name: idx_school_ability_stats_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_school_ability_stats_subject ON public.school_ability_stats USING btree (subject);


--
-- Name: idx_schools_district_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_district_id ON public.schools USING btree (district_id);


--
-- Name: idx_schools_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_type ON public.schools USING btree (type);


--
-- Name: idx_student_ability_stats_ability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_ability_stats_ability ON public.student_ability_stats USING btree (ability);


--
-- Name: idx_student_ability_stats_accuracy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_ability_stats_accuracy ON public.student_ability_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_student_ability_stats_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_ability_stats_student_id ON public.student_ability_stats USING btree (student_id);


--
-- Name: idx_student_ability_stats_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_ability_stats_subject ON public.student_ability_stats USING btree (subject);


--
-- Name: idx_student_achievements_achievement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_achievement ON public.student_achievements USING btree (achievement_id);


--
-- Name: idx_student_achievements_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_composite ON public.student_achievements USING btree (student_id, achievement_id);


--
-- Name: idx_student_achievements_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_student ON public.student_achievements USING btree (student_id);


--
-- Name: idx_student_achievements_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_time ON public.student_achievements USING btree (achieved_at DESC);


--
-- Name: idx_student_activities_auto_submit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_activities_auto_submit ON public.student_activities USING btree (status, time_limit_deadline) WHERE (((status)::text = 'in_progress'::text) AND (time_limit_deadline IS NOT NULL));


--
-- Name: idx_student_activities_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_activities_deadline ON public.student_activities USING btree (time_limit_deadline) WHERE ((status)::text = 'in_progress'::text);


--
-- Name: idx_student_activities_grading_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_activities_grading_status ON public.student_activities USING btree (grading_status, activity_id) WHERE ((grading_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('partial_graded'::character varying)::text]));


--
-- Name: idx_student_daily_tasks_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_daily_tasks_completed ON public.student_daily_tasks USING btree (is_completed);


--
-- Name: idx_student_daily_tasks_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_daily_tasks_student_date ON public.student_daily_tasks USING btree (student_id, task_date);


--
-- Name: idx_student_daily_tasks_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_daily_tasks_task ON public.student_daily_tasks USING btree (task_id);


--
-- Name: idx_student_exams_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_exams_exam_id ON public.student_activities USING btree (activity_id);


--
-- Name: idx_student_exams_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_exams_student_id ON public.student_activities USING btree (student_id);


--
-- Name: idx_student_knowledge_stats_accuracy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_knowledge_stats_accuracy ON public.student_knowledge_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_student_knowledge_stats_knowledge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_knowledge_stats_knowledge ON public.student_knowledge_stats USING btree (knowledge_point);


--
-- Name: idx_student_knowledge_stats_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_knowledge_stats_student_id ON public.student_knowledge_stats USING btree (student_id);


--
-- Name: idx_student_knowledge_stats_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_knowledge_stats_subject ON public.student_knowledge_stats USING btree (subject);


--
-- Name: idx_student_login_history_login_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_login_history_login_date ON public.student_login_history USING btree (login_date);


--
-- Name: idx_student_login_history_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_login_history_student_date ON public.student_login_history USING btree (student_id, login_date DESC);


--
-- Name: idx_student_login_history_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_login_history_student_id ON public.student_login_history USING btree (student_id);


--
-- Name: idx_student_login_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_login_history_user_id ON public.student_login_history USING btree (user_id);


--
-- Name: idx_student_login_unique_daily; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_student_login_unique_daily ON public.student_login_history USING btree (student_id, login_date);


--
-- Name: idx_student_points_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_points_current ON public.student_points USING btree (current_points DESC);


--
-- Name: idx_student_points_total; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_points_total ON public.student_points USING btree (total_points DESC);


--
-- Name: idx_student_task_progress_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_task_progress_completed ON public.student_task_progress USING btree (is_completed);


--
-- Name: idx_student_task_progress_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_task_progress_period ON public.student_task_progress USING btree (period_start, period_end);


--
-- Name: idx_student_task_progress_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_task_progress_student ON public.student_task_progress USING btree (student_id);


--
-- Name: idx_student_task_progress_student_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_task_progress_student_period ON public.student_task_progress USING btree (student_id, period_start);


--
-- Name: idx_student_task_progress_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_task_progress_task ON public.student_task_progress USING btree (task_id);


--
-- Name: idx_students_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_school_id ON public.students USING btree (school_id);


--
-- Name: idx_students_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_user_id ON public.students USING btree (user_id);


--
-- Name: idx_subjects_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_active ON public.subjects USING btree (is_active);


--
-- Name: idx_subjects_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_code ON public.subjects USING btree (subject_code);


--
-- Name: idx_subjects_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_name ON public.subjects USING btree (subject_name);


--
-- Name: idx_subjects_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_order ON public.subjects USING btree (display_order);


--
-- Name: idx_submissions_judged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_judged ON public.code_submissions USING btree (judged_at DESC) WHERE (judged_at IS NOT NULL);


--
-- Name: idx_submissions_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_question ON public.code_submissions USING btree (question_id);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_status ON public.code_submissions USING btree (status);


--
-- Name: idx_submissions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_student ON public.code_submissions USING btree (student_id);


--
-- Name: idx_submissions_student_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_student_activity ON public.code_submissions USING btree (student_activity_id);


--
-- Name: idx_submissions_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_time ON public.code_submissions USING btree (submitted_at DESC);


--
-- Name: idx_system_announcements_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_announcements_pinned ON public.system_announcements USING btree (is_pinned, published_at DESC) WHERE ((status)::text = 'published'::text);


--
-- Name: idx_system_announcements_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_announcements_published ON public.system_announcements USING btree (published_at DESC) WHERE ((status)::text = 'published'::text);


--
-- Name: idx_system_announcements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_announcements_status ON public.system_announcements USING btree (status);


--
-- Name: idx_system_announcements_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_announcements_target ON public.system_announcements USING btree (target_audience);


--
-- Name: idx_task_history_completion_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_history_completion_time ON public.task_completion_history USING btree (completion_time);


--
-- Name: idx_task_history_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_history_student ON public.task_completion_history USING btree (student_id);


--
-- Name: idx_task_history_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_history_task ON public.task_completion_history USING btree (task_id);


--
-- Name: idx_tca_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tca_class ON public.teaching_class_approvals USING btree (teaching_class_id);


--
-- Name: idx_tca_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tca_created_at ON public.teaching_class_approvals USING btree (created_at);


--
-- Name: idx_tca_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tca_reviewer ON public.teaching_class_approvals USING btree (reviewer_id);


--
-- Name: idx_tcact_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcact_activity ON public.teaching_class_activities USING btree (activity_id);


--
-- Name: idx_tcact_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcact_class ON public.teaching_class_activities USING btree (teaching_class_id);


--
-- Name: idx_tcm_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcm_active ON public.teaching_class_members USING btree (is_active);


--
-- Name: idx_tcm_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcm_class ON public.teaching_class_members USING btree (teaching_class_id);


--
-- Name: idx_tcm_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcm_student ON public.teaching_class_members USING btree (student_id);


--
-- Name: idx_tct_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tct_class ON public.teaching_class_teachers USING btree (teaching_class_id);


--
-- Name: idx_tct_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tct_teacher ON public.teaching_class_teachers USING btree (teacher_id);


--
-- Name: idx_teacher_permissions_district_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_permissions_district_id ON public.teacher_permissions USING btree (district_id);


--
-- Name: idx_teacher_permissions_permission_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_permissions_permission_type ON public.teacher_permissions USING btree (permission_type);


--
-- Name: idx_teacher_permissions_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_permissions_school_id ON public.teacher_permissions USING btree (school_id);


--
-- Name: idx_teacher_permissions_scope_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_permissions_scope_level ON public.teacher_permissions USING btree (scope_level);


--
-- Name: idx_teacher_permissions_subjects; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_permissions_subjects ON public.teacher_permissions USING gin (subjects);


--
-- Name: idx_teacher_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_permissions_user_id ON public.teacher_permissions USING btree (user_id);


--
-- Name: idx_teachers_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teachers_school_id ON public.teachers USING btree (school_id);


--
-- Name: idx_teachers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teachers_user_id ON public.teachers USING btree (user_id);


--
-- Name: idx_teaching_classes_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_classes_academic_year ON public.teaching_classes USING btree (academic_year);


--
-- Name: idx_teaching_classes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_classes_created_by ON public.teaching_classes USING btree (created_by);


--
-- Name: idx_teaching_classes_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_classes_district ON public.teaching_classes USING btree (district_id);


--
-- Name: idx_teaching_classes_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_classes_school ON public.teaching_classes USING btree (school_id);


--
-- Name: idx_teaching_classes_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_classes_scope ON public.teaching_classes USING btree (scope);


--
-- Name: idx_teaching_classes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teaching_classes_status ON public.teaching_classes USING btree (status);


--
-- Name: idx_test_cases_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_question ON public.test_cases USING btree (question_id);


--
-- Name: idx_test_cases_sample; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_sample ON public.test_cases USING btree (question_id, is_sample);


--
-- Name: idx_user_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_created_at ON public.user_notifications USING btree (created_at DESC);


--
-- Name: idx_user_notifications_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_expires ON public.user_notifications USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_user_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_type ON public.user_notifications USING btree (type);


--
-- Name: idx_user_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications USING btree (user_id);


--
-- Name: idx_user_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_unread ON public.user_notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: question_bank before_insert_update_question_bank; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER before_insert_update_question_bank BEFORE INSERT OR UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.extract_scope_ids();


--
-- Name: assessment_locations trigger_assessment_location_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_assessment_location_updated_at BEFORE UPDATE ON public.assessment_locations FOR EACH ROW EXECUTE FUNCTION public.update_assessment_location_updated_at();


--
-- Name: code_submissions trigger_auto_enqueue_submission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_enqueue_submission AFTER INSERT ON public.code_submissions FOR EACH ROW EXECUTE FUNCTION public.auto_enqueue_submission();


--
-- Name: question_bank_old_backup_20251122 trigger_auto_generate_question_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_generate_question_code BEFORE INSERT ON public.question_bank_old_backup_20251122 FOR EACH ROW EXECUTE FUNCTION public.auto_generate_question_code();


--
-- Name: code_submissions trigger_calculate_code_length; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_code_length BEFORE INSERT OR UPDATE OF source_code ON public.code_submissions FOR EACH ROW EXECUTE FUNCTION public.calculate_code_length();


--
-- Name: student_task_progress trigger_calculate_task_completion_rate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_task_completion_rate BEFORE INSERT OR UPDATE ON public.student_task_progress FOR EACH ROW EXECUTE FUNCTION public.calculate_task_completion_rate();


--
-- Name: notification_preferences trigger_notification_preferences_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notification_preferences_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: notification_templates trigger_notification_templates_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notification_templates_updated BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: assessment_registrations trigger_registration_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_registration_updated_at BEFORE UPDATE ON public.assessment_registrations FOR EACH ROW EXECUTE FUNCTION public.update_registration_updated_at();


--
-- Name: system_announcements trigger_system_announcements_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_system_announcements_updated BEFORE UPDATE ON public.system_announcements FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: teaching_classes trigger_teaching_class_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_teaching_class_updated_at BEFORE UPDATE ON public.teaching_classes FOR EACH ROW EXECUTE FUNCTION public.update_teaching_class_updated_at();


--
-- Name: activity_questions trigger_update_activity_stats_on_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_activity_stats_on_delete AFTER DELETE ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_activity_paper_stats();


--
-- Name: activity_questions trigger_update_activity_stats_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_activity_stats_on_insert AFTER INSERT ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_activity_paper_stats();


--
-- Name: activity_questions trigger_update_activity_stats_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_activity_stats_on_update AFTER UPDATE OF score ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_activity_paper_stats();


--
-- Name: daily_tasks trigger_update_daily_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_daily_tasks_updated_at BEFORE UPDATE ON public.daily_tasks FOR EACH ROW EXECUTE FUNCTION public.update_daily_tasks_updated_at();


--
-- Name: answers trigger_update_grading_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_grading_status AFTER INSERT OR UPDATE OF grading_status, score ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_student_activity_grading_status();


--
-- Name: assessment_registrations trigger_update_location_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_location_count AFTER INSERT OR DELETE OR UPDATE ON public.assessment_registrations FOR EACH ROW EXECUTE FUNCTION public.update_location_registered_count();


--
-- Name: student_registration_requests trigger_update_registration_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_registration_updated_at BEFORE UPDATE ON public.student_registration_requests FOR EACH ROW EXECUTE FUNCTION public.update_registration_updated_at();


--
-- Name: answers trigger_update_student_ability_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_student_ability_stats AFTER INSERT OR UPDATE OF score, is_correct ON public.answers FOR EACH ROW WHEN (((new.score IS NOT NULL) AND (new.is_correct IS NOT NULL))) EXECUTE FUNCTION public.update_student_ability_stats();


--
-- Name: answers trigger_update_student_knowledge_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_student_knowledge_stats AFTER INSERT OR UPDATE OF score, is_correct ON public.answers FOR EACH ROW WHEN (((new.score IS NOT NULL) AND (new.is_correct IS NOT NULL))) EXECUTE FUNCTION public.update_student_knowledge_stats();


--
-- Name: student_task_progress trigger_update_student_task_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_student_task_progress_updated_at BEFORE UPDATE ON public.student_task_progress FOR EACH ROW EXECUTE FUNCTION public.update_student_task_progress_updated_at();


--
-- Name: activities trigger_validate_activity_time_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_activity_time_limit BEFORE INSERT OR UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.validate_activity_time_limit();


--
-- Name: teacher_permissions trigger_validate_teacher_permission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_teacher_permission BEFORE INSERT OR UPDATE ON public.teacher_permissions FOR EACH ROW EXECUTE FUNCTION public.validate_teacher_permission();


--
-- Name: achievements update_achievements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_questions update_activity_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_activity_questions_updated_at BEFORE UPDATE ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: answers update_answers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_tasks update_daily_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_tasks_updated_at BEFORE UPDATE ON public.daily_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities update_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_points update_points_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_points_timestamp BEFORE UPDATE ON public.student_points FOR EACH ROW EXECUTE FUNCTION public.update_student_points_timestamp();


--
-- Name: achievement_progress update_progress_percentage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_progress_percentage BEFORE INSERT OR UPDATE ON public.achievement_progress FOR EACH ROW EXECUTE FUNCTION public.update_achievement_progress_percentage();


--
-- Name: subjects update_subjects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teacher_permissions update_teacher_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teacher_permissions_updated_at BEFORE UPDATE ON public.teacher_permissions FOR EACH ROW EXECUTE FUNCTION public.update_teacher_permissions_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: achievement_progress achievement_progress_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(achievement_id) ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: achievements achievements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: activity_history activity_history_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT activity_history_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_history activity_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT activity_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: activity_questions activity_questions_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_questions activity_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: admin_permissions admin_permissions_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: admin_permissions admin_permissions_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: admin_permissions admin_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: announcement_reads announcement_reads_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.system_announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_reads announcement_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: answers answers_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: answers answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: answers answers_student_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_student_exam_id_fkey FOREIGN KEY (student_exam_id) REFERENCES public.student_activities(id) ON DELETE CASCADE;


--
-- Name: assessment_locations assessment_locations_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: assessment_locations assessment_locations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: assessment_locations assessment_locations_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: assessment_registrations assessment_registrations_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: assessment_registrations assessment_registrations_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: assessment_registrations assessment_registrations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.assessment_locations(id) ON DELETE SET NULL;


--
-- Name: assessment_registrations assessment_registrations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: assessment_registrations assessment_registrations_student_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_student_activity_id_fkey FOREIGN KEY (student_activity_id) REFERENCES public.student_activities(id) ON DELETE SET NULL;


--
-- Name: assessment_registrations assessment_registrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: certificates certificates_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.activities(id);


--
-- Name: certificates certificates_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: district_ability_stats district_ability_stats_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.district_ability_stats
    ADD CONSTRAINT district_ability_stats_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: activities exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: judge_queue fk_judge_queue_submission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.judge_queue
    ADD CONSTRAINT fk_judge_queue_submission FOREIGN KEY (submission_id) REFERENCES public.code_submissions(id) ON DELETE CASCADE;


--
-- Name: student_login_history fk_student_login_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT fk_student_login_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_login_history fk_student_login_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT fk_student_login_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: code_submissions fk_submission_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT fk_submission_question FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: code_submissions fk_submission_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT fk_submission_student FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: code_submissions fk_submission_student_activity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT fk_submission_student_activity FOREIGN KEY (student_activity_id) REFERENCES public.student_activities(id) ON DELETE CASCADE;


--
-- Name: test_cases fk_test_cases_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT fk_test_cases_question FOREIGN KEY (question_id) REFERENCES public.question_drafts(id) ON DELETE CASCADE;


--
-- Name: import_logs import_logs_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.users(id);


--
-- Name: leaderboards leaderboards_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboards
    ADD CONSTRAINT leaderboards_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: points_transactions points_transactions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: question_bank_old_backup_20251122 question_bank_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.question_categories(id);


--
-- Name: question_bank_old_backup_20251122 question_bank_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: question_bank question_bank_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.question_drafts(id) ON DELETE CASCADE;


--
-- Name: question_bank_old_backup_20251122 question_bank_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_published_by_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_published_by_fkey1 FOREIGN KEY (published_by) REFERENCES public.users(id);


--
-- Name: question_bank_old_backup_20251122 question_bank_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_reviewer_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_reviewer_id_fkey1 FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: question_categories question_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.question_categories(id);


--
-- Name: question_drafts question_drafts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_drafts
    ADD CONSTRAINT question_drafts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: question_reviews question_reviews_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank_old_backup_20251122(id) ON DELETE CASCADE;


--
-- Name: question_reviews question_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: registration_audit_log registration_audit_log_action_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_audit_log
    ADD CONSTRAINT registration_audit_log_action_by_fkey FOREIGN KEY (action_by) REFERENCES public.users(id);


--
-- Name: registration_audit_log registration_audit_log_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_audit_log
    ADD CONSTRAINT registration_audit_log_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.student_registration_requests(id) ON DELETE CASCADE;


--
-- Name: school_ability_stats school_ability_stats_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_ability_stats
    ADD CONSTRAINT school_ability_stats_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: schools schools_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: student_ability_stats student_ability_stats_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_ability_stats
    ADD CONSTRAINT student_ability_stats_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_achievements student_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(achievement_id) ON DELETE CASCADE;


--
-- Name: student_achievements student_achievements_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_activities student_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: student_activities student_activities_previous_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_activities_previous_attempt_id_fkey FOREIGN KEY (previous_attempt_id) REFERENCES public.student_activities(id);


--
-- Name: student_activities student_activities_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_activities_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_daily_tasks student_daily_tasks_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_daily_tasks student_daily_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(task_id) ON DELETE CASCADE;


--
-- Name: student_knowledge_stats student_knowledge_stats_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_knowledge_stats
    ADD CONSTRAINT student_knowledge_stats_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_points student_points_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_points
    ADD CONSTRAINT student_points_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_registration_requests student_registration_requests_current_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_current_reviewer_id_fkey FOREIGN KEY (current_reviewer_id) REFERENCES public.users(id);


--
-- Name: student_registration_requests student_registration_requests_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: student_registration_requests student_registration_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: student_registration_requests student_registration_requests_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: student_registration_requests student_registration_requests_student_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.users(id);


--
-- Name: student_task_progress student_task_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_task_progress student_task_progress_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(task_id) ON DELETE CASCADE;


--
-- Name: students students_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_announcements system_announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: system_announcements system_announcements_target_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_target_district_id_fkey FOREIGN KEY (target_district_id) REFERENCES public.districts(id);


--
-- Name: system_announcements system_announcements_target_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_target_school_id_fkey FOREIGN KEY (target_school_id) REFERENCES public.schools(id);


--
-- Name: task_completion_history task_completion_history_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_completion_history
    ADD CONSTRAINT task_completion_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: task_completion_history task_completion_history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_completion_history
    ADD CONSTRAINT task_completion_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(task_id) ON DELETE CASCADE;


--
-- Name: teacher_permissions teacher_permissions_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: teacher_permissions teacher_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: teacher_permissions teacher_permissions_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: teacher_permissions teacher_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teachers teachers_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teaching_class_activities teaching_class_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: teaching_class_activities teaching_class_activities_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: teaching_class_activities teaching_class_activities_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_class_approvals teaching_class_approvals_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_approvals
    ADD CONSTRAINT teaching_class_approvals_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: teaching_class_approvals teaching_class_approvals_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_approvals
    ADD CONSTRAINT teaching_class_approvals_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_class_members teaching_class_members_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT teaching_class_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: teaching_class_members teaching_class_members_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT teaching_class_members_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_class_teachers teaching_class_teachers_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT teaching_class_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: teaching_class_teachers teaching_class_teachers_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT teaching_class_teachers_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_classes teaching_classes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: teaching_classes teaching_classes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: teaching_classes teaching_classes_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: teaching_classes teaching_classes_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict HK0EMHpmNsaXRi0j9nGSI4uhc9TB7bJE68V9sPo4JCc6HJ1Z0eV5tgkR7tnC1h7

