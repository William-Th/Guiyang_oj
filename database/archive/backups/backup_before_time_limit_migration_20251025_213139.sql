--
-- PostgreSQL database dump
--

\restrict jQbzxzxEMnpKRVdxDNx7zrXVkCqoIh9MgO5pFqduHEsveEgwqHDMsyzHdmYgNAB

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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.answers OWNER TO postgres;

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
    CONSTRAINT student_exams_status_check CHECK (((status)::text = ANY ((ARRAY['registered'::character varying, 'in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'absent'::character varying])::text[])))
);


ALTER TABLE public.student_activities OWNER TO postgres;

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
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: student_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_activities ALTER COLUMN id SET DEFAULT nextval('public.student_activities_id_seq'::regclass);


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

COPY public.activities (id, title, description, subject, grade, start_time, end_time, duration, total_score, pass_score, status, created_by, created_at, updated_at, type, ability_level, scope, allow_retake, max_attempts, is_official, target_audience, certificate_config) FROM stdin;
44	Test Practice 1761209795666	\N	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-23 08:56:35.669866	2025-10-23 08:56:35.669866	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
2	2024年春季数学期中考试	三年级数学期中测试，包含计算、应用题等内容	数学	三年级	2024-03-16 09:00:00	2024-03-16 10:30:00	60	100	60	published	9	2025-09-24 15:09:18.525972	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
4	API Test Exam 1760327528942	Created by automated test	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-13 03:52:08.944917	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
5	API Test Exam 1760327592554	Created by automated test	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-13 03:53:12.556521	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
14	2024春季数学期中考试	小学三年级数学期中测试	数学	三年级	2024-04-16 09:00:00	2024-04-16 11:00:00	90	100	60	published	10	2025-10-14 08:30:44.841034	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
15	2024春季数学单元测试	小学三年级数学第三单元测试	数学	三年级	2024-03-25 14:00:00	2024-03-25 15:30:00	60	100	60	finished	10	2025-10-14 08:30:44.841034	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
18	2024春季数学七年级期中考试	七年级数学期中测试	数学	七年级	2024-04-15 09:00:00	2024-04-15 11:00:00	120	100	60	published	9	2025-10-14 13:44:51.734668	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
19	2024春季数学八年级期中考试	八年级数学期中测试	数学	八年级	2024-04-16 09:00:00	2024-04-16 11:00:00	120	100	60	published	9	2025-10-14 13:44:51.734668	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
20	2024春季数学九年级模拟考试	九年级数学中考模拟	数学	九年级	2024-04-17 09:00:00	2024-04-17 11:30:00	120	120	72	finished	9	2025-10-14 13:44:51.734668	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
21	2024春季物理八年级期中考试	八年级物理期中测试	物理	八年级	2024-04-18 09:00:00	2024-04-18 10:30:00	90	100	60	published	10	2025-10-14 13:44:51.738011	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
22	2024春季物理九年级模拟考试	九年级物理中考模拟	物理	九年级	2024-04-19 09:00:00	2024-04-19 10:30:00	90	100	60	published	10	2025-10-14 13:44:51.738011	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
23	2024春季化学九年级期中考试	九年级化学期中测试	化学	九年级	2024-04-20 14:00:00	2024-04-20 15:30:00	90	100	60	published	18	2025-10-14 13:44:51.738965	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
24	2024春季生物七年级期中考试	七年级生物期中测试	生物	七年级	2024-04-21 14:00:00	2024-04-21 15:30:00	90	100	60	published	9	2025-10-14 13:44:51.739931	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
25	2024春季生物八年级期中考试	八年级生物期中测试	生物	八年级	2024-04-22 14:00:00	2024-04-22 15:30:00	90	100	60	draft	9	2025-10-14 13:44:51.739931	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
26	2024春季计算机七年级上机考试	七年级计算机实践操作	计算机	七年级	2024-05-05 14:00:00	2024-05-05 16:00:00	60	100	60	draft	10	2025-10-14 13:44:51.740789	2025-10-21 13:29:19.193359	practice	\N	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
27	API测试-练习活动	这是一个API测试创建的练习活动	数学	五年级	\N	\N	60	100	60	draft	9	2025-10-21 13:59:08.775733	2025-10-21 13:59:08.775733	practice	\N	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
28	API测试-练习活动	这是一个API测试创建的练习活动	数学	五年级	\N	\N	60	100	60	draft	9	2025-10-21 14:07:56.251776	2025-10-21 14:07:56.251776	practice	\N	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
29	API测试-测评活动	这是一个API测试创建的测评活动	数学	五年级	\N	\N	90	100	70	draft	24	2025-10-21 14:07:56.265625	2025-10-21 14:07:56.265625	assessment	\N	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": true, "template": "standard"}
30	API测试-练习活动	这是一个API测试创建的练习活动	数学	五年级	\N	\N	60	100	60	draft	9	2025-10-21 14:09:39.855415	2025-10-21 14:09:39.855415	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
31	API测试-测评活动	这是一个API测试创建的测评活动	数学	五年级	\N	\N	90	100	70	draft	24	2025-10-21 14:09:39.871067	2025-10-21 14:09:39.871067	assessment	L5	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": true, "template": "standard"}
32	Smoke测试-练习活动-1761111160808	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-22 05:32:45.783208	2025-10-22 05:32:45.783208	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
33	Smoke测试-练习活动-1761111195743	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-22 05:33:20.749409	2025-10-22 05:33:20.749409	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
34	Smoke测试-练习活动-1761146340144	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-22 15:19:05.103069	2025-10-22 15:19:05.103069	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
35	Smoke测试-练习活动-1761146995158	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-22 15:30:00.104958	2025-10-22 15:30:00.104958	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
36	Smoke测试-练习活动-1761148688883	这是一个自动化测试创建的练习活动	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-22 15:58:13.871654	2025-10-22 15:58:13.871654	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
37	Test Activity 1761209633050	\N	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-23 08:53:53.302721	2025-10-23 08:53:53.302721	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
38	Test Activity 1761209695135	\N	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-23 08:54:55.385064	2025-10-23 08:54:55.385064	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
39	Test Activity 1761209695135	\N	数学	三年级	\N	\N	60	100	60	draft	24	2025-10-23 08:54:55.433443	2025-10-23 08:54:55.433443	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
40	Test Practice 1761209711151	\N	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-23 08:55:11.155937	2025-10-23 08:55:11.155937	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
41	Test Practice 1761209779893	\N	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-23 08:56:19.898283	2025-10-23 08:56:19.898283	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
42	Test Activity 1761209795276	\N	数学	三年级	\N	\N	60	100	60	draft	9	2025-10-23 08:56:35.445534	2025-10-23 08:56:35.445534	practice	L3	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
43	Test Activity 1761209795276	\N	数学	三年级	\N	\N	60	100	60	draft	24	2025-10-23 08:56:35.498092	2025-10-23 08:56:35.498092	assessment	L3	district	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
45	Regression测试-完整练习-1761308248807	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-24 12:17:32.175078	2025-10-24 12:17:32.175078	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
46	Regression测试-完整练习-1761308668174	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-24 12:24:31.608657	2025-10-24 12:24:31.608657	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
47	ACT111-取消发布-1761314946526	ACT111测试活动-先发布再取消	科学	四年级	\N	\N	40	90	54	draft	9	2025-10-24 14:09:09.094719	2025-10-24 14:09:09.094719	practice	L4	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
48	ACT109-编辑测试-1761314946571	ACT109测试活动-草稿状态	英语	五年级	\N	\N	50	100	70	draft	9	2025-10-24 14:09:09.124434	2025-10-24 14:09:09.124434	practice	L5	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
49	Regression测试-完整练习-1761314946448	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-24 14:09:09.819967	2025-10-24 14:09:09.819967	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
50	ACT110-发布测试-1761316443509	ACT110测试活动-待发布	计算机	六年级	\N	\N	60	120	72	draft	9	2025-10-24 14:34:06.970472	2025-10-24 14:34:06.970472	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
51	ACT109-编辑测试-1761316443510	ACT109测试活动-草稿状态	英语	五年级	\N	\N	50	100	70	draft	9	2025-10-24 14:34:06.971235	2025-10-24 14:34:06.971235	practice	L5	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
52	ACT129-删除测试-1761316443589	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	draft	9	2025-10-24 14:34:07.003595	2025-10-24 14:34:07.003595	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
53	ACT111-取消发布-1761316443523	ACT111测试活动-先发布再取消	科学	四年级	\N	\N	40	90	54	draft	9	2025-10-24 14:34:07.017196	2025-10-24 14:34:07.017196	practice	L4	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
54	ACT108-查看详情-1761316443522	ACT108测试活动-用于查看详情	语文	二年级	\N	\N	30	80	48	draft	9	2025-10-24 14:34:07.021086	2025-10-24 14:34:07.021086	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
55	Regression测试-完整练习-1761316443508	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-24 14:34:07.811372	2025-10-24 14:34:07.811372	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
56	ACT110-发布测试-1761317878153	ACT110测试活动-待发布	计算机	六年级	\N	\N	60	120	72	draft	9	2025-10-24 14:58:01.582233	2025-10-24 14:58:01.582233	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
57	ACT109-编辑测试-1761317878161	ACT109测试活动-草稿状态	英语	五年级	\N	\N	50	100	70	draft	9	2025-10-24 14:58:01.599698	2025-10-24 14:58:01.599698	practice	L5	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
58	ACT111-取消发布-1761317878148	ACT111测试活动-先发布再取消	科学	四年级	\N	\N	40	90	54	draft	9	2025-10-24 14:58:01.612878	2025-10-24 14:58:01.612878	practice	L4	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
59	ACT108-查看详情-1761317878148	ACT108测试活动-用于查看详情	语文	二年级	\N	\N	30	80	48	draft	9	2025-10-24 14:58:01.616432	2025-10-24 14:58:01.616432	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
60	ACT129-删除测试-1761317878222	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	draft	9	2025-10-24 14:58:01.631899	2025-10-24 14:58:01.631899	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
61	Regression测试-完整练习-1761317878227	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-24 14:58:02.47338	2025-10-24 14:58:02.47338	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
62	ACT108-查看详情-1761320104523	ACT108测试活动-用于查看详情	语文	二年级	\N	\N	30	80	48	draft	9	2025-10-24 15:35:08.182703	2025-10-24 15:35:08.182703	practice	L2	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
63	ACT129-删除测试-1761320104718	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	draft	9	2025-10-24 15:35:08.263611	2025-10-24 15:35:08.263611	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
64	ACT110-发布测试-1761320104663	ACT110测试活动-待发布	计算机	六年级	\N	\N	60	120	72	draft	9	2025-10-24 15:35:08.311618	2025-10-24 15:35:08.311618	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
65	ACT109-编辑测试-1761320104737	ACT109测试活动-草稿状态	英语	五年级	\N	\N	50	100	70	draft	9	2025-10-24 15:35:08.328825	2025-10-24 15:35:08.328825	practice	L5	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
66	ACT111-取消发布-1761320104736	ACT111测试活动-先发布再取消	科学	四年级	\N	\N	40	90	54	draft	9	2025-10-24 15:35:08.399066	2025-10-24 15:35:08.399066	practice	L4	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
67	Regression测试-完整练习-1761320104678	这是一个包含完整信息的练习活动，用于回归测试	数学	三年级	\N	\N	45	100	60	draft	9	2025-10-24 15:35:09.143434	2025-10-24 15:35:09.143434	practice	L3	class	t	3	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
68	ACT111-取消发布-1761376173996	ACT111测试活动-先发布再取消	科学	四年级	\N	\N	40	90	54	published	9	2025-10-25 07:09:37.439614	2025-10-25 07:09:39.497738	practice	L4	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
69	ACT110-发布测试-1761376173996	ACT110测试活动-待发布	计算机	六年级	\N	\N	60	120	72	published	9	2025-10-25 07:09:37.440474	2025-10-25 07:09:39.498002	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
71	ACT110-发布测试-1761376490563	ACT110测试活动-待发布	计算机	六年级	\N	\N	60	120	72	published	9	2025-10-25 07:14:53.913453	2025-10-25 07:14:55.963875	practice	L6	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
70	ACT111-取消发布-1761376490497	ACT111测试活动-先发布再取消	科学	四年级	\N	\N	40	90	54	draft	9	2025-10-25 07:14:53.838371	2025-10-25 07:14:57.464513	practice	L4	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
72	ACT129-删除测试-1761377277698	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	draft	9	2025-10-25 07:28:01.0254	2025-10-25 07:28:01.0254	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
73	ACT129-删除测试-1761377512907	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	draft	9	2025-10-25 07:31:56.191186	2025-10-25 07:31:56.191186	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
74	ACT129-删除测试-1761377715754	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	draft	9	2025-10-25 07:35:19.052411	2025-10-25 07:35:19.052411	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
75	ACT129-删除测试-1761378042301	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	cancelled	9	2025-10-25 07:40:45.600574	2025-10-25 07:40:47.765806	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
76	ACT129-删除测试-1761378240168	ACT129测试活动-待删除	数学	一年级	\N	\N	20	50	30	cancelled	9	2025-10-25 07:44:03.477564	2025-10-25 07:44:05.644264	practice	L1	class	f	1	f	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
77	ACT131-统计查看-1761394890958	ACT131测试活动-查看统计	数学	三年级	\N	\N	45	100	60	draft	1	2025-10-25 12:21:34.610055	2025-10-25 12:21:34.610055	assessment	L3	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
78	Regression测试-测评活动-1761394892259	这是一个自动化回归测试创建的测评活动	数学	四年级	\N	\N	60	100	60	draft	1	2025-10-25 12:21:35.005899	2025-10-25 12:21:35.005899	assessment	L4	class	f	1	t	{"grades": [], "classes": [], "schools": []}	{"enabled": false, "template": null}
\.


--
-- Data for Name: activity_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_history (id, activity_id, action, changed_by, old_values, new_values, created_at) FROM stdin;
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

COPY public.answers (id, student_exam_id, question_id, answer, is_correct, score, graded_by, graded_at, created_at, updated_at) FROM stdin;
4	2	4	A	f	0.00	\N	\N	2025-10-13 04:20:57.289429	2025-10-13 04:20:57.349918
5	2	5	A	f	0.00	\N	\N	2025-10-13 04:20:57.289429	2025-10-13 04:20:57.349918
6	2	6	A	f	0.00	\N	\N	2025-10-13 04:20:57.289429	2025-10-13 04:20:57.349918
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
174	true_false	物理	八年级	测试编辑功能 - 修改后的内容	\N	true	6	medium	\N	{}	\N	\N	9	0	\N	t	\N	2025-10-20 13:56:25.241781	2025-10-20 13:56:32.941794	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200006
183	multiple	物理	八年级	以下哪些是基本物理量？	["质量", "长度", "速度", "时间"]	["A", "B", "D"]	8	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:23:50.112437	2025-10-20 16:23:50.112437	{}	{}	L2	8	draft	{}	\N	\N	\N	\N	\N	PHYS2510200014
191	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:39:09.876961	2025-10-20 16:39:18.170939	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200004
198	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:04:04.589358	2025-10-21 05:04:17.619616	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 05:04:17.614098	2025-10-21 05:04:17.619616	10	MATH2510210001
208	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:45:40.372132	2025-10-21 05:45:40.372132	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210008
209	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:45:40.388981	2025-10-21 05:45:40.388981	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510210004
217	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:46:20.793598	2025-10-21 09:46:20.793598	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210015
218	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:46:20.804938	2025-10-21 09:46:35.157665	{}	{}	L2	6	rejected	{practice}	10	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 09:46:35.157665	\N	\N	PHYS2510210006
229	true_false	生物	七年级	【R409-1761048377623】测试多选范围功能 - 光合作用	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:06:24.577844	2025-10-21 12:06:24.577844	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510210003
175	true_false	物理	八年级	测试编辑功能 - 修改后的内容	\N	true	6	medium	\N	{}	\N	\N	9	0	\N	t	\N	2025-10-20 13:57:34.68707	2025-10-20 13:57:42.387342	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200007
176	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 13:58:09.135903	2025-10-20 13:58:09.135903	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200008
184	blank	化学	九年级	水的化学式是____，它由____元素组成。	\N	["H2O,H₂O", "氢,氧,氢和氧"]	6	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:24:20.933559	2025-10-20 16:24:20.933559	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	CHEM2510200001
192	single	数学	七年级	Admin测试题目：计算 5 + 3 = ?	["6", "7", "8", "9"]	"C"	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-20 17:04:48.340723	2025-10-20 17:04:48.340723	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510200005
199	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:05:41.832429	2025-10-21 05:05:49.321354	{}	{}	L2	6	pending_review	{practice}	10	\N	\N	\N	\N	PHYS2510210001
210	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:52:03.22356	2025-10-21 05:52:03.22356	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210009
219	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 10:54:28.002576	2025-10-21 10:54:42.070114	{}	{}	L2	6	rejected	{practice}	10	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 10:54:42.070114	\N	\N	PHYS2510210007
230	true_false	生物	七年级	【R409-1761049011065】测试多选范围功能 - 光合作用	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:16:58.035754	2025-10-21 12:17:06.689165	{}	{}	L1	5	pending_review	{practice,assessment}	10	\N	\N	\N	\N	BIOL2510210004
177	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 14:02:01.623827	2025-10-20 14:02:01.623827	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200009
185	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:25:17.347582	2025-10-20 16:25:17.347582	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510200002
193	true_false	物理	八年级	Admin测试题目2：光在真空中的速度是3×10^8 m/s	\N	true	1	easy	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-20 17:05:14.548982	2025-10-20 17:05:14.548982	{}	{}	L2	3	draft	{}	\N	\N	\N	\N	\N	PHYS2510200016
194	multiple	化学	九年级	Admin测试题目3：以下哪些是金属元素？	["铁", "氧", "铜", "氮"]	["A", "C"]	1	medium	\N	\N	\N	\N	1	0	\N	t	\N	2025-10-20 17:05:14.55365	2025-10-20 17:05:14.55365	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	CHEM2510200004
200	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:08:22.609336	2025-10-21 05:08:22.609336	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210002
211	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:17:23.105681	2025-10-21 06:17:23.105681	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210010
220	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 10:54:28.003014	2025-10-21 10:54:28.003014	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210016
201	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:08:22.627925	2025-10-21 11:14:37.463863	{}	{}	L2	6	rejected	{practice}	10	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 11:14:37.463863	\N	\N	PHYS2510210002
232	true_false	生物	七年级	【R409-1761049197241】测试多选范围功能 - 光合作用	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:20:04.317443	2025-10-21 12:20:13.016365	{}	{}	L1	5	pending_review	{practice,assessment}	10	\N	\N	\N	\N	BIOL2510210005
231	true_false	数学	七年级	【R405-1761049197253】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:20:04.30024	2025-10-21 12:20:17.9815	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 12:20:17.977151	2025-10-21 12:20:17.9815	10	MATH2510210020
233	true_false	物理	八年级	【R406-1761049197254】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:20:04.447481	2025-10-21 12:20:19.144273	{}	{}	L2	6	rejected	{practice}	10	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 12:20:19.144273	\N	\N	PHYS2510210011
178	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 14:04:37.165992	2025-10-20 14:04:37.165992	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200010
186	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:28:30.103832	2025-10-20 16:28:30.103832	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510200003
195	single	数学	七年级	【待审核-批准】计算 15 + 25 = ?	["30", "35", "40", "45"]	"C"	1	easy	15 + 25 = 40	\N	\N	\N	9	0	\N	t	\N	2025-10-20 17:22:30.268164	2025-10-20 17:22:30.268164	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510200006
196	single	物理	八年级	【待审核-拒绝】光的传播速度是多少？	["3×10⁸ m/s", "3×10⁷ m/s", "3×10⁹ m/s", "3×10⁶ m/s"]	"A"	1	medium	光速约为3×10⁸ m/s	\N	\N	\N	9	0	\N	t	\N	2025-10-20 17:22:30.268164	2025-10-20 17:22:30.268164	{}	{}	L2	5	draft	{}	\N	\N	\N	\N	\N	PHYS2510200017
197	multiple	化学	九年级	【多选范围】以下属于金属的有哪些？	["铁", "铜", "碳", "铝"]	["A", "B", "D"]	1	medium	铁、铜、铝都是金属，碳是非金属	\N	\N	\N	9	0	\N	t	\N	2025-10-20 17:22:30.268164	2025-10-20 17:22:30.268164	{}	{}	L2	10	draft	{}	\N	\N	\N	\N	\N	CHEM2510200005
202	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:18:11.986108	2025-10-21 05:18:11.986108	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210003
203	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:18:12.01868	2025-10-21 05:18:24.602765	{}	{}	L2	6	rejected	{practice}	10	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 05:18:24.602765	\N	\N	PHYS2510210003
212	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:21:23.922288	2025-10-21 06:21:23.922288	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210011
222	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:03:42.939732	2025-10-21 11:03:42.939732	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210017
221	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:03:42.837119	2025-10-21 11:03:56.710911	{}	{}	L2	6	rejected	{practice}	10	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 11:03:56.710911	\N	\N	PHYS2510210008
179	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 14:07:28.606213	2025-10-20 14:07:28.606213	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200011
187	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:29:18.669805	2025-10-20 16:29:26.463108	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200002
204	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:21:23.941963	2025-10-21 05:21:23.941963	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210004
213	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 06:26:07.992328	2025-10-21 06:26:07.992328	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210012
223	true_false	物理	八年级	【R406-1761045256300】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:14:23.352673	2025-10-21 11:14:31.194577	{}	{}	L2	6	pending_review	{practice}	10	\N	\N	\N	\N	PHYS2510210009
224	true_false	数学	七年级	【R405-1761045256357】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:14:23.380148	2025-10-21 11:14:31.680168	{}	{}	L1	5	pending_review	{practice}	10	\N	\N	\N	\N	MATH2510210018
180	true_false	物理	八年级	测试编辑功能 - 修改后的内容	\N	true	6	medium	\N	{}	\N	\N	9	0	\N	t	\N	2025-10-20 14:16:17.435086	2025-10-20 14:16:25.066377	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200012
188	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:30:59.750442	2025-10-20 16:30:59.750442	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200015
205	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:24:27.887549	2025-10-21 05:24:27.887549	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210005
214	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:33:07.077578	2025-10-21 09:33:07.077578	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210013
225	true_false	物理	八年级	【R406-1761045501772】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:18:28.840339	2025-10-21 11:18:42.943108	{}	{}	L2	6	rejected	{practice}	10	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 11:18:42.943108	\N	\N	PHYS2510210010
226	true_false	数学	七年级	【R405-1761045501771】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:18:28.84058	2025-10-21 11:18:43.470724	{}	{}	L1	5	published	{practice}	10	题目质量良好，内容准确，批准通过。	2025-10-21 11:18:43.468054	2025-10-21 11:18:43.470724	10	MATH2510210019
181	true_false	物理	八年级	测试编辑功能 - 修改后的内容	\N	true	6	medium	\N	{}	\N	\N	9	0	\N	t	\N	2025-10-20 14:19:23.410787	2025-10-20 14:19:31.343559	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200013
189	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:30:59.783131	2025-10-20 16:31:07.189937	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	BIOL2510200001
206	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:26:45.285366	2025-10-21 05:26:45.285366	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210006
215	true_false	物理	八年级	【R406】测试审核拒绝功能 - 光速快于声速	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:38:43.199088	2025-10-21 09:38:43.199088	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510210005
227	true_false	生物	七年级	【R409-1761047896267】测试多选范围功能 - 光合作用	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 11:58:23.296072	2025-10-21 11:58:23.296072	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510210001
3	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 13:48:21.645421	2025-10-14 13:48:21.645421	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 13:48:21.645421	1	MATH2510140001
4	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.486382	2025-10-14 14:49:55.486382	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.486382	1	MATH2510140002
5	single	数学	七年级	已知∠A=35°，则∠A的余角是（）	["A. 55°", "B. 65°", "C. 145°", "D. 155°"]	"A"	5	easy	余角是两个角的和为90°，90°-35°=55°	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.49315	2025-10-14 14:49:55.49315	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.49315	1	MATH2510140003
6	single	数学	八年级	下列运算正确的是（）	["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]	"B"	5	medium	同底数幂相乘，底数不变，指数相加：a³·a²=a⁵	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.497827	2025-10-14 14:49:55.497827	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.497827	1	MATH2510140004
7	single	数学	八年级	在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）	["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]	"B"	5	medium	关于x轴对称，x坐标不变，y坐标变为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.501951	2025-10-14 14:49:55.501951	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.501951	1	MATH2510140005
8	single	物理	八年级	下列物理量中，以科学家的名字命名的单位是（）	["A. 长度", "B. 时间", "C. 力", "D. 速度"]	"C"	5	easy	力的单位是牛顿(N)，以科学家牛顿的名字命名	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.506381	2025-10-14 14:49:55.506381	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.506381	1	PHYS2510140001
9	single	化学	九年级	下列变化属于化学变化的是（）	["A. 冰雪融化", "B. 铁生锈", "C. 玻璃破碎", "D. 汽油挥发"]	"B"	5	easy	铁生锈是铁与氧气、水等发生化学反应，生成新物质，属于化学变化	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.509946	2025-10-14 14:49:55.509946	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.509946	1	CHEM2510140001
10	single	生物	七年级	细胞的控制中心是（）	["A. 细胞膜", "B. 细胞质", "C. 细胞核", "D. 线粒体"]	"C"	5	easy	细胞核内含有遗传物质，是细胞的控制中心	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.513493	2025-10-14 14:49:55.513493	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.513493	1	BIOL2510140001
11	single	计算机	七年级	下列设备中，属于输入设备的是（）	["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]	"C"	5	easy	键盘是输入设备，用于向计算机输入数据和指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.516847	2025-10-14 14:49:55.516847	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.516847	1	COMP2510140001
12	multiple	数学	八年级	下列函数中，y随x增大而增大的有（）	["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]	["A", "C"]	10	medium	A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.520347	2025-10-14 14:49:55.520347	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.520347	1	MATH2510140006
13	blank	数学	七年级	一个数的相反数是-5，这个数是______。	["5"]	"5"	5	easy	相反数的定义：只有符号不同的两个数互为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:49:55.523099	2025-10-14 14:49:55.523099	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:49:55.523099	1	MATH2510140007
14	single	数学	七年级	下列各数中，最小的数是（）	["A. -5", "B. -3", "C. 0", "D. 2"]	"A"	5	easy	负数小于零，负数中绝对值越大的数越小，所以-5最小	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.675635	2025-10-14 14:52:13.675635	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.675635	1	MATH2510140008
15	single	数学	七年级	已知∠A=35°，则∠A的余角是（）	["A. 55°", "B. 65°", "C. 145°", "D. 155°"]	"A"	5	easy	余角是两个角的和为90°，90°-35°=55°	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.68077	2025-10-14 14:52:13.68077	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.68077	1	MATH2510140009
16	single	数学	八年级	下列运算正确的是（）	["A. a²+a²=a⁴", "B. a³·a²=a⁵", "C. (a²)³=a⁵", "D. a⁶÷a²=a³"]	"B"	5	medium	同底数幂相乘，底数不变，指数相加：a³·a²=a⁵	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.684548	2025-10-14 14:52:13.684548	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.684548	1	MATH2510140010
17	single	数学	八年级	在平面直角坐标系中，点P(-3,2)关于x轴对称的点的坐标是（）	["A. (3,2)", "B. (-3,-2)", "C. (3,-2)", "D. (-3,2)"]	"B"	5	medium	关于x轴对称，x坐标不变，y坐标变为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.68811	2025-10-14 14:52:13.68811	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.68811	1	MATH2510140011
18	single	数学	九年级	已知一元二次方程x²-5x+6=0的两根为x₁和x₂，则x₁+x₂的值为（）	["A. -5", "B. 5", "C. -6", "D. 6"]	"B"	5	medium	根据韦达定理，x₁+x₂=-b/a=5	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.691306	2025-10-14 14:52:13.691306	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.691306	1	MATH2510140012
19	single	数学	九年级	抛物线y=2(x-1)²+3的顶点坐标是（）	["A. (1,3)", "B. (-1,3)", "C. (1,-3)", "D. (-1,-3)"]	"A"	5	easy	抛物线顶点式y=a(x-h)²+k，顶点坐标为(h,k)，所以是(1,3)	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.694695	2025-10-14 14:52:13.694695	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.694695	1	MATH2510140013
20	single	物理	八年级	下列物理量中，以科学家的名字命名的单位是（）	["A. 长度", "B. 时间", "C. 力", "D. 速度"]	"C"	5	easy	力的单位是牛顿(N)，以科学家牛顿的名字命名	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.698175	2025-10-14 14:52:13.698175	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.698175	1	PHYS2510140002
21	single	物理	八年级	关于光的传播，下列说法正确的是（）	["A. 光只能在真空中传播", "B. 光在同种均匀介质中沿直线传播", "C. 光的传播不需要时间", "D. 光在任何介质中的速度都相同"]	"B"	5	easy	光在同种均匀介质中沿直线传播是基本规律	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.702255	2025-10-14 14:52:13.702255	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.702255	1	PHYS2510140003
22	single	物理	九年级	下列说法正确的是（）	["A. 电流的方向是电子移动的方向", "B. 电源是提供电压的装置", "C. 电压的单位是安培", "D. 串联电路中各处电流不相等"]	"B"	5	medium	电源的作用是提供电压，使电路中形成持续电流	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.70647	2025-10-14 14:52:13.70647	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.70647	1	PHYS2510140004
23	single	物理	九年级	一个物体从静止开始做匀加速直线运动，第1秒内通过的位移是1m，则第2秒内通过的位移是（）	["A. 1m", "B. 2m", "C. 3m", "D. 4m"]	"C"	5	hard	匀加速直线运动，连续相等时间内位移比为1:3:5...，所以第2秒内位移是3m	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.709805	2025-10-14 14:52:13.709805	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.709805	1	PHYS2510140005
24	single	化学	九年级	下列变化属于化学变化的是（）	["A. 冰雪融化", "B. 铁生锈", "C. 玻璃破碎", "D. 汽油挥发"]	"B"	5	easy	铁生锈是铁与氧气、水等发生化学反应，生成新物质，属于化学变化	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.713065	2025-10-14 14:52:13.713065	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.713065	1	CHEM2510140002
25	single	化学	九年级	空气中含量最多的气体是（）	["A. 氧气", "B. 氮气", "C. 二氧化碳", "D. 稀有气体"]	"B"	5	easy	空气中氮气约占78%，是含量最多的气体	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.716574	2025-10-14 14:52:13.716574	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.716574	1	CHEM2510140003
26	single	生物	七年级	细胞的控制中心是（）	["A. 细胞膜", "B. 细胞质", "C. 细胞核", "D. 线粒体"]	"C"	5	easy	细胞核内含有遗传物质，是细胞的控制中心	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.719962	2025-10-14 14:52:13.719962	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.719962	1	BIOL2510140002
27	single	生物	七年级	植物进行光合作用的场所是（）	["A. 细胞核", "B. 线粒体", "C. 叶绿体", "D. 细胞膜"]	"C"	5	easy	叶绿体是光合作用的场所，含有叶绿素	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.723914	2025-10-14 14:52:13.723914	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.723914	1	BIOL2510140003
28	single	生物	八年级	人体消化食物、吸收营养物质的主要场所是（）	["A. 口腔", "B. 胃", "C. 小肠", "D. 大肠"]	"C"	5	easy	小肠是消化和吸收的主要场所，其内表面有大量绒毛，增大吸收面积	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.72679	2025-10-14 14:52:13.72679	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.72679	1	BIOL2510140004
29	single	生物	八年级	血液循环系统由心脏和血管组成，其中能进行物质交换的血管是（）	["A. 动脉", "B. 静脉", "C. 毛细血管", "D. 主动脉"]	"C"	5	medium	毛细血管管壁薄，只有一层上皮细胞，便于物质交换	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.729615	2025-10-14 14:52:13.729615	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.729615	1	BIOL2510140005
30	single	计算机	七年级	下列设备中，属于输入设备的是（）	["A. 显示器", "B. 打印机", "C. 键盘", "D. 音响"]	"C"	5	easy	键盘是输入设备，用于向计算机输入数据和指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.73246	2025-10-14 14:52:13.73246	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.73246	1	COMP2510140002
31	single	计算机	七年级	计算机的"大脑"是（）	["A. 硬盘", "B. CPU", "C. 内存", "D. 主板"]	"B"	5	easy	CPU(中央处理器)是计算机的核心，负责处理数据和执行指令	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.7352	2025-10-14 14:52:13.7352	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.7352	1	COMP2510140003
32	multiple	数学	八年级	下列函数中，y随x增大而增大的有（）	["A. y=2x+1", "B. y=-x+3", "C. y=x²(x>0)", "D. y=1/x(x>0)"]	["A", "C"]	10	medium	A选项k=2>0，y随x增大而增大；C选项在x>0时，y随x增大而增大	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.737829	2025-10-14 14:52:13.737829	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.737829	1	MATH2510140014
33	multiple	数学	九年级	下列说法正确的有（）	["A. 对角线互相垂直的四边形是菱形", "B. 对角线相等的平行四边形是矩形", "C. 对角线互相垂直平分且相等的四边形是正方形", "D. 一组对边平行的四边形是梯形"]	["B", "C"]	10	medium	B、C选项符合矩形和正方形的判定定理	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.740522	2025-10-14 14:52:13.740522	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.740522	1	MATH2510140015
34	multiple	物理	八年级	下列现象中，能说明分子在不停运动的有（）	["A. 春天柳絮飘扬", "B. 夏天荷花飘香", "C. 秋天落叶飞舞", "D. 冬天雪花飞舞"]	["B"]	10	medium	只有B选项是扩散现象，说明分子在运动；其他都是物体的机械运动	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.743559	2025-10-14 14:52:13.743559	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.743559	1	PHYS2510140006
35	multiple	物理	九年级	关于电路，下列说法正确的有（）	["A. 电路中有电源就一定有电流", "B. 电路必须闭合才能有电流", "C. 电流方向是从正极到负极", "D. 导体中有电流通过时，导体发热"]	["B", "C", "D"]	10	medium	电路必须闭合才有电流；电流方向规定为从正极到负极；导体通电会发热	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.746124	2025-10-14 14:52:13.746124	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.746124	1	PHYS2510140007
36	multiple	化学	九年级	下列物质的用途中，利用其化学性质的有（）	["A. 氧气用于医疗急救", "B. 氮气用作保护气", "C. 干冰用于人工降雨", "D. 铜用于制造导线"]	["A", "B"]	10	medium	A利用氧气的助呼吸性质，B利用氮气的化学性质不活泼；C、D利用物理性质	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.748802	2025-10-14 14:52:13.748802	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.748802	1	CHEM2510140004
37	multiple	化学	九年级	下列关于水的说法正确的有（）	["A. 水是由氢元素和氧元素组成的", "B. 水是由氢分子和氧分子构成的", "C. 水分子是由氢原子和氧原子构成的", "D. 水是一种氧化物"]	["A", "C", "D"]	10	hard	水由H和O元素组成；水分子由H原子和O原子构成；水是氧化物	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.751486	2025-10-14 14:52:13.751486	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.751486	1	CHEM2510140005
38	multiple	生物	七年级	下列生物属于单细胞生物的有（）	["A. 草履虫", "B. 酵母菌", "C. 细菌", "D. 蚯蚓"]	["A", "B", "C"]	10	easy	草履虫、酵母菌、细菌都是单细胞生物；蚯蚓是多细胞生物	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.753996	2025-10-14 14:52:13.753996	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.753996	1	BIOL2510140006
39	multiple	生物	八年级	下列属于人体免疫的第三道防线的有（）	["A. 皮肤", "B. 黏膜", "C. 吞噬细胞", "D. 特异性免疫"]	["D"]	10	medium	第三道防线是特异性免疫，针对特定病原体；A、B是第一道防线，C是第二道防线	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.756562	2025-10-14 14:52:13.756562	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.756562	1	BIOL2510140007
40	multiple	计算机	七年级	下列属于应用软件的有（）	["A. Windows", "B. Word", "C. Excel", "D. PowerPoint"]	["B", "C", "D"]	10	easy	Windows是操作系统，Word、Excel、PowerPoint是应用软件	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.759691	2025-10-14 14:52:13.759691	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.759691	1	COMP2510140004
41	multiple	计算机	八年级	下列关于网络安全的做法正确的有（）	["A. 定期更新杀毒软件", "B. 不随意打开陌生邮件", "C. 使用简单密码便于记忆", "D. 不在公共场合输入密码"]	["A", "B", "D"]	10	medium	A、B、D都是正确的网络安全做法；C使用简单密码不安全	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.762264	2025-10-14 14:52:13.762264	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.762264	1	COMP2510140005
42	blank	数学	七年级	一个数的相反数是-5，这个数是______。	["5"]	"5"	5	easy	相反数的定义：只有符号不同的两个数互为相反数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.764821	2025-10-14 14:52:13.764821	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.764821	1	MATH2510140016
43	blank	数学	八年级	若x²-6x+m是完全平方式，则m=______。	["9"]	"9"	5	medium	完全平方公式：(x-3)²=x²-6x+9，所以m=9	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.76764	2025-10-14 14:52:13.76764	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.76764	1	MATH2510140017
44	blank	物理	八年级	物理学中，把物体位置的变化叫做______。	["机械运动", "运动"]	"机械运动"	5	easy	机械运动是物理学中最简单的运动形式	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.770631	2025-10-14 14:52:13.770631	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.770631	1	PHYS2510140008
45	blank	物理	九年级	导体的电阻与导体的______、______和______有关。	["材料", "长度", "横截面积"]	["材料", "长度", "横截面积"]	5	medium	导体电阻由材料、长度、横截面积决定，还与温度有关	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.773591	2025-10-14 14:52:13.773591	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.773591	1	PHYS2510140009
46	blank	化学	九年级	化学变化的本质特征是有______生成。	["新物质"]	"新物质"	5	easy	化学变化的本质是分子破裂、原子重组，生成新物质	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.776319	2025-10-14 14:52:13.776319	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.776319	1	CHEM2510140006
47	blank	化学	九年级	化学式H₂O中，元素H和O的质量比为______。	["1:8", "1：8"]	"1:8"	5	medium	H的相对原子质量为1，O为16，所以质量比为(1×2):16=1:8	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.779429	2025-10-14 14:52:13.779429	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.779429	1	CHEM2510140007
48	blank	生物	七年级	生物体结构和功能的基本单位是______。	["细胞"]	"细胞"	5	easy	细胞是生物体结构和功能的基本单位	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.78244	2025-10-14 14:52:13.78244	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.78244	1	BIOL2510140008
49	blank	生物	八年级	人体血液循环分为______循环和______循环两条途径。	["体循环", "肺循环"]	["体循环", "肺循环"]	5	medium	血液循环包括体循环（大循环）和肺循环（小循环）	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.785263	2025-10-14 14:52:13.785263	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.785263	1	BIOL2510140009
50	blank	计算机	七年级	计算机中最小的信息单位是______。	["位", "bit", "比特"]	"位"	5	easy	位(bit)是计算机中最小的信息单位，表示0或1	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.788394	2025-10-14 14:52:13.788394	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.788394	1	COMP2510140006
51	blank	计算机	八年级	IP地址由______位二进制数组成。	["32"]	"32"	5	medium	IPv4地址由32位二进制数组成，通常表示为4组十进制数	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.790997	2025-10-14 14:52:13.790997	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.790997	1	COMP2510140007
52	essay	数学	八年级	已知△ABC中，AB=AC，点D在BC上，且AD平分∠BAC。求证：BD=CD。	\N	"证明：因为AB=AC，AD平分∠BAC，所以∠BAD=∠CAD。在△ABD和△ACD中，AB=AC，∠BAD=∠CAD，AD=AD，所以△ABD≌△ACD(SAS)，所以BD=CD。"	15	medium	利用等腰三角形的性质和全等三角形的判定与性质	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.793693	2025-10-14 14:52:13.793693	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.793693	1	MATH2510140018
67	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:26:03.956183	2025-10-17 17:26:03.956183	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510170001
53	essay	数学	九年级	某商店销售一种商品，每件成本40元，若售价为50元，每天可售出100件。经调查，售价每提高1元，每天销量减少5件。问：售价定为多少元时，每天的利润最大？最大利润是多少？	\N	"设售价为(50+x)元，则每天销量为(100-5x)件，利润y=(50+x-40)(100-5x)=(10+x)(100-5x)=-5x²+50x+1000=-5(x-5)²+1125。当x=5时，y最大=1125元，此时售价为55元。"	20	hard	利用二次函数求最值，建立数学模型求解实际问题	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.79629	2025-10-14 14:52:13.79629	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.79629	1	MATH2510140019
54	essay	物理	八年级	小明用弹簧测力计测量一个物体的重力，测得结果为5N。请说明弹簧测力计的工作原理，并指出测量时应注意的事项。	\N	"工作原理：弹簧测力计是利用弹簧的伸长量与受到的拉力成正比的原理制成的。注意事项：1.使用前检查指针是否指在零刻度线；2.测量时拉力方向应与弹簧轴线方向一致；3.读数时视线与刻度盘垂直；4.不能超过测量范围。"	15	medium	考查对测量工具原理的理解和规范操作	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.798794	2025-10-14 14:52:13.798794	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.798794	1	PHYS2510140010
55	essay	物理	九年级	请用所学的电学知识，设计一个实验方案，测量一个小灯泡的额定功率。要求写出实验器材、电路图和主要步骤。	\N	"实验器材：电源、小灯泡、电压表、电流表、滑动变阻器、开关、导线若干。电路图：电源、开关、滑动变阻器、小灯泡串联，电压表并联在小灯泡两端，电流表串联在电路中。步骤：1.连接电路；2.闭合开关，调节滑动变阻器，使电压表示数等于小灯泡额定电压；3.读出此时电流表示数；4.计算P=UI得到额定功率。"	20	hard	综合考查电学实验设计能力	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.801491	2025-10-14 14:52:13.801491	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.801491	1	PHYS2510140011
56	essay	化学	九年级	请写出实验室制取氧气的三种方法，并比较它们的优缺点。	\N	"方法一：加热高锰酸钾，优点是操作简单，缺点是需要加热，成本较高。方法二：加热氯酸钾和二氧化锰混合物，优点是反应速率快，缺点是需要加热。方法三：过氧化氢在二氧化锰催化下分解，优点是不需要加热，反应容易控制，缺点是成本较高。"	15	medium	考查化学实验方法和实验原理的比较	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.804432	2025-10-14 14:52:13.804432	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.804432	1	CHEM2510140008
57	essay	化学	九年级	某同学在实验室配制50g质量分数为10%的NaCl溶液，请写出实验步骤并说明注意事项。	\N	"步骤：1.计算：需要NaCl 5g，水45g；2.称量：用天平称取5g NaCl；3.量取：用量筒量取45mL水；4.溶解：将NaCl倒入烧杯中，加入水，用玻璃棒搅拌至完全溶解。注意事项：1.称量时要用滤纸；2.量水时视线与凹液面最低处相平；3.搅拌时不要碰撞杯壁和杯底。"	20	medium	考查溶液配制的实验操作和计算能力	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.80688	2025-10-14 14:52:13.80688	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.80688	1	CHEM2510140009
58	essay	生物	七年级	请描述植物细胞和动物细胞的结构，并说明它们的主要区别。	\N	"植物细胞结构：细胞壁、细胞膜、细胞质、细胞核、液泡、叶绿体、线粒体等。动物细胞结构：细胞膜、细胞质、细胞核、线粒体等。主要区别：1.植物细胞有细胞壁，动物细胞没有；2.植物细胞有液泡和叶绿体，动物细胞一般没有；3.植物细胞多为规则形状，动物细胞形状多样。"	15	easy	考查细胞结构的掌握和比较能力	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.809949	2025-10-14 14:52:13.809949	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.809949	1	BIOL2510140010
59	essay	生物	八年级	请说明人体呼吸系统的组成，并描述肺泡与血液之间的气体交换过程。	\N	"呼吸系统组成：鼻腔、咽、喉、气管、支气管、肺。气体交换：肺泡壁和毛细血管壁都很薄，只有一层上皮细胞构成。血液中的二氧化碳浓度高于肺泡，氧气浓度低于肺泡，因此二氧化碳从血液扩散到肺泡，氧气从肺泡扩散到血液。这样，静脉血变成动脉血。"	20	medium	考查呼吸系统结构和气体交换原理	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.81252	2025-10-14 14:52:13.81252	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.81252	1	BIOL2510140011
60	essay	计算机	七年级	请说明什么是计算机病毒，并列举三种预防计算机病毒的方法。	\N	"计算机病毒是一种人为编制的、能够自我复制并破坏计算机功能或数据的程序。预防方法：1.安装正版杀毒软件并定期更新；2.不随意打开来历不明的邮件和文件；3.不使用来历不明的U盘和光盘；4.定期备份重要数据；5.及时更新操作系统补丁。"	15	easy	考查网络安全意识和防护措施	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.814946	2025-10-14 14:52:13.814946	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.814946	1	COMP2510140008
61	essay	计算机	八年级	请简述冯·诺依曼计算机的工作原理，并说明"存储程序"的含义。	\N	"冯·诺依曼计算机工作原理：1.采用二进制；2.存储程序；3.由运算器、控制器、存储器、输入设备和输出设备五部分组成。\\"存储程序\\"的含义：将程序和数据事先存入存储器，计算机工作时能自动从存储器取出指令并执行，实现自动化处理。这是现代计算机的基本工作方式。"	20	medium	考查计算机基本原理的理解	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.817797	2025-10-14 14:52:13.817797	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.817797	1	COMP2510140009
62	code	计算机	七年级	编写程序：输入三个整数，输出其中的最大值。	\N	"a = int(input())\\nb = int(input())\\nc = int(input())\\nmax_num = a\\nif b > max_num:\\n    max_num = b\\nif c > max_num:\\n    max_num = c\\nprint(max_num)"	20	easy	使用条件判断找出最大值	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.820675	2025-10-14 14:52:13.820675	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.820675	1	COMP2510140010
63	code	计算机	八年级	编写程序：输入一个正整数n，计算并输出1到n之间所有偶数的和。	\N	"n = int(input())\\nsum = 0\\nfor i in range(2, n+1, 2):\\n    sum += i\\nprint(sum)"	20	medium	使用循环累加计算偶数和	\N	\N	\N	1	0	\N	t	\N	2025-10-14 14:52:13.823338	2025-10-14 14:52:13.823338	{}	{}	\N	5	published	{}	\N	\N	\N	2025-10-14 14:52:13.823338	1	COMP2510140011
64	single	数学	七年级	1+1 = ?	["1", "2"]	"A"	5	medium	test	{test}	\N	\N	1	0	\N	t	\N	2025-10-15 15:46:55.277518	2025-10-15 15:46:55.277518	{abstract_thinking}	{math_number_operations}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510150001
65	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:24:47.803792	2025-10-17 17:24:47.803792	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170001
66	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:25:18.38377	2025-10-17 17:25:18.38377	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170002
68	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:26:40.737991	2025-10-17 17:26:40.737991	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510170001
69	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:32:26.385253	2025-10-17 17:32:26.385253	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510170003
70	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:33:17.177787	2025-10-17 17:33:17.177787	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510170002
71	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:33:22.805023	2025-10-17 17:33:22.805023	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510170004
72	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-17 17:33:28.691817	2025-10-17 17:33:28.691817	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510170002
74	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.35109	2025-10-18 03:20:43.35109	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180001
73	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.351425	2025-10-18 03:20:43.351425	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510180001
75	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.352896	2025-10-18 03:20:43.352896	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180001
76	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:20:43.403501	2025-10-18 03:20:43.403501	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180002
77	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.737219	2025-10-18 03:27:28.737219	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510180002
78	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.77082	2025-10-18 03:27:28.77082	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180003
79	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.852633	2025-10-18 03:27:28.852633	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180002
80	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:27:28.872587	2025-10-18 03:27:28.872587	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180004
81	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.497328	2025-10-18 03:33:44.497328	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180005
82	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.514783	2025-10-18 03:33:44.514783	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180003
83	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.669444	2025-10-18 03:33:44.669444	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510180003
84	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:44.929332	2025-10-18 03:33:44.929332	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180006
85	blank	化学	九年级	水的化学式是____，它由____元素组成。	\N	["H2O,H₂O", "氢,氧,氢和氧"]	6	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:46.340113	2025-10-18 03:33:46.340113	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	CHEM2510180001
86	multiple	物理	八年级	以下哪些是基本物理量？	["质量", "长度", "速度", "时间"]	["A", "B", "D"]	8	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:33:47.737224	2025-10-18 03:33:47.737224	{}	{}	L2	8	draft	{}	\N	\N	\N	\N	\N	PHYS2510180001
87	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.014016	2025-10-18 03:34:36.014016	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510180004
88	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.042617	2025-10-18 03:34:36.042617	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180007
89	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.065238	2025-10-18 03:34:36.065238	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180004
90	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:36.301118	2025-10-18 03:34:36.301118	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180008
91	blank	化学	九年级	水的化学式是____，它由____元素组成。	\N	["H2O,H₂O", "氢,氧,氢和氧"]	6	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:37.851026	2025-10-18 03:34:37.851026	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	CHEM2510180002
92	multiple	物理	八年级	以下哪些是基本物理量？	["质量", "长度", "速度", "时间"]	["A", "B", "D"]	8	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:34:39.30382	2025-10-18 03:34:39.30382	{}	{}	L2	8	draft	{}	\N	\N	\N	\N	\N	PHYS2510180002
93	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.51387	2025-10-18 03:36:39.51387	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180009
94	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.584985	2025-10-18 03:36:39.584985	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180005
95	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.669504	2025-10-18 03:36:39.669504	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510180005
96	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:39.805301	2025-10-18 03:36:39.805301	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180010
97	blank	化学	九年级	水的化学式是____，它由____元素组成。	\N	["H2O,H₂O", "氢,氧,氢和氧"]	6	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:41.401493	2025-10-18 03:36:41.401493	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	CHEM2510180003
98	multiple	物理	八年级	以下哪些是基本物理量？	["质量", "长度", "速度", "时间"]	["A", "B", "D"]	8	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:36:42.596461	2025-10-18 03:36:42.596461	{}	{}	L2	8	draft	{}	\N	\N	\N	\N	\N	PHYS2510180003
99	code	计算机	八年级	编写一个函数，计算斐波那契数列的第n项。	\N	"def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)"	15	hard	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:44.951982	2025-10-18 03:42:44.951982	{}	{}	L5	15	draft	{}	\N	\N	\N	\N	\N	COMP2510180006
100	true_false	生物	七年级	细胞是生命活动的基本单位。	\N	true	3	easy	细胞确实是生命活动的基本单位	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:45.058294	2025-10-18 03:42:45.058294	{}	{}	L1	3	draft	{}	\N	\N	\N	\N	\N	BIOL2510180006
101	essay	数学	九年级	请简述勾股定理的内容及其应用场景。	\N	"勾股定理指出，在直角三角形中，两条直角边的平方和等于斜边的平方。"	10	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:45.085789	2025-10-18 03:42:45.085789	{}	{}	L4	10	draft	{}	\N	\N	\N	\N	\N	MATH2510180011
102	single	数学	七年级	1 + 1 = ?	["1", "2", "3", "4"]	"B"	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:45.143321	2025-10-18 03:42:45.143321	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180012
103	blank	化学	九年级	水的化学式是____，它由____元素组成。	\N	["H2O,H₂O", "氢,氧,氢和氧"]	6	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:46.843625	2025-10-18 03:42:46.843625	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	CHEM2510180004
104	multiple	物理	八年级	以下哪些是基本物理量？	["质量", "长度", "速度", "时间"]	["A", "B", "D"]	8	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 03:42:48.231281	2025-10-18 03:42:48.231281	{}	{}	L2	8	draft	{}	\N	\N	\N	\N	\N	PHYS2510180004
105	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.107466	2025-10-18 05:10:06.107466	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180013
106	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.291898	2025-10-18 05:10:06.291898	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510180005
107	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.297534	2025-10-18 05:10:06.297534	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510180005
108	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.298795	2025-10-18 05:10:06.298795	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180014
109	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.307997	2025-10-18 05:10:06.307997	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180015
110	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.319294	2025-10-18 05:10:06.319294	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510180007
111	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:10:06.33403	2025-10-18 05:10:06.33403	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510180006
112	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.249085	2025-10-18 05:19:17.249085	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510180007
113	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.250715	2025-10-18 05:19:17.250715	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510180008
114	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.269583	2025-10-18 05:19:17.269583	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180016
115	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.318158	2025-10-18 05:19:17.318158	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510180006
116	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.380685	2025-10-18 05:19:17.380685	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180017
117	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.41163	2025-10-18 05:19:17.41163	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180018
118	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 05:19:17.458767	2025-10-18 05:19:22.409645	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	BIOL2510180008
119	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:22:08.30656	2025-10-18 15:22:08.30656	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180019
120	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:22:28.571436	2025-10-18 15:22:28.571436	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510180009
121	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:22:59.520033	2025-10-18 15:22:59.520033	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180020
122	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:23:23.535966	2025-10-18 15:23:23.535966	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510180021
123	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:23:34.851744	2025-10-18 15:23:34.851744	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510180010
124	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:24:16.717832	2025-10-18 15:24:16.717832	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510180007
125	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-18 15:24:47.66565	2025-10-18 15:24:47.66565	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510180009
127	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.296812	2025-10-19 11:24:02.296812	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510190001
126	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.297579	2025-10-19 11:24:02.297579	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190001
128	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.305032	2025-10-19 11:24:02.305032	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190001
129	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.3055	2025-10-19 11:24:02.3055	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510190001
130	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.305806	2025-10-19 11:24:02.305806	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190002
131	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.308802	2025-10-19 11:24:02.308802	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190002
132	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:24:02.323816	2025-10-19 11:24:07.933191	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190003
133	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.523144	2025-10-19 11:27:01.523144	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190004
134	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.553903	2025-10-19 11:27:01.553903	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190003
135	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.566374	2025-10-19 11:27:01.566374	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190005
136	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.570871	2025-10-19 11:27:01.570871	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190004
137	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.608064	2025-10-19 11:27:01.608064	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510190002
138	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.706012	2025-10-19 11:27:01.706012	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510190002
139	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:27:01.725765	2025-10-19 11:27:06.693596	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190006
140	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.079539	2025-10-19 11:30:05.079539	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190007
141	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.079862	2025-10-19 11:30:05.079862	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190008
142	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.137927	2025-10-19 11:30:05.137927	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510190003
143	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.138315	2025-10-19 11:30:05.138315	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190005
144	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.158825	2025-10-19 11:30:05.158825	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190006
145	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.268428	2025-10-19 11:30:05.268428	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190009
146	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 11:30:05.306136	2025-10-19 11:30:10.968817	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	CHEM2510190003
147	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:44.99126	2025-10-19 12:09:44.99126	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190007
148	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.116234	2025-10-19 12:09:45.116234	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510190004
149	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.136329	2025-10-19 12:09:45.136329	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190010
150	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.154081	2025-10-19 12:09:45.154081	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190011
151	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.239832	2025-10-19 12:09:45.239832	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190008
152	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.250338	2025-10-19 12:09:45.250338	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190012
153	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:09:45.256457	2025-10-19 12:09:50.902799	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	BIOL2510190004
154	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.500039	2025-10-19 12:14:19.500039	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190009
155	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.50033	2025-10-19 12:14:19.50033	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510190005
156	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.545863	2025-10-19 12:14:19.545863	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190010
157	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.577368	2025-10-19 12:14:19.577368	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190013
158	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.606139	2025-10-19 12:14:19.606139	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190014
159	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.614967	2025-10-19 12:14:19.614967	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510190005
160	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 12:14:19.617095	2025-10-19 12:14:25.434155	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510190015
161	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 17:46:52.89898	2025-10-19 17:46:52.89898	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190016
162	true_false	生物	七年级	测试多选范围功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 17:46:52.899192	2025-10-19 17:46:52.899192	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510190006
163	true_false	化学	九年级	测试删除功能 - 此题目将被删除	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 17:46:52.900243	2025-10-19 17:46:52.900243	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	CHEM2510190006
164	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 17:46:52.900711	2025-10-19 17:46:52.900711	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190011
165	true_false	物理	八年级	测试审核拒绝功能	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 17:46:52.921156	2025-10-19 17:46:58.502007	{}	{}	L2	6	pending_review	{practice}	1	\N	\N	\N	\N	PHYS2510190012
166	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 18:03:48.351424	2025-10-19 18:03:48.351424	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190017
167	true_false	数学	七年级	测试草稿箱功能 - 1+1=2	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 18:05:11.895475	2025-10-19 18:05:11.895475	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510190018
168	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-19 18:05:46.361817	2025-10-19 18:05:46.361817	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510190013
169	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 13:05:47.779873	2025-10-20 13:05:47.779873	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200001
170	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 13:12:41.233957	2025-10-20 13:12:41.233957	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200002
171	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 13:14:23.317569	2025-10-20 13:14:23.317569	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200003
172	true_false	物理	八年级	测试编辑功能 - 原始内容	\N	true	6	medium	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 13:17:48.974394	2025-10-20 13:17:48.974394	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200004
173	true_false	物理	八年级	测试编辑功能 - 修改后的内容	\N	true	6	medium	\N	{}	\N	\N	9	0	\N	t	\N	2025-10-20 13:20:40.480962	2025-10-20 13:20:46.48404	{}	{}	L2	6	draft	{}	\N	\N	\N	\N	\N	PHYS2510200005
182	true_false	数学	七年级	测试提交审核功能	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 14:19:23.411048	2025-10-20 14:19:31.00452	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200001
190	true_false	数学	七年级	测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-20 16:34:02.85602	2025-10-20 16:34:10.284889	{}	{}	L1	5	pending_review	{practice}	1	\N	\N	\N	\N	MATH2510200003
207	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 05:29:05.895589	2025-10-21 05:29:05.895589	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210007
216	true_false	数学	七年级	【R405】测试审核批准功能 - 2+2=4	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 09:38:43.207741	2025-10-21 09:38:43.207741	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	MATH2510210014
228	true_false	生物	七年级	【R409-1761048137845】测试多选范围功能 - 光合作用	\N	true	5	easy	\N	\N	\N	\N	9	0	\N	t	\N	2025-10-21 12:02:24.825471	2025-10-21 12:02:24.825471	{}	{}	L1	5	draft	{}	\N	\N	\N	\N	\N	BIOL2510210002
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
2	203	10	rejected	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 05:18:24.662871	2025-10-21 05:18:24.662871
3	218	10	rejected	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 09:46:35.159569	2025-10-21 09:46:35.159569
4	219	10	rejected	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 10:54:42.130474	2025-10-21 10:54:42.130474
5	221	10	rejected	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 11:03:56.715826	2025-10-21 11:03:56.715826
6	201	10	rejected	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 11:14:37.465811	2025-10-21 11:14:37.465811
7	225	10	rejected	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 11:18:42.94457	2025-10-21 11:18:42.94457
8	226	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 11:18:43.469591	2025-10-21 11:18:43.469591
9	231	10	approved	题目质量良好，内容准确，批准通过。	2025-10-21 12:20:17.979013	2025-10-21 12:20:17.979013
10	233	10	rejected	题目描述不够清晰，需要进一步修改和完善。	2025-10-21 12:20:19.14614	2025-10-21 12:20:19.14614
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (id, exam_id, type, content, options, correct_answer, score, order_no, difficulty, explanation, created_at) FROM stdin;
4	2	single	3 + 5 = ?	["A. 6", "B. 7", "C. 8", "D. 9"]	C	5	1	easy	\N	2025-09-24 15:09:18.528391
5	2	single	小明有12个苹果，吃了3个，还剩几个？	["A. 8个", "B. 9个", "C. 10个", "D. 15个"]	B	5	2	easy	\N	2025-09-24 15:09:18.528391
6	2	single	一个正方形的边长是4厘米，它的周长是多少？	["A. 12厘米", "B. 16厘米", "C. 20厘米", "D. 8厘米"]	B	10	3	medium	\N	2025-09-24 15:09:18.528391
19	14	single	36 ÷ 4 = ？	["A. 8", "B. 9", "C. 10", "D. 7"]	B	5	1	easy	36除以4等于9	2025-10-14 08:30:44.845303
20	14	single	一个长方形的长是8厘米，宽是5厘米，它的周长是多少厘米？	["A. 13", "B. 26", "C. 40", "D. 18"]	B	10	2	medium	周长=(长+宽)×2=(8+5)×2=26厘米	2025-10-14 08:30:44.845303
21	14	single	小明有45元，买了一本书花了28元，还剩多少元？	["A. 15元", "B. 16元", "C. 17元", "D. 18元"]	C	10	3	easy	45-28=17元	2025-10-14 08:30:44.845303
22	14	single	0乘以任何数都得0。	["正确", "错误"]	正确	5	4	easy	0乘以任何数的积都是0	2025-10-14 08:30:44.845303
23	14	single	1000克就是1千克。	["正确", "错误"]	正确	5	5	easy	1千克=1000克	2025-10-14 08:30:44.845303
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
\.


--
-- Data for Name: student_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_activities (id, student_id, activity_id, session_id, status, start_time, submit_time, score, rank, ip_address, created_at, attempt_number, is_retake, previous_attempt_id) FROM stdin;
2	11	2	\N	submitted	2025-10-13 04:20:54.262585	2025-10-13 04:20:57.353961	0.00	\N	::ffff:172.18.0.1	2025-10-13 04:10:32.153784	1	f	\N
13	11	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	78.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
14	12	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	77.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
15	13	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	75.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
16	19	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	93.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
17	20	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	76.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
18	21	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	87.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
19	14	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	75.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
20	22	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	77.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
21	23	15	\N	graded	2025-09-29 08:30:44.848372	2025-09-29 09:25:44.848372	74.00	\N	\N	2025-10-14 08:30:44.848372	1	f	\N
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, user_id, student_no, school_id, grade, class, enrollment_date, guardian_name, guardian_phone, created_at) FROM stdin;
1	11	S2024001	1	三年级	3班	\N	张父亲	13900139001	2025-09-24 15:09:18.52151
2	12	S2024002	1	三年级	3班	\N	李母亲	13900139002	2025-09-24 15:09:18.52151
3	13	S2024003	1	三年级	3班	\N	王父亲	13900139003	2025-09-24 15:09:18.52151
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
1	9	T001	1	{语文,数学}	高级教师	2025-09-24 15:09:18.519249
2	10	T002	1	{科学,英语}	中级教师	2025-09-24 15:09:18.519249
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, role, real_name, id_card, phone, email, avatar_url, status, created_at, updated_at) FROM stdin;
3	nanming_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	南明区管理员	\N	13800138011	nanming@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-09-24 15:09:18.515204
6	school_admin_02	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	第二小学管理员	\N	13800138021	school02@guiyang.edu	\N	active	2025-09-24 15:09:18.515839	2025-09-24 15:09:18.515839
7	municipal_school_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	municipal_school_admin	市直属学校总管理员	\N	13800138030	municipal@guiyang.edu	\N	active	2025-09-24 15:09:18.516515	2025-09-24 15:09:18.516515
8	base_school_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	base_school_admin	信息技术基地校管理员	\N	13800138040	base@guiyang.edu	\N	active	2025-09-24 15:09:18.517234	2025-09-24 15:09:18.517234
13	520102200803013456	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	王小刚	520102200803013456	13800138005	student03@example.com	\N	active	2025-09-24 15:09:18.518583	2025-09-24 15:09:18.518583
5	school_admin_01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	school_admin	第一小学管理员	\N	13800138020	school01@guiyang.edu	\N	active	2025-09-24 15:09:18.515839	2025-09-24 15:11:55.066074
4	guanshanhu_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	观山湖区管理员	\N	13800138012	gsh@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-10-04 06:22:48.164265
1	admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	system_admin	系统管理员	\N	13800138000	admin@guiyang.edu	\N	active	2025-09-24 15:09:18.513928	2025-10-25 12:21:30.034636
9	teacher01	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	李老师	\N	13800138001	teacher01@guiyang.edu	\N	active	2025-09-24 15:09:18.517813	2025-10-25 12:21:30.086872
24	district_admin01	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	district_admin	赵区长	520102197801011234	13700137001	zhao@district.gov	\N	active	2025-10-14 08:19:53.477498	2025-10-23 08:56:35.391017
15	test_school_admin_1759590680149	$2a$10$0BWcbB8OWOlQxYncQxx9oewalqWGLvV5qV97wvx4ky9o4l1oZHnLW	school_admin	测试校级管理员	\N	13800138888	test_school@guiyang.edu	\N	active	2025-10-04 15:11:20.154128	2025-10-04 15:11:20.154128
16	test_district_admin_1759590680212	$2a$10$lvX5WiIGgJWmdAzzs9bLbuA7jRhGQInT4goLbZDZ7xKjt7aloMKuG	district_admin	测试区级管理员	\N	13800139999	test_district@guiyang.edu	\N	active	2025-10-04 15:11:20.216102	2025-10-04 15:11:20.216102
18	teacher03	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	teacher	王芳	520102198203253456	13800138003	wangfang@school.com	\N	active	2025-10-14 08:19:53.472845	2025-10-14 08:19:53.472845
19	student01	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	张小明	520102201001015678	13900139001	zhangxm@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
20	student02	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	李小红	520102201002026789	13900139002	lixh@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
2	yunyan_admin	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	district_admin	云岩区管理员	\N	13800138010	yunyan@guiyang.edu	\N	active	2025-09-24 15:09:18.515204	2025-09-27 11:28:30.250134
21	student03	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	王小刚	520102201003037890	13900139003	wangxg@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
14	test_user	$2a$10$/WJN2rZvsACiuZN2MaiJ3uGDcx67rljEcmAviS78waXaAv8uj3ERm	student	测试用户	\N	\N	\N	\N	active	2025-09-27 13:02:45.037069	2025-09-27 13:02:45.037069
22	student04	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	刘小丽	520102201004048901	13900139004	liuxl@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
23	student05	$2a$10$CxJ3aNGVJp.UHGmUTkAs7O8ejfEPQPhoBJCzAKmAQQ3jdaJa.GX7.	student	陈小华	520102201005059012	13900139005	chenxh@student.com	\N	active	2025-10-14 08:19:53.476683	2025-10-14 08:19:53.476683
11	520102200801011234	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	张小明	520102200801011234	13800138003	student01@example.com	\N	active	2025-09-24 15:09:18.518583	2025-10-25 13:06:09.312971
12	520102200802012345	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	student	李小红	520102200802012345	13800138004	student02@example.com	\N	active	2025-09-24 15:09:18.518583	2025-10-13 04:23:25.918115
10	teacher02	$2a$10$voL/Nblc4bsRqoqs28ShquticOcxSjNJsQzfUerYTY3sacXaiG0EC	teacher	王老师	\N	13800138002	teacher02@guiyang.edu	\N	active	2025-09-24 15:09:18.517813	2025-10-21 12:20:15.941959
\.


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activities_id_seq', 78, true);


--
-- Name: activity_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_history_id_seq', 1, false);


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_permissions_id_seq', 8, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.announcements_id_seq', 2, true);


--
-- Name: answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.answers_id_seq', 6, true);


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

SELECT pg_catalog.setval('public.districts_id_seq', 7, true);


--
-- Name: import_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.import_logs_id_seq', 1, false);


--
-- Name: question_bank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_id_seq', 233, true);


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
-- Name: schools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schools_id_seq', 5, true);


--
-- Name: student_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_activities_id_seq', 21, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 3, true);


--
-- Name: teacher_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teacher_permissions_id_seq', 7, true);


--
-- Name: teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teachers_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 32, true);


--
-- Name: activity_history activity_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT activity_history_pkey PRIMARY KEY (id);


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
-- Name: idx_answers_student_exam_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_student_exam_id ON public.answers USING btree (student_exam_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


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
-- Name: idx_schools_district_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_district_id ON public.schools USING btree (district_id);


--
-- Name: idx_schools_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_type ON public.schools USING btree (type);


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
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


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

\unrestrict jQbzxzxEMnpKRVdxDNx7zrXVkCqoIh9MgO5pFqduHEsveEgwqHDMsyzHdmYgNAB

