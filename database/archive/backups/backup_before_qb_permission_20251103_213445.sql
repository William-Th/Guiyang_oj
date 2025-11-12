--
-- PostgreSQL database dump
--

\restrict 5uth1yU6JvMEgGhEUCBu6rFPqxqaVgbx5u5S6cCA3e87NkFuPuC6bviLYxlui8G

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
    ELSE v_subject_code := 'OTHR'; -- 其他科目
  END CASE;

  -- 获取日期部分 (YYMMDD)
  v_date_part := TO_CHAR(p_created_at, 'YYMMDD');

  -- 获取当天该科目的序号
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

CREATE FUNCTION public.get_activity_paper(p_activity_id integer) RETURNS TABLE(question_id integer, order_index integer, score numeric, is_required boolean, section character varying, question_code character varying, question_type character varying, content text, options jsonb, correct_answer text, difficulty character varying, subject character varying, grade character varying, knowledge_points text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    aq.question_id,
    aq.order_index,
    aq.score,
    aq.is_required,
    aq.section,
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
-- Name: FUNCTION get_activity_paper(p_activity_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_activity_paper(p_activity_id integer) IS '获取活动的完整试卷信息（包含题目详情）';


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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    CONSTRAINT activities_paper_status_check CHECK (((paper_status)::text = ANY ((ARRAY['empty'::character varying, 'draft'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT activities_time_limit_type_check CHECK (((time_limit_type)::text = ANY ((ARRAY['unlimited'::character varying, 'scheduled'::character varying, 'timed'::character varying])::text[]))),
    CONSTRAINT check_scheduled_time_range CHECK (((((time_limit_type)::text = 'scheduled'::text) AND (start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (duration IS NULL) AND (end_time > start_time)) OR ((time_limit_type)::text <> 'scheduled'::text))),
    CONSTRAINT check_timed_duration CHECK (((((time_limit_type)::text = 'timed'::text) AND (duration IS NOT NULL) AND (duration > 0) AND (start_time IS NULL) AND (end_time IS NULL)) OR ((time_limit_type)::text <> 'timed'::text))),
    CONSTRAINT check_unlimited_no_time CHECK (((((time_limit_type)::text = 'unlimited'::text) AND (start_time IS NULL) AND (end_time IS NULL) AND (duration IS NULL)) OR ((time_limit_type)::text <> 'unlimited'::text))),
    CONSTRAINT exams_ability_level_check CHECK (((ability_level)::text = ANY ((ARRAY['L1'::character varying, 'L2'::character varying, 'L3'::character varying, 'L4'::character varying, 'L5'::character varying, 'L6'::character varying, 'L7'::character varying])::text[]))),
    CONSTRAINT exams_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT exams_scope_check CHECK (((scope)::text = ANY ((ARRAY['municipal'::character varying, 'district'::character varying, 'base_school'::character varying, 'municipal_school'::character varying, 'school'::character varying, 'class'::character varying])::text[]))),
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
    is_required boolean DEFAULT true,
    section character varying(50),
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
-- Name: COLUMN activity_questions.is_required; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activity_questions.is_required IS '是否必答题 (true=必答, false=选答)';


--
-- Name: COLUMN activity_questions.section; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.activity_questions.section IS '题目所属部分或章节 (例如：第一部分、单选题、多选题等)';


--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_bank (
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
    created_by integer,
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


ALTER TABLE public.question_bank OWNER TO postgres;

--
-- Name: COLUMN question_bank.score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.score IS '题目分值（已废弃，使用 suggested_score）';


--
-- Name: COLUMN question_bank.abilities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.abilities IS '题目考察的能力列表（如抽象思维、计算思维等），存储能力ID数组';


--
-- Name: COLUMN question_bank.knowledge_points; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.knowledge_points IS '题目涉及的知识点列表，存储知识点ID数组';


--
-- Name: COLUMN question_bank.level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.level IS '题目级别 L1-L9';


--
-- Name: COLUMN question_bank.suggested_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.suggested_score IS '建议分值';


--
-- Name: COLUMN question_bank.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.status IS '题目状态：draft草稿，pending_review待审核，approved已批准，rejected已拒绝，published已发布';


--
-- Name: COLUMN question_bank.scope; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.scope IS '题库范围：practice练习题库，assessment测评题库，competition竞赛题库';


--
-- Name: COLUMN question_bank.question_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.question_bank.question_code IS '题目唯一编码，格式：科目代码+年月日+序号，如MATH250120001';


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
     LEFT JOIN public.question_bank qb ON ((aq.question_id = qb.id)))
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
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    content text,
    type character varying(20),
    target_audience character varying(20),
    is_pinned boolean DEFAULT false,
    created_by integer,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.announcements_id_seq OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


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

ALTER SEQUENCE public.question_bank_id_seq OWNED BY public.question_bank.id;


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
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(30) NOT NULL,
    real_name character varying(100),
    id_card character varying(18),
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.teacher_permissions OWNER TO postgres;

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
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq'::regclass);


--
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- Name: import_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_logs ALTER COLUMN id SET DEFAULT nextval('public.import_logs_id_seq'::regclass);


--
-- Name: question_bank id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank ALTER COLUMN id SET DEFAULT nextval('public.question_bank_id_seq'::regclass);


--
-- Name: question_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_categories ALTER COLUMN id SET DEFAULT nextval('public.question_categories_id_seq'::regclass);


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
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: student_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities ALTER COLUMN id SET DEFAULT nextval('public.student_activities_id_seq'::regclass);


--
-- Name: student_registration_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_registration_requests ALTER COLUMN id SET DEFAULT nextval('public.student_registration_requests_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: teacher_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions ALTER COLUMN id SET DEFAULT nextval('public.teacher_permissions_id_seq'::regclass);


--
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by, created_at, updated_at, type, ability_level, scope, allow_retake, max_attempts, is_official, target_audience, certificate_config, time_limit_type, question_count, paper_status) FROM stdin;
32	Smoke测试-练习活动-1761111160808	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-22 05:32:45.783208	2025-11-03 12:35:53.518712	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
2	2024年春季数学期中考试	三年级数学期中测试，包含计算、应用题等内容	数学	三年级	\N	\N	\N	100	60	published	9	2025-09-24 15:09:18.525972	2025-10-25 13:46:29.424744	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
44	Test Practice 1761209795666	\N	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-23 08:56:35.669866	2025-11-03 12:34:22.560206	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
35	Smoke测试-练习活动-1761146995158	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-22 15:30:00.104958	2025-11-03 12:35:44.603811	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
33	Smoke测试-练习活动-1761111195743	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-22 05:33:20.749409	2025-11-03 12:35:47.765065	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
34	Smoke测试-练习活动-1761146340144	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-22 15:19:05.103069	2025-11-03 12:35:49.460004	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
31	API测试-测评活动	这是一个API测试创建的测评活动	数学	五年级	\N	\N	\N	100	70	cancelled	1	2025-10-21 14:09:39.871067	2025-11-03 12:35:55.329083	assessment	L5	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": true, "template": "standard"}	unlimited	0	empty
147	ACT129-删除测试-1761994938917	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-11-01 11:02:22.322736	2025-11-01 11:02:24.419686	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
30	API测试-练习活动	这是一个API测试创建的练习活动	数学	五年级	\N	\N	\N	100	60	cancelled	9	2025-10-21 14:09:39.855415	2025-11-03 12:35:57.189714	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
5	API Test Exam 1760327592554	Created by automated test	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-13 03:53:12.556521	2025-11-03 12:36:24.394909	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
143	[PTL002] 无限制练习 - 1761924271585	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:24:35.424861	2025-11-03 12:31:08.034109	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
136	[PTL002] 无限制练习 - 1761922815893	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:00:19.699823	2025-11-03 12:31:23.716387	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
135	[PTL003] 无限制练习 - 1761922815891	时间限制功能测试 - LocalStorage恢复	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:00:19.699333	2025-11-03 12:31:25.077073	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
129	[PTL002] 无限制练习 - 1761921316588	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 14:35:20.404477	2025-11-03 12:32:10.158812	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
104	[PTL002] 无限制练习 - 1761575375758	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 14:29:38.495815	2025-11-03 12:33:13.417528	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
72	ACT129-删除测试-1761377277698	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-25 07:28:01.0254	2025-11-03 12:33:44.466306	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
71	ACT110-发布测试-1761376490563	ACT110测试活动-待发布	信息科技	六年级	\N	\N	\N	120	72	cancelled	9	2025-10-25 07:14:53.913453	2025-11-03 12:33:47.833885	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
69	ACT110-发布测试-1761376173996	ACT110测试活动-待发布	信息科技	六年级	\N	\N	\N	120	72	cancelled	9	2025-10-25 07:09:37.440474	2025-11-03 12:33:49.43453	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
73	ACT129-删除测试-1761377512907	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-25 07:31:56.191186	2025-11-03 12:33:52.346452	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
60	ACT129-删除测试-1761317878222	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-24 14:58:01.631899	2025-11-03 12:33:56.964244	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
61	Regression测试-完整练习-1761317878227	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-24 14:58:02.47338	2025-11-03 12:33:58.495322	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
146	PTL001-无限制练习-1761924535336	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	draft	9	2025-10-31 15:28:58.072194	2025-10-31 15:28:58.072194	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
55	Regression测试-完整练习-1761316443508	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-24 14:34:07.811372	2025-11-03 12:33:59.771447	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
52	ACT129-删除测试-1761316443589	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-24 14:34:07.003595	2025-11-03 12:34:03.765981	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
50	ACT110-发布测试-1761316443509	ACT110测试活动-待发布	信息科技	六年级	\N	\N	\N	120	72	cancelled	9	2025-10-24 14:34:06.970472	2025-11-03 12:34:18.975303	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
49	Regression测试-完整练习-1761314946448	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-24 14:09:09.819967	2025-11-03 12:34:24.157302	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
148	ACT110-发布测试-1761995343839	ACT110测试活动-待发布	数学	六年级	\N	\N	\N	120	72	published	9	2025-11-01 11:09:07.188245	2025-11-01 11:09:09.235818	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
39	Test Activity 1761209695135	\N	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-23 08:54:55.433443	2025-11-03 12:34:32.781246	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
40	Test Practice 1761209711151	\N	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-23 08:55:11.155937	2025-11-03 12:34:35.353167	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
149	ACT129-删除测试-1761995343878	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-11-01 11:09:07.225572	2025-11-01 11:09:09.317297	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
38	Test Activity 1761209695135	\N	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-23 08:54:55.385064	2025-11-03 12:34:37.609344	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
37	Test Activity 1761209633050	\N	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-23 08:53:53.302721	2025-11-03 12:35:38.570564	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
150	ACT111-取消发布-1761995343839	ACT111测试活动-先发布再取消	信息科技	四年级	\N	\N	\N	90	54	draft	9	2025-11-01 11:09:07.255024	2025-11-01 11:09:10.825261	practice	L4	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
41	Test Practice 1761209779893	\N	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-23 08:56:19.898283	2025-11-03 12:35:40.484232	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
42	Test Activity 1761209795276	\N	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-23 08:56:35.445534	2025-11-03 12:35:42.663995	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
144	[PTL002] 无限制练习 - 1761924534204	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:28:57.983905	2025-11-03 12:31:06.275441	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
36	Smoke测试-练习活动-1761148688883	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-22 15:58:13.871654	2025-11-03 12:35:46.169506	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
130	[PTL002] 无限制练习 - 1761921886176	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 14:44:49.972464	2025-11-03 12:32:11.881365	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
137	PTL001-无限制练习-1761922816941	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 15:00:19.701749	2025-11-03 12:37:15.926729	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
105	[PTL003] 无限制练习 - 1761575375758	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 14:29:38.497417	2025-11-03 12:33:11.127375	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
99	Regression测试-完整练习-1761572451193	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-27 13:40:55.365787	2025-11-03 12:33:24.918662	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
86	Regression测试-完整练习-1761567636858	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-27 12:20:41.056885	2025-11-03 12:33:27.953494	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
46	Regression测试-完整练习-1761308668174	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-24 12:24:31.608657	2025-11-03 12:34:20.726792	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
80	ACT129-删除测试-1761550477209	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 07:34:40.542064	2025-10-27 07:34:42.686843	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
82	ACT129-删除测试-1761560144280	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 10:15:47.591769	2025-10-27 10:15:49.694796	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
116	PTL001-无限制练习-1761918469768	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:47:52.512082	2025-11-03 12:34:25.688352	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
45	Regression测试-完整练习-1761308248807	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-24 12:17:32.175078	2025-11-03 12:34:27.802006	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
131	[PTL002] 无限制练习 - 1761922258446	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 14:51:02.250668	2025-11-03 12:36:02.774584	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
87	API-Test-Unlimited-1761570873082	API测试 - 无限制类型	数学	三年级	\N	\N	30	50	30	cancelled	9	2025-10-27 13:14:33.159543	2025-10-27 13:14:33.195139	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	timed	0	empty
145	[PTL003] 无限制练习 - 1761924534250	时间限制功能测试 - LocalStorage恢复	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:28:58.035623	2025-11-03 12:31:02.940414	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
89	API-Test-Unlimited-1761570907578	API测试 - 无限制类型	数学	三年级	\N	\N	30	50	30	cancelled	9	2025-10-27 13:15:07.707165	2025-10-27 13:15:07.737226	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	timed	0	empty
91	API-Test-Unlimited-1761570933290	API测试 - 无限制类型	数学	三年级	\N	\N	30	50	30	cancelled	9	2025-10-27 13:15:33.360696	2025-10-27 13:15:33.389696	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	timed	0	empty
138	[PTL003] 无限制练习 - 1761923128241	时间限制功能测试 - LocalStorage恢复	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:05:32.000778	2025-11-03 12:31:14.616733	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
124	[PTL002] 无限制练习 - 1761919309223	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 14:01:51.980484	2025-11-03 12:32:19.370044	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
109	练习测试-1761795100186	用于API测试	数学	二年级	\N	\N	\N	100	60	cancelled	9	2025-10-30 03:31:40.190994	2025-11-03 12:32:59.939679	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
113	练习测试-1761795786635	用于API测试	数学	三年级	\N	\N	\N	50	60	cancelled	9	2025-10-30 03:43:06.63937	2025-11-03 12:33:02.354355	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
4	E2E测试草稿活动-数学七年级	Created by automated test	数学	七年级	\N	\N	\N	185	60	cancelled	9	2025-10-28 13:01:42.392611	2025-11-03 12:33:08.420902	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	20	completed
100	PTL001-无限制练习-1761573112291	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 13:51:54.998947	2025-11-03 12:33:26.437586	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
115	[PTL002] 无限制练习 - 1761918469208	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:47:52.098861	2025-11-03 12:33:38.015868	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
43	Test Activity 1761209795276	\N	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-23 08:56:35.498092	2025-11-03 12:34:29.463393	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
29	API测试-测评活动	这是一个API测试创建的测评活动	数学	五年级	\N	\N	\N	100	70	cancelled	1	2025-10-21 14:07:56.265625	2025-11-03 12:35:58.504292	assessment	\N	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": true, "template": "standard"}	unlimited	0	empty
28	API测试-练习活动	这是一个API测试创建的练习活动	数学	五年级	\N	\N	\N	100	60	cancelled	9	2025-10-21 14:07:56.251776	2025-11-03 12:36:00.335017	practice	\N	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
27	API测试-练习活动	这是一个API测试创建的练习活动	数学	五年级	\N	\N	\N	100	60	cancelled	9	2025-10-21 13:59:08.775733	2025-11-03 12:36:26.44403	practice	\N	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
139	[PTL002] 无限制练习 - 1761923128239	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:05:32.035906	2025-11-03 12:31:11.700965	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
132	PTL001-无限制练习-1761922520589	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 14:55:23.410721	2025-11-03 12:32:13.438907	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
126	[PTL002] 无限制练习 - 1761919870912	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 14:11:14.638472	2025-11-03 12:32:21.399174	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
119	PTL001-无限制练习-1761918706137	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:51:48.86379	2025-11-03 12:32:30.992958	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
117	[PTL002] 无限制练习 - 1761918705622	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:51:48.364754	2025-11-03 12:32:36.323755	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
118	[PTL003] 无限制练习 - 1761918705685	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:51:48.413182	2025-11-03 12:32:38.062444	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
110	练习测试-1761795362003	用于API测试	数学	三年级	\N	\N	\N	50	60	cancelled	9	2025-10-30 03:36:02.00746	2025-11-03 12:32:55.114603	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
106	组卷测试活动-1761783199304	用于测试组卷功能	数学	二年级	\N	\N	\N	100	60	cancelled	9	2025-10-30 00:13:19.307218	2025-11-03 12:33:06.207786	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
103	PTL001-无限制练习-1761573346356	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 13:55:49.115953	2025-11-03 12:33:15.625732	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
101	[PTL002] 无限制练习 - 1761573345844	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 13:55:48.630623	2025-11-03 12:33:20.954252	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
83	ACT110-发布测试-1761560144279	ACT110测试活动-待发布	信息科技	六年级	\N	\N	\N	120	72	cancelled	9	2025-10-27 10:15:47.591111	2025-11-03 12:33:32.748862	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
93	API-Test-Unlimited-1761571689195	API测试 - 无限制类型	数学	三年级	\N	\N	30	50	30	cancelled	9	2025-10-27 13:28:09.32772	2025-10-27 13:28:09.366534	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	timed	0	empty
56	ACT110-发布测试-1761317878153	ACT110测试活动-待发布	信息科技	六年级	\N	\N	\N	120	72	cancelled	9	2025-10-24 14:58:01.582233	2025-11-03 12:34:01.838117	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
120	[PTL002] 无限制练习 - 1761918831171	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:53:53.916296	2025-11-03 12:32:33.569681	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
121	[PTL003] 无限制练习 - 1761918831282	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:53:54.03541	2025-11-03 12:32:39.894708	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
111	练习测试-1761795566220	用于API测试	数学	三年级	\N	\N	\N	50	60	cancelled	9	2025-10-30 03:39:26.224462	2025-11-03 12:32:52.233479	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
107	练习测试-1761793533401	用于API测试	数学	二年级	\N	\N	\N	100	60	cancelled	9	2025-10-30 03:05:33.407306	2025-11-03 12:33:04.199599	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
140	PTL001-无限制练习-1761923129282	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 15:05:32.036471	2025-11-03 12:31:13.093301	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
133	[PTL003] 无限制练习 - 1761922519550	时间限制功能测试 - LocalStorage恢复	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 14:55:23.411216	2025-11-03 12:31:26.608217	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
127	[PTL002] 无限制练习 - 1761920107128	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 14:15:10.912012	2025-11-03 12:32:22.741426	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
122	PTL001-无限制练习-1761918831728	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:53:54.483841	2025-11-03 12:32:25.636336	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
64	ACT110-发布测试-1761320104663	ACT110测试活动-待发布	信息科技	六年级	\N	\N	\N	120	72	cancelled	9	2025-10-24 15:35:08.311618	2025-11-03 12:33:54.217492	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
63	ACT129-删除测试-1761320104718	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-24 15:35:08.263611	2025-11-03 12:33:55.56844	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
134	[PTL002] 无限制练习 - 1761922519550	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 14:55:23.411663	2025-11-03 12:37:14.036389	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
141	[PTL003] 无限制练习 - 1761924271587	时间限制功能测试 - LocalStorage恢复	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 15:24:35.375738	2025-11-03 12:31:16.309475	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
75	ACT129-删除测试-1761378042301	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-25 07:40:45.600574	2025-10-25 13:46:29.424744	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
76	ACT129-删除测试-1761378240168	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-25 07:44:03.477564	2025-10-25 13:46:29.424744	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
74	ACT129-删除测试-1761377715754	ACT129测试活动-待删除	数学	一年级	\N	\N	\N	50	30	cancelled	9	2025-10-25 07:35:19.052411	2025-11-03 12:33:42.902832	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
67	Regression测试-完整练习-1761320104678	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	\N	100	60	cancelled	9	2025-10-24 15:35:09.143434	2025-11-03 12:33:50.926035	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
142	PTL001-无限制练习-1761924272641	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 15:24:35.424076	2025-11-03 12:31:17.867742	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
128	[PTL002] 无限制练习 - 1761920908636	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	25	30	cancelled	9	2025-10-31 14:28:32.419816	2025-11-03 12:31:30.449824	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
96	API-Test-Unlimited-1761571763073	API测试 - 无限制类型	数学	三年级	\N	\N	30	50	30	cancelled	9	2025-10-27 13:29:23.186097	2025-10-27 13:29:23.238777	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	timed	0	empty
125	PTL001-无限制练习-1761919309724	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 14:01:52.482067	2025-11-03 12:32:16.568646	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
123	[PTL003] 无限制练习 - 1761919309223	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 14:01:51.980001	2025-11-03 12:32:28.387898	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
114	[PTL003] 无限制练习 - 1761918469301	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-31 13:47:52.098098	2025-11-03 12:32:43.58669	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
112	练习测试-1761795675608	用于API测试	数学	三年级	\N	\N	\N	50	60	cancelled	9	2025-10-30 03:41:15.613817	2025-11-03 12:32:49.363083	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	5	completed
102	[PTL003] 无限制练习 - 1761573345845	时间限制功能测试 - 无限制模式	数学	三年级	\N	\N	\N	50	30	cancelled	9	2025-10-27 13:55:48.631184	2025-11-03 12:33:18.910346	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
108	练习测试-1761793745830	用于API测试	数学	二年级	\N	\N	\N	100	60	cancelled	9	2025-10-30 03:09:05.833632	2025-11-03 12:33:23.024038	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
85	ACT131-统计查看-1761560278241	ACT131测试活动-查看统计	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-27 10:18:01.778579	2025-11-03 12:33:30.580038	assessment	L3	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
79	ACT110-发布测试-1761550477209	ACT110测试活动-待发布	信息科技	六年级	\N	\N	\N	120	72	cancelled	9	2025-10-27 07:34:40.564489	2025-11-03 12:33:34.985632	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
78	Regression测试-测评活动-1761394892259	这是一个自动化回归测试创建的测评活动	数学	四年级	\N	\N	\N	100	60	cancelled	1	2025-10-25 12:21:35.005899	2025-11-03 12:33:36.576715	assessment	L4	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
77	ACT131-统计查看-1761394890958	ACT131测试活动-查看统计	数学	三年级	\N	\N	\N	100	60	cancelled	1	2025-10-25 12:21:34.610055	2025-11-03 12:33:39.781665	assessment	L3	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}	unlimited	0	empty
\.


--
-- Data for Name: activity_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_history (id, activity_id, action, changed_by, old_values, new_values, created_at) FROM stdin;
\.


--
-- Data for Name: activity_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_questions (id, activity_id, question_id, order_index, score, is_required, section, created_at, updated_at) FROM stdin;
27	110	234	1	10.00	t	\N	2025-10-30 03:36:02.021174	2025-10-30 03:36:02.021174
28	110	235	2	10.00	t	\N	2025-10-30 03:36:02.024604	2025-10-30 03:36:02.024604
29	110	236	3	10.00	t	\N	2025-10-30 03:36:02.027218	2025-10-30 03:36:02.027218
30	110	237	4	10.00	t	\N	2025-10-30 03:36:02.029938	2025-10-30 03:36:02.029938
31	110	238	5	10.00	t	\N	2025-10-30 03:36:02.032523	2025-10-30 03:36:02.032523
32	111	234	1	10.00	t	\N	2025-10-30 03:39:26.236135	2025-10-30 03:39:26.236135
33	111	235	2	10.00	t	\N	2025-10-30 03:39:26.239744	2025-10-30 03:39:26.239744
34	111	236	3	10.00	t	\N	2025-10-30 03:39:26.2428	2025-10-30 03:39:26.2428
35	111	237	4	10.00	t	\N	2025-10-30 03:39:26.245616	2025-10-30 03:39:26.245616
36	111	238	5	10.00	t	\N	2025-10-30 03:39:26.248422	2025-10-30 03:39:26.248422
37	112	234	1	10.00	t	\N	2025-10-30 03:41:15.631116	2025-10-30 03:41:15.631116
38	112	235	2	10.00	t	\N	2025-10-30 03:41:15.634856	2025-10-30 03:41:15.634856
39	112	236	3	10.00	t	\N	2025-10-30 03:41:15.637533	2025-10-30 03:41:15.637533
40	112	237	4	10.00	t	\N	2025-10-30 03:41:15.640136	2025-10-30 03:41:15.640136
41	112	238	5	10.00	t	\N	2025-10-30 03:41:15.643044	2025-10-30 03:41:15.643044
42	113	234	1	10.00	t	\N	2025-10-30 03:43:06.655889	2025-10-30 03:43:06.655889
43	113	235	2	10.00	t	\N	2025-10-30 03:43:06.660411	2025-10-30 03:43:06.660411
44	113	236	3	10.00	t	\N	2025-10-30 03:43:06.663465	2025-10-30 03:43:06.663465
45	113	237	4	10.00	t	\N	2025-10-30 03:43:06.666493	2025-10-30 03:43:06.666493
46	113	238	5	10.00	t	\N	2025-10-30 03:43:06.669391	2025-10-30 03:43:06.669391
47	127	271	1	5.00	t	\N	2025-10-31 14:15:11.012387	2025-10-31 14:15:11.012387
48	127	270	2	5.00	t	\N	2025-10-31 14:15:11.021161	2025-10-31 14:15:11.021161
49	127	235	3	5.00	t	\N	2025-10-31 14:15:11.024351	2025-10-31 14:15:11.024351
50	127	236	4	5.00	t	\N	2025-10-31 14:15:11.027072	2025-10-31 14:15:11.027072
51	127	237	5	5.00	t	\N	2025-10-31 14:15:11.030079	2025-10-31 14:15:11.030079
52	128	271	1	5.00	t	\N	2025-10-31 14:28:32.581017	2025-10-31 14:28:32.581017
53	128	270	2	5.00	t	\N	2025-10-31 14:28:32.585169	2025-10-31 14:28:32.585169
54	128	235	3	5.00	t	\N	2025-10-31 14:28:32.588277	2025-10-31 14:28:32.588277
55	128	236	4	5.00	t	\N	2025-10-31 14:28:32.591362	2025-10-31 14:28:32.591362
56	128	237	5	5.00	t	\N	2025-10-31 14:28:32.594501	2025-10-31 14:28:32.594501
57	129	271	1	5.00	t	\N	2025-10-31 14:35:20.505331	2025-10-31 14:35:20.505331
58	129	270	2	5.00	t	\N	2025-10-31 14:35:20.509765	2025-10-31 14:35:20.509765
59	129	235	3	5.00	t	\N	2025-10-31 14:35:20.513331	2025-10-31 14:35:20.513331
60	129	236	4	5.00	t	\N	2025-10-31 14:35:20.516219	2025-10-31 14:35:20.516219
61	129	237	5	5.00	t	\N	2025-10-31 14:35:20.519461	2025-10-31 14:35:20.519461
62	130	271	1	5.00	t	\N	2025-10-31 14:44:50.074378	2025-10-31 14:44:50.074378
63	130	270	2	5.00	t	\N	2025-10-31 14:44:50.079017	2025-10-31 14:44:50.079017
64	130	235	3	5.00	t	\N	2025-10-31 14:44:50.082424	2025-10-31 14:44:50.082424
65	130	236	4	5.00	t	\N	2025-10-31 14:44:50.086055	2025-10-31 14:44:50.086055
66	130	237	5	5.00	t	\N	2025-10-31 14:44:50.088859	2025-10-31 14:44:50.088859
67	131	271	1	5.00	t	\N	2025-10-31 14:51:02.353084	2025-10-31 14:51:02.353084
68	131	270	2	5.00	t	\N	2025-10-31 14:51:02.357797	2025-10-31 14:51:02.357797
69	131	235	3	5.00	t	\N	2025-10-31 14:51:02.360826	2025-10-31 14:51:02.360826
70	131	236	4	5.00	t	\N	2025-10-31 14:51:02.363626	2025-10-31 14:51:02.363626
71	131	237	5	5.00	t	\N	2025-10-31 14:51:02.366756	2025-10-31 14:51:02.366756
72	134	271	1	5.00	t	\N	2025-10-31 14:55:23.523573	2025-10-31 14:55:23.523573
73	133	271	1	5.00	t	\N	2025-10-31 14:55:23.523893	2025-10-31 14:55:23.523893
74	134	270	2	5.00	t	\N	2025-10-31 14:55:23.529502	2025-10-31 14:55:23.529502
75	133	270	2	5.00	t	\N	2025-10-31 14:55:23.529689	2025-10-31 14:55:23.529689
76	134	235	3	5.00	t	\N	2025-10-31 14:55:23.532956	2025-10-31 14:55:23.532956
77	133	235	3	5.00	t	\N	2025-10-31 14:55:23.533568	2025-10-31 14:55:23.533568
78	134	236	4	5.00	t	\N	2025-10-31 14:55:23.536206	2025-10-31 14:55:23.536206
79	133	236	4	5.00	t	\N	2025-10-31 14:55:23.536944	2025-10-31 14:55:23.536944
80	134	237	5	5.00	t	\N	2025-10-31 14:55:23.539314	2025-10-31 14:55:23.539314
81	133	237	5	5.00	t	\N	2025-10-31 14:55:23.540089	2025-10-31 14:55:23.540089
82	136	271	1	5.00	t	\N	2025-10-31 15:00:19.80968	2025-10-31 15:00:19.80968
83	135	271	1	5.00	t	\N	2025-10-31 15:00:19.810346	2025-10-31 15:00:19.810346
84	136	270	2	5.00	t	\N	2025-10-31 15:00:19.813678	2025-10-31 15:00:19.813678
85	135	270	2	5.00	t	\N	2025-10-31 15:00:19.814298	2025-10-31 15:00:19.814298
86	136	235	3	5.00	t	\N	2025-10-31 15:00:19.817632	2025-10-31 15:00:19.817632
87	135	235	3	5.00	t	\N	2025-10-31 15:00:19.818389	2025-10-31 15:00:19.818389
88	136	236	4	5.00	t	\N	2025-10-31 15:00:19.821368	2025-10-31 15:00:19.821368
89	135	236	4	5.00	t	\N	2025-10-31 15:00:19.822238	2025-10-31 15:00:19.822238
4	4	13	1	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
5	4	14	2	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
6	4	15	3	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
7	4	42	4	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
8	4	64	5	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
9	4	65	6	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
10	4	66	7	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
11	4	69	8	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
12	4	76	9	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
13	4	80	10	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
14	4	84	11	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
15	4	90	12	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
16	4	96	13	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
17	4	102	14	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
18	4	105	15	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
19	4	108	16	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
20	4	109	17	10.00	t	\N	2025-10-28 12:30:51.071912	2025-10-30 13:30:03.514227
21	4	231	18	5.00	t	\N	2025-10-28 13:53:23.46621	2025-10-30 13:30:03.514227
22	4	226	19	5.00	t	\N	2025-10-28 13:53:23.470791	2025-10-30 13:30:03.514227
23	4	198	20	5.00	t	\N	2025-10-28 13:53:23.473837	2025-10-30 13:30:03.514227
90	136	237	5	5.00	t	\N	2025-10-31 15:00:19.825493	2025-10-31 15:00:19.825493
91	135	237	5	5.00	t	\N	2025-10-31 15:00:19.826177	2025-10-31 15:00:19.826177
92	139	271	1	5.00	t	\N	2025-10-31 15:05:32.169538	2025-10-31 15:05:32.169538
93	138	271	1	5.00	t	\N	2025-10-31 15:05:32.169722	2025-10-31 15:05:32.169722
94	138	270	2	5.00	t	\N	2025-10-31 15:05:32.17428	2025-10-31 15:05:32.17428
95	139	270	2	5.00	t	\N	2025-10-31 15:05:32.174845	2025-10-31 15:05:32.174845
96	138	235	3	5.00	t	\N	2025-10-31 15:05:32.17711	2025-10-31 15:05:32.17711
97	139	235	3	5.00	t	\N	2025-10-31 15:05:32.177657	2025-10-31 15:05:32.177657
98	138	236	4	5.00	t	\N	2025-10-31 15:05:32.180144	2025-10-31 15:05:32.180144
99	139	236	4	5.00	t	\N	2025-10-31 15:05:32.180723	2025-10-31 15:05:32.180723
100	138	237	5	5.00	t	\N	2025-10-31 15:05:32.183085	2025-10-31 15:05:32.183085
101	139	237	5	5.00	t	\N	2025-10-31 15:05:32.183617	2025-10-31 15:05:32.183617
102	141	271	1	5.00	t	\N	2025-10-31 15:24:35.48733	2025-10-31 15:24:35.48733
103	141	270	2	5.00	t	\N	2025-10-31 15:24:35.492779	2025-10-31 15:24:35.492779
104	141	235	3	5.00	t	\N	2025-10-31 15:24:35.496732	2025-10-31 15:24:35.496732
105	141	236	4	5.00	t	\N	2025-10-31 15:24:35.499976	2025-10-31 15:24:35.499976
106	141	237	5	5.00	t	\N	2025-10-31 15:24:35.503621	2025-10-31 15:24:35.503621
107	143	271	1	5.00	t	\N	2025-10-31 15:24:35.5305	2025-10-31 15:24:35.5305
108	143	270	2	5.00	t	\N	2025-10-31 15:24:35.535228	2025-10-31 15:24:35.535228
109	143	235	3	5.00	t	\N	2025-10-31 15:24:35.538466	2025-10-31 15:24:35.538466
110	143	236	4	5.00	t	\N	2025-10-31 15:24:35.542907	2025-10-31 15:24:35.542907
111	143	237	5	5.00	t	\N	2025-10-31 15:24:35.546007	2025-10-31 15:24:35.546007
112	145	271	1	5.00	t	\N	2025-10-31 15:28:58.148069	2025-10-31 15:28:58.148069
113	145	270	2	5.00	t	\N	2025-10-31 15:28:58.153096	2025-10-31 15:28:58.153096
114	144	271	1	5.00	t	\N	2025-10-31 15:28:58.154281	2025-10-31 15:28:58.154281
115	145	235	3	5.00	t	\N	2025-10-31 15:28:58.156515	2025-10-31 15:28:58.156515
116	144	270	2	5.00	t	\N	2025-10-31 15:28:58.158481	2025-10-31 15:28:58.158481
117	145	236	4	5.00	t	\N	2025-10-31 15:28:58.160034	2025-10-31 15:28:58.160034
118	144	235	3	5.00	t	\N	2025-10-31 15:28:58.161899	2025-10-31 15:28:58.161899
119	145	237	5	5.00	t	\N	2025-10-31 15:28:58.163518	2025-10-31 15:28:58.163518
120	144	236	4	5.00	t	\N	2025-10-31 15:28:58.165523	2025-10-31 15:28:58.165523
121	144	237	5	5.00	t	\N	2025-10-31 15:28:58.168532	2025-10-31 15:28:58.168532
\.


--
-- Data for Name: admin_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_permissions (id, user_id, school_id, district_id, permission_scope, created_at) FROM stdin;
1	2	\N	1	{"schools": "all", "district": "云岩区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-09-24 15:09:18.522936
2	3	\N	2	{"schools": "all", "district": "南明区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-09-24 15:09:18.522936
3	4	\N	3	{"schools": "all", "district": "观山湖区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-09-24 15:09:18.522936
4	5	1	\N	{"school": "贵阳市第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-09-24 15:09:18.524321
5	6	2	\N	{"school": "贵阳市第二小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-09-24 15:09:18.524321
6	8	5	\N	{"school": "贵阳市信息技术基地校", "permissions": ["manage_students", "manage_teachers", "manage_exams", "manage_level_5_6_exams", "view_reports"]}	2025-09-24 15:09:18.525151
8	16	\N	1	{"schools": "all", "district": "云岩区", "permissions": ["manage_schools", "manage_teachers", "view_reports"]}	2025-10-04 15:11:20.216102
7	15	2	\N	{"permissions": ["manage_students", "manage_exams", "view_reports", "export_data"]}	2025-10-04 15:11:20.154128
9	33	\N	\N	{"scope": "municipal", "canManage": ["districts", "schools", "users"]}	2025-10-27 15:27:01.188416
10	34	\N	8	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
11	35	\N	9	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
12	36	\N	10	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
13	37	\N	11	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
14	38	\N	12	{"scope": "district", "canManage": ["schools", "users"]}	2025-10-27 15:27:01.188416
15	39	6	\N	{"school": "云岩区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
16	41	7	\N	{"school": "云岩区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
17	43	8	\N	{"school": "云岩区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
18	45	9	\N	{"school": "南明区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
19	47	10	\N	{"school": "南明区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
20	49	11	\N	{"school": "南明区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
21	51	12	\N	{"school": "观山湖区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
22	53	13	\N	{"school": "观山湖区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
23	55	14	\N	{"school": "观山湖区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
24	57	15	\N	{"school": "白云区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
25	59	16	\N	{"school": "白云区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
26	61	17	\N	{"school": "白云区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
27	63	18	\N	{"school": "花溪区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
28	65	19	\N	{"school": "花溪区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
29	67	20	\N	{"school": "花溪区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
30	69	21	\N	{"school": "乌当区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
31	71	22	\N	{"school": "乌当区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
32	73	23	\N	{"school": "乌当区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
33	75	24	\N	{"school": "清镇市第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
34	77	25	\N	{"school": "清镇市第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
35	79	26	\N	{"school": "清镇市第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
36	81	27	\N	{"school": "修文县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
37	83	28	\N	{"school": "修文县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
38	85	29	\N	{"school": "修文县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
39	87	30	\N	{"school": "息烽县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
40	89	31	\N	{"school": "息烽县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
41	91	32	\N	{"school": "息烽县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
42	93	33	\N	{"school": "开阳县第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
43	95	34	\N	{"school": "开阳县第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
44	97	35	\N	{"school": "开阳县第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
45	99	36	\N	{"school": "贵安新区第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
46	101	37	\N	{"school": "贵安新区第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
47	103	38	\N	{"school": "贵安新区第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
48	105	39	\N	{"school": "贵阳市直属第一小学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
49	107	40	\N	{"school": "贵阳市直属第一中学", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
50	109	41	\N	{"school": "贵阳市直属第一高中", "permissions": ["manage_students", "manage_teachers", "manage_exams", "view_reports"]}	2025-10-29 14:15:48.542795
51	145	\N	4	{"review_subjects": ["数学", "信息科技"], "can_manage_teachers": true, "can_view_statistics": true, "can_reject_questions": true, "can_review_questions": true, "can_approve_questions": true}	2025-11-02 08:38:09.282366
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, title, content, type, target_audience, is_pinned, created_by, published_at, created_at) FROM stdin;
1	欢迎使用贵阳市小学生测评平台	亲爱的同学们，欢迎使用我们的在线测评平台！请认真参加每一次考试。	notice	student	t	1	2025-09-24 15:09:18.529884	2025-09-24 15:09:18.529884
2	系统维护通知	本系统将于本周日晚上10点至11点进行维护，届时可能无法正常访问，敬请谅解。	maintenance	all	f	1	2025-09-24 15:09:18.529884	2025-09-24 15:09:18.529884
\.


--
-- Data for Name: answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.answers (id, student_exam_id, question_id, answer, is_correct, score, graded_by, graded_at, created_at, updated_at, grading_status, feedback, auto_score, manual_score) FROM stdin;
4	2	4	A	f	0.00	\N	\N	2025-10-13 04:20:57.289429	2025-10-13 04:20:57.349918	pending	\N	\N	\N
5	2	5	A	f	0.00	\N	\N	2025-10-13 04:20:57.289429	2025-10-13 04:20:57.349918	pending	\N	\N	\N
6	2	6	A	f	0.00	\N	\N	2025-10-13 04:20:57.289429	2025-10-13 04:20:57.349918	pending	\N	\N	\N
10	27	234	A	f	0.00	\N	\N	2025-10-30 03:39:26.274616	2025-10-30 03:39:26.295336	auto_graded	\N	0.00	\N
11	27	235	["A","B"]	f	0.00	\N	\N	2025-10-30 03:39:26.279244	2025-10-30 03:39:26.296187	auto_graded	\N	0.00	\N
12	27	236	42	f	0.00	\N	\N	2025-10-30 03:39:26.283265	2025-10-30 03:39:26.297088	auto_graded	\N	0.00	\N
13	28	234	A	f	0.00	\N	\N	2025-10-30 03:41:15.669471	2025-10-30 03:41:15.692928	auto_graded	\N	0.00	\N
14	28	235	["A","B"]	f	0.00	\N	\N	2025-10-30 03:41:15.67418	2025-10-30 03:41:15.693798	auto_graded	\N	0.00	\N
15	28	236	42	f	0.00	\N	\N	2025-10-30 03:41:15.678063	2025-10-30 03:41:15.694694	auto_graded	\N	0.00	\N
16	29	234	A	f	0.00	\N	\N	2025-10-30 03:43:06.697047	2025-10-30 03:43:06.724771	auto_graded	\N	0.00	\N
17	29	235	["A","B"]	f	0.00	\N	\N	2025-10-30 03:43:06.702302	2025-10-30 03:43:06.725743	auto_graded	\N	0.00	\N
18	29	236	42	f	0.00	\N	\N	2025-10-30 03:43:06.706491	2025-10-30 03:43:06.726527	auto_graded	\N	0.00	\N
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
-- Data for Name: question_bank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_bank (id, type, subject, grade, content, options, correct_answer, score, difficulty, explanation, tags, image_url, category_id, created_by, usage_count, success_rate, is_active, import_batch_id, created_at, updated_at, abilities, knowledge_points, level, suggested_score, status, scope, reviewer_id, review_comment, reviewed_at, published_at, published_by, question_code) FROM stdin;
241	essay	数学	三年级	一个班有40个学生，其中男生有22人。女生比男生少多少人？	\N	{"answer": "女生：40 - 22 = 18人\\n女生比男生少：22 - 18 = 4人"}	1	hard	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{应用能力,逻辑推理}	{减法应用,应用题}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH0301008
361	single	数学	一年级	1 + 1 = ?	{"A": "1", "B": "2", "C": "3", "D": "4"}	"B"	5	easy	1加1等于2	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020001
362	multiple	数学	一年级	以下哪些数字小于5？（多选）	{"A": "2", "B": "3", "C": "6", "D": "7"}	["A", "B"]	5	easy	小于5的数字是2和3	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020002
363	true_false	数学	一年级	3比5大。	{"A": "正确", "B": "错误"}	"B"	5	easy	3小于5，所以错误	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020003
191	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:39:09.876961	2025-10-20 16:39:18.170939	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200004
364	blank	数学	一年级	2 + 3 = ___	\N	"5"	5	easy	2加3等于5	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020004
365	essay	数学	一年级	请用自己的话说明什么是加法？	\N	"加法是把两个或多个数合在一起的运算"	10	medium	加法是基本运算之一	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.601417	2025-11-02 03:29:38.601417	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020005
366	single	数学	二年级	5 × 2 = ?	{"A": "7", "B": "10", "C": "12", "D": "15"}	"B"	5	easy	5乘以2等于10	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020006
198	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:04:04.589358	2025-10-21 05:04:17.619616	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	2025-10-21 05:04:17.619616	10	MATH2510210001
208	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:45:40.372132	2025-10-21 05:45:40.372132	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210008
367	multiple	数学	二年级	以下哪些数是偶数？（多选）	{"A": "2", "B": "4", "C": "5", "D": "6"}	["A", "B", "D"]	5	medium	偶数能被2整除	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020007
217	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:46:20.793598	2025-10-21 09:46:20.793598	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210015
368	true_false	数学	二年级	15是奇数。	{"A": "正确", "B": "错误"}	"A"	5	easy	15不能被2整除，是奇数	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020008
369	blank	数学	二年级	20 ÷ 4 = ___	\N	"5"	5	easy	20除以4等于5	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020009
370	essay	数学	二年级	请解释乘法和加法的关系。	\N	"乘法是相同加数的连加，如3×4等于3+3+3+3"	10	medium	理解乘法的本质	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.61824	2025-11-02 03:29:38.61824	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020010
371	single	数学	三年级	48 ÷ 6 = ?	{"A": "6", "B": "7", "C": "8", "D": "9"}	"C"	5	easy	48除以6等于8	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020011
372	multiple	数学	三年级	以下哪些是质数？（多选）	{"A": "2", "B": "3", "C": "4", "D": "5"}	["A", "B", "D"]	5	medium	质数只能被1和自身整除	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020012
373	true_false	数学	三年级	所有偶数都能被2整除。	{"A": "正确", "B": "错误"}	"A"	5	easy	偶数的定义就是能被2整除的数	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020013
250	single	数学	一年级	3 + 2 = ?	["3", "4", "5", "6"]	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{加法运算,基础计算}	{20以内加法,基础运算}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300001
251	single	数学	一年级	8 - 3 = ?	["3", "4", "5", "6"]	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{减法运算,基础计算}	{20以内减法,基础运算}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300002
252	single	数学	一年级	哪个数字最大？	["2", "5", "3", "1"]	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{数字比较,大小概念}	{数的大小,数序}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300003
253	multiple	数学	一年级	下列哪些数字大于3？（多选）	["2", "4", "5", "1"]	["4", "5"]	10	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{数字比较,大小判断}	{数的大小,不等关系}	L1	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300004
254	blank	数学	一年级	填空：5 + ( ) = 10	null	"5"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{加法运算,逆向思维}	{加法,填空题}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300005
255	blank	数学	一年级	填空：10 - ( ) = 6	null	"4"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{减法运算,逆向思维}	{减法,填空题}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300006
256	true_false	数学	一年级	5 + 3 = 8	null	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{加法验证,判断能力}	{加法,正误判断}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300007
257	true_false	数学	一年级	6 比 8 大	null	false	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.271796	2025-10-30 10:52:26.271796	{大小比较,判断能力}	{数的大小,正误判断}	L1	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300008
374	blank	数学	三年级	7 × 9 = ___	\N	"63"	5	easy	7乘以9等于63	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	MATH2511020014
375	essay	数学	三年级	请说明如何判断一个数是质数还是合数。	\N	"质数只有1和它本身两个因数，合数除了1和它本身外还有其他因数"	10	medium	理解质数和合数的概念	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.619561	2025-11-02 03:29:38.619561	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020015
376	single	数学	四年级	0.5 + 0.3 = ?	{"A": "0.7", "B": "0.8", "C": "0.9", "D": "1.0"}	"B"	5	easy	小数加法：0.5加0.3等于0.8	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020016
377	multiple	数学	四年级	以下哪些分数大于1/2？（多选）	{"A": "2/3", "B": "3/4", "C": "1/3", "D": "1/4"}	["A", "B"]	5	medium	2/3和3/4都大于1/2	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020017
192	single	数学	七年级	Admin测试题目：计算 5 + 3 = ?	["6", "7", "8", "9"]	"C"	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-20 17:04:48.340723	2025-10-20 17:04:48.340723	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510200005
378	true_false	数学	四年级	1/4 = 0.25	{"A": "正确", "B": "错误"}	"A"	5	easy	1除以4等于0.25	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020018
379	blank	数学	四年级	1.2 × 5 = ___	\N	"6"	5	easy	1.2乘以5等于6	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	MATH2511020019
210	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:52:03.22356	2025-10-21 05:52:03.22356	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210009
380	essay	数学	四年级	请解释小数和分数的关系。	\N	"小数和分数都是表示部分数量的方法，可以相互转换"	10	medium	理解小数和分数的联系	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.620953	2025-11-02 03:29:38.620953	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020020
381	single	数学	五年级	一个长方形的长是8cm，宽是5cm，它的面积是？	{"A": "13平方厘米", "B": "26平方厘米", "C": "40平方厘米", "D": "80平方厘米"}	"C"	5	medium	长方形面积 = 长 × 宽 = 8 × 5 = 40	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020021
382	multiple	数学	五年级	以下哪些是正方体的特征？（多选）	{"A": "6个面", "B": "12条棱", "C": "8个顶点", "D": "所有棱长都相等"}	["A", "B", "C", "D"]	5	medium	正方体的所有特征	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020022
383	true_false	数学	五年级	圆的周长等于直径乘以π。	{"A": "正确", "B": "错误"}	"A"	5	easy	圆的周长公式：C = πd	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020023
384	blank	数学	五年级	一个圆的半径是3cm，它的面积是___ 平方厘米（π取3.14）	\N	"28.26"	5	medium	圆的面积 = πr² = 3.14 × 3² = 28.26	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020024
385	essay	数学	五年级	请说明如何计算组合图形的面积。	\N	"将组合图形分解成基本图形，分别计算面积后相加或相减"	10	hard	理解组合图形面积的计算方法	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.622308	2025-11-02 03:29:38.622308	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020025
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
234	single	数学	三年级	12 + 15 = ?	\N	{"answer": "27"}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{计算能力}	{加法运算,两位数加法}	L1	2	published	{}	\N	\N	\N	\N	\N	MATH0301001
386	single	数学	六年级	如果x + 5 = 12，那么x = ?	{"A": "5", "B": "6", "C": "7", "D": "8"}	"C"	5	medium	x = 12 - 5 = 7	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020026
200	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:08:22.609336	2025-10-21 05:08:22.609336	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210002
387	multiple	数学	六年级	以下哪些是百分数的应用场景？（多选）	{"A": "利率", "B": "折扣", "C": "增长率", "D": "税率"}	["A", "B", "C", "D"]	5	easy	百分数在生活中广泛应用	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020027
388	true_false	数学	六年级	圆柱的体积等于底面积乘以高。	{"A": "正确", "B": "错误"}	"A"	5	easy	圆柱体积公式：V = Sh	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020028
211	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:17:23.105681	2025-10-21 06:17:23.105681	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210010
220	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 10:54:28.003014	2025-10-21 10:54:28.003014	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210016
389	blank	数学	六年级	50的30%是___	\N	"15"	5	easy	50 × 30% = 50 × 0.3 = 15	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020029
390	essay	数学	六年级	请解释比例的基本性质。	\N	"在一个比例中，两个外项的积等于两个内项的积"	10	medium	理解比例的基本性质	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.623438	2025-11-02 03:29:38.623438	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020030
391	single	数学	七年级	|-5| = ?	{"A": "-5", "B": "0", "C": "5", "D": "10"}	"C"	5	easy	绝对值是数在数轴上到原点的距离	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020031
231	true_false	数学	七年级	【R405-1761049197253】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:20:04.30024	2025-10-21 12:20:17.9815	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 12:20:17.977151	2025-10-21 12:20:17.9815	10	MATH2510210020
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
392	multiple	数学	七年级	以下哪些是有理数？（多选）	{"A": "整数", "B": "分数", "C": "小数", "D": "无理数"}	["A", "B", "C"]	5	medium	有理数包括整数、分数和有限小数	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020032
393	true_false	数学	七年级	负数乘以负数等于正数。	{"A": "正确", "B": "错误"}	"A"	5	easy	负负得正	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020033
195	single	数学	七年级	【待审核-批准】计算 15 + 25 = ?	["30", "35", "40", "45"]	"C"	1	easy	15 + 25 = 40	\N	\N	\N	9	0	\N	t	\N	2025-10-20 17:22:30.268164	2025-10-20 17:22:30.268164	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510200006
394	blank	数学	七年级	(-3) × 4 = ___	\N	"-12"	5	easy	负数乘以正数等于负数	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH2511020034
395	essay	数学	七年级	请解释有理数的运算顺序。	\N	"先算乘方，再算乘除，最后算加减；同级运算从左到右；有括号先算括号内"	10	medium	理解运算顺序	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.624526	2025-11-02 03:29:38.624526	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020035
202	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:18:11.986108	2025-10-21 05:18:11.986108	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210003
396	single	数学	八年级	(x + 2)(x - 2) = ?	{"A": "x² - 4", "B": "x² + 4", "C": "x² - 2", "D": "x² + 2"}	"A"	5	medium	平方差公式：(a+b)(a-b) = a² - b²	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	MATH2511020036
212	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:21:23.922288	2025-10-21 06:21:23.922288	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210011
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
235	single	数学	三年级	25 - 8 = ?	\N	{"answer": "17"}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{计算能力}	{减法运算,两位数减法}	L1	2	published	{}	\N	\N	\N	\N	\N	MATH0301002
397	multiple	数学	八年级	以下哪些是二次函数的图像特征？（多选）	{"A": "抛物线", "B": "对称轴", "C": "顶点", "D": "直线"}	["A", "B", "C"]	5	medium	二次函数图像是抛物线，有对称轴和顶点	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	MATH2511020037
187	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:29:18.669805	2025-10-20 16:29:26.463108	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200002
204	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:21:23.941963	2025-10-21 05:21:23.941963	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210004
213	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:26:07.992328	2025-10-21 06:26:07.992328	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210012
398	true_false	数学	八年级	勾股定理只适用于直角三角形。	{"A": "正确", "B": "错误"}	"A"	5	easy	勾股定理是直角三角形的特有性质	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020038
399	blank	数学	八年级	一个直角三角形两条直角边长度分别为3和4，斜边长度是___	\N	"5"	5	medium	根据勾股定理：3² + 4² = 5²	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	MATH2511020039
400	essay	数学	八年级	请说明如何因式分解一个二次三项式。	\N	"找出两个数，它们的和等于一次项系数，积等于常数项，然后用十字相乘法分解"	10	hard	理解因式分解的方法	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.625575	2025-11-02 03:29:38.625575	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	MATH2511020040
224	true_false	数学	七年级	【R405-1761045256357】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:14:23.380148	2025-10-21 11:14:31.680168	{}	{}	L1	5	pending_review	{practice}	10	\N	\N	\N	\N	MATH2510210018
293	true_false	数学	六年级	两个奇数相加的结果一定是偶数。	null	true	5	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{奇偶性,数的性质}	{奇数偶数,数的规律}	L3	5	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300044
294	essay	数学	六年级	一件商品原价200元，打8折后是多少元？请写出计算过程。	null	"200×0.8=160元，或200×(1-20%)=160元"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{百分数应用,折扣问题}	{打折,百分数应用}	L3	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300045
295	matching	数学	六年级	连线匹配：公式与图形（V=πr²h→圆柱，V=(1/3)πr²h→圆锥，V=abc→长方体）	null	"圆柱-πr²h,圆锥-(1/3)πr²h,长方体-abc"	10	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.28719	2025-10-30 10:52:26.28719	{体积公式,立体图形}	{立体图形体积,公式配对}	L3	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300046
296	matching	数学	八年级	连线匹配：函数与图像（一次函数→直线，二次函数→抛物线，反比例函数→双曲线）	null	"一次函数-直线,二次函数-抛物线,反比例函数-双曲线"	10	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.289571	2025-10-30 10:52:26.289571	{函数图像,函数识别}	{函数,图像特征}	L4	10	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300047
297	code	数学	八年级	编写程序：输入三角形三边a、b、c，判断是否能构成三角形（任意两边之和大于第三边）	null	"if (a+b>c and b+c>a and a+c>b) then 能构成 else 不能构成"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.289571	2025-10-30 10:52:26.289571	{算法设计,三角形判定}	{三角形,程序逻辑}	L4	15	approved	{练习,测评}	\N	\N	\N	\N	\N	MATH2510300048
401	single	数学	九年级	一元二次方程x² - 5x + 6 = 0的解是？	{"A": "x=2或x=3", "B": "x=1或x=6", "C": "x=-2或x=-3", "D": "x=-1或x=-6"}	"A"	5	medium	分解因式：(x-2)(x-3)=0，得x=2或x=3	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	MATH2511020041
402	multiple	数学	九年级	以下哪些是相似三角形的判定方法？（多选）	{"A": "三边成比例", "B": "两角对应相等", "C": "两边成比例且夹角相等", "D": "全等"}	["A", "B", "C"]	5	medium	相似三角形的判定定理	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	MATH2511020042
403	true_false	数学	九年级	圆的切线垂直于过切点的半径。	{"A": "正确", "B": "错误"}	"A"	5	easy	这是圆的切线性质	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	MATH2511020043
404	blank	数学	九年级	若sin30° = 0.5，则cos60° = ___	\N	"0.5"	5	medium	sin30° = cos60° = 0.5	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	MATH2511020044
405	essay	数学	九年级	请说明二次函数的顶点式与一般式的转换方法。	\N	"通过配方法可以将一般式y=ax²+bx+c转换为顶点式y=a(x-h)²+k"	10	hard	理解二次函数的不同表示形式	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.626624	2025-11-02 03:29:38.626624	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	MATH2511020045
406	single	信息科技	三年级	计算机的"大脑"是？	{"A": "显示器", "B": "键盘", "C": "CPU", "D": "鼠标"}	"C"	5	easy	CPU是中央处理器，负责计算和控制	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020001
407	multiple	信息科技	三年级	以下哪些是计算机的输入设备？（多选）	{"A": "键盘", "B": "鼠标", "C": "显示器", "D": "扫描仪"}	["A", "B", "D"]	5	easy	输入设备用于向计算机输入信息	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020002
408	true_false	信息科技	三年级	显示器是输出设备。	{"A": "正确", "B": "错误"}	"A"	5	easy	显示器用于显示计算机输出的信息	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020003
409	blank	信息科技	三年级	计算机的三大组成部分是：输入设备、___和输出设备	\N	"主机"	5	easy	计算机由输入设备、主机和输出设备组成	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020004
236	single	数学	三年级	一个长方形的长是8厘米，宽是5厘米，它的周长是多少厘米？	\N	{"answer": "26"}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{空间想象}	{长方形周长,几何图形}	L2	3	published	{}	\N	\N	\N	\N	\N	MATH0301003
410	essay	信息科技	三年级	请说明计算机在我们生活中的应用。	\N	"计算机用于学习、娱乐、通信、工作等多个方面"	10	easy	了解计算机的应用	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.627641	2025-11-02 03:29:38.627641	{}	{}	L1	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020005
411	single	信息科技	四年级	以下哪个软件是文字处理软件？	{"A": "Photoshop", "B": "Word", "C": "Excel", "D": "PowerPoint"}	"B"	5	easy	Word是微软的文字处理软件	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020006
205	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:24:27.887549	2025-10-21 05:24:27.887549	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210005
214	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:33:07.077578	2025-10-21 09:33:07.077578	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210013
412	multiple	信息科技	四年级	以下哪些是常见的文件格式？（多选）	{"A": ".txt", "B": ".doc", "C": ".jpg", "D": ".mp3"}	["A", "B", "C", "D"]	5	easy	这些都是常见的文件格式	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020007
413	true_false	信息科技	四年级	文件夹可以包含其他文件夹。	{"A": "正确", "B": "错误"}	"A"	5	easy	文件夹可以嵌套，形成层级结构	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020008
414	blank	信息科技	四年级	在Windows系统中，复制文件的快捷键是___	\N	"Ctrl+C"	5	easy	Ctrl+C用于复制	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020009
415	essay	信息科技	四年级	请说明如何创建和管理文件夹。	\N	"右键点击空白处，选择新建文件夹，输入名称；可以通过拖拽来移动文件"	10	medium	了解文件管理	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.628751	2025-11-02 03:29:38.628751	{}	{}	L2	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020010
416	single	信息科技	五年级	Scratch中，以下哪个积木块用于移动角色？	{"A": "说", "B": "移动10步", "C": "等待", "D": "停止"}	"B"	5	easy	Scratch中移动积木块用于移动角色	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020011
417	multiple	信息科技	五年级	在Scratch中，以下哪些是事件积木？（多选）	{"A": "当绿旗被点击", "B": "当按下空格键", "C": "重复执行", "D": "广播"}	["A", "B"]	5	medium	事件积木用于触发程序执行	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020012
226	true_false	数学	七年级	【R405-1761045501771】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:18:28.84058	2025-10-21 11:18:43.470724	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 11:18:43.468054	2025-10-21 11:18:43.470724	10	MATH2510210019
418	true_false	信息科技	五年级	Scratch是一种图形化编程语言。	{"A": "正确", "B": "错误"}	"A"	5	easy	Scratch使用图形化积木进行编程	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020013
419	blank	信息科技	五年级	在Scratch中，让角色重复执行某个动作使用___积木	\N	"重复执行"	5	easy	重复执行积木用于循环	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020014
420	essay	信息科技	五年级	请说明什么是循环，并举例说明。	\N	"循环是重复执行某段代码，如让角色重复移动10步"	10	medium	理解循环概念	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.62984	2025-11-02 03:29:38.62984	{}	{}	L3	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020015
421	single	信息科技	六年级	在编程中，以下哪个是条件判断语句？	{"A": "循环", "B": "如果...那么", "C": "变量", "D": "函数"}	"B"	5	easy	条件判断使用if语句	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020016
422	multiple	信息科技	六年级	以下哪些是编程的基本结构？（多选）	{"A": "顺序", "B": "选择", "C": "循环", "D": "递归"}	["A", "B", "C"]	5	medium	顺序、选择和循环是三大基本结构	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020017
423	true_false	信息科技	六年级	变量可以用来存储和改变数据。	{"A": "正确", "B": "错误"}	"A"	5	easy	变量是存储数据的容器	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020018
424	blank	信息科技	六年级	在编程中，___语句用于根据条件执行不同的代码	\N	"if"	5	easy	if语句用于条件判断	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020019
425	essay	信息科技	六年级	请解释什么是算法，并举一个简单的例子。	\N	"算法是解决问题的步骤，如计算1到100的和：初始化和为0，从1到100依次相加"	10	medium	理解算法概念	\N	\N	\N	58	0	\N	t	\N	2025-11-02 03:29:38.630874	2025-11-02 03:29:38.630874	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020020
426	single	信息科技	七年级	Python中，以下哪个是正确的输出语句？	{"A": "echo()", "B": "print()", "C": "printf()", "D": "cout"}	"B"	5	easy	Python使用print()函数输出	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020021
427	multiple	信息科技	七年级	Python中，以下哪些是数据类型？（多选）	{"A": "整数int", "B": "浮点数float", "C": "字符串str", "D": "布尔bool"}	["A", "B", "C", "D"]	5	medium	Python的基本数据类型	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020022
428	true_false	信息科技	七年级	Python是一种解释型语言。	{"A": "正确", "B": "错误"}	"A"	5	easy	Python代码逐行解释执行	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020023
429	blank	信息科技	七年级	在Python中，定义变量x等于10的语句是：x = ___	\N	"10"	5	easy	Python使用=赋值	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L4	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020024
430	essay	信息科技	七年级	请说明Python中列表和字符串的区别。	\N	"列表可以包含多种类型的元素且可修改，字符串只包含字符且不可修改"	10	medium	理解数据类型	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.631919	2025-11-02 03:29:38.631919	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020025
431	single	信息科技	八年级	以下哪个不是面向对象编程的特征？	{"A": "封装", "B": "继承", "C": "多态", "D": "编译"}	"D"	5	medium	面向对象的三大特征是封装、继承和多态	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020026
432	multiple	信息科技	八年级	以下哪些是常见的排序算法？（多选）	{"A": "冒泡排序", "B": "快速排序", "C": "选择排序", "D": "插入排序"}	["A", "B", "C", "D"]	5	medium	这些都是常见的排序算法	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020027
433	true_false	信息科技	八年级	数组的索引从0开始。	{"A": "正确", "B": "错误"}	"A"	5	easy	大多数编程语言中数组索引从0开始	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L5	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020028
206	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:26:45.285366	2025-10-21 05:26:45.285366	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210006
434	blank	信息科技	八年级	时间复杂度为O(n²)的排序算法有冒泡排序和___排序	\N	"选择"	5	medium	冒泡排序和选择排序都是O(n²)	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020029
435	essay	信息科技	八年级	请说明什么是递归，并举例说明。	\N	"递归是函数调用自己，如计算阶乘：n! = n × (n-1)!"	10	hard	理解递归概念	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.633405	2025-11-02 03:29:38.633405	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020030
436	single	信息科技	九年级	以下哪个不是数据库管理系统？	{"A": "MySQL", "B": "Oracle", "C": "Photoshop", "D": "MongoDB"}	"C"	5	easy	Photoshop是图像处理软件	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020031
437	multiple	信息科技	九年级	SQL语言中，以下哪些是数据操作语句？（多选）	{"A": "SELECT", "B": "INSERT", "C": "UPDATE", "D": "DELETE"}	["A", "B", "C", "D"]	5	medium	SQL的基本操作语句	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L7	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020032
438	true_false	信息科技	九年级	HTML是一种编程语言。	{"A": "正确", "B": "错误"}	"B"	5	easy	HTML是标记语言，不是编程语言	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020033
439	blank	信息科技	九年级	在网页开发中，CSS用于控制网页的___	\N	"样式"	5	easy	CSS用于控制网页样式	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L6	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020034
440	essay	信息科技	九年级	请说明前端开发和后端开发的区别。	\N	"前端负责用户界面和交互，后端负责数据处理和业务逻辑"	10	medium	理解前后端概念	\N	\N	\N	60	0	\N	t	\N	2025-11-02 03:29:38.63453	2025-11-02 03:29:38.63453	{}	{}	L7	5	published	{}	\N	\N	\N	\N	\N	OTHR2511020035
3	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 13:48:21.645421	2025-10-14 13:48:21.645421	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 13:48:21.645421	1	MATH2510140001
4	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.486382	2025-10-14 14:49:55.486382	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.486382	1	MATH2510140002
5	single	数学	七年级	已知∠A=35°，则∠A的余角是（）	["A. 55°", "B. 65°", "C. 145°", "D. 155°"]	"A"	5	easy	余角是两个角的和为90°，90°-35°=55°	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.49315	2025-10-14 14:49:55.49315	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.49315	1	MATH2510140003
13	blank	数学	七年级	一个数的相反数是-5，这个数是______。	["5"]	"5"	5	easy	相反数的定义：只有符号不同的两个数互为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.523099	2025-10-14 14:49:55.523099	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.523099	1	MATH2510140007
14	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.675635	2025-10-14 14:52:13.675635	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.675635	1	MATH2510140008
15	single	数学	七年级	已知∠A=35°，则∠A的余角是（）	["A. 55°", "B. 65°", "C. 145°", "D. 155°"]	"A"	5	easy	余角是两个角的和为90°，90°-35°=55°	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.68077	2025-10-14 14:52:13.68077	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.68077	1	MATH2510140009
441	single	数学	一年级	test	["1", "2", "3", "4"]	"B"	5	medium	test	\N	\N	\N	39	0	\N	t	\N	2025-11-03 12:14:02.866649	2025-11-03 12:14:02.866649	{computational_thinking}	{math_number_operations}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2511030001
18	single	数学	九年级	已知一元二次方程x²-5x+6=0的两根为x₁和x₂，则x₁+x₂的值为（）	["A. -5", "B. 5", "C. -6", "D. 6"]	"B"	5	medium	根据韦达定理，x₁+x₂=-b/a=5	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.691306	2025-10-14 14:52:13.691306	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.691306	1	MATH2510140012
19	single	数学	九年级	抛物线y=2(x-1)²+3的顶点坐标是（）	["A. (1,3)", "B. (-1,3)", "C. (1,-3)", "D. (-1,-3)"]	"A"	5	easy	抛物线顶点式y=a(x-h)²+k，顶点坐标为(h,k)，所以是(1,3)	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.694695	2025-10-14 14:52:13.694695	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.694695	1	MATH2510140013
33	multiple	数学	九年级	下列说法正确的有（）	["A. 对角线互相垂直的四边形是菱形", "B. 对角线相等的平行四边形是矩形", "C. 对角线互相垂直平分且相等的四边形是正方形", "D. 一组对边平行的四边形是梯形"]	["B", "C"]	10	medium	B、C选项符合矩形和正方形的判定定理	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.740522	2025-10-14 14:52:13.740522	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.740522	1	MATH2510140015
42	blank	数学	七年级	一个数的相反数是-5，这个数是______。	["5"]	"5"	5	easy	相反数的定义：只有符号不同的两个数互为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.764821	2025-10-14 14:52:13.764821	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.764821	1	MATH2510140016
41	multiple	信息科技	八年级	下列关于网络安全的做法正确的有（）	["A. 定期更新杀毒软件", "B. 不随意打开陌生邮件", "C. 使用简单密码便于记忆", "D. 不在公共场合输入密码"]	["A", "B", "D"]	10	medium	A、B、D都是正确的网络安全做法；C使用简单密码不安全	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.762264	2025-10-14 14:52:13.762264	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.762264	1	COMP2510140005
51	blank	信息科技	八年级	IP地址由______位二进制数组成。	["32"]	"32"	5	medium	IPv4地址由32位二进制数组成，通常表示为4组十进制数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.790997	2025-10-14 14:52:13.790997	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.790997	1	COMP2510140007
53	essay	数学	九年级	某商店销售一种商品，每件成本40元，若售价为50元，每天可售出100件。经调查，售价每提高1元，每天销量减少5件。问：售价定为多少元时，每天的利润最大？最大利润是多少？	\N	"设售价为(50+x)元，则每天销量为(100-5x)件，利润y=(50+x-40)(100-5x)=(10+x)(100-5x)=-5x²+50x+1000=-5(x-5)²+1125。当x=5时，y最大=1125元，此时售价为55元。"	20	hard	利用二次函数求最值，建立数学模型求解实际问题	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.79629	2025-10-14 14:52:13.79629	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.79629	1	MATH2510140019
64	single	数学	七年级	1+1 = ?	["1", "2"]	"A"	5	medium	test	{test}	\N	\N	1	0	\N	t	\N	2025-10-15 15:46:55.277518	2025-10-15 15:46:55.277518	{abstract_thinking}	{math_number_operations}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510150001
65	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:24:47.803792	2025-10-17 17:24:47.803792	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170001
66	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:25:18.38377	2025-10-17 17:25:18.38377	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170002
61	essay	信息科技	八年级	请简述冯·诺依曼计算机的工作原理，并说明"存储程序"的含义。	\N	"冯·诺依曼计算机工作原理：1.采用二进制；2.存储程序；3.由运算器、控制器、存储器、输入设备和输出设备五部分组成。\\"存储程序\\"的含义：将程序和数据事先存入存储器，计算机工作时能自动从存储器取出指令并执行，实现自动化处理。这是现代计算机的基本工作方式。"	20	medium	考查计算机基本原理的理解	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.817797	2025-10-14 14:52:13.817797	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.817797	1	COMP2510140009
63	code	信息科技	八年级	编写程序：输入一个正整数n，计算并输出1到n之间所有偶数的和。	\N	"n = int(input())\\nsum = 0\\nfor i in range(2, n+1, 2):\\n    sum += i\\nprint(sum)"	20	medium	使用循环累加计算偶数和	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.823338	2025-10-14 14:52:13.823338	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.823338	1	COMP2510140011
69	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:32:26.385253	2025-10-17 17:32:26.385253	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170003
71	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:33:22.805023	2025-10-17 17:33:22.805023	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510170004
75	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.352896	2025-10-18 03:20:43.352896	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180001
76	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.403501	2025-10-18 03:20:43.403501	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180002
78	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.77082	2025-10-18 03:27:28.77082	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180003
80	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.872587	2025-10-18 03:27:28.872587	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180004
81	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.497328	2025-10-18 03:33:44.497328	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180005
84	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.929332	2025-10-18 03:33:44.929332	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180006
88	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.042617	2025-10-18 03:34:36.042617	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180007
90	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.301118	2025-10-18 03:34:36.301118	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180008
93	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.51387	2025-10-18 03:36:39.51387	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180009
96	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.805301	2025-10-18 03:36:39.805301	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180010
101	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:45.085789	2025-10-18 03:42:45.085789	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180011
102	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:45.143321	2025-10-18 03:42:45.143321	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180012
105	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.107466	2025-10-18 05:10:06.107466	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180013
108	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.298795	2025-10-18 05:10:06.298795	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180014
109	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.307997	2025-10-18 05:10:06.307997	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180015
114	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.269583	2025-10-18 05:19:17.269583	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180016
116	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.380685	2025-10-18 05:19:17.380685	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180017
117	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.41163	2025-10-18 05:19:17.41163	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180018
119	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:22:08.30656	2025-10-18 15:22:08.30656	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180019
121	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:22:59.520033	2025-10-18 15:22:59.520033	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180020
122	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:23:23.535966	2025-10-18 15:23:23.535966	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180021
128	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.305032	2025-10-19 11:24:02.305032	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190001
131	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.308802	2025-10-19 11:24:02.308802	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190002
132	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.323816	2025-10-19 11:24:07.933191	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190003
133	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.523144	2025-10-19 11:27:01.523144	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190004
135	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.566374	2025-10-19 11:27:01.566374	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190005
139	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.725765	2025-10-19 11:27:06.693596	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190006
140	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.079539	2025-10-19 11:30:05.079539	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190007
141	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.079862	2025-10-19 11:30:05.079862	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190008
145	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.268428	2025-10-19 11:30:05.268428	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190009
149	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.136329	2025-10-19 12:09:45.136329	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190010
150	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.154081	2025-10-19 12:09:45.154081	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190011
152	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.250338	2025-10-19 12:09:45.250338	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190012
157	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.577368	2025-10-19 12:14:19.577368	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190013
158	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.606139	2025-10-19 12:14:19.606139	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190014
160	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.617095	2025-10-19 12:14:25.434155	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190015
161	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 17:46:52.89898	2025-10-19 17:46:52.89898	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190016
166	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 18:03:48.351424	2025-10-19 18:03:48.351424	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190017
167	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 18:05:11.895475	2025-10-19 18:05:11.895475	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190018
182	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 14:19:23.411048	2025-10-20 14:19:31.00452	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200001
190	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:34:02.85602	2025-10-20 16:34:10.284889	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200003
207	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:29:05.895589	2025-10-21 05:29:05.895589	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210007
216	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:38:43.207741	2025-10-21 09:38:43.207741	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210014
359	essay	信息科技	九年级	请简述冒泡排序算法的基本思想。	null	"冒泡排序通过重复遍历数组，比较相邻元素并交换位置，将最大（或最小）元素逐步移到数组末端。"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{算法设计,排序算法}	{冒泡排序,算法原理}	L5	15	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300012
360	code	信息科技	九年级	编写程序：使用循环计算1到100的累加和。	null	"sum=0; for i=1 to 100: sum=sum+i; 输出sum"	20	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-30 10:52:26.304282	2025-10-30 10:52:26.304282	{循环结构,程序设计}	{for循环,累加运算}	L5	20	approved	{练习,测评}	\N	\N	\N	\N	\N	COMP2510300013
244	multiple	数学	五年级	下列哪些分数与 1/2 相等？\\nA. 2/4\\nB. 3/5\\nC. 4/8\\nD. 5/9	\N	{"answers": ["A", "C"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{数的认识}	{分数化简}	L2	3	approved	{}	\N	\N	\N	\N	\N	MATH0501003
245	blank	数学	五年级	5/8 + 1/8 = __	\N	{"answers": ["3/4"]}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{计算能力}	{分数加法}	L1	2	approved	{}	\N	\N	\N	\N	\N	MATH0501004
246	blank	数学	五年级	一个圆的半径是5厘米，它的面积是__平方厘米（π取3.14）	\N	{"answers": ["78.5"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{计算能力}	{圆的面积}	L2	3	approved	{}	\N	\N	\N	\N	\N	MATH0501005
247	essay	数学	五年级	一个水池能装水120立方米，现在有两个水龙头同时向水池注水，甲水龙头每小时注水15立方米，乙水龙头每小时注水10立方米。多长时间可以把水池注满？	\N	{"answer": "两个水龙头每小时共注水：15 + 10 = 25立方米\\n注满时间：120 ÷ 25 = 4.8小时"}	1	hard	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-29 16:40:02.986145	{应用能力,逻辑推理}	{应用题,速度与时间}	L3	5	approved	{}	\N	\N	\N	\N	\N	MATH0501006
243	single	数学	五年级	一个长方体的长是10cm，宽是5cm，高是3cm，它的体积是多少立方厘米？	["1", "2"]	[""]	1	medium	\N	{}	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-30 05:46:58.49467	{空间想象}	{长方体体积}	L2	3	approved	{}	\N	\N	\N	\N	\N	MATH0501002
242	single	数学	五年级	计算：3.5 + 2.8 = ?	["6.3", "7", "2", "1"]	[""]	1	easy	\N	{}	\N	\N	1	0	\N	t	\N	2025-10-29 16:40:02.986145	2025-10-30 05:47:23.967647	{计算能力}	{小数加法}	L1	2	approved	{}	\N	\N	\N	\N	\N	MATH0501001
6	single	数学	八年级	下列运算正确的是（）	["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]	"B"	5	medium	同底数幂相乘，底数不变，指数相加：a³·a²=a⁵	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.497827	2025-10-14 14:49:55.497827	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:49:55.497827	1	MATH2510140004
7	single	数学	八年级	在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）	["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]	"B"	5	medium	关于x轴对称，x坐标不变，y坐标变为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.501951	2025-10-14 14:49:55.501951	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:49:55.501951	1	MATH2510140005
237	multiple	数学	三年级	下列哪些数字是偶数？\\nA. 12\\nB. 15\\nC. 18\\nD. 21	\N	{"answers": ["A", "C"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{数的认识}	{奇偶数}	L2	3	published	{}	\N	\N	\N	\N	\N	MATH0301004
12	multiple	数学	八年级	下列函数中，y随x增大而增大的有（）	["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]	["A", "C"]	10	medium	A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.520347	2025-10-14 14:49:55.520347	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:49:55.520347	1	MATH2510140006
16	single	数学	八年级	下列运算正确的是（）	["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]	"B"	5	medium	同底数幂相乘，底数不变，指数相加：a³·a²=a⁵	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.684548	2025-10-14 14:52:13.684548	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.684548	1	MATH2510140010
17	single	数学	八年级	在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）	["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]	"B"	5	medium	关于x轴对称，x坐标不变，y坐标变为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.68811	2025-10-14 14:52:13.68811	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.68811	1	MATH2510140011
238	blank	数学	三年级	3 × 4 = __	\N	{"answers": ["12"]}	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{计算能力}	{乘法运算,乘法口诀}	L1	2	published	{}	\N	\N	\N	\N	\N	MATH0301005
239	blank	数学	三年级	一盒铅笔有12支，3盒铅笔一共有__支	\N	{"answers": ["36"]}	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{应用能力}	{乘法应用,应用题}	L2	3	published	{}	\N	\N	\N	\N	\N	MATH0301006
240	essay	数学	三年级	小明有30元钱，买了一本书花了12元，买了一支笔花了5元。请问：\\n1. 小明一共花了多少钱？\\n2. 小明还剩多少钱？	\N	{"answer": "1. 12 + 5 = 17元\\n2. 30 - 17 = 13元"}	1	hard	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-29 16:39:36.799567	2025-10-29 16:39:36.799567	{应用能力,逻辑推理}	{综合应用,加减混合运算}	L3	5	published	{}	\N	\N	\N	\N	\N	MATH0301007
11	single	信息科技	七年级	下列设备中，属于输入设备的是（）	["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]	"C"	5	easy	键盘是输入设备，用于向计算机输入数据和指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.516847	2025-10-14 14:49:55.516847	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:49:55.516847	1	COMP2510140001
32	multiple	数学	八年级	下列函数中，y随x增大而增大的有（）	["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]	["A", "C"]	10	medium	A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.737829	2025-10-14 14:52:13.737829	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.737829	1	MATH2510140014
43	blank	数学	八年级	若x²-6x+m是完全平方式，则m=______。	["9"]	"9"	5	medium	完全平方公式：(x-3)²=x²-6x+9，所以m=9	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.76764	2025-10-14 14:52:13.76764	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.76764	1	MATH2510140017
52	essay	数学	八年级	已知△ABC中，AB=AC，点D在BC上，且AD平分∠BAC。求证：BD=CD。	\N	"证明：因为AB=AC，AD平分∠BAC，所以∠BAD=∠CAD。在△ABD和△ACD中，AB=AC，∠BAD=∠CAD，AD=AD，所以△ABD≌△ACD(SAS)，所以BD=CD。"	15	medium	利用等腰三角形的性质和全等三角形的判定与性质	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.793693	2025-10-14 14:52:13.793693	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.793693	1	MATH2510140018
30	single	信息科技	七年级	下列设备中，属于输入设备的是（）	["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]	"C"	5	easy	键盘是输入设备，用于向计算机输入数据和指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.73246	2025-10-14 14:52:13.73246	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.73246	1	COMP2510140002
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
31	single	信息科技	七年级	计算机的"大脑"是（）	["A. 硬盘", "B. CPU", "C. 内存", "D. 主板"]	"B"	5	easy	CPU(中央处理器)是计算机的核心，负责处理数据和执行指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.7352	2025-10-14 14:52:13.7352	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.7352	1	COMP2510140003
40	multiple	信息科技	七年级	下列属于应用软件的有（）	["A. Windows", "B. Word", "C. Excel", "D. PowerPoint"]	["B", "C", "D"]	10	easy	Windows是操作系统，Word、Excel、PowerPoint是应用软件	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.759691	2025-10-14 14:52:13.759691	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.759691	1	COMP2510140004
50	blank	信息科技	七年级	计算机中最小的信息单位是______。	["位", "bit", "比特"]	"位"	5	easy	位(bit)是计算机中最小的信息单位，表示0或1	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.788394	2025-10-14 14:52:13.788394	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.788394	1	COMP2510140006
60	essay	信息科技	七年级	请说明什么是计算机病毒，并列举三种预防计算机病毒的方法。	\N	"计算机病毒是一种人为编制的、能够自我复制并破坏计算机功能或数据的程序。预防方法：1.安装正版杀毒软件并定期更新；2.不随意打开来历不明的邮件和文件；3.不使用来历不明的U盘和光盘；4.定期备份重要数据；5.及时更新操作系统补丁。"	15	easy	考查网络安全意识和防护措施	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.814946	2025-10-14 14:52:13.814946	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.814946	1	COMP2510140008
62	code	信息科技	七年级	编写程序：输入三个整数，输出其中的最大值。	\N	"a = int(input())\\nb = int(input())\\nc = int(input())\\nmax_num = a\\nif b > max_num:\\n    max_num = b\\nif c > max_num:\\n    max_num = c\\nprint(max_num)"	20	easy	使用条件判断找出最大值	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.820675	2025-10-14 14:52:13.820675	{}	{}	\N	5	approved	{}	\N	\N	\N	2025-10-14 14:52:13.820675	1	COMP2510140010
\.


--
-- Data for Name: question_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_categories (id, name, parent_id, subject, description, created_at) FROM stdin;
\.


--
-- Data for Name: question_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_reviews (id, question_id, reviewer_id, status, comment, reviewed_at, created_at) FROM stdin;
1	198	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.616221	2025-10-21 05:04:17.616221
8	226	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 11:18:43.469591	2025-10-21 11:18:43.469591
9	231	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 12:20:17.979013	2025-10-21 12:20:17.979013
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (id, exam_id, type, content, options, correct_answer, score, order_no, difficulty, explanation, created_at) FROM stdin;
4	2	single	3 + 5 = ?	["A. 6", "B. 7", "C. 8", "D. 9"]	C	5	1	easy	\N	2025-09-24 15:09:18.528391
5	2	single	小明有12个苹果，吃了3个，还剩几个？	["A. 8个", "B. 9个", "C. 10个", "D. 15个"]	B	5	2	easy	\N	2025-09-24 15:09:18.528391
6	2	single	一个正方形的边长是4厘米，它的周长是多少？	["A. 12厘米", "B. 16厘米", "C. 20厘米", "D. 8厘米"]	B	10	3	medium	\N	2025-09-24 15:09:18.528391
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
99	64	submitted	\N	0	学生涂皓提交注册申请	{"phone": "18689462770", "school": "云岩区第一小学"}	2025-10-31 00:04:13.618382
100	64	approved	\N	2	注册申请已批准，学生账号已创建	{"studentUserId": 144, "initialPassword": "(hidden)"}	2025-10-31 00:05:05.10235
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
-- Data for Name: student_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_activities (id, student_id, activity_id, session_id, status, start_time, submit_time, score, rank, ip_address, created_at, attempt_number, is_retake, previous_attempt_id, started_at, time_limit_deadline, grading_status) FROM stdin;
30	144	113	\N	in_progress	2025-10-31 00:14:35.963628	\N	\N	\N	172.18.0.1	2025-10-31 00:14:35.963628	1	f	\N	2025-10-31 00:14:35.963628	\N	pending
31	11	120	\N	in_progress	2025-10-31 13:53:56.187341	\N	\N	\N	172.18.0.1	2025-10-31 13:53:56.187341	1	f	\N	2025-10-31 13:53:56.187341	\N	pending
32	11	121	\N	in_progress	2025-10-31 13:53:56.252897	\N	\N	\N	172.18.0.1	2025-10-31 13:53:56.252897	1	f	\N	2025-10-31 13:53:56.252897	\N	pending
33	11	124	\N	in_progress	2025-10-31 14:01:54.295045	\N	\N	\N	172.18.0.1	2025-10-31 14:01:54.295045	1	f	\N	2025-10-31 14:01:54.295045	\N	pending
2	11	2	\N	submitted	2025-10-13 04:20:54.262585	2025-10-13 04:20:57.353961	0.00	\N	::ffff:172.18.0.1	2025-10-13 04:10:32.153784	1	f	\N	\N	\N	pending
34	11	123	\N	in_progress	2025-10-31 14:01:54.310219	\N	\N	\N	172.18.0.1	2025-10-31 14:01:54.310219	1	f	\N	2025-10-31 14:01:54.310219	\N	pending
35	11	127	\N	in_progress	2025-10-31 14:15:13.329796	\N	\N	\N	172.18.0.1	2025-10-31 14:15:13.329796	1	f	\N	2025-10-31 14:15:13.329796	\N	pending
36	11	128	\N	in_progress	2025-10-31 14:28:34.821658	\N	\N	\N	172.18.0.1	2025-10-31 14:28:34.821658	1	f	\N	2025-10-31 14:28:34.821658	\N	pending
37	11	129	\N	in_progress	2025-10-31 14:35:22.822608	\N	\N	\N	172.18.0.1	2025-10-31 14:35:22.822608	1	f	\N	2025-10-31 14:35:22.822608	\N	pending
38	11	130	\N	in_progress	2025-10-31 14:44:52.257399	\N	\N	\N	172.18.0.1	2025-10-31 14:44:52.257399	1	f	\N	2025-10-31 14:44:52.257399	\N	pending
39	11	131	\N	in_progress	2025-10-31 14:51:04.598216	\N	\N	\N	172.18.0.1	2025-10-31 14:51:04.598216	1	f	\N	2025-10-31 14:51:04.598216	\N	pending
40	11	134	\N	in_progress	2025-10-31 14:55:25.77488	\N	\N	\N	172.18.0.1	2025-10-31 14:55:25.77488	1	f	\N	2025-10-31 14:55:25.77488	\N	pending
41	11	133	\N	in_progress	2025-10-31 14:55:25.775093	\N	\N	\N	172.18.0.1	2025-10-31 14:55:25.775093	1	f	\N	2025-10-31 14:55:25.775093	\N	pending
42	11	136	\N	in_progress	2025-10-31 15:00:22.046742	\N	\N	\N	172.18.0.1	2025-10-31 15:00:22.046742	1	f	\N	2025-10-31 15:00:22.046742	\N	pending
43	11	135	\N	in_progress	2025-10-31 15:00:22.047247	\N	\N	\N	172.18.0.1	2025-10-31 15:00:22.047247	1	f	\N	2025-10-31 15:00:22.047247	\N	pending
44	11	139	\N	in_progress	2025-10-31 15:05:34.401109	\N	\N	\N	172.18.0.1	2025-10-31 15:05:34.401109	1	f	\N	2025-10-31 15:05:34.401109	\N	pending
45	11	138	\N	in_progress	2025-10-31 15:05:34.401282	\N	\N	\N	172.18.0.1	2025-10-31 15:05:34.401282	1	f	\N	2025-10-31 15:05:34.401282	\N	pending
46	11	143	\N	in_progress	2025-10-31 15:24:37.757688	\N	\N	\N	172.18.0.1	2025-10-31 15:24:37.757688	1	f	\N	2025-10-31 15:24:37.757688	\N	pending
47	11	141	\N	in_progress	2025-10-31 15:24:37.757861	\N	\N	\N	172.18.0.1	2025-10-31 15:24:37.757861	1	f	\N	2025-10-31 15:24:37.757861	\N	pending
48	11	145	\N	in_progress	2025-10-31 15:29:00.32032	\N	\N	\N	172.18.0.1	2025-10-31 15:29:00.32032	1	f	\N	2025-10-31 15:29:00.32032	\N	pending
49	11	144	\N	in_progress	2025-10-31 15:29:00.369467	\N	\N	\N	172.18.0.1	2025-10-31 15:29:00.369467	1	f	\N	2025-10-31 15:29:00.369467	\N	pending
23	11	104	\N	in_progress	2025-10-27 14:29:40.893127	\N	\N	\N	172.18.0.1	2025-10-27 14:29:40.888812	1	f	\N	2025-10-27 14:29:40.893127	\N	pending
22	11	105	\N	in_progress	2025-10-27 14:29:40.893319	\N	\N	\N	172.18.0.1	2025-10-27 14:29:40.888607	1	f	\N	2025-10-27 14:29:40.893319	\N	pending
24	11	108	\N	graded	2025-10-30 03:09:05.85684	2025-10-30 03:09:05.869109	0.00	\N	::ffff:172.18.0.1	2025-10-30 03:09:05.85684	1	f	\N	2025-10-30 03:09:05.85684	\N	completed
25	11	109	\N	graded	2025-10-30 03:31:40.220498	2025-10-30 03:31:40.231822	0.00	\N	::ffff:172.18.0.1	2025-10-30 03:31:40.220498	1	f	\N	2025-10-30 03:31:40.220498	\N	completed
26	11	110	\N	graded	2025-10-30 03:36:02.048377	2025-10-30 03:36:02.097904	0.00	\N	::ffff:172.18.0.1	2025-10-30 03:36:02.048377	1	f	\N	2025-10-30 03:36:02.048377	\N	completed
28	11	112	\N	graded	2025-10-30 03:41:15.660482	2025-10-30 03:41:15.684955	0.00	\N	::ffff:172.18.0.1	2025-10-30 03:41:15.660482	1	f	\N	2025-10-30 03:41:15.660482	\N	completed
27	11	111	\N	graded	2025-10-30 03:39:26.265031	2025-10-30 03:39:26.289573	0.00	\N	::ffff:172.18.0.1	2025-10-30 03:39:26.265031	1	f	\N	2025-10-30 03:39:26.265031	\N	completed
29	11	113	\N	graded	2025-10-30 03:43:06.687603	2025-10-30 03:43:06.714166	0.00	\N	::ffff:172.18.0.1	2025-10-30 03:43:06.687603	1	f	\N	2025-10-30 03:43:06.687603	\N	completed
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
7	13924460858	测试学生0858	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 11:41:00.946113	2025-11-02 12:00:00.884667	\N	\N	\N	\N	2025-10-30 11:41:00.946113	2025-11-02 12:00:00.884667
15	13925876257	另一个学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 12:04:41.935364	2025-11-02 13:00:00.800824	\N	\N	\N	\N	2025-10-30 12:04:41.935364	2025-11-02 13:00:00.800824
16	13925876250	E2E测试学生6250	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 12:04:42.770068	2025-11-02 13:00:00.8058	\N	\N	\N	\N	2025-10-30 12:04:42.770068	2025-11-02 13:00:00.8058
17	13926070879	E2E测试学生0879	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 12:07:59.094055	2025-11-02 13:00:00.808159	\N	\N	\N	\N	2025-10-30 12:07:59.094055	2025-11-02 13:00:00.808159
18	13926223559	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 12:10:28.403412	2025-11-02 13:00:00.810361	\N	\N	\N	\N	2025-10-30 12:10:28.403412	2025-11-02 13:00:00.810361
19	13926285273	E2E测试学生5273	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 12:11:33.485698	2025-11-02 13:00:00.812114	\N	\N	\N	\N	2025-10-30 12:11:33.485698	2025-11-02 13:00:00.812114
20	13926353245	E2E测试学生3245	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 12:12:41.545675	2025-11-02 13:00:00.813855	\N	\N	\N	\N	2025-10-30 12:12:41.545675	2025-11-02 13:00:00.813855
21	13926499312	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 12:15:04.172614	2025-11-02 13:00:00.815674	\N	\N	\N	\N	2025-10-30 12:15:04.172614	2025-11-02 13:00:00.815674
36	13929084528	E2E测试学生4528	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 12:58:12.609212	2025-11-02 13:00:00.817675	\N	\N	\N	\N	2025-10-30 12:58:12.609212	2025-11-02 13:00:00.817675
37	13929230711	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 13:00:35.542696	2025-11-02 14:00:00.809434	\N	\N	\N	\N	2025-10-30 13:00:35.542696	2025-11-02 14:00:00.809434
38	13933148993	E2E测试学生8993	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 14:05:57.156889	2025-11-02 15:00:00.905054	\N	\N	\N	\N	2025-10-30 14:05:57.156889	2025-11-02 15:00:00.905054
39	13933234545	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 14:07:19.348015	2025-11-02 15:00:00.909946	\N	\N	\N	\N	2025-10-30 14:07:19.348015	2025-11-02 15:00:00.909946
40	13933990484	E2E测试学生0484	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 14:19:58.567165	2025-11-02 15:00:00.911796	\N	\N	\N	\N	2025-10-30 14:19:58.567165	2025-11-02 15:00:00.911796
2	13981700442	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	pending	4	\N	2025-10-27 16:15:00.567693	2025-11-02 18:00:00.136121	\N	\N	\N	\N	2025-10-27 16:15:00.567693	2025-11-02 18:00:00.136121
3	13981919889	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	pending	4	\N	2025-10-27 16:18:40.084104	2025-11-02 18:00:00.154144	\N	\N	\N	\N	2025-10-27 16:18:40.084104	2025-11-02 18:00:00.154144
4	13981967128	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	pending	4	\N	2025-10-27 16:19:27.406094	2025-11-02 18:00:00.156476	\N	\N	\N	\N	2025-10-27 16:19:27.406094	2025-11-02 18:00:00.156476
5	13982043570	API测试学生	2015-05-15	1234	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	二年级	pending	4	\N	2025-10-27 16:20:43.82442	2025-11-02 18:00:00.1584	\N	\N	\N	\N	2025-10-27 16:20:43.82442	2025-11-02 18:00:00.1584
56	13946061971	E2E测试学生1971	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:41:07.88804	2025-10-30 17:41:07.88804	2025-10-30 17:41:20.846127	\N	学生信息核验无误，批准注册	137	2025-10-30 17:41:07.88804	2025-10-30 17:41:20.846127
57	13946249680	E2E测试学生9680	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:44:15.481516	2025-10-30 17:44:15.481516	2025-10-30 17:44:28.690077	\N	学生信息核验无误，批准注册	138	2025-10-30 17:44:15.481516	2025-10-30 17:44:28.690077
58	13946802562	E2E测试学生2562	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:53:28.411016	2025-10-30 17:53:28.411016	2025-10-30 17:53:41.549463	\N	学生信息核验无误，批准注册	139	2025-10-30 17:53:28.411016	2025-10-30 17:53:41.549463
59	13947171921	E2E测试学生1921	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 17:59:37.71358	2025-10-30 17:59:37.71358	2025-10-30 17:59:50.573758	\N	学生信息核验无误，批准注册	140	2025-10-30 17:59:37.71358	2025-10-30 17:59:50.573758
60	13947210455	E2E测试学生0455	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 18:00:16.260648	2025-10-30 18:00:16.260648	2025-10-30 18:00:29.071647	\N	学生信息核验无误，批准注册	141	2025-10-30 18:00:16.260648	2025-10-30 18:00:29.071647
61	13947439550	E2E测试学生9550	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 18:04:05.32843	2025-10-30 18:04:05.32843	2025-10-30 18:04:18.070401	\N	学生信息核验无误，批准注册	142	2025-10-30 18:04:05.32843	2025-10-30 18:04:18.070401
62	13947630976	E2E测试学生0976	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	approved	2	\N	2025-10-30 18:07:16.781012	2025-10-30 18:07:16.781012	2025-10-30 18:07:29.588739	\N	学生信息核验无误，批准注册	143	2025-10-30 18:07:16.781012	2025-10-30 18:07:29.588739
64	18689462770	涂皓	2020-09-04	0538	1	YY	云岩区	6	YY-PS-01	云岩区第一小学	五年级	approved	2	\N	2025-10-31 00:04:13.616449	2025-10-31 00:04:13.616449	2025-10-31 00:05:05.10235	\N	申请已批准	144	2025-10-31 00:04:13.616449	2025-10-31 00:05:05.10235
41	13934049755	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 14:20:54.527986	2025-11-02 15:00:00.913436	\N	\N	\N	\N	2025-10-30 14:20:54.527986	2025-11-02 15:00:00.913436
42	13937667410	E2E测试学生7410	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 15:21:15.588663	2025-11-02 16:00:00.058294	\N	\N	\N	\N	2025-10-30 15:21:15.588663	2025-11-02 16:00:00.058294
43	13937765760	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 15:22:50.550007	2025-11-02 16:00:00.067557	\N	\N	\N	\N	2025-10-30 15:22:50.550007	2025-11-02 16:00:00.067557
44	13938102541	E2E测试学生2541	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 15:28:30.598918	2025-11-02 16:00:00.071596	\N	\N	\N	\N	2025-10-30 15:28:30.598918	2025-11-02 16:00:00.071596
45	13938161801	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 15:29:26.611866	2025-11-02 16:00:00.076507	\N	\N	\N	\N	2025-10-30 15:29:26.611866	2025-11-02 16:00:00.076507
46	13939187539	E2E测试学生7539	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 15:46:35.659671	2025-11-02 16:00:00.080322	\N	\N	\N	\N	2025-10-30 15:46:35.659671	2025-11-02 16:00:00.080322
47	13939242083	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 15:47:26.872124	2025-11-02 16:00:00.084135	\N	\N	\N	\N	2025-10-30 15:47:26.872124	2025-11-02 16:00:00.084135
48	13939521532	E2E测试学生1532	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 15:52:09.592513	2025-11-02 16:00:00.088358	\N	\N	\N	\N	2025-10-30 15:52:09.592513	2025-11-02 16:00:00.088358
49	13939576238	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 15:53:01.106071	2025-11-02 16:00:00.092355	\N	\N	\N	\N	2025-10-30 15:53:01.106071	2025-11-02 16:00:00.092355
50	13940932660	E2E测试学生2660	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 16:15:40.821353	2025-11-02 17:00:00.078406	\N	\N	\N	\N	2025-10-30 16:15:40.821353	2025-11-02 17:00:00.078406
51	13940987616	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 16:16:32.418503	2025-11-02 17:00:00.283216	\N	\N	\N	\N	2025-10-30 16:16:32.418503	2025-11-02 17:00:00.283216
52	13943477812	E2E测试学生7812	2010-05-15	1234	2	NM	南明区	2	GY002	贵阳市第二小学	四年级	pending	3	\N	2025-10-30 16:58:05.964096	2025-11-02 17:00:00.288672	\N	\N	\N	\N	2025-10-30 16:58:05.964096	2025-11-02 17:00:00.288672
53	13943535740	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 16:59:00.557046	2025-11-02 17:00:00.294686	\N	\N	\N	\N	2025-10-30 16:59:00.557046	2025-11-02 17:00:00.294686
55	13944883572	首次注册学生	2011-03-10	5678	2	NM	南明区	2	GY002	贵阳市第二小学	三年级	pending	3	\N	2025-10-30 17:21:28.37887	2025-11-02 18:00:00.160139	\N	\N	\N	\N	2025-10-30 17:21:28.37887	2025-11-02 18:00:00.160139
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, user_id, student_no, school_id, grade, class, enrollment_date, guardian_name, guardian_phone, created_at) FROM stdin;
1	11	S2024001	1	三年级	3班	\N	张父亲	13900139001	2025-09-24 15:09:18.52151
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
35	144	\N	6	五年级	\N	\N	\N	\N	2025-10-31 00:05:05.10235
\.


--
-- Data for Name: teacher_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teacher_permissions (id, user_id, permission_type, subjects, granted_by, granted_at, expires_at, is_active, notes, created_at, updated_at) FROM stdin;
1	1	question_bank_review	{数学,物理,化学,生物,计算机}	1	2025-10-15 15:15:37.045913	\N	t	系统管理员默认权限	2025-10-15 15:15:37.045913	2025-10-15 15:15:37.045913
2	1	assessment_review	{数学,物理,化学,生物,计算机}	1	2025-10-15 15:15:37.045913	\N	t	系统管理员默认权限	2025-10-15 15:15:37.045913	2025-10-15 15:15:37.045913
3	1	competition_review	{数学,物理,化学,生物,计算机}	1	2025-10-15 15:15:37.045913	\N	t	系统管理员默认权限	2025-10-15 15:15:37.045913	2025-10-15 15:15:37.045913
4	9	question_bank_review	{数学,物理,化学,生物,计算机}	1	2025-10-20 17:20:55.493331	\N	t	\N	2025-10-20 17:20:55.493331	2025-10-20 17:20:55.493331
5	10	question_bank_review	{数学,物理,化学,生物,计算机}	1	2025-10-20 17:20:55.497874	\N	t	\N	2025-10-20 17:20:55.497874	2025-10-20 17:20:55.497874
6	10	assessment_review	{数学,物理,化学,生物,计算机}	1	2025-10-21 12:16:16.209385	\N	t	为 R409 测试添加测评题库审核权限	2025-10-21 12:16:16.209385	2025-10-21 12:16:16.209385
7	9	assessment_review	{数学,物理,化学,生物,计算机}	1	2025-10-21 12:16:25.67183	\N	t	为 R409 测试添加测评题库审核权限	2025-10-21 12:16:25.67183	2025-10-21 12:16:25.67183
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
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, role, real_name, id_card, phone, email, avatar_url, status, created_at, updated_at) FROM stdin;
7	municipal_school_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	municipal_school_admin	市直属学校总管理员	\N	13800138030	municipal@guiyang.edu	\N	active	2025-09-24 15:09:18.516515	2025-09-24 15:09:18.516515
8	base_school_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	base_school_admin	信息技术基地校管理员	\N	13800138040	base@guiyang.edu	\N	active	2025-09-24 15:09:18.517234	2025-09-24 15:09:18.517234
4	guanshanhu_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	观山湖区管理员	\N	13800138012	gsh@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-10-04 06:22:48.164265
5	school_admin_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	第一小学管理员	\N	13800138020	school01@guiyang.edu	\N	active	2025-09-24 15:09:18.515839	2025-10-27 16:20:43.748748
12	13800138004	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	李小红	520102200802012345	13800138004	student02@example.com	\N	active	2025-09-24 15:09:18.518583	2025-10-30 14:36:38.649155
15	test_school_admin_1759590680149	$2a$10$0BWcbB8OWOlQxYncQxx9oewalqWGLvV5qV97wvx4ky9o4l1oZHnLW	school_admin	测试校级管理员	\N	13800138888	test_school@guiyang.edu	\N	active	2025-10-04 15:11:20.154128	2025-10-04 15:11:20.154128
16	test_district_admin_1759590680212	$2a$10$lvX5WiIGgJWmdAzzs9bLbuA7jRhGQInT4goLbZDZ7xKjt7aloMKuG	district_admin	测试区级管理员	\N	13800139999	test_district@guiyang.edu	\N	active	2025-10-04 15:11:20.216102	2025-10-04 15:11:20.216102
18	teacher03	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	teacher	王芳	520102198203253456	13800138003	wangfang@school.com	\N	active	2025-10-14 08:19:53.472845	2025-10-14 08:19:53.472845
19	student01	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	张小明	520102201001015678	13900139001	zhangxm@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
20	student02	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	李小红	520102201002026789	13900139002	lixh@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
11	13800138003	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	张小明	520102200801011234	13800138003	student01@example.com	\N	active	2025-09-24 15:09:18.518583	2025-11-01 12:12:18.924073
21	student03	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	王小刚	520102201003037890	13900139003	wangxg@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
14	test_user	$2a$10$/WJN2rZvsACiuZN2MaiJ3uGDcx67rljEcmAviS78waXaAv8uj3ERm	student	测试用户	\N	\N	\N	\N	active	2025-09-27 13:02:45.037069	2025-09-27 13:02:45.037069
22	student04	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	刘小丽	520102201004048901	13900139004	liuxl@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
23	student05	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	陈小华	520102201005059012	13900139005	chenxh@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
3	nanming_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	南明区管理员	\N	13800138011	nanming@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-10-29 11:29:36.585721
2	yunyan_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	云岩区管理员	\N	13800138010	yunyan@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-10-31 01:31:50.407741
10	teacher02	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	王老师	\N	13800138002	teacher02@guiyang.edu	\N	active	2025-09-24 15:09:18.517813	2025-10-21 12:20:15.941959
13	13800138005	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	王小刚	520102200803013456	13800138005	student03@example.com	\N	active	2025-09-24 15:09:18.518583	2025-10-30 14:36:38.649155
6	school_admin_02	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	第二小学管理员	\N	13800138021	school02@guiyang.edu	\N	active	2025-09-24 15:09:18.515839	2025-10-30 18:07:24.735153
9	teacher01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	李老师-测试	\N	13800138000	\N	\N	active	2025-09-24 15:09:18.517813	2025-11-01 12:12:21.844814
1	admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	system_admin	系统管理员	\N	13800138000	admin@guiyang.edu	\N	active	2025-09-24 15:09:18.513928	2025-11-03 10:50:43.824148
33	guiyang_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	municipal_admin	贵阳市教育局管理员	\N	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
34	qingzhen_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	清镇市教育局管理员	\N	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
35	xiuwen_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	修文县教育局管理员	\N	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
36	xifeng_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	息烽县教育局管理员	\N	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
37	kaiyang_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	开阳县教育局管理员	\N	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
38	guian_admin	$2b$10$rF8Y0fKZMf3z5JQZ9Y0fK.QZ9Y0fKZMf3z5JQZ9Y0fKZMf3z5JQZ9O	district_admin	贵安新区教育局管理员	\N	\N	\N	\N	active	2025-10-27 15:27:01.188416	2025-10-27 15:27:01.188416
40	teacher_yy_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	张明	\N	13900001001	teacher_yy_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
41	school_admin_yy_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	云岩区第一中学管理员	\N	13800001002	admin_yy_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
42	teacher_yy_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	李芳	\N	13900001002	teacher_yy_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
43	school_admin_yy_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	云岩区第一高中管理员	\N	13800001003	admin_yy_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
44	teacher_yy_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	王强	\N	13900001003	teacher_yy_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
45	school_admin_nm_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	南明区第一小学管理员	\N	13800002001	admin_nm_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
46	teacher_nm_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	赵丽	\N	13900002001	teacher_nm_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
47	school_admin_nm_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	南明区第一中学管理员	\N	13800002002	admin_nm_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
48	teacher_nm_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	孙伟	\N	13900002002	teacher_nm_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
49	school_admin_nm_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	南明区第一高中管理员	\N	13800002003	admin_nm_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
50	teacher_nm_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	周杰	\N	13900002003	teacher_nm_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
51	school_admin_gsh_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	观山湖区第一小学管理员	\N	13800003001	admin_gsh_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
52	teacher_gsh_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	吴雪	\N	13900003001	teacher_gsh_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
53	school_admin_gsh_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	观山湖区第一中学管理员	\N	13800003002	admin_gsh_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
54	teacher_gsh_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	郑涛	\N	13900003002	teacher_gsh_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
55	school_admin_gsh_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	观山湖区第一高中管理员	\N	13800003003	admin_gsh_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
56	teacher_gsh_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	冯婷	\N	13900003003	teacher_gsh_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
57	school_admin_by_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	白云区第一小学管理员	\N	13800004001	admin_by_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
58	teacher_by_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	陈刚	\N	13900004001	teacher_by_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
59	school_admin_by_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	白云区第一中学管理员	\N	13800004002	admin_by_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
60	teacher_by_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	蒋敏	\N	13900004002	teacher_by_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
61	school_admin_by_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	白云区第一高中管理员	\N	13800004003	admin_by_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
62	teacher_by_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	沈浩	\N	13900004003	teacher_by_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
63	school_admin_hx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	花溪区第一小学管理员	\N	13800005001	admin_hx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
64	teacher_hx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	韩冰	\N	13900005001	teacher_hx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
65	school_admin_hx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	花溪区第一中学管理员	\N	13800005002	admin_hx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
66	teacher_hx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	魏洋	\N	13900005002	teacher_hx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
67	school_admin_hx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	花溪区第一高中管理员	\N	13800005003	admin_hx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
68	teacher_hx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	姚鹏	\N	13900005003	teacher_hx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
69	school_admin_wd_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	乌当区第一小学管理员	\N	13800006001	admin_wd_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
70	teacher_wd_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	曹颖	\N	13900006001	teacher_wd_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
71	school_admin_wd_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	乌当区第一中学管理员	\N	13800006002	admin_wd_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
72	teacher_wd_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	薛磊	\N	13900006002	teacher_wd_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
73	school_admin_wd_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	乌当区第一高中管理员	\N	13800006003	admin_wd_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
74	teacher_wd_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	潘军	\N	13900006003	teacher_wd_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
75	school_admin_qz_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	清镇市第一小学管理员	\N	13800008001	admin_qz_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
76	teacher_qz_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	戴秀	\N	13900008001	teacher_qz_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
77	school_admin_qz_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	清镇市第一中学管理员	\N	13800008002	admin_qz_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
78	teacher_qz_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	石娜	\N	13900008002	teacher_qz_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
79	school_admin_qz_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	清镇市第一高中管理员	\N	13800008003	admin_qz_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
80	teacher_qz_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	段宇	\N	13900008003	teacher_qz_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
81	school_admin_xw_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	修文县第一小学管理员	\N	13800009001	admin_xw_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
82	teacher_xw_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	傅杰	\N	13900009001	teacher_xw_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
83	school_admin_xw_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	修文县第一中学管理员	\N	13800009002	admin_xw_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
84	teacher_xw_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	汤霞	\N	13900009002	teacher_xw_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
85	school_admin_xw_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	修文县第一高中管理员	\N	13800009003	admin_xw_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
86	teacher_xw_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	邹斌	\N	13900009003	teacher_xw_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
87	school_admin_xf_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	息烽县第一小学管理员	\N	13800010001	admin_xf_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
88	teacher_xf_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	熊芬	\N	13900010001	teacher_xf_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
89	school_admin_xf_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	息烽县第一中学管理员	\N	13800010002	admin_xf_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
90	teacher_xf_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	金龙	\N	13900010002	teacher_xf_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
91	school_admin_xf_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	息烽县第一高中管理员	\N	13800010003	admin_xf_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
92	teacher_xf_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	谷亮	\N	13900010003	teacher_xf_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
93	school_admin_ky_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	开阳县第一小学管理员	\N	13800011001	admin_ky_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
94	teacher_ky_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	丁晴	\N	13900011001	teacher_ky_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
95	school_admin_ky_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	开阳县第一中学管理员	\N	13800011002	admin_ky_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
96	teacher_ky_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	於涛	\N	13900011002	teacher_ky_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
97	school_admin_ky_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	开阳县第一高中管理员	\N	13800011003	admin_ky_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
98	teacher_ky_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	刁强	\N	13900011003	teacher_ky_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
99	school_admin_gaxq_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	贵安新区第一小学管理员	\N	13800012001	admin_gaxq_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
100	teacher_gaxq_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	毛琴	\N	13900012001	teacher_gaxq_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
101	school_admin_gaxq_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	贵安新区第一中学管理员	\N	13800012002	admin_gaxq_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
102	teacher_gaxq_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	文静	\N	13900012002	teacher_gaxq_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
103	school_admin_gaxq_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	贵安新区第一高中管理员	\N	13800012003	admin_gaxq_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
104	teacher_gaxq_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	云霞	\N	13900012003	teacher_gaxq_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
105	school_admin_gyszsx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	市直属第一小学管理员	\N	13800013001	admin_gyszsx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
106	teacher_gyszsx_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	卞梅	\N	13900013001	teacher_gyszsx_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
107	school_admin_gyszsx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	市直属第一中学管理员	\N	13800013002	admin_gyszsx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
108	teacher_gyszsx_ms_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	廉刚	\N	13900013002	teacher_gyszsx_ms_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
109	school_admin_gyszsx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	市直属第一高中管理员	\N	13800013003	admin_gyszsx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
110	teacher_gyszsx_hs_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	房亮	\N	13900013003	teacher_gyszsx_hs_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-10-29 14:15:48.542795
111	13924564023	$2a$10$Esb3ewWV4ufqSbZfm7QbTer8FR7ITnx0QQBDuqv9a25YTbWpm7QKO	student	测试学生4023	\N	13924564023	\N	\N	active	2025-10-30 11:42:44.159572	2025-10-30 11:42:44.159572
112	13924647294	$2a$10$9qK6EkYyFgEybooCeGMjDOLo1eg2wLODCai41ySzbSVEOMnfZOKyy	student	测试学生7294	\N	13924647294	\N	\N	active	2025-10-30 11:44:07.400894	2025-10-30 11:44:07.594056
124	13800138007	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	观山湖测试学生	1236	13800138007	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
113	13924730844	$2a$10$HfVYj2tzSoH6Zvz8mlsk3.TXPqqvwOzXq8DTTfJDUnZ3Ln/DxozbC	student	测试学生0844	\N	13924730844	\N	\N	active	2025-10-30 11:45:30.953362	2025-10-30 11:45:31.143918
125	13800138008	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	白云测试学生	1237	13800138008	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
114	13927189331	$2a$10$G9FsLMLJgWneXxK0mMGtDeHyfocX.K4IMYbeb6RGHJ.4hXldRkLri	student	测试学生9331	\N	13927189331	\N	\N	active	2025-10-30 12:26:29.439463	2025-10-30 12:26:29.633886
115	13927226950	$2a$10$ozFSwiMmjGtbb1JX4uvHL.P1kHvGxC5xocLSraLJ0i36zXsPEGm02	student	测试学生6950	\N	13927226950	\N	\N	active	2025-10-30 12:27:07.068119	2025-10-30 12:27:07.261702
126	13800138009	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	花溪测试学生	1238	13800138009	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
116	13927294180	$2a$10$7IY7nBFMSU1/jUd5S5QScetg9VMMTAFkrNqkqUjaDyedLO.PoEic.	student	测试学生4180	\N	13927294180	\N	\N	active	2025-10-30 12:28:14.278522	2025-10-30 12:28:14.471102
127	13800138010	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	乌当测试学生	1239	13800138010	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
117	13927326857	$2a$10$RWW.29.K5zRV3UHfJz/uxO4oq0x759Y6mDhNyLSjkW6WMMHDNYBwi	student	测试学生6857	\N	13927326857	\N	\N	active	2025-10-30 12:28:47.056474	2025-10-30 12:28:47.251177
128	13800138011	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	清镇测试学生	1240	13800138011	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
129	13800138012	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	修文测试学生	1241	13800138012	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
123	13800138006	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	南明测试学生	1235	13800138006	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
130	13800138013	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	息烽测试学生	1242	13800138013	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
131	13800138014	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	开阳测试学生	1243	13800138014	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
132	13800138015	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	贵安测试学生	1244	13800138015	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
133	13800138016	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	市直属测试学生	1245	13800138016	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
134	13800138017	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	市二小测试学生	1246	13800138017	\N	\N	active	2025-10-30 14:50:17.441118	2025-10-30 14:50:17.441118
137	13946061971	$2a$10$AqAZ2gBt7PtMcEBmn90paeOVsnl1lwmMQS.tGLsNQm.qpsFOWscs.	student	E2E测试学生1971	\N	13946061971	\N	\N	active	2025-10-30 17:41:20.846127	2025-10-30 17:41:20.846127
138	13946249680	$2a$10$EFmSOoQG0UELv257IpvYIO853v2hIujqKNIdg9KX8p1Bc2eRurSH.	student	E2E测试学生9680	\N	13946249680	\N	\N	active	2025-10-30 17:44:28.690077	2025-10-30 17:44:28.690077
139	13946802562	$2a$10$6tLD2L/KIdYzezZKOcSx3u0pgLkP7Ft.YIfBO6qePCjFy.TyroqOO	student	E2E测试学生2562	\N	13946802562	\N	\N	active	2025-10-30 17:53:41.549463	2025-10-30 17:53:41.549463
140	13947171921	$2a$10$QP62UyCa5R0ikDYazankYuR9bYsm/MUBMELxKI05A6LTCJX8MjIme	student	E2E测试学生1921	\N	13947171921	\N	\N	active	2025-10-30 17:59:50.573758	2025-10-30 17:59:50.573758
141	13947210455	$2a$10$Q6Wr6pBs7YJnkfpxhPD/ReC4deVCvO0YZZS4Tk9hJLdIfzFW2KuVi	student	E2E测试学生0455	\N	13947210455	\N	\N	active	2025-10-30 18:00:29.071647	2025-10-30 18:00:32.803106
142	13947439550	$2a$10$26h.Be3fNIf97rQv3JNQv.8czYNHXf4GmoJ26iK/Zbx/mGnezn3Kq	student	E2E测试学生9550	\N	13947439550	\N	\N	active	2025-10-30 18:04:18.070401	2025-10-30 18:04:23.598931
143	13947630976	$2a$10$KOQluCqPAEnSKnWvZq6bEuuogE435tdLfLQGs6roV80KgX8HVkHHy	student	E2E测试学生0976	\N	13947630976	\N	\N	active	2025-10-30 18:07:29.588739	2025-10-30 18:07:35.103954
144	18689462770	$2a$10$IFwVqmpVmuCh5/2SRtS5zOvzQvTy.PPyiLJYvJik6t4TtnujQGlxu	student	涂皓	\N	18689462770	\N	\N	active	2025-10-31 00:05:05.10235	2025-10-31 00:25:49.435339
145	baiyun_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	白云区教育局管理员	\N	13800138888	baiyun_admin@guiyang.edu.cn	\N	active	2025-11-02 08:38:09.278678	2025-11-02 08:38:09.278678
39	school_admin_yy_ps_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	云岩区第一小学管理员	\N	13800001001	admin_yy_ps_01@guiyang.edu	\N	active	2025-10-29 14:15:48.542795	2025-11-03 11:55:36.232312
\.


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activities_id_seq', 150, true);


--
-- Name: activity_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_history_id_seq', 1, false);


--
-- Name: activity_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_questions_id_seq', 121, true);


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_permissions_id_seq', 51, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.announcements_id_seq', 2, true);


--
-- Name: answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.answers_id_seq', 18, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: certificates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificates_id_seq', 1, false);


--
-- Name: districts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.districts_id_seq', 13, true);


--
-- Name: import_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.import_logs_id_seq', 1, false);


--
-- Name: question_bank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_id_seq', 441, true);


--
-- Name: question_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_categories_id_seq', 1, false);


--
-- Name: question_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_reviews_id_seq', 10, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questions_id_seq', 23, true);


--
-- Name: registration_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registration_audit_log_id_seq', 131, true);


--
-- Name: schools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schools_id_seq', 41, true);


--
-- Name: student_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_activities_id_seq', 49, true);


--
-- Name: student_registration_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_registration_requests_id_seq', 64, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 35, true);


--
-- Name: teacher_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teacher_permissions_id_seq', 7, true);


--
-- Name: teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teachers_id_seq', 39, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 145, true);


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
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


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
-- Name: question_bank question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_question_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_question_code_key UNIQUE (question_code);


--
-- Name: question_categories question_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_pkey PRIMARY KEY (id);


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
-- Name: teacher_permissions teacher_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_pkey PRIMARY KEY (id);


--
-- Name: teacher_permissions teacher_permissions_user_id_permission_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_user_id_permission_type_key UNIQUE (user_id, permission_type);


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
-- Name: users users_id_card_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_card_key UNIQUE (id_card);


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
-- Name: idx_activity_questions_activity_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_questions_activity_section ON public.activity_questions USING btree (activity_id, section);


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
-- Name: idx_question_bank_abilities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_abilities ON public.question_bank USING gin (abilities);


--
-- Name: idx_question_bank_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_active ON public.question_bank USING btree (is_active);


--
-- Name: idx_question_bank_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_category ON public.question_bank USING btree (category_id);


--
-- Name: idx_question_bank_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_code ON public.question_bank USING btree (question_code);


--
-- Name: idx_question_bank_difficulty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_difficulty ON public.question_bank USING btree (difficulty);


--
-- Name: idx_question_bank_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_grade ON public.question_bank USING btree (grade);


--
-- Name: idx_question_bank_knowledge_points; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_knowledge_points ON public.question_bank USING gin (knowledge_points);


--
-- Name: idx_question_bank_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_level ON public.question_bank USING btree (level);


--
-- Name: idx_question_bank_reviewer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_reviewer_id ON public.question_bank USING btree (reviewer_id);


--
-- Name: idx_question_bank_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_scope ON public.question_bank USING gin (scope);


--
-- Name: idx_question_bank_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_status ON public.question_bank USING btree (status);


--
-- Name: idx_question_bank_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_subject ON public.question_bank USING btree (subject);


--
-- Name: idx_question_bank_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_tags ON public.question_bank USING gin (tags);


--
-- Name: idx_question_bank_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_bank_type ON public.question_bank USING btree (type);


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
-- Name: idx_schools_district_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_district_id ON public.schools USING btree (district_id);


--
-- Name: idx_schools_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_type ON public.schools USING btree (type);


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
-- Name: idx_student_exams_exam_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_exams_exam_id ON public.student_activities USING btree (activity_id);


--
-- Name: idx_student_exams_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_exams_student_id ON public.student_activities USING btree (student_id);


--
-- Name: idx_students_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_id ON public.students USING btree (school_id);


--
-- Name: idx_students_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_user_id ON public.students USING btree (user_id);


--
-- Name: idx_teacher_permissions_permission_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_permissions_permission_type ON public.teacher_permissions USING btree (permission_type);


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
-- Name: idx_users_id_card; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_id_card ON public.users USING btree (id_card);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: question_bank trigger_auto_generate_question_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_generate_question_code BEFORE INSERT ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.auto_generate_question_code();


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
-- Name: answers trigger_update_grading_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_grading_status AFTER INSERT OR UPDATE OF grading_status, score ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_student_activity_grading_status();


--
-- Name: student_registration_requests trigger_update_registration_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_registration_updated_at BEFORE UPDATE ON public.student_registration_requests FOR EACH ROW EXECUTE FUNCTION public.update_registration_updated_at();


--
-- Name: activities trigger_validate_activity_time_limit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_activity_time_limit BEFORE INSERT OR UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.validate_activity_time_limit();


--
-- Name: activity_questions update_activity_questions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_activity_questions_updated_at BEFORE UPDATE ON public.activity_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: answers update_answers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities update_exams_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teacher_permissions update_teacher_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_teacher_permissions_updated_at BEFORE UPDATE ON public.teacher_permissions FOR EACH ROW EXECUTE FUNCTION public.update_teacher_permissions_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: answers answers_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: answers answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id);


--
-- Name: CONSTRAINT answers_question_id_fkey ON answers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT answers_question_id_fkey ON public.answers IS 'Foreign key to question_bank table';


--
-- Name: answers answers_student_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_student_exam_id_fkey FOREIGN KEY (student_exam_id) REFERENCES public.student_activities(id) ON DELETE CASCADE;


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
-- Name: activities exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: import_logs import_logs_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.question_categories(id);


--
-- Name: question_bank question_bank_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: question_categories question_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.question_categories(id);


--
-- Name: question_reviews question_reviews_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


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
-- Name: schools schools_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


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
-- Name: teacher_permissions teacher_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_permissions
    ADD CONSTRAINT teacher_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


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
-- PostgreSQL database dump complete
--

\unrestrict 5uth1yU6JvMEgGhEUCBu6rFPqxqaVgbx5u5S6cCA3e87NkFuPuC6bviLYxlui8G

