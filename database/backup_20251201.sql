--
-- PostgreSQL database dump
--

\restrict 54ajBbRIB2UVGzMEtlavjeoDimD8dRpQXiqMeogUXULT9NbTZNW29V7pOhNOJcZ

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

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
-- Name: auto_generate_question_code(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.auto_generate_question_code() OWNER TO postgres;

--
-- Name: calculate_task_completion_rate(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.calculate_task_completion_rate() OWNER TO postgres;

--
-- Name: check_practice_publish_permission(integer, character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.check_practice_publish_permission(p_user_id integer, p_scope character varying, p_district_id integer, p_school_id integer) OWNER TO postgres;

--
-- Name: FUNCTION check_practice_publish_permission(p_user_id integer, p_scope character varying, p_district_id integer, p_school_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_practice_publish_permission(p_user_id integer, p_scope character varying, p_district_id integer, p_school_id integer) IS '检查用户是否有指定范围的练习发布权限。
参数:
  p_user_id: 用户ID
  p_scope: 范围 (class, school, district, base_school, municipal_school, municipal)
  p_district_id: 区域ID (可选)
  p_school_id: 学校ID (可选)
返回: BOOLEAN';


--
-- Name: extract_scope_ids(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.extract_scope_ids() OWNER TO postgres;

--
-- Name: generate_question_code(character varying, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.generate_question_code(p_subject character varying, p_created_at timestamp without time zone) OWNER TO postgres;

--
-- Name: get_activity_paper(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.get_activity_paper(p_activity_id integer) OWNER TO postgres;

--
-- Name: log_registration_action(integer, character varying, integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.log_registration_action(p_request_id integer, p_action character varying, p_action_by integer, p_action_level integer, p_comment text, p_metadata jsonb) OWNER TO postgres;

--
-- Name: FUNCTION log_registration_action(p_request_id integer, p_action character varying, p_action_by integer, p_action_level integer, p_comment text, p_metadata jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_registration_action(p_request_id integer, p_action character varying, p_action_by integer, p_action_level integer, p_comment text, p_metadata jsonb) IS '记录注册审核操作日志的辅助函数';


--
-- Name: update_achievement_progress_percentage(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_achievement_progress_percentage() OWNER TO postgres;

--
-- Name: update_activity_paper_stats(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_activity_paper_stats() OWNER TO postgres;

--
-- Name: update_assessment_location_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_assessment_location_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_assessment_location_updated_at() OWNER TO postgres;

--
-- Name: update_daily_tasks_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_daily_tasks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_daily_tasks_updated_at() OWNER TO postgres;

--
-- Name: update_location_registered_count(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_location_registered_count() OWNER TO postgres;

--
-- Name: update_notification_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_notification_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_notification_timestamp() OWNER TO postgres;

--
-- Name: update_registration_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_registration_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_registration_updated_at() OWNER TO postgres;

--
-- Name: update_student_ability_stats(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_student_ability_stats() OWNER TO postgres;

--
-- Name: FUNCTION update_student_ability_stats(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_student_ability_stats() IS '触发器函数：学生答题后自动更新能力统计';


--
-- Name: update_student_activity_grading_status(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_student_activity_grading_status() OWNER TO postgres;

--
-- Name: FUNCTION update_student_activity_grading_status(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_student_activity_grading_status() IS '自动更新学生活动的评卷状态';


--
-- Name: update_student_knowledge_stats(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_student_knowledge_stats() OWNER TO postgres;

--
-- Name: FUNCTION update_student_knowledge_stats(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_student_knowledge_stats() IS '触发器函数：学生答题后自动更新知识点统计';


--
-- Name: update_student_points_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_student_points_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_student_points_timestamp() OWNER TO postgres;

--
-- Name: update_student_task_progress_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_student_task_progress_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_student_task_progress_updated_at() OWNER TO postgres;

--
-- Name: update_teacher_permissions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_teacher_permissions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_teacher_permissions_updated_at() OWNER TO postgres;

--
-- Name: update_teaching_class_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_teaching_class_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_teaching_class_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_activity_time_limit(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.validate_activity_time_limit() OWNER TO postgres;

--
-- Name: validate_teacher_permission(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.validate_teacher_permission() OWNER TO postgres;

--
-- Name: FUNCTION validate_teacher_permission(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_teacher_permission() IS '验证教师权限的 scope_level 与 district_id/school_id 匹配性';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievement_progress; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.achievement_progress OWNER TO postgres;

--
-- Name: TABLE achievement_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.achievement_progress IS '成就进度跟踪表';


--
-- Name: COLUMN achievement_progress.progress_percentage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.achievement_progress.progress_percentage IS '进度百分比，自动计算 = (current_value / target_value) * 100';


--
-- Name: achievement_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.achievement_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.achievement_progress_id_seq OWNER TO postgres;

--
-- Name: achievement_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.achievement_progress_id_seq OWNED BY public.achievement_progress.id;


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT check_category CHECK (((category)::text = ANY ((ARRAY['exam_certification'::character varying, 'learning_growth'::character varying, 'social_collaboration'::character varying, 'special_event'::character varying])::text[]))),
    CONSTRAINT check_points_reward CHECK ((points_reward >= 0)),
    CONSTRAINT check_rarity CHECK (((rarity)::text = ANY ((ARRAY['common'::character varying, 'rare'::character varying, 'epic'::character varying, 'legendary'::character varying, 'mythic'::character varying])::text[])))
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- Name: TABLE achievements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.achievements IS '成就定义表';


--
-- Name: COLUMN achievements.achievement_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.achievements.achievement_code IS '成就唯一代码';


--
-- Name: COLUMN achievements.rarity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.achievements.rarity IS '稀有度：common(普通)/rare(稀有)/epic(史诗)/legendary(传说)/mythic(神话)';


--
-- Name: COLUMN achievements.trigger_condition; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.achievements.trigger_condition IS '触发条件JSON，包含trigger_mode, trigger_frequency, condition_type等';


--
-- Name: achievements_achievement_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.achievements_achievement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.achievements_achievement_id_seq OWNER TO postgres;

--
-- Name: achievements_achievement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.achievements_achievement_id_seq OWNED BY public.achievements.achievement_id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT activities_paper_status_check CHECK (((paper_status)::text = ANY ((ARRAY['empty'::character varying, 'draft'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT activities_time_limit_type_check CHECK (((time_limit_type)::text = ANY ((ARRAY['unlimited'::character varying, 'scheduled'::character varying, 'timed'::character varying])::text[]))),
    CONSTRAINT check_scheduled_time_range CHECK (((((time_limit_type)::text = 'scheduled'::text) AND (start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (duration IS NULL) AND (end_time > start_time)) OR ((time_limit_type)::text <> 'scheduled'::text))),
    CONSTRAINT check_timed_duration CHECK (((((time_limit_type)::text = 'timed'::text) AND (duration IS NOT NULL) AND (duration > 0) AND (start_time IS NULL) AND (end_time IS NULL)) OR ((time_limit_type)::text <> 'timed'::text))),
    CONSTRAINT check_unlimited_no_time CHECK (((((time_limit_type)::text = 'unlimited'::text) AND (start_time IS NULL) AND (end_time IS NULL) AND (duration IS NULL)) OR ((time_limit_type)::text <> 'unlimited'::text))),
    CONSTRAINT exams_ability_level_check CHECK (((ability_level)::text = ANY ((ARRAY['L1'::character varying, 'L2'::character varying, 'L3'::character varying, 'L4'::character varying, 'L5'::character varying, 'L6'::character varying, 'L7'::character varying])::text[]))),
    CONSTRAINT exams_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT exams_scope_check CHECK (((scope)::text = ANY ((ARRAY['system'::character varying, 'municipal'::character varying, 'district'::character varying, 'base_school'::character varying, 'municipal_school'::character varying, 'school'::character varying, 'class'::character varying])::text[]))),
    CONSTRAINT exams_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'ongoing'::character varying, 'finished'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT exams_type_check CHECK (((type)::text = ANY ((ARRAY['assessment'::character varying, 'practice'::character varying])::text[])))
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: TABLE activities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.activities IS 'Stores all learning activities including assessments and practice exercises';


--
-- Name: COLUMN activities.total_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.total_score IS '试卷总分 (所有题目分值之和)';


--
-- Name: COLUMN activities.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.type IS 'Activity type: assessment (formal evaluation) or practice (informal exercise)';


--
-- Name: COLUMN activities.ability_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.ability_level IS 'Target ability level: L1-L7 (basic to excellence)';


--
-- Name: COLUMN activities.scope; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.scope IS 'Distribution scope: municipal, district, school, or class';


--
-- Name: COLUMN activities.allow_retake; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.allow_retake IS 'Whether students can retake this activity';


--
-- Name: COLUMN activities.max_attempts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.max_attempts IS 'Maximum number of attempts allowed';


--
-- Name: COLUMN activities.is_official; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.is_official IS 'Whether this is an official activity that can issue certificates';


--
-- Name: COLUMN activities.target_audience; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.target_audience IS 'JSON specification of target grades, schools, classes';


--
-- Name: COLUMN activities.certificate_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.certificate_config IS 'JSON configuration for certificate generation';


--
-- Name: COLUMN activities.time_limit_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.time_limit_type IS '时间限制类型: unlimited(无限制), scheduled(固定时间段), timed(限时作答)';


--
-- Name: COLUMN activities.question_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.question_count IS '试卷题目总数';


--
-- Name: COLUMN activities.paper_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.paper_status IS '组卷状态: empty=未组卷, draft=草稿中, completed=已完成';


--
-- Name: COLUMN activities.registration_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.registration_enabled IS '是否开启报名功能（测评类型默认开启）';


--
-- Name: COLUMN activities.registration_start_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.registration_start_time IS '报名开始时间';


--
-- Name: COLUMN activities.registration_end_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.registration_end_time IS '报名截止时间';


--
-- Name: COLUMN activities.max_participants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.max_participants IS '最大参与人数限制（L1-L3可选，L4+通过测评点控制）';


--
-- Name: COLUMN activities.require_location; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activities.require_location IS '是否需要选择测评点（L4+自动设为true）';


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.activities_id_seq OWNER TO postgres;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: student_activities; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT student_activities_grading_status_check CHECK (((grading_status)::text = ANY ((ARRAY['pending'::character varying, 'auto_graded'::character varying, 'partial_graded'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT student_exams_status_check CHECK (((status)::text = ANY ((ARRAY['registered'::character varying, 'in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'absent'::character varying])::text[])))
);


ALTER TABLE public.student_activities OWNER TO postgres;

--
-- Name: COLUMN student_activities.started_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_activities.started_at IS '开始作答时间 (用于timed类型计算deadline)';


--
-- Name: COLUMN student_activities.time_limit_deadline; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_activities.time_limit_deadline IS '时间限制截止时间 (scheduled类型使用activity.end_time, timed类型使用started_at + duration)';


--
-- Name: COLUMN student_activities.grading_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_activities.grading_status IS '评卷状态: pending-待评卷, auto_graded-自动评卷完成, partial_graded-部分评卷, completed-全部完成';


--
-- Name: activity_grading_stats; Type: VIEW; Schema: public; Owner: postgres
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
     LEFT JOIN public.student_activities sa ON (((a.id = sa.activity_id) AND ((sa.status)::text = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::text[])))))
  GROUP BY a.id, a.title, a.type;


ALTER TABLE public.activity_grading_stats OWNER TO postgres;

--
-- Name: VIEW activity_grading_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.activity_grading_stats IS '活动评卷统计视图';


--
-- Name: activity_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.activity_history OWNER TO postgres;

--
-- Name: activity_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.activity_history_id_seq OWNER TO postgres;

--
-- Name: activity_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_history_id_seq OWNED BY public.activity_history.id;


--
-- Name: activity_questions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.activity_questions OWNER TO postgres;

--
-- Name: TABLE activity_questions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.activity_questions IS '活动题目关联表 - 存储活动（练习/测评）与题目的关联关系，支持组卷功能';


--
-- Name: COLUMN activity_questions.activity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activity_questions.activity_id IS '关联的活动ID (activities表外键)';


--
-- Name: COLUMN activity_questions.question_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activity_questions.question_id IS '关联的题目ID (question_bank表外键)';


--
-- Name: COLUMN activity_questions.order_index; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activity_questions.order_index IS '题目在试卷中的显示顺序 (1,2,3...)';


--
-- Name: COLUMN activity_questions.score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activity_questions.score IS '该题目在本活动中的分值 (可与题库中建议分值不同)';


--
-- Name: question_bank_old_backup_20251122; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT question_bank_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT question_bank_level_check CHECK (((level)::text = ANY ((ARRAY['L1'::character varying, 'L2'::character varying, 'L3'::character varying, 'L4'::character varying, 'L5'::character varying, 'L6'::character varying, 'L7'::character varying, 'L8'::character varying, 'L9'::character varying])::text[]))),
    CONSTRAINT question_bank_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'published'::character varying])::text[]))),
    CONSTRAINT question_bank_type_check CHECK (((type)::text = ANY ((ARRAY['single'::character varying, 'multiple'::character varying, 'blank'::character varying, 'true_false'::character varying, 'essay'::character varying, 'code'::character varying, 'matching'::character varying])::text[])))
);


ALTER TABLE public.question_bank_old_backup_20251122 OWNER TO postgres;

--
-- Name: TABLE question_bank_old_backup_20251122; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.question_bank_old_backup_20251122 IS 'BACKUP: 2025-11-22 重构前的 question_bank 表备份，建议保留7天后删除';


--
-- Name: COLUMN question_bank_old_backup_20251122.score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.score IS '题目分值（已废弃，使用 suggested_score）';


--
-- Name: COLUMN question_bank_old_backup_20251122.abilities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.abilities IS '题目考察的能力列表（如抽象思维、计算思维等），存储能力ID数组';


--
-- Name: COLUMN question_bank_old_backup_20251122.knowledge_points; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.knowledge_points IS '题目涉及的知识点列表，存储知识点ID数组';


--
-- Name: COLUMN question_bank_old_backup_20251122.level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.level IS '题目级别 L1-L9';


--
-- Name: COLUMN question_bank_old_backup_20251122.suggested_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.suggested_score IS '建议分值';


--
-- Name: COLUMN question_bank_old_backup_20251122.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.status IS '题目状态：draft草稿，pending_review待审核，approved已批准，rejected已拒绝，published已发布';


--
-- Name: COLUMN question_bank_old_backup_20251122.scope; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.scope IS '题库范围数组: assessment-测评题库, practice_municipal-市级练习, practice_district_{code}-区级练习, practice_school_{id}-校级练习';


--
-- Name: COLUMN question_bank_old_backup_20251122.question_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank_old_backup_20251122.question_code IS '题目唯一编码，格式：科目代码+年月日+序号，如MATH250120001';


--
-- Name: activity_paper_stats; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.activity_paper_stats OWNER TO postgres;

--
-- Name: VIEW activity_paper_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.activity_paper_stats IS '活动组卷统计视图 - 统计各活动的题目数量、题型分布、难度分布等';


--
-- Name: activity_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.activity_questions_id_seq OWNER TO postgres;

--
-- Name: activity_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_questions_id_seq OWNED BY public.activity_questions.id;


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_permissions (
    id integer NOT NULL,
    user_id integer,
    school_id integer,
    district_id integer,
    permission_scope jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_permissions OWNER TO postgres;

--
-- Name: TABLE admin_permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.admin_permissions IS '管理员权限表，定义各级管理员的管理范围和权限';


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_permissions_id_seq OWNER TO postgres;

--
-- Name: admin_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_permissions_id_seq OWNED BY public.admin_permissions.id;


--
-- Name: announcement_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcement_reads (
    id integer NOT NULL,
    announcement_id integer NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.announcement_reads OWNER TO postgres;

--
-- Name: TABLE announcement_reads; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.announcement_reads IS '公告已读记录表 - 追踪用户已读的公告';


--
-- Name: announcement_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.announcement_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.announcement_reads_id_seq OWNER TO postgres;

--
-- Name: announcement_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.announcement_reads_id_seq OWNED BY public.announcement_reads.id;


--
-- Name: answers; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT answers_grading_status_check CHECK (((grading_status)::text = ANY ((ARRAY['pending'::character varying, 'auto_graded'::character varying, 'manual_graded'::character varying])::text[])))
);


ALTER TABLE public.answers OWNER TO postgres;

--
-- Name: COLUMN answers.grading_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.answers.grading_status IS '该题评卷状态: pending-待评卷, auto_graded-自动评卷, manual_graded-人工评卷';


--
-- Name: COLUMN answers.feedback; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.answers.feedback IS '评卷批注和反馈';


--
-- Name: COLUMN answers.auto_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.answers.auto_score IS '自动判题得分';


--
-- Name: COLUMN answers.manual_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.answers.manual_score IS '人工评分';


--
-- Name: answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.answers_id_seq OWNER TO postgres;

--
-- Name: answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.answers_id_seq OWNED BY public.answers.id;


--
-- Name: assessment_locations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.assessment_locations OWNER TO postgres;

--
-- Name: TABLE assessment_locations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assessment_locations IS '测评点表 - 用于L4+线下现场测评的考点管理';


--
-- Name: COLUMN assessment_locations.activity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.activity_id IS '关联的测评活动ID';


--
-- Name: COLUMN assessment_locations.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.name IS '测评点名称（如：贵阳一中考点）';


--
-- Name: COLUMN assessment_locations.address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.address IS '测评点详细地址';


--
-- Name: COLUMN assessment_locations.district_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.district_id IS '所属区县';


--
-- Name: COLUMN assessment_locations.capacity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.capacity IS '容纳人数上限';


--
-- Name: COLUMN assessment_locations.registered_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.registered_count IS '已报名人数（通过触发器自动维护）';


--
-- Name: COLUMN assessment_locations.contact_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.contact_name IS '联系人姓名';


--
-- Name: COLUMN assessment_locations.contact_phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.contact_phone IS '联系电话';


--
-- Name: COLUMN assessment_locations.exam_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.exam_date IS '测评日期';


--
-- Name: COLUMN assessment_locations.exam_time_start; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.exam_time_start IS '测评开始时间';


--
-- Name: COLUMN assessment_locations.exam_time_end; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.exam_time_end IS '测评结束时间';


--
-- Name: COLUMN assessment_locations.check_in_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.check_in_time IS '签到时间';


--
-- Name: COLUMN assessment_locations.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.notes IS '备注说明（如：请携带学生证）';


--
-- Name: COLUMN assessment_locations.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_locations.is_active IS '是否启用';


--
-- Name: assessment_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assessment_locations_id_seq OWNER TO postgres;

--
-- Name: assessment_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_locations_id_seq OWNED BY public.assessment_locations.id;


--
-- Name: assessment_registrations; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_registration_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'absent'::character varying])::text[])))
);


ALTER TABLE public.assessment_registrations OWNER TO postgres;

--
-- Name: TABLE assessment_registrations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assessment_registrations IS '测评报名表 - 记录学生的测评报名信息';


--
-- Name: COLUMN assessment_registrations.activity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.activity_id IS '测评活动ID';


--
-- Name: COLUMN assessment_registrations.student_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.student_id IS '学生ID';


--
-- Name: COLUMN assessment_registrations.location_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.location_id IS '测评点ID（L4+必填，L1-L3为NULL）';


--
-- Name: COLUMN assessment_registrations.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.status IS '报名状态: pending/confirmed/rejected/cancelled/completed/absent';


--
-- Name: COLUMN assessment_registrations.registered_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.registered_at IS '报名时间';


--
-- Name: COLUMN assessment_registrations.confirmed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.confirmed_at IS '确认时间';


--
-- Name: COLUMN assessment_registrations.cancelled_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.cancelled_at IS '取消时间';


--
-- Name: COLUMN assessment_registrations.cancel_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.cancel_reason IS '取消原因';


--
-- Name: COLUMN assessment_registrations.cancelled_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.cancelled_by IS '取消操作人';


--
-- Name: COLUMN assessment_registrations.reviewed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.reviewed_at IS '审核时间';


--
-- Name: COLUMN assessment_registrations.reviewed_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.reviewed_by IS '审核人';


--
-- Name: COLUMN assessment_registrations.review_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.review_notes IS '审核备注';


--
-- Name: COLUMN assessment_registrations.student_activity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_registrations.student_activity_id IS '关联的学生活动记录（参加测评后关联）';


--
-- Name: assessment_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assessment_registrations_id_seq OWNER TO postgres;

--
-- Name: assessment_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_registrations_id_seq OWNED BY public.assessment_registrations.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.certificates OWNER TO postgres;

--
-- Name: certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.certificates_id_seq OWNER TO postgres;

--
-- Name: certificates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificates_id_seq OWNED BY public.certificates.id;


--
-- Name: daily_tasks; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT check_category CHECK (((category)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))),
    CONSTRAINT check_progress_type CHECK (((progress_type)::text = ANY ((ARRAY['count'::character varying, 'duration'::character varying, 'score'::character varying])::text[]))),
    CONSTRAINT check_reset_period CHECK (((reset_period)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))),
    CONSTRAINT check_target_value CHECK ((target_value > 0)),
    CONSTRAINT check_task_points CHECK ((points_reward >= 0)),
    CONSTRAINT check_task_type CHECK (((task_type)::text = ANY ((ARRAY['login'::character varying, 'practice'::character varying, 'exam'::character varying, 'social'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.daily_tasks OWNER TO postgres;

--
-- Name: TABLE daily_tasks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.daily_tasks IS '日常任务定义表';


--
-- Name: COLUMN daily_tasks.task_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.task_code IS '任务唯一代码';


--
-- Name: COLUMN daily_tasks.points_reward; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.points_reward IS '基础积分奖励';


--
-- Name: COLUMN daily_tasks.task_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.task_type IS '任务类型：login/practice/exam/social';


--
-- Name: COLUMN daily_tasks.trigger_condition; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.trigger_condition IS 'JSON格式的触发条件';


--
-- Name: COLUMN daily_tasks.target_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.target_value IS '任务目标数值';


--
-- Name: COLUMN daily_tasks.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.category IS '任务周期类别：daily/weekly/monthly';


--
-- Name: COLUMN daily_tasks.bonus_points; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.bonus_points IS '连续完成额外奖励';


--
-- Name: COLUMN daily_tasks.progress_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.progress_type IS '进度类型：count/duration/score';


--
-- Name: COLUMN daily_tasks.reset_period; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.reset_period IS '重置周期';


--
-- Name: COLUMN daily_tasks.reset_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.reset_time IS '每日重置时间点';


--
-- Name: COLUMN daily_tasks.valid_from; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.valid_from IS '任务有效期起始日期';


--
-- Name: COLUMN daily_tasks.valid_to; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.daily_tasks.valid_to IS '任务有效期结束日期';


--
-- Name: daily_tasks_task_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_tasks_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.daily_tasks_task_id_seq OWNER TO postgres;

--
-- Name: daily_tasks_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_tasks_task_id_seq OWNED BY public.daily_tasks.task_id;


--
-- Name: district_ability_stats; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.district_ability_stats OWNER TO postgres;

--
-- Name: TABLE district_ability_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.district_ability_stats IS '区域能力统计表 - 记录区域在各能力维度上的整体表现';


--
-- Name: COLUMN district_ability_stats.district_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.district_id IS '区县ID';


--
-- Name: COLUMN district_ability_stats.ability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.ability IS '能力标签';


--
-- Name: COLUMN district_ability_stats.subject; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.subject IS '科目';


--
-- Name: COLUMN district_ability_stats.school_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.school_count IS '参与学校数';


--
-- Name: COLUMN district_ability_stats.student_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.student_count IS '参与学生数';


--
-- Name: COLUMN district_ability_stats.total_attempts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.total_attempts IS '总答题次数';


--
-- Name: COLUMN district_ability_stats.correct_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.correct_count IS '正确次数';


--
-- Name: COLUMN district_ability_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN district_ability_stats.avg_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.avg_score IS '平均得分';


--
-- Name: COLUMN district_ability_stats.period_start; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.period_start IS '统计周期开始日期';


--
-- Name: COLUMN district_ability_stats.period_end; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.district_ability_stats.period_end IS '统计周期结束日期';


--
-- Name: district_ability_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.district_ability_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.district_ability_stats_id_seq OWNER TO postgres;

--
-- Name: district_ability_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.district_ability_stats_id_seq OWNED BY public.district_ability_stats.id;


--
-- Name: districts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.districts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    level character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT districts_level_check CHECK (((level)::text = ANY ((ARRAY['district'::character varying, 'municipal'::character varying])::text[])))
);


ALTER TABLE public.districts OWNER TO postgres;

--
-- Name: TABLE districts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.districts IS '区域管理表，支持区级和市级管理';


--
-- Name: districts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.districts_id_seq OWNER TO postgres;

--
-- Name: districts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;


--
-- Name: exams; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.exams OWNER TO postgres;

--
-- Name: import_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.import_logs OWNER TO postgres;

--
-- Name: import_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_logs_id_seq OWNER TO postgres;

--
-- Name: import_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_logs_id_seq OWNED BY public.import_logs.id;


--
-- Name: leaderboards; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT check_leaderboard_type CHECK (((leaderboard_type)::text = ANY ((ARRAY['weekly'::character varying, 'monthly'::character varying, 'total'::character varying, 'school'::character varying, 'class'::character varying])::text[]))),
    CONSTRAINT check_rank CHECK ((rank > 0))
);


ALTER TABLE public.leaderboards OWNER TO postgres;

--
-- Name: TABLE leaderboards; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.leaderboards IS '排行榜缓存表';


--
-- Name: COLUMN leaderboards.leaderboard_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leaderboards.leaderboard_type IS '排行榜类型：weekly(周榜)/monthly(月榜)/total(总榜)/school(校内)/class(班级)';


--
-- Name: leaderboards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leaderboards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leaderboards_id_seq OWNER TO postgres;

--
-- Name: leaderboards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leaderboards_id_seq OWNED BY public.leaderboards.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: TABLE notification_preferences; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.notification_preferences IS '用户通知偏好设置表';


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notification_preferences_id_seq OWNER TO postgres;

--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notification_templates OWNER TO postgres;

--
-- Name: TABLE notification_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.notification_templates IS '通知模板表 - 存储可复用的通知模板';


--
-- Name: notification_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notification_templates_id_seq OWNER TO postgres;

--
-- Name: notification_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_templates_id_seq OWNED BY public.notification_templates.id;


--
-- Name: teacher_permissions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT teacher_permissions_scope_level_check CHECK (((scope_level)::text = ANY ((ARRAY['municipal'::character varying, 'district'::character varying, 'school'::character varying])::text[])))
);


ALTER TABLE public.teacher_permissions OWNER TO postgres;

--
-- Name: COLUMN teacher_permissions.permission_type; Type: COMMENT; Schema: public; Owner: postgres
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
-- Name: COLUMN teacher_permissions.scope_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teacher_permissions.scope_level IS '权限层级: municipal-市级, district-区级, school-校级';


--
-- Name: COLUMN teacher_permissions.district_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teacher_permissions.district_id IS '区级权限关联的区ID（scope_level=district时必填）';


--
-- Name: COLUMN teacher_permissions.school_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teacher_permissions.school_id IS '校级权限关联的学校ID（scope_level=school时必填，当前预留）';


--
-- Name: permission_statistics; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.permission_statistics OWNER TO postgres;

--
-- Name: VIEW permission_statistics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.permission_statistics IS '权限统计视图：按层级和权限类型统计教师数量和覆盖科目';


--
-- Name: points_transactions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT check_transaction_type CHECK (((transaction_type)::text = ANY ((ARRAY['achievement'::character varying, 'daily_task'::character varying, 'activity'::character varying, 'redemption'::character varying, 'manual'::character varying, 'teacher_reward'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.points_transactions OWNER TO postgres;

--
-- Name: TABLE points_transactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.points_transactions IS '积分交易明细表';


--
-- Name: COLUMN points_transactions.points_change; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.points_transactions.points_change IS '积分变动：正数表示获得，负数表示消费';


--
-- Name: COLUMN points_transactions.transaction_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.points_transactions.transaction_type IS '交易类型：achievement(成就)/daily_task(日常任务)/redemption(商城兑换)/manual(手动调整)';


--
-- Name: points_transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.points_transactions_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.points_transactions_transaction_id_seq OWNER TO postgres;

--
-- Name: points_transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.points_transactions_transaction_id_seq OWNED BY public.points_transactions.transaction_id;


--
-- Name: schools; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT schools_type_check CHECK (((type)::text = ANY ((ARRAY['regular'::character varying, 'municipal'::character varying, 'base'::character varying])::text[])))
);


ALTER TABLE public.schools OWNER TO postgres;

--
-- Name: practice_publish_permission_statistics; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.practice_publish_permission_statistics OWNER TO postgres;

--
-- Name: VIEW practice_publish_permission_statistics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.practice_publish_permission_statistics IS '练习发布权限统计视图';


--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT question_bank_status_check1 CHECK (((status)::text = ANY ((ARRAY['published'::character varying, 'inactive'::character varying, 'pending_review'::character varying])::text[])))
);


ALTER TABLE public.question_bank OWNER TO postgres;

--
-- Name: TABLE question_bank; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.question_bank IS '题目发布记录表：一个草稿可以有多条发布记录，每条对应一个发布范围';


--
-- Name: COLUMN question_bank.draft_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.draft_id IS '关联的草稿题目ID';


--
-- Name: COLUMN question_bank.scope; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.scope IS '发布范围（单值）：assessment, practice_municipal, practice_district_{code}, practice_school_{id}';


--
-- Name: COLUMN question_bank.district_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.district_id IS '区级题目时，关联的区ID（从scope解析或手动指定）';


--
-- Name: COLUMN question_bank.school_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.school_id IS '校级题目时，关联的学校ID';


--
-- Name: COLUMN question_bank.question_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.question_code IS '题目编码，每个发布版本独立生成（格式：科目代码+日期+序号）';


--
-- Name: question_bank_distribution; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.question_bank_distribution OWNER TO postgres;

--
-- Name: VIEW question_bank_distribution; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.question_bank_distribution IS '题库分布统计：按 scope、科目、年级统计题目数量';


--
-- Name: question_bank_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_bank_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.question_bank_id_seq OWNER TO postgres;

--
-- Name: question_bank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_bank_id_seq OWNED BY public.question_bank_old_backup_20251122.id;


--
-- Name: question_bank_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_bank_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.question_bank_id_seq1 OWNER TO postgres;

--
-- Name: question_bank_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_bank_id_seq1 OWNED BY public.question_bank.id;


--
-- Name: question_drafts; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT question_drafts_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT question_drafts_level_check CHECK (((level)::text = ANY ((ARRAY['L1'::character varying, 'L2'::character varying, 'L3'::character varying, 'L4'::character varying, 'L5'::character varying, 'L6'::character varying, 'L7'::character varying, 'L8'::character varying, 'L9'::character varying])::text[]))),
    CONSTRAINT question_drafts_type_check CHECK (((type)::text = ANY ((ARRAY['single'::character varying, 'multiple'::character varying, 'blank'::character varying, 'true_false'::character varying, 'essay'::character varying, 'code'::character varying, 'matching'::character varying])::text[])))
);


ALTER TABLE public.question_drafts OWNER TO postgres;

--
-- Name: TABLE question_drafts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.question_drafts IS '题目草稿表：存储题目的原始内容，可多次发布到不同范围';


--
-- Name: COLUMN question_drafts.publish_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_drafts.publish_count IS '该题目被发布的次数（一个题目可发布到多个范围）';


--
-- Name: COLUMN question_drafts.total_usage_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_drafts.total_usage_count IS '所有发布版本的累计使用次数';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'teacher'::character varying, 'school_admin'::character varying, 'district_admin'::character varying, 'municipal_school_admin'::character varying, 'base_school_admin'::character varying, 'municipal_admin'::character varying, 'system_admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS '所有演示账号的密码都是 password123';


--
-- Name: COLUMN users.password; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password IS '使用 bcrypt 加密，盐值为 10';


--
-- Name: question_bank_with_draft; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.question_bank_with_draft OWNER TO postgres;

--
-- Name: VIEW question_bank_with_draft; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.question_bank_with_draft IS '题目发布记录带草稿内容视图，用于列表查询';


--
-- Name: question_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer,
    subject character varying(50),
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.question_categories OWNER TO postgres;

--
-- Name: question_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.question_categories_id_seq OWNER TO postgres;

--
-- Name: question_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_categories_id_seq OWNED BY public.question_categories.id;


--
-- Name: question_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.question_drafts_id_seq OWNER TO postgres;

--
-- Name: question_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_drafts_id_seq OWNED BY public.question_drafts.id;


--
-- Name: question_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_reviews (
    id integer NOT NULL,
    question_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    status character varying(20) NOT NULL,
    comment text,
    reviewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT question_reviews_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.question_reviews OWNER TO postgres;

--
-- Name: question_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.question_reviews_id_seq OWNER TO postgres;

--
-- Name: question_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_reviews_id_seq OWNED BY public.question_reviews.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT questions_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT questions_type_check CHECK (((type)::text = ANY ((ARRAY['single'::character varying, 'multiple'::character varying, 'blank'::character varying, 'essay'::character varying, 'code'::character varying])::text[])))
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.questions_id_seq OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: registration_audit_log; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.registration_audit_log OWNER TO postgres;

--
-- Name: TABLE registration_audit_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.registration_audit_log IS '注册审核日志表，记录所有审核操作历史';


--
-- Name: COLUMN registration_audit_log.action_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registration_audit_log.action_level IS '操作层级: 0=系统, 2=校级, 3=区县级, 4=市级';


--
-- Name: COLUMN registration_audit_log.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registration_audit_log.metadata IS 'JSON格式元数据，存储升级原因等额外信息';


--
-- Name: registration_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registration_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.registration_audit_log_id_seq OWNER TO postgres;

--
-- Name: registration_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registration_audit_log_id_seq OWNED BY public.registration_audit_log.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    version character varying(10) NOT NULL,
    description text,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: school_ability_stats; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.school_ability_stats OWNER TO postgres;

--
-- Name: TABLE school_ability_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.school_ability_stats IS '学校能力统计表 - 记录学校在各能力维度上的整体表现';


--
-- Name: COLUMN school_ability_stats.school_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.school_id IS '学校ID';


--
-- Name: COLUMN school_ability_stats.ability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.ability IS '能力标签';


--
-- Name: COLUMN school_ability_stats.subject; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.subject IS '科目';


--
-- Name: COLUMN school_ability_stats.student_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.student_count IS '参与学生数';


--
-- Name: COLUMN school_ability_stats.total_attempts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.total_attempts IS '总答题次数';


--
-- Name: COLUMN school_ability_stats.correct_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.correct_count IS '正确次数';


--
-- Name: COLUMN school_ability_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN school_ability_stats.avg_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.avg_score IS '平均得分';


--
-- Name: COLUMN school_ability_stats.period_start; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.period_start IS '统计周期开始日期';


--
-- Name: COLUMN school_ability_stats.period_end; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.school_ability_stats.period_end IS '统计周期结束日期';


--
-- Name: school_ability_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.school_ability_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.school_ability_stats_id_seq OWNER TO postgres;

--
-- Name: school_ability_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.school_ability_stats_id_seq OWNED BY public.school_ability_stats.id;


--
-- Name: schools_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.schools_id_seq OWNER TO postgres;

--
-- Name: schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schools_id_seq OWNED BY public.schools.id;


--
-- Name: student_ability_stats; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.student_ability_stats OWNER TO postgres;

--
-- Name: TABLE student_ability_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_ability_stats IS '学生能力统计表 - 记录每个学生在各能力维度上的表现';


--
-- Name: COLUMN student_ability_stats.student_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_ability_stats.student_id IS '学生用户ID';


--
-- Name: COLUMN student_ability_stats.ability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_ability_stats.ability IS '能力标签';


--
-- Name: COLUMN student_ability_stats.subject; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_ability_stats.subject IS '科目';


--
-- Name: COLUMN student_ability_stats.total_questions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_ability_stats.total_questions IS '总题数';


--
-- Name: COLUMN student_ability_stats.correct_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_ability_stats.correct_count IS '正确题数';


--
-- Name: COLUMN student_ability_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_ability_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN student_ability_stats.avg_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_ability_stats.avg_score IS '平均得分';


--
-- Name: student_ability_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_ability_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_ability_stats_id_seq OWNER TO postgres;

--
-- Name: student_ability_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_ability_stats_id_seq OWNED BY public.student_ability_stats.id;


--
-- Name: student_achievements; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.student_achievements OWNER TO postgres;

--
-- Name: TABLE student_achievements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_achievements IS '学生成就记录表';


--
-- Name: COLUMN student_achievements.is_displayed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_achievements.is_displayed IS '是否在个人成就墙展示';


--
-- Name: student_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_achievements_id_seq OWNER TO postgres;

--
-- Name: student_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_achievements_id_seq OWNED BY public.student_achievements.id;


--
-- Name: student_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_activities_id_seq OWNER TO postgres;

--
-- Name: student_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_activities_id_seq OWNED BY public.student_activities.id;


--
-- Name: student_daily_tasks; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.student_daily_tasks OWNER TO postgres;

--
-- Name: TABLE student_daily_tasks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_daily_tasks IS '学生日常任务完成记录表';


--
-- Name: COLUMN student_daily_tasks.task_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_daily_tasks.task_date IS '任务日期，每日凌晨重置';


--
-- Name: student_daily_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_daily_tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_daily_tasks_id_seq OWNER TO postgres;

--
-- Name: student_daily_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_daily_tasks_id_seq OWNED BY public.student_daily_tasks.id;


--
-- Name: student_exams; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.student_exams OWNER TO postgres;

--
-- Name: student_knowledge_stats; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.student_knowledge_stats OWNER TO postgres;

--
-- Name: TABLE student_knowledge_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_knowledge_stats IS '学生知识点统计表 - 记录每个学生在各知识点上的掌握情况';


--
-- Name: COLUMN student_knowledge_stats.student_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_knowledge_stats.student_id IS '学生用户ID';


--
-- Name: COLUMN student_knowledge_stats.knowledge_point; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_knowledge_stats.knowledge_point IS '知识点标签';


--
-- Name: COLUMN student_knowledge_stats.subject; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_knowledge_stats.subject IS '科目';


--
-- Name: COLUMN student_knowledge_stats.total_questions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_knowledge_stats.total_questions IS '总题数';


--
-- Name: COLUMN student_knowledge_stats.correct_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_knowledge_stats.correct_count IS '正确题数';


--
-- Name: COLUMN student_knowledge_stats.accuracy_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_knowledge_stats.accuracy_rate IS '正确率(%)';


--
-- Name: COLUMN student_knowledge_stats.avg_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_knowledge_stats.avg_score IS '平均得分';


--
-- Name: student_knowledge_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_knowledge_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_knowledge_stats_id_seq OWNER TO postgres;

--
-- Name: student_knowledge_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_knowledge_stats_id_seq OWNED BY public.student_knowledge_stats.id;


--
-- Name: student_login_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.student_login_history OWNER TO postgres;

--
-- Name: TABLE student_login_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_login_history IS '学生登录历史记录表，用于成就系统和行为分析';


--
-- Name: COLUMN student_login_history.student_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_login_history.student_id IS '学生ID（students.id）';


--
-- Name: COLUMN student_login_history.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_login_history.user_id IS '用户ID（users.id）';


--
-- Name: COLUMN student_login_history.login_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_login_history.login_date IS '登录日期（用于检测连续天数）';


--
-- Name: COLUMN student_login_history.login_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_login_history.login_time IS '登录时间（精确到秒）';


--
-- Name: COLUMN student_login_history.login_method; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_login_history.login_method IS '登录方式：username/phone/idCard';


--
-- Name: COLUMN student_login_history.ip_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_login_history.ip_address IS 'IP地址';


--
-- Name: COLUMN student_login_history.user_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_login_history.user_agent IS '用户代理字符串';


--
-- Name: student_login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_login_history_id_seq OWNER TO postgres;

--
-- Name: student_login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_login_history_id_seq OWNED BY public.student_login_history.id;


--
-- Name: student_points; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.student_points OWNER TO postgres;

--
-- Name: TABLE student_points; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_points IS '学生积分账户表';


--
-- Name: COLUMN student_points.current_points; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_points.current_points IS '当前可用积分 = 总积分 - 已消费 - 冻结';


--
-- Name: COLUMN student_points.total_points; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_points.total_points IS '历史累计获得的所有积分（永久记录）';


--
-- Name: student_registration_requests; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.student_registration_requests OWNER TO postgres;

--
-- Name: TABLE student_registration_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_registration_requests IS '学生注册申请表，记录学生自主注册申请信息';


--
-- Name: COLUMN student_registration_requests.current_reviewer_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_registration_requests.current_reviewer_level IS '当前审核层级: 2=校级, 3=区县级, 4=市级';


--
-- Name: COLUMN student_registration_requests.last_escalated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_registration_requests.last_escalated_at IS '最后升级时间，用于计算3天自动升级';


--
-- Name: student_registration_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_registration_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_registration_requests_id_seq OWNER TO postgres;

--
-- Name: student_registration_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_registration_requests_id_seq OWNED BY public.student_registration_requests.id;


--
-- Name: student_task_progress; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.student_task_progress OWNER TO postgres;

--
-- Name: TABLE student_task_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_task_progress IS '学生日常任务进度表';


--
-- Name: COLUMN student_task_progress.current_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_task_progress.current_value IS '当前完成进度值';


--
-- Name: COLUMN student_task_progress.completion_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_task_progress.completion_rate IS '完成率百分比';


--
-- Name: COLUMN student_task_progress.bonus_awarded; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_task_progress.bonus_awarded IS '获得的奖励积分';


--
-- Name: COLUMN student_task_progress.period_start; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_task_progress.period_start IS '任务周期开始日期';


--
-- Name: COLUMN student_task_progress.period_end; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_task_progress.period_end IS '任务周期结束日期';


--
-- Name: COLUMN student_task_progress.reset_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.student_task_progress.reset_count IS '任务重置次数，用于连续完成追踪';


--
-- Name: student_task_progress_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_task_progress_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_task_progress_progress_id_seq OWNER TO postgres;

--
-- Name: student_task_progress_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_task_progress_progress_id_seq OWNED BY public.student_task_progress.progress_id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.students_id_seq OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.subjects_id_seq OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: system_announcements; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.system_announcements OWNER TO postgres;

--
-- Name: TABLE system_announcements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.system_announcements IS '系统公告表 - 存储全局公告信息';


--
-- Name: system_announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_announcements_id_seq OWNER TO postgres;

--
-- Name: system_announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_announcements_id_seq OWNED BY public.system_announcements.id;


--
-- Name: task_completion_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.task_completion_history OWNER TO postgres;

--
-- Name: TABLE task_completion_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.task_completion_history IS '任务完成历史记录表';


--
-- Name: COLUMN task_completion_history.bonus_earned; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.task_completion_history.bonus_earned IS '获得的奖励积分';


--
-- Name: COLUMN task_completion_history.streak_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.task_completion_history.streak_count IS '连续完成次数（用于计算连续奖励）';


--
-- Name: task_completion_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_completion_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.task_completion_history_history_id_seq OWNER TO postgres;

--
-- Name: task_completion_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_completion_history_history_id_seq OWNED BY public.task_completion_history.history_id;


--
-- Name: teacher_grading_workload; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.teacher_grading_workload AS
 SELECT a.id AS activity_id,
    a.title,
    a.created_by AS teacher_id,
    u.real_name AS teacher_name,
    count(DISTINCT sa.id) AS total_submissions,
    count(DISTINCT
        CASE
            WHEN ((sa.grading_status)::text = ANY ((ARRAY['pending'::character varying, 'partial_graded'::character varying])::text[])) THEN sa.id
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
     LEFT JOIN public.student_activities sa ON (((a.id = sa.activity_id) AND ((sa.status)::text = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::text[])))))
     LEFT JOIN public.answers ans ON (((sa.id = ans.student_exam_id) AND ((ans.grading_status)::text = 'pending'::text))))
  WHERE ((a.status)::text = 'published'::text)
  GROUP BY a.id, a.title, a.created_by, u.real_name;


ALTER TABLE public.teacher_grading_workload OWNER TO postgres;

--
-- Name: VIEW teacher_grading_workload; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.teacher_grading_workload IS '教师评卷工作量统计视图';


--
-- Name: teacher_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teacher_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teacher_permissions_id_seq OWNER TO postgres;

--
-- Name: teacher_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teacher_permissions_id_seq OWNED BY public.teacher_permissions.id;


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.teachers OWNER TO postgres;

--
-- Name: teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teachers_id_seq OWNER TO postgres;

--
-- Name: teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teachers_id_seq OWNED BY public.teachers.id;


--
-- Name: teaching_class_activities; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.teaching_class_activities OWNER TO postgres;

--
-- Name: TABLE teaching_class_activities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.teaching_class_activities IS '教学班活动关联表 - 记录教学班与活动的关联关系';


--
-- Name: teaching_class_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teaching_class_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teaching_class_activities_id_seq OWNER TO postgres;

--
-- Name: teaching_class_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teaching_class_activities_id_seq OWNED BY public.teaching_class_activities.id;


--
-- Name: teaching_class_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teaching_class_approvals (
    id integer NOT NULL,
    teaching_class_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    action character varying(20) NOT NULL,
    comment text,
    reviewer_level character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_approval_action CHECK (((action)::text = ANY ((ARRAY['approve'::character varying, 'reject'::character varying, 'escalate'::character varying, 'return'::character varying])::text[])))
);


ALTER TABLE public.teaching_class_approvals OWNER TO postgres;

--
-- Name: TABLE teaching_class_approvals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.teaching_class_approvals IS '教学班审批记录表 - 记录审批历史';


--
-- Name: COLUMN teaching_class_approvals.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teaching_class_approvals.action IS '审批动作: approve-批准, reject-拒绝, escalate-流转上级, return-退回修改';


--
-- Name: teaching_class_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teaching_class_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teaching_class_approvals_id_seq OWNER TO postgres;

--
-- Name: teaching_class_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teaching_class_approvals_id_seq OWNED BY public.teaching_class_approvals.id;


--
-- Name: teaching_class_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teaching_class_members (
    id integer NOT NULL,
    teaching_class_id integer NOT NULL,
    student_id integer NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    removed_at timestamp without time zone,
    is_active boolean DEFAULT true
);


ALTER TABLE public.teaching_class_members OWNER TO postgres;

--
-- Name: TABLE teaching_class_members; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.teaching_class_members IS '教学班成员表 - 记录教学班与学生的关联关系';


--
-- Name: COLUMN teaching_class_members.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teaching_class_members.is_active IS '是否在班: true-在班, false-已移除';


--
-- Name: teaching_class_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teaching_class_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teaching_class_members_id_seq OWNER TO postgres;

--
-- Name: teaching_class_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teaching_class_members_id_seq OWNED BY public.teaching_class_members.id;


--
-- Name: teaching_class_teachers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teaching_class_teachers (
    id integer NOT NULL,
    teaching_class_id integer NOT NULL,
    teacher_id integer NOT NULL,
    role character varying(20) DEFAULT 'teacher'::character varying NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    CONSTRAINT valid_teacher_role CHECK (((role)::text = ANY ((ARRAY['creator'::character varying, 'teacher'::character varying, 'assistant'::character varying])::text[])))
);


ALTER TABLE public.teaching_class_teachers OWNER TO postgres;

--
-- Name: TABLE teaching_class_teachers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.teaching_class_teachers IS '教学班教师表 - 记录教学班与教师的关联关系';


--
-- Name: COLUMN teaching_class_teachers.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teaching_class_teachers.role IS '教师角色: creator-创建者, teacher-任课教师, assistant-助教';


--
-- Name: teaching_class_teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teaching_class_teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teaching_class_teachers_id_seq OWNER TO postgres;

--
-- Name: teaching_class_teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teaching_class_teachers_id_seq OWNED BY public.teaching_class_teachers.id;


--
-- Name: teaching_classes; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT valid_scope CHECK (((scope)::text = ANY ((ARRAY['school'::character varying, 'district'::character varying, 'municipal'::character varying])::text[]))),
    CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.teaching_classes OWNER TO postgres;

--
-- Name: TABLE teaching_classes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.teaching_classes IS '教学班主表 - 存储教学班基本信息';


--
-- Name: COLUMN teaching_classes.scope; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teaching_classes.scope IS '教学班范围: school-校级, district-区级, municipal-市级';


--
-- Name: COLUMN teaching_classes.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teaching_classes.status IS '状态: draft-草稿, pending-待审批, approved-已批准, rejected-已拒绝, archived-已归档';


--
-- Name: COLUMN teaching_classes.current_reviewer_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teaching_classes.current_reviewer_level IS '当前审核级别，用于超时流转';


--
-- Name: teaching_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teaching_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.teaching_classes_id_seq OWNER TO postgres;

--
-- Name: teaching_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teaching_classes_id_seq OWNED BY public.teaching_classes.id;


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_notifications OWNER TO postgres;

--
-- Name: TABLE user_notifications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_notifications IS '用户通知表 - 存储发送给用户的个人通知';


--
-- Name: user_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_notifications_id_seq OWNER TO postgres;

--
-- Name: user_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notifications_id_seq OWNED BY public.user_notifications.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_district_ability_realtime; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_district_ability_realtime OWNER TO postgres;

--
-- Name: v_location_registration_details; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_location_registration_details OWNER TO postgres;

--
-- Name: VIEW v_location_registration_details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_location_registration_details IS '测评点报名详情视图';


--
-- Name: v_pending_teaching_classes; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_pending_teaching_classes OWNER TO postgres;

--
-- Name: VIEW v_pending_teaching_classes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_pending_teaching_classes IS '待审批教学班视图 - 显示待审批的教学班列表';


--
-- Name: v_registration_statistics; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_registration_statistics OWNER TO postgres;

--
-- Name: VIEW v_registration_statistics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_registration_statistics IS '测评报名统计视图';


--
-- Name: v_school_ability_realtime; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_school_ability_realtime OWNER TO postgres;

--
-- Name: v_student_ability_realtime; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_student_ability_realtime OWNER TO postgres;

--
-- Name: VIEW v_student_ability_realtime; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_student_ability_realtime IS '学生能力实时统计视图 - 基于最新答题记录实时计算';


--
-- Name: v_student_knowledge_realtime; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_student_knowledge_realtime OWNER TO postgres;

--
-- Name: VIEW v_student_knowledge_realtime; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_student_knowledge_realtime IS '学生知识点实时统计视图 - 基于最新答题记录实时计算';


--
-- Name: v_student_learning_overview; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_student_learning_overview AS
 SELECT sa.student_id,
    count(DISTINCT sa.activity_id) AS total_activities,
    count(DISTINCT
        CASE
            WHEN ((sa.status)::text = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::text[])) THEN sa.activity_id
            ELSE NULL::integer
        END) AS completed_activities,
    round(avg(
        CASE
            WHEN ((sa.status)::text = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::text[])) THEN sa.score
            ELSE NULL::numeric
        END), 2) AS avg_score,
    sum(EXTRACT(epoch FROM (sa.submit_time - sa.start_time))) AS total_study_seconds,
    max(sa.submit_time) AS last_activity_time,
    min(sa.created_at) AS first_activity_time
   FROM public.student_activities sa
  GROUP BY sa.student_id;


ALTER TABLE public.v_student_learning_overview OWNER TO postgres;

--
-- Name: VIEW v_student_learning_overview; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_student_learning_overview IS '学生学习概况视图 - 整体学习统计';


--
-- Name: v_teaching_class_summary; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.v_teaching_class_summary OWNER TO postgres;

--
-- Name: VIEW v_teaching_class_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_teaching_class_summary IS '教学班汇总视图 - 包含学生数、教师数、活动数等统计信息';


--
-- Name: achievement_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement_progress ALTER COLUMN id SET DEFAULT nextval('public.achievement_progress_id_seq'::regclass);


--
-- Name: achievements achievement_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements ALTER COLUMN achievement_id SET DEFAULT nextval('public.achievements_achievement_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_history ALTER COLUMN id SET DEFAULT nextval('public.activity_history_id_seq'::regclass);


--
-- Name: activity_questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_questions ALTER COLUMN id SET DEFAULT nextval('public.activity_questions_id_seq'::regclass);


--
-- Name: admin_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions ALTER COLUMN id SET DEFAULT nextval('public.admin_permissions_id_seq'::regclass);


--
-- Name: announcement_reads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_reads ALTER COLUMN id SET DEFAULT nextval('public.announcement_reads_id_seq'::regclass);


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: assessment_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_locations ALTER COLUMN id SET DEFAULT nextval('public.assessment_locations_id_seq'::regclass);


--
-- Name: assessment_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations ALTER COLUMN id SET DEFAULT nextval('public.assessment_registrations_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq'::regclass);


--
-- Name: daily_tasks task_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_tasks ALTER COLUMN task_id SET DEFAULT nextval('public.daily_tasks_task_id_seq'::regclass);


--
-- Name: district_ability_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_ability_stats ALTER COLUMN id SET DEFAULT nextval('public.district_ability_stats_id_seq'::regclass);


--
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- Name: import_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_logs ALTER COLUMN id SET DEFAULT nextval('public.import_logs_id_seq'::regclass);


--
-- Name: leaderboards id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboards ALTER COLUMN id SET DEFAULT nextval('public.leaderboards_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.notification_preferences_id_seq'::regclass);


--
-- Name: notification_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN id SET DEFAULT nextval('public.notification_templates_id_seq'::regclass);


--
-- Name: points_transactions transaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.points_transactions_transaction_id_seq'::regclass);


--
-- Name: question_bank id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank ALTER COLUMN id SET DEFAULT nextval('public.question_bank_id_seq1'::regclass);


--
-- Name: question_bank_old_backup_20251122 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122 ALTER COLUMN id SET DEFAULT nextval('public.question_bank_id_seq'::regclass);


--
-- Name: question_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_categories ALTER COLUMN id SET DEFAULT nextval('public.question_categories_id_seq'::regclass);


--
-- Name: question_drafts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_drafts ALTER COLUMN id SET DEFAULT nextval('public.question_drafts_id_seq'::regclass);


--
-- Name: question_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_reviews ALTER COLUMN id SET DEFAULT nextval('public.question_reviews_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: registration_audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_audit_log ALTER COLUMN id SET DEFAULT nextval('public.registration_audit_log_id_seq'::regclass);


--
-- Name: school_ability_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_ability_stats ALTER COLUMN id SET DEFAULT nextval('public.school_ability_stats_id_seq'::regclass);


--
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: student_ability_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_ability_stats ALTER COLUMN id SET DEFAULT nextval('public.student_ability_stats_id_seq'::regclass);


--
-- Name: student_achievements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_achievements ALTER COLUMN id SET DEFAULT nextval('public.student_achievements_id_seq'::regclass);


--
-- Name: student_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities ALTER COLUMN id SET DEFAULT nextval('public.student_activities_id_seq'::regclass);


--
-- Name: student_daily_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_tasks ALTER COLUMN id SET DEFAULT nextval('public.student_daily_tasks_id_seq'::regclass);


--
-- Name: student_knowledge_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_knowledge_stats ALTER COLUMN id SET DEFAULT nextval('public.student_knowledge_stats_id_seq'::regclass);


--
-- Name: student_login_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_login_history ALTER COLUMN id SET DEFAULT nextval('public.student_login_history_id_seq'::regclass);


--
-- Name: student_registration_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests ALTER COLUMN id SET DEFAULT nextval('public.student_registration_requests_id_seq'::regclass);


--
-- Name: student_task_progress progress_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_task_progress ALTER COLUMN progress_id SET DEFAULT nextval('public.student_task_progress_progress_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: system_announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_announcements ALTER COLUMN id SET DEFAULT nextval('public.system_announcements_id_seq'::regclass);


--
-- Name: task_completion_history history_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_completion_history ALTER COLUMN history_id SET DEFAULT nextval('public.task_completion_history_history_id_seq'::regclass);


--
-- Name: teacher_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions ALTER COLUMN id SET DEFAULT nextval('public.teacher_permissions_id_seq'::regclass);


--
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- Name: teaching_class_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_activities ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_activities_id_seq'::regclass);


--
-- Name: teaching_class_approvals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_approvals ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_approvals_id_seq'::regclass);


--
-- Name: teaching_class_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_members ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_members_id_seq'::regclass);


--
-- Name: teaching_class_teachers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_teachers ALTER COLUMN id SET DEFAULT nextval('public.teaching_class_teachers_id_seq'::regclass);


--
-- Name: teaching_classes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_classes ALTER COLUMN id SET DEFAULT nextval('public.teaching_classes_id_seq'::regclass);


--
-- Name: user_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications ALTER COLUMN id SET DEFAULT nextval('public.user_notifications_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: achievement_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievement_progress (id, student_id, achievement_id, current_value, target_value, progress_percentage, last_updated) FROM stdin;
\.


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievements (achievement_id, achievement_code, achievement_name, achievement_desc, achievement_icon, category, subcategory, rarity, points_reward, trigger_condition, is_hidden, is_active, max_times, cooldown_days, valid_from, valid_to, display_order, created_by, created_at, updated_at) FROM stdin;
1	FIRST_BLOOD	第一滴血	首次通过任意级别认证	🏆	exam_certification	first_time	common	50	{"event_name": "student.activity.completed", "condition_type": "count", "threshold": 1, "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.414057	2025-11-09 12:35:32.414057
2	PERFECT_SCORE_BRONZE	完美答卷·铜	获得满分（铜级认证）	🥉	exam_certification	perfect_score	common	100	{"event_name": "student.high.score", "condition_type": "threshold", "threshold": 100, "grade_level": "bronze", "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.414057	2025-11-09 12:35:32.414057
3	PASS_10_EXAMS	十全十美	通过10次认证	✅	exam_certification	milestone	common	200	{"event_name": "student.activity.completed", "condition_type": "count", "threshold": 10, "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.414057	2025-11-09 12:35:32.414057
4	PERFECT_SCORE_SILVER	完美答卷·银	获得满分（银级认证）	🥈	exam_certification	perfect_score	rare	200	{"event_name": "student.high.score", "condition_type": "threshold", "threshold": 100, "grade_level": "silver", "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.417995	2025-11-09 12:35:32.417995
5	TRIPLE_CROWN	三冠王	在数学、语文、英语三个科目均获得金级认证	👑	exam_certification	multi_subject	rare	300	{"event_name": "student.multi.subject", "condition_type": "combination", "operator": "AND", "conditions": [{"subject": "数学", "grade": "gold"}, {"subject": "语文", "grade": "gold"}, {"subject": "英语", "grade": "gold"}], "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.417995	2025-11-09 12:35:32.417995
6	PERFECT_SCORE_GOLD	完美答卷·金	获得满分（金级认证）	🥇	exam_certification	perfect_score	epic	500	{"event_name": "student.high.score", "condition_type": "threshold", "threshold": 100, "grade_level": "gold", "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.418806	2025-11-09 12:35:32.418806
7	GRAND_SLAM	大满贯	在所有主要科目均获得金级认证	🏅	exam_certification	multi_subject	epic	800	{"event_name": "student.all.subjects.gold", "condition_type": "state", "target_value": "all_gold", "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.418806	2025-11-09 12:35:32.418806
8	PERFECT_YEAR	完美学年	一学年内所有认证均满分	⭐	exam_certification	long_term	legendary	1500	{"event_name": "student.year.perfect", "condition_type": "state", "target_value": "year_perfect", "trigger_mode": "scheduled"}	t	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.419553	2025-11-09 12:35:32.419553
9	DAILY_LOGIN_7	坚持七天	连续登录7天	📅	learning_growth	daily_task	common	50	{"event_name": "student.login", "condition_type": "count", "threshold": 7, "consecutive": true, "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.420265	2025-11-09 12:35:32.420265
10	COMPLETE_100_QUESTIONS	百题斩	完成100道练习题	📝	learning_growth	practice	common	100	{"event_name": "student.question.completed", "condition_type": "count", "threshold": 100, "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.420265	2025-11-09 12:35:32.420265
11	FAST_LEARNER	速度之星	在10分钟内完成一次练习（至少20题）	⚡	learning_growth	speed	common	80	{"event_name": "student.practice.fast", "condition_type": "threshold", "max_time": 600, "min_questions": 20, "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.420265	2025-11-09 12:35:32.420265
12	DAILY_LOGIN_30	坚持一月	连续登录30天	🗓️	learning_growth	daily_task	rare	300	{"event_name": "student.login", "condition_type": "count", "threshold": 30, "consecutive": true, "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.421041	2025-11-09 12:35:32.421041
13	ACCURACY_MASTER	精准大师	练习正确率达到95%（至少50题）	🎯	learning_growth	accuracy	rare	250	{"event_name": "student.practice.accuracy", "condition_type": "threshold", "threshold": 95, "min_questions": 50, "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.421041	2025-11-09 12:35:32.421041
14	DAILY_LOGIN_100	百日坚持	连续登录100天	🏆	learning_growth	daily_task	epic	1000	{"event_name": "student.login", "condition_type": "count", "threshold": 100, "consecutive": true, "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.421743	2025-11-09 12:35:32.421743
15	KNOWLEDGE_MASTER	知识大师	在某一科目完成1000道练习题	📚	learning_growth	practice	epic	800	{"event_name": "student.subject.questions", "condition_type": "count", "threshold": 1000, "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.421743	2025-11-09 12:35:32.421743
16	HELPFUL_STUDENT	乐于助人	帮助同学解答问题3次	🤝	social_collaboration	help	common	60	{"event_name": "student.help.others", "condition_type": "count", "threshold": 3, "trigger_mode": "realtime"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.422453	2025-11-09 12:35:32.422453
17	TOP_10_RANK	进入前十	在班级排行榜进入前10名	🏅	social_collaboration	competition	rare	200	{"event_name": "student.rank.update", "condition_type": "threshold", "max_rank": 10, "scope": "class", "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.42313	2025-11-09 12:35:32.42313
18	CLASS_CHAMPION	班级冠军	在班级排行榜排名第一	👑	social_collaboration	competition	epic	500	{"event_name": "student.rank.update", "condition_type": "threshold", "max_rank": 1, "scope": "class", "trigger_mode": "scheduled"}	f	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.423761	2025-11-09 12:35:32.423761
19	LEGEND_OF_GUIYANG	贵阳传奇	在市级排行榜排名第一	🌟	social_collaboration	competition	mythic	5000	{"event_name": "student.rank.update", "condition_type": "threshold", "max_rank": 1, "scope": "city", "trigger_mode": "scheduled"}	t	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.425356	2025-11-09 12:35:32.425356
20	ULTIMATE_SCHOLAR	终极学者	获得所有其他成就	💎	special_event	collection	mythic	10000	{"event_name": "student.all.achievements", "condition_type": "state", "target_value": "all_collected", "trigger_mode": "scheduled"}	t	t	1	\N	\N	\N	0	\N	2025-11-09 12:35:32.425356	2025-11-09 12:35:32.425356
31	WINTER_FESTIVAL_2025	2025冬季节日	在冬季节日活动期间完成特定任务	❄️	special_event	seasonal	rare	300	{"event_name": "student.event.winter", "condition_type": "state", "target_value": "completed", "trigger_mode": "realtime"}	f	t	1	\N	2025-12-01 00:00:00	2026-02-28 00:00:00	0	\N	2025-11-09 12:50:16.618793	2025-11-09 12:50:16.618793
32	EARLY_BIRD	早起的鸟儿	在上午6-8点完成练习	🌅	special_event	time_based	rare	150	{"event_name": "student.practice.morning", "condition_type": "state", "target_value": "morning_practice", "hour_range": [6, 8], "trigger_mode": "realtime"}	f	t	999	\N	\N	\N	0	\N	2025-11-09 12:50:16.619645	2025-11-09 12:50:16.619645
34	EXAM_FIRST_ANY	第一滴血	首次通过任意级别认证测评	/images/achievements/first_blood.png	exam_certification	first_breakthrough	common	50	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	10	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
35	EXAM_FIRST_L1	初识认证	首次通过1级能力认证测评	/images/achievements/first_pass_level_1.png	exam_certification	first_breakthrough	common	20	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "ability_level": "1",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	11	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
36	EXAM_FIRST_L2	进阶之路	首次通过2级能力认证测评	/images/achievements/first_pass_level_2.png	exam_certification	first_breakthrough	common	40	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "ability_level": "2",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	12	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
37	EXAM_FIRST_L3	稳步前行	首次通过3级能力认证测评	/images/achievements/first_pass_level_3.png	exam_certification	first_breakthrough	common	60	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "ability_level": "3",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	13	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
38	EXAM_FIRST_L4	实力证明	首次通过4级能力认证测评	/images/achievements/first_pass_level_4.png	exam_certification	first_breakthrough	rare	80	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "ability_level": "4",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	14	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
39	EXAM_FIRST_L5	优秀标准	首次通过5级能力认证测评	/images/achievements/first_pass_level_5.png	exam_certification	first_breakthrough	rare	100	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "ability_level": "5",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	15	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
40	EXAM_FIRST_L6	卓越征途	首次通过6级能力认证测评	/images/achievements/first_pass_level_6.png	exam_certification	first_breakthrough	epic	120	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "ability_level": "6",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	16	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
41	EXAM_FIRST_L7	王者降临	首次通过7级能力认证测评	/images/achievements/first_pass_level_7.png	exam_certification	first_breakthrough	epic	140	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true,\r\n    "filter": {\r\n      "type": "certification",\r\n      "ability_level": "7",\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	17	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
42	EXAM_FIRST_PERFECT	满分学霸	单次练习获得满分	/images/achievements/perfect_score.png	exam_certification	first_breakthrough	rare	150	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.perfect.score",\r\n    "filter": {\r\n      "type": "practice",\r\n      "score": 100\r\n    }\r\n  }	f	t	1	\N	\N	\N	18	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
43	EXAM_FIRST_COMPLETE	初体验	首次完成测评活动	/images/achievements/first_complete.png	exam_certification	first_breakthrough	common	30	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "state",\r\n    "event_name": "student.activity.completed",\r\n    "first_time": true\r\n  }	f	t	1	\N	\N	\N	9	\N	2025-11-14 03:12:14.529887	2025-11-14 03:12:14.529887
44	LEARN_TIME_10H	初入学堂	累计学习时长达到10小时	/images/achievements/learning_10h.png	learning_growth	learning_duration	common	20	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "threshold",\r\n    "event_name": "student.learning.duration",\r\n    "metric": "total_learning_minutes",\r\n    "operator": ">=",\r\n    "threshold": 600\r\n  }	f	t	1	\N	\N	\N	100	\N	2025-11-14 03:12:14.539736	2025-11-14 03:12:14.539736
45	LEARN_TIME_50H	勤学苦练	累计学习时长达到50小时	/images/achievements/learning_50h.png	learning_growth	learning_duration	common	100	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "threshold",\r\n    "event_name": "student.learning.duration",\r\n    "metric": "total_learning_minutes",\r\n    "operator": ">=",\r\n    "threshold": 3000\r\n  }	f	t	1	\N	\N	\N	101	\N	2025-11-14 03:12:14.539736	2025-11-14 03:12:14.539736
46	LEARN_TIME_100H	百时功勋	累计学习时长达到100小时	/images/achievements/learning_100h.png	learning_growth	learning_duration	rare	200	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "threshold",\r\n    "event_name": "student.learning.duration",\r\n    "metric": "total_learning_minutes",\r\n    "operator": ">=",\r\n    "threshold": 6000\r\n  }	f	t	1	\N	\N	\N	102	\N	2025-11-14 03:12:14.539736	2025-11-14 03:12:14.539736
47	LEARN_TIME_200H	勤奋标兵	累计学习时长达到200小时	/images/achievements/learning_200h.png	learning_growth	learning_duration	rare	400	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "threshold",\r\n    "event_name": "student.learning.duration",\r\n    "metric": "total_learning_minutes",\r\n    "operator": ">=",\r\n    "threshold": 12000\r\n  }	f	t	1	\N	\N	\N	103	\N	2025-11-14 03:12:14.539736	2025-11-14 03:12:14.539736
48	LEARN_TIME_500H	时间管理大师	累计学习时长达到500小时	/images/achievements/learning_500h.png	learning_growth	learning_duration	epic	1000	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "threshold",\r\n    "event_name": "student.learning.duration",\r\n    "metric": "total_learning_minutes",\r\n    "operator": ">=",\r\n    "threshold": 30000\r\n  }	f	t	1	\N	\N	\N	104	\N	2025-11-14 03:12:14.539736	2025-11-14 03:12:14.539736
49	LEARN_TIME_1000H	万时传奇	累计学习时长达到1000小时	/images/achievements/learning_1000h.png	learning_growth	learning_duration	legendary	2000	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "threshold",\r\n    "event_name": "student.learning.duration",\r\n    "metric": "total_learning_minutes",\r\n    "operator": ">=",\r\n    "threshold": 60000\r\n  }	f	t	1	\N	\N	\N	105	\N	2025-11-14 03:12:14.539736	2025-11-14 03:12:14.539736
51	LOGIN_STREAK_7	七日之志	连续7天登录学习平台	/images/achievements/consecutive_7d.png	learning_growth	learning_frequency	common	35	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "consecutive",\r\n    "event_name": "student.login",\r\n    "consecutive_days": 7\r\n  }	f	t	1	\N	\N	\N	201	\N	2025-11-14 03:12:14.541802	2025-11-14 03:12:14.541802
52	LOGIN_STREAK_14	半月坚持	连续14天登录学习平台	/images/achievements/consecutive_14d.png	learning_growth	learning_frequency	rare	70	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "consecutive",\r\n    "event_name": "student.login",\r\n    "consecutive_days": 14\r\n  }	f	t	1	\N	\N	\N	202	\N	2025-11-14 03:12:14.541802	2025-11-14 03:12:14.541802
53	LOGIN_STREAK_30	月度冠军	连续30天登录学习平台	/images/achievements/consecutive_30d.png	learning_growth	learning_frequency	rare	150	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "consecutive",\r\n    "event_name": "student.login",\r\n    "consecutive_days": 30\r\n  }	f	t	1	\N	\N	\N	203	\N	2025-11-14 03:12:14.541802	2025-11-14 03:12:14.541802
54	LOGIN_STREAK_60	双月英雄	连续60天登录学习平台	/images/achievements/consecutive_60d.png	learning_growth	learning_frequency	epic	300	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "consecutive",\r\n    "event_name": "student.login",\r\n    "consecutive_days": 60\r\n  }	f	t	1	\N	\N	\N	204	\N	2025-11-14 03:12:14.541802	2025-11-14 03:12:14.541802
55	LOGIN_STREAK_100	百日传说	连续100天登录学习平台	/images/achievements/consecutive_100d.png	learning_growth	learning_frequency	legendary	500	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "consecutive",\r\n    "event_name": "student.login",\r\n    "consecutive_days": 100\r\n  }	f	t	1	\N	\N	\N	205	\N	2025-11-14 03:12:14.541802	2025-11-14 03:12:14.541802
56	PASS_STREAK_3	连续通过3次	连续通过3次认证测评（任意级别）	/images/achievements/consecutive_pass_3.png	exam_certification	consecutive_success	common	120	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "count",\r\n    "event_name": "student.activity.completed",\r\n    "target_count": 3,\r\n    "consecutive": true,\r\n    "filter": {\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	300	\N	2025-11-14 03:12:14.542749	2025-11-14 03:12:14.542749
57	PASS_STREAK_5	连续通过5次	连续通过5次认证测评（任意级别）	/images/achievements/consecutive_pass_5.png	exam_certification	consecutive_success	rare	200	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "count",\r\n    "event_name": "student.activity.completed",\r\n    "target_count": 5,\r\n    "consecutive": true,\r\n    "filter": {\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	301	\N	2025-11-14 03:12:14.542749	2025-11-14 03:12:14.542749
58	PASS_STREAK_10	钻石品质	连续通过10次认证测评（任意级别）	/images/achievements/consecutive_pass_10.png	exam_certification	consecutive_success	epic	400	{\r\n    "trigger_mode": "real_time",\r\n    "trigger_frequency": "real_time",\r\n    "condition_type": "count",\r\n    "event_name": "student.activity.completed",\r\n    "target_count": 10,\r\n    "consecutive": true,\r\n    "filter": {\r\n      "status": "passed"\r\n    }\r\n  }	f	t	1	\N	\N	\N	302	\N	2025-11-14 03:12:14.542749	2025-11-14 03:12:14.542749
59	EVENT_NEWYEAR	新年新气象	春节期间连续7天学习	/images/achievements/newyear.png	special_event	holiday	rare	200	{\r\n    "trigger_mode": "scheduled",\r\n    "trigger_frequency": "daily",\r\n    "trigger_time": "00:10:00",\r\n    "condition_type": "time_window",\r\n    "event_name": "student.login",\r\n    "time_window": {\r\n      "type": "date_range",\r\n      "start": "${LUNAR_NEW_YEAR}",\r\n      "end": "${LUNAR_NEW_YEAR_END}"\r\n    },\r\n    "consecutive_days": 7\r\n  }	f	t	999	365	\N	\N	400	\N	2025-11-14 03:12:14.543655	2025-11-14 03:12:14.543655
60	SOCIAL_COMMENT_10	初露锋芒	发表10条有价值的评论	💬	social_collaboration	interaction	common	50	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.comment.created",\r\n        "target_count": 10\r\n    }	f	t	1	\N	\N	\N	501	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
61	SOCIAL_COMMENT_50	评论达人	发表50条有价值的评论	💬	social_collaboration	interaction	rare	200	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.comment.created",\r\n        "target_count": 50\r\n    }	f	t	1	\N	\N	\N	502	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
62	SOCIAL_HELP_ANSWER_10	乐于助人	回答10个同学的问题	🤝	social_collaboration	help	common	100	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.answer.created",\r\n        "target_count": 10\r\n    }	f	t	1	\N	\N	\N	503	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
63	SOCIAL_LIKE_RECEIVED_50	受人喜爱	你的评论收到50个赞	👍	social_collaboration	recognition	rare	150	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.comment.liked",\r\n        "target_count": 50\r\n    }	f	t	1	\N	\N	\N	504	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
64	SOCIAL_SHARE_EXPERIENCE	知识分享者	分享5次学习经验或心得	📚	social_collaboration	sharing	rare	200	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.experience.shared",\r\n        "target_count": 5\r\n    }	f	t	1	\N	\N	\N	505	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
65	EVENT_SPRING_FESTIVAL	春节快乐	在春节期间登录系统	🧧	special_event	holiday	epic	300	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "state",\r\n        "event_name": "student.login",\r\n        "first_time": true,\r\n        "time_window": {\r\n            "start": "CURRENT_YEAR-02-01",\r\n            "end": "CURRENT_YEAR-02-15"\r\n        }\r\n    }	f	t	1	\N	2025-02-01 00:00:00	2099-12-31 00:00:00	601	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
66	EVENT_CHILDRENS_DAY	快乐童年	在六一儿童节登录系统	🎈	special_event	holiday	rare	200	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "state",\r\n        "event_name": "student.login",\r\n        "first_time": true,\r\n        "time_window": {\r\n            "start": "CURRENT_YEAR-06-01",\r\n            "end": "CURRENT_YEAR-06-01"\r\n        }\r\n    }	f	t	1	\N	2025-06-01 00:00:00	2099-12-31 00:00:00	602	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
67	EVENT_SUMMER_LEARNING	暑假学霸	暑假期间完成10次练习	☀️	special_event	seasonal	rare	250	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.activity.completed",\r\n        "target_count": 10,\r\n        "filter": {\r\n            "activity_type": "practice"\r\n        },\r\n        "time_window": {\r\n            "start": "CURRENT_YEAR-07-01",\r\n            "end": "CURRENT_YEAR-08-31"\r\n        }\r\n    }	f	t	1	\N	2025-07-01 00:00:00	2099-12-31 00:00:00	603	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
68	LEARN_WEEKLY_STREAK_4	月度坚持	连续4周每周至少学习3次	📅	learning_growth	habit	epic	400	{\r\n        "trigger_mode": "scheduled",\r\n        "condition_type": "consecutive",\r\n        "event_name": "student.weekly.learning",\r\n        "consecutive_weeks": 4,\r\n        "min_learning_days": 3\r\n    }	f	t	1	\N	\N	\N	301	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
69	LEARN_ACCURACY_IMPROVE	精益求精	单次测评正确率从60%提升到90%以上	📈	learning_growth	improvement	rare	200	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "threshold",\r\n        "event_name": "student.activity.completed",\r\n        "threshold_value": 90,\r\n        "threshold_field": "accuracy",\r\n        "filter": {\r\n            "activity_type": "assessment",\r\n            "status": "passed"\r\n        }\r\n    }	f	t	1	\N	\N	\N	302	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
70	EXAM_LEVEL_UP_3	进阶之路	能力等级从1级提升到3级	⬆️	exam_certification	progression	rare	300	{\r\n        "trigger_mode": "real_time",\r\n        "condition_type": "state",\r\n        "event_name": "student.level.upgraded",\r\n        "filter": {\r\n            "from_level": 1,\r\n            "to_level": 3\r\n        }\r\n    }	f	t	1	\N	\N	\N	121	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
71	EXAM_CROSS_SUBJECT	全能学霸	通过3个不同学科的认证	🌟	exam_certification	cross_subject	epic	500	{\r\n        "trigger_mode": "scheduled",\r\n        "condition_type": "and",\r\n        "sub_conditions": [\r\n            {\r\n                "condition_type": "count",\r\n                "event_name": "student.certification.passed",\r\n                "target_count": 3,\r\n                "distinct_field": "subject"\r\n            }\r\n        ]\r\n    }	f	t	1	\N	\N	\N	122	\N	2025-11-14 12:38:20.345423	2025-11-14 12:38:20.345423
50	LOGIN_STREAK_3	三日之约	连续3天登录学习平台	/uploads/achievements/achievement-1763178805547-396156105.jpg	learning_growth	learning_frequency	common	15	{"trigger_mode":"scheduled","condition_type":"consecutive","event_name":"student.login","consecutive_days":3}	f	t	1	0	\N	\N	200	\N	2025-11-14 03:12:14.541802	2025-11-15 03:53:28.650913
72	PRACTICE_FIRST	初试锋芒	完成第1次练习活动	\N	learning_growth	练习进度	common	10	{\r\n        "trigger_mode": "real_time",\r\n        "trigger_frequency": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.activity.completed",\r\n        "threshold": 1,\r\n        "filter": {\r\n            "type": "practice",\r\n            "status": "submitted"\r\n        }\r\n    }	f	t	1	\N	\N	\N	100	1	2025-11-20 15:11:48.60907	2025-11-20 15:11:48.60907
73	PRACTICE_5	勤学苦练	完成5次练习活动	\N	learning_growth	练习进度	rare	50	{\r\n        "trigger_mode": "real_time",\r\n        "trigger_frequency": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.activity.completed",\r\n        "threshold": 5,\r\n        "filter": {\r\n            "type": "practice",\r\n            "status": "submitted"\r\n        }\r\n    }	f	t	1	\N	\N	\N	101	1	2025-11-20 15:11:48.60907	2025-11-20 15:11:48.60907
74	PRACTICE_10	百炼成钢	完成10次练习活动	\N	learning_growth	练习进度	epic	100	{\r\n        "trigger_mode": "real_time",\r\n        "trigger_frequency": "real_time",\r\n        "condition_type": "count",\r\n        "event_name": "student.activity.completed",\r\n        "threshold": 10,\r\n        "filter": {\r\n            "type": "practice",\r\n            "status": "submitted"\r\n        }\r\n    }	f	t	1	\N	\N	\N	102	1	2025-11-20 15:11:48.60907	2025-11-20 15:11:48.60907
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by, created_at, updated_at, type, ability_level, scope, allow_retake, max_attempts, is_official, target_audience, certificate_config, time_limit_type, question_count, paper_status, registration_enabled, registration_start_time, registration_end_time, max_participants, require_location) FROM stdin;
152	APB002-区级管理员测试-1762364225395	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	2	2025-11-05 17:37:05.398869	2025-11-05 17:37:05.398869	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
297	测试-校级	校级测试	数学	二年级	\N	\N	\N	5	10	draft	39	2025-11-29 15:22:49.494704	2025-11-30 12:01:30.211775	practice	L1	school	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	1	completed	f	\N	\N	\N	f
31	API测试-测评活动	这是一个API测试创建的测评活动	数学	五年级	\N	\N	\N	100	70	cancelled	1	2025-10-21 14:09:39.871067	2025-11-03 12:35:55.329083	assessment	L5	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": true, "template": "standard"}	unlimited	0	empty	f	\N	\N	\N	f
153	APB003-基地校管理员测试-1762364225408	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	8	2025-11-05 17:37:05.411997	2025-11-05 17:37:05.411997	assessment	L3	base_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
154	APB004-市直学校管理员测试-1762364225414	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	7	2025-11-05 17:37:05.417205	2025-11-05 17:37:05.417205	assessment	L3	municipal_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
174	APB006-基地校管理员测评-1762364467760	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	8	2025-11-05 17:41:07.763888	2025-11-05 17:41:07.763888	assessment	L3	base_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
175	APB006-市直学校管理员测评-1762364467764	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	7	2025-11-05 17:41:07.768044	2025-11-05 17:41:07.768044	assessment	L3	municipal_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
183	APB002-区级管理员测试-1762364669097	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	2	2025-11-05 17:44:29.101068	2025-11-05 17:44:29.101068	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
298	测试组卷功能-二年级数学	\N	数学	二年级	\N	\N	\N	5	60	cancelled	39	2025-11-29 15:49:52.278633	2025-11-29 15:50:35.542147	practice	L1	school	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	1	completed	f	\N	\N	\N	f
39	Test Activity 1761209695135	\N	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-23 08:54:55.433443	2025-11-03 12:34:32.781246	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
158	APB006-区级管理员测评-1762364225442	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	2	2025-11-05 17:37:05.445935	2025-11-05 17:37:05.445935	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
159	APB006-基地校管理员测评-1762364225447	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	8	2025-11-05 17:37:05.450384	2025-11-05 17:37:05.450384	assessment	L3	base_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
160	APB006-市直学校管理员测评-1762364225452	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	7	2025-11-05 17:37:05.454979	2025-11-05 17:37:05.454979	assessment	L3	municipal_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
43	Test Activity 1761209795276	\N	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-23 08:56:35.498092	2025-11-03 12:34:29.463393	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
29	API测试-测评活动	这是一个API测试创建的测评活动	数学	五年级	\N	\N	\N	100	70	cancelled	1	2025-10-21 14:07:56.265625	2025-11-03 12:35:58.504292	assessment	\N	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": true, "template": "standard"}	unlimited	0	empty	f	\N	\N	\N	f
167	APB002-区级管理员测试-1762364467714	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	2	2025-11-05 17:41:07.719216	2025-11-05 17:41:07.719216	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
168	APB003-基地校管理员测试-1762364467722	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	8	2025-11-05 17:41:07.726309	2025-11-05 17:41:07.726309	assessment	L3	base_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
169	APB004-市直学校管理员测试-1762364467727	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	7	2025-11-05 17:41:07.731394	2025-11-05 17:41:07.731394	assessment	L3	municipal_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
184	APB003-基地校管理员测试-1762364669103	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	8	2025-11-05 17:44:29.106659	2025-11-05 17:44:29.106659	assessment	L3	base_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
185	APB004-市直学校管理员测试-1762364669108	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	7	2025-11-05 17:44:29.111594	2025-11-05 17:44:29.111594	assessment	L3	municipal_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
186	APB005-系统管理员测试-1762364669112	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	1	2025-11-05 17:44:29.115244	2025-11-05 17:44:29.115244	assessment	L3	system	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
189	APB006-区级管理员测评-1762364669124	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	2	2025-11-05 17:44:29.127075	2025-11-05 17:44:29.127075	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
190	APB006-基地校管理员测评-1762364669127	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	8	2025-11-05 17:44:29.13055	2025-11-05 17:44:29.13055	assessment	L3	base_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
191	APB006-市直学校管理员测评-1762364669131	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	7	2025-11-05 17:44:29.134033	2025-11-05 17:44:29.134033	assessment	L3	municipal_school	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
173	APB006-区级管理员测评-1762364467756	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	2	2025-11-05 17:41:07.759826	2025-11-05 17:41:07.759826	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
85	ACT131-统计查看-1761560278241	ACT131测试活动-查看统计	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-27 10:18:01.778579	2025-11-03 12:33:30.580038	assessment	L3	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
78	Regression测试-测评活动-1761394892259	这是一个自动化回归测试创建的测评活动	数学	四年级	\N	\N	\N	100	60	cancelled	1	2025-10-25 12:21:35.005899	2025-11-03 12:33:36.576715	assessment	L4	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
77	ACT131-统计查看-1761394890958	ACT131测试活动-查看统计	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-25 12:21:34.610055	2025-11-03 12:33:39.781665	assessment	L3	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	f
192	APB006-系统管理员测评-1762364669134	测试用测评活动	数学	三年级	\N	\N	\N	100	60	draft	1	2025-11-05 17:44:29.137593	2025-11-30 15:59:31.422701	assessment	L3	system	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty	f	\N	\N	\N	t
\.


--
-- Data for Name: activity_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_history (id, activity_id, action, changed_by, old_values, new_values, created_at) FROM stdin;
\.


--
-- Data for Name: activity_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_questions (id, activity_id, question_id, order_index, score, created_at, updated_at) FROM stdin;
319	298	1161	1	5.00	2025-11-29 15:50:23.690334	2025-11-29 15:50:23.690334
321	297	613	1	5.00	2025-11-30 05:39:26.94945	2025-11-30 05:39:26.94945
\.


--
-- Data for Name: admin_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_permissions (id, user_id, school_id, district_id, permission_scope, created_at) FROM stdin;
1	2	\N	1	{"schools": "all", "district": "云岩区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-09-24 15:09:18.522936
2	3	\N	2	{"schools": "all", "district": "南明区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-09-24 15:09:18.522936
3	4	\N	3	{"schools": "all", "district": "观山湖区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-09-24 15:09:18.522936
8	16	\N	1	{"schools": "all", "district": "云岩区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-10-04 15:11:20.216102
9	33	\N	\N	{"scope": "municipal", "canManage": ["districts", "schools", "users"]}	2025-10-27 15:27:01.188416
10	34	\N	8	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
11	35	\N	9	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
12	36	\N	10	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
13	37	\N	11	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
14	38	\N	12	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
4	5	1	1	{"school": "贵阳市第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-09-24 15:09:18.524321
7	15	2	2	{"permissions": ["manage_students", "manage_exams", "view_reports", "export_data"]}	2025-10-04 15:11:20.154128
5	6	2	2	{"school": "贵阳市第二小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-09-24 15:09:18.524321
6	8	5	3	{"school": "贵阳市信息技术基地校", "permissions": ["manage_students", "manage_teachers", "manage_exams", "manage_level_5_6_exams", "view_reports"]}	2025-09-24 15:09:18.525151
15	39	6	1	{"school": "云岩区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
16	41	7	1	{"school": "云岩区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
17	43	8	1	{"school": "云岩区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
18	45	9	2	{"school": "南明区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
19	47	10	2	{"school": "南明区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
51	145	\N	4	{"review_subjects": ["数学", "信息科技"], "can_manage_teachers": true, "can_view_statistics": true, "can_reject_questions": true, "can_review_questions": true, "can_approve_questions": true}	2025-11-02 08:38:09.282366
52	2	\N	1	{"schools": "all", "district": "云岩区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-11-04 15:06:11.775418
53	3	\N	2	{"schools": "all", "district": "南明区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-11-04 15:06:11.775418
54	4	\N	3	{"schools": "all", "district": "观山湖区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-11-04 15:06:11.775418
55	5	1	1	{"school": "贵阳市第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-11-04 15:06:11.779327
56	6	2	2	{"school": "贵阳市第二小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-11-04 15:06:11.779327
57	8	5	3	{"school": "贵阳市信息技术基地校", "permissions": ["manage_students", "manage_teachers", "manage_exams", "manage_level_5_6_exams", "view_reports"]}	2025-11-04 15:06:11.780111
20	49	11	2	{"school": "南明区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
21	51	12	3	{"school": "观山湖区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
22	53	13	3	{"school": "观山湖区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
23	55	14	3	{"school": "观山湖区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
24	57	15	4	{"school": "白云区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
25	59	16	4	{"school": "白云区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
26	61	17	4	{"school": "白云区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
27	63	18	5	{"school": "花溪区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
28	65	19	5	{"school": "花溪区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
29	67	20	5	{"school": "花溪区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
30	69	21	6	{"school": "乌当区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
31	71	22	6	{"school": "乌当区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
32	73	23	6	{"school": "乌当区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
33	75	24	8	{"school": "清镇市第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
34	77	25	8	{"school": "清镇市第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
35	79	26	8	{"school": "清镇市第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
36	81	27	9	{"school": "修文县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
37	83	28	9	{"school": "修文县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
38	85	29	9	{"school": "修文县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
39	87	30	10	{"school": "息烽县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
40	89	31	10	{"school": "息烽县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
41	91	32	10	{"school": "息烽县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
42	93	33	11	{"school": "开阳县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
43	95	34	11	{"school": "开阳县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
44	97	35	11	{"school": "开阳县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
45	99	36	12	{"school": "贵安新区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
46	101	37	12	{"school": "贵安新区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
47	103	38	12	{"school": "贵安新区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
48	105	39	13	{"school": "贵阳市直属第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
49	107	40	13	{"school": "贵阳市直属第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
50	109	41	13	{"school": "贵阳市直属第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
\.


--
-- Data for Name: announcement_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcement_reads (id, announcement_id, user_id, read_at) FROM stdin;
\.


--
-- Data for Name: answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.answers (id, student_exam_id, question_id, answer, is_correct, score, graded_by, graded_at, created_at, updated_at, grading_status, feedback, auto_score, manual_score) FROM stdin;
\.


--
-- Data for Name: assessment_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_locations (id, activity_id, name, address, district_id, capacity, registered_count, contact_name, contact_phone, exam_date, exam_time_start, exam_time_end, check_in_time, notes, is_active, created_by, created_at, updated_at) FROM stdin;
1	192	Test Location 20251130235724	Test Address 123	\N	30	0	Test Teacher	13800000001	2025-12-15	09:00:00	11:00:00	08:30:00	API test location	t	\N	2025-11-30 15:57:24.934653	2025-11-30 15:57:24.934653
2	192	Test Location 20251130235856	Test Address 123	\N	30	0	Test Teacher	13800000001	2025-12-15	09:00:00	11:00:00	08:30:00	API test location	t	\N	2025-11-30 15:58:56.96537	2025-11-30 15:58:56.96537
3	192	Test Location 20251130235931	Test Address 123	\N	30	0	Test Teacher	13800000001	2025-12-15	09:00:00	11:00:00	08:30:00	API test location	t	\N	2025-11-30 15:59:31.421186	2025-11-30 15:59:31.421186
\.


--
-- Data for Name: assessment_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_registrations (id, activity_id, student_id, location_id, status, registered_at, confirmed_at, cancelled_at, cancel_reason, cancelled_by, reviewed_at, reviewed_by, review_notes, student_activity_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, target_type, target_id, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificates (id, student_id, exam_id, cert_no, issue_date, level, file_url, created_at) FROM stdin;
\.


--
-- Data for Name: daily_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_tasks (task_id, task_code, task_name, task_desc, task_icon, points_reward, task_type, trigger_condition, target_value, is_active, display_order, created_at, updated_at, category, bonus_points, progress_type, reset_period, reset_time, valid_from, valid_to) FROM stdin;
5	DAILY_LOGIN	每日登录	每天至少登录一次系统	📅	10	login	{"event_name": "student.login", "condition_type": "count", "threshold": 1}	1	t	1	2025-11-09 14:12:21.537237	2025-11-09 14:12:21.537237	daily	5	count	daily	00:00:00	\N	\N
6	DAILY_PRACTICE_5	每日练习5题	每天完成至少5道练习题	📝	20	practice	{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 5}	5	t	2	2025-11-09 14:12:21.537237	2025-11-09 14:12:21.537237	daily	10	count	daily	00:00:00	\N	\N
7	DAILY_PRACTICE_10	每日练习10题	每天完成至少10道练习题	✍️	40	practice	{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 10}	10	t	3	2025-11-09 14:12:21.537237	2025-11-09 14:12:21.537237	daily	20	count	daily	00:00:00	\N	\N
8	DAILY_EXAM	每日测评	每天完成至少1次测评活动	📋	50	exam	{"event_name": "student.exam.completed", "condition_type": "count", "threshold": 1}	1	t	4	2025-11-09 14:12:21.537237	2025-11-09 14:12:21.537237	daily	25	count	daily	00:00:00	\N	\N
9	DAILY_ACCURACY_80	今日正确率达80%	当天练习正确率达到80%以上	🎯	30	practice	{"event_name": "student.daily.accuracy", "condition_type": "threshold", "threshold": 80}	80	t	5	2025-11-09 14:12:21.537237	2025-11-09 14:12:21.537237	daily	15	score	daily	00:00:00	\N	\N
10	WEEKLY_LOGIN_5	一周登录5天	一周内登录至少5天	🗓️	100	login	{"event_name": "student.weekly.login.days", "condition_type": "count", "threshold": 5}	5	t	10	2025-11-09 14:12:21.540485	2025-11-09 14:12:21.540485	weekly	50	count	weekly	00:00:00	\N	\N
11	WEEKLY_PRACTICE_50	一周练习50题	一周内完成至少50道练习题	📚	150	practice	{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 50}	50	t	11	2025-11-09 14:12:21.540485	2025-11-09 14:12:21.540485	weekly	75	count	weekly	00:00:00	\N	\N
12	WEEKLY_PRACTICE_100	一周练习100题	一周内完成至少100道练习题	🎓	300	practice	{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 100}	100	t	12	2025-11-09 14:12:21.540485	2025-11-09 14:12:21.540485	weekly	150	count	weekly	00:00:00	\N	\N
13	WEEKLY_EXAM_3	一周完成3次测评	一周内完成至少3次测评活动	📊	200	exam	{"event_name": "student.exam.completed", "condition_type": "count", "threshold": 3}	3	t	13	2025-11-09 14:12:21.540485	2025-11-09 14:12:21.540485	weekly	100	count	weekly	00:00:00	\N	\N
14	WEEKLY_ACCURACY_85	本周正确率达85%	本周总体练习正确率达到85%以上	🌟	250	practice	{"event_name": "student.weekly.accuracy", "condition_type": "threshold", "threshold": 85}	85	t	14	2025-11-09 14:12:21.540485	2025-11-09 14:12:21.540485	weekly	125	score	weekly	00:00:00	\N	\N
15	MONTHLY_LOGIN_20	本月登录20天	本月内登录至少20天	📆	500	login	{"event_name": "student.monthly.login.days", "condition_type": "count", "threshold": 20}	20	t	20	2025-11-09 14:12:21.541397	2025-11-09 14:12:21.541397	monthly	250	count	monthly	00:00:00	\N	\N
16	MONTHLY_PRACTICE_300	本月练习300题	本月内完成至少300道练习题	📖	800	practice	{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 300}	300	t	21	2025-11-09 14:12:21.541397	2025-11-09 14:12:21.541397	monthly	400	count	monthly	00:00:00	\N	\N
17	MONTHLY_PRACTICE_500	本月练习500题	本月内完成至少500道练习题	🏆	1500	practice	{"event_name": "student.practice.completed", "condition_type": "count", "threshold": 500}	500	t	22	2025-11-09 14:12:21.541397	2025-11-09 14:12:21.541397	monthly	750	count	monthly	00:00:00	\N	\N
18	MONTHLY_EXAM_10	本月完成10次测评	本月内完成至少10次测评活动	📈	1000	exam	{"event_name": "student.exam.completed", "condition_type": "count", "threshold": 10}	10	t	23	2025-11-09 14:12:21.541397	2025-11-09 14:12:21.541397	monthly	500	count	monthly	00:00:00	\N	\N
19	MONTHLY_ACCURACY_90	本月正确率达90%	本月总体练习正确率达到90%以上	💯	2000	practice	{"event_name": "student.monthly.accuracy", "condition_type": "threshold", "threshold": 90}	90	t	24	2025-11-09 14:12:21.541397	2025-11-09 14:12:21.541397	monthly	1000	score	monthly	00:00:00	\N	\N
20	MONTHLY_PERFECT_WEEK	本月完美一周	本月内有一周完成所有每周任务	⭐	1200	weekly	{"event_name": "student.perfect.week", "condition_type": "count", "threshold": 1}	1	t	25	2025-11-09 14:12:21.541397	2025-11-09 14:12:21.541397	monthly	600	count	monthly	00:00:00	\N	\N
21	EARLY_BIRD_DAILY	早起的鸟儿	早上6-8点登录系统	🌅	15	login	{"event_name": "student.login.morning", "condition_type": "state", "hour_range": [6, 8]}	1	t	6	2025-11-09 14:12:21.542371	2025-11-09 14:12:21.542371	daily	10	count	daily	00:00:00	\N	\N
\.


--
-- Data for Name: district_ability_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.district_ability_stats (id, district_id, ability, subject, school_count, student_count, total_attempts, correct_count, accuracy_rate, avg_score, period_start, period_end, last_updated_at) FROM stdin;
\.


--
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.districts (id, name, code, level, created_at) FROM stdin;
1	云岩区	YY	district	2025-09-24 15:09:18.510674
2	南明区	NM	district	2025-09-24 15:09:18.510674
3	观山湖区	GSH	district	2025-09-24 15:09:18.510674
4	白云区	BY	district	2025-09-24 15:09:18.510674
5	花溪区	HX	district	2025-09-24 15:09:18.510674
6	乌当区	WD	district	2025-09-24 15:09:18.510674
7	贵阳市教育局	GYSJ	municipal	2025-09-24 15:09:18.510674
8	清镇市	QZ	district	2025-10-27 15:27:01.188416
9	修文县	XW	district	2025-10-27 15:27:01.188416
10	息烽县	XF	district	2025-10-27 15:27:01.188416
11	开阳县	KY	district	2025-10-27 15:27:01.188416
12	贵安新区	GAXQ	district	2025-10-27 15:27:01.188416
13	贵阳市直属学校	GYSZSX	municipal	2025-10-27 15:27:01.188416
\.


--
-- Data for Name: import_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_logs (id, batch_id, file_name, file_type, total_rows, successful_rows, failed_rows, error_details, imported_by, created_at) FROM stdin;
\.


--
-- Data for Name: leaderboards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leaderboards (id, leaderboard_type, scope, student_id, student_name, school_name, class_name, points, rank, rank_change, period_start, period_end, last_updated) FROM stdin;
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_preferences (id, user_id, enable_system, enable_activity, enable_achievement, enable_reminder, enable_announcement, enable_email, enable_sms, enable_push, quiet_hours_start, quiet_hours_end, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_templates (id, code, name, title_template, content_template, type, default_priority, is_active, created_at, updated_at) FROM stdin;
1	assessment_published	测评发布通知	新测评发布：{{activity_title}}	{{activity_title}} 已发布，报名时间：{{registration_start}} - {{registration_end}}，请及时报名参加。	activity	4	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
2	registration_confirmed	报名确认通知	报名成功：{{activity_title}}	您已成功报名 {{activity_title}}{{#location}}，测评地点：{{location}}{{/location}}。请在测评开始前做好准备。	activity	4	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
3	registration_rejected	报名拒绝通知	报名未通过：{{activity_title}}	很抱歉，您的 {{activity_title}} 报名申请未通过。{{#reason}}原因：{{reason}}{{/reason}}	activity	4	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
4	registration_cancelled	报名取消通知	报名已取消：{{activity_title}}	您的 {{activity_title}} 报名已取消。{{#reason}}原因：{{reason}}{{/reason}}	activity	3	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
5	assessment_reminder	测评提醒	测评即将开始：{{activity_title}}	{{activity_title}} 将于 {{start_time}} 开始，请提前做好准备。{{#location}}测评地点：{{location}}{{/location}}	reminder	5	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
6	achievement_unlocked	成就解锁通知	恭喜获得成就：{{achievement_name}}	您已解锁成就「{{achievement_name}}」！{{#description}}{{description}}{{/description}} 继续加油！	achievement	3	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
7	question_approved	题目审核通过	题目审核通过：{{question_code}}	您提交的题目（编号：{{question_code}}）已审核通过，将进入题库供使用。	system	3	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
8	question_rejected	题目审核未通过	题目审核未通过：{{question_code}}	您提交的题目（编号：{{question_code}}）审核未通过。{{#reason}}原因：{{reason}}{{/reason}} 请修改后重新提交。	system	3	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
9	welcome	欢迎通知	欢迎加入贵阳市小学生测评平台	欢迎您加入贵阳市小学生测评平台！在这里您可以参加各类学科测评，提升学习能力。祝您学习进步！	system	3	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
10	password_changed	密码修改通知	密码已修改	您的账户密码已成功修改。如非本人操作，请立即联系管理员。	system	5	t	2025-11-30 17:25:28.154246	2025-11-30 17:25:28.154246
\.


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.points_transactions (transaction_id, student_id, points_change, transaction_type, source_id, source_type, description, balance_before, balance_after, expires_at, is_expired, created_at) FROM stdin;
\.


--
-- Data for Name: question_bank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_bank (id, draft_id, scope, district_id, school_id, status, reviewer_id, review_comment, reviewed_at, published_by, published_at, question_code, usage_count, success_rate, is_active) FROM stdin;
597	144	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290002	0	\N	t
1158	555	practice_municipal	\N	\N	pending_review	94	\N	\N	163	2025-11-22 16:14:42.048743	\N	0	\N	t
1159	556	practice_municipal	\N	\N	pending_review	94	\N	\N	163	2025-11-22 16:15:05.800973	\N	0	\N	t
1160	557	practice_municipal	\N	\N	pending_review	94	\N	\N	163	2025-11-22 16:15:35.36306	\N	0	\N	t
718	69	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210001	0	\N	t
719	244	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210002	0	\N	t
717	70	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210009	0	\N	t
716	10	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210010	0	\N	t
726	14	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210011	0	\N	t
725	15	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210012	0	\N	t
724	16	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210013	0	\N	t
713	241	practice_municipal	\N	\N	pending_review	10	\N	\N	9	2025-10-21 11:14:23.380148	\N	0	\N	t
689	229	practice_school_9	2	9	pending_review	94	[target_scope:practice_municipal]	\N	9	2025-11-04 06:34:31.904476	\N	0	\N	t
690	4	practice_school_9	2	9	pending_review	94	[target_scope:practice_municipal]	\N	9	2025-11-04 06:34:31.904476	\N	0	\N	t
840	7	practice_school_9	2	9	pending_review	94	[target_scope:practice_municipal]	\N	9	2025-11-04 06:34:31.953575	\N	0	\N	t
841	302	practice_school_9	2	9	pending_review	94	[target_scope:practice_municipal]	\N	9	2025-11-04 06:34:31.953575	\N	0	\N	t
687	227	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-08 13:23:17.009752	\N	0	\N	t
701	230	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-08 13:23:16.950607	\N	0	\N	t
733	245	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-06 13:05:43.836173	\N	0	\N	t
734	246	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-06 13:07:08.996827	\N	0	\N	t
735	247	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-06 13:08:22.445371	\N	0	\N	t
863	314	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:49:55.523099	1	2025-10-14 14:49:55.523099	MATH2510140003	0	\N	t
886	336	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.762264	1	2025-10-14 14:52:13.762264	OTHR2510140004	0	\N	t
870	320	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290001	0	\N	t
878	328	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290003	0	\N	t
883	333	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290007	0	\N	t
736	248	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-06 13:09:30.691505	\N	0	\N	t
737	249	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-06 14:06:37.154014	\N	0	\N	t
738	250	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-06 14:23:02.472052	\N	0	\N	t
739	251	practice_municipal	\N	\N	pending_review	94	[target_scope:practice_municipal]	\N	163	2025-11-08 13:46:46.807749	\N	0	\N	t
909	355	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:49:55.497827	MATH2510140002	0	\N	t
1016	460	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:49:55.49315	1	2025-10-14 14:49:55.49315	MATH2510140001	0	\N	t
994	439	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.68811	MATH2510140005	0	\N	t
1019	462	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.691306	1	2025-10-14 14:52:13.691306	MATH2510140006	0	\N	t
1025	468	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.694695	1	2025-10-14 14:52:13.694695	MATH2510140007	0	\N	t
1018	461	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.793693	MATH2510140011	0	\N	t
1036	479	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.79629	1	2025-10-14 14:52:13.79629	MATH2510140012	0	\N	t
1014	458	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290004	0	\N	t
605	152	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300012	0	\N	t
1012	456	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300013	0	\N	t
904	351	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300014	0	\N	t
679	5	practice_school_9	2	9	pending_review	94	[target_scope:practice_municipal]	\N	9	2025-11-04 06:34:31.9367	\N	0	\N	t
680	226	practice_school_9	2	9	pending_review	94	[target_scope:practice_municipal]	\N	9	2025-11-04 06:34:31.9367	\N	0	\N	t
906	353	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:49:55.516847	OTHR2510140001	0	\N	t
889	338	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.675635	1	2025-10-14 14:52:13.675635	MATH2510140004	0	\N	t
1120	511	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.7352	OTHR2510140002	0	\N	t
887	337	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.737829	MATH2510140008	0	\N	t
908	354	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.740522	1	2025-10-14 14:52:13.740522	MATH2510140009	0	\N	t
905	352	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.759691	OTHR2510140003	0	\N	t
1114	505	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.76764	MATH2510140010	0	\N	t
1117	508	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.788394	OTHR2510140005	0	\N	t
655	202	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.790997	1	2025-10-14 14:52:13.790997	OTHR2510140006	0	\N	t
1135	526	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.814946	OTHR2510140007	0	\N	t
1126	517	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.817797	1	2025-10-14 14:52:13.817797	OTHR2510140008	0	\N	t
1108	499	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-14 14:52:13.820675	OTHR2510140009	0	\N	t
1107	498	practice_municipal	\N	\N	published	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.823338	1	2025-10-14 14:52:13.823338	OTHR2510140010	0	\N	t
727	13	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210003	0	\N	t
728	11	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210004	0	\N	t
729	9	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210005	0	\N	t
730	8	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210006	0	\N	t
731	1	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210007	0	\N	t
732	2	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210008	0	\N	t
899	346	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300001	0	\N	t
617	164	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300004	0	\N	t
629	176	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300005	0	\N	t
638	185	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300006	0	\N	t
643	190	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300007	0	\N	t
614	161	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300015	0	\N	t
612	159	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300016	0	\N	t
633	180	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300017	0	\N	t
623	170	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300018	0	\N	t
622	169	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300027	0	\N	t
645	192	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.303086	OTHR2510300003	0	\N	t
897	344	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300006	0	\N	t
901	348	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300007	0	\N	t
656	203	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300008	0	\N	t
654	201	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300009	0	\N	t
649	196	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300010	0	\N	t
1041	49	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1042	57	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1043	53	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1044	59	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1045	63	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1046	64	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1047	66	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1048	54	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1049	46	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1050	484	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-20 16:39:09.876961	\N	0	\N	t
1071	60	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-19 11:24:02.323816	\N	0	\N	t
1072	47	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-19 11:24:02.323816	\N	0	\N	t
1073	50	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-19 11:24:02.323816	\N	0	\N	t
1074	52	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-19 11:24:02.323816	\N	0	\N	t
1075	61	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-19 11:24:02.323816	\N	0	\N	t
1076	485	practice_municipal	\N	\N	pending_review	1	\N	\N	9	2025-10-19 11:24:02.323816	\N	0	\N	t
723	17	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210014	0	\N	t
722	19	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210015	0	\N	t
721	20	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210016	0	\N	t
720	25	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	10	2025-10-21 05:04:17.619616	MATH2510210017	0	\N	t
714	242	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 11:18:43.468054	10	2025-10-21 11:18:43.470724	MATH2510210018	0	\N	t
715	243	practice_municipal	\N	\N	published	10	题目质量良好，内容准确，批准通过。	2025-10-21 12:20:17.977151	10	2025-10-21 12:20:17.9815	MATH2510210019	0	\N	t
615	162	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290005	0	\N	t
900	347	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290006	0	\N	t
619	166	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:39:36.799567	MATH2510290008	0	\N	t
857	308	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:40:02.986145	MATH2510290009	0	\N	t
898	345	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:40:02.986145	MATH2510290010	0	\N	t
1123	514	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:40:02.986145	MATH2510290011	0	\N	t
634	181	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:40:02.986145	MATH2510290012	0	\N	t
868	318	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:40:02.986145	MATH2510290013	0	\N	t
874	324	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-10-29 16:40:02.986145	MATH2510290014	0	\N	t
968	413	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300002	0	\N	t
1097	488	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300003	0	\N	t
1001	445	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300008	0	\N	t
1002	446	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300009	0	\N	t
1152	543	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.271796	MATH2510300010	0	\N	t
1003	447	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300011	0	\N	t
1150	541	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300019	0	\N	t
1154	545	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.281163	MATH2510300020	0	\N	t
1148	539	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.283166	MATH2510300021	0	\N	t
1112	503	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.283166	MATH2510300022	0	\N	t
902	349	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300023	0	\N	t
1021	464	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300024	0	\N	t
600	147	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300025	0	\N	t
1149	540	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300026	0	\N	t
603	150	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300028	0	\N	t
1155	546	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300029	0	\N	t
885	335	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300030	0	\N	t
1010	454	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300031	0	\N	t
872	322	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.284152	MATH2510300032	0	\N	t
978	423	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.285999	MATH2510300033	0	\N	t
1147	538	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.285999	MATH2510300034	0	\N	t
873	323	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.285999	MATH2510300035	0	\N	t
1111	502	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.285999	MATH2510300036	0	\N	t
912	357	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300037	0	\N	t
854	305	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300038	0	\N	t
1039	482	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300039	0	\N	t
862	313	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300040	0	\N	t
880	330	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300041	0	\N	t
1144	535	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300042	0	\N	t
903	350	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300043	0	\N	t
980	425	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300044	0	\N	t
1008	452	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300045	0	\N	t
1145	536	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.28719	MATH2510300046	0	\N	t
1109	500	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.289571	MATH2510300047	0	\N	t
1146	537	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.289571	MATH2510300048	0	\N	t
1151	542	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.303086	OTHR2510300001	0	\N	t
1110	501	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.303086	OTHR2510300002	0	\N	t
1125	516	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300004	0	\N	t
1106	497	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300005	0	\N	t
1028	471	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300011	0	\N	t
1104	495	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300012	0	\N	t
915	360	practice_municipal	\N	\N	published	\N	\N	\N	9	2025-10-30 10:52:26.304282	OTHR2510300013	0	\N	t
932	377	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.601417	MATH2511020001	0	\N	t
625	172	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.601417	MATH2511020002	0	\N	t
1124	515	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.601417	MATH2511020003	0	\N	t
590	137	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.601417	MATH2511020004	0	\N	t
607	154	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.601417	MATH2511020005	0	\N	t
934	379	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.61824	MATH2511020006	0	\N	t
602	149	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.61824	MATH2511020007	0	\N	t
610	157	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.61824	MATH2511020008	0	\N	t
632	179	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.61824	MATH2511020009	0	\N	t
1127	518	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.61824	MATH2511020010	0	\N	t
628	175	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.619561	MATH2511020011	0	\N	t
639	186	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.619561	MATH2511020012	0	\N	t
954	399	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.619561	MATH2511020013	0	\N	t
1139	530	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.619561	MATH2511020014	0	\N	t
1023	466	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.619561	MATH2511020015	0	\N	t
593	140	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.620953	MATH2511020016	0	\N	t
594	141	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.620953	MATH2511020017	0	\N	t
931	376	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.620953	MATH2511020018	0	\N	t
1129	520	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.620953	MATH2511020019	0	\N	t
588	135	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.620953	MATH2511020020	0	\N	t
877	327	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.622308	MATH2511020021	0	\N	t
1141	532	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.622308	MATH2511020022	0	\N	t
979	424	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.622308	MATH2511020023	0	\N	t
946	391	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.622308	MATH2511020024	0	\N	t
856	307	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.622308	MATH2511020025	0	\N	t
1007	451	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.623438	MATH2511020026	0	\N	t
973	418	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.623438	MATH2511020027	0	\N	t
947	392	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.623438	MATH2511020028	0	\N	t
636	183	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.623438	MATH2511020029	0	\N	t
1131	522	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.623438	MATH2511020030	0	\N	t
945	390	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.624526	MATH2511020031	0	\N	t
677	224	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.624526	MATH2511020032	0	\N	t
1143	534	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.624526	MATH2511020033	0	\N	t
583	130	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.624526	MATH2511020034	0	\N	t
1130	521	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.624526	MATH2511020035	0	\N	t
587	134	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.625575	MATH2511020036	0	\N	t
936	381	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.625575	MATH2511020037	0	\N	t
1140	531	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.625575	MATH2511020038	0	\N	t
962	407	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.625575	MATH2511020039	0	\N	t
871	321	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.625575	MATH2511020040	0	\N	t
974	419	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.626624	MATH2511020041	0	\N	t
1113	504	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.626624	MATH2511020042	0	\N	t
1133	524	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.626624	MATH2511020043	0	\N	t
948	393	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.626624	MATH2511020044	0	\N	t
881	331	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.626624	MATH2511020045	0	\N	t
1034	477	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.627641	OTHR2511020001	0	\N	t
1121	512	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.627641	OTHR2511020002	0	\N	t
951	396	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.627641	OTHR2511020003	0	\N	t
1122	513	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.627641	OTHR2511020004	0	\N	t
1142	533	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.627641	OTHR2511020005	0	\N	t
1138	529	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.628751	OTHR2511020006	0	\N	t
993	438	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.628751	OTHR2511020007	0	\N	t
944	389	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.628751	OTHR2511020008	0	\N	t
1031	474	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.628751	OTHR2511020009	0	\N	t
929	374	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.628751	OTHR2511020010	0	\N	t
671	218	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.62984	OTHR2511020011	0	\N	t
991	436	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.62984	OTHR2511020012	0	\N	t
673	220	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.62984	OTHR2511020013	0	\N	t
992	437	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.62984	OTHR2511020014	0	\N	t
1134	525	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.62984	OTHR2511020015	0	\N	t
1128	519	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.630874	OTHR2511020016	0	\N	t
949	394	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.630874	OTHR2511020017	0	\N	t
996	440	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.630874	OTHR2511020018	0	\N	t
966	411	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.630874	OTHR2511020019	0	\N	t
998	442	practice_municipal	\N	\N	published	\N	\N	\N	58	2025-11-02 03:29:38.630874	OTHR2511020020	0	\N	t
663	210	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.631919	OTHR2511020021	0	\N	t
1132	523	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.631919	OTHR2511020022	0	\N	t
988	433	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.631919	OTHR2511020023	0	\N	t
668	215	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.631919	OTHR2511020024	0	\N	t
665	212	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.631919	OTHR2511020025	0	\N	t
1030	473	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.633405	OTHR2511020026	0	\N	t
942	387	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.633405	OTHR2511020027	0	\N	t
1033	476	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.633405	OTHR2511020028	0	\N	t
928	373	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.633405	OTHR2511020029	0	\N	t
1136	527	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.633405	OTHR2511020030	0	\N	t
670	217	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.63453	OTHR2511020031	0	\N	t
1000	444	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.63453	OTHR2511020032	0	\N	t
927	372	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.63453	OTHR2511020033	0	\N	t
650	197	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.63453	OTHR2511020034	0	\N	t
1137	528	practice_municipal	\N	\N	published	\N	\N	\N	60	2025-11-02 03:29:38.63453	OTHR2511020035	0	\N	t
842	7	practice_municipal	\N	\N	published	1	集成测试 - 批准	2025-11-04 06:35:48.388994	1	2025-11-04 06:35:48.388994	MATH2511040001	0	\N	t
843	302	practice_municipal	\N	\N	published	1	集成测试 - 批准	2025-11-04 06:35:48.388994	1	2025-11-04 06:35:48.388994	MATH2511040002	0	\N	t
591	138	practice_school_1	1	1	published	9	Historical data: reviewer populated from published_by during migration 011	2025-11-04 13:08:31.747237	9	2025-11-04 13:08:31.747237	MATH2511040003	0	\N	t
703	231	practice_school_1	1	1	published	9	Historical data: reviewer populated from published_by during migration 011	2025-11-04 13:26:27.341766	9	2025-11-04 13:26:27.341766	MATH2511040004	0	\N	t
704	232	practice_school_1	1	1	published	9	Historical data: reviewer populated from published_by during migration 011	2025-11-04 13:31:32.445935	9	2025-11-04 13:31:32.445935	MATH2511040005	0	\N	t
985	430	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050001	0	\N	t
584	131	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050001	0	\N	t
585	132	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050002	0	\N	t
586	133	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050003	0	\N	t
589	136	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050004	0	\N	t
595	142	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050005	0	\N	t
596	143	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050006	0	\N	t
598	145	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050007	0	\N	t
599	146	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050008	0	\N	t
601	148	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050009	0	\N	t
604	151	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050010	0	\N	t
606	153	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050011	0	\N	t
608	155	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050012	0	\N	t
609	156	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050013	0	\N	t
611	158	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050014	0	\N	t
613	160	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050015	0	\N	t
616	163	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050016	0	\N	t
618	165	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050017	0	\N	t
620	167	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050018	0	\N	t
621	168	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050019	0	\N	t
624	171	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050020	0	\N	t
626	173	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050021	0	\N	t
627	174	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050022	0	\N	t
630	177	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050023	0	\N	t
631	178	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050024	0	\N	t
635	182	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050025	0	\N	t
637	184	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050026	0	\N	t
640	187	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050027	0	\N	t
641	188	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050028	0	\N	t
642	189	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050029	0	\N	t
644	191	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050030	0	\N	t
646	193	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050002	0	\N	t
647	194	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050003	0	\N	t
648	195	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050004	0	\N	t
651	198	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050005	0	\N	t
652	199	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050006	0	\N	t
653	200	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050007	0	\N	t
657	204	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050008	0	\N	t
658	205	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050009	0	\N	t
659	206	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050010	0	\N	t
660	207	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050011	0	\N	t
661	208	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050012	0	\N	t
662	209	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050013	0	\N	t
664	211	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050014	0	\N	t
666	213	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050015	0	\N	t
667	214	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050016	0	\N	t
669	216	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050017	0	\N	t
672	219	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050018	0	\N	t
674	221	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050019	0	\N	t
675	222	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050020	0	\N	t
676	223	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050031	0	\N	t
678	225	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050032	0	\N	t
853	304	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050033	0	\N	t
855	306	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050034	0	\N	t
858	309	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050035	0	\N	t
859	310	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050036	0	\N	t
860	311	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050021	0	\N	t
861	312	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050037	0	\N	t
865	315	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050038	0	\N	t
866	316	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050039	0	\N	t
867	317	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050040	0	\N	t
869	319	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050041	0	\N	t
875	325	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050042	0	\N	t
876	326	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050043	0	\N	t
879	329	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050044	0	\N	t
882	332	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050045	0	\N	t
884	334	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050046	0	\N	t
892	339	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050022	0	\N	t
893	340	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050023	0	\N	t
894	341	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050024	0	\N	t
895	342	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050025	0	\N	t
896	343	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050026	0	\N	t
911	356	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050047	0	\N	t
913	358	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050048	0	\N	t
914	359	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050049	0	\N	t
916	361	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050027	0	\N	t
917	362	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050028	0	\N	t
918	363	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050029	0	\N	t
919	364	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050030	0	\N	t
920	365	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050031	0	\N	t
921	366	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050032	0	\N	t
922	367	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050033	0	\N	t
923	368	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050034	0	\N	t
924	369	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050035	0	\N	t
925	370	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050036	0	\N	t
926	371	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050050	0	\N	t
930	375	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050051	0	\N	t
933	378	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050052	0	\N	t
935	380	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050053	0	\N	t
937	382	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050037	0	\N	t
938	383	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050054	0	\N	t
939	384	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050055	0	\N	t
940	385	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050038	0	\N	t
941	386	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050056	0	\N	t
943	388	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050039	0	\N	t
950	395	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050040	0	\N	t
952	397	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050057	0	\N	t
953	398	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050058	0	\N	t
955	400	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050041	0	\N	t
956	401	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050059	0	\N	t
957	402	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050042	0	\N	t
958	403	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050043	0	\N	t
959	404	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050060	0	\N	t
960	405	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050061	0	\N	t
961	406	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050044	0	\N	t
963	408	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050062	0	\N	t
964	409	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050045	0	\N	t
965	410	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050046	0	\N	t
967	412	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050063	0	\N	t
969	414	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050047	0	\N	t
970	415	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050064	0	\N	t
971	416	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050065	0	\N	t
972	417	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050066	0	\N	t
975	420	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050067	0	\N	t
976	421	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050068	0	\N	t
977	422	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050069	0	\N	t
981	426	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050070	0	\N	t
982	427	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050048	0	\N	t
983	428	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050049	0	\N	t
984	429	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050050	0	\N	t
582	129	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050071	0	\N	t
986	431	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050051	0	\N	t
987	432	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050052	0	\N	t
989	434	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050072	0	\N	t
990	435	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050053	0	\N	t
997	441	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050054	0	\N	t
999	443	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050055	0	\N	t
1004	448	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050056	0	\N	t
1005	449	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050057	0	\N	t
1006	450	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050073	0	\N	t
1009	453	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050074	0	\N	t
1011	455	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050075	0	\N	t
1013	457	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050076	0	\N	t
1015	459	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050077	0	\N	t
1020	463	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050078	0	\N	t
1022	465	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050079	0	\N	t
1024	467	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050080	0	\N	t
1026	469	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050058	0	\N	t
1027	470	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050059	0	\N	t
1029	472	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050060	0	\N	t
1032	475	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050081	0	\N	t
1035	478	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050082	0	\N	t
1037	480	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050083	0	\N	t
1038	481	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050084	0	\N	t
1040	483	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050085	0	\N	t
1095	486	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050061	0	\N	t
1096	487	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050062	0	\N	t
1098	489	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050063	0	\N	t
1099	490	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050086	0	\N	t
1100	491	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050087	0	\N	t
1101	492	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050064	0	\N	t
1102	493	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050065	0	\N	t
1103	494	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050088	0	\N	t
1105	496	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050066	0	\N	t
1115	506	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050089	0	\N	t
1116	507	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	MATH2511050090	0	\N	t
1118	509	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050067	0	\N	t
1119	510	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050068	0	\N	t
1153	544	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050069	0	\N	t
1156	547	practice_municipal	\N	\N	published	\N	\N	\N	1	2025-11-05 14:47:02.963596	OTHR2511050070	0	\N	t
705	233	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 11:16:49.478191	MATH2511060001	0	\N	t
706	234	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 12:10:04.563124	MATH2511060002	0	\N	t
707	235	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 12:24:59.792504	MATH2511060003	0	\N	t
708	236	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 12:31:36.316162	MATH2511060004	0	\N	t
709	237	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 12:49:58.240861	MATH2511060005	0	\N	t
710	238	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 13:09:30.69969	MATH2511060006	0	\N	t
711	239	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 14:06:37.046987	MATH2511060007	0	\N	t
712	240	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-06 14:23:02.399417	MATH2511060008	0	\N	t
688	228	practice_school_1	1	1	published	\N	\N	\N	163	2025-11-08 13:23:17.025408	MATH2511080001	0	\N	t
852	303	practice_municipal	\N	\N	published	1	集成测试 - 批准	2025-11-08 13:23:17.037306	1	2025-11-08 13:23:17.037306	MATH2511080002	0	\N	t
774	269	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200001	0	\N	t
770	267	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200002	0	\N	t
768	266	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200003	0	\N	t
836	300	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200004	0	\N	t
764	264	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200005	0	\N	t
832	298	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200006	0	\N	t
828	296	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200007	0	\N	t
822	293	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200008	0	\N	t
742	253	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200009	0	\N	t
816	290	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200010	0	\N	t
814	289	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200011	0	\N	t
744	254	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200012	0	\N	t
746	255	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200013	0	\N	t
808	286	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200014	0	\N	t
806	285	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200015	0	\N	t
762	263	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200016	0	\N	t
800	282	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200017	0	\N	t
802	283	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200018	0	\N	t
794	279	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200019	0	\N	t
792	278	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200020	0	\N	t
754	259	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200021	0	\N	t
788	276	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200022	0	\N	t
786	275	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200023	0	\N	t
758	261	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200024	0	\N	t
782	273	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200025	0	\N	t
760	262	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200026	0	\N	t
776	270	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:04:53.960302	MATH2511200027	0	\N	t
750	257	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200028	0	\N	t
838	301	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200029	0	\N	t
834	299	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200030	0	\N	t
830	297	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200031	0	\N	t
826	295	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200032	0	\N	t
824	294	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200033	0	\N	t
820	292	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200034	0	\N	t
818	291	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200035	0	\N	t
812	288	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200036	0	\N	t
810	287	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200037	0	\N	t
804	284	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200038	0	\N	t
798	281	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200039	0	\N	t
796	280	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200040	0	\N	t
790	277	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200041	0	\N	t
784	274	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200042	0	\N	t
780	272	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200043	0	\N	t
778	271	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200044	0	\N	t
772	268	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200045	0	\N	t
766	265	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200046	0	\N	t
756	260	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200047	0	\N	t
752	258	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200048	0	\N	t
748	256	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200049	0	\N	t
740	252	practice_school_1	1	1	published	\N	\N	\N	1	2025-11-20 15:08:53.677364	MATH2511200050	0	\N	t
592	139	practice_school_39	13	39	published	163	通过	2025-11-21 16:11:20.01477	39	2025-11-21 14:33:12.440038	MATH2511210001	0	\N	t
1157	550	practice_school_1	1	1	published	\N	\N	\N	9	2025-11-22 05:06:32.1379	OTHR2511220001	0	\N	t
1161	551	practice_district_YY	1	\N	published	163		2025-11-23 09:46:46.455077	39	2025-11-22 16:16:43.314034	MATH2511220001	0	\N	t
1229	631	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	MATH2511230001	0	\N	t
1230	632	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	MATH2511230002	0	\N	t
1231	633	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	MATH2511230003	0	\N	t
1227	629	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	MATH2511230004	0	\N	t
1228	630	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	MATH2511230005	0	\N	t
1234	636	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	OTHR2511230001	0	\N	t
1232	634	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	OTHR2511230002	0	\N	t
1233	635	school_1	1	1	published	\N	\N	\N	2	2025-11-23 18:54:53.76018	OTHR2511230003	0	\N	t
\.


--
-- Data for Name: question_bank_old_backup_20251122; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_bank_old_backup_20251122 (id, type, subject, grade, content, options, correct_answer, score, difficulty, explanation, tags, image_url, category_id, created_by, usage_count, success_rate, is_active, import_batch_id, created_at, updated_at, abilities, knowledge_points, level, suggested_score, status, scope, reviewer_id, review_comment, reviewed_at, published_at, published_by, question_code) FROM stdin;
242	single	数学	五年级	计算：3.5 + 2.8 = ?	["6.3", "7", "2", "1"]	[""]	1	easy	\N	{}	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-30 05:47:23.967647	{计算能力}	{小数加法}	L1	2	approved	{practice_municipal}	\N	\N	\N	\N	\N	MATH0501001
6	single	数学	八年级	下列运算正确的是（）	["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]	"B"	5	medium	同底数幂相乘，底数不变，指数相加：a³·a²=a⁵	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.497827	2025-10-14 14:49:55.497827	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:49:55.497827	1	MATH2510140004
7	single	数学	八年级	在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）	["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]	"B"	5	medium	关于x轴对称，x坐标不变，y坐标变为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.501951	2025-10-14 14:49:55.501951	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:49:55.501951	1	MATH2510140005
12	multiple	数学	八年级	下列函数中，y随x增大而增大的有（）	["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]	["A", "C"]	10	medium	A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.520347	2025-10-14 14:49:55.520347	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:49:55.520347	1	MATH2510140006
191	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:39:09.876961	2025-10-20 16:39:18.170939	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200004
16	single	数学	八年级	下列运算正确的是（）	["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]	"B"	5	medium	同底数幂相乘，底数不变，指数相加：a³·a²=a⁵	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.684548	2025-10-14 14:52:13.684548	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.684548	1	MATH2510140010
17	single	数学	八年级	在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）	["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]	"B"	5	medium	关于x轴对称，x坐标不变，y坐标变为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.68811	2025-10-14 14:52:13.68811	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.68811	1	MATH2510140011
11	single	信息科技	七年级	下列设备中，属于输入设备的是（）	["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]	"C"	5	easy	键盘是输入设备，用于向计算机输入数据和指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.516847	2025-10-14 14:49:55.516847	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:49:55.516847	1	COMP2510140001
198	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:04:04.589358	2025-10-21 05:04:17.619616	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	2025-10-21 05:04:17.619616	10	MATH2510210001
208	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:45:40.372132	2025-10-21 05:45:40.372132	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210008
626	single	信息科技	八年级	CSS主要用于？	["网页结构", "网页样式", "网页交互", "数据库"]	"B"	1	easy	CSS用于控制网页的样式和布局	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网页技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8002
217	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:46:20.793598	2025-10-21 09:46:20.793598	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210015
627	single	信息科技	八年级	JavaScript是一种什么语言？	["标记语言", "样式语言", "脚本语言", "数据库语言"]	"C"	1	medium	JavaScript是客户端脚本语言	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网页技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8003
628	single	信息科技	八年级	数据库用于？	["存储和管理数据", "编辑图片", "播放视频", "浏览网页"]	"A"	1	easy	数据库是用于存储和管理数据的系统	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数据管理}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8004
686	single	数学	三年级	【REV101-1762427802661】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 11:16:49.556867	2025-11-06 11:16:49.556867	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060002
250	single	数学	一年级	3 + 2 = ?	["3", "4", "5", "6"]	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{加法运算,基础计算}	{20以内加法,基础运算}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300001
251	single	数学	一年级	8 - 3 = ?	["3", "4", "5", "6"]	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{减法运算,基础计算}	{20以内减法,基础运算}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300002
252	single	数学	一年级	哪个数字最大？	["2", "5", "3", "1"]	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{数字比较,大小概念}	{数的大小,数序}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300003
253	multiple	数学	一年级	下列哪些数字大于3？（多选）	["2", "4", "5", "1"]	["4", "5"]	10	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{数字比较,大小判断}	{数的大小,不等关系}	L1	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300004
254	blank	数学	一年级	填空：5 + ( ) = 10	null	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{加法运算,逆向思维}	{加法,填空题}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300005
255	blank	数学	一年级	填空：10 - ( ) = 6	null	"4"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{减法运算,逆向思维}	{减法,填空题}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300006
256	true_false	数学	一年级	5 + 3 = 8	null	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{加法验证,判断能力}	{加法,正误判断}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300007
257	true_false	数学	一年级	6 比 8 大	null	false	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{大小比较,判断能力}	{数的大小,正误判断}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300008
442	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-03 15:18:00.17313	2025-11-03 15:18:00.17313	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2511030002
1073	single	数学	一年级	【测试题】1 + 1 = ?	{"A": "2", "B": "3", "C": "4", "D": "5"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200001
444	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-03 15:18:00.215322	2025-11-03 15:18:00.215322	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2511030003
1074	single	数学	一年级	【测试题】2 + 1 = ?	{"A": "3", "B": "4", "C": "5", "D": "6"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200002
192	single	数学	七年级	Admin测试题目：计算 5 + 3 = ?	["6", "7", "8", "9"]	"C"	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-20 17:04:48.340723	2025-10-20 17:04:48.340723	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510200005
1075	single	数学	一年级	【测试题】3 + 1 = ?	{"A": "4", "B": "5", "C": "6", "D": "7"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200003
446	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-03 15:18:00.233808	2025-11-03 15:18:00.233808	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2511030004
210	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:52:03.22356	2025-10-21 05:52:03.22356	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210009
1076	single	数学	一年级	【测试题】4 + 1 = ?	{"A": "5", "B": "6", "C": "7", "D": "8"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200004
451	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:32:31.959674	2025-11-04 06:32:32.002086	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040001
454	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:32:32.023903	2025-11-04 06:32:32.029315	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040002
629	single	信息科技	八年级	SQL是什么？	["编程语言", "数据库查询语言", "标记语言", "样式语言"]	"B"	1	medium	SQL用于数据库操作	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数据管理}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8005
630	multiple	信息科技	八年级	一个完整的网页通常包含？	["HTML", "CSS", "JavaScript", "Python"]	["A", "B", "C"]	1	medium	网页由HTML结构、CSS样式、JavaScript交互组成	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网页技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8006
631	true_false	信息科技	八年级	函数可以提高代码的复用性	["正确", "错误"]	"A"	1	easy	函数可以封装重复使用的代码	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程概念}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8007
632	blank	信息科技	八年级	HTTP协议的默认端口号是__	[]	"80"	1	hard	HTTP默认使用80端口	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络协议}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8008
258	essay	数学	一年级	用画图的方式表示：3个苹果加2个苹果一共有几个苹果？	null	"5个苹果"	10	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{图形表达,应用题}	{加法应用,图文结合}	L1	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300009
259	matching	数学	一年级	连线匹配：数字与数量（1→一个，2→两个，3→三个）	null	"1-一个,2-两个,3-三个"	10	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{数字认知,配对能力}	{数的认识,一一对应}	L1	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300010
260	single	数学	二年级	25 + 18 = ?	["41", "42", "43", "44"]	"43"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{两位数加法,进位运算}	{100以内加法,进位加}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300011
261	single	数学	二年级	35 - 17 = ?	["16", "17", "18", "19"]	"18"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{两位数减法,退位运算}	{100以内减法,退位减}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300012
262	single	数学	二年级	5 × 3 = ?	["12", "13", "14", "15"]	"15"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{乘法运算,乘法口诀}	{表内乘法,乘法}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300013
263	multiple	数学	二年级	下列哪些算式的结果是10？（多选）	["5+5", "6+3", "7+3", "8+2"]	["5+5", "7+3", "8+2"]	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{加法运算,逆向思维}	{凑十法,加法}	L1	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300014
264	blank	数学	二年级	填空：6 × ( ) = 18	null	"3"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{乘法运算,除法思想}	{乘法口诀,乘除关系}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300015
265	blank	数学	二年级	1米 = ( )厘米	null	"100"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{长度单位,单位换算}	{长度测量,单位转换}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300016
266	true_false	数学	二年级	长方形有4条边，4个角都是直角。	null	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{图形认知,几何知识}	{平面图形,长方形}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300017
267	true_false	数学	二年级	24 ÷ 6 = 5	null	false	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{除法运算,计算验证}	{表内除法,正误判断}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300018
270	matching	数学	三年级	连线匹配：分数与图形（1/2对应一半，1/4对应四分之一）	null	"1/2-一半,1/4-四分之一,3/4-四分之三"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.283166	2025-10-30 10:52:26.283166	{分数认知,图形分割}	{分数初步,分数表示}	L2	10	published	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300021
271	code	数学	三年级	编写计算正方形周长的简单算法（给定边长a，周长=4×a）	null	"输入边长a，周长=4*a"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.283166	2025-10-30 10:52:26.283166	{算法思维,公式应用}	{周长公式,算法表达}	L2	15	published	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300022
1077	single	数学	一年级	【测试题】5 + 1 = ?	{"A": "6", "B": "7", "C": "8", "D": "9"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200005
1078	single	数学	一年级	【测试题】6 + 1 = ?	{"A": "7", "B": "8", "C": "9", "D": "10"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200006
200	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:08:22.609336	2025-10-21 05:08:22.609336	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210002
447	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-03 15:23:15.719022	2025-11-03 15:23:15.746877	{}	{}	L1	5	pending_review	{}	94	\N	\N	\N	\N	MATH2511030005
1079	single	数学	一年级	【测试题】7 + 1 = ?	{"A": "8", "B": "9", "C": "10", "D": "11"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200007
211	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:17:23.105681	2025-10-21 06:17:23.105681	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210010
220	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 10:54:28.003014	2025-10-21 10:54:28.003014	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210016
455	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:33:55.383392	2025-11-04 06:33:55.405418	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040003
457	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:33:55.417981	2025-11-04 06:33:55.422276	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040004
459	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:33:55.434769	2025-11-04 06:33:55.439444	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040005
231	true_false	数学	七年级	【R405-1761049197253】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:20:04.30024	2025-10-21 12:20:17.9815	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 12:20:17.977151	2025-10-21 12:20:17.9815	10	MATH2510210020
633	single	信息科技	八年级	什么是API？	["应用程序接口", "编程语言", "数据库", "操作系统"]	"A"	1	medium	API是Application Programming Interface	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程概念}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8009
268	essay	数学	二年级	小明有20元钱，买了一本书花了12元，还剩多少钱？请写出算式。	null	"20-12=8，还剩8元"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{应用题,减法应用}	{购物问题,减法应用}	L1	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300019
269	matching	数学	二年级	连线匹配：图形与名称（正方形、长方形、三角形、圆形）	null	"正方形-4条相等的边,长方形-对边相等,三角形-3条边,圆形-圆的"	10	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	{图形识别,几何认知}	{平面图形,图形特征}	L1	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300020
272	single	数学	四年级	125 × 8 = ?	["900", "950", "1000", "1100"]	"1000"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{三位数乘法,心算技巧}	{乘法运算,简便计算}	L2	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300023
273	single	数学	四年级	一个角是90度的三角形叫什么三角形？	["锐角三角形", "直角三角形", "钝角三角形", "等边三角形"]	"直角三角形"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{三角形分类,几何知识}	{三角形,图形分类}	L2	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300024
274	single	数学	四年级	3/4 + 1/4 = ?	["1/2", "3/8", "1", "4/8"]	"1"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{同分母分数加法,分数运算}	{分数加法,分数计算}	L2	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300025
275	multiple	数学	四年级	下列哪些是质数？（多选）	["2", "4", "7", "9"]	["2", "7"]	10	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{质数判断,数论知识}	{质数,数的分类}	L2	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300026
276	blank	数学	四年级	长方形的面积公式是：面积 = 长 × ( )	null	"宽"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{面积公式,几何知识}	{长方形面积,公式记忆}	L2	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300027
277	blank	数学	四年级	1千克 = ( )克	null	"1000"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{质量单位,单位换算}	{质量测量,单位转换}	L2	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300028
278	true_false	数学	四年级	平行四边形的对边平行且相等。	null	true	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{图形性质,几何知识}	{平行四边形,图形特征}	L2	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300029
279	true_false	数学	四年级	小数0.5等于分数1/2。	null	true	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{小数与分数,数的转换}	{小数,分数,等量关系}	L2	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300030
1080	single	数学	一年级	【测试题】8 + 1 = ?	{"A": "9", "B": "10", "C": "11", "D": "12"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200008
1081	single	数学	一年级	【测试题】9 + 1 = ?	{"A": "10", "B": "11", "C": "12", "D": "13"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200009
195	single	数学	七年级	【待审核-批准】计算 15 + 25 = ?	["30", "35", "40", "45"]	"C"	1	easy	15 + 25 = 40	\N	\N	\N	9	0	\N	t	\N	2025-10-20 17:22:30.268164	2025-10-20 17:22:30.268164	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510200006
1082	single	数学	一年级	【测试题】10 + 1 = ?	{"A": "11", "B": "12", "C": "13", "D": "14"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200010
450	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-03 15:23:15.786925	2025-11-03 15:23:15.79421	{}	{}	L1	5	pending_review	{}	94	\N	\N	\N	\N	MATH2511030006
202	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:18:11.986108	2025-10-21 05:18:11.986108	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210003
393	true_false	数学	七年级	负数乘以负数等于正数。	{"A": "正确", "B": "错误"}	"A"	5	easy	负负得正	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020033
212	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:21:23.922288	2025-10-21 06:21:23.922288	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210011
460	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:34:31.904476	2025-11-04 06:34:31.924625	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040006
222	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:03:42.939732	2025-10-21 11:03:42.939732	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210017
280	essay	数学	四年级	一辆汽车每小时行驶60千米，行驶了3小时，一共行驶了多少千米？	null	"60×3=180千米"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{应用题,乘法应用}	{路程问题,速度时间路程}	L2	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300031
281	matching	数学	四年级	连线匹配：单位换算（1米=100厘米，1千克=1000克，1小时=60分钟）	null	"1米-100厘米,1千克-1000克,1小时-60分钟"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	{单位换算,量的测量}	{单位转换,常用单位}	L2	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300032
282	single	数学	五年级	一个长方体有几个面？	["4个", "5个", "6个", "8个"]	"6个"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	{立体图形,几何知识}	{长方体,立体图形特征}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300033
283	true_false	数学	五年级	圆的周长等于直径乘以π。	null	true	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	{圆的周长,几何公式}	{圆,周长公式}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300034
284	matching	数学	五年级	连线匹配：分数、小数、百分数（1/2=0.5=50%，1/4=0.25=25%）	null	"1/2-0.5-50%,1/4-0.25-25%,3/4-0.75-75%"	10	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	{数的转换,等量关系}	{分数小数百分数,数的互化}	L3	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300035
285	code	数学	五年级	编写程序：输入圆的半径r，计算圆的面积（面积=πr²，π取3.14）	null	"输入半径r，面积=3.14*r*r"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	{算法编写,公式应用}	{圆的面积,程序设计}	L3	15	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300036
286	single	数学	六年级	如果x + 5 = 12，那么x等于多少？	["5", "6", "7", "8"]	"7"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{代数方程,解方程}	{一元一次方程,方程求解}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300037
287	single	数学	六年级	一个圆柱体的底面半径是3cm，高是10cm，它的体积是多少？（π取3.14）	["94.2cm³", "188.4cm³", "282.6cm³", "376.8cm³"]	"282.6cm³"	5	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{立体图形体积,圆柱体积}	{圆柱,体积计算}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300038
288	single	数学	六年级	比例式 3:4 = x:8 中，x的值是多少？	["4", "5", "6", "7"]	"6"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{比例,解比例}	{比和比例,比例求解}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300039
289	multiple	数学	六年级	下列哪些是轴对称图形？（多选）	["正方形", "长方形", "平行四边形", "等腰三角形"]	["正方形", "长方形", "等腰三角形"]	10	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{图形对称,几何性质}	{轴对称,图形特征}	L3	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300040
290	blank	数学	六年级	圆锥的体积公式是：V = (1/3) × ( ) × h	null	"底面积"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{立体图形体积,圆锥}	{圆锥体积,公式记忆}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300041
291	blank	数学	六年级	一个数的20%是8，这个数是( )	null	"40"	5	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{百分数应用,逆运算}	{百分数,百分数问题}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300042
292	true_false	数学	六年级	负数都小于0。	null	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{负数概念,数的认识}	{正负数,数的大小}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300043
462	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:34:31.9367	2025-11-04 06:34:31.940977	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040007
1083	single	数学	一年级	【测试题】11 + 1 = ?	{"A": "12", "B": "13", "C": "14", "D": "15"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200011
187	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:29:18.669805	2025-10-20 16:29:26.463108	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200002
204	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:21:23.941963	2025-10-21 05:21:23.941963	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210004
213	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:26:07.992328	2025-10-21 06:26:07.992328	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210012
1084	single	数学	一年级	【测试题】12 + 1 = ?	{"A": "13", "B": "14", "C": "15", "D": "16"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200012
1085	single	数学	一年级	【测试题】13 + 1 = ?	{"A": "14", "B": "15", "C": "16", "D": "17"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200013
464	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:34:31.953575	2025-11-04 06:34:31.957859	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040008
224	true_false	数学	七年级	【R405-1761045256357】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:14:23.380148	2025-10-21 11:14:31.680168	{}	{}	L1	5	pending_review	{practice}	10	\N	\N	\N	\N	MATH2510210018
293	true_false	数学	六年级	两个奇数相加的结果一定是偶数。	null	true	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{奇偶性,数的性质}	{奇数偶数,数的规律}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300044
294	essay	数学	六年级	一件商品原价200元，打8折后是多少元？请写出计算过程。	null	"200×0.8=160元，或200×(1-20%)=160元"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{百分数应用,折扣问题}	{打折,百分数应用}	L3	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300045
295	matching	数学	六年级	连线匹配：公式与图形（V=πr²h→圆柱，V=(1/3)πr²h→圆锥，V=abc→长方体）	null	"圆柱-πr²h,圆锥-(1/3)πr²h,长方体-abc"	10	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{体积公式,立体图形}	{立体图形体积,公式配对}	L3	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300046
296	matching	数学	八年级	连线匹配：函数与图像（一次函数→直线，二次函数→抛物线，反比例函数→双曲线）	null	"一次函数-直线,二次函数-抛物线,反比例函数-双曲线"	10	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.289571	2025-10-30 10:52:26.289571	{函数图像,函数识别}	{函数,图像特征}	L4	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300047
297	code	数学	八年级	编写程序：输入三角形三边a、b、c，判断是否能构成三角形（任意两边之和大于第三边）	null	"if (a+b>c and b+c>a and a+c>b) then 能构成 else 不能构成"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.289571	2025-10-30 10:52:26.289571	{算法设计,三角形判定}	{三角形,程序逻辑}	L4	15	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300048
1086	single	数学	一年级	【测试题】14 + 1 = ?	{"A": "15", "B": "16", "C": "17", "D": "18"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200014
1087	single	数学	一年级	【测试题】15 + 1 = ?	{"A": "16", "B": "17", "C": "18", "D": "19"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200015
465	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:34:49.661509	2025-11-04 06:34:49.680945	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040009
1088	single	数学	一年级	【测试题】16 + 1 = ?	{"A": "17", "B": "18", "C": "19", "D": "20"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200016
467	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:34:49.694099	2025-11-04 06:34:49.698525	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040010
1089	single	数学	一年级	【测试题】17 + 1 = ?	{"A": "18", "B": "19", "C": "20", "D": "21"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200017
1090	single	数学	一年级	【测试题】18 + 1 = ?	{"A": "19", "B": "20", "C": "21", "D": "22"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200018
469	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:34:49.711144	2025-11-04 06:34:49.715706	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040011
634	single	信息科技	八年级	在HTML中，<p>标签用于？	["创建段落", "创建标题", "插入图片", "创建链接"]	"A"	1	easy	<p>标签用于定义段落	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网页技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8010
635	single	信息科技	九年级	什么是机器学习？	["人类学习", "让计算机从数据中学习", "一种编程语言", "一种算法"]	"B"	1	medium	机器学习是AI的一个分支	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{人工智能}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9001
650	single	数学	七年级	计算：2³ = ?	["6", "8", "9", "12"]	"B"	1	easy	2的3次方等于8	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{乘方运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_006
1091	single	数学	一年级	【测试题】19 + 1 = ?	{"A": "20", "B": "21", "C": "22", "D": "23"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200019
1092	single	数学	一年级	【测试题】20 + 1 = ?	{"A": "21", "B": "22", "C": "23", "D": "24"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200020
470	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:35:48.328128	2025-11-04 06:35:48.35003	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040012
205	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:24:27.887549	2025-10-21 05:24:27.887549	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210005
214	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:33:07.077578	2025-10-21 09:33:07.077578	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210013
1093	single	数学	一年级	【测试题】21 + 1 = ?	{"A": "22", "B": "23", "C": "24", "D": "25"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200021
472	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:35:48.362747	2025-11-04 06:35:48.368177	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511040013
1094	single	数学	一年级	【测试题】22 + 1 = ?	{"A": "23", "B": "24", "C": "25", "D": "26"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200022
1095	single	数学	一年级	【测试题】23 + 1 = ?	{"A": "24", "B": "25", "C": "26", "D": "27"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200023
1096	single	数学	一年级	【测试题】24 + 1 = ?	{"A": "25", "B": "26", "C": "27", "D": "28"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200024
1097	single	数学	一年级	【测试题】25 + 1 = ?	{"A": "26", "B": "27", "C": "28", "D": "29"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200025
226	true_false	数学	七年级	【R405-1761045501771】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:18:28.84058	2025-10-21 11:18:43.470724	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 11:18:43.468054	2025-10-21 11:18:43.470724	10	MATH2510210019
474	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 06:35:48.380805	2025-11-04 06:35:48.388994	{}	{}	L1	5	published	{practice_municipal}	1	集成测试 - 批准	2025-11-04 06:35:48.388994	2025-11-04 06:35:48.388994	1	MATH2511040014
636	single	信息科技	九年级	区块链的主要特点是？	["中心化", "去中心化", "单点存储", "不可追溯"]	"B"	1	hard	区块链是分布式去中心化的账本	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{前沿技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9002
637	single	信息科技	九年级	什么是爬虫？	["一种昆虫", "自动获取网页数据的程序", "一种病毒", "一种浏览器"]	"B"	1	medium	爬虫用于自动抓取网页内容	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9003
638	single	信息科技	九年级	Git是什么？	["编程语言", "版本控制系统", "数据库", "操作系统"]	"B"	1	medium	Git用于代码版本管理	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{开发工具}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9004
639	single	信息科技	九年级	什么是深度学习？	["深入学习知识", "基于神经网络的机器学习", "一种编程方法", "一种数据库"]	"B"	1	hard	深度学习使用多层神经网络	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{人工智能}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9005
640	multiple	信息科技	九年级	以下哪些是常见的数据结构？	["数组", "链表", "树", "所有选项"]	["A", "B", "C"]	1	hard	数组、链表、树都是基本数据结构	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数据结构}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9006
641	true_false	信息科技	九年级	算法的时间复杂度用于衡量算法效率	["正确", "错误"]	"A"	1	easy	时间复杂度反映算法执行时间随输入规模的增长趋势	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{算法分析}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9007
642	blank	信息科技	九年级	HTTPS中的S代表__	[]	"Secure或安全"	1	medium	HTTPS是HTTP的安全版本	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络安全}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9008
643	single	信息科技	九年级	什么是云存储？	["本地硬盘存储", "通过网络提供的存储服务", "U盘存储", "光盘存储"]	"B"	1	medium	云存储通过互联网提供数据存储	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{云计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9009
644	single	信息科技	九年级	排序算法中，冒泡排序的平均时间复杂度是？	["O(n)", "O(n log n)", "O(n²)", "O(log n)"]	"C"	1	hard	冒泡排序需要嵌套循环，时间复杂度为O(n²)	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{算法分析}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT9010
645	single	数学	七年级	计算：(-5) + 3 = ?	["-8", "-2", "2", "8"]	"B"	1	easy	负5加正3等于负2	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_001
646	single	数学	七年级	计算：(-3) × (-4) = ?	["-12", "-7", "7", "12"]	"D"	1	easy	负负得正	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_002
647	single	数学	七年级	绝对值：|-7| = ?	["-7", "0", "7", "14"]	"C"	1	easy	负数的绝对值是其相反数	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{绝对值}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_003
475	single	数学	三年级	【REV101-1762256795122】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 11:46:42.050187	2025-11-04 11:46:42.050187	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511040015
1098	single	数学	一年级	【测试题】26 + 1 = ?	{"A": "27", "B": "28", "C": "29", "D": "30"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200026
485	single	数学	一年级	5 + 3 = ?	["6", "7", "8", "9"]	"C"	1	easy	5加3等于8	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1001
486	single	数学	一年级	从左数第3个是哪个数字：1 2 3 4 5	["1", "2", "3", "4"]	"C"	1	easy	从左边数第三个位置是数字3	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1002
206	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:26:45.285366	2025-10-21 05:26:45.285366	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210006
487	single	数学	一年级	比7大1的数是多少？	["6", "7", "8", "9"]	"C"	1	easy	7加1等于8	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1003
488	single	数学	一年级	9 - 4 = ?	["3", "4", "5", "6"]	"C"	1	easy	9减4等于5	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1004
489	single	数学	一年级	一个正方形有几条边？	["3", "4", "5", "6"]	"B"	1	easy	正方形有4条边	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{图形认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1005
490	multiple	数学	一年级	下面哪些数字比5大？	["3", "6", "7", "4"]	["B", "C"]	1	medium	6和7都比5大	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1006
491	true_false	数学	一年级	10比5大	["正确", "错误"]	"A"	1	easy	10确实比5大	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1007
492	blank	数学	一年级	6 + __ = 10	[]	"4"	1	medium	6加4等于10	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1008
493	single	数学	一年级	3个苹果和2个苹果一共几个？	["4", "5", "6", "7"]	"B"	1	easy	3加2等于5	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1009
241	essay	数学	三年级	一个班有40个学生，其中男生有22人。女生比男生少多少人？	\N	{"answer": "女生：40 - 22 = 18人\\n女生比男生少：22 - 18 = 4人"}	1	hard	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{应用能力,逻辑推理}	{减法应用,应用题}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301008
361	single	数学	一年级	1 + 1 = ?	{"A": "1", "B": "2", "C": "3", "D": "4"}	"B"	5	easy	1加1等于2	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020001
362	multiple	数学	一年级	以下哪些数字小于5？（多选）	{"A": "2", "B": "3", "C": "6", "D": "7"}	["A", "B"]	5	easy	小于5的数字是2和3	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020002
363	true_false	数学	一年级	3比5大。	{"A": "正确", "B": "错误"}	"B"	5	easy	3小于5，所以错误	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020003
364	blank	数学	一年级	2 + 3 = ___	\N	"5"	5	easy	2加3等于5	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020004
365	essay	数学	一年级	请用自己的话说明什么是加法？	\N	"加法是把两个或多个数合在一起的运算"	10	medium	加法是基本运算之一	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020005
366	single	数学	二年级	5 × 2 = ?	{"A": "7", "B": "10", "C": "12", "D": "15"}	"B"	5	easy	5乘以2等于10	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020006
367	multiple	数学	二年级	以下哪些数是偶数？（多选）	{"A": "2", "B": "4", "C": "5", "D": "6"}	["A", "B", "D"]	5	medium	偶数能被2整除	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020007
494	single	数学	一年级	哪个选项是三角形？	["正方形", "圆形", "三角形", "五角星"]	"C"	1	easy	三角形有三条边和三个角	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{图形认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH1010
495	single	数学	二年级	25 + 13 = ?	["36", "37", "38", "39"]	"C"	1	easy	25加13等于38	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2001
496	single	数学	二年级	45 - 28 = ?	["15", "16", "17", "18"]	"C"	1	medium	45减28等于17	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2002
497	single	数学	二年级	3 × 4 = ?	["10", "11", "12", "13"]	"C"	1	easy	3乘4等于12	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2003
498	single	数学	二年级	一个长方形有几个直角？	["2", "3", "4", "5"]	"C"	1	easy	长方形有4个直角	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{图形认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2004
499	single	数学	二年级	100里面有几个10？	["5", "8", "10", "12"]	"C"	1	medium	100除以10等于10	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2005
1099	single	数学	一年级	【测试题】27 + 1 = ?	{"A": "28", "B": "29", "C": "30", "D": "31"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200027
1100	single	数学	一年级	【测试题】28 + 1 = ?	{"A": "29", "B": "30", "C": "31", "D": "32"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200028
441	single	数学	一年级	test	["1", "2", "3", "4"]	"B"	5	medium	test	\N	\N	\N	39	0	\N	t	\N	2025-11-03 12:14:02.866649	2025-11-03 12:14:02.866649	{computational_thinking}	{math_number_operations}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2511030001
368	true_false	数学	二年级	15是奇数。	{"A": "正确", "B": "错误"}	"A"	5	easy	15不能被2整除，是奇数	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020008
500	multiple	数学	二年级	以下哪些是偶数？	["3", "6", "7", "8"]	["B", "D"]	1	medium	偶数能被2整除，6和8都是偶数	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2006
501	true_false	数学	二年级	5 × 2 = 2 × 5	["正确", "错误"]	"A"	1	easy	乘法交换律：a×b = b×a	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算规律}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2007
369	blank	数学	二年级	20 ÷ 4 = ___	\N	"5"	5	easy	20除以4等于5	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020009
370	essay	数学	二年级	请解释乘法和加法的关系。	\N	"乘法是相同加数的连加，如3×4等于3+3+3+3"	10	medium	理解乘法的本质	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020010
371	single	数学	三年级	48 ÷ 6 = ?	{"A": "6", "B": "7", "C": "8", "D": "9"}	"C"	5	easy	48除以6等于8	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020011
372	multiple	数学	三年级	以下哪些是质数？（多选）	{"A": "2", "B": "3", "C": "4", "D": "5"}	["A", "B", "D"]	5	medium	质数只能被1和自身整除	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020012
373	true_false	数学	三年级	所有偶数都能被2整除。	{"A": "正确", "B": "错误"}	"A"	5	easy	偶数的定义就是能被2整除的数	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020013
374	blank	数学	三年级	7 × 9 = ___	\N	"63"	5	easy	7乘以9等于63	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020014
375	essay	数学	三年级	请说明如何判断一个数是质数还是合数。	\N	"质数只有1和它本身两个因数，合数除了1和它本身外还有其他因数"	10	medium	理解质数和合数的概念	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020015
376	single	数学	四年级	0.5 + 0.3 = ?	{"A": "0.7", "B": "0.8", "C": "0.9", "D": "1.0"}	"B"	5	easy	小数加法：0.5加0.3等于0.8	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020016
377	multiple	数学	四年级	以下哪些分数大于1/2？（多选）	{"A": "2/3", "B": "3/4", "C": "1/3", "D": "1/4"}	["A", "B"]	5	medium	2/3和3/4都大于1/2	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020017
378	true_false	数学	四年级	1/4 = 0.25	{"A": "正确", "B": "错误"}	"A"	5	easy	1除以4等于0.25	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020018
379	blank	数学	四年级	1.2 × 5 = ___	\N	"6"	5	easy	1.2乘以5等于6	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020019
380	essay	数学	四年级	请解释小数和分数的关系。	\N	"小数和分数都是表示部分数量的方法，可以相互转换"	10	medium	理解小数和分数的联系	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020020
381	single	数学	五年级	一个长方形的长是8cm，宽是5cm，它的面积是？	{"A": "13平方厘米", "B": "26平方厘米", "C": "40平方厘米", "D": "80平方厘米"}	"C"	5	medium	长方形面积 = 长 × 宽 = 8 × 5 = 40	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020021
502	blank	数学	二年级	7 × __ = 42	[]	"6"	1	medium	42除以7等于6	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2008
382	multiple	数学	五年级	以下哪些是正方体的特征？（多选）	{"A": "6个面", "B": "12条棱", "C": "8个顶点", "D": "所有棱长都相等"}	["A", "B", "C", "D"]	5	medium	正方体的所有特征	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020022
383	true_false	数学	五年级	圆的周长等于直径乘以π。	{"A": "正确", "B": "错误"}	"A"	5	easy	圆的周长公式：C = πd	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020023
384	blank	数学	五年级	一个圆的半径是3cm，它的面积是___ 平方厘米（π取3.14）	\N	"28.26"	5	medium	圆的面积 = πr² = 3.14 × 3² = 28.26	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020024
503	single	数学	二年级	1米等于多少厘米？	["10", "50", "100", "1000"]	"C"	1	easy	1米=100厘米	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{单位换算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2009
504	single	数学	二年级	小明有20元，买了5元的笔，还剩多少元？	["10", "12", "15", "18"]	"C"	1	medium	20-5=15元	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{应用题}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2010
385	essay	数学	五年级	请说明如何计算组合图形的面积。	\N	"将组合图形分解成基本图形，分别计算面积后相加或相减"	10	hard	理解组合图形面积的计算方法	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020025
234	single	数学	三年级	12 + 15 = ?	\N	{"answer": "27"}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{计算能力}	{加法运算,两位数加法}	L1	2	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301001
386	single	数学	六年级	如果x + 5 = 12，那么x = ?	{"A": "5", "B": "6", "C": "7", "D": "8"}	"C"	5	medium	x = 12 - 5 = 7	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020026
387	multiple	数学	六年级	以下哪些是百分数的应用场景？（多选）	{"A": "利率", "B": "折扣", "C": "增长率", "D": "税率"}	["A", "B", "C", "D"]	5	easy	百分数在生活中广泛应用	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020027
388	true_false	数学	六年级	圆柱的体积等于底面积乘以高。	{"A": "正确", "B": "错误"}	"A"	5	easy	圆柱体积公式：V = Sh	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020028
389	blank	数学	六年级	50的30%是___	\N	"15"	5	easy	50 × 30% = 50 × 0.3 = 15	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020029
390	essay	数学	六年级	请解释比例的基本性质。	\N	"在一个比例中，两个外项的积等于两个内项的积"	10	medium	理解比例的基本性质	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020030
391	single	数学	七年级	|-5| = ?	{"A": "-5", "B": "0", "C": "5", "D": "10"}	"C"	5	easy	绝对值是数在数轴上到原点的距离	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020031
1101	single	数学	一年级	【测试题】29 + 1 = ?	{"A": "30", "B": "31", "C": "32", "D": "33"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200029
392	multiple	数学	七年级	以下哪些是有理数？（多选）	{"A": "整数", "B": "分数", "C": "小数", "D": "无理数"}	["A", "B", "C"]	5	medium	有理数包括整数、分数和有限小数	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020032
394	blank	数学	七年级	(-3) × 4 = ___	\N	"-12"	5	easy	负数乘以正数等于负数	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020034
395	essay	数学	七年级	请解释有理数的运算顺序。	\N	"先算乘方，再算乘除，最后算加减；同级运算从左到右；有括号先算括号内"	10	medium	理解运算顺序	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020035
396	single	数学	八年级	(x + 2)(x - 2) = ?	{"A": "x² - 4", "B": "x² + 4", "C": "x² - 2", "D": "x² + 2"}	"A"	5	medium	平方差公式：(a+b)(a-b) = a² - b²	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020036
235	single	数学	三年级	25 - 8 = ?	\N	{"answer": "17"}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{计算能力}	{减法运算,两位数减法}	L1	2	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301002
397	multiple	数学	八年级	以下哪些是二次函数的图像特征？（多选）	{"A": "抛物线", "B": "对称轴", "C": "顶点", "D": "直线"}	["A", "B", "C"]	5	medium	二次函数图像是抛物线，有对称轴和顶点	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020037
398	true_false	数学	八年级	勾股定理只适用于直角三角形。	{"A": "正确", "B": "错误"}	"A"	5	easy	勾股定理是直角三角形的特有性质	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020038
399	blank	数学	八年级	一个直角三角形两条直角边长度分别为3和4，斜边长度是___	\N	"5"	5	medium	根据勾股定理：3² + 4² = 5²	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020039
400	essay	数学	八年级	请说明如何因式分解一个二次三项式。	\N	"找出两个数，它们的和等于一次项系数，积等于常数项，然后用十字相乘法分解"	10	hard	理解因式分解的方法	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020040
401	single	数学	九年级	一元二次方程x² - 5x + 6 = 0的解是？	{"A": "x=2或x=3", "B": "x=1或x=6", "C": "x=-2或x=-3", "D": "x=-1或x=-6"}	"A"	5	medium	分解因式：(x-2)(x-3)=0，得x=2或x=3	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020041
402	multiple	数学	九年级	以下哪些是相似三角形的判定方法？（多选）	{"A": "三边成比例", "B": "两角对应相等", "C": "两边成比例且夹角相等", "D": "全等"}	["A", "B", "C"]	5	medium	相似三角形的判定定理	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020042
505	single	数学	三年级	125 + 238 = ?	["353", "363", "373", "383"]	"B"	1	easy	125加238等于363	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3001
506	single	数学	三年级	456 - 189 = ?	["257", "267", "277", "287"]	"B"	1	medium	456减189等于267	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3002
507	single	数学	三年级	15 × 6 = ?	["80", "85", "90", "95"]	"C"	1	medium	15乘6等于90	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3003
403	true_false	数学	九年级	圆的切线垂直于过切点的半径。	{"A": "正确", "B": "错误"}	"A"	5	easy	这是圆的切线性质	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020043
404	blank	数学	九年级	若sin30° = 0.5，则cos60° = ___	\N	"0.5"	5	medium	sin30° = cos60° = 0.5	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020044
405	essay	数学	九年级	请说明二次函数的顶点式与一般式的转换方法。	\N	"通过配方法可以将一般式y=ax²+bx+c转换为顶点式y=a(x-h)²+k"	10	hard	理解二次函数的不同表示形式	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH2511020045
406	single	信息科技	三年级	计算机的"大脑"是？	{"A": "显示器", "B": "键盘", "C": "CPU", "D": "鼠标"}	"C"	5	easy	CPU是中央处理器，负责计算和控制	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020001
407	multiple	信息科技	三年级	以下哪些是计算机的输入设备？（多选）	{"A": "键盘", "B": "鼠标", "C": "显示器", "D": "扫描仪"}	["A", "B", "D"]	5	easy	输入设备用于向计算机输入信息	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020002
408	true_false	信息科技	三年级	显示器是输出设备。	{"A": "正确", "B": "错误"}	"A"	5	easy	显示器用于显示计算机输出的信息	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020003
409	blank	信息科技	三年级	计算机的三大组成部分是：输入设备、___和输出设备	\N	"主机"	5	easy	计算机由输入设备、主机和输出设备组成	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020004
236	single	数学	三年级	一个长方形的长是8厘米，宽是5厘米，它的周长是多少厘米？	\N	{"answer": "26"}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{空间想象}	{长方形周长,几何图形}	L2	3	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301003
410	essay	信息科技	三年级	请说明计算机在我们生活中的应用。	\N	"计算机用于学习、娱乐、通信、工作等多个方面"	10	easy	了解计算机的应用	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020005
411	single	信息科技	四年级	以下哪个软件是文字处理软件？	{"A": "Photoshop", "B": "Word", "C": "Excel", "D": "PowerPoint"}	"B"	5	easy	Word是微软的文字处理软件	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020006
64	single	数学	七年级	1+1 = ?	["1", "2"]	"A"	5	medium	test	{test}	\N	\N	1	0	\N	t	\N	2025-10-15 15:46:55.277518	2025-10-15 15:46:55.277518	{abstract_thinking}	{math_number_operations}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510150001
65	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:24:47.803792	2025-10-17 17:24:47.803792	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170001
66	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:25:18.38377	2025-10-17 17:25:18.38377	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170002
412	multiple	信息科技	四年级	以下哪些是常见的文件格式？（多选）	{"A": ".txt", "B": ".doc", "C": ".jpg", "D": ".mp3"}	["A", "B", "C", "D"]	5	easy	这些都是常见的文件格式	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020007
413	true_false	信息科技	四年级	文件夹可以包含其他文件夹。	{"A": "正确", "B": "错误"}	"A"	5	easy	文件夹可以嵌套，形成层级结构	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020008
508	single	数学	三年级	一个正方形的边长是5厘米，周长是多少厘米？	["15", "20", "25", "30"]	"B"	1	medium	正方形周长=边长×4=5×4=20	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3004
509	single	数学	三年级	72 ÷ 8 = ?	["7", "8", "9", "10"]	"C"	1	easy	72除以8等于9	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3005
414	blank	信息科技	四年级	在Windows系统中，复制文件的快捷键是___	\N	"Ctrl+C"	5	easy	Ctrl+C用于复制	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020009
415	essay	信息科技	四年级	请说明如何创建和管理文件夹。	\N	"右键点击空白处，选择新建文件夹，输入名称；可以通过拖拽来移动文件"	10	medium	了解文件管理	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020010
416	single	信息科技	五年级	Scratch中，以下哪个积木块用于移动角色？	{"A": "说", "B": "移动10步", "C": "等待", "D": "停止"}	"B"	5	easy	Scratch中移动积木块用于移动角色	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020011
510	multiple	数学	三年级	以下哪些数字能被3整除？	["15", "17", "18", "20"]	["A", "C"]	1	medium	15和18都能被3整除	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3006
511	true_false	数学	三年级	1千克=1000克	["正确", "错误"]	"A"	1	easy	1千克确实等于1000克	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{单位换算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3007
648	single	数学	七年级	解方程：x + 5 = 12	["5", "6", "7", "8"]	"C"	1	easy	x = 12 - 5 = 7	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{一元一次方程}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_004
417	multiple	信息科技	五年级	在Scratch中，以下哪些是事件积木？（多选）	{"A": "当绿旗被点击", "B": "当按下空格键", "C": "重复执行", "D": "广播"}	["A", "B"]	5	medium	事件积木用于触发程序执行	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020012
69	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:32:26.385253	2025-10-17 17:32:26.385253	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170003
418	true_false	信息科技	五年级	Scratch是一种图形化编程语言。	{"A": "正确", "B": "错误"}	"A"	5	easy	Scratch使用图形化积木进行编程	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020013
71	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:33:22.805023	2025-10-17 17:33:22.805023	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510170004
419	blank	信息科技	五年级	在Scratch中，让角色重复执行某个动作使用___积木	\N	"重复执行"	5	easy	重复执行积木用于循环	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020014
420	essay	信息科技	五年级	请说明什么是循环，并举例说明。	\N	"循环是重复执行某段代码，如让角色重复移动10步"	10	medium	理解循环概念	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020015
421	single	信息科技	六年级	在编程中，以下哪个是条件判断语句？	{"A": "循环", "B": "如果...那么", "C": "变量", "D": "函数"}	"B"	5	easy	条件判断使用if语句	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020016
75	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.352896	2025-10-18 03:20:43.352896	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180001
76	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.403501	2025-10-18 03:20:43.403501	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180002
422	multiple	信息科技	六年级	以下哪些是编程的基本结构？（多选）	{"A": "顺序", "B": "选择", "C": "循环", "D": "递归"}	["A", "B", "C"]	5	medium	顺序、选择和循环是三大基本结构	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020017
78	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.77082	2025-10-18 03:27:28.77082	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180003
423	true_false	信息科技	六年级	变量可以用来存储和改变数据。	{"A": "正确", "B": "错误"}	"A"	5	easy	变量是存储数据的容器	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020018
80	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.872587	2025-10-18 03:27:28.872587	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180004
81	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.497328	2025-10-18 03:33:44.497328	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180005
424	blank	信息科技	六年级	在编程中，___语句用于根据条件执行不同的代码	\N	"if"	5	easy	if语句用于条件判断	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020019
425	essay	信息科技	六年级	请解释什么是算法，并举一个简单的例子。	\N	"算法是解决问题的步骤，如计算1到100的和：初始化和为0，从1到100依次相加"	10	medium	理解算法概念	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020020
84	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.929332	2025-10-18 03:33:44.929332	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180006
426	single	信息科技	七年级	Python中，以下哪个是正确的输出语句？	{"A": "echo()", "B": "print()", "C": "printf()", "D": "cout"}	"B"	5	easy	Python使用print()函数输出	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020021
427	multiple	信息科技	七年级	Python中，以下哪些是数据类型？（多选）	{"A": "整数int", "B": "浮点数float", "C": "字符串str", "D": "布尔bool"}	["A", "B", "C", "D"]	5	medium	Python的基本数据类型	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020022
428	true_false	信息科技	七年级	Python是一种解释型语言。	{"A": "正确", "B": "错误"}	"A"	5	easy	Python代码逐行解释执行	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020023
88	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.042617	2025-10-18 03:34:36.042617	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180007
429	blank	信息科技	七年级	在Python中，定义变量x等于10的语句是：x = ___	\N	"10"	5	easy	Python使用=赋值	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L4	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020024
90	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.301118	2025-10-18 03:34:36.301118	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180008
93	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.51387	2025-10-18 03:36:39.51387	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180009
430	essay	信息科技	七年级	请说明Python中列表和字符串的区别。	\N	"列表可以包含多种类型的元素且可修改，字符串只包含字符且不可修改"	10	medium	理解数据类型	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020025
96	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.805301	2025-10-18 03:36:39.805301	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180010
431	single	信息科技	八年级	以下哪个不是面向对象编程的特征？	{"A": "封装", "B": "继承", "C": "多态", "D": "编译"}	"D"	5	medium	面向对象的三大特征是封装、继承和多态	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020026
432	multiple	信息科技	八年级	以下哪些是常见的排序算法？（多选）	{"A": "冒泡排序", "B": "快速排序", "C": "选择排序", "D": "插入排序"}	["A", "B", "C", "D"]	5	medium	这些都是常见的排序算法	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020027
433	true_false	信息科技	八年级	数组的索引从0开始。	{"A": "正确", "B": "错误"}	"A"	5	easy	大多数编程语言中数组索引从0开始	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L5	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020028
434	blank	信息科技	八年级	时间复杂度为O(n²)的排序算法有冒泡排序和___排序	\N	"选择"	5	medium	冒泡排序和选择排序都是O(n²)	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020029
101	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:45.085789	2025-10-18 03:42:45.085789	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180011
102	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:45.143321	2025-10-18 03:42:45.143321	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180012
435	essay	信息科技	八年级	请说明什么是递归，并举例说明。	\N	"递归是函数调用自己，如计算阶乘：n! = n × (n-1)!"	10	hard	理解递归概念	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020030
436	single	信息科技	九年级	以下哪个不是数据库管理系统？	{"A": "MySQL", "B": "Oracle", "C": "Photoshop", "D": "MongoDB"}	"C"	5	easy	Photoshop是图像处理软件	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020031
105	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.107466	2025-10-18 05:10:06.107466	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180013
437	multiple	信息科技	九年级	SQL语言中，以下哪些是数据操作语句？（多选）	{"A": "SELECT", "B": "INSERT", "C": "UPDATE", "D": "DELETE"}	["A", "B", "C", "D"]	5	medium	SQL的基本操作语句	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L7	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020032
438	true_false	信息科技	九年级	HTML是一种编程语言。	{"A": "正确", "B": "错误"}	"B"	5	easy	HTML是标记语言，不是编程语言	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020033
108	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.298795	2025-10-18 05:10:06.298795	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180014
109	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.307997	2025-10-18 05:10:06.307997	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180015
439	blank	信息科技	九年级	在网页开发中，CSS用于控制网页的___	\N	"样式"	5	easy	CSS用于控制网页样式	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L6	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020034
440	essay	信息科技	九年级	请说明前端开发和后端开发的区别。	\N	"前端负责用户界面和交互，后端负责数据处理和业务逻辑"	10	medium	理解前后端概念	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L7	5	published	{practice_municipal}	\N	\N	\N	\N	\N	OTHR2511020035
1102	single	数学	一年级	【测试题】30 + 1 = ?	{"A": "31", "B": "32", "C": "33", "D": "34"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200030
1103	single	数学	一年级	【测试题】31 + 1 = ?	{"A": "32", "B": "33", "C": "34", "D": "35"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200031
114	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.269583	2025-10-18 05:19:17.269583	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180016
1104	single	数学	一年级	【测试题】32 + 1 = ?	{"A": "33", "B": "34", "C": "35", "D": "36"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200032
116	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.380685	2025-10-18 05:19:17.380685	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180017
117	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.41163	2025-10-18 05:19:17.41163	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180018
1105	single	数学	一年级	【测试题】33 + 1 = ?	{"A": "34", "B": "35", "C": "36", "D": "37"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200033
119	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:22:08.30656	2025-10-18 15:22:08.30656	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180019
121	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:22:59.520033	2025-10-18 15:22:59.520033	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180020
122	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:23:23.535966	2025-10-18 15:23:23.535966	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180021
128	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.305032	2025-10-19 11:24:02.305032	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190001
1106	single	数学	一年级	【测试题】34 + 1 = ?	{"A": "35", "B": "36", "C": "37", "D": "38"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200034
1107	single	数学	一年级	【测试题】35 + 1 = ?	{"A": "36", "B": "37", "C": "38", "D": "39"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200035
131	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.308802	2025-10-19 11:24:02.308802	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190002
132	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.323816	2025-10-19 11:24:07.933191	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190003
133	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.523144	2025-10-19 11:27:01.523144	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190004
1108	single	数学	一年级	【测试题】36 + 1 = ?	{"A": "37", "B": "38", "C": "39", "D": "40"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200036
135	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.566374	2025-10-19 11:27:01.566374	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190005
1109	single	数学	一年级	【测试题】37 + 1 = ?	{"A": "38", "B": "39", "C": "40", "D": "41"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200037
1110	single	数学	一年级	【测试题】38 + 1 = ?	{"A": "39", "B": "40", "C": "41", "D": "42"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200038
1111	single	数学	一年级	【测试题】39 + 1 = ?	{"A": "40", "B": "41", "C": "42", "D": "43"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200039
139	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.725765	2025-10-19 11:27:06.693596	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190006
140	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.079539	2025-10-19 11:30:05.079539	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190007
141	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.079862	2025-10-19 11:30:05.079862	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190008
1112	single	数学	一年级	【测试题】40 + 1 = ?	{"A": "41", "B": "42", "C": "43", "D": "44"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200040
1113	single	数学	一年级	【测试题】41 + 1 = ?	{"A": "42", "B": "43", "C": "44", "D": "45"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200041
1114	single	数学	一年级	【测试题】42 + 1 = ?	{"A": "43", "B": "44", "C": "45", "D": "46"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200042
145	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.268428	2025-10-19 11:30:05.268428	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190009
1115	single	数学	一年级	【测试题】43 + 1 = ?	{"A": "44", "B": "45", "C": "46", "D": "47"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200043
1116	single	数学	一年级	【测试题】44 + 1 = ?	{"A": "45", "B": "46", "C": "47", "D": "48"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200044
512	blank	数学	三年级	一个长方形长8厘米，宽5厘米，面积是__平方厘米	[]	"40"	1	medium	长方形面积=长×宽=8×5=40	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3008
149	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.136329	2025-10-19 12:09:45.136329	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190010
150	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.154081	2025-10-19 12:09:45.154081	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190011
1117	single	数学	一年级	【测试题】45 + 1 = ?	{"A": "46", "B": "47", "C": "48", "D": "49"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200045
152	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.250338	2025-10-19 12:09:45.250338	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190012
1118	single	数学	一年级	【测试题】46 + 1 = ?	{"A": "47", "B": "48", "C": "49", "D": "50"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200046
1119	single	数学	一年级	【测试题】47 + 1 = ?	{"A": "48", "B": "49", "C": "50", "D": "51"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200047
1120	single	数学	一年级	【测试题】48 + 1 = ?	{"A": "49", "B": "50", "C": "51", "D": "52"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200048
157	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.577368	2025-10-19 12:14:19.577368	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190013
158	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.606139	2025-10-19 12:14:19.606139	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190014
160	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.617095	2025-10-19 12:14:25.434155	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190015
161	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 17:46:52.89898	2025-10-19 17:46:52.89898	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190016
1121	single	数学	一年级	【测试题】49 + 1 = ?	{"A": "50", "B": "51", "C": "52", "D": "53"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200049
1122	single	数学	一年级	【测试题】50 + 1 = ?	{"A": "51", "B": "52", "C": "53", "D": "54"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200050
166	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 18:03:48.351424	2025-10-19 18:03:48.351424	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190017
167	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 18:05:11.895475	2025-10-19 18:05:11.895475	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190018
513	single	数学	三年级	分数3/4读作？	["三分之四", "四分之三", "三比四", "四比三"]	"B"	1	easy	分子在前，分母在后，读作四分之三	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{分数认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3009
514	single	数学	三年级	小红买了3本书，每本12元，一共花了多少元？	["30", "34", "36", "40"]	"C"	1	medium	3×12=36元	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{应用题}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH3010
515	single	数学	四年级	2356 + 1478 = ?	["3824", "3834", "3844", "3854"]	"B"	1	easy	2356加1478等于3834	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4001
516	single	数学	四年级	5000 - 2387 = ?	["2603", "2613", "2623", "2633"]	"B"	1	medium	5000减2387等于2613	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4002
517	single	数学	四年级	125 × 8 = ?	["900", "950", "1000", "1050"]	"C"	1	medium	125乘8等于1000	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算能力}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4003
518	single	数学	四年级	一个平行四边形的底是10厘米，高是6厘米，面积是多少平方厘米？	["50", "60", "70", "80"]	"B"	1	medium	平行四边形面积=底×高=10×6=60	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4004
182	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 14:19:23.411048	2025-10-20 14:19:31.00452	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200001
519	single	数学	四年级	3.5 + 2.8 = ?	["6.1", "6.2", "6.3", "6.4"]	"C"	1	easy	3.5加2.8等于6.3	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{小数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4005
190	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:34:02.85602	2025-10-20 16:34:10.284889	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200003
207	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:29:05.895589	2025-10-21 05:29:05.895589	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210007
216	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:38:43.207741	2025-10-21 09:38:43.207741	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210014
520	multiple	数学	四年级	以下哪些是质数？	["4", "7", "9", "11"]	["B", "D"]	1	hard	质数只能被1和自身整除，7和11是质数	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4006
521	true_false	数学	四年级	0.5 = 1/2	["正确", "错误"]	"A"	1	easy	0.5确实等于二分之一	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{分数与小数}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4007
522	blank	数学	四年级	一个三角形的底是12厘米，高是8厘米，面积是__平方厘米	[]	"48"	1	medium	三角形面积=底×高÷2=12×8÷2=48	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4008
523	single	数学	四年级	比较大小：2/3 __ 3/4	["大于", "小于", "等于", "无法比较"]	"B"	1	medium	2/3=8/12，3/4=9/12，所以2/3<3/4	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{分数比较}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4009
524	single	数学	四年级	一辆汽车每小时行驶60千米，3.5小时行驶多少千米？	["200", "210", "220", "230"]	"B"	1	medium	60×3.5=210千米	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{应用题}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH4010
525	single	数学	五年级	2.5 × 4 = ?	["9", "10", "11", "12"]	"B"	1	easy	2.5乘4等于10	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{小数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5001
687	single	数学	三年级	【REV101-1762430363816】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 11:59:30.644539	2025-11-06 11:59:30.644539	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060003
688	single	数学	三年级	【REV101-1762430581656】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:03:08.495441	2025-11-06 12:03:08.495441	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060004
689	single	数学	三年级	【REV101-1762430724688】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:05:31.54337	2025-11-06 12:05:31.54337	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060005
690	single	数学	三年级	【REV101-1762430842006】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:07:28.766518	2025-11-06 12:07:28.766518	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060006
691	single	数学	三年级	【REV101-1762430997628】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:10:04.53299	2025-11-06 12:10:04.53299	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060007
692	single	数学	三年级	【QBC101-1762430997676】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:10:04.55595	2025-11-06 12:10:04.563124	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 12:10:04.563124	163	MATH2511060008
693	single	数学	三年级	【REV101-1762431664706】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:21:11.545714	2025-11-06 12:21:11.545714	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060009
482	single	数学	三年级	【REV101-1762263334693】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 13:35:41.547768	2025-11-04 13:35:41.547768	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511040019
526	single	数学	五年级	7.2 ÷ 0.8 = ?	["8", "9", "10", "11"]	"B"	1	medium	7.2除以0.8等于9	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{小数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5002
527	single	数学	五年级	一个圆的半径是5厘米，直径是多少厘米？	["5", "10", "15", "20"]	"B"	1	easy	直径=半径×2=5×2=10	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5003
528	single	数学	五年级	3/4 + 1/4 = ?	["1/2", "3/4", "1", "5/4"]	"C"	1	easy	同分母分数相加，分子相加，3/4+1/4=4/4=1	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{分数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5004
529	single	数学	五年级	一个长方体的长是8厘米，宽是5厘米，高是3厘米，体积是多少立方厘米？	["100", "110", "120", "130"]	"C"	1	medium	长方体体积=长×宽×高=8×5×3=120	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5005
530	multiple	数学	五年级	以下哪些分数可以化简？	["2/3", "4/6", "6/9", "5/7"]	["B", "C"]	1	medium	4/6=2/3，6/9=2/3，都可以化简	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{分数化简}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5006
531	true_false	数学	五年级	圆的周长公式是 C = 2πr	["正确", "错误"]	"A"	1	easy	圆的周长公式确实是2πr或πd	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何公式}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5007
532	blank	数学	五年级	一个正方体的棱长是4厘米，表面积是__平方厘米	[]	"96"	1	hard	正方体表面积=6×棱长²=6×4²=6×16=96	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5008
533	single	数学	五年级	小数0.125化成分数是？	["1/4", "1/5", "1/6", "1/8"]	"D"	1	medium	0.125=125/1000=1/8	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{小数与分数}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5009
534	single	数学	五年级	一个水池长10米，宽8米，深2米，容积是多少立方米？	["140", "150", "160", "170"]	"C"	1	medium	10×8×2=160立方米	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{应用题}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH5010
535	single	数学	六年级	(-5) + 3 = ?	["-8", "-2", "2", "8"]	"B"	1	easy	负5加正3等于负2	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6001
536	single	数学	六年级	2 - (-3) = ?	["1", "5", "-1", "-5"]	"B"	1	medium	减去一个负数等于加上它的相反数，2-(-3)=2+3=5	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6002
537	single	数学	六年级	圆柱的体积公式是？	["πr²", "πr²h", "2πr", "2πrh"]	"B"	1	easy	圆柱体积=底面积×高=πr²h	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何公式}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6003
538	single	数学	六年级	比例式 3:4 = x:12 中，x等于多少？	["6", "7", "8", "9"]	"D"	1	medium	根据比例的基本性质，4x=3×12=36，x=9	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{比例}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6004
539	single	数学	六年级	一个圆的半径扩大2倍，面积扩大多少倍？	["2倍", "3倍", "4倍", "8倍"]	"C"	1	hard	半径扩大2倍，面积扩大2²=4倍	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何变换}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6005
540	multiple	数学	六年级	以下哪些是负数？	["-5", "0", "3", "-0.5"]	["A", "D"]	1	easy	-5和-0.5都是负数	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数感}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6006
541	true_false	数学	六年级	所有的整数都是有理数	["正确", "错误"]	"A"	1	easy	整数都可以表示为分数形式，都是有理数	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数的分类}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6007
542	blank	数学	六年级	一个圆锥的底面半径是3厘米，高是4厘米，体积是__立方厘米（π取3.14）	[]	"37.68"	1	hard	圆锥体积=1/3×πr²h=1/3×3.14×3²×4=37.68	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何计算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6008
543	single	数学	六年级	百分数60%化成小数是？	["0.06", "0.6", "6", "60"]	"B"	1	easy	60%=60/100=0.6	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{百分数}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6009
544	single	数学	六年级	某商品原价100元，打8折后价格是多少元？	["70", "75", "80", "85"]	"C"	1	medium	100×80%=80元	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{应用题}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH6010
545	single	数学	七年级	(-8) + (-5) = ?	["-13", "-3", "3", "13"]	"A"	1	easy	两个负数相加，绝对值相加，结果为负	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7001
546	single	数学	七年级	(-2) × 3 = ?	["-6", "-5", "5", "6"]	"A"	1	easy	负数乘正数得负数	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7002
547	single	数学	七年级	2x + 5 = 15，求x的值	["3", "4", "5", "6"]	"C"	1	medium	2x=15-5=10，x=5	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{一元一次方程}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7003
548	single	数学	七年级	合并同类项：3x + 2x = ?	["5x", "5x²", "6x", "x"]	"A"	1	easy	系数相加，字母和指数不变	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7004
1123	single	数学	一年级	【测试题】1 + 1 = ?	{"A": "2", "B": "3", "C": "4", "D": "5"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200051
549	single	数学	七年级	平角等于多少度？	["90°", "180°", "270°", "360°"]	"B"	1	easy	平角等于180度	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何基础}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7005
550	multiple	数学	七年级	以下哪些是单项式？	["2x", "x+y", "3xy", "5"]	["A", "C", "D"]	1	medium	单项式是数字或字母的乘积	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数识别}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7006
551	true_false	数学	七年级	两条直线被第三条直线所截，同位角相等	["正确", "错误"]	"B"	1	easy	只有在两直线平行时，同位角才相等	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何定理}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7007
359	essay	信息科技	九年级	请简述冒泡排序算法的基本思想。	null	"冒泡排序通过重复遍历数组，比较相邻元素并交换位置，将最大（或最小）元素逐步移到数组末端。"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{算法设计,排序算法}	{冒泡排序,算法原理}	L5	15	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300012
360	code	信息科技	九年级	编写程序：使用循环计算1到100的累加和。	null	"sum=0; for i=1 to 100: sum=sum+i; 输出sum"	20	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{循环结构,程序设计}	{for循环,累加运算}	L5	20	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300013
552	blank	数学	七年级	如果 3x - 7 = 8，那么 x = __	[]	"5"	1	medium	3x=8+7=15，x=5	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{方程求解}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7008
553	single	数学	七年级	(-3)² = ?	["-9", "-6", "6", "9"]	"D"	1	easy	(-3)²=(-3)×(-3)=9	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{乘方运算}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7009
554	single	数学	七年级	小明买了x支铅笔，每支2元，付了20元，应找回多少元？	["20-x", "20-2x", "2x-20", "x-20"]	"B"	1	medium	找零=付款-花费=20-2x	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{应用题}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH7010
555	single	数学	八年级	√16 = ?	["2", "3", "4", "8"]	"C"	1	easy	16的算术平方根是4	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{二次根式}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8001
556	single	数学	八年级	勾股定理：直角三角形两直角边长为3和4，斜边长为？	["5", "6", "7", "8"]	"A"	1	medium	c²=a²+b²=9+16=25，c=5	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{勾股定理}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8002
557	single	数学	八年级	因式分解：x² - 9 = ?	["(x-3)(x-3)", "(x+3)(x+3)", "(x-3)(x+3)", "x(x-9)"]	"C"	1	medium	平方差公式：a²-b²=(a+b)(a-b)	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{因式分解}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8003
558	single	数学	八年级	一次函数 y = 2x + 1 的图像经过哪个象限？	["一、二、三", "一、二、四", "二、三、四", "一、三、四"]	"A"	1	hard	k>0,b>0，图像经过一、二、三象限	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{函数图像}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8004
559	single	数学	八年级	平行四边形的对角线互相？	["垂直", "平分", "相等", "平行"]	"B"	1	easy	平行四边形的对角线互相平分	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何性质}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8005
560	multiple	数学	八年级	以下哪些是完全平方公式？	["(a+b)²=a²+2ab+b²", "(a-b)²=a²-2ab+b²", "a²-b²=(a+b)(a-b)", "(a+b)(a-b)=a²-b²"]	["A", "B"]	1	medium	前两个是完全平方公式	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数公式}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8006
561	true_false	数学	八年级	全等三角形的对应角相等	["正确", "错误"]	"A"	1	easy	全等三角形的对应边相等，对应角也相等	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{全等三角形}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8007
562	blank	数学	八年级	分式 (x²-1)/(x-1) 化简后等于__（x≠1）	[]	"x+1"	1	medium	x²-1=(x+1)(x-1)，约分后得x+1	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{分式化简}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8008
563	single	数学	八年级	等腰三角形的两边长为5和10，第三边长为？	["5", "10", "15", "5或10"]	"B"	1	medium	如果5是腰，5+5<10不满足三角形不等式，所以10是腰，第三边为10	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{三角形性质}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8009
564	single	数学	八年级	若分式 (x-2)/(x+3) 的值为0，则x的值为？	["0", "2", "3", "-3"]	"B"	1	medium	分式值为0，分子为0且分母不为0，x-2=0，x=2	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{分式方程}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH8010
565	single	数学	九年级	方程 x² - 5x + 6 = 0 的解是？	["x=1或x=6", "x=2或x=3", "x=-2或x=-3", "x=1或x=5"]	"B"	1	medium	因式分解：(x-2)(x-3)=0，x=2或x=3	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{一元二次方程}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9001
566	single	数学	九年级	二次函数 y = x² - 2x + 1 的顶点坐标是？	["(0,1)", "(1,0)", "(2,1)", "(-1,4)"]	"B"	1	hard	y=(x-1)²，顶点为(1,0)	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{二次函数}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9002
567	single	数学	九年级	圆的半径为5，圆心到直线的距离为3，直线与圆的位置关系是？	["相离", "相切", "相交", "无法确定"]	"C"	1	medium	距离3<半径5，直线与圆相交	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{直线与圆}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9003
237	multiple	数学	三年级	下列哪些数字是偶数？\\nA. 12\\nB. 15\\nC. 18\\nD. 21	\N	{"answers": ["A", "C"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{数的认识}	{奇偶数}	L2	3	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301004
238	blank	数学	三年级	3 × 4 = __	\N	{"answers": ["12"]}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{计算能力}	{乘法运算,乘法口诀}	L1	2	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301005
239	blank	数学	三年级	一盒铅笔有12支，3盒铅笔一共有__支	\N	{"answers": ["36"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{应用能力}	{乘法应用,应用题}	L2	3	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301006
240	essay	数学	三年级	小明有30元钱，买了一本书花了12元，买了一支笔花了5元。请问：\\n1. 小明一共花了多少钱？\\n2. 小明还剩多少钱？	\N	{"answer": "1. 12 + 5 = 17元\\n2. 30 - 17 = 13元"}	1	hard	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{应用能力,逻辑推理}	{综合应用,加减混合运算}	L3	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH0301007
244	multiple	数学	五年级	下列哪些分数与 1/2 相等？\\nA. 2/4\\nB. 3/5\\nC. 4/8\\nD. 5/9	\N	{"answers": ["A", "C"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{数的认识}	{分数化简}	L2	3	approved	{practice_municipal}	\N	\N	\N	\N	\N	MATH0501003
245	blank	数学	五年级	5/8 + 1/8 = __	\N	{"answers": ["3/4"]}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{计算能力}	{分数加法}	L1	2	approved	{practice_municipal}	\N	\N	\N	\N	\N	MATH0501004
246	blank	数学	五年级	一个圆的半径是5厘米，它的面积是__平方厘米（π取3.14）	\N	{"answers": ["78.5"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{计算能力}	{圆的面积}	L2	3	approved	{practice_municipal}	\N	\N	\N	\N	\N	MATH0501005
247	essay	数学	五年级	一个水池能装水120立方米，现在有两个水龙头同时向水池注水，甲水龙头每小时注水15立方米，乙水龙头每小时注水10立方米。多长时间可以把水池注满？	\N	{"answer": "两个水龙头每小时共注水：15 + 10 = 25立方米\\n注满时间：120 ÷ 25 = 4.8小时"}	1	hard	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{应用能力,逻辑推理}	{应用题,速度与时间}	L3	5	approved	{practice_municipal}	\N	\N	\N	\N	\N	MATH0501006
243	single	数学	五年级	一个长方体的长是10cm，宽是5cm，高是3cm，它的体积是多少立方厘米？	["1", "2"]	[""]	1	medium	\N	{}	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-30 05:46:58.49467	{空间想象}	{长方体体积}	L2	3	approved	{practice_municipal}	\N	\N	\N	\N	\N	MATH0501002
484	single	数学	三年级	【REV101-1762263788795】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 13:43:15.670257	2025-11-04 13:43:15.670257	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511040020
568	single	数学	九年级	sin30° = ?	["1/2", "√2/2", "√3/2", "1"]	"A"	1	easy	sin30°=1/2是特殊角三角函数值	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{三角函数}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9004
569	single	数学	九年级	圆的切线性质：切线与半径的关系？	["平行", "垂直", "相等", "相交"]	"B"	1	easy	圆的切线垂直于过切点的半径	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{圆的性质}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9005
570	multiple	数学	九年级	以下哪些方程有实数解？	["x²+1=0", "x²-4=0", "x²+2x+1=0", "x²+x+1=0"]	["B", "C"]	1	hard	x²-4=0和x²+2x+1=0的判别式≥0，有实数解	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{方程判别}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9006
571	true_false	数学	九年级	相似三角形的对应边成比例	["正确", "错误"]	"A"	1	easy	相似三角形的定义就是对应边成比例	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{相似三角形}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9007
572	blank	数学	九年级	若抛物线 y = ax² + bx + c 的对称轴为 x = 2，则 b/a = __	[]	"-4"	1	hard	对称轴 x = -b/(2a) = 2，所以 b/a = -4	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{二次函数}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9008
573	single	数学	九年级	在Rt△ABC中，∠C=90°，AC=3，BC=4，则tanA=？	["3/4", "4/3", "3/5", "4/5"]	"B"	1	medium	tanA=对边/邻边=BC/AC=4/3	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{三角函数}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9009
574	single	数学	九年级	圆锥的母线长为10cm，底面半径为6cm，侧面积是多少cm²？（π取3.14）	["180", "188.4", "200", "240"]	"B"	1	hard	侧面积=πrl=3.14×6×10=188.4	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{立体几何}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	MATH9010
575	single	信息科技	三年级	下列哪个是计算机的输入设备？	["显示器", "打印机", "键盘", "音箱"]	"C"	1	easy	键盘用于输入信息到计算机	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{硬件认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3001
576	single	信息科技	三年级	鼠标的左键通常用来做什么？	["删除", "选择和确认", "复制", "取消"]	"B"	1	easy	左键主要用于选择和确认操作	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{硬件操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3002
577	single	信息科技	三年级	计算机的"大脑"是指？	["显示器", "键盘", "CPU", "鼠标"]	"C"	1	easy	CPU是中央处理器，相当于计算机的大脑	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{硬件认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3003
578	single	信息科技	三年级	保存文件的快捷键是？	["Ctrl+C", "Ctrl+V", "Ctrl+S", "Ctrl+Z"]	"C"	1	medium	Ctrl+S是保存文件的快捷键	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3004
32	multiple	数学	八年级	下列函数中，y随x增大而增大的有（）	["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]	["A", "C"]	10	medium	A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.737829	2025-10-14 14:52:13.737829	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.737829	1	MATH2510140014
43	blank	数学	八年级	若x²-6x+m是完全平方式，则m=______。	["9"]	"9"	5	medium	完全平方公式：(x-3)²=x²-6x+9，所以m=9	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.76764	2025-10-14 14:52:13.76764	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.76764	1	MATH2510140017
52	essay	数学	八年级	已知△ABC中，AB=AC，点D在BC上，且AD平分∠BAC。求证：BD=CD。	\N	"证明：因为AB=AC，AD平分∠BAC，所以∠BAD=∠CAD。在△ABD和△ACD中，AB=AC，∠BAD=∠CAD，AD=AD，所以△ABD≌△ACD(SAS)，所以BD=CD。"	15	medium	利用等腰三角形的性质和全等三角形的判定与性质	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.793693	2025-10-14 14:52:13.793693	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.793693	1	MATH2510140018
1124	single	数学	一年级	【测试题】2 + 1 = ?	{"A": "3", "B": "4", "C": "5", "D": "6"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200052
30	single	信息科技	七年级	下列设备中，属于输入设备的是（）	["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]	"C"	5	easy	键盘是输入设备，用于向计算机输入数据和指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.73246	2025-10-14 14:52:13.73246	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.73246	1	COMP2510140002
579	single	信息科技	三年级	下列哪个是文件夹图标？	["文本文件", "文件夹", "程序", "图片"]	"B"	1	easy	文件夹用于存放文件	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{基础操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3005
580	multiple	信息科技	三年级	计算机可以用来做什么？	["打字", "画画", "听音乐", "以上都可以"]	["A", "B", "C"]	1	easy	计算机有多种用途	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{计算机应用}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3006
1125	single	数学	一年级	【测试题】3 + 1 = ?	{"A": "4", "B": "5", "C": "6", "D": "7"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200053
581	true_false	信息科技	三年级	关机前需要先关闭所有程序	["正确", "错误"]	"A"	1	easy	关机前应该正确关闭程序，避免数据丢失	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{安全操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3007
582	blank	信息科技	三年级	键盘上的__键可以删除光标前面的字符	[]	"Backspace"	1	medium	Backspace键用于删除光标前的字符	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{键盘操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3008
583	single	信息科技	三年级	哪个软件可以用来画画？	["Word", "画图", "记事本", "计算器"]	"B"	1	easy	画图软件用于绘图	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3009
1126	single	数学	一年级	【测试题】4 + 1 = ?	{"A": "5", "B": "6", "C": "7", "D": "8"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200054
584	single	信息科技	三年级	双击文件可以？	["删除文件", "打开文件", "复制文件", "重命名文件"]	"B"	1	easy	双击可以打开文件	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{基础操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT3010
585	single	信息科技	四年级	浏览器的主要作用是？	["编辑文档", "浏览网页", "播放音乐", "编辑图片"]	"B"	1	easy	浏览器用于访问和浏览网页	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络应用}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4001
586	single	信息科技	四年级	URL是什么的缩写？	["网页地址", "电子邮件", "文件名", "用户名"]	"A"	1	medium	URL是统一资源定位符，即网址	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络概念}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4002
587	single	信息科技	四年级	搜索引擎可以用来？	["查找信息", "编辑文档", "画图", "计算"]	"A"	1	easy	搜索引擎帮助我们在互联网上查找信息	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络应用}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4003
588	single	信息科技	四年级	电子邮件的地址中必须包含什么符号？	["#", "*", "@", "&"]	"C"	1	easy	电子邮件地址格式为：用户名@域名	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络应用}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4004
1127	single	数学	一年级	【测试题】5 + 1 = ?	{"A": "6", "B": "7", "C": "8", "D": "9"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200055
589	single	信息科技	四年级	Word软件主要用于？	["制作表格", "文字处理", "制作演示文稿", "图像处理"]	"B"	1	easy	Word是文字处理软件	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件应用}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4005
590	multiple	信息科技	四年级	以下哪些是存储设备？	["U盘", "硬盘", "内存条", "显示器"]	["A", "B", "C"]	1	medium	U盘、硬盘、内存条都是存储设备	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{硬件认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4006
591	true_false	信息科技	四年级	在网上不应该随意透露个人信息	["正确", "错误"]	"A"	1	easy	保护个人信息安全很重要	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网络安全}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4007
1128	single	数学	一年级	【测试题】6 + 1 = ?	{"A": "7", "B": "8", "C": "9", "D": "10"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200056
1129	single	数学	一年级	【测试题】7 + 1 = ?	{"A": "8", "B": "9", "C": "10", "D": "11"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200057
592	blank	信息科技	四年级	复制的快捷键是Ctrl+__	[]	"C"	1	medium	Ctrl+C是复制快捷键	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{键盘操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4008
593	single	信息科技	四年级	PowerPoint软件主要用于？	["文字处理", "表格制作", "演示文稿制作", "图像编辑"]	"C"	1	easy	PowerPoint用于制作演示文稿	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件应用}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4009
594	single	信息科技	四年级	下列哪个不是网络浏览器？	["Chrome", "Edge", "Word", "Firefox"]	"C"	1	medium	Word是文字处理软件，不是浏览器	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT4010
595	single	信息科技	五年级	Excel软件主要用于？	["文字处理", "电子表格", "演示文稿", "图像处理"]	"B"	1	easy	Excel用于制作和处理电子表格	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件应用}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5001
596	single	信息科技	五年级	在Excel中，单元格A1表示？	["第1行第A列", "第A行第1列", "工作表A的第1个单元格", "第1个工作表"]	"A"	1	medium	A表示列，1表示行	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5002
597	single	信息科技	五年级	什么是算法？	["一种编程语言", "解决问题的步骤", "一个软件", "一种硬件"]	"B"	1	medium	算法是解决问题的明确步骤	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程基础}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5003
598	single	信息科技	五年级	Scratch是一种什么软件？	["文字处理", "图形化编程", "图像处理", "表格制作"]	"B"	1	easy	Scratch是图形化编程工具	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程工具}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5004
599	single	信息科技	五年级	程序的三种基本结构不包括？	["顺序结构", "选择结构", "循环结构", "递归结构"]	"D"	1	hard	基本结构是顺序、选择、循环	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程基础}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5005
600	multiple	信息科技	五年级	以下哪些是编程语言？	["Python", "Java", "Word", "C++"]	["A", "B", "D"]	1	medium	Python、Java、C++都是编程语言	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程认知}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5006
601	true_false	信息科技	五年级	程序需要按照一定的语法规则编写	["正确", "错误"]	"A"	1	easy	每种编程语言都有自己的语法规则	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程基础}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5007
602	blank	信息科技	五年级	在Scratch中，__模块用于控制程序的流程	[]	"控制"	1	medium	控制模块包含条件判断和循环等	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程工具}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5008
603	single	信息科技	五年级	在Excel中，SUM函数的作用是？	["求平均值", "求和", "计数", "查找"]	"B"	1	easy	SUM函数用于求和	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{软件操作}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5009
604	single	信息科技	五年级	下列哪个不属于信息的基本特征？	["普遍性", "依附性", "价值性", "固定性"]	"D"	1	medium	信息是可变的，不是固定的	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{信息素养}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT5010
605	single	信息科技	六年级	什么是变量？	["一个常数", "一个存储数据的容器", "一个函数", "一个循环"]	"B"	1	medium	变量用于存储可变的数据	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程概念}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6001
606	single	信息科技	六年级	在编程中，if语句属于什么结构？	["顺序结构", "选择结构", "循环结构", "函数结构"]	"B"	1	easy	if语句用于条件判断，属于选择结构	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程结构}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6002
607	single	信息科技	六年级	什么是循环？	["程序只执行一次", "重复执行某段代码", "跳过某段代码", "结束程序"]	"B"	1	medium	循环用于重复执行代码	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程概念}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6003
608	single	信息科技	六年级	人工智能的英文缩写是？	["AI", "VR", "AR", "IT"]	"A"	1	easy	AI是Artificial Intelligence的缩写	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{前沿技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6004
609	single	信息科技	六年级	什么是云计算？	["在云朵上计算", "通过网络提供计算服务", "一种天气预报", "一种游戏"]	"B"	1	medium	云计算通过互联网提供计算资源	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{前沿技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6005
610	multiple	信息科技	六年级	以下哪些是人工智能的应用？	["语音识别", "图像识别", "文字处理", "智能推荐"]	["A", "B", "D"]	1	medium	AI可应用于语音、图像识别和智能推荐	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{前沿技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6006
611	true_false	信息科技	六年级	大数据可以帮助我们发现规律和趋势	["正确", "错误"]	"A"	1	easy	大数据分析能发现隐藏的模式和趋势	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{前沿技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6007
612	blank	信息科技	六年级	在Python中，__语句用于创建循环	[]	"for或while"	1	medium	for和while都可以创建循环	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6008
613	single	信息科技	六年级	物联网的英文缩写是？	["AI", "IoT", "VR", "AR"]	"B"	1	easy	IoT是Internet of Things的缩写	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{前沿技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6009
614	single	信息科技	六年级	下列哪个是开源操作系统？	["Windows", "macOS", "Linux", "iOS"]	"C"	1	medium	Linux是开源操作系统	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{操作系统}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT6010
615	single	信息科技	七年级	Python中，哪个运算符用于整除？	["/", "//", "%", "**"]	"B"	1	medium	//是整除运算符	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7001
68	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:26:40.737991	2025-10-17 17:26:40.737991	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510170001
72	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:33:28.691817	2025-10-17 17:33:28.691817	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510170002
74	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.35109	2025-10-18 03:20:43.35109	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180001
79	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.852633	2025-10-18 03:27:28.852633	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180002
82	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.514783	2025-10-18 03:33:44.514783	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180003
89	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.065238	2025-10-18 03:34:36.065238	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180004
94	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.584985	2025-10-18 03:36:39.584985	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180005
99	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:44.951982	2025-10-18 03:42:44.951982	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180006
348	true_false	信息科技	七年级	CPU是计算机的中央处理器。	null	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.303086	2025-10-30 10:52:26.303086	{计算机硬件,基础知识}	{CPU,计算机组成}	L4	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300001
349	matching	信息科技	七年级	连线匹配：存储单位（1KB=1024B，1MB=1024KB，1GB=1024MB）	null	"1KB-1024B,1MB-1024KB,1GB-1024MB"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.303086	2025-10-30 10:52:26.303086	{存储单位,数据存储}	{存储容量,单位换算}	L4	10	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300002
350	code	信息科技	七年级	编写程序：输入两个整数a和b，输出它们的和。	null	"输入a和b，输出a+b"	15	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.303086	2025-10-30 10:52:26.303086	{编程基础,输入输出}	{程序设计,简单运算}	L4	15	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300003
351	single	信息科技	九年级	二进制数1010转换为十进制是多少？	["8", "10", "12", "14"]	"10"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{进制转换,数制}	{二进制,进制转换}	L5	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300004
352	single	信息科技	九年级	下列哪个是面向对象编程的特征？	["封装", "编译", "链接", "调试"]	"封装"	5	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{编程范式,面向对象}	{OOP,编程思想}	L5	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300005
353	single	信息科技	九年级	IP地址由多少位二进制数组成？	["16位", "24位", "32位", "64位"]	"32位"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{网络知识,IP地址}	{IP地址,网络基础}	L5	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300006
354	multiple	信息科技	九年级	下列哪些是常见的编程语言？（多选）	["Python", "HTML", "Java", "C++"]	["Python", "Java", "C++"]	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{编程语言,语言分类}	{编程语言,语言类型}	L5	10	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300007
355	blank	信息科技	九年级	数据库中用于查询数据的SQL语句是( )。	null	"SELECT"	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{数据库,SQL语言}	{SQL,数据查询}	L5	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300008
356	blank	信息科技	九年级	HTTP协议默认使用的端口号是( )。	null	"80"	5	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{网络协议,端口}	{HTTP,网络服务}	L5	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300009
357	true_false	信息科技	九年级	算法的时间复杂度O(n²)比O(n)更高效。	null	false	5	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{算法分析,时间复杂度}	{算法,复杂度}	L5	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300010
358	true_false	信息科技	九年级	HTML是一种编程语言。	null	false	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{Web技术,语言分类}	{HTML,标记语言}	L5	5	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300011
616	single	信息科技	七年级	Python中，print()函数的作用是？	["输入数据", "输出数据", "计算数据", "存储数据"]	"B"	1	easy	print()用于输出数据到屏幕	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7002
1130	single	数学	一年级	【测试题】8 + 1 = ?	{"A": "9", "B": "10", "C": "11", "D": "12"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200058
1131	single	数学	一年级	【测试题】9 + 1 = ?	{"A": "10", "B": "11", "C": "12", "D": "13"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200059
1132	single	数学	一年级	【测试题】10 + 1 = ?	{"A": "11", "B": "12", "C": "13", "D": "14"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200060
1133	single	数学	一年级	【测试题】11 + 1 = ?	{"A": "12", "B": "13", "C": "14", "D": "15"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200061
1134	single	数学	一年级	【测试题】12 + 1 = ?	{"A": "13", "B": "14", "C": "15", "D": "16"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200062
31	single	信息科技	七年级	计算机的"大脑"是（）	["A. 硬盘", "B. CPU", "C. 内存", "D. 主板"]	"B"	5	easy	CPU(中央处理器)是计算机的核心，负责处理数据和执行指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.7352	2025-10-14 14:52:13.7352	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.7352	1	COMP2510140003
40	multiple	信息科技	七年级	下列属于应用软件的有（）	["A. Windows", "B. Word", "C. Excel", "D. PowerPoint"]	["B", "C", "D"]	10	easy	Windows是操作系统，Word、Excel、PowerPoint是应用软件	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.759691	2025-10-14 14:52:13.759691	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.759691	1	COMP2510140004
50	blank	信息科技	七年级	计算机中最小的信息单位是______。	["位", "bit", "比特"]	"位"	5	easy	位(bit)是计算机中最小的信息单位，表示0或1	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.788394	2025-10-14 14:52:13.788394	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.788394	1	COMP2510140006
60	essay	信息科技	七年级	请说明什么是计算机病毒，并列举三种预防计算机病毒的方法。	\N	"计算机病毒是一种人为编制的、能够自我复制并破坏计算机功能或数据的程序。预防方法：1.安装正版杀毒软件并定期更新；2.不随意打开来历不明的邮件和文件；3.不使用来历不明的U盘和光盘；4.定期备份重要数据；5.及时更新操作系统补丁。"	15	easy	考查网络安全意识和防护措施	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.814946	2025-10-14 14:52:13.814946	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.814946	1	COMP2510140008
62	code	信息科技	七年级	编写程序：输入三个整数，输出其中的最大值。	\N	"a = int(input())\\nb = int(input())\\nc = int(input())\\nmax_num = a\\nif b > max_num:\\n    max_num = b\\nif c > max_num:\\n    max_num = c\\nprint(max_num)"	20	easy	使用条件判断找出最大值	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.820675	2025-10-14 14:52:13.820675	{}	{}	\N	5	approved	{practice_municipal}	\N	\N	\N	2025-10-14 14:52:13.820675	1	COMP2510140010
617	single	信息科技	七年级	在Python中，如何表示字符串？	["用括号", "用引号", "用方括号", "用花括号"]	"B"	1	easy	字符串用单引号或双引号表示	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7003
618	single	信息科技	七年级	Python中，==运算符的作用是？	["赋值", "比较相等", "加法", "连接"]	"B"	1	medium	==用于判断两个值是否相等	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7004
619	single	信息科技	七年级	列表是Python中的什么数据类型？	["数字", "字符串", "序列", "字典"]	"C"	1	medium	列表是一种序列类型	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7005
620	multiple	信息科技	七年级	Python中，以下哪些是循环语句？	["if", "for", "while", "def"]	["B", "C"]	1	medium	for和while都是循环语句	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7006
621	true_false	信息科技	七年级	Python是一种解释型编程语言	["正确", "错误"]	"A"	1	easy	Python代码逐行解释执行	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7007
622	blank	信息科技	七年级	Python中，input()函数用于__数据	[]	"输入"	1	easy	input()函数用于从用户获取输入	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7008
623	single	信息科技	七年级	在Python中，#符号用于？	["定义变量", "注释", "输出", "计算"]	"B"	1	easy	#用于添加注释	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语法}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7009
624	single	信息科技	七年级	Python中，range(5)会生成哪些数字？	["1,2,3,4,5", "0,1,2,3,4", "0,1,2,3,4,5", "1,2,3,4"]	"B"	1	medium	range(5)生成0到4的数字	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语言}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT7010
625	single	信息科技	八年级	HTML是什么的缩写？	["超文本标记语言", "超级文本", "高级语言", "网页语言"]	"A"	1	easy	HTML是HyperText Markup Language	\N	\N	\N	1	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{网页技术}	{}	\N	5	published	{practice_municipal}	\N	\N	\N	\N	\N	IT8001
649	single	数学	七年级	合并同类项：5a + 3a = ?	["8", "8a", "8a²", "15a"]	"B"	1	easy	系数相加	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_005
1135	single	数学	一年级	【测试题】13 + 1 = ?	{"A": "14", "B": "15", "C": "16", "D": "17"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200063
1136	single	数学	一年级	【测试题】14 + 1 = ?	{"A": "15", "B": "16", "C": "17", "D": "18"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200064
1137	single	数学	一年级	【测试题】15 + 1 = ?	{"A": "16", "B": "17", "C": "18", "D": "19"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200065
651	single	数学	七年级	(-2)³ = ?	["-8", "-6", "6", "8"]	"A"	1	medium	(-2)×(-2)×(-2) = -8	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{乘方运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_007
652	single	数学	七年级	解方程：3x - 6 = 9	["3", "4", "5", "6"]	"C"	1	medium	3x = 15, x = 5	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{一元一次方程}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_008
653	single	数学	七年级	一个角的补角是120°，这个角是多少度？	["30°", "60°", "90°", "120°"]	"B"	1	medium	补角之和为180°	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何基础}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_009
654	single	数学	七年级	去括号：-(2x - 3) = ?	["-2x - 3", "-2x + 3", "2x - 3", "2x + 3"]	"B"	1	medium	括号前是负号，去括号要变号	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_010
655	multiple	数学	七年级	以下哪些是有理数？	["-3", "0", "π", "1/2"]	["A", "B", "D"]	1	medium	π是无理数	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数的分类}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_011
656	true_false	数学	七年级	两条直线被第三条直线所截，内错角相等	["正确", "错误"]	"B"	1	medium	需要两直线平行时才成立	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{几何定理}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_012
657	blank	数学	七年级	化简：3(x + 2) = __	[]	"3x + 6"	1	easy	分配律展开	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_013
658	single	数学	七年级	比较大小：-5 __ -3	["大于", "小于", "等于", "无法比较"]	"B"	1	easy	负数越大，值越小	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数比较}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_014
659	single	数学	七年级	数轴上，点A表示-2，点B表示3，AB的距离是？	["1", "5", "-5", "无法确定"]	"B"	1	medium	距离 = |3 - (-2)| = 5	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数轴}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_015
660	single	数学	七年级	解方程：2(x - 1) = 8	["3", "4", "5", "6"]	"C"	1	medium	2x - 2 = 8, 2x = 10, x = 5	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{一元一次方程}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_016
661	single	数学	七年级	单项式 -3x²y 的系数是？	["-3", "3", "-3x²", "x²y"]	"A"	1	easy	系数是数字部分-3	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数概念}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_017
662	single	数学	七年级	单项式 5a²b 的次数是？	["1", "2", "3", "5"]	"C"	1	medium	次数是所有字母指数之和 2+1=3	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数概念}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_018
663	single	数学	七年级	多项式 3x² - 2x + 1 的常数项是？	["3", "-2", "1", "0"]	"C"	1	easy	常数项是不含字母的项	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{代数概念}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_019
664	single	数学	七年级	如果 a > 0, b < 0，则 a + b 的符号？	["一定为正", "一定为负", "可能为正可能为负", "等于零"]	"C"	1	medium	取决于|a|和|b|的大小关系	\N	\N	\N	159	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{有理数运算}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_MATH7_020
665	single	信息科技	七年级	Python中，注释使用什么符号？	["//", "#", "/*", "--"]	"B"	1	easy	Python使用#进行注释	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语法}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_001
666	single	信息科技	七年级	Python中，哪个符号用于赋值？	["==", "=", "!=", "+="]	"B"	1	easy	=是赋值运算符	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语法}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_002
667	single	信息科技	七年级	Python中，如何输入一个字符串？	["print()", "input()", "str()", "read()"]	"B"	1	easy	input()函数用于输入	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{编程语法}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_003
668	single	信息科技	七年级	Python中，10 % 3 的结果是？	["0", "1", "3", "10"]	"B"	1	medium	%是取余运算，10除以3余1	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算符}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_004
669	single	信息科技	七年级	Python中，int()函数的作用是？	["输入整数", "转换为整数", "输出整数", "判断整数"]	"B"	1	easy	int()将其他类型转换为整数	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{类型转换}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_005
670	single	信息科技	七年级	Python中，len()函数可以获取什么？	["长度", "类型", "最大值", "最小值"]	"A"	1	easy	len()返回序列的长度	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{内置函数}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_006
671	single	信息科技	七年级	Python中，下列哪个是正确的变量名？	["2name", "name-2", "name_2", "name 2"]	"C"	1	medium	变量名不能以数字开头，不能有空格和-	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{命名规则}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_007
672	single	信息科技	七年级	Python中，如何判断两个值相等？	["=", "==", "!=", "==="]	"B"	1	easy	==用于判断相等	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{运算符}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_008
673	single	信息科技	七年级	Python中，布尔类型有几个值？	["1个", "2个", "3个", "4个"]	"B"	1	easy	布尔类型只有True和False两个值	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数据类型}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_009
674	single	信息科技	七年级	Python中，字符串拼接使用什么运算符？	["+", "-", "*", "/"]	"A"	1	easy	+用于连接字符串	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{字符串操作}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_010
675	multiple	信息科技	七年级	Python中，以下哪些是数据类型？	["int", "str", "bool", "all"]	["A", "B", "C"]	1	medium	int、str、bool都是Python数据类型	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数据类型}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_011
676	true_false	信息科技	七年级	Python是区分大小写的语言	["正确", "错误"]	"A"	1	easy	Python严格区分大小写	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{语言特性}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_012
677	blank	信息科技	七年级	Python中，使用__关键字可以导入模块	[]	"import"	1	medium	import用于导入模块	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{模块导入}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_013
678	single	信息科技	七年级	Python中，if语句用于？	["循环", "条件判断", "函数定义", "输入输出"]	"B"	1	easy	if用于条件判断	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{控制结构}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_014
679	single	信息科技	七年级	Python中，while循环的作用是？	["条件判断", "重复执行", "函数定义", "导入模块"]	"B"	1	easy	while用于循环执行代码	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{控制结构}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_015
680	single	信息科技	七年级	Python中，列表用什么符号表示？	["()", "[]", "{}", "<>"]	"B"	1	easy	列表使用方括号[]	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数据结构}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_016
681	single	信息科技	七年级	Python中，缩进的作用是？	["美观", "表示代码块", "没有作用", "注释"]	"B"	1	medium	Python通过缩进表示代码块	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{语法规则}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_017
682	single	信息科技	七年级	Python中，type()函数的作用是？	["输入", "输出", "查看类型", "转换类型"]	"C"	1	easy	type()返回数据类型	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{内置函数}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_018
683	single	信息科技	七年级	Python中，float类型表示？	["整数", "小数", "字符串", "布尔"]	"B"	1	easy	float表示浮点数（小数）	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{数据类型}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_019
684	single	信息科技	七年级	Python中，如何定义一个函数？	["function", "def", "fun", "define"]	"B"	1	medium	def关键字用于定义函数	\N	\N	\N	164	0	\N	t	\N	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	{函数定义}	{}	\N	5	draft	{}	\N	\N	\N	\N	\N	DRAFT_IT7_020
1138	single	数学	一年级	【测试题】16 + 1 = ?	{"A": "17", "B": "18", "C": "19", "D": "20"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200066
1139	single	数学	一年级	【测试题】17 + 1 = ?	{"A": "18", "B": "19", "C": "20", "D": "21"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200067
1140	single	数学	一年级	【测试题】18 + 1 = ?	{"A": "19", "B": "20", "C": "21", "D": "22"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200068
1141	single	数学	一年级	【测试题】19 + 1 = ?	{"A": "20", "B": "21", "C": "22", "D": "23"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200069
1142	single	数学	一年级	【测试题】20 + 1 = ?	{"A": "21", "B": "22", "C": "23", "D": "24"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200070
1143	single	数学	一年级	【测试题】21 + 1 = ?	{"A": "22", "B": "23", "C": "24", "D": "25"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200071
1144	single	数学	一年级	【测试题】22 + 1 = ?	{"A": "23", "B": "24", "C": "25", "D": "26"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200072
1145	single	数学	一年级	【测试题】23 + 1 = ?	{"A": "24", "B": "25", "C": "26", "D": "27"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200073
1146	single	数学	一年级	【测试题】24 + 1 = ?	{"A": "25", "B": "26", "C": "27", "D": "28"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200074
1147	single	数学	一年级	【测试题】25 + 1 = ?	{"A": "26", "B": "27", "C": "28", "D": "29"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200075
15	single	数学	七年级	已知∠A=35°，则∠A的余角是（）	["A. 55°", "B. 65°", "C. 145°", "D. 155°"]	"A"	5	easy	余角是两个角的和为90°，90°-35°=55°	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.68077	2025-10-14 14:52:13.68077	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.68077	2025-10-14 14:52:13.68077	1	MATH2510140009
1148	single	数学	一年级	【测试题】26 + 1 = ?	{"A": "27", "B": "28", "C": "29", "D": "30"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200076
1149	single	数学	一年级	【测试题】27 + 1 = ?	{"A": "28", "B": "29", "C": "30", "D": "31"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200077
1150	single	数学	一年级	【测试题】28 + 1 = ?	{"A": "29", "B": "30", "C": "31", "D": "32"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200078
1151	single	数学	一年级	【测试题】29 + 1 = ?	{"A": "30", "B": "31", "C": "32", "D": "33"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200079
1152	single	数学	一年级	【测试题】30 + 1 = ?	{"A": "31", "B": "32", "C": "33", "D": "34"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200080
1153	single	数学	一年级	【测试题】31 + 1 = ?	{"A": "32", "B": "33", "C": "34", "D": "35"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200081
1154	single	数学	一年级	【测试题】32 + 1 = ?	{"A": "33", "B": "34", "C": "35", "D": "36"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200082
1155	single	数学	一年级	【测试题】33 + 1 = ?	{"A": "34", "B": "35", "C": "36", "D": "37"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200083
1156	single	数学	一年级	【测试题】34 + 1 = ?	{"A": "35", "B": "36", "C": "37", "D": "38"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200084
1157	single	数学	一年级	【测试题】35 + 1 = ?	{"A": "36", "B": "37", "C": "38", "D": "39"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200085
1158	single	数学	一年级	【测试题】36 + 1 = ?	{"A": "37", "B": "38", "C": "39", "D": "40"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200086
1159	single	数学	一年级	【测试题】37 + 1 = ?	{"A": "38", "B": "39", "C": "40", "D": "41"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200087
1160	single	数学	一年级	【测试题】38 + 1 = ?	{"A": "39", "B": "40", "C": "41", "D": "42"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200088
1161	single	数学	一年级	【测试题】39 + 1 = ?	{"A": "40", "B": "41", "C": "42", "D": "43"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200089
1162	single	数学	一年级	【测试题】40 + 1 = ?	{"A": "41", "B": "42", "C": "43", "D": "44"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200090
477	single	数学	一年级	1+2？	["3", "4"]	"A"	5	easy	test	\N	\N	\N	9	0	\N	t	\N	2025-11-04 13:08:31.737086	2025-11-04 13:08:31.747237	{computational_thinking}	{math_number_operations}	L1	5	published	{practice_school_1}	9	Historical data: reviewer populated from published_by during migration 011	2025-11-04 13:08:31.747237	2025-11-04 13:08:31.747237	9	MATH2511040016
478	single	数学	三年级	【QBC101-1762262780472】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 13:26:27.329952	2025-11-04 13:26:27.341766	{}	{}	L2	5	published	{practice_school_1}	9	Historical data: reviewer populated from published_by during migration 011	2025-11-04 13:26:27.341766	2025-11-04 13:26:27.341766	9	MATH2511040017
3	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 13:48:21.645421	2025-10-14 13:48:21.645421	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 13:48:21.645421	2025-10-14 13:48:21.645421	1	MATH2510140001
4	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.486382	2025-10-14 14:49:55.486382	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:49:55.486382	2025-10-14 14:49:55.486382	1	MATH2510140002
5	single	数学	七年级	已知∠A=35°，则∠A的余角是（）	["A. 55°", "B. 65°", "C. 145°", "D. 155°"]	"A"	5	easy	余角是两个角的和为90°，90°-35°=55°	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.49315	2025-10-14 14:49:55.49315	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:49:55.49315	2025-10-14 14:49:55.49315	1	MATH2510140003
13	blank	数学	七年级	一个数的相反数是-5，这个数是______。	["5"]	"5"	5	easy	相反数的定义：只有符号不同的两个数互为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.523099	2025-10-14 14:49:55.523099	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:49:55.523099	2025-10-14 14:49:55.523099	1	MATH2510140007
14	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.675635	2025-10-14 14:52:13.675635	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.675635	2025-10-14 14:52:13.675635	1	MATH2510140008
1163	single	数学	一年级	【测试题】41 + 1 = ?	{"A": "42", "B": "43", "C": "44", "D": "45"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200091
1164	single	数学	一年级	【测试题】42 + 1 = ?	{"A": "43", "B": "44", "C": "45", "D": "46"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200092
1165	single	数学	一年级	【测试题】43 + 1 = ?	{"A": "44", "B": "45", "C": "46", "D": "47"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200093
1166	single	数学	一年级	【测试题】44 + 1 = ?	{"A": "45", "B": "46", "C": "47", "D": "48"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200094
1167	single	数学	一年级	【测试题】45 + 1 = ?	{"A": "46", "B": "47", "C": "48", "D": "49"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200095
1168	single	数学	一年级	【测试题】46 + 1 = ?	{"A": "47", "B": "48", "C": "49", "D": "50"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200096
1169	single	数学	一年级	【测试题】47 + 1 = ?	{"A": "48", "B": "49", "C": "50", "D": "51"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200097
1170	single	数学	一年级	【测试题】48 + 1 = ?	{"A": "49", "B": "50", "C": "51", "D": "52"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200098
1171	single	数学	一年级	【测试题】49 + 1 = ?	{"A": "50", "B": "51", "C": "52", "D": "53"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200099
1172	single	数学	一年级	【测试题】50 + 1 = ?	{"A": "51", "B": "52", "C": "53", "D": "54"}	{"answer": "A"}	20	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	{}	{}	\N	20	published	{}	\N	\N	\N	\N	\N	MATH2511200100
18	single	数学	九年级	已知一元二次方程x²-5x+6=0的两根为x₁和x₂，则x₁+x₂的值为（）	["A. -5", "B. 5", "C. -6", "D. 6"]	"B"	5	medium	根据韦达定理，x₁+x₂=-b/a=5	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.691306	2025-10-14 14:52:13.691306	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.691306	2025-10-14 14:52:13.691306	1	MATH2510140012
19	single	数学	九年级	抛物线y=2(x-1)²+3的顶点坐标是（）	["A. (1,3)", "B. (-1,3)", "C. (1,-3)", "D. (-1,-3)"]	"A"	5	easy	抛物线顶点式y=a(x-h)²+k，顶点坐标为(h,k)，所以是(1,3)	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.694695	2025-10-14 14:52:13.694695	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.694695	2025-10-14 14:52:13.694695	1	MATH2510140013
33	multiple	数学	九年级	下列说法正确的有（）	["A. 对角线互相垂直的四边形是菱形", "B. 对角线相等的平行四边形是矩形", "C. 对角线互相垂直平分且相等的四边形是正方形", "D. 一组对边平行的四边形是梯形"]	["B", "C"]	10	medium	B、C选项符合矩形和正方形的判定定理	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.740522	2025-10-14 14:52:13.740522	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.740522	2025-10-14 14:52:13.740522	1	MATH2510140015
42	blank	数学	七年级	一个数的相反数是-5，这个数是______。	["5"]	"5"	5	easy	相反数的定义：只有符号不同的两个数互为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.764821	2025-10-14 14:52:13.764821	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.764821	2025-10-14 14:52:13.764821	1	MATH2510140016
41	multiple	信息科技	八年级	下列关于网络安全的做法正确的有（）	["A. 定期更新杀毒软件", "B. 不随意打开陌生邮件", "C. 使用简单密码便于记忆", "D. 不在公共场合输入密码"]	["A", "B", "D"]	10	medium	A、B、D都是正确的网络安全做法；C使用简单密码不安全	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.762264	2025-10-14 14:52:13.762264	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.762264	2025-10-14 14:52:13.762264	1	COMP2510140005
51	blank	信息科技	八年级	IP地址由______位二进制数组成。	["32"]	"32"	5	medium	IPv4地址由32位二进制数组成，通常表示为4组十进制数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.790997	2025-10-14 14:52:13.790997	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.790997	2025-10-14 14:52:13.790997	1	COMP2510140007
480	single	数学	三年级	【QBC101-1762263085540】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-11-04 13:31:32.375847	2025-11-04 13:31:32.445935	{}	{}	L2	5	published	{practice_school_1}	9	Historical data: reviewer populated from published_by during migration 011	2025-11-04 13:31:32.445935	2025-11-04 13:31:32.445935	9	MATH2511040018
53	essay	数学	九年级	某商店销售一种商品，每件成本40元，若售价为50元，每天可售出100件。经调查，售价每提高1元，每天销量减少5件。问：售价定为多少元时，每天的利润最大？最大利润是多少？	\N	"设售价为(50+x)元，则每天销量为(100-5x)件，利润y=(50+x-40)(100-5x)=(10+x)(100-5x)=-5x²+50x+1000=-5(x-5)²+1125。当x=5时，y最大=1125元，此时售价为55元。"	20	hard	利用二次函数求最值，建立数学模型求解实际问题	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.79629	2025-10-14 14:52:13.79629	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.79629	2025-10-14 14:52:13.79629	1	MATH2510140019
61	essay	信息科技	八年级	请简述冯·诺依曼计算机的工作原理，并说明"存储程序"的含义。	\N	"冯·诺依曼计算机工作原理：1.采用二进制；2.存储程序；3.由运算器、控制器、存储器、输入设备和输出设备五部分组成。\\"存储程序\\"的含义：将程序和数据事先存入存储器，计算机工作时能自动从存储器取出指令并执行，实现自动化处理。这是现代计算机的基本工作方式。"	20	medium	考查计算机基本原理的理解	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.817797	2025-10-14 14:52:13.817797	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.817797	2025-10-14 14:52:13.817797	1	COMP2510140009
63	code	信息科技	八年级	编写程序：输入一个正整数n，计算并输出1到n之间所有偶数的和。	\N	"n = int(input())\\nsum = 0\\nfor i in range(2, n+1, 2):\\n    sum += i\\nprint(sum)"	20	medium	使用循环累加计算偶数和	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.823338	2025-10-14 14:52:13.823338	{}	{}	\N	5	published	{practice_municipal}	1	Historical data: reviewer populated from published_by during migration 011	2025-10-14 14:52:13.823338	2025-10-14 14:52:13.823338	1	COMP2510140011
1173	single	数学	二年级	1+2？	["3", "4", "5", "7"]	"A"	4	easy	test	{测试-小学数学,多标签}	\N	\N	39	0	\N	t	\N	2025-11-21 14:33:12.440038	2025-11-21 16:11:20.01477	{computational_thinking}	{math_functions}	L1	4	approved	{}	163	通过	2025-11-21 16:11:20.01477	\N	\N	MATH2511210001
685	single	数学	三年级	【QBC101-1762427802612】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 11:16:49.457351	2025-11-06 11:16:49.478191	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 11:16:49.478191	163	MATH2511060001
694	single	数学	三年级	【QBC101-1762431892847】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:24:59.714186	2025-11-06 12:24:59.792504	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 12:24:59.792504	163	MATH2511060010
696	single	数学	三年级	【REV101-1762432020552】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:27:07.421299	2025-11-06 12:27:07.421299	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060011
697	single	数学	三年级	【REV101-1762432181474】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:29:48.294474	2025-11-06 12:29:48.294474	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060012
698	single	数学	三年级	【QBC101-1762432289440】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:31:36.305205	2025-11-06 12:31:36.316162	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 12:31:36.316162	163	MATH2511060013
700	single	数学	三年级	【REV101-1762433391317】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:49:58.157297	2025-11-06 12:49:58.157297	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060014
701	single	数学	三年级	【QBC101-1762433391317】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:49:58.23011	2025-11-06 12:49:58.240861	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 12:49:58.240861	163	MATH2511060015
702	single	数学	三年级	【REV101-1762433506200】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 12:51:53.050278	2025-11-06 12:51:53.050278	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060016
704	single	数学	三年级	【REV101-1762434205252】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 13:03:32.09413	2025-11-06 13:03:32.09413	{}	{}	L3	5	draft	{}	\N	\N	\N	\N	\N	MATH2511060017
705	single	数学	三年级	【REV101-1762434336998】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 13:05:43.836173	2025-11-06 13:05:56.007317	{}	{}	L3	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511060018
706	single	数学	三年级	【REV101-1762434422124】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 13:07:08.996827	2025-11-06 13:07:21.169688	{}	{}	L3	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511060019
707	single	数学	三年级	【REV101-1762434495605】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 13:08:22.445371	2025-11-06 13:08:34.597323	{}	{}	L3	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511060020
708	single	数学	三年级	【QBC101-1762434563813】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 13:09:30.689564	2025-11-06 13:09:30.69969	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 13:09:30.69969	163	MATH2511060021
709	single	数学	三年级	【REV101-1762434563814】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 13:09:30.691505	2025-11-06 13:09:42.898246	{}	{}	L3	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511060022
710	single	数学	三年级	【QBC101-1762437990137】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 14:06:37.034522	2025-11-06 14:06:37.046987	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 14:06:37.046987	163	MATH2511060023
711	single	数学	三年级	【REV101-1762437990215】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 14:06:37.154014	2025-11-06 14:06:49.323822	{}	{}	L3	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511060024
712	single	数学	三年级	【QBC101-1762438975525】3 × 4 = ?	["9", "12", "15", "16"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 14:23:02.3861	2025-11-06 14:23:02.399417	{}	{}	L2	5	published	{practice_school_1}	\N	\N	\N	2025-11-06 14:23:02.399417	163	MATH2511060025
713	single	数学	三年级	【REV101-1762438975619】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-06 14:23:02.472052	2025-11-06 14:23:14.578555	{}	{}	L3	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511060026
715	single	数学	二年级	【API测试】3 + 4 = ?	["5", "6", "7", "8"]	"C"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 13:23:16.968891	2025-11-08 13:23:16.968891	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2511080002
714	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 13:23:16.950607	2025-11-08 13:23:16.992634	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511080001
716	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 13:23:17.009752	2025-11-08 13:23:17.014653	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511080003
717	single	数学	一年级	【API测试-校级】5 + 2 = ?	["6", "7", "8", "9"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 13:23:17.020636	2025-11-08 13:23:17.025408	{}	{}	L1	5	published	{practice_school_1}	\N	\N	\N	2025-11-08 13:23:17.025408	163	MATH2511080004
718	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	medium	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 13:23:17.028773	2025-11-08 13:23:17.037306	{}	{}	L1	5	published	{practice_municipal}	1	集成测试 - 批准	2025-11-08 13:23:17.037306	2025-11-08 13:23:17.037306	1	MATH2511080005
720	single	数学	三年级	【REV101-1762609599799】5 × 6 = ?	["25", "30", "35", "40"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 13:46:46.807749	2025-11-08 13:46:58.92881	{}	{}	L3	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511080006
722	single	数学	二年级	【API测试】3 + 4 = ?	["5", "6", "7", "8"]	"C"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 17:20:38.298856	2025-11-08 17:20:38.298856	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2511080008
721	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	5	easy	\N	\N	\N	\N	163	0	\N	t	\N	2025-11-08 17:20:38.285947	2025-11-08 17:20:38.323392	{}	{}	L1	5	pending_review	{}	94	[target_scope:practice_municipal]	\N	\N	\N	MATH2511080007
\.


--
-- Data for Name: question_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_categories (id, name, parent_id, subject, description, created_at) FROM stdin;
\.


--
-- Data for Name: question_drafts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_drafts (id, type, subject, grade, content, options, correct_answer, explanation, image_url, difficulty, level, suggested_score, abilities, knowledge_points, tags, created_by, created_at, updated_at, publish_count, total_usage_count, is_active) FROM stdin;
1	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:45:40.372132	2025-10-21 05:45:40.372132	0	0	t
2	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 09:46:20.793598	2025-10-21 09:46:20.793598	0	0	t
3	single	数学	三年级	【REV101-1762427802661】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 11:16:49.556867	2025-11-06 11:16:49.556867	0	0	t
4	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-11-03 15:18:00.17313	2025-11-03 15:18:00.17313	0	0	t
5	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-11-03 15:18:00.215322	2025-11-03 15:18:00.215322	0	0	t
6	single	数学	七年级	Admin测试题目：计算 5 + 3 = ?	["6", "7", "8", "9"]	"C"	\N	\N	easy	L1	5	{}	{}	\N	1	2025-10-20 17:04:48.340723	2025-10-20 17:04:48.340723	0	0	t
7	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	medium	L1	5	{}	{}	\N	9	2025-11-03 15:18:00.233808	2025-11-03 15:18:00.233808	0	0	t
8	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:52:03.22356	2025-10-21 05:52:03.22356	0	0	t
9	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:08:22.609336	2025-10-21 05:08:22.609336	0	0	t
10	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 06:17:23.105681	2025-10-21 06:17:23.105681	0	0	t
11	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 10:54:28.003014	2025-10-21 10:54:28.003014	0	0	t
12	single	数学	七年级	【待审核-批准】计算 15 + 25 = ?	["30", "35", "40", "45"]	"C"	15 + 25 = 40	\N	easy	L1	5	{}	{}	\N	9	2025-10-20 17:22:30.268164	2025-10-20 17:22:30.268164	0	0	t
13	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:18:11.986108	2025-10-21 05:18:11.986108	0	0	t
14	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 06:21:23.922288	2025-10-21 06:21:23.922288	0	0	t
15	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 11:03:42.939732	2025-10-21 11:03:42.939732	0	0	t
16	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:21:23.941963	2025-10-21 05:21:23.941963	0	0	t
17	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 06:26:07.992328	2025-10-21 06:26:07.992328	0	0	t
18	single	数学	七年级	计算：2³ = ?	["6", "8", "9", "12"]	"B"	2的3次方等于8	\N	easy	\N	5	{乘方运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
19	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:24:27.887549	2025-10-21 05:24:27.887549	0	0	t
20	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 09:33:07.077578	2025-10-21 09:33:07.077578	0	0	t
21	single	数学	七年级	计算：(-5) + 3 = ?	["-8", "-2", "2", "8"]	"B"	负5加正3等于负2	\N	easy	\N	5	{有理数运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
22	single	数学	七年级	计算：(-3) × (-4) = ?	["-12", "-7", "7", "12"]	"D"	负负得正	\N	easy	\N	5	{有理数运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
23	single	数学	七年级	绝对值：|-7| = ?	["-7", "0", "7", "14"]	"C"	负数的绝对值是其相反数	\N	easy	\N	5	{绝对值}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
24	single	数学	三年级	【REV101-1762256795122】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	9	2025-11-04 11:46:42.050187	2025-11-04 11:46:42.050187	0	0	t
25	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:26:45.285366	2025-10-21 05:26:45.285366	0	0	t
26	single	数学	一年级	test	["1", "2", "3", "4"]	"B"	test	\N	medium	L1	5	{computational_thinking}	{math_number_operations}	\N	39	2025-11-03 12:14:02.866649	2025-11-03 12:14:02.866649	0	0	t
27	single	数学	七年级	1+1 = ?	["1", "2"]	"A"	test	\N	medium	L1	5	{abstract_thinking}	{math_number_operations}	{test}	1	2025-10-15 15:46:55.277518	2025-10-15 15:46:55.277518	0	0	t
28	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-17 17:24:47.803792	2025-10-17 17:24:47.803792	0	0	t
29	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-17 17:25:18.38377	2025-10-17 17:25:18.38377	0	0	t
30	single	数学	七年级	解方程：x + 5 = 12	["5", "6", "7", "8"]	"C"	x = 12 - 5 = 7	\N	easy	\N	5	{一元一次方程}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
31	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-17 17:32:26.385253	2025-10-17 17:32:26.385253	0	0	t
32	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	\N	\N	medium	L4	10	{}	{}	\N	9	2025-10-17 17:33:22.805023	2025-10-17 17:33:22.805023	0	0	t
33	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	\N	\N	medium	L4	10	{}	{}	\N	9	2025-10-18 03:20:43.352896	2025-10-18 03:20:43.352896	0	0	t
34	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 03:20:43.403501	2025-10-18 03:20:43.403501	0	0	t
35	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	\N	\N	medium	L4	10	{}	{}	\N	9	2025-10-18 03:27:28.77082	2025-10-18 03:27:28.77082	0	0	t
36	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 03:27:28.872587	2025-10-18 03:27:28.872587	0	0	t
77	single	数学	三年级	【REV101-1762263334693】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	9	2025-11-04 13:35:41.547768	2025-11-04 13:35:41.547768	0	0	t
37	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	\N	\N	medium	L4	10	{}	{}	\N	9	2025-10-18 03:33:44.497328	2025-10-18 03:33:44.497328	0	0	t
38	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 03:33:44.929332	2025-10-18 03:33:44.929332	0	0	t
39	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	\N	\N	medium	L4	10	{}	{}	\N	9	2025-10-18 03:34:36.042617	2025-10-18 03:34:36.042617	0	0	t
40	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 03:34:36.301118	2025-10-18 03:34:36.301118	0	0	t
41	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	\N	\N	medium	L4	10	{}	{}	\N	9	2025-10-18 03:36:39.51387	2025-10-18 03:36:39.51387	0	0	t
42	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 03:36:39.805301	2025-10-18 03:36:39.805301	0	0	t
43	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	\N	\N	medium	L4	10	{}	{}	\N	9	2025-10-18 03:42:45.085789	2025-10-18 03:42:45.085789	0	0	t
44	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 03:42:45.143321	2025-10-18 03:42:45.143321	0	0	t
45	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 05:10:06.107466	2025-10-18 05:10:06.107466	0	0	t
46	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 05:10:06.298795	2025-10-18 05:10:06.298795	0	0	t
47	true_false	数学	七年级	测试提交审核功能	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 05:10:06.307997	2025-10-18 05:10:06.307997	0	0	t
48	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 05:19:17.269583	2025-10-18 05:19:17.269583	0	0	t
49	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 05:19:17.380685	2025-10-18 05:19:17.380685	0	0	t
50	true_false	数学	七年级	测试提交审核功能	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 05:19:17.41163	2025-10-18 05:19:17.41163	0	0	t
51	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 15:22:08.30656	2025-10-18 15:22:08.30656	0	0	t
52	true_false	数学	七年级	测试提交审核功能	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 15:22:59.520033	2025-10-18 15:22:59.520033	0	0	t
53	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-18 15:23:23.535966	2025-10-18 15:23:23.535966	0	0	t
54	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:24:02.305032	2025-10-19 11:24:02.305032	0	0	t
55	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:24:02.308802	2025-10-19 11:24:02.308802	0	0	t
56	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:27:01.523144	2025-10-19 11:27:01.523144	0	0	t
57	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:27:01.566374	2025-10-19 11:27:01.566374	0	0	t
58	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:30:05.079539	2025-10-19 11:30:05.079539	0	0	t
59	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:30:05.079862	2025-10-19 11:30:05.079862	0	0	t
60	true_false	数学	七年级	测试提交审核功能	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:30:05.268428	2025-10-19 11:30:05.268428	0	0	t
61	true_false	数学	七年级	测试提交审核功能	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 12:09:45.136329	2025-10-19 12:09:45.136329	0	0	t
62	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 12:09:45.154081	2025-10-19 12:09:45.154081	0	0	t
63	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 12:09:45.250338	2025-10-19 12:09:45.250338	0	0	t
64	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 12:14:19.577368	2025-10-19 12:14:19.577368	0	0	t
65	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 12:14:19.606139	2025-10-19 12:14:19.606139	0	0	t
66	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 17:46:52.89898	2025-10-19 17:46:52.89898	0	0	t
67	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 18:03:48.351424	2025-10-19 18:03:48.351424	0	0	t
68	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 18:05:11.895475	2025-10-19 18:05:11.895475	0	0	t
69	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:29:05.895589	2025-10-21 05:29:05.895589	0	0	t
70	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 09:38:43.207741	2025-10-21 09:38:43.207741	0	0	t
71	single	数学	三年级	【REV101-1762430363816】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 11:59:30.644539	2025-11-06 11:59:30.644539	0	0	t
72	single	数学	三年级	【REV101-1762430581656】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:03:08.495441	2025-11-06 12:03:08.495441	0	0	t
73	single	数学	三年级	【REV101-1762430724688】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:05:31.54337	2025-11-06 12:05:31.54337	0	0	t
74	single	数学	三年级	【REV101-1762430842006】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:07:28.766518	2025-11-06 12:07:28.766518	0	0	t
75	single	数学	三年级	【REV101-1762430997628】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:10:04.53299	2025-11-06 12:10:04.53299	0	0	t
76	single	数学	三年级	【REV101-1762431664706】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:21:11.545714	2025-11-06 12:21:11.545714	0	0	t
78	single	数学	三年级	【REV101-1762263788795】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	9	2025-11-04 13:43:15.670257	2025-11-04 13:43:15.670257	0	0	t
79	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-17 17:26:40.737991	2025-10-17 17:26:40.737991	0	0	t
80	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-17 17:33:28.691817	2025-10-17 17:33:28.691817	0	0	t
81	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-18 03:20:43.35109	2025-10-18 03:20:43.35109	0	0	t
82	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-18 03:27:28.852633	2025-10-18 03:27:28.852633	0	0	t
83	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-18 03:33:44.514783	2025-10-18 03:33:44.514783	0	0	t
84	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-18 03:34:36.065238	2025-10-18 03:34:36.065238	0	0	t
85	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-18 03:36:39.584985	2025-10-18 03:36:39.584985	0	0	t
86	code	信息科技	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	\N	\N	hard	L5	15	{}	{}	\N	9	2025-10-18 03:42:44.951982	2025-10-18 03:42:44.951982	0	0	t
87	single	数学	七年级	合并同类项：5a + 3a = ?	["8", "8a", "8a²", "15a"]	"B"	系数相加	\N	easy	\N	5	{代数运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
88	single	数学	七年级	(-2)³ = ?	["-8", "-6", "6", "8"]	"A"	(-2)×(-2)×(-2) = -8	\N	medium	\N	5	{乘方运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
89	single	数学	七年级	解方程：3x - 6 = 9	["3", "4", "5", "6"]	"C"	3x = 15, x = 5	\N	medium	\N	5	{一元一次方程}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
90	single	数学	七年级	一个角的补角是120°，这个角是多少度？	["30°", "60°", "90°", "120°"]	"B"	补角之和为180°	\N	medium	\N	5	{几何基础}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
91	single	数学	七年级	去括号：-(2x - 3) = ?	["-2x - 3", "-2x + 3", "2x - 3", "2x + 3"]	"B"	括号前是负号，去括号要变号	\N	medium	\N	5	{代数运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
92	multiple	数学	七年级	以下哪些是有理数？	["-3", "0", "π", "1/2"]	["A", "B", "D"]	π是无理数	\N	medium	\N	5	{数的分类}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
93	true_false	数学	七年级	两条直线被第三条直线所截，内错角相等	["正确", "错误"]	"B"	需要两直线平行时才成立	\N	medium	\N	5	{几何定理}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
94	blank	数学	七年级	化简：3(x + 2) = __	[]	"3x + 6"	分配律展开	\N	easy	\N	5	{代数运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
95	single	数学	七年级	比较大小：-5 __ -3	["大于", "小于", "等于", "无法比较"]	"B"	负数越大，值越小	\N	easy	\N	5	{有理数比较}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
96	single	数学	七年级	数轴上，点A表示-2，点B表示3，AB的距离是？	["1", "5", "-5", "无法确定"]	"B"	距离 = |3 - (-2)| = 5	\N	medium	\N	5	{数轴}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
97	single	数学	七年级	解方程：2(x - 1) = 8	["3", "4", "5", "6"]	"C"	2x - 2 = 8, 2x = 10, x = 5	\N	medium	\N	5	{一元一次方程}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
98	single	数学	七年级	单项式 -3x²y 的系数是？	["-3", "3", "-3x²", "x²y"]	"A"	系数是数字部分-3	\N	easy	\N	5	{代数概念}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
99	single	数学	七年级	单项式 5a²b 的次数是？	["1", "2", "3", "5"]	"C"	次数是所有字母指数之和 2+1=3	\N	medium	\N	5	{代数概念}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
100	single	数学	七年级	多项式 3x² - 2x + 1 的常数项是？	["3", "-2", "1", "0"]	"C"	常数项是不含字母的项	\N	easy	\N	5	{代数概念}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
101	single	数学	七年级	如果 a > 0, b < 0，则 a + b 的符号？	["一定为正", "一定为负", "可能为正可能为负", "等于零"]	"C"	取决于|a|和|b|的大小关系	\N	medium	\N	5	{有理数运算}	{}	\N	159	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
102	single	信息科技	七年级	Python中，注释使用什么符号？	["//", "#", "/*", "--"]	"B"	Python使用#进行注释	\N	easy	\N	5	{编程语法}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
103	single	信息科技	七年级	Python中，哪个符号用于赋值？	["==", "=", "!=", "+="]	"B"	=是赋值运算符	\N	easy	\N	5	{编程语法}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
104	single	信息科技	七年级	Python中，如何输入一个字符串？	["print()", "input()", "str()", "read()"]	"B"	input()函数用于输入	\N	easy	\N	5	{编程语法}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
105	single	信息科技	七年级	Python中，10 % 3 的结果是？	["0", "1", "3", "10"]	"B"	%是取余运算，10除以3余1	\N	medium	\N	5	{运算符}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
136	true_false	数学	四年级	0.5 = 1/2	["正确", "错误"]	"A"	0.5确实等于二分之一	\N	easy	\N	5	{分数与小数}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
106	single	信息科技	七年级	Python中，int()函数的作用是？	["输入整数", "转换为整数", "输出整数", "判断整数"]	"B"	int()将其他类型转换为整数	\N	easy	\N	5	{类型转换}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
107	single	信息科技	七年级	Python中，len()函数可以获取什么？	["长度", "类型", "最大值", "最小值"]	"A"	len()返回序列的长度	\N	easy	\N	5	{内置函数}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
108	single	信息科技	七年级	Python中，下列哪个是正确的变量名？	["2name", "name-2", "name_2", "name 2"]	"C"	变量名不能以数字开头，不能有空格和-	\N	medium	\N	5	{命名规则}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
109	single	信息科技	七年级	Python中，如何判断两个值相等？	["=", "==", "!=", "==="]	"B"	==用于判断相等	\N	easy	\N	5	{运算符}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
110	single	信息科技	七年级	Python中，布尔类型有几个值？	["1个", "2个", "3个", "4个"]	"B"	布尔类型只有True和False两个值	\N	easy	\N	5	{数据类型}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
111	single	信息科技	七年级	Python中，字符串拼接使用什么运算符？	["+", "-", "*", "/"]	"A"	+用于连接字符串	\N	easy	\N	5	{字符串操作}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
112	multiple	信息科技	七年级	Python中，以下哪些是数据类型？	["int", "str", "bool", "all"]	["A", "B", "C"]	int、str、bool都是Python数据类型	\N	medium	\N	5	{数据类型}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
113	true_false	信息科技	七年级	Python是区分大小写的语言	["正确", "错误"]	"A"	Python严格区分大小写	\N	easy	\N	5	{语言特性}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
114	blank	信息科技	七年级	Python中，使用__关键字可以导入模块	[]	"import"	import用于导入模块	\N	medium	\N	5	{模块导入}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
115	single	信息科技	七年级	Python中，if语句用于？	["循环", "条件判断", "函数定义", "输入输出"]	"B"	if用于条件判断	\N	easy	\N	5	{控制结构}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
116	single	信息科技	七年级	Python中，while循环的作用是？	["条件判断", "重复执行", "函数定义", "导入模块"]	"B"	while用于循环执行代码	\N	easy	\N	5	{控制结构}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
117	single	信息科技	七年级	Python中，列表用什么符号表示？	["()", "[]", "{}", "<>"]	"B"	列表使用方括号[]	\N	easy	\N	5	{数据结构}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
118	single	信息科技	七年级	Python中，缩进的作用是？	["美观", "表示代码块", "没有作用", "注释"]	"B"	Python通过缩进表示代码块	\N	medium	\N	5	{语法规则}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
119	single	信息科技	七年级	Python中，type()函数的作用是？	["输入", "输出", "查看类型", "转换类型"]	"C"	type()返回数据类型	\N	easy	\N	5	{内置函数}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
120	single	信息科技	七年级	Python中，float类型表示？	["整数", "小数", "字符串", "布尔"]	"B"	float表示浮点数（小数）	\N	easy	\N	5	{数据类型}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
121	single	信息科技	七年级	Python中，如何定义一个函数？	["function", "def", "fun", "define"]	"B"	def关键字用于定义函数	\N	medium	\N	5	{函数定义}	{}	\N	164	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	0	0	t
122	single	数学	三年级	【REV101-1762432020552】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:27:07.421299	2025-11-06 12:27:07.421299	0	0	t
123	single	数学	三年级	【REV101-1762432181474】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:29:48.294474	2025-11-06 12:29:48.294474	0	0	t
124	single	数学	三年级	【REV101-1762433391317】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:49:58.157297	2025-11-06 12:49:58.157297	0	0	t
125	single	数学	三年级	【REV101-1762433506200】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 12:51:53.050278	2025-11-06 12:51:53.050278	0	0	t
126	single	数学	三年级	【REV101-1762434205252】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 13:03:32.09413	2025-11-06 13:03:32.09413	0	0	t
127	single	数学	二年级	【API测试】3 + 4 = ?	["5", "6", "7", "8"]	"C"	\N	\N	easy	L1	5	{}	{}	\N	163	2025-11-08 13:23:16.968891	2025-11-08 13:23:16.968891	0	0	t
128	single	数学	二年级	【API测试】3 + 4 = ?	["5", "6", "7", "8"]	"C"	\N	\N	easy	L1	5	{}	{}	\N	163	2025-11-08 17:20:38.298856	2025-11-08 17:20:38.298856	0	0	t
129	single	数学	七年级	(-2) × 3 = ?	["-6", "-5", "5", "6"]	"A"	负数乘正数得负数	\N	easy	\N	5	{有理数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
130	blank	数学	七年级	(-3) × 4 = ___	\N	"-12"	负数乘以正数等于负数	\N	easy	L3	5	{}	{}	\N	60	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	1	0	t
131	single	数学	七年级	(-3)² = ?	["-9", "-6", "6", "9"]	"D"	(-3)²=(-3)×(-3)=9	\N	easy	\N	5	{乘方运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
132	single	数学	六年级	(-5) + 3 = ?	["-8", "-2", "2", "8"]	"B"	负5加正3等于负2	\N	easy	\N	5	{有理数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
133	single	数学	七年级	(-8) + (-5) = ?	["-13", "-3", "3", "13"]	"A"	两个负数相加，绝对值相加，结果为负	\N	easy	\N	5	{有理数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
134	single	数学	八年级	(x + 2)(x - 2) = ?	{"A": "x² - 4", "B": "x² + 4", "C": "x² - 2", "D": "x² + 2"}	"A"	平方差公式：(a+b)(a-b) = a² - b²	\N	medium	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	1	0	t
135	single	数学	四年级	0.5 + 0.3 = ?	{"A": "0.7", "B": "0.8", "C": "0.9", "D": "1.0"}	"B"	小数加法：0.5加0.3等于0.8	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	1	0	t
137	single	数学	一年级	1 + 1 = ?	{"A": "1", "B": "2", "C": "3", "D": "4"}	"B"	1加1等于2	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	1	0	t
138	single	数学	一年级	1+2？	["3", "4"]	"A"	test	\N	easy	L1	5	{computational_thinking}	{math_number_operations}	\N	9	2025-11-04 13:08:31.737086	2025-11-04 13:08:31.747237	1	0	t
139	single	数学	二年级	1+2？	["3", "4", "5", "7"]	"A"	test	\N	easy	L1	4	{computational_thinking}	{math_functions}	{测试-小学数学,多标签}	39	2025-11-21 14:33:12.440038	2025-11-21 16:11:20.01477	1	0	t
140	blank	数学	四年级	1.2 × 5 = ___	\N	"6"	1.2乘以5等于6	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	1	0	t
141	true_false	数学	四年级	1/4 = 0.25	{"A": "正确", "B": "错误"}	"A"	1除以4等于0.25	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	1	0	t
142	single	数学	二年级	100里面有几个10？	["5", "8", "10", "12"]	"C"	100除以10等于10	\N	medium	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
143	true_false	数学	一年级	10比5大	["正确", "错误"]	"A"	10确实比5大	\N	easy	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
144	single	数学	三年级	12 + 15 = ?	\N	{"answer": "27"}	\N	\N	easy	L1	2	{计算能力}	{加法运算,两位数加法}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
145	single	数学	三年级	125 + 238 = ?	["353", "363", "373", "383"]	"B"	125加238等于363	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
146	single	数学	四年级	125 × 8 = ?	["900", "950", "1000", "1050"]	"C"	125乘8等于1000	\N	medium	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
147	single	数学	四年级	125 × 8 = ?	["900", "950", "1000", "1100"]	"1000"	\N	\N	medium	L2	5	{三位数乘法,心算技巧}	{乘法运算,简便计算}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
148	single	数学	三年级	15 × 6 = ?	["80", "85", "90", "95"]	"C"	15乘6等于90	\N	medium	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
149	true_false	数学	二年级	15是奇数。	{"A": "正确", "B": "错误"}	"A"	15不能被2整除，是奇数	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	1	0	t
150	blank	数学	四年级	1千克 = ( )克	null	"1000"	\N	\N	easy	L2	5	{质量单位,单位换算}	{质量测量,单位转换}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
151	true_false	数学	三年级	1千克=1000克	["正确", "错误"]	"A"	1千克确实等于1000克	\N	easy	\N	5	{单位换算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
152	blank	数学	二年级	1米 = ( )厘米	null	"100"	\N	\N	easy	L1	5	{长度单位,单位换算}	{长度测量,单位转换}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
153	single	数学	二年级	1米等于多少厘米？	["10", "50", "100", "1000"]	"C"	1米=100厘米	\N	easy	\N	5	{单位换算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
154	blank	数学	一年级	2 + 3 = ___	\N	"5"	2加3等于5	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	1	0	t
155	single	数学	六年级	2 - (-3) = ?	["1", "5", "-1", "-5"]	"B"	减去一个负数等于加上它的相反数，2-(-3)=2+3=5	\N	medium	\N	5	{有理数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
156	single	数学	五年级	2.5 × 4 = ?	["9", "10", "11", "12"]	"B"	2.5乘4等于10	\N	easy	\N	5	{小数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
157	blank	数学	二年级	20 ÷ 4 = ___	\N	"5"	20除以4等于5	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	1	0	t
158	single	数学	四年级	2356 + 1478 = ?	["3824", "3834", "3844", "3854"]	"B"	2356加1478等于3834	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
159	true_false	数学	二年级	24 ÷ 6 = 5	null	false	\N	\N	medium	L1	5	{除法运算,计算验证}	{表内除法,正误判断}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
160	single	数学	二年级	25 + 13 = ?	["36", "37", "38", "39"]	"C"	25加13等于38	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
161	single	数学	二年级	25 + 18 = ?	["41", "42", "43", "44"]	"43"	\N	\N	easy	L1	5	{两位数加法,进位运算}	{100以内加法,进位加}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
162	single	数学	三年级	25 - 8 = ?	\N	{"answer": "17"}	\N	\N	easy	L1	2	{计算能力}	{减法运算,两位数减法}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
163	single	数学	七年级	2x + 5 = 15，求x的值	["3", "4", "5", "6"]	"C"	2x=15-5=10，x=5	\N	medium	\N	5	{一元一次方程}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
164	single	数学	一年级	3 + 2 = ?	["3", "4", "5", "6"]	"5"	\N	\N	easy	L1	5	{加法运算,基础计算}	{20以内加法,基础运算}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
165	single	数学	二年级	3 × 4 = ?	["10", "11", "12", "13"]	"C"	3乘4等于12	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
166	blank	数学	三年级	3 × 4 = __	\N	{"answers": ["12"]}	\N	\N	easy	L1	2	{计算能力}	{乘法运算,乘法口诀}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
167	single	数学	四年级	3.5 + 2.8 = ?	["6.1", "6.2", "6.3", "6.4"]	"C"	3.5加2.8等于6.3	\N	easy	\N	5	{小数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
168	single	数学	五年级	3/4 + 1/4 = ?	["1/2", "3/4", "1", "5/4"]	"C"	同分母分数相加，分子相加，3/4+1/4=4/4=1	\N	easy	\N	5	{分数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
169	single	数学	四年级	3/4 + 1/4 = ?	["1/2", "3/8", "1", "4/8"]	"1"	\N	\N	medium	L2	5	{同分母分数加法,分数运算}	{分数加法,分数计算}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
170	single	数学	二年级	35 - 17 = ?	["16", "17", "18", "19"]	"18"	\N	\N	easy	L1	5	{两位数减法,退位运算}	{100以内减法,退位减}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
171	single	数学	一年级	3个苹果和2个苹果一共几个？	["4", "5", "6", "7"]	"B"	3加2等于5	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
172	true_false	数学	一年级	3比5大。	{"A": "正确", "B": "错误"}	"B"	3小于5，所以错误	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	1	0	t
173	single	数学	二年级	45 - 28 = ?	["15", "16", "17", "18"]	"C"	45减28等于17	\N	medium	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
174	single	数学	三年级	456 - 189 = ?	["257", "267", "277", "287"]	"B"	456减189等于267	\N	medium	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
175	single	数学	三年级	48 ÷ 6 = ?	{"A": "6", "B": "7", "C": "8", "D": "9"}	"C"	48除以6等于8	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	1	0	t
176	true_false	数学	一年级	5 + 3 = 8	null	true	\N	\N	easy	L1	5	{加法验证,判断能力}	{加法,正误判断}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
177	single	数学	一年级	5 + 3 = ?	["6", "7", "8", "9"]	"C"	5加3等于8	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
178	true_false	数学	二年级	5 × 2 = 2 × 5	["正确", "错误"]	"A"	乘法交换律：a×b = b×a	\N	easy	\N	5	{运算规律}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
179	single	数学	二年级	5 × 2 = ?	{"A": "7", "B": "10", "C": "12", "D": "15"}	"B"	5乘以2等于10	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	1	0	t
180	single	数学	二年级	5 × 3 = ?	["12", "13", "14", "15"]	"15"	\N	\N	medium	L1	5	{乘法运算,乘法口诀}	{表内乘法,乘法}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
181	blank	数学	五年级	5/8 + 1/8 = __	\N	{"answers": ["3/4"]}	\N	\N	easy	L1	2	{计算能力}	{分数加法}	\N	1	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	1	0	t
182	single	数学	四年级	5000 - 2387 = ?	["2603", "2613", "2623", "2633"]	"B"	5000减2387等于2613	\N	medium	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
183	blank	数学	六年级	50的30%是___	\N	"15"	50 × 30% = 50 × 0.3 = 15	\N	easy	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	1	0	t
184	blank	数学	一年级	6 + __ = 10	[]	"4"	6加4等于10	\N	medium	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
185	true_false	数学	一年级	6 比 8 大	null	false	\N	\N	easy	L1	5	{大小比较,判断能力}	{数的大小,正误判断}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
186	blank	数学	三年级	7 × 9 = ___	\N	"63"	7乘以9等于63	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	1	0	t
187	blank	数学	二年级	7 × __ = 42	[]	"6"	42除以7等于6	\N	medium	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
188	single	数学	五年级	7.2 ÷ 0.8 = ?	["8", "9", "10", "11"]	"B"	7.2除以0.8等于9	\N	medium	\N	5	{小数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
189	single	数学	三年级	72 ÷ 8 = ?	["7", "8", "9", "10"]	"C"	72除以8等于9	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
190	single	数学	一年级	8 - 3 = ?	["3", "4", "5", "6"]	"5"	\N	\N	easy	L1	5	{减法运算,基础计算}	{20以内减法,基础运算}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
191	single	数学	一年级	9 - 4 = ?	["3", "4", "5", "6"]	"C"	9减4等于5	\N	easy	\N	5	{运算能力}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
192	true_false	信息科技	七年级	CPU是计算机的中央处理器。	null	true	\N	\N	easy	L4	5	{计算机硬件,基础知识}	{CPU,计算机组成}	\N	9	2025-10-30 10:52:26.303086	2025-10-30 10:52:26.303086	1	0	t
193	single	信息科技	八年级	CSS主要用于？	["网页结构", "网页样式", "网页交互", "数据库"]	"B"	CSS用于控制网页的样式和布局	\N	easy	\N	5	{网页技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
194	single	信息科技	五年级	Excel软件主要用于？	["文字处理", "电子表格", "演示文稿", "图像处理"]	"B"	Excel用于制作和处理电子表格	\N	easy	\N	5	{软件应用}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
195	single	信息科技	九年级	Git是什么？	["编程语言", "版本控制系统", "数据库", "操作系统"]	"B"	Git用于代码版本管理	\N	medium	\N	5	{开发工具}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
196	true_false	信息科技	九年级	HTML是一种编程语言。	null	false	\N	\N	medium	L5	5	{Web技术,语言分类}	{HTML,标记语言}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
197	true_false	信息科技	九年级	HTML是一种编程语言。	{"A": "正确", "B": "错误"}	"B"	HTML是标记语言，不是编程语言	\N	easy	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	1	0	t
198	single	信息科技	八年级	HTML是什么的缩写？	["超文本标记语言", "超级文本", "高级语言", "网页语言"]	"A"	HTML是HyperText Markup Language	\N	easy	\N	5	{网页技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
199	blank	信息科技	九年级	HTTPS中的S代表__	[]	"Secure或安全"	HTTPS是HTTP的安全版本	\N	medium	\N	5	{网络安全}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
200	blank	信息科技	八年级	HTTP协议的默认端口号是__	[]	"80"	HTTP默认使用80端口	\N	hard	\N	5	{网络协议}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
201	blank	信息科技	九年级	HTTP协议默认使用的端口号是( )。	null	"80"	\N	\N	hard	L5	5	{网络协议,端口}	{HTTP,网络服务}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
202	blank	信息科技	八年级	IP地址由______位二进制数组成。	["32"]	"32"	IPv4地址由32位二进制数组成，通常表示为4组十进制数	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.790997	2025-10-14 14:52:13.790997	1	0	t
203	single	信息科技	九年级	IP地址由多少位二进制数组成？	["16位", "24位", "32位", "64位"]	"32位"	\N	\N	medium	L5	5	{网络知识,IP地址}	{IP地址,网络基础}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
204	single	信息科技	八年级	JavaScript是一种什么语言？	["标记语言", "样式语言", "脚本语言", "数据库语言"]	"C"	JavaScript是客户端脚本语言	\N	medium	\N	5	{网页技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
205	single	信息科技	四年级	PowerPoint软件主要用于？	["文字处理", "表格制作", "演示文稿制作", "图像编辑"]	"C"	PowerPoint用于制作演示文稿	\N	easy	\N	5	{软件应用}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
206	single	信息科技	七年级	Python中，==运算符的作用是？	["赋值", "比较相等", "加法", "连接"]	"B"	==用于判断两个值是否相等	\N	medium	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
207	blank	信息科技	七年级	Python中，input()函数用于__数据	[]	"输入"	input()函数用于从用户获取输入	\N	easy	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
208	single	信息科技	七年级	Python中，print()函数的作用是？	["输入数据", "输出数据", "计算数据", "存储数据"]	"B"	print()用于输出数据到屏幕	\N	easy	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
209	single	信息科技	七年级	Python中，range(5)会生成哪些数字？	["1,2,3,4,5", "0,1,2,3,4", "0,1,2,3,4,5", "1,2,3,4"]	"B"	range(5)生成0到4的数字	\N	medium	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
210	single	信息科技	七年级	Python中，以下哪个是正确的输出语句？	{"A": "echo()", "B": "print()", "C": "printf()", "D": "cout"}	"B"	Python使用print()函数输出	\N	easy	L4	5	{}	{}	\N	60	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	1	0	t
211	multiple	信息科技	七年级	Python中，以下哪些是循环语句？	["if", "for", "while", "def"]	["B", "C"]	for和while都是循环语句	\N	medium	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
212	multiple	信息科技	七年级	Python中，以下哪些是数据类型？（多选）	{"A": "整数int", "B": "浮点数float", "C": "字符串str", "D": "布尔bool"}	["A", "B", "C", "D"]	Python的基本数据类型	\N	medium	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	1	0	t
213	single	信息科技	七年级	Python中，哪个运算符用于整除？	["/", "//", "%", "**"]	"B"	//是整除运算符	\N	medium	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
214	true_false	信息科技	七年级	Python是一种解释型编程语言	["正确", "错误"]	"A"	Python代码逐行解释执行	\N	easy	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
215	true_false	信息科技	七年级	Python是一种解释型语言。	{"A": "正确", "B": "错误"}	"A"	Python代码逐行解释执行	\N	easy	L4	5	{}	{}	\N	60	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	1	0	t
216	single	信息科技	八年级	SQL是什么？	["编程语言", "数据库查询语言", "标记语言", "样式语言"]	"B"	SQL用于数据库操作	\N	medium	\N	5	{数据管理}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
217	multiple	信息科技	九年级	SQL语言中，以下哪些是数据操作语句？（多选）	{"A": "SELECT", "B": "INSERT", "C": "UPDATE", "D": "DELETE"}	["A", "B", "C", "D"]	SQL的基本操作语句	\N	medium	L7	5	{}	{}	\N	60	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	1	0	t
218	single	信息科技	五年级	Scratch中，以下哪个积木块用于移动角色？	{"A": "说", "B": "移动10步", "C": "等待", "D": "停止"}	"B"	Scratch中移动积木块用于移动角色	\N	easy	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	1	0	t
219	single	信息科技	五年级	Scratch是一种什么软件？	["文字处理", "图形化编程", "图像处理", "表格制作"]	"B"	Scratch是图形化编程工具	\N	easy	\N	5	{编程工具}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
220	true_false	信息科技	五年级	Scratch是一种图形化编程语言。	{"A": "正确", "B": "错误"}	"A"	Scratch使用图形化积木进行编程	\N	easy	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	1	0	t
221	single	信息科技	四年级	URL是什么的缩写？	["网页地址", "电子邮件", "文件名", "用户名"]	"A"	URL是统一资源定位符，即网址	\N	medium	\N	5	{网络概念}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
222	single	信息科技	四年级	Word软件主要用于？	["制作表格", "文字处理", "制作演示文稿", "图像处理"]	"B"	Word是文字处理软件	\N	easy	\N	5	{软件应用}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
223	single	数学	九年级	sin30° = ?	["1/2", "√2/2", "√3/2", "1"]	"A"	sin30°=1/2是特殊角三角函数值	\N	easy	\N	5	{三角函数}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
224	single	数学	七年级	|-5| = ?	{"A": "-5", "B": "0", "C": "5", "D": "10"}	"C"	绝对值是数在数轴上到原点的距离	\N	easy	L3	5	{}	{}	\N	60	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	1	0	t
225	single	数学	八年级	√16 = ?	["2", "3", "4", "8"]	"C"	16的算术平方根是4	\N	easy	\N	5	{二次根式}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
226	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-11-04 06:34:31.9367	2025-11-04 06:34:31.940977	1	0	t
227	single	数学	三年级	【API测试-拒绝】1 + 1 = ?	["1", "2", "3", "4"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	163	2025-11-08 13:23:17.009752	2025-11-08 13:23:17.014653	1	0	t
228	single	数学	一年级	【API测试-校级】5 + 2 = ?	["6", "7", "8", "9"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	163	2025-11-08 13:23:17.020636	2025-11-08 13:23:17.025408	1	0	t
229	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-11-04 06:34:31.904476	2025-11-04 06:34:31.924625	1	0	t
230	single	数学	三年级	【API测试】2 + 3 = ?	["4", "5", "6", "7"]	"B"	\N	\N	easy	L1	5	{}	{}	\N	163	2025-11-08 13:23:16.950607	2025-11-08 13:23:16.992634	1	0	t
231	single	数学	三年级	【QBC101-1762262780472】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	9	2025-11-04 13:26:27.329952	2025-11-04 13:26:27.341766	1	0	t
232	single	数学	三年级	【QBC101-1762263085540】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	9	2025-11-04 13:31:32.375847	2025-11-04 13:31:32.445935	1	0	t
233	single	数学	三年级	【QBC101-1762427802612】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 11:16:49.457351	2025-11-06 11:16:49.478191	1	0	t
234	single	数学	三年级	【QBC101-1762430997676】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 12:10:04.55595	2025-11-06 12:10:04.563124	1	0	t
235	single	数学	三年级	【QBC101-1762431892847】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 12:24:59.714186	2025-11-06 12:24:59.792504	1	0	t
236	single	数学	三年级	【QBC101-1762432289440】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 12:31:36.305205	2025-11-06 12:31:36.316162	1	0	t
237	single	数学	三年级	【QBC101-1762433391317】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 12:49:58.23011	2025-11-06 12:49:58.240861	1	0	t
238	single	数学	三年级	【QBC101-1762434563813】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 13:09:30.689564	2025-11-06 13:09:30.69969	1	0	t
239	single	数学	三年级	【QBC101-1762437990137】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 14:06:37.034522	2025-11-06 14:06:37.046987	1	0	t
240	single	数学	三年级	【QBC101-1762438975525】3 × 4 = ?	["9", "12", "15", "16"]	"B"	\N	\N	easy	L2	5	{}	{}	\N	163	2025-11-06 14:23:02.3861	2025-11-06 14:23:02.399417	1	0	t
241	true_false	数学	七年级	【R405-1761045256357】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 11:14:23.380148	2025-10-21 11:14:31.680168	1	0	t
242	true_false	数学	七年级	【R405-1761045501771】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 11:18:28.84058	2025-10-21 11:18:43.470724	1	0	t
243	true_false	数学	七年级	【R405-1761049197253】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 12:20:04.30024	2025-10-21 12:20:17.9815	1	0	t
244	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-21 05:04:04.589358	2025-10-21 05:04:17.619616	1	0	t
245	single	数学	三年级	【REV101-1762434336998】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 13:05:43.836173	2025-11-06 13:05:56.007317	1	0	t
246	single	数学	三年级	【REV101-1762434422124】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 13:07:08.996827	2025-11-06 13:07:21.169688	1	0	t
247	single	数学	三年级	【REV101-1762434495605】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 13:08:22.445371	2025-11-06 13:08:34.597323	1	0	t
248	single	数学	三年级	【REV101-1762434563814】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 13:09:30.691505	2025-11-06 13:09:42.898246	1	0	t
249	single	数学	三年级	【REV101-1762437990215】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 14:06:37.154014	2025-11-06 14:06:49.323822	1	0	t
250	single	数学	三年级	【REV101-1762438975619】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-06 14:23:02.472052	2025-11-06 14:23:14.578555	1	0	t
251	single	数学	三年级	【REV101-1762609599799】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	easy	L3	5	{}	{}	\N	163	2025-11-08 13:46:46.807749	2025-11-08 13:46:58.92881	1	0	t
252	single	数学	一年级	【测试题】1 + 1 = ?	{"A": "2", "B": "3", "C": "4", "D": "5"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
253	single	数学	一年级	【测试题】10 + 1 = ?	{"A": "11", "B": "12", "C": "13", "D": "14"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
254	single	数学	一年级	【测试题】11 + 1 = ?	{"A": "12", "B": "13", "C": "14", "D": "15"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
255	single	数学	一年级	【测试题】12 + 1 = ?	{"A": "13", "B": "14", "C": "15", "D": "16"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
256	single	数学	一年级	【测试题】13 + 1 = ?	{"A": "14", "B": "15", "C": "16", "D": "17"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
257	single	数学	一年级	【测试题】14 + 1 = ?	{"A": "15", "B": "16", "C": "17", "D": "18"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
258	single	数学	一年级	【测试题】15 + 1 = ?	{"A": "16", "B": "17", "C": "18", "D": "19"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
259	single	数学	一年级	【测试题】16 + 1 = ?	{"A": "17", "B": "18", "C": "19", "D": "20"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
260	single	数学	一年级	【测试题】17 + 1 = ?	{"A": "18", "B": "19", "C": "20", "D": "21"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
261	single	数学	一年级	【测试题】18 + 1 = ?	{"A": "19", "B": "20", "C": "21", "D": "22"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
262	single	数学	一年级	【测试题】19 + 1 = ?	{"A": "20", "B": "21", "C": "22", "D": "23"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
263	single	数学	一年级	【测试题】2 + 1 = ?	{"A": "3", "B": "4", "C": "5", "D": "6"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
264	single	数学	一年级	【测试题】20 + 1 = ?	{"A": "21", "B": "22", "C": "23", "D": "24"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
265	single	数学	一年级	【测试题】21 + 1 = ?	{"A": "22", "B": "23", "C": "24", "D": "25"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
266	single	数学	一年级	【测试题】22 + 1 = ?	{"A": "23", "B": "24", "C": "25", "D": "26"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
267	single	数学	一年级	【测试题】23 + 1 = ?	{"A": "24", "B": "25", "C": "26", "D": "27"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
268	single	数学	一年级	【测试题】24 + 1 = ?	{"A": "25", "B": "26", "C": "27", "D": "28"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
269	single	数学	一年级	【测试题】25 + 1 = ?	{"A": "26", "B": "27", "C": "28", "D": "29"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
270	single	数学	一年级	【测试题】26 + 1 = ?	{"A": "27", "B": "28", "C": "29", "D": "30"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
271	single	数学	一年级	【测试题】27 + 1 = ?	{"A": "28", "B": "29", "C": "30", "D": "31"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
272	single	数学	一年级	【测试题】28 + 1 = ?	{"A": "29", "B": "30", "C": "31", "D": "32"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
273	single	数学	一年级	【测试题】29 + 1 = ?	{"A": "30", "B": "31", "C": "32", "D": "33"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
274	single	数学	一年级	【测试题】3 + 1 = ?	{"A": "4", "B": "5", "C": "6", "D": "7"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
275	single	数学	一年级	【测试题】30 + 1 = ?	{"A": "31", "B": "32", "C": "33", "D": "34"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
276	single	数学	一年级	【测试题】31 + 1 = ?	{"A": "32", "B": "33", "C": "34", "D": "35"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
277	single	数学	一年级	【测试题】32 + 1 = ?	{"A": "33", "B": "34", "C": "35", "D": "36"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
278	single	数学	一年级	【测试题】33 + 1 = ?	{"A": "34", "B": "35", "C": "36", "D": "37"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
279	single	数学	一年级	【测试题】34 + 1 = ?	{"A": "35", "B": "36", "C": "37", "D": "38"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
280	single	数学	一年级	【测试题】35 + 1 = ?	{"A": "36", "B": "37", "C": "38", "D": "39"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
281	single	数学	一年级	【测试题】36 + 1 = ?	{"A": "37", "B": "38", "C": "39", "D": "40"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
282	single	数学	一年级	【测试题】37 + 1 = ?	{"A": "38", "B": "39", "C": "40", "D": "41"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
283	single	数学	一年级	【测试题】38 + 1 = ?	{"A": "39", "B": "40", "C": "41", "D": "42"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
284	single	数学	一年级	【测试题】39 + 1 = ?	{"A": "40", "B": "41", "C": "42", "D": "43"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
285	single	数学	一年级	【测试题】4 + 1 = ?	{"A": "5", "B": "6", "C": "7", "D": "8"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
286	single	数学	一年级	【测试题】40 + 1 = ?	{"A": "41", "B": "42", "C": "43", "D": "44"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
287	single	数学	一年级	【测试题】41 + 1 = ?	{"A": "42", "B": "43", "C": "44", "D": "45"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
288	single	数学	一年级	【测试题】42 + 1 = ?	{"A": "43", "B": "44", "C": "45", "D": "46"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
289	single	数学	一年级	【测试题】43 + 1 = ?	{"A": "44", "B": "45", "C": "46", "D": "47"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
290	single	数学	一年级	【测试题】44 + 1 = ?	{"A": "45", "B": "46", "C": "47", "D": "48"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
291	single	数学	一年级	【测试题】45 + 1 = ?	{"A": "46", "B": "47", "C": "48", "D": "49"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
292	single	数学	一年级	【测试题】46 + 1 = ?	{"A": "47", "B": "48", "C": "49", "D": "50"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
293	single	数学	一年级	【测试题】47 + 1 = ?	{"A": "48", "B": "49", "C": "50", "D": "51"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
294	single	数学	一年级	【测试题】48 + 1 = ?	{"A": "49", "B": "50", "C": "51", "D": "52"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
295	single	数学	一年级	【测试题】49 + 1 = ?	{"A": "50", "B": "51", "C": "52", "D": "53"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
296	single	数学	一年级	【测试题】5 + 1 = ?	{"A": "6", "B": "7", "C": "8", "D": "9"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
297	single	数学	一年级	【测试题】50 + 1 = ?	{"A": "51", "B": "52", "C": "53", "D": "54"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
298	single	数学	一年级	【测试题】6 + 1 = ?	{"A": "7", "B": "8", "C": "9", "D": "10"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
299	single	数学	一年级	【测试题】7 + 1 = ?	{"A": "8", "B": "9", "C": "10", "D": "11"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
300	single	数学	一年级	【测试题】8 + 1 = ?	{"A": "9", "B": "10", "C": "11", "D": "12"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:04:53.960302	2025-11-20 15:04:53.960302	1	0	t
301	single	数学	一年级	【测试题】9 + 1 = ?	{"A": "10", "B": "11", "C": "12", "D": "13"}	{"answer": "A"}	\N	\N	easy	\N	20	{}	{}	\N	1	2025-11-20 15:08:53.677364	2025-11-20 15:08:53.677364	1	0	t
302	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	medium	L1	5	{}	{}	\N	9	2025-11-04 06:34:31.953575	2025-11-04 06:34:31.957859	1	0	t
303	single	数学	三年级	【集成测试】5 × 6 = ?	["25", "30", "35", "40"]	"B"	\N	\N	medium	L1	5	{}	{}	\N	163	2025-11-08 13:23:17.028773	2025-11-08 13:23:17.037306	1	0	t
304	blank	数学	四年级	一个三角形的底是12厘米，高是8厘米，面积是__平方厘米	[]	"48"	三角形面积=底×高÷2=12×8÷2=48	\N	medium	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
305	single	数学	六年级	一个圆柱体的底面半径是3cm，高是10cm，它的体积是多少？（π取3.14）	["94.2cm³", "188.4cm³", "282.6cm³", "376.8cm³"]	"282.6cm³"	\N	\N	hard	L3	5	{立体图形体积,圆柱体积}	{圆柱,体积计算}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
306	single	数学	六年级	一个圆的半径扩大2倍，面积扩大多少倍？	["2倍", "3倍", "4倍", "8倍"]	"C"	半径扩大2倍，面积扩大2²=4倍	\N	hard	\N	5	{几何变换}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
307	blank	数学	五年级	一个圆的半径是3cm，它的面积是___ 平方厘米（π取3.14）	\N	"28.26"	圆的面积 = πr² = 3.14 × 3² = 28.26	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	1	0	t
308	blank	数学	五年级	一个圆的半径是5厘米，它的面积是__平方厘米（π取3.14）	\N	{"answers": ["78.5"]}	\N	\N	medium	L2	3	{计算能力}	{圆的面积}	\N	1	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	1	0	t
309	single	数学	五年级	一个圆的半径是5厘米，直径是多少厘米？	["5", "10", "15", "20"]	"B"	直径=半径×2=5×2=10	\N	easy	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
310	blank	数学	六年级	一个圆锥的底面半径是3厘米，高是4厘米，体积是__立方厘米（π取3.14）	[]	"37.68"	圆锥体积=1/3×πr²h=1/3×3.14×3²×4=37.68	\N	hard	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
311	multiple	信息科技	八年级	一个完整的网页通常包含？	["HTML", "CSS", "JavaScript", "Python"]	["A", "B", "C"]	网页由HTML结构、CSS样式、JavaScript交互组成	\N	medium	\N	5	{网页技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
312	single	数学	四年级	一个平行四边形的底是10厘米，高是6厘米，面积是多少平方厘米？	["50", "60", "70", "80"]	"B"	平行四边形面积=底×高=10×6=60	\N	medium	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
313	blank	数学	六年级	一个数的20%是8，这个数是( )	null	"40"	\N	\N	hard	L3	5	{百分数应用,逆运算}	{百分数,百分数问题}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
314	blank	数学	七年级	一个数的相反数是-5，这个数是______。	["5"]	"5"	相反数的定义：只有符号不同的两个数互为相反数	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:49:55.523099	2025-10-14 14:49:55.523099	1	0	t
315	blank	数学	五年级	一个正方体的棱长是4厘米，表面积是__平方厘米	[]	"96"	正方体表面积=6×棱长²=6×4²=6×16=96	\N	hard	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
316	single	数学	一年级	一个正方形有几条边？	["3", "4", "5", "6"]	"B"	正方形有4条边	\N	easy	\N	5	{图形认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
317	single	数学	三年级	一个正方形的边长是5厘米，周长是多少厘米？	["15", "20", "25", "30"]	"B"	正方形周长=边长×4=5×4=20	\N	medium	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
318	essay	数学	五年级	一个水池能装水120立方米，现在有两个水龙头同时向水池注水，甲水龙头每小时注水15立方米，乙水龙头每小时注水10立方米。多长时间可以把水池注满？	\N	{"answer": "两个水龙头每小时共注水：15 + 10 = 25立方米\\n注满时间：120 ÷ 25 = 4.8小时"}	\N	\N	hard	L3	5	{应用能力,逻辑推理}	{应用题,速度与时间}	\N	1	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	1	0	t
319	single	数学	五年级	一个水池长10米，宽8米，深2米，容积是多少立方米？	["140", "150", "160", "170"]	"C"	10×8×2=160立方米	\N	medium	\N	5	{应用题}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
320	essay	数学	三年级	一个班有40个学生，其中男生有22人。女生比男生少多少人？	\N	{"answer": "女生：40 - 22 = 18人\\n女生比男生少：22 - 18 = 4人"}	\N	\N	hard	L3	5	{应用能力,逻辑推理}	{减法应用,应用题}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
321	blank	数学	八年级	一个直角三角形两条直角边长度分别为3和4，斜边长度是___	\N	"5"	根据勾股定理：3² + 4² = 5²	\N	medium	L4	5	{}	{}	\N	60	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	1	0	t
322	single	数学	四年级	一个角是90度的三角形叫什么三角形？	["锐角三角形", "直角三角形", "钝角三角形", "等边三角形"]	"直角三角形"	\N	\N	medium	L2	5	{三角形分类,几何知识}	{三角形,图形分类}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
323	single	数学	五年级	一个长方体有几个面？	["4个", "5个", "6个", "8个"]	"6个"	\N	\N	medium	L3	5	{立体图形,几何知识}	{长方体,立体图形特征}	\N	9	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	1	0	t
324	single	数学	五年级	一个长方体的长是10cm，宽是5cm，高是3cm，它的体积是多少立方厘米？	["1", "2"]	[""]	\N	\N	medium	L2	3	{空间想象}	{长方体体积}	{}	1	2025-10-29 16:40:02.986145	2025-10-30 05:46:58.49467	1	0	t
325	single	数学	五年级	一个长方体的长是8厘米，宽是5厘米，高是3厘米，体积是多少立方厘米？	["100", "110", "120", "130"]	"C"	长方体体积=长×宽×高=8×5×3=120	\N	medium	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
326	single	数学	二年级	一个长方形有几个直角？	["2", "3", "4", "5"]	"C"	长方形有4个直角	\N	easy	\N	5	{图形认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
327	single	数学	五年级	一个长方形的长是8cm，宽是5cm，它的面积是？	{"A": "13平方厘米", "B": "26平方厘米", "C": "40平方厘米", "D": "80平方厘米"}	"C"	长方形面积 = 长 × 宽 = 8 × 5 = 40	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	1	0	t
328	single	数学	三年级	一个长方形的长是8厘米，宽是5厘米，它的周长是多少厘米？	\N	{"answer": "26"}	\N	\N	medium	L2	3	{空间想象}	{长方形周长,几何图形}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
329	blank	数学	三年级	一个长方形长8厘米，宽5厘米，面积是__平方厘米	[]	"40"	长方形面积=长×宽=8×5=40	\N	medium	\N	5	{几何计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
330	essay	数学	六年级	一件商品原价200元，打8折后是多少元？请写出计算过程。	null	"200×0.8=160元，或200×(1-20%)=160元"	\N	\N	medium	L3	10	{百分数应用,折扣问题}	{打折,百分数应用}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
331	single	数学	九年级	一元二次方程x² - 5x + 6 = 0的解是？	{"A": "x=2或x=3", "B": "x=1或x=6", "C": "x=-2或x=-3", "D": "x=-1或x=-6"}	"A"	分解因式：(x-2)(x-3)=0，得x=2或x=3	\N	medium	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	1	0	t
332	single	数学	八年级	一次函数 y = 2x + 1 的图像经过哪个象限？	["一、二、三", "一、二、四", "二、三、四", "一、三、四"]	"A"	k>0,b>0，图像经过一、二、三象限	\N	hard	\N	5	{函数图像}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
333	blank	数学	三年级	一盒铅笔有12支，3盒铅笔一共有__支	\N	{"answers": ["36"]}	\N	\N	medium	L2	3	{应用能力}	{乘法应用,应用题}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
334	single	数学	四年级	一辆汽车每小时行驶60千米，3.5小时行驶多少千米？	["200", "210", "220", "230"]	"B"	60×3.5=210千米	\N	medium	\N	5	{应用题}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
335	essay	数学	四年级	一辆汽车每小时行驶60千米，行驶了3小时，一共行驶了多少千米？	null	"60×3=180千米"	\N	\N	medium	L2	10	{应用题,乘法应用}	{路程问题,速度时间路程}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
336	multiple	信息科技	八年级	下列关于网络安全的做法正确的有（）	["A. 定期更新杀毒软件", "B. 不随意打开陌生邮件", "C. 使用简单密码便于记忆", "D. 不在公共场合输入密码"]	["A", "B", "D"]	A、B、D都是正确的网络安全做法；C使用简单密码不安全	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.762264	2025-10-14 14:52:13.762264	1	0	t
337	multiple	数学	八年级	下列函数中，y随x增大而增大的有（）	["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]	["A", "C"]	A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.737829	2025-10-14 14:52:13.737829	1	0	t
338	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.675635	2025-10-14 14:52:13.675635	1	0	t
339	single	信息科技	五年级	下列哪个不属于信息的基本特征？	["普遍性", "依附性", "价值性", "固定性"]	"D"	信息是可变的，不是固定的	\N	medium	\N	5	{信息素养}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
340	single	信息科技	四年级	下列哪个不是网络浏览器？	["Chrome", "Edge", "Word", "Firefox"]	"C"	Word是文字处理软件，不是浏览器	\N	medium	\N	5	{软件认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
341	single	信息科技	六年级	下列哪个是开源操作系统？	["Windows", "macOS", "Linux", "iOS"]	"C"	Linux是开源操作系统	\N	medium	\N	5	{操作系统}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
342	single	信息科技	三年级	下列哪个是文件夹图标？	["文本文件", "文件夹", "程序", "图片"]	"B"	文件夹用于存放文件	\N	easy	\N	5	{基础操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
343	single	信息科技	三年级	下列哪个是计算机的输入设备？	["显示器", "打印机", "键盘", "音箱"]	"C"	键盘用于输入信息到计算机	\N	easy	\N	5	{硬件认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
344	single	信息科技	九年级	下列哪个是面向对象编程的特征？	["封装", "编译", "链接", "调试"]	"封装"	\N	\N	hard	L5	5	{编程范式,面向对象}	{OOP,编程思想}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
345	multiple	数学	五年级	下列哪些分数与 1/2 相等？\\nA. 2/4\\nB. 3/5\\nC. 4/8\\nD. 5/9	\N	{"answers": ["A", "C"]}	\N	\N	medium	L2	3	{数的认识}	{分数化简}	\N	1	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	1	0	t
346	multiple	数学	一年级	下列哪些数字大于3？（多选）	["2", "4", "5", "1"]	["4", "5"]	\N	\N	easy	L1	10	{数字比较,大小判断}	{数的大小,不等关系}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
347	multiple	数学	三年级	下列哪些数字是偶数？\\nA. 12\\nB. 15\\nC. 18\\nD. 21	\N	{"answers": ["A", "C"]}	\N	\N	medium	L2	3	{数的认识}	{奇偶数}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
348	multiple	信息科技	九年级	下列哪些是常见的编程语言？（多选）	["Python", "HTML", "Java", "C++"]	["Python", "Java", "C++"]	\N	\N	medium	L5	10	{编程语言,语言分类}	{编程语言,语言类型}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
349	multiple	数学	四年级	下列哪些是质数？（多选）	["2", "4", "7", "9"]	["2", "7"]	\N	\N	hard	L2	10	{质数判断,数论知识}	{质数,数的分类}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
350	multiple	数学	六年级	下列哪些是轴对称图形？（多选）	["正方形", "长方形", "平行四边形", "等腰三角形"]	["正方形", "长方形", "等腰三角形"]	\N	\N	hard	L3	10	{图形对称,几何性质}	{轴对称,图形特征}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
351	multiple	数学	二年级	下列哪些算式的结果是10？（多选）	["5+5", "6+3", "7+3", "8+2"]	["5+5", "7+3", "8+2"]	\N	\N	medium	L1	10	{加法运算,逆向思维}	{凑十法,加法}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
352	multiple	信息科技	七年级	下列属于应用软件的有（）	["A. Windows", "B. Word", "C. Excel", "D. PowerPoint"]	["B", "C", "D"]	Windows是操作系统，Word、Excel、PowerPoint是应用软件	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.759691	2025-10-14 14:52:13.759691	1	0	t
353	single	信息科技	七年级	下列设备中，属于输入设备的是（）	["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]	"C"	键盘是输入设备，用于向计算机输入数据和指令	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:49:55.516847	2025-10-14 14:49:55.516847	1	0	t
354	multiple	数学	九年级	下列说法正确的有（）	["A. 对角线互相垂直的四边形是菱形", "B. 对角线相等的平行四边形是矩形", "C. 对角线互相垂直平分且相等的四边形是正方形", "D. 一组对边平行的四边形是梯形"]	["B", "C"]	B、C选项符合矩形和正方形的判定定理	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.740522	2025-10-14 14:52:13.740522	1	0	t
355	single	数学	八年级	下列运算正确的是（）	["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]	"B"	同底数幂相乘，底数不变，指数相加：a³·a²=a⁵	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:49:55.497827	2025-10-14 14:49:55.497827	1	0	t
356	multiple	数学	一年级	下面哪些数字比5大？	["3", "6", "7", "4"]	["B", "C"]	6和7都比5大	\N	medium	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
357	true_false	数学	六年级	两个奇数相加的结果一定是偶数。	null	true	\N	\N	medium	L3	5	{奇偶性,数的性质}	{奇数偶数,数的规律}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
358	true_false	数学	七年级	两条直线被第三条直线所截，同位角相等	["正确", "错误"]	"B"	只有在两直线平行时，同位角才相等	\N	easy	\N	5	{几何定理}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
359	single	数学	九年级	二次函数 y = x² - 2x + 1 的顶点坐标是？	["(0,1)", "(1,0)", "(2,1)", "(-1,4)"]	"B"	y=(x-1)²，顶点为(1,0)	\N	hard	\N	5	{二次函数}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
360	single	信息科技	九年级	二进制数1010转换为十进制是多少？	["8", "10", "12", "14"]	"10"	\N	\N	medium	L5	5	{进制转换,数制}	{二进制,进制转换}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
361	single	信息科技	六年级	人工智能的英文缩写是？	["AI", "VR", "AR", "IT"]	"A"	AI是Artificial Intelligence的缩写	\N	easy	\N	5	{前沿技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
362	single	信息科技	八年级	什么是API？	["应用程序接口", "编程语言", "数据库", "操作系统"]	"A"	API是Application Programming Interface	\N	medium	\N	5	{编程概念}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
363	single	信息科技	九年级	什么是云存储？	["本地硬盘存储", "通过网络提供的存储服务", "U盘存储", "光盘存储"]	"B"	云存储通过互联网提供数据存储	\N	medium	\N	5	{云计算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
364	single	信息科技	六年级	什么是云计算？	["在云朵上计算", "通过网络提供计算服务", "一种天气预报", "一种游戏"]	"B"	云计算通过互联网提供计算资源	\N	medium	\N	5	{前沿技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
365	single	信息科技	六年级	什么是变量？	["一个常数", "一个存储数据的容器", "一个函数", "一个循环"]	"B"	变量用于存储可变的数据	\N	medium	\N	5	{编程概念}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
366	single	信息科技	六年级	什么是循环？	["程序只执行一次", "重复执行某段代码", "跳过某段代码", "结束程序"]	"B"	循环用于重复执行代码	\N	medium	\N	5	{编程概念}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
367	single	信息科技	九年级	什么是机器学习？	["人类学习", "让计算机从数据中学习", "一种编程语言", "一种算法"]	"B"	机器学习是AI的一个分支	\N	medium	\N	5	{人工智能}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
368	single	信息科技	九年级	什么是深度学习？	["深入学习知识", "基于神经网络的机器学习", "一种编程方法", "一种数据库"]	"B"	深度学习使用多层神经网络	\N	hard	\N	5	{人工智能}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
369	single	信息科技	九年级	什么是爬虫？	["一种昆虫", "自动获取网页数据的程序", "一种病毒", "一种浏览器"]	"B"	爬虫用于自动抓取网页内容	\N	medium	\N	5	{网络技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
370	single	信息科技	五年级	什么是算法？	["一种编程语言", "解决问题的步骤", "一个软件", "一种硬件"]	"B"	算法是解决问题的明确步骤	\N	medium	\N	5	{编程基础}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
371	single	数学	一年级	从左数第3个是哪个数字：1 2 3 4 5	["1", "2", "3", "4"]	"C"	从左边数第三个位置是数字3	\N	easy	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
372	single	信息科技	九年级	以下哪个不是数据库管理系统？	{"A": "MySQL", "B": "Oracle", "C": "Photoshop", "D": "MongoDB"}	"C"	Photoshop是图像处理软件	\N	easy	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	1	0	t
373	single	信息科技	八年级	以下哪个不是面向对象编程的特征？	{"A": "封装", "B": "继承", "C": "多态", "D": "编译"}	"D"	面向对象的三大特征是封装、继承和多态	\N	medium	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	1	0	t
374	single	信息科技	四年级	以下哪个软件是文字处理软件？	{"A": "Photoshop", "B": "Word", "C": "Excel", "D": "PowerPoint"}	"B"	Word是微软的文字处理软件	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	1	0	t
375	multiple	数学	五年级	以下哪些分数可以化简？	["2/3", "4/6", "6/9", "5/7"]	["B", "C"]	4/6=2/3，6/9=2/3，都可以化简	\N	medium	\N	5	{分数化简}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
376	multiple	数学	四年级	以下哪些分数大于1/2？（多选）	{"A": "2/3", "B": "3/4", "C": "1/3", "D": "1/4"}	["A", "B"]	2/3和3/4都大于1/2	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	1	0	t
377	multiple	数学	一年级	以下哪些数字小于5？（多选）	{"A": "2", "B": "3", "C": "6", "D": "7"}	["A", "B"]	小于5的数字是2和3	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	1	0	t
378	multiple	数学	三年级	以下哪些数字能被3整除？	["15", "17", "18", "20"]	["A", "C"]	15和18都能被3整除	\N	medium	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
379	multiple	数学	二年级	以下哪些数是偶数？（多选）	{"A": "2", "B": "4", "C": "5", "D": "6"}	["A", "B", "D"]	偶数能被2整除	\N	medium	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	1	0	t
380	multiple	数学	九年级	以下哪些方程有实数解？	["x²+1=0", "x²-4=0", "x²+2x+1=0", "x²+x+1=0"]	["B", "C"]	x²-4=0和x²+2x+1=0的判别式≥0，有实数解	\N	hard	\N	5	{方程判别}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
381	multiple	数学	八年级	以下哪些是二次函数的图像特征？（多选）	{"A": "抛物线", "B": "对称轴", "C": "顶点", "D": "直线"}	["A", "B", "C"]	二次函数图像是抛物线，有对称轴和顶点	\N	medium	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	1	0	t
382	multiple	信息科技	六年级	以下哪些是人工智能的应用？	["语音识别", "图像识别", "文字处理", "智能推荐"]	["A", "B", "D"]	AI可应用于语音、图像识别和智能推荐	\N	medium	\N	5	{前沿技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
383	multiple	数学	二年级	以下哪些是偶数？	["3", "6", "7", "8"]	["B", "D"]	偶数能被2整除，6和8都是偶数	\N	medium	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
384	multiple	数学	七年级	以下哪些是单项式？	["2x", "x+y", "3xy", "5"]	["A", "C", "D"]	单项式是数字或字母的乘积	\N	medium	\N	5	{代数识别}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
385	multiple	信息科技	四年级	以下哪些是存储设备？	["U盘", "硬盘", "内存条", "显示器"]	["A", "B", "C"]	U盘、硬盘、内存条都是存储设备	\N	medium	\N	5	{硬件认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
386	multiple	数学	八年级	以下哪些是完全平方公式？	["(a+b)²=a²+2ab+b²", "(a-b)²=a²-2ab+b²", "a²-b²=(a+b)(a-b)", "(a+b)(a-b)=a²-b²"]	["A", "B"]	前两个是完全平方公式	\N	medium	\N	5	{代数公式}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
387	multiple	信息科技	八年级	以下哪些是常见的排序算法？（多选）	{"A": "冒泡排序", "B": "快速排序", "C": "选择排序", "D": "插入排序"}	["A", "B", "C", "D"]	这些都是常见的排序算法	\N	medium	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	1	0	t
388	multiple	信息科技	九年级	以下哪些是常见的数据结构？	["数组", "链表", "树", "所有选项"]	["A", "B", "C"]	数组、链表、树都是基本数据结构	\N	hard	\N	5	{数据结构}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
389	multiple	信息科技	四年级	以下哪些是常见的文件格式？（多选）	{"A": ".txt", "B": ".doc", "C": ".jpg", "D": ".mp3"}	["A", "B", "C", "D"]	这些都是常见的文件格式	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	1	0	t
390	multiple	数学	七年级	以下哪些是有理数？（多选）	{"A": "整数", "B": "分数", "C": "小数", "D": "无理数"}	["A", "B", "C"]	有理数包括整数、分数和有限小数	\N	medium	L4	5	{}	{}	\N	60	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	1	0	t
391	multiple	数学	五年级	以下哪些是正方体的特征？（多选）	{"A": "6个面", "B": "12条棱", "C": "8个顶点", "D": "所有棱长都相等"}	["A", "B", "C", "D"]	正方体的所有特征	\N	medium	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	1	0	t
392	multiple	数学	六年级	以下哪些是百分数的应用场景？（多选）	{"A": "利率", "B": "折扣", "C": "增长率", "D": "税率"}	["A", "B", "C", "D"]	百分数在生活中广泛应用	\N	easy	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	1	0	t
393	multiple	数学	九年级	以下哪些是相似三角形的判定方法？（多选）	{"A": "三边成比例", "B": "两角对应相等", "C": "两边成比例且夹角相等", "D": "全等"}	["A", "B", "C"]	相似三角形的判定定理	\N	medium	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	1	0	t
394	multiple	信息科技	六年级	以下哪些是编程的基本结构？（多选）	{"A": "顺序", "B": "选择", "C": "循环", "D": "递归"}	["A", "B", "C"]	顺序、选择和循环是三大基本结构	\N	medium	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	1	0	t
395	multiple	信息科技	五年级	以下哪些是编程语言？	["Python", "Java", "Word", "C++"]	["A", "B", "D"]	Python、Java、C++都是编程语言	\N	medium	\N	5	{编程认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
396	multiple	信息科技	三年级	以下哪些是计算机的输入设备？（多选）	{"A": "键盘", "B": "鼠标", "C": "显示器", "D": "扫描仪"}	["A", "B", "D"]	输入设备用于向计算机输入信息	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	1	0	t
397	multiple	数学	六年级	以下哪些是负数？	["-5", "0", "3", "-0.5"]	["A", "D"]	-5和-0.5都是负数	\N	easy	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
398	multiple	数学	四年级	以下哪些是质数？	["4", "7", "9", "11"]	["B", "D"]	质数只能被1和自身整除，7和11是质数	\N	hard	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
399	multiple	数学	三年级	以下哪些是质数？（多选）	{"A": "2", "B": "3", "C": "4", "D": "5"}	["A", "B", "D"]	质数只能被1和自身整除	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	1	0	t
400	single	信息科技	三年级	保存文件的快捷键是？	["Ctrl+C", "Ctrl+V", "Ctrl+S", "Ctrl+Z"]	"C"	Ctrl+S是保存文件的快捷键	\N	medium	\N	5	{软件操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
401	true_false	数学	八年级	全等三角形的对应角相等	["正确", "错误"]	"A"	全等三角形的对应边相等，对应角也相等	\N	easy	\N	5	{全等三角形}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
402	true_false	信息科技	三年级	关机前需要先关闭所有程序	["正确", "错误"]	"A"	关机前应该正确关闭程序，避免数据丢失	\N	easy	\N	5	{安全操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
403	true_false	信息科技	八年级	函数可以提高代码的复用性	["正确", "错误"]	"A"	函数可以封装重复使用的代码	\N	easy	\N	5	{编程概念}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
404	blank	数学	八年级	分式 (x²-1)/(x-1) 化简后等于__（x≠1）	[]	"x+1"	x²-1=(x+1)(x-1)，约分后得x+1	\N	medium	\N	5	{分式化简}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
405	single	数学	三年级	分数3/4读作？	["三分之四", "四分之三", "三比四", "四比三"]	"B"	分子在前，分母在后，读作四分之三	\N	easy	\N	5	{分数认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
406	single	信息科技	七年级	列表是Python中的什么数据类型？	["数字", "字符串", "序列", "字典"]	"C"	列表是一种序列类型	\N	medium	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
407	true_false	数学	八年级	勾股定理只适用于直角三角形。	{"A": "正确", "B": "错误"}	"A"	勾股定理是直角三角形的特有性质	\N	easy	L4	5	{}	{}	\N	60	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	1	0	t
408	single	数学	八年级	勾股定理：直角三角形两直角边长为3和4，斜边长为？	["5", "6", "7", "8"]	"A"	c²=a²+b²=9+16=25，c=5	\N	medium	\N	5	{勾股定理}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
409	single	信息科技	九年级	区块链的主要特点是？	["中心化", "去中心化", "单点存储", "不可追溯"]	"B"	区块链是分布式去中心化的账本	\N	hard	\N	5	{前沿技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
410	single	信息科技	三年级	双击文件可以？	["删除文件", "打开文件", "复制文件", "重命名文件"]	"B"	双击可以打开文件	\N	easy	\N	5	{基础操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
411	true_false	信息科技	六年级	变量可以用来存储和改变数据。	{"A": "正确", "B": "错误"}	"A"	变量是存储数据的容器	\N	easy	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	1	0	t
412	single	数学	七年级	合并同类项：3x + 2x = ?	["5x", "5x²", "6x", "x"]	"A"	系数相加，字母和指数不变	\N	easy	\N	5	{代数运算}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
413	single	数学	一年级	哪个数字最大？	["2", "5", "3", "1"]	"5"	\N	\N	easy	L1	5	{数字比较,大小概念}	{数的大小,数序}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
414	single	信息科技	三年级	哪个软件可以用来画画？	["Word", "画图", "记事本", "计算器"]	"B"	画图软件用于绘图	\N	easy	\N	5	{软件认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
415	single	数学	一年级	哪个选项是三角形？	["正方形", "圆形", "三角形", "五角星"]	"C"	三角形有三条边和三个角	\N	easy	\N	5	{图形认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
416	single	数学	八年级	因式分解：x² - 9 = ?	["(x-3)(x-3)", "(x+3)(x+3)", "(x-3)(x+3)", "x(x-9)"]	"C"	平方差公式：a²-b²=(a+b)(a-b)	\N	medium	\N	5	{因式分解}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
417	single	数学	六年级	圆柱的体积公式是？	["πr²", "πr²h", "2πr", "2πrh"]	"B"	圆柱体积=底面积×高=πr²h	\N	easy	\N	5	{几何公式}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
418	true_false	数学	六年级	圆柱的体积等于底面积乘以高。	{"A": "正确", "B": "错误"}	"A"	圆柱体积公式：V = Sh	\N	easy	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	1	0	t
419	true_false	数学	九年级	圆的切线垂直于过切点的半径。	{"A": "正确", "B": "错误"}	"A"	这是圆的切线性质	\N	easy	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	1	0	t
420	single	数学	九年级	圆的切线性质：切线与半径的关系？	["平行", "垂直", "相等", "相交"]	"B"	圆的切线垂直于过切点的半径	\N	easy	\N	5	{圆的性质}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
421	single	数学	九年级	圆的半径为5，圆心到直线的距离为3，直线与圆的位置关系是？	["相离", "相切", "相交", "无法确定"]	"C"	距离3<半径5，直线与圆相交	\N	medium	\N	5	{直线与圆}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
422	true_false	数学	五年级	圆的周长公式是 C = 2πr	["正确", "错误"]	"A"	圆的周长公式确实是2πr或πd	\N	easy	\N	5	{几何公式}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
423	true_false	数学	五年级	圆的周长等于直径乘以π。	null	true	\N	\N	medium	L3	5	{圆的周长,几何公式}	{圆,周长公式}	\N	9	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	1	0	t
424	true_false	数学	五年级	圆的周长等于直径乘以π。	{"A": "正确", "B": "错误"}	"A"	圆的周长公式：C = πd	\N	easy	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	1	0	t
425	blank	数学	六年级	圆锥的体积公式是：V = (1/3) × ( ) × h	null	"底面积"	\N	\N	medium	L3	5	{立体图形体积,圆锥}	{圆锥体积,公式记忆}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
426	single	数学	九年级	圆锥的母线长为10cm，底面半径为6cm，侧面积是多少cm²？（π取3.14）	["180", "188.4", "200", "240"]	"B"	侧面积=πrl=3.14×6×10=188.4	\N	hard	\N	5	{立体几何}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
427	single	信息科技	五年级	在Excel中，SUM函数的作用是？	["求平均值", "求和", "计数", "查找"]	"B"	SUM函数用于求和	\N	easy	\N	5	{软件操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
428	single	信息科技	五年级	在Excel中，单元格A1表示？	["第1行第A列", "第A行第1列", "工作表A的第1个单元格", "第1个工作表"]	"A"	A表示列，1表示行	\N	medium	\N	5	{软件操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
429	single	信息科技	八年级	在HTML中，<p>标签用于？	["创建段落", "创建标题", "插入图片", "创建链接"]	"A"	<p>标签用于定义段落	\N	easy	\N	5	{网页技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
430	single	信息科技	七年级	在Python中，#符号用于？	["定义变量", "注释", "输出", "计算"]	"B"	#用于添加注释	\N	easy	\N	5	{编程语法}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
431	blank	信息科技	六年级	在Python中，__语句用于创建循环	[]	"for或while"	for和while都可以创建循环	\N	medium	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
432	single	信息科技	七年级	在Python中，如何表示字符串？	["用括号", "用引号", "用方括号", "用花括号"]	"B"	字符串用单引号或双引号表示	\N	easy	\N	5	{编程语言}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
433	blank	信息科技	七年级	在Python中，定义变量x等于10的语句是：x = ___	\N	"10"	Python使用=赋值	\N	easy	L4	5	{}	{}	\N	60	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	1	0	t
434	single	数学	九年级	在Rt△ABC中，∠C=90°，AC=3，BC=4，则tanA=？	["3/4", "4/3", "3/5", "4/5"]	"B"	tanA=对边/邻边=BC/AC=4/3	\N	medium	\N	5	{三角函数}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
435	blank	信息科技	五年级	在Scratch中，__模块用于控制程序的流程	[]	"控制"	控制模块包含条件判断和循环等	\N	medium	\N	5	{编程工具}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
436	multiple	信息科技	五年级	在Scratch中，以下哪些是事件积木？（多选）	{"A": "当绿旗被点击", "B": "当按下空格键", "C": "重复执行", "D": "广播"}	["A", "B"]	事件积木用于触发程序执行	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	1	0	t
437	blank	信息科技	五年级	在Scratch中，让角色重复执行某个动作使用___积木	\N	"重复执行"	重复执行积木用于循环	\N	easy	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	1	0	t
438	blank	信息科技	四年级	在Windows系统中，复制文件的快捷键是___	\N	"Ctrl+C"	Ctrl+C用于复制	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	1	0	t
439	single	数学	八年级	在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）	["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]	"B"	关于x轴对称，x坐标不变，y坐标变为相反数	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.68811	2025-10-14 14:52:13.68811	1	0	t
440	blank	信息科技	六年级	在编程中，___语句用于根据条件执行不同的代码	\N	"if"	if语句用于条件判断	\N	easy	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	1	0	t
441	single	信息科技	六年级	在编程中，if语句属于什么结构？	["顺序结构", "选择结构", "循环结构", "函数结构"]	"B"	if语句用于条件判断，属于选择结构	\N	easy	\N	5	{编程结构}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
442	single	信息科技	六年级	在编程中，以下哪个是条件判断语句？	{"A": "循环", "B": "如果...那么", "C": "变量", "D": "函数"}	"B"	条件判断使用if语句	\N	easy	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	1	0	t
443	true_false	信息科技	四年级	在网上不应该随意透露个人信息	["正确", "错误"]	"A"	保护个人信息安全很重要	\N	easy	\N	5	{网络安全}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
444	blank	信息科技	九年级	在网页开发中，CSS用于控制网页的___	\N	"样式"	CSS用于控制网页样式	\N	easy	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	1	0	t
445	blank	数学	一年级	填空：10 - ( ) = 6	null	"4"	\N	\N	easy	L1	5	{减法运算,逆向思维}	{减法,填空题}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
446	blank	数学	一年级	填空：5 + ( ) = 10	null	"5"	\N	\N	easy	L1	5	{加法运算,逆向思维}	{加法,填空题}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
447	blank	数学	二年级	填空：6 × ( ) = 18	null	"3"	\N	\N	medium	L1	5	{乘法运算,除法思想}	{乘法口诀,乘除关系}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
448	blank	信息科技	四年级	复制的快捷键是Ctrl+__	[]	"C"	Ctrl+C是复制快捷键	\N	medium	\N	5	{键盘操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
449	true_false	信息科技	六年级	大数据可以帮助我们发现规律和趋势	["正确", "错误"]	"A"	大数据分析能发现隐藏的模式和趋势	\N	easy	\N	5	{前沿技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
450	blank	数学	七年级	如果 3x - 7 = 8，那么 x = __	[]	"5"	3x=8+7=15，x=5	\N	medium	\N	5	{方程求解}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
451	single	数学	六年级	如果x + 5 = 12，那么x = ?	{"A": "5", "B": "6", "C": "7", "D": "8"}	"C"	x = 12 - 5 = 7	\N	medium	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	1	0	t
452	single	数学	六年级	如果x + 5 = 12，那么x等于多少？	["5", "6", "7", "8"]	"7"	\N	\N	medium	L3	5	{代数方程,解方程}	{一元一次方程,方程求解}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
453	single	数学	五年级	小数0.125化成分数是？	["1/4", "1/5", "1/6", "1/8"]	"D"	0.125=125/1000=1/8	\N	medium	\N	5	{小数与分数}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
454	true_false	数学	四年级	小数0.5等于分数1/2。	null	true	\N	\N	medium	L2	5	{小数与分数,数的转换}	{小数,分数,等量关系}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
455	single	数学	七年级	小明买了x支铅笔，每支2元，付了20元，应找回多少元？	["20-x", "20-2x", "2x-20", "x-20"]	"B"	找零=付款-花费=20-2x	\N	medium	\N	5	{应用题}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
456	essay	数学	二年级	小明有20元钱，买了一本书花了12元，还剩多少钱？请写出算式。	null	"20-12=8，还剩8元"	\N	\N	medium	L1	10	{应用题,减法应用}	{购物问题,减法应用}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
457	single	数学	二年级	小明有20元，买了5元的笔，还剩多少元？	["10", "12", "15", "18"]	"C"	20-5=15元	\N	medium	\N	5	{应用题}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
458	essay	数学	三年级	小明有30元钱，买了一本书花了12元，买了一支笔花了5元。请问：\\n1. 小明一共花了多少钱？\\n2. 小明还剩多少钱？	\N	{"answer": "1. 12 + 5 = 17元\\n2. 30 - 17 = 13元"}	\N	\N	hard	L3	5	{应用能力,逻辑推理}	{综合应用,加减混合运算}	\N	1	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	1	0	t
459	single	数学	三年级	小红买了3本书，每本12元，一共花了多少元？	["30", "34", "36", "40"]	"C"	3×12=36元	\N	medium	\N	5	{应用题}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
460	single	数学	七年级	已知∠A=35°，则∠A的余角是（）	["A. 55°", "B. 65°", "C. 145°", "D. 155°"]	"A"	余角是两个角的和为90°，90°-35°=55°	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:49:55.49315	2025-10-14 14:49:55.49315	1	0	t
461	essay	数学	八年级	已知△ABC中，AB=AC，点D在BC上，且AD平分∠BAC。求证：BD=CD。	\N	"证明：因为AB=AC，AD平分∠BAC，所以∠BAD=∠CAD。在△ABD和△ACD中，AB=AC，∠BAD=∠CAD，AD=AD，所以△ABD≌△ACD(SAS)，所以BD=CD。"	利用等腰三角形的性质和全等三角形的判定与性质	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.793693	2025-10-14 14:52:13.793693	1	0	t
462	single	数学	九年级	已知一元二次方程x²-5x+6=0的两根为x₁和x₂，则x₁+x₂的值为（）	["A. -5", "B. 5", "C. -6", "D. 6"]	"B"	根据韦达定理，x₁+x₂=-b/a=5	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.691306	2025-10-14 14:52:13.691306	1	0	t
463	single	数学	八年级	平行四边形的对角线互相？	["垂直", "平分", "相等", "平行"]	"B"	平行四边形的对角线互相平分	\N	easy	\N	5	{几何性质}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
464	true_false	数学	四年级	平行四边形的对边平行且相等。	null	true	\N	\N	medium	L2	5	{图形性质,几何知识}	{平行四边形,图形特征}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
465	single	数学	七年级	平角等于多少度？	["90°", "180°", "270°", "360°"]	"B"	平角等于180度	\N	easy	\N	5	{几何基础}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
466	true_false	数学	三年级	所有偶数都能被2整除。	{"A": "正确", "B": "错误"}	"A"	偶数的定义就是能被2整除的数	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	1	0	t
467	true_false	数学	六年级	所有的整数都是有理数	["正确", "错误"]	"A"	整数都可以表示为分数形式，都是有理数	\N	easy	\N	5	{数的分类}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
468	single	数学	九年级	抛物线y=2(x-1)²+3的顶点坐标是（）	["A. (1,3)", "B. (-1,3)", "C. (1,-3)", "D. (-1,-3)"]	"A"	抛物线顶点式y=a(x-h)²+k，顶点坐标为(h,k)，所以是(1,3)	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.694695	2025-10-14 14:52:13.694695	1	0	t
469	single	信息科技	九年级	排序算法中，冒泡排序的平均时间复杂度是？	["O(n)", "O(n log n)", "O(n²)", "O(log n)"]	"C"	冒泡排序需要嵌套循环，时间复杂度为O(n²)	\N	hard	\N	5	{算法分析}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
470	single	信息科技	四年级	搜索引擎可以用来？	["查找信息", "编辑文档", "画图", "计算"]	"A"	搜索引擎帮助我们在互联网上查找信息	\N	easy	\N	5	{网络应用}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
471	blank	信息科技	九年级	数据库中用于查询数据的SQL语句是( )。	null	"SELECT"	\N	\N	medium	L5	5	{数据库,SQL语言}	{SQL,数据查询}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
472	single	信息科技	八年级	数据库用于？	["存储和管理数据", "编辑图片", "播放视频", "浏览网页"]	"A"	数据库是用于存储和管理数据的系统	\N	easy	\N	5	{数据管理}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
473	true_false	信息科技	八年级	数组的索引从0开始。	{"A": "正确", "B": "错误"}	"A"	大多数编程语言中数组索引从0开始	\N	easy	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	1	0	t
474	true_false	信息科技	四年级	文件夹可以包含其他文件夹。	{"A": "正确", "B": "错误"}	"A"	文件夹可以嵌套，形成层级结构	\N	easy	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	1	0	t
475	single	数学	九年级	方程 x² - 5x + 6 = 0 的解是？	["x=1或x=6", "x=2或x=3", "x=-2或x=-3", "x=1或x=5"]	"B"	因式分解：(x-2)(x-3)=0，x=2或x=3	\N	medium	\N	5	{一元二次方程}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
476	blank	信息科技	八年级	时间复杂度为O(n²)的排序算法有冒泡排序和___排序	\N	"选择"	冒泡排序和选择排序都是O(n²)	\N	medium	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	1	0	t
477	true_false	信息科技	三年级	显示器是输出设备。	{"A": "正确", "B": "错误"}	"A"	显示器用于显示计算机输出的信息	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	1	0	t
478	single	数学	六年级	某商品原价100元，打8折后价格是多少元？	["70", "75", "80", "85"]	"C"	100×80%=80元	\N	medium	\N	5	{应用题}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
479	essay	数学	九年级	某商店销售一种商品，每件成本40元，若售价为50元，每天可售出100件。经调查，售价每提高1元，每天销量减少5件。问：售价定为多少元时，每天的利润最大？最大利润是多少？	\N	"设售价为(50+x)元，则每天销量为(100-5x)件，利润y=(50+x-40)(100-5x)=(10+x)(100-5x)=-5x²+50x+1000=-5(x-5)²+1125。当x=5时，y最大=1125元，此时售价为55元。"	利用二次函数求最值，建立数学模型求解实际问题	\N	hard	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.79629	2025-10-14 14:52:13.79629	1	0	t
480	single	数学	一年级	比7大1的数是多少？	["6", "7", "8", "9"]	"C"	7加1等于8	\N	easy	\N	5	{数感}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
481	single	数学	六年级	比例式 3:4 = x:12 中，x等于多少？	["6", "7", "8", "9"]	"D"	根据比例的基本性质，4x=3×12=36，x=9	\N	medium	\N	5	{比例}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
482	single	数学	六年级	比例式 3:4 = x:8 中，x的值是多少？	["4", "5", "6", "7"]	"6"	\N	\N	medium	L3	5	{比例,解比例}	{比和比例,比例求解}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
483	single	数学	四年级	比较大小：2/3 __ 3/4	["大于", "小于", "等于", "无法比较"]	"B"	2/3=8/12，3/4=9/12，所以2/3<3/4	\N	medium	\N	5	{分数比较}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
484	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-20 16:39:09.876961	2025-10-20 16:39:18.170939	1	0	t
485	true_false	数学	七年级	测试提交审核功能	\N	true	\N	\N	easy	L1	5	{}	{}	\N	9	2025-10-19 11:24:02.323816	2025-10-19 11:24:07.933191	1	0	t
486	single	信息科技	四年级	浏览器的主要作用是？	["编辑文档", "浏览网页", "播放音乐", "编辑图片"]	"B"	浏览器用于访问和浏览网页	\N	easy	\N	5	{网络应用}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
487	single	信息科技	六年级	物联网的英文缩写是？	["AI", "IoT", "VR", "AR"]	"B"	IoT是Internet of Things的缩写	\N	easy	\N	5	{前沿技术}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
488	essay	数学	一年级	用画图的方式表示：3个苹果加2个苹果一共有几个苹果？	null	"5个苹果"	\N	\N	easy	L1	10	{图形表达,应用题}	{加法应用,图文结合}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
489	single	信息科技	四年级	电子邮件的地址中必须包含什么符号？	["#", "*", "@", "&"]	"C"	电子邮件地址格式为：用户名@域名	\N	easy	\N	5	{网络应用}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
490	single	数学	六年级	百分数60%化成小数是？	["0.06", "0.6", "6", "60"]	"B"	60%=60/100=0.6	\N	easy	\N	5	{百分数}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
491	true_false	数学	九年级	相似三角形的对应边成比例	["正确", "错误"]	"A"	相似三角形的定义就是对应边成比例	\N	easy	\N	5	{相似三角形}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
492	single	信息科技	五年级	程序的三种基本结构不包括？	["顺序结构", "选择结构", "循环结构", "递归结构"]	"D"	基本结构是顺序、选择、循环	\N	hard	\N	5	{编程基础}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
493	true_false	信息科技	五年级	程序需要按照一定的语法规则编写	["正确", "错误"]	"A"	每种编程语言都有自己的语法规则	\N	easy	\N	5	{编程基础}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
494	single	数学	八年级	等腰三角形的两边长为5和10，第三边长为？	["5", "10", "15", "5或10"]	"B"	如果5是腰，5+5<10不满足三角形不等式，所以10是腰，第三边为10	\N	medium	\N	5	{三角形性质}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
495	true_false	信息科技	九年级	算法的时间复杂度O(n²)比O(n)更高效。	null	false	\N	\N	hard	L5	5	{算法分析,时间复杂度}	{算法,复杂度}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
496	true_false	信息科技	九年级	算法的时间复杂度用于衡量算法效率	["正确", "错误"]	"A"	时间复杂度反映算法执行时间随输入规模的增长趋势	\N	easy	\N	5	{算法分析}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
497	code	信息科技	九年级	编写程序：使用循环计算1到100的累加和。	null	"sum=0; for i=1 to 100: sum=sum+i; 输出sum"	\N	\N	medium	L5	20	{循环结构,程序设计}	{for循环,累加运算}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
498	code	信息科技	八年级	编写程序：输入一个正整数n，计算并输出1到n之间所有偶数的和。	\N	"n = int(input())\\nsum = 0\\nfor i in range(2, n+1, 2):\\n    sum += i\\nprint(sum)"	使用循环累加计算偶数和	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.823338	2025-10-14 14:52:13.823338	1	0	t
499	code	信息科技	七年级	编写程序：输入三个整数，输出其中的最大值。	\N	"a = int(input())\\nb = int(input())\\nc = int(input())\\nmax_num = a\\nif b > max_num:\\n    max_num = b\\nif c > max_num:\\n    max_num = c\\nprint(max_num)"	使用条件判断找出最大值	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.820675	2025-10-14 14:52:13.820675	1	0	t
500	code	数学	八年级	编写程序：输入三角形三边a、b、c，判断是否能构成三角形（任意两边之和大于第三边）	null	"if (a+b>c and b+c>a and a+c>b) then 能构成 else 不能构成"	\N	\N	hard	L4	15	{算法设计,三角形判定}	{三角形,程序逻辑}	\N	9	2025-10-30 10:52:26.289571	2025-10-30 10:52:26.289571	1	0	t
501	code	信息科技	七年级	编写程序：输入两个整数a和b，输出它们的和。	null	"输入a和b，输出a+b"	\N	\N	easy	L4	15	{编程基础,输入输出}	{程序设计,简单运算}	\N	9	2025-10-30 10:52:26.303086	2025-10-30 10:52:26.303086	1	0	t
502	code	数学	五年级	编写程序：输入圆的半径r，计算圆的面积（面积=πr²，π取3.14）	null	"输入半径r，面积=3.14*r*r"	\N	\N	hard	L3	15	{算法编写,公式应用}	{圆的面积,程序设计}	\N	9	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	1	0	t
503	code	数学	三年级	编写计算正方形周长的简单算法（给定边长a，周长=4×a）	null	"输入边长a，周长=4*a"	\N	\N	hard	L2	15	{算法思维,公式应用}	{周长公式,算法表达}	\N	9	2025-10-30 10:52:26.283166	2025-10-30 10:52:26.283166	1	0	t
504	blank	数学	九年级	若sin30° = 0.5，则cos60° = ___	\N	"0.5"	sin30° = cos60° = 0.5	\N	medium	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	1	0	t
505	blank	数学	八年级	若x²-6x+m是完全平方式，则m=______。	["9"]	"9"	完全平方公式：(x-3)²=x²-6x+9，所以m=9	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.76764	2025-10-14 14:52:13.76764	1	0	t
506	single	数学	八年级	若分式 (x-2)/(x+3) 的值为0，则x的值为？	["0", "2", "3", "-3"]	"B"	分式值为0，分子为0且分母不为0，x-2=0，x=2	\N	medium	\N	5	{分式方程}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
507	blank	数学	九年级	若抛物线 y = ax² + bx + c 的对称轴为 x = 2，则 b/a = __	[]	"-4"	对称轴 x = -b/(2a) = 2，所以 b/a = -4	\N	hard	\N	5	{二次函数}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
508	blank	信息科技	七年级	计算机中最小的信息单位是______。	["位", "bit", "比特"]	"位"	位(bit)是计算机中最小的信息单位，表示0或1	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.788394	2025-10-14 14:52:13.788394	1	0	t
509	multiple	信息科技	三年级	计算机可以用来做什么？	["打字", "画画", "听音乐", "以上都可以"]	["A", "B", "C"]	计算机有多种用途	\N	easy	\N	5	{计算机应用}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
510	single	信息科技	三年级	计算机的"大脑"是指？	["显示器", "键盘", "CPU", "鼠标"]	"C"	CPU是中央处理器，相当于计算机的大脑	\N	easy	\N	5	{硬件认知}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
511	single	信息科技	七年级	计算机的"大脑"是（）	["A. 硬盘", "B. CPU", "C. 内存", "D. 主板"]	"B"	CPU(中央处理器)是计算机的核心，负责处理数据和执行指令	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.7352	2025-10-14 14:52:13.7352	1	0	t
512	single	信息科技	三年级	计算机的"大脑"是？	{"A": "显示器", "B": "键盘", "C": "CPU", "D": "鼠标"}	"C"	CPU是中央处理器，负责计算和控制	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	1	0	t
513	blank	信息科技	三年级	计算机的三大组成部分是：输入设备、___和输出设备	\N	"主机"	计算机由输入设备、主机和输出设备组成	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	1	0	t
514	single	数学	五年级	计算：3.5 + 2.8 = ?	["6.3", "7", "2", "1"]	[""]	\N	\N	easy	L1	2	{计算能力}	{小数加法}	{}	1	2025-10-29 16:40:02.986145	2025-10-30 05:47:23.967647	1	0	t
515	essay	数学	一年级	请用自己的话说明什么是加法？	\N	"加法是把两个或多个数合在一起的运算"	加法是基本运算之一	\N	medium	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	1	0	t
516	essay	信息科技	九年级	请简述冒泡排序算法的基本思想。	null	"冒泡排序通过重复遍历数组，比较相邻元素并交换位置，将最大（或最小）元素逐步移到数组末端。"	\N	\N	hard	L5	15	{算法设计,排序算法}	{冒泡排序,算法原理}	\N	9	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	1	0	t
517	essay	信息科技	八年级	请简述冯·诺依曼计算机的工作原理，并说明"存储程序"的含义。	\N	"冯·诺依曼计算机工作原理：1.采用二进制；2.存储程序；3.由运算器、控制器、存储器、输入设备和输出设备五部分组成。\\"存储程序\\"的含义：将程序和数据事先存入存储器，计算机工作时能自动从存储器取出指令并执行，实现自动化处理。这是现代计算机的基本工作方式。"	考查计算机基本原理的理解	\N	medium	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.817797	2025-10-14 14:52:13.817797	1	0	t
518	essay	数学	二年级	请解释乘法和加法的关系。	\N	"乘法是相同加数的连加，如3×4等于3+3+3+3"	理解乘法的本质	\N	medium	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	1	0	t
519	essay	信息科技	六年级	请解释什么是算法，并举一个简单的例子。	\N	"算法是解决问题的步骤，如计算1到100的和：初始化和为0，从1到100依次相加"	理解算法概念	\N	medium	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	1	0	t
520	essay	数学	四年级	请解释小数和分数的关系。	\N	"小数和分数都是表示部分数量的方法，可以相互转换"	理解小数和分数的联系	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	1	0	t
521	essay	数学	七年级	请解释有理数的运算顺序。	\N	"先算乘方，再算乘除，最后算加减；同级运算从左到右；有括号先算括号内"	理解运算顺序	\N	medium	L4	5	{}	{}	\N	60	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	1	0	t
522	essay	数学	六年级	请解释比例的基本性质。	\N	"在一个比例中，两个外项的积等于两个内项的积"	理解比例的基本性质	\N	medium	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	1	0	t
523	essay	信息科技	七年级	请说明Python中列表和字符串的区别。	\N	"列表可以包含多种类型的元素且可修改，字符串只包含字符且不可修改"	理解数据类型	\N	medium	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	1	0	t
524	essay	数学	九年级	请说明二次函数的顶点式与一般式的转换方法。	\N	"通过配方法可以将一般式y=ax²+bx+c转换为顶点式y=a(x-h)²+k"	理解二次函数的不同表示形式	\N	hard	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	1	0	t
525	essay	信息科技	五年级	请说明什么是循环，并举例说明。	\N	"循环是重复执行某段代码，如让角色重复移动10步"	理解循环概念	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	1	0	t
526	essay	信息科技	七年级	请说明什么是计算机病毒，并列举三种预防计算机病毒的方法。	\N	"计算机病毒是一种人为编制的、能够自我复制并破坏计算机功能或数据的程序。预防方法：1.安装正版杀毒软件并定期更新；2.不随意打开来历不明的邮件和文件；3.不使用来历不明的U盘和光盘；4.定期备份重要数据；5.及时更新操作系统补丁。"	考查网络安全意识和防护措施	\N	easy	\N	5	{}	{}	\N	1	2025-10-14 14:52:13.814946	2025-10-14 14:52:13.814946	1	0	t
527	essay	信息科技	八年级	请说明什么是递归，并举例说明。	\N	"递归是函数调用自己，如计算阶乘：n! = n × (n-1)!"	理解递归概念	\N	hard	L6	5	{}	{}	\N	60	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	1	0	t
528	essay	信息科技	九年级	请说明前端开发和后端开发的区别。	\N	"前端负责用户界面和交互，后端负责数据处理和业务逻辑"	理解前后端概念	\N	medium	L7	5	{}	{}	\N	60	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	1	0	t
529	essay	信息科技	四年级	请说明如何创建和管理文件夹。	\N	"右键点击空白处，选择新建文件夹，输入名称；可以通过拖拽来移动文件"	了解文件管理	\N	medium	L2	5	{}	{}	\N	58	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	1	0	t
530	essay	数学	三年级	请说明如何判断一个数是质数还是合数。	\N	"质数只有1和它本身两个因数，合数除了1和它本身外还有其他因数"	理解质数和合数的概念	\N	medium	L3	5	{}	{}	\N	58	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	1	0	t
531	essay	数学	八年级	请说明如何因式分解一个二次三项式。	\N	"找出两个数，它们的和等于一次项系数，积等于常数项，然后用十字相乘法分解"	理解因式分解的方法	\N	hard	L5	5	{}	{}	\N	60	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	1	0	t
532	essay	数学	五年级	请说明如何计算组合图形的面积。	\N	"将组合图形分解成基本图形，分别计算面积后相加或相减"	理解组合图形面积的计算方法	\N	hard	L4	5	{}	{}	\N	58	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	1	0	t
533	essay	信息科技	三年级	请说明计算机在我们生活中的应用。	\N	"计算机用于学习、娱乐、通信、工作等多个方面"	了解计算机的应用	\N	easy	L1	5	{}	{}	\N	58	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	1	0	t
534	true_false	数学	七年级	负数乘以负数等于正数。	{"A": "正确", "B": "错误"}	"A"	负负得正	\N	easy	L3	5	{}	{}	\N	60	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	1	0	t
535	true_false	数学	六年级	负数都小于0。	null	true	\N	\N	easy	L3	5	{负数概念,数的认识}	{正负数,数的大小}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
536	matching	数学	六年级	连线匹配：公式与图形（V=πr²h→圆柱，V=(1/3)πr²h→圆锥，V=abc→长方体）	null	"圆柱-πr²h,圆锥-(1/3)πr²h,长方体-abc"	\N	\N	hard	L3	10	{体积公式,立体图形}	{立体图形体积,公式配对}	\N	9	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	1	0	t
537	matching	数学	八年级	连线匹配：函数与图像（一次函数→直线，二次函数→抛物线，反比例函数→双曲线）	null	"一次函数-直线,二次函数-抛物线,反比例函数-双曲线"	\N	\N	hard	L4	10	{函数图像,函数识别}	{函数,图像特征}	\N	9	2025-10-30 10:52:26.289571	2025-10-30 10:52:26.289571	1	0	t
538	matching	数学	五年级	连线匹配：分数、小数、百分数（1/2=0.5=50%，1/4=0.25=25%）	null	"1/2-0.5-50%,1/4-0.25-25%,3/4-0.75-75%"	\N	\N	hard	L3	10	{数的转换,等量关系}	{分数小数百分数,数的互化}	\N	9	2025-10-30 10:52:26.285999	2025-10-30 10:52:26.285999	1	0	t
539	matching	数学	三年级	连线匹配：分数与图形（1/2对应一半，1/4对应四分之一）	null	"1/2-一半,1/4-四分之一,3/4-四分之三"	\N	\N	medium	L2	10	{分数认知,图形分割}	{分数初步,分数表示}	\N	9	2025-10-30 10:52:26.283166	2025-10-30 10:52:26.283166	1	0	t
540	matching	数学	四年级	连线匹配：单位换算（1米=100厘米，1千克=1000克，1小时=60分钟）	null	"1米-100厘米,1千克-1000克,1小时-60分钟"	\N	\N	medium	L2	10	{单位换算,量的测量}	{单位转换,常用单位}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
541	matching	数学	二年级	连线匹配：图形与名称（正方形、长方形、三角形、圆形）	null	"正方形-4条相等的边,长方形-对边相等,三角形-3条边,圆形-圆的"	\N	\N	easy	L1	10	{图形识别,几何认知}	{平面图形,图形特征}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
542	matching	信息科技	七年级	连线匹配：存储单位（1KB=1024B，1MB=1024KB，1GB=1024MB）	null	"1KB-1024B,1MB-1024KB,1GB-1024MB"	\N	\N	medium	L4	10	{存储单位,数据存储}	{存储容量,单位换算}	\N	9	2025-10-30 10:52:26.303086	2025-10-30 10:52:26.303086	1	0	t
543	matching	数学	一年级	连线匹配：数字与数量（1→一个，2→两个，3→三个）	null	"1-一个,2-两个,3-三个"	\N	\N	easy	L1	10	{数字认知,配对能力}	{数的认识,一一对应}	\N	9	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	1	0	t
544	blank	信息科技	三年级	键盘上的__键可以删除光标前面的字符	[]	"Backspace"	Backspace键用于删除光标前的字符	\N	medium	\N	5	{键盘操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
545	true_false	数学	二年级	长方形有4条边，4个角都是直角。	null	true	\N	\N	easy	L1	5	{图形认知,几何知识}	{平面图形,长方形}	\N	9	2025-10-30 10:52:26.281163	2025-10-30 10:52:26.281163	1	0	t
546	blank	数学	四年级	长方形的面积公式是：面积 = 长 × ( )	null	"宽"	\N	\N	easy	L2	5	{面积公式,几何知识}	{长方形面积,公式记忆}	\N	9	2025-10-30 10:52:26.284152	2025-10-30 10:52:26.284152	1	0	t
547	single	信息科技	三年级	鼠标的左键通常用来做什么？	["删除", "选择和确认", "复制", "取消"]	"B"	左键主要用于选择和确认操作	\N	easy	\N	5	{硬件操作}	{}	\N	1	2025-11-05 14:47:02.963596	2025-11-05 14:47:02.963596	1	0	t
550	single	Math	Grade3	Test question 1763787992	"[\\"A\\",\\"B\\",\\"C\\",\\"D\\"]"	"A"	\N	\N	easy	L1	5	{}	{}	\N	9	2025-11-22 05:06:32.105928	2025-11-22 05:06:32.105928	1	0	t
551	single	数学	二年级	1+2 =？	["3", "4", "5", "6"]	"A"	测试	\N	easy	L1	5	{abstract_thinking}	{math_number_operations}	{测试}	39	2025-11-22 13:21:54.071457	2025-11-22 13:21:54.071457	0	0	t
552	single	语文	一年级	【API测试-1763826575167】下列哪个字的读音是正确的？	["选项A", "选项B", "选项C", "选项D"]	["A"]	测试解析	\N	easy	L1	5	{}	{}	\N	163	2025-11-22 15:49:35.172952	2025-11-22 15:49:35.172952	0	0	t
553	single	语文	一年级	【API测试-1763826619880】下列哪个字的读音是正确的？	["选项A", "选项B", "选项C", "选项D"]	["A"]	测试解析	\N	easy	L1	5	{}	{}	\N	163	2025-11-22 15:50:19.883485	2025-11-22 15:50:19.883485	0	0	t
554	single	语文	一年级	【API测试-1763826664319】下列哪个字的读音是正确的？	["选项A", "选项B", "选项C", "选项D"]	["A"]	测试解析	\N	easy	L1	5	{}	{}	\N	163	2025-11-22 15:51:04.323745	2025-11-22 15:51:04.323745	0	0	t
555	single	语文	一年级	【API测试-1763828082024】下列哪个字的读音是正确的？	["选项A", "选项B", "选项C", "选项D"]	["A"]	测试解析	\N	easy	L1	5	{}	{}	\N	163	2025-11-22 16:14:42.029299	2025-11-22 16:14:42.029299	0	0	t
556	single	语文	一年级	【API测试-1763828105783】下列哪个字的读音是正确的？	["选项A", "选项B", "选项C", "选项D"]	["A"]	测试解析	\N	easy	L1	5	{}	{}	\N	163	2025-11-22 16:15:05.787938	2025-11-22 16:15:05.787938	0	0	t
557	single	语文	一年级	【API测试-1763828135335】下列哪个字的读音是正确的？	["选项A", "选项B", "选项C", "选项D"]	["A"]	测试解析	\N	easy	L1	5	{}	{}	\N	163	2025-11-22 16:15:35.339727	2025-11-22 16:15:35.339727	0	0	t
629	single	数学	三年级	计算：25 + 38 = ?	["55", "63", "73", "65"]	"B"	25 + 38 = 63，先计算个位，再计算十位	\N	easy	L2	5	{运算能力,数感}	{两位数加法,进位加法}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
630	single	数学	三年级	计算：82 - 47 = ?	["35", "45", "25", "55"]	"A"	82 - 47 = 35，需要借位	\N	easy	L2	5	{运算能力,数感}	{两位数减法,退位减法}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
631	single	数学	三年级	计算：6 × 7 = ?	["40", "42", "44", "46"]	"B"	6 × 7 = 42，背诵乘法口诀表	\N	medium	L3	5	{运算能力,记忆能力}	{乘法口诀,乘法运算}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
632	single	数学	三年级	计算：56 ÷ 8 = ?	["6", "7", "8", "9"]	"B"	56 ÷ 8 = 7，因为 8 × 7 = 56	\N	medium	L3	5	{运算能力,逻辑推理}	{除法运算,乘除法关系}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
633	single	数学	三年级	小明有35个苹果，小红有的苹果是小明的2倍，小红有多少个苹果？	["60", "65", "70", "75"]	"C"	小红的苹果 = 35 × 2 = 70个	\N	hard	L4	10	{问题解决,逻辑推理,运算能力}	{乘法应用,倍数关系,应用题}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
634	single	语文	三年级	下列词语中，拼音标注正确的是：	["蝴蝶（hú dié）", "困难（kùn nán）", "美丽（mēi lì）", "朋友（péng yǒu）"]	"D"	"朋友"的正确拼音是péng yǒu	\N	easy	L1	5	{语言基础,识字能力}	{拼音,词语读音}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
635	single	语文	三年级	"欣欣向荣"的意思是：	["非常高兴", "蓬勃发展", "向前生长", "欣赏美景"]	"B"	"欣欣向荣"形容草木茂盛，比喻事业蓬勃发展	\N	medium	L2	5	{理解能力,词汇积累}	{成语理解,词语含义}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
636	essay	语文	三年级	阅读下面的短文，回答问题：\\n\\n春天来了，小草从地下钻出来了，树木抽出了新的枝条，长出了嫩绿的叶子。花园里，各种各样的花都开了，有红的、黄的、白的、紫的，美丽极了。\\n\\n问题：春天来了，大自然有哪些变化？	\N	"小草钻出来了，树木长出新枝条和嫩叶，各种花都开了"	答案应包含：小草、树木、花朵等自然景物的变化	\N	medium	L3	10	{阅读理解,概括能力,语言表达}	{阅读理解,归纳概括,自然景物描写}	\N	2	2025-11-23 18:54:53.76018	2025-11-23 18:54:53.76018	0	0	t
\.


--
-- Data for Name: question_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_reviews (id, question_id, reviewer_id, status, comment, reviewed_at, created_at) FROM stdin;
1	198	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.616221	2025-10-21 05:04:17.616221
8	226	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 11:18:43.469591	2025-10-21 11:18:43.469591
9	231	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 12:20:17.979013	2025-10-21 12:20:17.979013
11	474	1	approved	集成测试 - 批准	2025-11-04 06:35:48.390979	2025-11-04 06:35:48.390979
12	718	1	approved	集成测试 - 批准	2025-11-08 13:23:17.039508	2025-11-08 13:23:17.039508
13	1173	163	approved	通过	2025-11-21 16:11:20.017014	2025-11-21 16:11:20.017014
14	1161	163	approved		2025-11-23 09:46:46.517076	2025-11-23 09:46:46.517076
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (id, exam_id, type, content, options, correct_answer, score, order_no, difficulty, explanation, created_at) FROM stdin;
\.


--
-- Data for Name: registration_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registration_audit_log (id, request_id, action, action_by, action_level, comment, metadata, created_at) FROM stdin;
2	2	submitted	\N	0	学生API测试学生提交注册申请	{"phone": "13981700442", "school": "云岩区第一小学"}	2025-10-27 16:15:00.570394
3	3	submitted	\N	0	学生API测试学生提交注册申请	{"phone": "13981919889", "school": "云岩区第一小学"}	2025-10-27 16:18:40.085541
4	4	submitted	\N	0	学生API测试学生提交注册申请	{"phone": "13981967128", "school": "云岩区第一小学"}	2025-10-27 16:19:27.407716
5	5	submitted	\N	0	学生API测试学生提交注册申请	{"phone": "13982043570", "school": "云岩区第一小学"}	2025-10-27 16:20:43.82607
6	6	submitted	\N	0	学生涂好提交注册申请	{"phone": "18123708147", "school": "云岩区第一小学"}	2025-10-27 17:28:57.531965
7	7	submitted	\N	0	学生测试学生0858提交注册申请	{"phone": "13924460858", "school": "贵阳市第二小学"}	2025-10-30 11:41:00.951559
8	8	submitted	\N	0	学生测试学生B1080提交注册申请	{"phone": "13824461080", "school": "贵阳市第二小学"}	2025-10-30 11:41:01.090385
9	8	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 11:41:01.095678
10	9	submitted	\N	0	学生测试学生4023提交注册申请	{"phone": "13924564023", "school": "贵阳市第二小学"}	2025-10-30 11:42:44.138741
11	9	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 111, "initialPassword": "(hidden)"}	2025-10-30 11:42:44.159572
12	10	submitted	\N	0	学生测试学生B4224提交注册申请	{"phone": "13824564224", "school": "贵阳市第二小学"}	2025-10-30 11:42:44.233174
13	10	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 11:42:44.237229
14	11	submitted	\N	0	学生测试学生7294提交注册申请	{"phone": "13924647294", "school": "贵阳市第二小学"}	2025-10-30 11:44:07.382325
15	11	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 112, "initialPassword": "(hidden)"}	2025-10-30 11:44:07.400894
16	12	submitted	\N	0	学生测试学生B7601提交注册申请	{"phone": "13824647601", "school": "贵阳市第二小学"}	2025-10-30 11:44:07.610434
17	12	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 11:44:07.614649
18	13	submitted	\N	0	学生测试学生0844提交注册申请	{"phone": "13924730844", "school": "贵阳市第二小学"}	2025-10-30 11:45:30.935725
19	13	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 113, "initialPassword": "(hidden)"}	2025-10-30 11:45:30.953362
20	14	submitted	\N	0	学生测试学生B1149提交注册申请	{"phone": "13824731149", "school": "贵阳市第二小学"}	2025-10-30 11:45:31.159025
21	14	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 11:45:31.162877
22	15	submitted	\N	0	学生另一个学生提交注册申请	{"phone": "13925876257", "school": "贵阳市第二小学"}	2025-10-30 12:04:41.940235
23	16	submitted	\N	0	学生E2E测试学生6250提交注册申请	{"phone": "13925876250", "school": "贵阳市第二小学"}	2025-10-30 12:04:42.873164
24	17	submitted	\N	0	学生E2E测试学生0879提交注册申请	{"phone": "13926070879", "school": "贵阳市第二小学"}	2025-10-30 12:07:59.203529
25	18	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13926223559", "school": "贵阳市第二小学"}	2025-10-30 12:10:28.671438
26	19	submitted	\N	0	学生E2E测试学生5273提交注册申请	{"phone": "13926285273", "school": "贵阳市第二小学"}	2025-10-30 12:11:33.517796
27	20	submitted	\N	0	学生E2E测试学生3245提交注册申请	{"phone": "13926353245", "school": "贵阳市第二小学"}	2025-10-30 12:12:41.550219
28	21	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13926499312", "school": "贵阳市第二小学"}	2025-10-30 12:15:04.336624
29	22	submitted	\N	0	学生测试学生9331提交注册申请	{"phone": "13927189331", "school": "贵阳市第二小学"}	2025-10-30 12:26:29.417319
30	22	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 114, "initialPassword": "(hidden)"}	2025-10-30 12:26:29.439463
31	23	submitted	\N	0	学生测试学生B9643提交注册申请	{"phone": "13827189643", "school": "贵阳市第二小学"}	2025-10-30 12:26:29.655852
32	23	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 12:26:29.666953
33	24	submitted	\N	0	学生测试学生6950提交注册申请	{"phone": "13927226950", "school": "贵阳市第二小学"}	2025-10-30 12:27:07.048588
34	24	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 115, "initialPassword": "(hidden)"}	2025-10-30 12:27:07.068119
35	25	submitted	\N	0	学生测试学生B7270提交注册申请	{"phone": "13827227270", "school": "贵阳市第二小学"}	2025-10-30 12:27:07.281423
36	25	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 12:27:07.289392
37	26	submitted	\N	0	学生测试学生4180提交注册申请	{"phone": "13927294180", "school": "贵阳市第二小学"}	2025-10-30 12:28:14.259276
38	26	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 116, "initialPassword": "(hidden)"}	2025-10-30 12:28:14.278522
39	27	submitted	\N	0	学生测试学生B4480提交注册申请	{"phone": "13827294480", "school": "贵阳市第二小学"}	2025-10-30 12:28:14.492669
40	27	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 12:28:14.502858
41	28	submitted	\N	0	学生测试学生6857提交注册申请	{"phone": "13927326857", "school": "贵阳市第二小学"}	2025-10-30 12:28:47.037431
42	28	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 117, "initialPassword": "(hidden)"}	2025-10-30 12:28:47.056474
43	29	submitted	\N	0	学生测试学生B7260提交注册申请	{"phone": "13827327260", "school": "贵阳市第二小学"}	2025-10-30 12:28:47.271437
44	29	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 12:28:47.281221
51	33	submitted	\N	0	学生测试学生B3874提交注册申请	{"phone": "13828393874", "school": "贵阳市第二小学"}	2025-10-30 12:46:33.887675
52	33	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 12:46:33.896773
55	35	submitted	\N	0	学生测试学生B6032提交注册申请	{"phone": "13828446032", "school": "贵阳市第二小学"}	2025-10-30 12:47:26.043555
56	35	rejected	\N	2	学生信息不完整，拒绝注册	\N	2025-10-30 12:47:26.052298
57	36	submitted	\N	0	学生E2E测试学生4528提交注册申请	{"phone": "13929084528", "school": "贵阳市第二小学"}	2025-10-30 12:58:12.869441
58	37	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13929230711", "school": "贵阳市第二小学"}	2025-10-30 13:00:35.547439
59	38	submitted	\N	0	学生E2E测试学生8993提交注册申请	{"phone": "13933148993", "school": "贵阳市第二小学"}	2025-10-30 14:05:57.216663
60	39	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13933234545", "school": "贵阳市第二小学"}	2025-10-30 14:07:19.34963
61	40	submitted	\N	0	学生E2E测试学生0484提交注册申请	{"phone": "13933990484", "school": "贵阳市第二小学"}	2025-10-30 14:19:58.618237
62	41	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13934049755", "school": "贵阳市第二小学"}	2025-10-30 14:20:54.588707
63	42	submitted	\N	0	学生E2E测试学生7410提交注册申请	{"phone": "13937667410", "school": "贵阳市第二小学"}	2025-10-30 15:21:15.590711
64	43	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13937765760", "school": "贵阳市第二小学"}	2025-10-30 15:22:50.609974
65	44	submitted	\N	0	学生E2E测试学生2541提交注册申请	{"phone": "13938102541", "school": "贵阳市第二小学"}	2025-10-30 15:28:30.600687
66	45	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13938161801", "school": "贵阳市第二小学"}	2025-10-30 15:29:26.613259
67	46	submitted	\N	0	学生E2E测试学生7539提交注册申请	{"phone": "13939187539", "school": "贵阳市第二小学"}	2025-10-30 15:46:35.661439
68	47	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13939242083", "school": "贵阳市第二小学"}	2025-10-30 15:47:26.931906
69	48	submitted	\N	0	学生E2E测试学生1532提交注册申请	{"phone": "13939521532", "school": "贵阳市第二小学"}	2025-10-30 15:52:09.596161
70	49	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13939576238", "school": "贵阳市第二小学"}	2025-10-30 15:53:01.107303
72	50	submitted	\N	0	学生E2E测试学生2660提交注册申请	{"phone": "13940932660", "school": "贵阳市第二小学"}	2025-10-30 16:15:40.877739
73	51	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13940987616", "school": "贵阳市第二小学"}	2025-10-30 16:16:32.419761
74	52	submitted	\N	0	学生E2E测试学生7812提交注册申请	{"phone": "13943477812", "school": "贵阳市第二小学"}	2025-10-30 16:58:05.967602
75	53	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13943535740", "school": "贵阳市第二小学"}	2025-10-30 16:59:00.558952
76	2	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-10-30 17:00:00.178358
77	3	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-10-30 17:00:00.184481
78	4	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-10-30 17:00:00.188156
79	5	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-10-30 17:00:00.189993
81	6	rejected	\N	2	测试	\N	2025-10-30 17:15:16.451018
84	55	submitted	\N	0	学生首次注册学生提交注册申请	{"phone": "13944883572", "school": "贵阳市第二小学"}	2025-10-30 17:21:28.438427
85	56	submitted	\N	0	学生E2E测试学生1971提交注册申请	{"phone": "13946061971", "school": "贵阳市第二小学"}	2025-10-30 17:41:07.89015
86	56	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 137, "initialPassword": "(hidden)"}	2025-10-30 17:41:20.846127
87	57	submitted	\N	0	学生E2E测试学生9680提交注册申请	{"phone": "13946249680", "school": "贵阳市第二小学"}	2025-10-30 17:44:15.483021
88	57	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 138, "initialPassword": "(hidden)"}	2025-10-30 17:44:28.690077
89	58	submitted	\N	0	学生E2E测试学生2562提交注册申请	{"phone": "13946802562", "school": "贵阳市第二小学"}	2025-10-30 17:53:28.41293
90	58	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 139, "initialPassword": "(hidden)"}	2025-10-30 17:53:41.549463
91	59	submitted	\N	0	学生E2E测试学生1921提交注册申请	{"phone": "13947171921", "school": "贵阳市第二小学"}	2025-10-30 17:59:37.715561
92	59	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 140, "initialPassword": "(hidden)"}	2025-10-30 17:59:50.573758
93	60	submitted	\N	0	学生E2E测试学生0455提交注册申请	{"phone": "13947210455", "school": "贵阳市第二小学"}	2025-10-30 18:00:16.26233
94	60	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 141, "initialPassword": "(hidden)"}	2025-10-30 18:00:29.071647
95	61	submitted	\N	0	学生E2E测试学生9550提交注册申请	{"phone": "13947439550", "school": "贵阳市第二小学"}	2025-10-30 18:04:05.330043
96	61	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 142, "initialPassword": "(hidden)"}	2025-10-30 18:04:18.070401
97	62	submitted	\N	0	学生E2E测试学生0976提交注册申请	{"phone": "13947630976", "school": "贵阳市第二小学"}	2025-10-30 18:07:16.783209
98	62	approved	\N	2	学生信息核验无误，批准注册	{"studentUserId": 143, "initialPassword": "(hidden)"}	2025-10-30 18:07:29.588739
101	7	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 12:00:00.884667
102	15	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.800824
103	16	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.8058
104	17	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.808159
105	18	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.810361
106	19	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.812114
107	20	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.813855
108	21	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.815674
109	36	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 13:00:00.817675
110	37	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 14:00:00.809434
111	38	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 15:00:00.905054
112	39	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 15:00:00.909946
113	40	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 15:00:00.911796
114	41	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 15:00:00.913436
115	42	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.058294
116	43	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.067557
117	44	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.071596
118	45	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.076507
119	46	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.080322
120	47	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.084135
121	48	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.088358
122	49	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 16:00:00.092355
123	50	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 17:00:00.078406
124	51	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 17:00:00.283216
125	52	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 17:00:00.288672
126	53	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 17:00:00.294686
127	2	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-02 18:00:00.136121
128	3	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-02 18:00:00.154144
129	4	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-02 18:00:00.156476
130	5	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-02 18:00:00.1584
131	55	auto_escalated	\N	0	超过3天未审核，自动从校级管理员升级到区县级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 3, "from_level": 2}	2025-11-02 18:00:00.160139
132	7	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 13:00:00.822798
133	15	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 13:00:00.889188
134	16	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 13:00:00.891134
135	17	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 13:00:00.892927
136	18	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 13:00:00.894772
137	19	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 14:00:00.78542
138	20	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 14:00:00.789117
139	21	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 14:00:00.791066
140	36	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 14:00:00.792854
141	37	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 15:00:00.849702
142	38	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.461327
143	39	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.709213
144	40	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.718318
145	41	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.722976
146	42	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.72758
147	43	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.731408
148	44	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.735275
149	45	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.739227
150	46	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.742923
151	47	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.746917
152	48	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.7511
153	49	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 16:00:00.755328
154	50	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 17:00:00.375548
155	51	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 17:00:00.452043
156	52	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 17:00:00.454704
157	53	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 17:00:00.457378
158	55	auto_escalated	\N	0	超过3天未审核，自动从区县级管理员升级到市级管理员	{"auto": true, "reason": "3天未处理自动升级", "to_level": 4, "from_level": 3}	2025-11-05 18:00:00.592329
159	2	approved	\N	4	注册申请已批准，学生账号已创建	{"studentUserId": 170, "initialPassword": "(hidden)"}	2025-11-07 13:56:33.792637
160	3	approved	\N	4	注册申请已批准，学生账号已创建	{"studentUserId": 171, "initialPassword": "(hidden)"}	2025-11-07 13:56:40.159383
161	37	rejected	\N	4	test	\N	2025-11-07 14:02:43.711228
162	4	approved	\N	4	注册申请已批准，学生账号已创建	{"studentUserId": 172, "initialPassword": "(hidden)"}	2025-11-26 14:09:57.106441
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (version, description, applied_at) FROM stdin;
011	Populate reviewer data for historical questions	2025-11-05 15:59:02.67016
012	Cleanup deprecated question_bank_review permissions	2025-11-05 16:13:54.921559
\.


--
-- Data for Name: school_ability_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.school_ability_stats (id, school_id, ability, subject, student_count, total_attempts, correct_count, accuracy_rate, avg_score, period_start, period_end, last_updated_at) FROM stdin;
\.


--
-- Data for Name: schools; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schools (id, name, code, district_id, district, address, contact_person, contact_phone, type, created_at) FROM stdin;
1	贵阳市第一小学	GY001	1	云岩区	贵阳市云岩区中华北路123号	李主任	0851-12345678	regular	2025-09-24 15:09:18.51222
2	贵阳市第二小学	GY002	2	南明区	贵阳市南明区解放路456号	王校长	0851-87654321	regular	2025-09-24 15:09:18.51222
3	贵阳市实验小学	GY003	3	观山湖区	贵阳市观山湖区金阳街道789号	张老师	0851-11223344	municipal	2025-09-24 15:09:18.51222
4	贵阳市第三小学	GY004	4	白云区	贵阳市白云区白云路100号	陈校长	0851-22334455	regular	2025-09-24 15:09:18.51222
5	贵阳市信息技术基地校	GY005	3	观山湖区	贵阳市观山湖区数博大道999号	刘校长	0851-33445566	base	2025-09-24 15:09:18.51222
6	云岩区第一小学	YY-PS-01	1	云岩区	贵阳市云岩区	\N	\N	regular	2025-10-27 15:27:01.188416
7	云岩区第一中学	YY-MS-01	1	云岩区	贵阳市云岩区	\N	\N	regular	2025-10-27 15:27:01.188416
8	云岩区第一高中	YY-HS-01	1	云岩区	贵阳市云岩区	\N	\N	regular	2025-10-27 15:27:01.188416
9	南明区第一小学	NM-PS-01	2	南明区	贵阳市南明区	\N	\N	regular	2025-10-27 15:27:01.188416
10	南明区第一中学	NM-MS-01	2	南明区	贵阳市南明区	\N	\N	regular	2025-10-27 15:27:01.188416
11	南明区第一高中	NM-HS-01	2	南明区	贵阳市南明区	\N	\N	regular	2025-10-27 15:27:01.188416
12	观山湖区第一小学	GSH-PS-01	3	观山湖区	贵阳市观山湖区	\N	\N	regular	2025-10-27 15:27:01.188416
13	观山湖区第一中学	GSH-MS-01	3	观山湖区	贵阳市观山湖区	\N	\N	regular	2025-10-27 15:27:01.188416
14	观山湖区第一高中	GSH-HS-01	3	观山湖区	贵阳市观山湖区	\N	\N	regular	2025-10-27 15:27:01.188416
15	白云区第一小学	BY-PS-01	4	白云区	贵阳市白云区	\N	\N	regular	2025-10-27 15:27:01.188416
16	白云区第一中学	BY-MS-01	4	白云区	贵阳市白云区	\N	\N	regular	2025-10-27 15:27:01.188416
17	白云区第一高中	BY-HS-01	4	白云区	贵阳市白云区	\N	\N	regular	2025-10-27 15:27:01.188416
18	花溪区第一小学	HX-PS-01	5	花溪区	贵阳市花溪区	\N	\N	regular	2025-10-27 15:27:01.188416
19	花溪区第一中学	HX-MS-01	5	花溪区	贵阳市花溪区	\N	\N	regular	2025-10-27 15:27:01.188416
20	花溪区第一高中	HX-HS-01	5	花溪区	贵阳市花溪区	\N	\N	regular	2025-10-27 15:27:01.188416
21	乌当区第一小学	WD-PS-01	6	乌当区	贵阳市乌当区	\N	\N	regular	2025-10-27 15:27:01.188416
22	乌当区第一中学	WD-MS-01	6	乌当区	贵阳市乌当区	\N	\N	regular	2025-10-27 15:27:01.188416
23	乌当区第一高中	WD-HS-01	6	乌当区	贵阳市乌当区	\N	\N	regular	2025-10-27 15:27:01.188416
24	清镇市第一小学	QZ-PS-01	8	清镇市	贵阳市清镇市	\N	\N	regular	2025-10-27 15:27:01.188416
25	清镇市第一中学	QZ-MS-01	8	清镇市	贵阳市清镇市	\N	\N	regular	2025-10-27 15:27:01.188416
26	清镇市第一高中	QZ-HS-01	8	清镇市	贵阳市清镇市	\N	\N	regular	2025-10-27 15:27:01.188416
27	修文县第一小学	XW-PS-01	9	修文县	贵阳市修文县	\N	\N	regular	2025-10-27 15:27:01.188416
28	修文县第一中学	XW-MS-01	9	修文县	贵阳市修文县	\N	\N	regular	2025-10-27 15:27:01.188416
29	修文县第一高中	XW-HS-01	9	修文县	贵阳市修文县	\N	\N	regular	2025-10-27 15:27:01.188416
30	息烽县第一小学	XF-PS-01	10	息烽县	贵阳市息烽县	\N	\N	regular	2025-10-27 15:27:01.188416
31	息烽县第一中学	XF-MS-01	10	息烽县	贵阳市息烽县	\N	\N	regular	2025-10-27 15:27:01.188416
32	息烽县第一高中	XF-HS-01	10	息烽县	贵阳市息烽县	\N	\N	regular	2025-10-27 15:27:01.188416
33	开阳县第一小学	KY-PS-01	11	开阳县	贵阳市开阳县	\N	\N	regular	2025-10-27 15:27:01.188416
34	开阳县第一中学	KY-MS-01	11	开阳县	贵阳市开阳县	\N	\N	regular	2025-10-27 15:27:01.188416
35	开阳县第一高中	KY-HS-01	11	开阳县	贵阳市开阳县	\N	\N	regular	2025-10-27 15:27:01.188416
36	贵安新区第一小学	GAXQ-PS-01	12	贵安新区	贵安新区	\N	\N	regular	2025-10-27 15:27:01.188416
37	贵安新区第一中学	GAXQ-MS-01	12	贵安新区	贵安新区	\N	\N	regular	2025-10-27 15:27:01.188416
38	贵安新区第一高中	GAXQ-HS-01	12	贵安新区	贵安新区	\N	\N	regular	2025-10-27 15:27:01.188416
39	贵阳市直属第一小学	GYSZSX-PS-01	13	贵阳市直属学校	贵阳市	\N	\N	municipal	2025-10-27 15:27:01.188416
40	贵阳市直属第一中学	GYSZSX-MS-01	13	贵阳市直属学校	贵阳市	\N	\N	municipal	2025-10-27 15:27:01.188416
41	贵阳市直属第一高中	GYSZSX-HS-01	13	贵阳市直属学校	贵阳市	\N	\N	municipal	2025-10-27 15:27:01.188416
\.


--
-- Data for Name: student_ability_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_ability_stats (id, student_id, ability, subject, total_questions, correct_count, accuracy_rate, avg_score, last_updated_at) FROM stdin;
2	3	数感	数学	2	2	100.00	7.00	2025-11-23 19:02:44.898462
6	3	记忆能力	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
9	3	问题解决	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
8	3	逻辑推理	数学	2	2	100.00	7.00	2025-11-23 19:02:44.898462
1	3	运算能力	数学	5	5	100.00	7.00	2025-11-23 19:02:44.898462
13	4	数感	数学	2	1	50.00	3.50	2025-11-23 19:02:44.898462
17	4	记忆能力	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
20	4	问题解决	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
19	4	逻辑推理	数学	2	2	100.00	7.00	2025-11-23 19:02:44.898462
12	4	运算能力	数学	5	4	80.00	5.60	2025-11-23 19:02:44.898462
24	5	数感	数学	2	2	100.00	7.00	2025-11-23 19:02:44.898462
28	5	记忆能力	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
31	5	问题解决	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
30	5	逻辑推理	数学	2	1	50.00	3.50	2025-11-23 19:02:44.898462
23	5	运算能力	数学	5	3	60.00	4.20	2025-11-23 19:02:44.898462
35	6	数感	数学	2	2	100.00	7.00	2025-11-23 19:02:44.898462
39	6	记忆能力	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
42	6	问题解决	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
41	6	逻辑推理	数学	2	1	50.00	3.50	2025-11-23 19:02:44.898462
34	6	运算能力	数学	5	4	80.00	5.60	2025-11-23 19:02:44.898462
46	7	数感	数学	2	1	50.00	3.50	2025-11-23 19:02:44.898462
50	7	记忆能力	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
53	7	问题解决	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
52	7	逻辑推理	数学	2	1	50.00	3.50	2025-11-23 19:02:44.898462
45	7	运算能力	数学	5	3	60.00	4.20	2025-11-23 19:02:44.898462
56	3	语言基础	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
57	3	识字能力	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
58	3	理解能力	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
59	3	词汇积累	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
60	3	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
61	3	概括能力	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
62	3	语言表达	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
63	4	语言基础	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
64	4	识字能力	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
65	4	理解能力	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
66	4	词汇积累	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
67	4	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
68	4	概括能力	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
69	4	语言表达	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
70	5	语言基础	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
71	5	识字能力	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
72	5	理解能力	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
73	5	词汇积累	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
74	5	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
75	5	概括能力	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
76	5	语言表达	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
77	6	语言基础	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
78	6	识字能力	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
79	6	理解能力	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
80	6	词汇积累	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
81	6	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
82	6	概括能力	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
83	6	语言表达	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
84	7	语言基础	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
85	7	识字能力	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
86	7	理解能力	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
87	7	词汇积累	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
88	7	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
89	7	概括能力	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
90	7	语言表达	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
\.


--
-- Data for Name: student_achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_achievements (id, student_id, achievement_id, achieved_at, points_awarded, is_displayed, display_order, times_achieved) FROM stdin;
10	1	34	2025-11-14 12:47:55.45797	0	t	0	1
15	1	72	2025-11-20 13:25:36.097218	10	t	0	1
16	1	73	2025-11-20 14:25:36.097218	50	t	0	1
17	1	74	2025-11-20 15:25:36.097218	100	t	0	1
\.


--
-- Data for Name: student_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_activities (id, student_id, activity_id, session_id, status, start_time, submit_time, score, rank, ip_address, created_at, attempt_number, is_retake, previous_attempt_id, started_at, time_limit_deadline, grading_status) FROM stdin;
122	173	297	\N	submitted	2025-11-30 10:33:22.17258	2025-11-30 11:52:10.828546	\N	\N	172.18.0.1	2025-11-30 10:33:22.17258	1	f	\N	2025-11-30 10:33:22.17258	\N	pending
\.


--
-- Data for Name: student_daily_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_daily_tasks (id, student_id, task_id, task_date, is_completed, completed_at, progress_value, target_value, points_awarded) FROM stdin;
\.


--
-- Data for Name: student_knowledge_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_knowledge_stats (id, student_id, knowledge_point, subject, total_questions, correct_count, accuracy_rate, avg_score, last_updated_at) FROM stdin;
1	3	两位数加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
2	3	进位加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
3	3	两位数减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
4	3	退位减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
5	3	乘法口诀	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
6	3	乘法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
7	3	除法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
8	3	乘除法关系	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
9	3	乘法应用	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
10	3	倍数关系	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
11	3	应用题	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
12	4	两位数加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
13	4	进位加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
14	4	两位数减法	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
15	4	退位减法	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
16	4	乘法口诀	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
17	4	乘法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
18	4	除法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
19	4	乘除法关系	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
20	4	乘法应用	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
21	4	倍数关系	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
22	4	应用题	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
23	5	两位数加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
24	5	进位加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
25	5	两位数减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
26	5	退位减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
27	5	乘法口诀	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
28	5	乘法运算	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
29	5	除法运算	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
30	5	乘除法关系	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
31	5	乘法应用	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
32	5	倍数关系	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
33	5	应用题	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
34	6	两位数加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
35	6	进位加法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
36	6	两位数减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
37	6	退位减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
38	6	乘法口诀	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
39	6	乘法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
40	6	除法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
41	6	乘除法关系	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
42	6	乘法应用	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
43	6	倍数关系	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
44	6	应用题	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
45	7	两位数加法	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
46	7	进位加法	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
47	7	两位数减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
48	7	退位减法	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
49	7	乘法口诀	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
50	7	乘法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
51	7	除法运算	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
52	7	乘除法关系	数学	1	1	100.00	7.00	2025-11-23 19:02:44.898462
53	7	乘法应用	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
54	7	倍数关系	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
55	7	应用题	数学	1	0	0.00	0.00	2025-11-23 19:02:44.898462
56	3	拼音	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
57	3	词语读音	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
58	3	成语理解	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
59	3	词语含义	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
60	3	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
61	3	归纳概括	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
62	3	自然景物描写	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
63	4	拼音	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
64	4	词语读音	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
65	4	成语理解	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
66	4	词语含义	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
67	4	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
68	4	归纳概括	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
69	4	自然景物描写	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
70	5	拼音	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
71	5	词语读音	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
72	5	成语理解	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
73	5	词语含义	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
74	5	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
75	5	归纳概括	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
76	5	自然景物描写	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
77	6	拼音	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
78	6	词语读音	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
79	6	成语理解	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
80	6	词语含义	语文	1	1	100.00	7.00	2025-11-23 19:03:21.782821
81	6	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
82	6	归纳概括	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
83	6	自然景物描写	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
84	7	拼音	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
85	7	词语读音	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
86	7	成语理解	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
87	7	词语含义	语文	1	0	0.00	0.00	2025-11-23 19:03:21.782821
88	7	阅读理解	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
89	7	归纳概括	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
90	7	自然景物描写	语文	1	1	100.00	6.00	2025-11-23 19:03:21.782821
\.


--
-- Data for Name: student_login_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_login_history (id, student_id, user_id, login_date, login_time, login_method, ip_address, user_agent, created_at) FROM stdin;
1	1	11	2025-11-14	2025-11-14 14:52:30.159128	username	::ffff:172.18.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; zh-CN) WindowsPowerShell/5.1.26100.7019	2025-11-14 14:52:30.159128
2	1	11	2025-11-17	2025-11-17 07:30:07.64383	username	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-17 07:30:07.64383
38	1	11	2025-11-30	2025-11-30 17:48:06.212123	username	::ffff:172.18.0.1	curl/8.15.0	2025-11-30 15:56:56.332409
3	1	11	2025-11-20	2025-11-20 15:28:46.799019	username	::ffff:172.18.0.1	\N	2025-11-20 11:21:44.177242
13	1	11	2025-11-22	2025-11-22 09:51:35.882229	username	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.7339.186 Safari/537.36	2025-11-22 08:58:31.80023
20	1	11	2025-11-23	2025-11-23 19:18:37.445071	username	::ffff:172.18.0.1	axios/1.12.2	2025-11-23 19:14:48.009977
23	1	11	2025-11-24	2025-11-24 07:09:09.400151	username	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-24 05:02:32.107936
31	1	11	2025-11-26	2025-11-26 14:37:44.105998	username	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.7339.186 Safari/537.36	2025-11-26 04:57:16.04635
34	40	173	2025-11-30	2025-11-30 11:58:51.492984	username	172.18.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-30 10:22:48.6911
\.


--
-- Data for Name: student_points; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_points (student_id, current_points, total_points, spent_points, frozen_points, last_updated) FROM stdin;
2	0	0	0	0	2025-11-09 10:55:06.632449
3	0	0	0	0	2025-11-09 10:55:06.632449
4	0	0	0	0	2025-11-09 10:55:06.632449
5	0	0	0	0	2025-11-09 10:55:06.632449
6	0	0	0	0	2025-11-09 10:55:06.632449
7	0	0	0	0	2025-11-09 10:55:06.632449
8	0	0	0	0	2025-11-09 10:55:06.632449
10	0	0	0	0	2025-11-09 10:55:06.632449
14	0	0	0	0	2025-11-09 10:55:06.632449
15	0	0	0	0	2025-11-09 10:55:06.632449
16	0	0	0	0	2025-11-09 10:55:06.632449
17	0	0	0	0	2025-11-09 10:55:06.632449
18	0	0	0	0	2025-11-09 10:55:06.632449
19	0	0	0	0	2025-11-09 10:55:06.632449
20	0	0	0	0	2025-11-09 10:55:06.632449
21	0	0	0	0	2025-11-09 10:55:06.632449
22	0	0	0	0	2025-11-09 10:55:06.632449
23	0	0	0	0	2025-11-09 10:55:06.632449
24	0	0	0	0	2025-11-09 10:55:06.632449
25	0	0	0	0	2025-11-09 10:55:06.632449
28	0	0	0	0	2025-11-09 10:55:06.632449
29	0	0	0	0	2025-11-09 10:55:06.632449
30	0	0	0	0	2025-11-09 10:55:06.632449
31	0	0	0	0	2025-11-09 10:55:06.632449
32	0	0	0	0	2025-11-09 10:55:06.632449
33	0	0	0	0	2025-11-09 10:55:06.632449
34	0	0	0	0	2025-11-09 10:55:06.632449
1	0	0	0	0	2025-11-09 10:55:06.632449
37	0	0	0	0	2025-11-09 10:55:06.632449
38	0	0	0	0	2025-11-09 10:55:06.632449
\.


--
-- Data for Name: student_registration_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_registration_requests (id, phone, real_name, birth_date, id_card_last4, district_id, district_code, district_name, school_id, school_code, school_name, grade, status, current_reviewer_level, current_reviewer_id, submitted_at, last_escalated_at, reviewed_at, reviewed_by, review_comment, student_user_id, created_at, updated_at) FROM stdin;
8	13824461080	测试学生B1080	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 11:41:01.08908	2025-10-30 11:41:01.08908	2025-10-30 11:41:01.09438	\N	学生信息不完整，拒绝注册	\N	2025-10-30 11:41:01.08908	2025-10-30 11:41:01.09438
9	13924564023	测试学生4023	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 11:42:44.137272	2025-10-30 11:42:44.137272	2025-10-30 11:42:44.159572	\N	学生信息核验无误，批准注册	111	2025-10-30 11:42:44.137272	2025-10-30 11:42:44.159572
10	13824564224	测试学生B4224	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 11:42:44.232096	2025-10-30 11:42:44.232096	2025-10-30 11:42:44.236399	\N	学生信息不完整，拒绝注册	\N	2025-10-30 11:42:44.232096	2025-10-30 11:42:44.236399
11	13924647294	测试学生7294	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 11:44:07.380825	2025-10-30 11:44:07.380825	2025-10-30 11:44:07.400894	\N	学生信息核验无误，批准注册	112	2025-10-30 11:44:07.380825	2025-10-30 11:44:07.400894
12	13824647601	测试学生B7601	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 11:44:07.60903	2025-10-30 11:44:07.60903	2025-10-30 11:44:07.613739	\N	学生信息不完整，拒绝注册	\N	2025-10-30 11:44:07.60903	2025-10-30 11:44:07.613739
13	13924730844	测试学生0844	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 11:45:30.93417	2025-10-30 11:45:30.93417	2025-10-30 11:45:30.953362	\N	学生信息核验无误，批准注册	113	2025-10-30 11:45:30.93417	2025-10-30 11:45:30.953362
14	13824731149	测试学生B1149	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 11:45:31.157982	2025-10-30 11:45:31.157982	2025-10-30 11:45:31.161917	\N	学生信息不完整，拒绝注册	\N	2025-10-30 11:45:31.157982	2025-10-30 11:45:31.161917
22	13927189331	测试学生9331	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 12:26:29.412548	2025-10-30 12:26:29.412548	2025-10-30 12:26:29.439463	\N	学生信息核验无误，批准注册	114	2025-10-30 12:26:29.412548	2025-10-30 12:26:29.439463
23	13827189643	测试学生B9643	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 12:26:29.65192	2025-10-30 12:26:29.65192	2025-10-30 12:26:29.662857	\N	学生信息不完整，拒绝注册	\N	2025-10-30 12:26:29.65192	2025-10-30 12:26:29.662857
24	13927226950	测试学生6950	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 12:27:07.04489	2025-10-30 12:27:07.04489	2025-10-30 12:27:07.068119	\N	学生信息核验无误，批准注册	115	2025-10-30 12:27:07.04489	2025-10-30 12:27:07.068119
25	13827227270	测试学生B7270	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 12:27:07.278095	2025-10-30 12:27:07.278095	2025-10-30 12:27:07.286447	\N	学生信息不完整，拒绝注册	\N	2025-10-30 12:27:07.278095	2025-10-30 12:27:07.286447
26	13927294180	测试学生4180	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 12:28:14.254953	2025-10-30 12:28:14.254953	2025-10-30 12:28:14.278522	\N	学生信息核验无误，批准注册	116	2025-10-30 12:28:14.254953	2025-10-30 12:28:14.278522
27	13827294480	测试学生B4480	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 12:28:14.488403	2025-10-30 12:28:14.488403	2025-10-30 12:28:14.49882	\N	学生信息不完整，拒绝注册	\N	2025-10-30 12:28:14.488403	2025-10-30 12:28:14.49882
28	13927326857	测试学生6857	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 12:28:47.033622	2025-10-30 12:28:47.033622	2025-10-30 12:28:47.056474	\N	学生信息核验无误，批准注册	117	2025-10-30 12:28:47.033622	2025-10-30 12:28:47.056474
29	13827327260	测试学生B7260	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 12:28:47.267055	2025-10-30 12:28:47.267055	2025-10-30 12:28:47.277228	\N	学生信息不完整，拒绝注册	\N	2025-10-30 12:28:47.267055	2025-10-30 12:28:47.277228
33	13828393874	测试学生B3874	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 12:46:33.884365	2025-10-30 12:46:33.884365	2025-10-30 12:46:33.893652	\N	学生信息不完整，拒绝注册	\N	2025-10-30 12:46:33.884365	2025-10-30 12:46:33.893652
35	13828446032	测试学生B6032	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	rejected	2	\N	2025-10-30 12:47:26.040559	2025-10-30 12:47:26.040559	2025-10-30 12:47:26.049284	\N	学生信息不完整，拒绝注册	\N	2025-10-30 12:47:26.040559	2025-10-30 12:47:26.049284
6	18123708147	涂好	2025-06-24	0538	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	六年级	rejected	2	\N	2025-10-27 17:28:57.522564	2025-10-27 17:28:57.522564	2025-10-30 17:15:16.390716	\N	测试	\N	2025-10-27 17:28:57.522564	2025-10-30 17:15:16.390716
5	13982043570	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	pending	4	\N	2025-10-27 16:20:43.82442	2025-11-02 18:00:00.1584	\N	\N	\N	\N	2025-10-27 16:20:43.82442	2025-11-02 18:00:00.1584
7	13924460858	测试学生0858	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 11:41:00.946113	2025-11-05 13:00:00.822798	\N	\N	\N	\N	2025-10-30 11:41:00.946113	2025-11-05 13:00:00.822798
15	13925876257	另一个学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 12:04:41.935364	2025-11-05 13:00:00.889188	\N	\N	\N	\N	2025-10-30 12:04:41.935364	2025-11-05 13:00:00.889188
16	13925876250	E2E测试学生6250	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 12:04:42.770068	2025-11-05 13:00:00.891134	\N	\N	\N	\N	2025-10-30 12:04:42.770068	2025-11-05 13:00:00.891134
17	13926070879	E2E测试学生0879	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 12:07:59.094055	2025-11-05 13:00:00.892927	\N	\N	\N	\N	2025-10-30 12:07:59.094055	2025-11-05 13:00:00.892927
18	13926223559	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 12:10:28.403412	2025-11-05 13:00:00.894772	\N	\N	\N	\N	2025-10-30 12:10:28.403412	2025-11-05 13:00:00.894772
19	13926285273	E2E测试学生5273	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 12:11:33.485698	2025-11-05 14:00:00.78542	\N	\N	\N	\N	2025-10-30 12:11:33.485698	2025-11-05 14:00:00.78542
20	13926353245	E2E测试学生3245	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 12:12:41.545675	2025-11-05 14:00:00.789117	\N	\N	\N	\N	2025-10-30 12:12:41.545675	2025-11-05 14:00:00.789117
21	13926499312	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 12:15:04.172614	2025-11-05 14:00:00.791066	\N	\N	\N	\N	2025-10-30 12:15:04.172614	2025-11-05 14:00:00.791066
36	13929084528	E2E测试学生4528	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 12:58:12.609212	2025-11-05 14:00:00.792854	\N	\N	\N	\N	2025-10-30 12:58:12.609212	2025-11-05 14:00:00.792854
38	13933148993	E2E测试学生8993	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 14:05:57.156889	2025-11-05 16:00:00.461327	\N	\N	\N	\N	2025-10-30 14:05:57.156889	2025-11-05 16:00:00.461327
39	13933234545	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 14:07:19.348015	2025-11-05 16:00:00.709213	\N	\N	\N	\N	2025-10-30 14:07:19.348015	2025-11-05 16:00:00.709213
40	13933990484	E2E测试学生0484	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 14:19:58.567165	2025-11-05 16:00:00.718318	\N	\N	\N	\N	2025-10-30 14:19:58.567165	2025-11-05 16:00:00.718318
3	13981919889	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	approved	4	\N	2025-10-27 16:18:40.084104	2025-11-02 18:00:00.154144	2025-11-07 13:56:40.159383	\N	申请已批准	171	2025-10-27 16:18:40.084104	2025-11-07 13:56:40.159383
37	13929230711	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	rejected	4	\N	2025-10-30 13:00:35.542696	2025-11-05 15:00:00.849702	2025-11-07 14:02:43.644558	\N	test	\N	2025-10-30 13:00:35.542696	2025-11-07 14:02:43.644558
4	13981967128	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	approved	4	\N	2025-10-27 16:19:27.406094	2025-11-02 18:00:00.156476	2025-11-26 14:09:57.106441	\N	申请已批准	172	2025-10-27 16:19:27.406094	2025-11-26 14:09:57.106441
56	13946061971	E2E测试学生1971	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:41:07.88804	2025-10-30 17:41:07.88804	2025-10-30 17:41:20.846127	\N	学生信息核验无误，批准注册	137	2025-10-30 17:41:07.88804	2025-10-30 17:41:20.846127
57	13946249680	E2E测试学生9680	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:44:15.481516	2025-10-30 17:44:15.481516	2025-10-30 17:44:28.690077	\N	学生信息核验无误，批准注册	138	2025-10-30 17:44:15.481516	2025-10-30 17:44:28.690077
58	13946802562	E2E测试学生2562	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:53:28.411016	2025-10-30 17:53:28.411016	2025-10-30 17:53:41.549463	\N	学生信息核验无误，批准注册	139	2025-10-30 17:53:28.411016	2025-10-30 17:53:41.549463
59	13947171921	E2E测试学生1921	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:59:37.71358	2025-10-30 17:59:37.71358	2025-10-30 17:59:50.573758	\N	学生信息核验无误，批准注册	140	2025-10-30 17:59:37.71358	2025-10-30 17:59:50.573758
60	13947210455	E2E测试学生0455	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 18:00:16.260648	2025-10-30 18:00:16.260648	2025-10-30 18:00:29.071647	\N	学生信息核验无误，批准注册	141	2025-10-30 18:00:16.260648	2025-10-30 18:00:29.071647
61	13947439550	E2E测试学生9550	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 18:04:05.32843	2025-10-30 18:04:05.32843	2025-10-30 18:04:18.070401	\N	学生信息核验无误，批准注册	142	2025-10-30 18:04:05.32843	2025-10-30 18:04:18.070401
62	13947630976	E2E测试学生0976	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 18:07:16.781012	2025-10-30 18:07:16.781012	2025-10-30 18:07:29.588739	\N	学生信息核验无误，批准注册	143	2025-10-30 18:07:16.781012	2025-10-30 18:07:29.588739
41	13934049755	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 14:20:54.527986	2025-11-05 16:00:00.722976	\N	\N	\N	\N	2025-10-30 14:20:54.527986	2025-11-05 16:00:00.722976
42	13937667410	E2E测试学生7410	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 15:21:15.588663	2025-11-05 16:00:00.72758	\N	\N	\N	\N	2025-10-30 15:21:15.588663	2025-11-05 16:00:00.72758
43	13937765760	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 15:22:50.550007	2025-11-05 16:00:00.731408	\N	\N	\N	\N	2025-10-30 15:22:50.550007	2025-11-05 16:00:00.731408
44	13938102541	E2E测试学生2541	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 15:28:30.598918	2025-11-05 16:00:00.735275	\N	\N	\N	\N	2025-10-30 15:28:30.598918	2025-11-05 16:00:00.735275
45	13938161801	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 15:29:26.611866	2025-11-05 16:00:00.739227	\N	\N	\N	\N	2025-10-30 15:29:26.611866	2025-11-05 16:00:00.739227
46	13939187539	E2E测试学生7539	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 15:46:35.659671	2025-11-05 16:00:00.742923	\N	\N	\N	\N	2025-10-30 15:46:35.659671	2025-11-05 16:00:00.742923
47	13939242083	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 15:47:26.872124	2025-11-05 16:00:00.746917	\N	\N	\N	\N	2025-10-30 15:47:26.872124	2025-11-05 16:00:00.746917
48	13939521532	E2E测试学生1532	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 15:52:09.592513	2025-11-05 16:00:00.7511	\N	\N	\N	\N	2025-10-30 15:52:09.592513	2025-11-05 16:00:00.7511
49	13939576238	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 15:53:01.106071	2025-11-05 16:00:00.755328	\N	\N	\N	\N	2025-10-30 15:53:01.106071	2025-11-05 16:00:00.755328
50	13940932660	E2E测试学生2660	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 16:15:40.821353	2025-11-05 17:00:00.375548	\N	\N	\N	\N	2025-10-30 16:15:40.821353	2025-11-05 17:00:00.375548
51	13940987616	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 16:16:32.418503	2025-11-05 17:00:00.452043	\N	\N	\N	\N	2025-10-30 16:16:32.418503	2025-11-05 17:00:00.452043
52	13943477812	E2E测试学生7812	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	4	\N	2025-10-30 16:58:05.964096	2025-11-05 17:00:00.454704	\N	\N	\N	\N	2025-10-30 16:58:05.964096	2025-11-05 17:00:00.454704
53	13943535740	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 16:59:00.557046	2025-11-05 17:00:00.457378	\N	\N	\N	\N	2025-10-30 16:59:00.557046	2025-11-05 17:00:00.457378
55	13944883572	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	4	\N	2025-10-30 17:21:28.37887	2025-11-05 18:00:00.592329	\N	\N	\N	\N	2025-10-30 17:21:28.37887	2025-11-05 18:00:00.592329
2	13981700442	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	approved	4	\N	2025-10-27 16:15:00.567693	2025-11-02 18:00:00.136121	2025-11-07 13:56:33.792637	\N	申请已批准	170	2025-10-27 16:15:00.567693	2025-11-07 13:56:33.792637
\.


--
-- Data for Name: student_task_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_task_progress (progress_id, student_id, task_id, current_value, target_value, completion_rate, is_completed, completed_at, points_awarded, bonus_awarded, period_start, period_end, reset_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, user_id, student_no, school_id, grade, class, enrollment_date, guardian_name, guardian_phone, created_at) FROM stdin;
2	12	S2024002	1	三年级	3班	\N	李母亲	13900139002	2025-09-24 15:09:18.52151
3	13	S2024003	1	三年级	3班	\N	王父亲	13900139003	2025-09-24 15:09:18.52151
4	111	\N	2	四年级	\N	\N	\N	\N	2025-10-30 11:42:44.159572
5	112	\N	2	四年级	\N	\N	\N	\N	2025-10-30 11:44:07.400894
6	113	\N	2	四年级	\N	\N	\N	\N	2025-10-30 11:45:30.953362
7	114	\N	2	四年级	\N	\N	\N	\N	2025-10-30 12:26:29.439463
8	115	\N	2	四年级	\N	\N	\N	\N	2025-10-30 12:27:07.068119
10	117	\N	2	四年级	\N	\N	\N	\N	2025-10-30 12:28:47.056474
14	123	NM-S001	9	三年级	1班	\N	南明家长	13900000006	2025-10-30 14:49:30.801796
15	124	GSH-S001	12	三年级	1班	\N	观山湖家长	13900000007	2025-10-30 14:49:30.806328
16	125	BY-S001	15	三年级	1班	\N	白云家长	13900000008	2025-10-30 14:49:30.80751
17	126	HX-S001	18	三年级	1班	\N	花溪家长	13900000009	2025-10-30 14:49:30.808507
18	127	WD-S001	21	三年级	1班	\N	乌当家长	13900000010	2025-10-30 14:49:30.809631
19	128	QZ-S001	24	三年级	1班	\N	清镇家长	13900000011	2025-10-30 14:49:30.81064
20	129	XW-S001	27	三年级	1班	\N	修文家长	13900000012	2025-10-30 14:49:30.811616
21	130	XF-S001	30	三年级	1班	\N	息烽家长	13900000013	2025-10-30 14:49:30.812688
22	131	KY-S001	33	三年级	1班	\N	开阳家长	13900000014	2025-10-30 14:49:30.813589
23	132	GAXQ-S001	36	三年级	1班	\N	贵安家长	13900000015	2025-10-30 14:49:30.814602
24	133	GYSZSX-S001	39	三年级	1班	\N	市直属家长	13900000016	2025-10-30 14:49:30.815456
25	134	GY002-S001	2	三年级	1班	\N	市二小家长	13900000017	2025-10-30 14:49:30.816345
28	137	\N	2	四年级	\N	\N	\N	\N	2025-10-30 17:41:20.846127
29	138	\N	2	四年级	\N	\N	\N	\N	2025-10-30 17:44:28.690077
30	139	\N	2	四年级	\N	\N	\N	\N	2025-10-30 17:53:41.549463
31	140	\N	2	四年级	\N	\N	\N	\N	2025-10-30 17:59:50.573758
32	141	\N	2	四年级	\N	\N	\N	\N	2025-10-30 18:00:29.071647
33	142	\N	2	四年级	\N	\N	\N	\N	2025-10-30 18:04:18.070401
34	143	\N	2	四年级	\N	\N	\N	\N	2025-10-30 18:07:29.588739
1	11	S2024001	1	三年级	3班	\N	张父测试	13900139999	2025-09-24 15:09:18.52151
37	170	\N	6	二年级	\N	\N	\N	\N	2025-11-07 13:56:33.792637
38	171	\N	6	二年级	\N	\N	\N	\N	2025-11-07 13:56:40.159383
39	172	\N	6	二年级	\N	\N	\N	\N	2025-11-26 14:09:57.106441
40	173	YY-PS-01-2025001	6	三年级	1班	\N	\N	\N	2025-11-30 10:17:10.318075
41	174	YY-PS-01-2025002	6	三年级	1班	\N	\N	\N	2025-11-30 10:17:10.318075
42	175	YY-PS-01-2025003	6	四年级	2班	\N	\N	\N	2025-11-30 10:17:10.318075
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, subject_code, subject_name, description, grade_range, ability_levels, is_active, display_order, created_at, updated_at) FROM stdin;
1	01	数学	数学科目，涵盖一年级到九年级	[{"label": "一年级", "value": "一年级"}, {"label": "二年级", "value": "二年级"}, {"label": "三年级", "value": "三年级"}, {"label": "四年级", "value": "四年级"}, {"label": "五年级", "value": "五年级"}, {"label": "六年级", "value": "六年级"}, {"label": "七年级", "value": "七年级"}, {"label": "八年级", "value": "八年级"}, {"label": "九年级", "value": "九年级"}]	[{"label": "L1 - 基础运算", "value": "L1"}, {"label": "L2 - 基础理解", "value": "L2"}, {"label": "L3 - 综合运用", "value": "L3"}, {"label": "L4 - 问题解决", "value": "L4"}, {"label": "L5 - 逻辑推理", "value": "L5"}, {"label": "L6 - 创新应用", "value": "L6"}, {"label": "L7 - 拓展探究", "value": "L7"}]	t	1	2025-11-05 15:00:19.717428	2025-11-05 15:00:19.717428
2	02	信息科技	信息科技科目，涵盖三年级到九年级	[{"label": "三年级", "value": "三年级"}, {"label": "四年级", "value": "四年级"}, {"label": "五年级", "value": "五年级"}, {"label": "六年级", "value": "六年级"}, {"label": "七年级", "value": "七年级"}, {"label": "八年级", "value": "八年级"}, {"label": "九年级", "value": "九年级"}]	[{"label": "L1 - 基础认知", "value": "L1"}, {"label": "L2 - 基本操作", "value": "L2"}, {"label": "L3 - 编程入门", "value": "L3"}, {"label": "L4 - 算法理解", "value": "L4"}, {"label": "L5 - 程序设计", "value": "L5"}, {"label": "L6 - 项目开发", "value": "L6"}, {"label": "L7 - 创新实践", "value": "L7"}]	t	2	2025-11-05 15:00:19.717428	2025-11-05 15:00:19.717428
\.


--
-- Data for Name: system_announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_announcements (id, title, content, summary, type, target_audience, target_district_id, target_school_id, is_pinned, is_popup, status, published_at, start_time, end_time, created_by, created_at, updated_at) FROM stdin;
1	Test Announcement - 20251201_013236	This is a test announcement content for notification system verification.	Test announcement summary	notice	all	\N	\N	f	f	published	2025-11-30 17:32:36.602302	\N	\N	\N	2025-11-30 17:32:36.59115	2025-11-30 17:32:36.602302
2	Test Announcement - 20251201_013409	This is a test announcement content for notification system verification.	Test announcement summary	notice	all	\N	\N	f	f	published	2025-11-30 17:34:09.116384	\N	\N	\N	2025-11-30 17:34:09.106467	2025-11-30 17:34:09.116384
\.


--
-- Data for Name: task_completion_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_completion_history (history_id, student_id, task_id, completed_value, target_value, points_earned, bonus_earned, period_start, period_end, completion_time, streak_count, created_at) FROM stdin;
\.


--
-- Data for Name: teacher_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teacher_permissions (id, user_id, permission_type, subjects, granted_by, granted_at, expires_at, is_active, notes, created_at, updated_at, scope_level, district_id, school_id) FROM stdin;
12	1	assessment_review	{数学,物理,化学,生物,计算机}	1	2025-11-03 13:38:55.472996	\N	t	由旧的 question_bank_review 权限迁移而来	2025-11-03 13:38:55.472996	2025-11-03 13:38:55.472996	municipal	\N	\N
13	1	practice_municipal_review	{数学,物理,化学,生物,计算机}	1	2025-11-03 13:38:55.472996	\N	t	由旧的 question_bank_review 权限迁移而来	2025-11-03 13:38:55.472996	2025-11-03 13:38:55.472996	municipal	\N	\N
2	1	assessment_review	{数学,物理,化学,生物,计算机}	1	2025-10-15 15:15:37.045913	\N	t	系统管理员默认权限	2025-10-15 15:15:37.045913	2025-11-03 13:38:55.472996	municipal	\N	\N
3	1	competition_review	{数学,物理,化学,生物,计算机}	1	2025-10-15 15:15:37.045913	\N	t	系统管理员默认权限	2025-10-15 15:15:37.045913	2025-11-03 13:38:55.472996	municipal	\N	\N
6	10	assessment_review	{数学,物理,化学,生物,计算机}	1	2025-10-21 12:16:16.209385	\N	t	为 R409 测试添加测评题库审核权限	2025-10-21 12:16:16.209385	2025-11-03 13:38:55.472996	municipal	\N	\N
14	9	practice_district_review	{数学,计算机}	2	2025-11-03 13:38:55.472996	\N	t	由旧的 question_bank_review 权限迁移而来（自动关联到教师所在区）	2025-11-03 13:38:55.472996	2025-11-26 14:56:34.001009	district	1	\N
15	10	practice_district_review	{数学,计算机}	2	2025-11-03 13:38:55.472996	\N	t	由旧的 question_bank_review 权限迁移而来（自动关联到教师所在区）	2025-11-03 13:38:55.472996	2025-11-26 14:56:39.937135	district	1	\N
7	9	assessment_review	{数学,物理,化学,生物,计算机}	1	2025-10-21 12:16:25.67183	\N	t	为 R409 测试添加测评题库审核权限	2025-10-21 12:16:25.67183	2025-11-03 13:38:55.472996	municipal	\N	\N
45	94	practice_district_review	{语文}	1	2025-11-08 12:26:58.51813	2026-11-08 13:23:17.104	f	API测试备注 - 1762608197104	2025-11-08 12:26:58.51813	2025-11-08 16:17:53.999368	district	1	\N
24	159	practice_district_review	{数学}	3	2025-11-05 15:06:07.518531	\N	f	区级练习题库审核权限	2025-11-05 15:06:07.518531	2025-11-05 15:06:43.817593	district	2	\N
26	94	question_bank_review	{数学}	1	2025-11-05 17:05:26.623574	\N	t		2025-11-05 17:05:26.623574	2025-11-05 17:05:26.623574	municipal	\N	\N
28	94	question_bank_review	{数学}	1	2025-11-05 17:06:03.561201	\N	t		2025-11-05 17:06:03.561201	2025-11-05 17:06:03.561201	municipal	\N	\N
41	168	practice_district_review	{数学}	2	2025-11-07 13:41:41.159091	\N	t	test	2025-11-07 13:41:41.159091	2025-11-07 17:28:19.787542	district	1	\N
16	94	practice_municipal_review	{数学,语文}	1	2025-11-03 15:23:15.705738	2026-11-03 15:23:15.698	f	API测试 - 市级审核权限	2025-11-03 15:23:15.705738	2025-11-08 16:17:23.087977	municipal	\N	\N
17	94	practice_municipal_review	{数学,语文}	1	2025-11-04 06:32:31.942479	2026-11-04 06:32:31.938	f	API测试 - 市级审核权限	2025-11-04 06:32:31.942479	2025-11-08 16:17:23.087977	municipal	\N	\N
18	94	practice_municipal_review	{数学,语文}	1	2025-11-04 06:33:55.374017	2026-11-04 06:33:55.371	f	API测试 - 市级审核权限	2025-11-04 06:33:55.374017	2025-11-08 16:17:23.087977	municipal	\N	\N
19	94	practice_municipal_review	{数学,语文}	1	2025-11-04 06:34:31.895736	2026-11-04 06:34:31.893	f	API测试 - 市级审核权限	2025-11-04 06:34:31.895736	2025-11-08 16:17:23.087977	municipal	\N	\N
20	94	practice_municipal_review	{数学,语文}	1	2025-11-04 06:34:49.653904	2026-11-04 06:34:49.652	f	API测试 - 市级审核权限	2025-11-04 06:34:49.653904	2025-11-08 16:17:23.087977	municipal	\N	\N
21	94	practice_municipal_review	{数学,语文}	1	2025-11-04 06:35:48.31866	2026-11-04 06:35:48.316	f	API测试 - 市级审核权限	2025-11-04 06:35:48.31866	2025-11-08 16:17:23.087977	municipal	\N	\N
22	94	practice_municipal_review	{数学}	1	2025-11-04 11:24:26.954125	\N	f		2025-11-04 11:24:26.954125	2025-11-08 16:17:23.087977	municipal	\N	\N
23	94	practice_municipal_review	{数学}	1	2025-11-04 11:33:29.718489	\N	f		2025-11-04 11:33:29.718489	2025-11-08 16:17:23.087977	municipal	\N	\N
25	94	practice_municipal_review	{数学}	1	2025-11-05 17:05:26.611012	\N	f		2025-11-05 17:05:26.611012	2025-11-08 16:17:23.087977	municipal	\N	\N
27	94	practice_municipal_review	{数学}	1	2025-11-05 17:06:03.551182	\N	f		2025-11-05 17:06:03.551182	2025-11-08 16:17:23.087977	municipal	\N	\N
29	94	practice_municipal_review	{数学}	1	2025-11-05 17:19:51.735208	\N	f		2025-11-05 17:19:51.735208	2025-11-08 16:17:23.087977	municipal	\N	\N
30	94	practice_municipal_review	{数学}	1	2025-11-06 11:16:11.072923	\N	f		2025-11-06 11:16:11.072923	2025-11-08 16:17:23.087977	municipal	\N	\N
31	94	practice_municipal_review	{数学}	1	2025-11-06 11:56:17.09396	\N	f		2025-11-06 11:56:17.09396	2025-11-08 16:17:23.087977	municipal	\N	\N
32	94	practice_municipal_review	{数学}	1	2025-11-06 11:56:55.137081	\N	f		2025-11-06 11:56:55.137081	2025-11-08 16:17:23.087977	municipal	\N	\N
33	94	practice_municipal_review	{数学}	1	2025-11-06 12:10:00.927513	\N	f		2025-11-06 12:10:00.927513	2025-11-08 16:17:23.087977	municipal	\N	\N
34	94	practice_municipal_review	{数学}	1	2025-11-06 12:24:56.13201	\N	f		2025-11-06 12:24:56.13201	2025-11-08 16:17:23.087977	municipal	\N	\N
35	94	practice_municipal_review	{数学}	1	2025-11-06 12:31:32.70244	\N	f		2025-11-06 12:31:32.70244	2025-11-08 16:17:23.087977	municipal	\N	\N
36	94	practice_municipal_review	{数学}	1	2025-11-06 12:49:54.603315	\N	f		2025-11-06 12:49:54.603315	2025-11-08 16:17:23.087977	municipal	\N	\N
37	94	practice_municipal_review	{数学}	1	2025-11-06 12:51:49.48029	\N	f		2025-11-06 12:51:49.48029	2025-11-08 16:17:23.087977	municipal	\N	\N
38	94	practice_municipal_review	{数学}	1	2025-11-06 13:09:27.090187	\N	f		2025-11-06 13:09:27.090187	2025-11-08 16:17:23.087977	municipal	\N	\N
39	94	practice_municipal_review	{数学}	1	2025-11-06 14:06:33.446333	\N	f		2025-11-06 14:06:33.446333	2025-11-08 16:17:23.087977	municipal	\N	\N
40	94	practice_municipal_review	{数学}	1	2025-11-06 14:22:58.853687	\N	f		2025-11-06 14:22:58.853687	2025-11-08 16:17:23.087977	municipal	\N	\N
44	94	practice_municipal_review	{数学,信息科技}	1	2025-11-08 12:26:58.425655	2026-11-08 12:26:58.422	f	API测试 - 市级审核权限	2025-11-08 12:26:58.425655	2025-11-08 16:17:23.087977	municipal	\N	\N
52	94	practice_municipal_review	{数学}	1	2025-11-08 16:17:32.92453	\N	t		2025-11-08 16:17:32.92453	2025-11-08 16:17:32.92453	municipal	\N	\N
53	94	practice_municipal_review	{数学,信息科技}	1	2025-11-08 17:20:38.271212	2026-11-08 17:20:38.268	t	API测试 - 市级审核权限	2025-11-08 17:20:38.271212	2025-11-08 17:20:38.271212	municipal	\N	\N
54	163	practice_district_review	{数学}	2	2025-11-21 14:29:04.073125	\N	t	区级练习题库审核权限	2025-11-21 14:29:04.073125	2025-11-21 14:29:04.073125	district	1	\N
\.


--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teachers (id, user_id, teacher_no, school_id, subjects, title, created_at) FROM stdin;
5	44	T-YY-HS-01-001	8	{数学,计算机}	高级教师	2025-10-29 14:15:48.542795
14	62	T-BY-HS-01-001	17	{数学,计算机}	高级教师	2025-10-29 14:15:48.542795
20	74	T-WD-HS-01-001	23	{数学,计算机}	高级教师	2025-10-29 14:15:48.542795
26	86	T-XW-HS-01-001	29	{数学,计算机}	高级教师	2025-10-29 14:15:48.542795
32	98	T-KY-HS-01-001	35	{数学,计算机}	高级教师	2025-10-29 14:15:48.542795
38	110	T-GYSZSX-HS-01-001	41	{数学,计算机}	高级教师	2025-10-29 14:15:48.542795
1	9	T001	1	{数学}	高级教师	2025-09-24 15:09:18.519249
3	40	T-YY-PS-01-001	6	{数学}	中级教师	2025-10-29 14:15:48.542795
6	46	T-NM-PS-01-001	9	{}	中级教师	2025-10-29 14:15:48.542795
13	60	T-BY-MS-01-001	16	{信息科技}	高级教师	2025-10-29 14:15:48.542795
12	58	T-BY-PS-01-001	15	{数学}	中级教师	2025-10-29 14:15:48.542795
15	64	T-HX-PS-01-001	18	{}	中级教师	2025-10-29 14:15:48.542795
18	70	T-WD-PS-01-001	21	{数学}	中级教师	2025-10-29 14:15:48.542795
21	76	T-QZ-PS-01-001	24	{}	中级教师	2025-10-29 14:15:48.542795
24	82	T-XW-PS-01-001	27	{数学}	中级教师	2025-10-29 14:15:48.542795
27	88	T-XF-PS-01-001	30	{}	中级教师	2025-10-29 14:15:48.542795
30	94	T-KY-PS-01-001	33	{数学}	中级教师	2025-10-29 14:15:48.542795
33	100	T-GAXQ-PS-01-001	36	{}	中级教师	2025-10-29 14:15:48.542795
36	106	T-GYSZSX-PS-01-001	39	{数学}	中级教师	2025-10-29 14:15:48.542795
2	10	T002	1	{}	中级教师	2025-09-24 15:09:18.519249
4	42	T-YY-MS-01-001	7	{}	高级教师	2025-10-29 14:15:48.542795
7	48	T-NM-MS-01-001	10	{数学}	高级教师	2025-10-29 14:15:48.542795
8	50	T-NM-HS-01-001	11	{计算机}	高级教师	2025-10-29 14:15:48.542795
10	54	T-GSH-MS-01-001	13	{数学}	高级教师	2025-10-29 14:15:48.542795
11	56	T-GSH-HS-01-001	14	{计算机}	高级教师	2025-10-29 14:15:48.542795
16	66	T-HX-MS-01-001	19	{数学}	高级教师	2025-10-29 14:15:48.542795
17	68	T-HX-HS-01-001	20	{计算机}	高级教师	2025-10-29 14:15:48.542795
19	72	T-WD-MS-01-001	22	{}	高级教师	2025-10-29 14:15:48.542795
22	78	T-QZ-MS-01-001	25	{数学}	高级教师	2025-10-29 14:15:48.542795
23	80	T-QZ-HS-01-001	26	{计算机}	高级教师	2025-10-29 14:15:48.542795
25	84	T-XW-MS-01-001	28	{}	高级教师	2025-10-29 14:15:48.542795
28	90	T-XF-MS-01-001	31	{数学}	高级教师	2025-10-29 14:15:48.542795
29	92	T-XF-HS-01-001	32	{计算机}	高级教师	2025-10-29 14:15:48.542795
31	96	T-KY-MS-01-001	34	{}	高级教师	2025-10-29 14:15:48.542795
34	102	T-GAXQ-MS-01-001	37	{数学}	高级教师	2025-10-29 14:15:48.542795
35	104	T-GAXQ-HS-01-001	38	{计算机}	高级教师	2025-10-29 14:15:48.542795
37	108	T-GYSZSX-MS-01-001	40	{}	高级教师	2025-10-29 14:15:48.542795
9	52	T-GSH-PS-01-001	12	{}	中级教师	2025-10-29 14:15:48.542795
39	18	T-GY001-003	1	{}	中级教师	2025-10-29 14:16:20.390924
40	151	T_BY_PS_MATH	4	{数学}	中级教师	2025-11-04 15:06:11.769125
41	152	T_BY_PS_IT	4	{信息科技}	中级教师	2025-11-04 15:06:11.769125
42	153	T_BY_MS_MATH	4	{数学}	中级教师	2025-11-04 15:06:11.769125
43	154	T_BY_MS_IT	4	{信息科技}	中级教师	2025-11-04 15:06:11.769125
44	155	T_BY_HS_MATH	4	{数学}	高级教师	2025-11-04 15:06:11.769125
45	156	T_BY_HS_IT	4	{信息科技}	高级教师	2025-11-04 15:06:11.769125
46	157	T_NM_PS_MATH	2	{数学}	中级教师	2025-11-04 15:06:11.769125
47	158	T_NM_PS_IT	2	{信息科技}	中级教师	2025-11-04 15:06:11.769125
48	159	T_NM_MS_MATH	2	{数学}	中级教师	2025-11-04 15:06:11.769125
49	160	T_NM_MS_IT	2	{信息科技}	中级教师	2025-11-04 15:06:11.769125
50	161	T_NM_HS_MATH	2	{数学}	高级教师	2025-11-04 15:06:11.769125
51	162	T_NM_HS_IT	2	{信息科技}	高级教师	2025-11-04 15:06:11.769125
53	164	T_YY_PS_IT	6	{信息科技}	中级教师	2025-11-04 15:06:11.769125
52	163	T_YY_PS_MATH	6	{数学}	中级教师	2025-11-04 15:06:11.769125
54	165	T_YY_MS_MATH	7	{数学}	中级教师	2025-11-04 15:06:11.769125
55	166	T_YY_MS_IT	7	{信息科技}	中级教师	2025-11-04 15:06:11.769125
56	167	T_YY_HS_MATH	8	{数学}	高级教师	2025-11-04 15:06:11.769125
57	168	T_YY_HS_IT	8	{信息科技}	高级教师	2025-11-04 15:06:11.769125
\.


--
-- Data for Name: teaching_class_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teaching_class_activities (id, teaching_class_id, activity_id, assigned_at, assigned_by, deadline, is_required) FROM stdin;
\.


--
-- Data for Name: teaching_class_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teaching_class_approvals (id, teaching_class_id, reviewer_id, action, comment, reviewer_level, created_at) FROM stdin;
1	3	9	approve	API 测试批准	municipal	2025-11-26 06:50:28.280279
\.


--
-- Data for Name: teaching_class_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teaching_class_members (id, teaching_class_id, student_id, joined_at, removed_at, is_active) FROM stdin;
1	3	1	2025-11-26 06:50:28.288195	\N	t
\.


--
-- Data for Name: teaching_class_teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teaching_class_teachers (id, teaching_class_id, teacher_id, role, assigned_at, is_active) FROM stdin;
1	1	1	creator	2025-11-26 06:49:37.266534	t
2	2	1	creator	2025-11-26 06:49:37.297061	t
3	3	1	creator	2025-11-26 06:50:28.210728	t
\.


--
-- Data for Name: teaching_classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teaching_classes (id, name, description, scope, school_id, district_id, subject, grade, academic_year, status, created_by, approved_by, approved_at, rejection_reason, submitted_at, current_reviewer_level, created_at, updated_at) FROM stdin;
1	测试教学班-1764139777256	这是一个 API 测试创建的教学班	school	1	\N	数学	三年级	2025-2026学年第一学期	draft	9	\N	\N	\N	\N	\N	2025-11-26 06:49:37.260329	2025-11-26 06:49:37.260329
2	待删除教学班-1764139777292	用于删除测试	school	1	\N	\N	\N	2025-2026学年第一学期	draft	9	\N	\N	\N	\N	\N	2025-11-26 06:49:37.295342	2025-11-26 06:49:37.295342
3	更新后的教学班-1764139828253	更新后的描述	school	1	\N	数学	三年级	2025-2026学年第一学期	approved	9	9	2025-11-26 06:50:28.278321	\N	2025-11-26 06:50:28.262632	school	2025-11-26 06:50:28.20848	2025-11-26 06:50:28.278321
\.


--
-- Data for Name: user_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notifications (id, user_id, type, title, content, metadata, related_type, related_id, is_read, read_at, priority, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, role, real_name, phone, email, avatar_url, status, created_at, updated_at) FROM stdin;
9	teacher01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	Bug11Test-1762622809524	13800000001	\N	\N	active	2025-09-24 15:09:18.517813	2025-11-26 07:22:51.746701
4	guanshanhu_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	观山湖区管理员	13800138012	gsh@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-10-04 06:22:48.164265
8	base_school_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	base_school_admin	信息技术基地校管理员	13800138040	base@guiyang.edu	\N	active	2025-09-24 15:09:18.517234	2025-11-05 17:44:28.953517
12	13800138004	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	李小红	13800138004	student02@example.com	\N	active	2025-09-24 15:09:18.518583	2025-10-30 14:36:38.649155
7	municipal_school_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	municipal_school_admin	市直属学校总管理员	13800138030	municipal@guiyang.edu	\N	active	2025-09-24 15:09:18.516515	2025-11-05 17:44:28.999783
15	test_school_admin_1759590680149	$2a$10$0BWcbB8OWOlQxYncQxx9oewalqWGLvV5qV97wvx4ky9o4l1oZHnLW	school_admin	测试校级管理员	13800138888	test_school@guiyang.edu	\N	active	2025-10-04 15:11:20.154128	2025-10-04 15:11:20.154128
16	test_district_admin_1759590680212	$2a$10$lvX5WiIGgJWmdAzzs9bLbuA7jRhGQInT4goLbZDZ7xKjt7aloMKuG	district_admin	测试区级管理员	13800139999	test_district@guiyang.edu	\N	active	2025-10-04 15:11:20.216102	2025-10-04 15:11:20.216102
18	teacher03	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	teacher	王芳	13800138003	wangfang@school.com	\N	active	2025-10-14 08:19:53.472845	2025-10-14 08:19:53.472845
19	student01	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	张小明	13900139001	zhangxm@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
20	student02	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	李小红	13900139002	lixh@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
5	school_admin_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	第一小学管理员	13800138020	school01@guiyang.edu	\N	active	2025-09-24 15:09:18.515839	2025-11-05 17:44:29.045446
21	student03	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	王小刚	13900139003	wangxg@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
14	test_user	$2a$10$/WJN2rZvsACiuZN2MaiJ3uGDcx67rljEcmAviS78waXaAv8uj3ERm	student	测试用户	\N	\N	\N	active	2025-09-27 13:02:45.037069	2025-09-27 13:02:45.037069
22	student04	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	刘小丽	13900139004	liuxl@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
23	student05	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	陈小华	13900139005	chenxh@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
10	teacher02	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	王老师	13800138002	teacher02@guiyang.edu	\N	active	2025-09-24 15:09:18.517813	2025-10-21 12:20:15.941959
13	13800138005	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	王小刚	13800138005	student03@example.com	\N	active	2025-09-24 15:09:18.518583	2025-10-30 14:36:38.649155
2	yunyan_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	云岩区管理员	13800138055	admin@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-11-30 09:36:11.517537
6	school_admin_02	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	第二小学管理员	13800138021	school02@guiyang.edu	\N	active	2025-09-24 15:09:18.515839	2025-11-05 17:02:07.948745
3	nanming_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	南明区管理员	13800138011	nanming@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-11-07 14:01:07.133694
1	admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	system_admin	系统管理员	13800138000	admin@guiyang.edu	\N	active	2025-09-24 15:09:18.513928	2025-11-30 17:34:09.095397
11	13800138003	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	StudentBug11-1762622809583	\N	\N	\N	active	2025-09-24 15:09:18.518583	2025-11-30 17:48:06.207044
34	qingzhen_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	清镇市教育局管理员	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
35	xiuwen_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	修文县教育局管理员	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
36	xifeng_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	息烽县教育局管理员	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
37	kaiyang_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	开阳县教育局管理员	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
38	guian_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	贵安新区教育局管理员	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
40	teacher_yy_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	张明	13900001001	teacher_yy_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
41	school_admin_yy_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	云岩区第一中学管理员	13800001002	admin_yy_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
42	teacher_yy_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	李芳	13900001002	teacher_yy_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
43	school_admin_yy_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	云岩区第一高中管理员	13800001003	admin_yy_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
44	teacher_yy_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	王强	13900001003	teacher_yy_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
46	teacher_nm_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	赵丽	13900002001	teacher_nm_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
47	school_admin_nm_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	南明区第一中学管理员	13800002002	admin_nm_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
48	teacher_nm_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	孙伟	13900002002	teacher_nm_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
49	school_admin_nm_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	南明区第一高中管理员	13800002003	admin_nm_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
50	teacher_nm_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	周杰	13900002003	teacher_nm_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
51	school_admin_gsh_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	观山湖区第一小学管理员	13800003001	admin_gsh_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
52	teacher_gsh_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	吴雪	13900003001	teacher_gsh_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
53	school_admin_gsh_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	观山湖区第一中学管理员	13800003002	admin_gsh_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
54	teacher_gsh_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	郑涛	13900003002	teacher_gsh_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
55	school_admin_gsh_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	观山湖区第一高中管理员	13800003003	admin_gsh_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
56	teacher_gsh_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	冯婷	13900003003	teacher_gsh_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
33	guiyang_admin	a0/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	municipal_admin	贵阳市教育局管理员	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-11-05 14:54:05.818678
45	school_admin_nm_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	南明区第一小学管理员	13800002001	admin_nm_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-11-14 05:49:30.784657
57	school_admin_by_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	白云区第一小学管理员	13800004001	admin_by_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
59	school_admin_by_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	白云区第一中学管理员	13800004002	admin_by_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
60	teacher_by_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	蒋敏	13900004002	teacher_by_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
61	school_admin_by_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	白云区第一高中管理员	13800004003	admin_by_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
62	teacher_by_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	沈浩	13900004003	teacher_by_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
63	school_admin_hx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	花溪区第一小学管理员	13800005001	admin_hx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
64	teacher_hx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	韩冰	13900005001	teacher_hx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
65	school_admin_hx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	花溪区第一中学管理员	13800005002	admin_hx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
66	teacher_hx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	魏洋	13900005002	teacher_hx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
67	school_admin_hx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	花溪区第一高中管理员	13800005003	admin_hx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
68	teacher_hx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	姚鹏	13900005003	teacher_hx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
69	school_admin_wd_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	乌当区第一小学管理员	13800006001	admin_wd_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
70	teacher_wd_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	曹颖	13900006001	teacher_wd_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
71	school_admin_wd_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	乌当区第一中学管理员	13800006002	admin_wd_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
72	teacher_wd_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	薛磊	13900006002	teacher_wd_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
73	school_admin_wd_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	乌当区第一高中管理员	13800006003	admin_wd_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
74	teacher_wd_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	潘军	13900006003	teacher_wd_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
75	school_admin_qz_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	清镇市第一小学管理员	13800008001	admin_qz_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
76	teacher_qz_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	戴秀	13900008001	teacher_qz_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
77	school_admin_qz_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	清镇市第一中学管理员	13800008002	admin_qz_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
78	teacher_qz_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	石娜	13900008002	teacher_qz_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
79	school_admin_qz_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	清镇市第一高中管理员	13800008003	admin_qz_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
80	teacher_qz_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	段宇	13900008003	teacher_qz_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
81	school_admin_xw_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	修文县第一小学管理员	13800009001	admin_xw_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
82	teacher_xw_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	傅杰	13900009001	teacher_xw_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
83	school_admin_xw_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	修文县第一中学管理员	13800009002	admin_xw_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
84	teacher_xw_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	汤霞	13900009002	teacher_xw_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
85	school_admin_xw_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	修文县第一高中管理员	13800009003	admin_xw_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
86	teacher_xw_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	邹斌	13900009003	teacher_xw_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
87	school_admin_xf_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	息烽县第一小学管理员	13800010001	admin_xf_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
88	teacher_xf_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	熊芬	13900010001	teacher_xf_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
89	school_admin_xf_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	息烽县第一中学管理员	13800010002	admin_xf_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
90	teacher_xf_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	金龙	13900010002	teacher_xf_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
91	school_admin_xf_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	息烽县第一高中管理员	13800010003	admin_xf_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
92	teacher_xf_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	谷亮	13900010003	teacher_xf_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
93	school_admin_ky_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	开阳县第一小学管理员	13800011001	admin_ky_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
95	school_admin_ky_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	开阳县第一中学管理员	13800011002	admin_ky_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
96	teacher_ky_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	於涛	13900011002	teacher_ky_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
97	school_admin_ky_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	开阳县第一高中管理员	13800011003	admin_ky_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
98	teacher_ky_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	刁强	13900011003	teacher_ky_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
99	school_admin_gaxq_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	贵安新区第一小学管理员	13800012001	admin_gaxq_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
100	teacher_gaxq_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	毛琴	13900012001	teacher_gaxq_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
101	school_admin_gaxq_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	贵安新区第一中学管理员	13800012002	admin_gaxq_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
102	teacher_gaxq_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	文静	13900012002	teacher_gaxq_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
103	school_admin_gaxq_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	贵安新区第一高中管理员	13800012003	admin_gaxq_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
104	teacher_gaxq_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	云霞	13900012003	teacher_gaxq_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
105	school_admin_gyszsx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	市直属第一小学管理员	13800013001	admin_gyszsx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
106	teacher_gyszsx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	卞梅	13900013001	teacher_gyszsx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
107	school_admin_gyszsx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	市直属第一中学管理员	13800013002	admin_gyszsx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
108	teacher_gyszsx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	廉刚	13900013002	teacher_gyszsx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
109	school_admin_gyszsx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	市直属第一高中管理员	13800013003	admin_gyszsx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
110	teacher_gyszsx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	房亮	13900013003	teacher_gyszsx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
111	13924564023	$2a$10$Esb3ewWV4ufqSbZfm7QbTer8FR7ITnx0QQBDuqv9a25YTbWpm7QKO	student	测试学生4023	13924564023	\N	\N	active	2025-10-30 11:42:44.159572	2025-10-30 11:42:44.159572
112	13924647294	$2a$10$9qK6EkYyFgEybooCeGMjDOLo1eg2wLODCai41ySzbSVEOMnfZOKyy	student	测试学生7294	13924647294	\N	\N	active	2025-10-30 11:44:07.400894	2025-10-30 11:44:07.594056
124	13800138007	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	观山湖测试学生	13800138007	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
113	13924730844	$2a$10$HfVYj2tzSoH6Zvz8mlsk3.TXPqqvwOzXq8DTTfJDUnZ3Ln/DxozbC	student	测试学生0844	13924730844	\N	\N	active	2025-10-30 11:45:30.953362	2025-10-30 11:45:31.143918
125	13800138008	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	白云测试学生	13800138008	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
114	13927189331	$2a$10$G9FsLMLJgWneXxK0mMGtDeHyfocX.K4IMYbeb6RGHJ.4hXldRkLri	student	测试学生9331	13927189331	\N	\N	active	2025-10-30 12:26:29.439463	2025-10-30 12:26:29.633886
115	13927226950	$2a$10$ozFSwiMmjGtbb1JX4uvHL.P1kHvGxC5xocLSraLJ0i36zXsPEGm02	student	测试学生6950	13927226950	\N	\N	active	2025-10-30 12:27:07.068119	2025-10-30 12:27:07.261702
126	13800138009	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	花溪测试学生	13800138009	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
116	13927294180	$2a$10$7IY7nBFMSU1/jUd5S5QScetg9VMMTAFkrNqkqUjaDyedLO.PoEic.	student	测试学生4180	13927294180	\N	\N	active	2025-10-30 12:28:14.278522	2025-10-30 12:28:14.471102
127	13800138010	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	乌当测试学生	13800138010	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
117	13927326857	$2a$10$RWW.29.K5zRV3UHfJz/uxO4oq0x759Y6mDhNyLSjkW6WMMHDNYBwi	student	测试学生6857	13927326857	\N	\N	active	2025-10-30 12:28:47.056474	2025-10-30 12:28:47.251177
128	13800138011	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	清镇测试学生	13800138011	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
129	13800138012	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	修文测试学生	13800138012	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
123	13800138006	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	南明测试学生	13800138006	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
130	13800138013	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	息烽测试学生	13800138013	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
131	13800138014	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	开阳测试学生	13800138014	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
132	13800138015	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	贵安测试学生	13800138015	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
133	13800138016	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	市直属测试学生	13800138016	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
134	13800138017	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	市二小测试学生	13800138017	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
94	teacher_ky_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	丁晴	13900011001	teacher_ky_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-11-22 16:15:35.326638
137	13946061971	$2a$10$AqAZ2gBt7PtMcEBmn90paeOVsnl1lwmMQS.tGLsNQm.qpsFOWscs.	student	E2E测试学生1971	13946061971	\N	\N	active	2025-10-30 17:41:20.846127	2025-10-30 17:41:20.846127
138	13946249680	$2a$10$EFmSOoQG0UELv257IpvYIO853v2hIujqKNIdg9KX8p1Bc2eRurSH.	student	E2E测试学生9680	13946249680	\N	\N	active	2025-10-30 17:44:28.690077	2025-10-30 17:44:28.690077
139	13946802562	$2a$10$6tLD2L/KIdYzezZKOcSx3u0pgLkP7Ft.YIfBO6qePCjFy.TyroqOO	student	E2E测试学生2562	13946802562	\N	\N	active	2025-10-30 17:53:41.549463	2025-10-30 17:53:41.549463
140	13947171921	$2a$10$QP62UyCa5R0ikDYazankYuR9bYsm/MUBMELxKI05A6LTCJX8MjIme	student	E2E测试学生1921	13947171921	\N	\N	active	2025-10-30 17:59:50.573758	2025-10-30 17:59:50.573758
141	13947210455	$2a$10$Q6Wr6pBs7YJnkfpxhPD/ReC4deVCvO0YZZS4Tk9hJLdIfzFW2KuVi	student	E2E测试学生0455	13947210455	\N	\N	active	2025-10-30 18:00:29.071647	2025-10-30 18:00:32.803106
145	baiyun_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	白云区教育局管理员	13800138888	baiyun_admin@guiyang.edu.cn	\N	active	2025-11-02 08:38:09.278678	2025-11-08 13:55:03.71224
142	13947439550	$2a$10$26h.Be3fNIf97rQv3JNQv.8czYNHXf4GmoJ26iK/Zbx/mGnezn3Kq	student	E2E测试学生9550	13947439550	\N	\N	active	2025-10-30 18:04:18.070401	2025-10-30 18:04:23.598931
143	13947630976	$2a$10$KOQluCqPAEnSKnWvZq6bEuuogE435tdLfLQGs6roV80KgX8HVkHHy	student	E2E测试学生0976	13947630976	\N	\N	active	2025-10-30 18:07:29.588739	2025-10-30 18:07:35.103954
151	teacher_by_ps_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	陈刚-白云一小	13800138101	teacher_by_ps_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-14 05:48:22.72674
58	teacher_by_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	陈刚	13900004001	teacher_by_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-11-05 08:46:58.453346
163	teacher_yy_ps_math	$2a$10$yt7d5fcM5h3Lz/9M9QII.eRbMeWR8MfLkzH3tMXyaeCQZv1RNiR8K	teacher	蒋磊-云岩一小	13800138121	teacher_yy_ps_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-26 14:37:45.606822
152	teacher_by_ps_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	李敏-白云一小	13800138102	teacher_by_ps_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
153	teacher_by_ms_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	张华-白云一中	13800138103	teacher_by_ms_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
154	teacher_by_ms_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	王芳-白云一中	13800138104	teacher_by_ms_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
155	teacher_by_hs_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	刘强-白云一高	13800138105	teacher_by_hs_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
156	teacher_by_hs_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	杨丽-白云一高	13800138106	teacher_by_hs_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
157	teacher_nm_ps_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	赵勇-南明一小	13800138111	teacher_nm_ps_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
158	teacher_nm_ps_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	孙静-南明一小	13800138112	teacher_nm_ps_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
159	teacher_nm_ms_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	周杰-南明一中	13800138113	teacher_nm_ms_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
160	teacher_nm_ms_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	吴梅-南明一中	13800138114	teacher_nm_ms_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
161	teacher_nm_hs_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	郑鹏-南明一高	13800138115	teacher_nm_hs_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
162	teacher_nm_hs_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	冯娟-南明一高	13800138116	teacher_nm_hs_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
164	teacher_yy_ps_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	韩雪-云岩一小	13800138122	teacher_yy_ps_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
39	school_admin_yy_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	云岩区第一小学管理员	13800001001	admin_yy_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-11-30 12:00:02.19221
165	teacher_yy_ms_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	曹斌-云岩一中	13800138123	teacher_yy_ms_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
166	teacher_yy_ms_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	许红-云岩一中	13800138124	teacher_yy_ms_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
167	teacher_yy_hs_math	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	邓涛-云岩一高	13800138125	teacher_yy_hs_math@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
168	teacher_yy_hs_it	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	夏婷-云岩一高	13800138126	teacher_yy_hs_it@guiyang.edu	\N	active	2025-11-04 15:06:11.766625	2025-11-04 15:06:11.766625
170	13981700442	$2a$10$FOPVANcpgWBAB3KI6CN.sOEV3k/OYpQ2Ih9hRcA4N8KtmY2wXYrBW	student	API测试学生	13981700442	\N	\N	active	2025-11-07 13:56:33.792637	2025-11-07 13:56:33.792637
171	13981919889	$2a$10$oBAaG8zLbS60NYu4wssJMOX2gaSlafeOs.XzXhb3UnR3vWBAGNmR6	student	API测试学生	13981919889	\N	\N	active	2025-11-07 13:56:40.159383	2025-11-07 13:56:40.159383
172	13981967128	$2a$10$1dL/OmoL9Qe4FyWqVI565uynLYdjcDQ5ySN2odR0QQQ.DdohcQblq	student	API测试学生	13981967128	\N	\N	active	2025-11-26 14:09:57.106441	2025-11-26 14:09:57.106441
174	13812340002	$2a$10$OgOmi2hfAimF/pDsAvFpye5I12jiDPGVh.a0xX4pigZ35J1aWfQgC	student	云岩一小-李华	13812340002	\N	\N	active	2025-11-30 10:16:52.654603	2025-11-30 10:22:32.120684
175	13812340003	$2a$10$OgOmi2hfAimF/pDsAvFpye5I12jiDPGVh.a0xX4pigZ35J1aWfQgC	student	云岩一小-张伟	13812340003	\N	\N	active	2025-11-30 10:16:52.654603	2025-11-30 10:22:32.120684
173	13812340001	$2a$10$OgOmi2hfAimF/pDsAvFpye5I12jiDPGVh.a0xX4pigZ35J1aWfQgC	student	云岩一小-王明	13812340001	\N	\N	active	2025-11-30 10:16:52.654603	2025-11-30 11:58:51.487423
\.


--
-- Name: achievement_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.achievement_progress_id_seq', 1, false);


--
-- Name: achievements_achievement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.achievements_achievement_id_seq', 74, true);


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activities_id_seq', 298, true);


--
-- Name: activity_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_history_id_seq', 1, false);


--
-- Name: activity_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_questions_id_seq', 321, true);


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_permissions_id_seq', 57, true);


--
-- Name: announcement_reads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.announcement_reads_id_seq', 2, true);


--
-- Name: answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.answers_id_seq', 185, true);


--
-- Name: assessment_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessment_locations_id_seq', 3, true);


--
-- Name: assessment_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessment_registrations_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: certificates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificates_id_seq', 1, false);


--
-- Name: daily_tasks_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_tasks_task_id_seq', 21, true);


--
-- Name: district_ability_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.district_ability_stats_id_seq', 1, false);


--
-- Name: districts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.districts_id_seq', 14, true);


--
-- Name: import_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.import_logs_id_seq', 1, false);


--
-- Name: leaderboards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leaderboards_id_seq', 1, false);


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_preferences_id_seq', 1, false);


--
-- Name: notification_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_templates_id_seq', 10, true);


--
-- Name: points_transactions_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.points_transactions_transaction_id_seq', 1, false);


--
-- Name: question_bank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_id_seq', 1173, true);


--
-- Name: question_bank_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_id_seq1', 1234, true);


--
-- Name: question_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_categories_id_seq', 1, false);


--
-- Name: question_drafts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_drafts_id_seq', 636, true);


--
-- Name: question_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_reviews_id_seq', 14, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questions_id_seq', 29, true);


--
-- Name: registration_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registration_audit_log_id_seq', 162, true);


--
-- Name: school_ability_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.school_ability_stats_id_seq', 1, false);


--
-- Name: schools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schools_id_seq', 42, true);


--
-- Name: student_ability_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_ability_stats_id_seq', 90, true);


--
-- Name: student_achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_achievements_id_seq', 17, true);


--
-- Name: student_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_activities_id_seq', 122, true);


--
-- Name: student_daily_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_daily_tasks_id_seq', 1, false);


--
-- Name: student_knowledge_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_knowledge_stats_id_seq', 90, true);


--
-- Name: student_login_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_login_history_id_seq', 48, true);


--
-- Name: student_registration_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_registration_requests_id_seq', 64, true);


--
-- Name: student_task_progress_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_task_progress_progress_id_seq', 1, false);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 42, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subjects_id_seq', 2, true);


--
-- Name: system_announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_announcements_id_seq', 2, true);


--
-- Name: task_completion_history_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_completion_history_history_id_seq', 1, false);


--
-- Name: teacher_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teacher_permissions_id_seq', 56, true);


--
-- Name: teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teachers_id_seq', 57, true);


--
-- Name: teaching_class_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teaching_class_activities_id_seq', 1, false);


--
-- Name: teaching_class_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teaching_class_approvals_id_seq', 1, true);


--
-- Name: teaching_class_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teaching_class_members_id_seq', 1, true);


--
-- Name: teaching_class_teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teaching_class_teachers_id_seq', 4, true);


--
-- Name: teaching_classes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teaching_classes_id_seq', 4, true);


--
-- Name: user_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notifications_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 175, true);


--
-- Name: achievement_progress achievement_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_pkey PRIMARY KEY (id);


--
-- Name: achievement_progress achievement_progress_student_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_student_id_achievement_id_key UNIQUE (student_id, achievement_id);


--
-- Name: achievements achievements_achievement_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_achievement_code_key UNIQUE (achievement_code);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (achievement_id);


--
-- Name: activity_history activity_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT activity_history_pkey PRIMARY KEY (id);


--
-- Name: activity_questions activity_questions_activity_id_order_index_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_activity_id_order_index_key UNIQUE (activity_id, order_index);


--
-- Name: activity_questions activity_questions_activity_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_activity_id_question_id_key UNIQUE (activity_id, question_id);


--
-- Name: activity_questions activity_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: announcement_reads announcement_reads_announcement_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id);


--
-- Name: announcement_reads announcement_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_pkey PRIMARY KEY (id);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: answers answers_student_exam_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_student_exam_id_question_id_key UNIQUE (student_exam_id, question_id);


--
-- Name: assessment_locations assessment_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_pkey PRIMARY KEY (id);


--
-- Name: assessment_registrations assessment_registrations_activity_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_activity_id_student_id_key UNIQUE (activity_id, student_id);


--
-- Name: assessment_registrations assessment_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_cert_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_cert_no_key UNIQUE (cert_no);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: daily_tasks daily_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_tasks
    ADD CONSTRAINT daily_tasks_pkey PRIMARY KEY (task_id);


--
-- Name: daily_tasks daily_tasks_task_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_tasks
    ADD CONSTRAINT daily_tasks_task_code_key UNIQUE (task_code);


--
-- Name: district_ability_stats district_ability_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_ability_stats
    ADD CONSTRAINT district_ability_stats_pkey PRIMARY KEY (id);


--
-- Name: districts districts_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_code_key UNIQUE (code);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: activities exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: import_logs import_logs_batch_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_batch_id_key UNIQUE (batch_id);


--
-- Name: import_logs import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_pkey PRIMARY KEY (id);


--
-- Name: leaderboards leaderboards_leaderboard_type_scope_student_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboards
    ADD CONSTRAINT leaderboards_leaderboard_type_scope_student_id_period_start_key UNIQUE (leaderboard_type, scope, student_id, period_start);


--
-- Name: leaderboards leaderboards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboards
    ADD CONSTRAINT leaderboards_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notification_templates notification_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_code_key UNIQUE (code);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: points_transactions points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: question_bank_old_backup_20251122 question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey1 PRIMARY KEY (id);


--
-- Name: question_bank_old_backup_20251122 question_bank_question_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_question_code_key UNIQUE (question_code);


--
-- Name: question_bank question_bank_question_code_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_question_code_key1 UNIQUE (question_code);


--
-- Name: question_categories question_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_pkey PRIMARY KEY (id);


--
-- Name: question_drafts question_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_drafts
    ADD CONSTRAINT question_drafts_pkey PRIMARY KEY (id);


--
-- Name: question_reviews question_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: registration_audit_log registration_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_audit_log
    ADD CONSTRAINT registration_audit_log_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: school_ability_stats school_ability_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_ability_stats
    ADD CONSTRAINT school_ability_stats_pkey PRIMARY KEY (id);


--
-- Name: schools schools_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_code_key UNIQUE (code);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: student_ability_stats student_ability_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_ability_stats
    ADD CONSTRAINT student_ability_stats_pkey PRIMARY KEY (id);


--
-- Name: student_achievements student_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_pkey PRIMARY KEY (id);


--
-- Name: student_achievements student_achievements_student_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_student_id_achievement_id_key UNIQUE (student_id, achievement_id);


--
-- Name: student_daily_tasks student_daily_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_pkey PRIMARY KEY (id);


--
-- Name: student_daily_tasks student_daily_tasks_student_id_task_id_task_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_student_id_task_id_task_date_key UNIQUE (student_id, task_id, task_date);


--
-- Name: student_activities student_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_exams_pkey PRIMARY KEY (id);


--
-- Name: student_activities student_exams_student_id_exam_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_exams_student_id_exam_id_key UNIQUE (student_id, activity_id);


--
-- Name: student_knowledge_stats student_knowledge_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_knowledge_stats
    ADD CONSTRAINT student_knowledge_stats_pkey PRIMARY KEY (id);


--
-- Name: student_login_history student_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT student_login_history_pkey PRIMARY KEY (id);


--
-- Name: student_points student_points_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_points
    ADD CONSTRAINT student_points_pkey PRIMARY KEY (student_id);


--
-- Name: student_registration_requests student_registration_requests_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_phone_key UNIQUE (phone);


--
-- Name: student_registration_requests student_registration_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_pkey PRIMARY KEY (id);


--
-- Name: student_task_progress student_task_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_pkey PRIMARY KEY (progress_id);


--
-- Name: student_task_progress student_task_progress_student_id_task_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_student_id_task_id_period_start_key UNIQUE (student_id, task_id, period_start);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_student_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_no_key UNIQUE (student_no);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_subject_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_subject_code_key UNIQUE (subject_code);


--
-- Name: subjects subjects_subject_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_subject_name_key UNIQUE (subject_name);


--
-- Name: system_announcements system_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_pkey PRIMARY KEY (id);


--
-- Name: task_completion_history task_completion_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_completion_history
    ADD CONSTRAINT task_completion_history_pkey PRIMARY KEY (history_id);


--
-- Name: teacher_permissions teacher_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_pkey PRIMARY KEY (id);


--
-- Name: teacher_permissions teacher_permissions_unique_grant; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_unique_grant UNIQUE (user_id, permission_type, scope_level, district_id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_teacher_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_teacher_no_key UNIQUE (teacher_no);


--
-- Name: teaching_class_activities teaching_class_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_approvals teaching_class_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_approvals
    ADD CONSTRAINT teaching_class_approvals_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_members teaching_class_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT teaching_class_members_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_teachers teaching_class_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT teaching_class_teachers_pkey PRIMARY KEY (id);


--
-- Name: teaching_classes teaching_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_pkey PRIMARY KEY (id);


--
-- Name: teaching_class_activities unique_class_activity; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT unique_class_activity UNIQUE (teaching_class_id, activity_id);


--
-- Name: teaching_class_members unique_class_student; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT unique_class_student UNIQUE (teaching_class_id, student_id);


--
-- Name: teaching_class_teachers unique_class_teacher; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT unique_class_teacher UNIQUE (teaching_class_id, teacher_id);


--
-- Name: district_ability_stats unique_district_ability_period; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_ability_stats
    ADD CONSTRAINT unique_district_ability_period UNIQUE (district_id, ability, subject, period_start, period_end);


--
-- Name: question_bank unique_draft_scope; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT unique_draft_scope UNIQUE (draft_id, scope);


--
-- Name: school_ability_stats unique_school_ability_period; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_ability_stats
    ADD CONSTRAINT unique_school_ability_period UNIQUE (school_id, ability, subject, period_start, period_end);


--
-- Name: student_ability_stats unique_student_ability; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_ability_stats
    ADD CONSTRAINT unique_student_ability UNIQUE (student_id, ability, subject);


--
-- Name: student_knowledge_stats unique_student_knowledge; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_knowledge_stats
    ADD CONSTRAINT unique_student_knowledge UNIQUE (student_id, knowledge_point, subject);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_achievement_progress_achievement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_achievement_progress_achievement ON public.achievement_progress USING btree (achievement_id);


--
-- Name: idx_achievement_progress_percentage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_achievement_progress_percentage ON public.achievement_progress USING btree (progress_percentage);


--
-- Name: idx_achievement_progress_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_achievement_progress_student ON public.achievement_progress USING btree (student_id);


--
-- Name: idx_achievements_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_achievements_active ON public.achievements USING btree (is_active);


--
-- Name: idx_achievements_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_achievements_category ON public.achievements USING btree (category);


--
-- Name: idx_achievements_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_achievements_display_order ON public.achievements USING btree (display_order);


--
-- Name: idx_achievements_rarity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_achievements_rarity ON public.achievements USING btree (rarity);


--
-- Name: idx_activities_ability_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_ability_level ON public.activities USING btree (ability_level);


--
-- Name: idx_activities_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_created_by ON public.activities USING btree (created_by);


--
-- Name: idx_activities_is_official; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_is_official ON public.activities USING btree (is_official);


--
-- Name: idx_activities_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_scope ON public.activities USING btree (scope);


--
-- Name: idx_activities_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_status ON public.activities USING btree (status);


--
-- Name: idx_activities_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_subject ON public.activities USING btree (subject);


--
-- Name: idx_activities_subject_ability_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_subject_ability_level ON public.activities USING btree (subject, ability_level);


--
-- Name: idx_activities_time_limit_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_time_limit_type ON public.activities USING btree (time_limit_type);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_type ON public.activities USING btree (type);


--
-- Name: idx_activities_type_ability_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_type_ability_level ON public.activities USING btree (type, ability_level);


--
-- Name: idx_activities_type_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_type_subject ON public.activities USING btree (type, subject);


--
-- Name: idx_activity_history_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_history_activity_id ON public.activity_history USING btree (activity_id);


--
-- Name: idx_activity_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_history_created_at ON public.activity_history USING btree (created_at DESC);


--
-- Name: idx_activity_questions_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_questions_activity_id ON public.activity_questions USING btree (activity_id);


--
-- Name: idx_activity_questions_activity_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_questions_activity_order ON public.activity_questions USING btree (activity_id, order_index);


--
-- Name: idx_activity_questions_question_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_questions_question_id ON public.activity_questions USING btree (question_id);


--
-- Name: idx_admin_permissions_district_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_permissions_district_id ON public.admin_permissions USING btree (district_id);


--
-- Name: idx_admin_permissions_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_permissions_school_id ON public.admin_permissions USING btree (school_id);


--
-- Name: idx_admin_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_permissions_user_id ON public.admin_permissions USING btree (user_id);


--
-- Name: idx_announcement_reads_announcement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcement_reads_announcement ON public.announcement_reads USING btree (announcement_id);


--
-- Name: idx_announcement_reads_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcement_reads_user ON public.announcement_reads USING btree (user_id);


--
-- Name: idx_answers_graded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_graded_by ON public.answers USING btree (graded_by, graded_at) WHERE (graded_by IS NOT NULL);


--
-- Name: idx_answers_grading_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_grading_status ON public.answers USING btree (grading_status, student_exam_id) WHERE ((grading_status)::text = 'pending'::text);


--
-- Name: idx_answers_student_exam_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_student_exam_id ON public.answers USING btree (student_exam_id);


--
-- Name: idx_assessment_locations_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_locations_active ON public.assessment_locations USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_assessment_locations_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_locations_activity ON public.assessment_locations USING btree (activity_id);


--
-- Name: idx_assessment_locations_district; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_locations_district ON public.assessment_locations USING btree (district_id);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_action ON public.registration_audit_log USING btree (action);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_created ON public.registration_audit_log USING btree (created_at);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_request ON public.registration_audit_log USING btree (request_id);


--
-- Name: idx_daily_tasks_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_tasks_active ON public.daily_tasks USING btree (is_active);


--
-- Name: idx_daily_tasks_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_tasks_category ON public.daily_tasks USING btree (category);


--
-- Name: idx_daily_tasks_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_tasks_is_active ON public.daily_tasks USING btree (is_active);


--
-- Name: idx_daily_tasks_task_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_tasks_task_type ON public.daily_tasks USING btree (task_type);


--
-- Name: idx_daily_tasks_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_tasks_type ON public.daily_tasks USING btree (task_type);


--
-- Name: idx_daily_tasks_valid_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_tasks_valid_dates ON public.daily_tasks USING btree (valid_from, valid_to);


--
-- Name: idx_district_ability_stats_ability; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_district_ability_stats_ability ON public.district_ability_stats USING btree (ability);


--
-- Name: idx_district_ability_stats_accuracy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_district_ability_stats_accuracy ON public.district_ability_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_district_ability_stats_district_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_district_ability_stats_district_id ON public.district_ability_stats USING btree (district_id);


--
-- Name: idx_district_ability_stats_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_district_ability_stats_period ON public.district_ability_stats USING btree (period_start, period_end);


--
-- Name: idx_district_ability_stats_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_district_ability_stats_subject ON public.district_ability_stats USING btree (subject);


--
-- Name: idx_districts_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_districts_code ON public.districts USING btree (code);


--
-- Name: idx_exams_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exams_status ON public.activities USING btree (status);


--
-- Name: idx_exams_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exams_subject ON public.activities USING btree (subject);


--
-- Name: idx_leaderboard_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaderboard_period ON public.leaderboards USING btree (period_start, period_end);


--
-- Name: idx_leaderboard_rank; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaderboard_rank ON public.leaderboards USING btree (leaderboard_type, scope, rank);


--
-- Name: idx_leaderboard_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaderboard_student ON public.leaderboards USING btree (student_id);


--
-- Name: idx_leaderboard_type_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaderboard_type_scope ON public.leaderboards USING btree (leaderboard_type, scope);


--
-- Name: idx_points_transactions_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_points_transactions_expires ON public.points_transactions USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_points_transactions_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_points_transactions_source ON public.points_transactions USING btree (source_type, source_id);


--
-- Name: idx_points_transactions_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_points_transactions_student ON public.points_transactions USING btree (student_id);


--
-- Name: idx_points_transactions_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_points_transactions_time ON public.points_transactions USING btree (created_at DESC);


--
-- Name: idx_points_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_points_transactions_type ON public.points_transactions USING btree (transaction_type);


--
-- Name: idx_question_bank_abilities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_abilities ON public.question_bank_old_backup_20251122 USING gin (abilities);


--
-- Name: idx_question_bank_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_active ON public.question_bank_old_backup_20251122 USING btree (is_active);


--
-- Name: idx_question_bank_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_category ON public.question_bank_old_backup_20251122 USING btree (category_id);


--
-- Name: idx_question_bank_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_code ON public.question_bank_old_backup_20251122 USING btree (question_code);


--
-- Name: idx_question_bank_difficulty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_difficulty ON public.question_bank_old_backup_20251122 USING btree (difficulty);


--
-- Name: idx_question_bank_district_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_district_id ON public.question_bank USING btree (district_id);


--
-- Name: idx_question_bank_draft_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_draft_id ON public.question_bank USING btree (draft_id);


--
-- Name: idx_question_bank_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_grade ON public.question_bank_old_backup_20251122 USING btree (grade);


--
-- Name: idx_question_bank_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_is_active ON public.question_bank USING btree (is_active);


--
-- Name: idx_question_bank_knowledge_points; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_knowledge_points ON public.question_bank_old_backup_20251122 USING gin (knowledge_points);


--
-- Name: idx_question_bank_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_level ON public.question_bank_old_backup_20251122 USING btree (level);


--
-- Name: idx_question_bank_published_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_published_by ON public.question_bank USING btree (published_by);


--
-- Name: idx_question_bank_reviewer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_reviewer_id ON public.question_bank_old_backup_20251122 USING btree (reviewer_id);


--
-- Name: idx_question_bank_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_school_id ON public.question_bank USING btree (school_id);


--
-- Name: idx_question_bank_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_scope ON public.question_bank_old_backup_20251122 USING gin (scope);


--
-- Name: idx_question_bank_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_status ON public.question_bank_old_backup_20251122 USING btree (status);


--
-- Name: idx_question_bank_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_subject ON public.question_bank_old_backup_20251122 USING btree (subject);


--
-- Name: idx_question_bank_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_tags ON public.question_bank_old_backup_20251122 USING gin (tags);


--
-- Name: idx_question_bank_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_type ON public.question_bank_old_backup_20251122 USING btree (type);


--
-- Name: idx_question_drafts_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_drafts_created_by ON public.question_drafts USING btree (created_by);


--
-- Name: idx_question_drafts_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_drafts_grade ON public.question_drafts USING btree (grade);


--
-- Name: idx_question_drafts_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_drafts_is_active ON public.question_drafts USING btree (is_active);


--
-- Name: idx_question_drafts_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_drafts_level ON public.question_drafts USING btree (level);


--
-- Name: idx_question_drafts_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_drafts_subject ON public.question_drafts USING btree (subject);


--
-- Name: idx_question_reviews_question_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_reviews_question_id ON public.question_reviews USING btree (question_id);


--
-- Name: idx_question_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_reviews_reviewer_id ON public.question_reviews USING btree (reviewer_id);


--
-- Name: idx_questions_exam_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_exam_id ON public.questions USING btree (exam_id);


--
-- Name: idx_registration_district; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registration_district ON public.student_registration_requests USING btree (district_code);


--
-- Name: idx_registration_escalation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registration_escalation ON public.student_registration_requests USING btree (last_escalated_at, status);


--
-- Name: idx_registration_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registration_phone ON public.student_registration_requests USING btree (phone);


--
-- Name: idx_registration_reviewer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registration_reviewer ON public.student_registration_requests USING btree (current_reviewer_id);


--
-- Name: idx_registration_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registration_school ON public.student_registration_requests USING btree (school_code);


--
-- Name: idx_registration_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registration_status ON public.student_registration_requests USING btree (status);


--
-- Name: idx_registrations_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registrations_activity ON public.assessment_registrations USING btree (activity_id);


--
-- Name: idx_registrations_activity_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registrations_activity_status ON public.assessment_registrations USING btree (activity_id, status);


--
-- Name: idx_registrations_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registrations_location ON public.assessment_registrations USING btree (location_id);


--
-- Name: idx_registrations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registrations_status ON public.assessment_registrations USING btree (status);


--
-- Name: idx_registrations_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registrations_student ON public.assessment_registrations USING btree (student_id);


--
-- Name: idx_school_ability_stats_ability; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_ability_stats_ability ON public.school_ability_stats USING btree (ability);


--
-- Name: idx_school_ability_stats_accuracy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_ability_stats_accuracy ON public.school_ability_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_school_ability_stats_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_ability_stats_period ON public.school_ability_stats USING btree (period_start, period_end);


--
-- Name: idx_school_ability_stats_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_ability_stats_school_id ON public.school_ability_stats USING btree (school_id);


--
-- Name: idx_school_ability_stats_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_ability_stats_subject ON public.school_ability_stats USING btree (subject);


--
-- Name: idx_schools_district_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_district_id ON public.schools USING btree (district_id);


--
-- Name: idx_schools_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_type ON public.schools USING btree (type);


--
-- Name: idx_student_ability_stats_ability; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_ability_stats_ability ON public.student_ability_stats USING btree (ability);


--
-- Name: idx_student_ability_stats_accuracy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_ability_stats_accuracy ON public.student_ability_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_student_ability_stats_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_ability_stats_student_id ON public.student_ability_stats USING btree (student_id);


--
-- Name: idx_student_ability_stats_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_ability_stats_subject ON public.student_ability_stats USING btree (subject);


--
-- Name: idx_student_achievements_achievement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_achievements_achievement ON public.student_achievements USING btree (achievement_id);


--
-- Name: idx_student_achievements_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_achievements_composite ON public.student_achievements USING btree (student_id, achievement_id);


--
-- Name: idx_student_achievements_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_achievements_student ON public.student_achievements USING btree (student_id);


--
-- Name: idx_student_achievements_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_achievements_time ON public.student_achievements USING btree (achieved_at DESC);


--
-- Name: idx_student_activities_auto_submit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_activities_auto_submit ON public.student_activities USING btree (status, time_limit_deadline) WHERE (((status)::text = 'in_progress'::text) AND (time_limit_deadline IS NOT NULL));


--
-- Name: idx_student_activities_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_activities_deadline ON public.student_activities USING btree (time_limit_deadline) WHERE ((status)::text = 'in_progress'::text);


--
-- Name: idx_student_activities_grading_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_activities_grading_status ON public.student_activities USING btree (grading_status, activity_id) WHERE ((grading_status)::text = ANY ((ARRAY['pending'::character varying, 'partial_graded'::character varying])::text[]));


--
-- Name: idx_student_daily_tasks_completed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_daily_tasks_completed ON public.student_daily_tasks USING btree (is_completed);


--
-- Name: idx_student_daily_tasks_student_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_daily_tasks_student_date ON public.student_daily_tasks USING btree (student_id, task_date);


--
-- Name: idx_student_daily_tasks_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_daily_tasks_task ON public.student_daily_tasks USING btree (task_id);


--
-- Name: idx_student_exams_exam_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_exams_exam_id ON public.student_activities USING btree (activity_id);


--
-- Name: idx_student_exams_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_exams_student_id ON public.student_activities USING btree (student_id);


--
-- Name: idx_student_knowledge_stats_accuracy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_knowledge_stats_accuracy ON public.student_knowledge_stats USING btree (accuracy_rate DESC);


--
-- Name: idx_student_knowledge_stats_knowledge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_knowledge_stats_knowledge ON public.student_knowledge_stats USING btree (knowledge_point);


--
-- Name: idx_student_knowledge_stats_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_knowledge_stats_student_id ON public.student_knowledge_stats USING btree (student_id);


--
-- Name: idx_student_knowledge_stats_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_knowledge_stats_subject ON public.student_knowledge_stats USING btree (subject);


--
-- Name: idx_student_login_history_login_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_login_history_login_date ON public.student_login_history USING btree (login_date);


--
-- Name: idx_student_login_history_student_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_login_history_student_date ON public.student_login_history USING btree (student_id, login_date DESC);


--
-- Name: idx_student_login_history_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_login_history_student_id ON public.student_login_history USING btree (student_id);


--
-- Name: idx_student_login_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_login_history_user_id ON public.student_login_history USING btree (user_id);


--
-- Name: idx_student_login_unique_daily; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_student_login_unique_daily ON public.student_login_history USING btree (student_id, login_date);


--
-- Name: idx_student_points_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_points_current ON public.student_points USING btree (current_points DESC);


--
-- Name: idx_student_points_total; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_points_total ON public.student_points USING btree (total_points DESC);


--
-- Name: idx_student_task_progress_completed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_task_progress_completed ON public.student_task_progress USING btree (is_completed);


--
-- Name: idx_student_task_progress_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_task_progress_period ON public.student_task_progress USING btree (period_start, period_end);


--
-- Name: idx_student_task_progress_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_task_progress_student ON public.student_task_progress USING btree (student_id);


--
-- Name: idx_student_task_progress_student_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_task_progress_student_period ON public.student_task_progress USING btree (student_id, period_start);


--
-- Name: idx_student_task_progress_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_task_progress_task ON public.student_task_progress USING btree (task_id);


--
-- Name: idx_students_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_id ON public.students USING btree (school_id);


--
-- Name: idx_students_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_user_id ON public.students USING btree (user_id);


--
-- Name: idx_subjects_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subjects_active ON public.subjects USING btree (is_active);


--
-- Name: idx_subjects_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subjects_code ON public.subjects USING btree (subject_code);


--
-- Name: idx_subjects_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subjects_name ON public.subjects USING btree (subject_name);


--
-- Name: idx_subjects_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subjects_order ON public.subjects USING btree (display_order);


--
-- Name: idx_system_announcements_pinned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_announcements_pinned ON public.system_announcements USING btree (is_pinned, published_at DESC) WHERE ((status)::text = 'published'::text);


--
-- Name: idx_system_announcements_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_announcements_published ON public.system_announcements USING btree (published_at DESC) WHERE ((status)::text = 'published'::text);


--
-- Name: idx_system_announcements_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_announcements_status ON public.system_announcements USING btree (status);


--
-- Name: idx_system_announcements_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_announcements_target ON public.system_announcements USING btree (target_audience);


--
-- Name: idx_task_history_completion_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_history_completion_time ON public.task_completion_history USING btree (completion_time);


--
-- Name: idx_task_history_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_history_student ON public.task_completion_history USING btree (student_id);


--
-- Name: idx_task_history_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_history_task ON public.task_completion_history USING btree (task_id);


--
-- Name: idx_tca_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tca_class ON public.teaching_class_approvals USING btree (teaching_class_id);


--
-- Name: idx_tca_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tca_created_at ON public.teaching_class_approvals USING btree (created_at);


--
-- Name: idx_tca_reviewer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tca_reviewer ON public.teaching_class_approvals USING btree (reviewer_id);


--
-- Name: idx_tcact_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tcact_activity ON public.teaching_class_activities USING btree (activity_id);


--
-- Name: idx_tcact_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tcact_class ON public.teaching_class_activities USING btree (teaching_class_id);


--
-- Name: idx_tcm_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tcm_active ON public.teaching_class_members USING btree (is_active);


--
-- Name: idx_tcm_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tcm_class ON public.teaching_class_members USING btree (teaching_class_id);


--
-- Name: idx_tcm_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tcm_student ON public.teaching_class_members USING btree (student_id);


--
-- Name: idx_tct_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tct_class ON public.teaching_class_teachers USING btree (teaching_class_id);


--
-- Name: idx_tct_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tct_teacher ON public.teaching_class_teachers USING btree (teacher_id);


--
-- Name: idx_teacher_permissions_district_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_permissions_district_id ON public.teacher_permissions USING btree (district_id);


--
-- Name: idx_teacher_permissions_permission_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_permissions_permission_type ON public.teacher_permissions USING btree (permission_type);


--
-- Name: idx_teacher_permissions_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_permissions_school_id ON public.teacher_permissions USING btree (school_id);


--
-- Name: idx_teacher_permissions_scope_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_permissions_scope_level ON public.teacher_permissions USING btree (scope_level);


--
-- Name: idx_teacher_permissions_subjects; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_permissions_subjects ON public.teacher_permissions USING gin (subjects);


--
-- Name: idx_teacher_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_permissions_user_id ON public.teacher_permissions USING btree (user_id);


--
-- Name: idx_teachers_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teachers_school_id ON public.teachers USING btree (school_id);


--
-- Name: idx_teachers_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teachers_user_id ON public.teachers USING btree (user_id);


--
-- Name: idx_teaching_classes_academic_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_classes_academic_year ON public.teaching_classes USING btree (academic_year);


--
-- Name: idx_teaching_classes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_classes_created_by ON public.teaching_classes USING btree (created_by);


--
-- Name: idx_teaching_classes_district; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_classes_district ON public.teaching_classes USING btree (district_id);


--
-- Name: idx_teaching_classes_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_classes_school ON public.teaching_classes USING btree (school_id);


--
-- Name: idx_teaching_classes_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_classes_scope ON public.teaching_classes USING btree (scope);


--
-- Name: idx_teaching_classes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_classes_status ON public.teaching_classes USING btree (status);


--
-- Name: idx_user_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_created_at ON public.user_notifications USING btree (created_at DESC);


--
-- Name: idx_user_notifications_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_expires ON public.user_notifications USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_user_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_type ON public.user_notifications USING btree (type);


--
-- Name: idx_user_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications USING btree (user_id);


--
-- Name: idx_user_notifications_user_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_user_unread ON public.user_notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: question_bank before_insert_update_question_bank; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER before_insert_update_question_bank BEFORE INSERT OR UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.extract_scope_ids();


--
-- Name: assessment_locations trigger_assessment_location_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_assessment_location_updated_at BEFORE UPDATE ON public.assessment_locations FOR EACH ROW EXECUTE FUNCTION public.update_assessment_location_updated_at();


--
-- Name: question_bank_old_backup_20251122 trigger_auto_generate_question_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_generate_question_code BEFORE INSERT ON public.question_bank_old_backup_20251122 FOR EACH ROW EXECUTE FUNCTION public.auto_generate_question_code();


--
-- Name: student_task_progress trigger_calculate_task_completion_rate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_calculate_task_completion_rate BEFORE INSERT OR UPDATE ON public.student_task_progress FOR EACH ROW EXECUTE FUNCTION public.calculate_task_completion_rate();


--
-- Name: notification_preferences trigger_notification_preferences_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_notification_preferences_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: notification_templates trigger_notification_templates_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_notification_templates_updated BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: assessment_registrations trigger_registration_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_registration_updated_at BEFORE UPDATE ON public.assessment_registrations FOR EACH ROW EXECUTE FUNCTION public.update_registration_updated_at();


--
-- Name: system_announcements trigger_system_announcements_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_system_announcements_updated BEFORE UPDATE ON public.system_announcements FOR EACH ROW EXECUTE FUNCTION public.update_notification_timestamp();


--
-- Name: teaching_classes trigger_teaching_class_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_teaching_class_updated_at BEFORE UPDATE ON public.teaching_classes FOR EACH ROW EXECUTE FUNCTION public.update_teaching_class_updated_at();


--
-- Name: activity_questions trigger_update_activity_stats_on_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_activity_stats_on_delete AFTER DELETE ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_activity_paper_stats();


--
-- Name: activity_questions trigger_update_activity_stats_on_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_activity_stats_on_insert AFTER INSERT ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_activity_paper_stats();


--
-- Name: activity_questions trigger_update_activity_stats_on_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_activity_stats_on_update AFTER UPDATE OF score ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_activity_paper_stats();


--
-- Name: daily_tasks trigger_update_daily_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_daily_tasks_updated_at BEFORE UPDATE ON public.daily_tasks FOR EACH ROW EXECUTE FUNCTION public.update_daily_tasks_updated_at();


--
-- Name: answers trigger_update_grading_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_grading_status AFTER INSERT OR UPDATE OF grading_status, score ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_student_activity_grading_status();


--
-- Name: assessment_registrations trigger_update_location_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_location_count AFTER INSERT OR DELETE OR UPDATE ON public.assessment_registrations FOR EACH ROW EXECUTE FUNCTION public.update_location_registered_count();


--
-- Name: student_registration_requests trigger_update_registration_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_registration_updated_at BEFORE UPDATE ON public.student_registration_requests FOR EACH ROW EXECUTE FUNCTION public.update_registration_updated_at();


--
-- Name: answers trigger_update_student_ability_stats; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_student_ability_stats AFTER INSERT OR UPDATE OF score, is_correct ON public.answers FOR EACH ROW WHEN (((new.score IS NOT NULL) AND (new.is_correct IS NOT NULL))) EXECUTE FUNCTION public.update_student_ability_stats();


--
-- Name: answers trigger_update_student_knowledge_stats; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_student_knowledge_stats AFTER INSERT OR UPDATE OF score, is_correct ON public.answers FOR EACH ROW WHEN (((new.score IS NOT NULL) AND (new.is_correct IS NOT NULL))) EXECUTE FUNCTION public.update_student_knowledge_stats();


--
-- Name: student_task_progress trigger_update_student_task_progress_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_student_task_progress_updated_at BEFORE UPDATE ON public.student_task_progress FOR EACH ROW EXECUTE FUNCTION public.update_student_task_progress_updated_at();


--
-- Name: activities trigger_validate_activity_time_limit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_activity_time_limit BEFORE INSERT OR UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.validate_activity_time_limit();


--
-- Name: teacher_permissions trigger_validate_teacher_permission; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_teacher_permission BEFORE INSERT OR UPDATE ON public.teacher_permissions FOR EACH ROW EXECUTE FUNCTION public.validate_teacher_permission();


--
-- Name: achievements update_achievements_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_questions update_activity_questions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_activity_questions_updated_at BEFORE UPDATE ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: answers update_answers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_tasks update_daily_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_daily_tasks_updated_at BEFORE UPDATE ON public.daily_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities update_exams_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_points update_points_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_points_timestamp BEFORE UPDATE ON public.student_points FOR EACH ROW EXECUTE FUNCTION public.update_student_points_timestamp();


--
-- Name: achievement_progress update_progress_percentage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_progress_percentage BEFORE INSERT OR UPDATE ON public.achievement_progress FOR EACH ROW EXECUTE FUNCTION public.update_achievement_progress_percentage();


--
-- Name: subjects update_subjects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teacher_permissions update_teacher_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_teacher_permissions_updated_at BEFORE UPDATE ON public.teacher_permissions FOR EACH ROW EXECUTE FUNCTION public.update_teacher_permissions_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: achievement_progress achievement_progress_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(achievement_id) ON DELETE CASCADE;


--
-- Name: achievement_progress achievement_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: achievements achievements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: activity_history activity_history_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT activity_history_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_history activity_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT activity_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: activity_questions activity_questions_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_questions activity_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: admin_permissions admin_permissions_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: admin_permissions admin_permissions_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: admin_permissions admin_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: announcement_reads announcement_reads_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.system_announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_reads announcement_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: answers answers_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: answers answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: answers answers_student_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_student_exam_id_fkey FOREIGN KEY (student_exam_id) REFERENCES public.student_activities(id) ON DELETE CASCADE;


--
-- Name: assessment_locations assessment_locations_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: assessment_locations assessment_locations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: assessment_locations assessment_locations_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_locations
    ADD CONSTRAINT assessment_locations_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: assessment_registrations assessment_registrations_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: assessment_registrations assessment_registrations_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: assessment_registrations assessment_registrations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.assessment_locations(id) ON DELETE SET NULL;


--
-- Name: assessment_registrations assessment_registrations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: assessment_registrations assessment_registrations_student_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_student_activity_id_fkey FOREIGN KEY (student_activity_id) REFERENCES public.student_activities(id) ON DELETE SET NULL;


--
-- Name: assessment_registrations assessment_registrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_registrations
    ADD CONSTRAINT assessment_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: certificates certificates_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.activities(id);


--
-- Name: certificates certificates_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: district_ability_stats district_ability_stats_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.district_ability_stats
    ADD CONSTRAINT district_ability_stats_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: activities exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: student_login_history fk_student_login_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT fk_student_login_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_login_history fk_student_login_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT fk_student_login_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: import_logs import_logs_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.users(id);


--
-- Name: leaderboards leaderboards_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboards
    ADD CONSTRAINT leaderboards_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: points_transactions points_transactions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: question_bank_old_backup_20251122 question_bank_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.question_categories(id);


--
-- Name: question_bank_old_backup_20251122 question_bank_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: question_bank question_bank_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.question_drafts(id) ON DELETE CASCADE;


--
-- Name: question_bank_old_backup_20251122 question_bank_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_published_by_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_published_by_fkey1 FOREIGN KEY (published_by) REFERENCES public.users(id);


--
-- Name: question_bank_old_backup_20251122 question_bank_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_old_backup_20251122
    ADD CONSTRAINT question_bank_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_reviewer_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_reviewer_id_fkey1 FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: question_categories question_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.question_categories(id);


--
-- Name: question_drafts question_drafts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_drafts
    ADD CONSTRAINT question_drafts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: question_reviews question_reviews_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank_old_backup_20251122(id) ON DELETE CASCADE;


--
-- Name: question_reviews question_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: registration_audit_log registration_audit_log_action_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_audit_log
    ADD CONSTRAINT registration_audit_log_action_by_fkey FOREIGN KEY (action_by) REFERENCES public.users(id);


--
-- Name: registration_audit_log registration_audit_log_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_audit_log
    ADD CONSTRAINT registration_audit_log_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.student_registration_requests(id) ON DELETE CASCADE;


--
-- Name: school_ability_stats school_ability_stats_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_ability_stats
    ADD CONSTRAINT school_ability_stats_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: schools schools_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: student_ability_stats student_ability_stats_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_ability_stats
    ADD CONSTRAINT student_ability_stats_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_achievements student_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(achievement_id) ON DELETE CASCADE;


--
-- Name: student_achievements student_achievements_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_activities student_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: student_activities student_activities_previous_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_activities_previous_attempt_id_fkey FOREIGN KEY (previous_attempt_id) REFERENCES public.student_activities(id);


--
-- Name: student_activities student_activities_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities
    ADD CONSTRAINT student_activities_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_daily_tasks student_daily_tasks_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_daily_tasks student_daily_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_tasks
    ADD CONSTRAINT student_daily_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(task_id) ON DELETE CASCADE;


--
-- Name: student_knowledge_stats student_knowledge_stats_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_knowledge_stats
    ADD CONSTRAINT student_knowledge_stats_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_points student_points_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_points
    ADD CONSTRAINT student_points_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_registration_requests student_registration_requests_current_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_current_reviewer_id_fkey FOREIGN KEY (current_reviewer_id) REFERENCES public.users(id);


--
-- Name: student_registration_requests student_registration_requests_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: student_registration_requests student_registration_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: student_registration_requests student_registration_requests_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: student_registration_requests student_registration_requests_student_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests
    ADD CONSTRAINT student_registration_requests_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.users(id);


--
-- Name: student_task_progress student_task_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_task_progress student_task_progress_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_task_progress
    ADD CONSTRAINT student_task_progress_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(task_id) ON DELETE CASCADE;


--
-- Name: students students_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_announcements system_announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: system_announcements system_announcements_target_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_target_district_id_fkey FOREIGN KEY (target_district_id) REFERENCES public.districts(id);


--
-- Name: system_announcements system_announcements_target_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_target_school_id_fkey FOREIGN KEY (target_school_id) REFERENCES public.schools(id);


--
-- Name: task_completion_history task_completion_history_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_completion_history
    ADD CONSTRAINT task_completion_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: task_completion_history task_completion_history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_completion_history
    ADD CONSTRAINT task_completion_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.daily_tasks(task_id) ON DELETE CASCADE;


--
-- Name: teacher_permissions teacher_permissions_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: teacher_permissions teacher_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: teacher_permissions teacher_permissions_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: teacher_permissions teacher_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teachers teachers_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teaching_class_activities teaching_class_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: teaching_class_activities teaching_class_activities_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: teaching_class_activities teaching_class_activities_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_activities
    ADD CONSTRAINT teaching_class_activities_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_class_approvals teaching_class_approvals_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_approvals
    ADD CONSTRAINT teaching_class_approvals_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: teaching_class_approvals teaching_class_approvals_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_approvals
    ADD CONSTRAINT teaching_class_approvals_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_class_members teaching_class_members_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT teaching_class_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: teaching_class_members teaching_class_members_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_members
    ADD CONSTRAINT teaching_class_members_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_class_teachers teaching_class_teachers_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT teaching_class_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: teaching_class_teachers teaching_class_teachers_teaching_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_class_teachers
    ADD CONSTRAINT teaching_class_teachers_teaching_class_id_fkey FOREIGN KEY (teaching_class_id) REFERENCES public.teaching_classes(id) ON DELETE CASCADE;


--
-- Name: teaching_classes teaching_classes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: teaching_classes teaching_classes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: teaching_classes teaching_classes_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: teaching_classes teaching_classes_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_classes
    ADD CONSTRAINT teaching_classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 54ajBbRIB2UVGzMEtlavjeoDimD8dRpQXiqMeogUXULT9NbTZNW29V7pOhNOJcZ

