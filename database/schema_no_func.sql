--
-- PostgreSQL database dump
--


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
-- Name: auto_generate_question_code(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: calculate_task_completion_rate(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: generate_question_code(character varying, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: get_activity_paper(integer); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: FUNCTION get_activity_paper(p_activity_id integer); Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: log_registration_action(integer, character varying, integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: FUNCTION log_registration_action(p_request_id integer, p_action character varying, p_action_by integer, p_action_level integer, p_comment text, p_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: update_achievement_progress_percentage(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: update_activity_paper_stats(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: update_daily_tasks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: update_registration_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: update_student_activity_grading_status(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: FUNCTION update_student_activity_grading_status(); Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: update_student_points_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: update_student_task_progress_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: update_teacher_permissions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: validate_activity_time_limit(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: validate_teacher_permission(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: FUNCTION validate_teacher_permission(); Type: COMMENT; Schema: public; Owner: -
--



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
    CONSTRAINT check_category CHECK (((category)::text = ANY ((ARRAY['exam_certification'::character varying, 'learning_growth'::character varying, 'social_collaboration'::character varying, 'special_event'::character varying])::text[]))),
    CONSTRAINT check_points_reward CHECK ((points_reward >= 0)),
    CONSTRAINT check_rarity CHECK (((rarity)::text = ANY ((ARRAY['common'::character varying, 'rare'::character varying, 'epic'::character varying, 'legendary'::character varying, 'mythic'::character varying])::text[])))
);


--
-- Name: TABLE achievements; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN achievements.achievement_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.achievements.achievement_code IS '成就唯一代码';


--
-- Name: COLUMN achievements.rarity; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN achievements.trigger_condition; Type: COMMENT; Schema: public; Owner: -
--



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
    result_publish_time timestamp without time zone,
    question_count integer DEFAULT 0,
    paper_status character varying(20) DEFAULT 'empty'::character varying,
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


--
-- Name: TABLE activities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activities IS 'Stores all learning activities including assessments and practice exercises';


--
-- Name: COLUMN activities.total_score; Type: COMMENT; Schema: public; Owner: -
--



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



--
-- Name: COLUMN activities.result_publish_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.result_publish_time IS '结果发布时间 - 仅用于测评类型活动，在此时间之后学生才能查看答案和详细结果';


--
-- Name: COLUMN activities.question_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activities.question_count IS '试卷题目总数';


--
-- Name: COLUMN activities.paper_status; Type: COMMENT; Schema: public; Owner: -
--



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
    CONSTRAINT student_activities_grading_status_check CHECK (((grading_status)::text = ANY ((ARRAY['pending'::character varying, 'auto_graded'::character varying, 'partial_graded'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT student_exams_status_check CHECK (((status)::text = ANY ((ARRAY['registered'::character varying, 'in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'absent'::character varying])::text[])))
);


--
-- Name: COLUMN student_activities.started_at; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN student_activities.time_limit_deadline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_activities.time_limit_deadline IS '时间限制截止时间 (scheduled类型使用activity.end_time, timed类型使用started_at + duration)';


--
-- Name: COLUMN student_activities.grading_status; Type: COMMENT; Schema: public; Owner: -
--



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
     LEFT JOIN public.student_activities sa ON (((a.id = sa.activity_id) AND ((sa.status)::text = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying])::text[])))))
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



--
-- Name: COLUMN activity_questions.activity_id; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN activity_questions.question_id; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN activity_questions.order_index; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN activity_questions.score; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: -
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
    code_template text,
    time_limit integer DEFAULT 1000,
    memory_limit integer DEFAULT 256,
    judge_mode character varying(20) DEFAULT 'standard'::character varying,
    special_judge_code text,
    supported_languages text[] DEFAULT '{cpp}'::text[],
    withdrawn_by integer,
    withdrawn_at timestamp without time zone,
    withdraw_reason text,
    CONSTRAINT question_bank_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT question_bank_level_check CHECK (((level)::text = ANY ((ARRAY['L1'::character varying, 'L2'::character varying, 'L3'::character varying, 'L4'::character varying, 'L5'::character varying, 'L6'::character varying, 'L7'::character varying, 'L8'::character varying, 'L9'::character varying])::text[]))),
    CONSTRAINT question_bank_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'published'::character varying, 'inactive'::character varying])::text[]))),
    CONSTRAINT question_bank_type_check CHECK (((type)::text = ANY ((ARRAY['single'::character varying, 'multiple'::character varying, 'blank'::character varying, 'true_false'::character varying, 'essay'::character varying, 'code'::character varying, 'matching'::character varying])::text[]))),
    CONSTRAINT question_bank_judge_mode_check CHECK ((judge_mode IS NULL OR (judge_mode)::text = ANY ((ARRAY['standard'::character varying, 'special'::character varying])::text[])))
);


--
-- Name: COLUMN question_bank.score; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN question_bank.abilities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.abilities IS '题目考察的能力列表（如抽象思维、计算思维等），存储能力ID数组';


--
-- Name: COLUMN question_bank.knowledge_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.knowledge_points IS '题目涉及的知识点列表，存储知识点ID数组';


--
-- Name: COLUMN question_bank.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.level IS '题目级别 L1-L9';


--
-- Name: COLUMN question_bank.suggested_score; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN question_bank.status; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN question_bank.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.scope IS '题库范围数组: assessment-测评题库, practice_municipal-市级练习, practice_district_{code}-区级练习, practice_school_{id}-校级练习';


--
-- Name: COLUMN question_bank.question_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.question_code IS '题目唯一编码，格式：科目代码+年月日+序号，如MATH250120001';


--
-- Name: COLUMN question_bank.code_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.code_template IS '编程题代码模板，预填充给学生作为起始代码';


--
-- Name: COLUMN question_bank.time_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.time_limit IS '编程题默认时间限制(毫秒)，各测试点可单独设置';


--
-- Name: COLUMN question_bank.memory_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.memory_limit IS '编程题默认内存限制(MB)，各测试点可单独设置';


--
-- Name: COLUMN question_bank.judge_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.judge_mode IS '判题模式: standard-标准输出比对, special-使用特判程序';


--
-- Name: COLUMN question_bank.special_judge_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.special_judge_code IS '特判程序C++代码，用于有多个正确答案的题目';


--
-- Name: COLUMN question_bank.supported_languages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.question_bank.supported_languages IS '支持的编程语言列表，默认只支持cpp';


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
     LEFT JOIN public.question_bank qb ON ((aq.question_id = qb.id)))
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
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


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
    CONSTRAINT answers_grading_status_check CHECK (((grading_status)::text = ANY ((ARRAY['pending'::character varying, 'auto_graded'::character varying, 'manual_graded'::character varying])::text[])))
);


--
-- Name: COLUMN answers.grading_status; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN answers.feedback; Type: COMMENT; Schema: public; Owner: -
--



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
    CONSTRAINT check_category CHECK (((category)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))),
    CONSTRAINT check_progress_type CHECK (((progress_type)::text = ANY ((ARRAY['count'::character varying, 'duration'::character varying, 'score'::character varying])::text[]))),
    CONSTRAINT check_reset_period CHECK (((reset_period)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))),
    CONSTRAINT check_target_value CHECK ((target_value > 0)),
    CONSTRAINT check_task_points CHECK ((points_reward >= 0)),
    CONSTRAINT check_task_type CHECK (((task_type)::text = ANY ((ARRAY['login'::character varying, 'practice'::character varying, 'exam'::character varying, 'social'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: TABLE daily_tasks; Type: COMMENT; Schema: public; Owner: -
--



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



--
-- Name: COLUMN daily_tasks.target_value; Type: COMMENT; Schema: public; Owner: -
--



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



--
-- Name: COLUMN daily_tasks.valid_from; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN daily_tasks.valid_to; Type: COMMENT; Schema: public; Owner: -
--



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
-- Name: districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.districts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    level character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT districts_level_check CHECK (((level)::text = ANY ((ARRAY['district'::character varying, 'municipal'::character varying])::text[])))
);


--
-- Name: TABLE districts; Type: COMMENT; Schema: public; Owner: -
--



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
    CONSTRAINT check_leaderboard_type CHECK (((leaderboard_type)::text = ANY ((ARRAY['weekly'::character varying, 'monthly'::character varying, 'total'::character varying, 'school'::character varying, 'class'::character varying])::text[]))),
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
    CONSTRAINT teacher_permissions_scope_level_check CHECK (((scope_level)::text = ANY ((ARRAY['municipal'::character varying, 'district'::character varying, 'school'::character varying])::text[])))
);


--
-- Name: COLUMN teacher_permissions.permission_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_permissions.permission_type IS '权限类型: assessment_review-测评审核, practice_municipal_review-市级练习审核, practice_district_review-区级练习审核';


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
    CONSTRAINT check_transaction_type CHECK (((transaction_type)::text = ANY ((ARRAY['achievement'::character varying, 'daily_task'::character varying, 'activity'::character varying, 'redemption'::character varying, 'manual'::character varying, 'teacher_reward'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: TABLE points_transactions; Type: COMMENT; Schema: public; Owner: -
--



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
   FROM (public.question_bank qb
     CROSS JOIN LATERAL unnest(qb.scope) s(scope_type))
  WHERE (qb.is_active = true)
  GROUP BY s.scope_type, qb.subject, qb.grade
  ORDER BY s.scope_type, qb.subject, qb.grade;


--
-- Name: VIEW question_bank_distribution; Type: COMMENT; Schema: public; Owner: -
--



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

ALTER SEQUENCE public.question_bank_id_seq OWNED BY public.question_bank.id;


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
    CONSTRAINT question_reviews_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
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
    CONSTRAINT questions_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT questions_type_check CHECK (((type)::text = ANY ((ARRAY['single'::character varying, 'multiple'::character varying, 'blank'::character varying, 'essay'::character varying, 'code'::character varying])::text[])))
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



--
-- Name: COLUMN registration_audit_log.action_level; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN registration_audit_log.metadata; Type: COMMENT; Schema: public; Owner: -
--



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
    CONSTRAINT schools_type_check CHECK (((type)::text = ANY ((ARRAY['regular'::character varying, 'municipal'::character varying, 'base'::character varying])::text[])))
);


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



--
-- Name: COLUMN student_login_history.student_id; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN student_login_history.user_id; Type: COMMENT; Schema: public; Owner: -
--



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



--
-- Name: COLUMN student_daily_tasks.task_date; Type: COMMENT; Schema: public; Owner: -
--



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



--
-- Name: COLUMN student_points.current_points; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN student_points.total_points; Type: COMMENT; Schema: public; Owner: -
--



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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE student_registration_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_registration_requests IS '学生注册申请表，记录学生自主注册申请信息';


--
-- Name: COLUMN student_registration_requests.current_reviewer_level; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN student_registration_requests.last_escalated_at; Type: COMMENT; Schema: public; Owner: -
--



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



--
-- Name: COLUMN student_task_progress.current_value; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN student_task_progress.completion_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.completion_rate IS '完成率百分比';


--
-- Name: COLUMN student_task_progress.bonus_awarded; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN student_task_progress.period_start; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: COLUMN student_task_progress.period_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_task_progress.period_end IS '任务周期结束日期';


--
-- Name: COLUMN student_task_progress.reset_count; Type: COMMENT; Schema: public; Owner: -
--



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



--
-- Name: COLUMN task_completion_history.bonus_earned; Type: COMMENT; Schema: public; Owner: -
--



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
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'teacher'::character varying, 'school_admin'::character varying, 'district_admin'::character varying, 'municipal_school_admin'::character varying, 'base_school_admin'::character varying, 'municipal_admin'::character varying, 'system_admin'::character varying])::text[])))
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


--
-- Name: VIEW teacher_grading_workload; Type: COMMENT; Schema: public; Owner: -
--



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
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq'::regclass);


--
-- Name: daily_tasks task_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_tasks ALTER COLUMN task_id SET DEFAULT nextval('public.daily_tasks_task_id_seq'::regclass);


--
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- Name: import_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs ALTER COLUMN id SET DEFAULT nextval('public.import_logs_id_seq'::regclass);


--
-- Name: leaderboards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboards ALTER COLUMN id SET DEFAULT nextval('public.leaderboards_id_seq'::regclass);


--
-- Name: points_transactions transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.points_transactions_transaction_id_seq'::regclass);


--
-- Name: question_bank id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank ALTER COLUMN id SET DEFAULT nextval('public.question_bank_id_seq'::regclass);


--
-- Name: question_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_categories ALTER COLUMN id SET DEFAULT nextval('public.question_categories_id_seq'::regclass);


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
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: student_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements ALTER COLUMN id SET DEFAULT nextval('public.student_achievements_id_seq'::regclass);


--
-- Name: student_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_activities ALTER COLUMN id SET DEFAULT nextval('public.student_activities_id_seq'::regclass);


--
-- Name: student_login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_login_history ALTER COLUMN id SET DEFAULT nextval('public.student_login_history_id_seq'::regclass);


--
-- Name: student_daily_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_daily_tasks ALTER COLUMN id SET DEFAULT nextval('public.student_daily_tasks_id_seq'::regclass);


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
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


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
-- Name: points_transactions points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: question_bank question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_question_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_question_code_key UNIQUE (question_code);


--
-- Name: question_categories question_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_pkey PRIMARY KEY (id);


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
-- Name: student_login_history student_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT student_login_history_pkey PRIMARY KEY (id);


--
-- Name: student_login_history student_login_unique_daily; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_login_history
    ADD CONSTRAINT student_login_unique_daily UNIQUE (student_id, login_date);


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

CREATE INDEX idx_question_bank_abilities ON public.question_bank USING gin (abilities);


--
-- Name: idx_question_bank_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_active ON public.question_bank USING btree (is_active);


--
-- Name: idx_question_bank_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_category ON public.question_bank USING btree (category_id);


--
-- Name: idx_question_bank_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_code ON public.question_bank USING btree (question_code);


--
-- Name: idx_question_bank_difficulty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_difficulty ON public.question_bank USING btree (difficulty);


--
-- Name: idx_question_bank_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_grade ON public.question_bank USING btree (grade);


--
-- Name: idx_question_bank_knowledge_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_knowledge_points ON public.question_bank USING gin (knowledge_points);


--
-- Name: idx_question_bank_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_level ON public.question_bank USING btree (level);


--
-- Name: idx_question_bank_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_reviewer_id ON public.question_bank USING btree (reviewer_id);


--
-- Name: idx_question_bank_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_scope ON public.question_bank USING gin (scope);


--
-- Name: idx_question_bank_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_status ON public.question_bank USING btree (status);


--
-- Name: idx_question_bank_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_subject ON public.question_bank USING btree (subject);


--
-- Name: idx_question_bank_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_tags ON public.question_bank USING gin (tags);


--
-- Name: idx_question_bank_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_bank_type ON public.question_bank USING btree (type);


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
-- Name: idx_schools_district_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_district_id ON public.schools USING btree (district_id);


--
-- Name: idx_schools_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_type ON public.schools USING btree (type);


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

CREATE INDEX idx_student_activities_grading_status ON public.student_activities USING btree (grading_status, activity_id) WHERE ((grading_status)::text = ANY ((ARRAY['pending'::character varying, 'partial_graded'::character varying])::text[]));


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
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: question_bank trigger_auto_generate_question_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_generate_question_code BEFORE INSERT ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.auto_generate_question_code();


--
-- Name: student_task_progress trigger_calculate_task_completion_rate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_task_completion_rate BEFORE INSERT OR UPDATE ON public.student_task_progress FOR EACH ROW EXECUTE FUNCTION public.calculate_task_completion_rate();


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
-- Name: student_registration_requests trigger_update_registration_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_registration_updated_at BEFORE UPDATE ON public.student_registration_requests FOR EACH ROW EXECUTE FUNCTION public.update_registration_updated_at();


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
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: answers answers_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: answers answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id);


--
-- Name: CONSTRAINT answers_question_id_fkey ON answers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT answers_question_id_fkey ON public.answers IS 'Foreign key to question_bank table';


--
-- Name: answers answers_student_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_student_exam_id_fkey FOREIGN KEY (student_exam_id) REFERENCES public.student_activities(id) ON DELETE CASCADE;


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
-- Name: activities exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


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
-- Name: points_transactions points_transactions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: question_bank question_bank_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.question_categories(id);


--
-- Name: question_bank question_bank_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(id);


--
-- Name: question_bank question_bank_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: question_categories question_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_categories
    ADD CONSTRAINT question_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.question_categories(id);


--
-- Name: question_reviews question_reviews_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_reviews
    ADD CONSTRAINT question_reviews_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


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
-- Name: schools schools_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


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




-- ============================================
-- Migration 025: Data Visualization Statistics
-- Added: 2025-11-23
-- ============================================

-- =====================================================
-- Migration 025: Data Visualization Statistics Tables
-- 数据可视化统计表和视�?
-- 创建日期: 2025-11-23
-- 描述: 为学生端和教师端数据展示功能创建统计表和视图
-- =====================================================

-- =====================================================
-- 1. 学生能力统计�?
-- =====================================================
CREATE TABLE IF NOT EXISTS student_ability_stats (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_ability UNIQUE(student_id, ability, subject)
);

COMMENT ON COLUMN student_ability_stats.student_id IS '学生用户ID';
COMMENT ON COLUMN student_ability_stats.ability IS '能力标签';
COMMENT ON COLUMN student_ability_stats.subject IS '科目';
COMMENT ON COLUMN student_ability_stats.correct_count IS '正确题数';
COMMENT ON COLUMN student_ability_stats.avg_score IS '平均得分';

CREATE INDEX idx_student_ability_stats_student_id ON student_ability_stats(student_id);
CREATE INDEX idx_student_ability_stats_subject ON student_ability_stats(subject);
CREATE INDEX idx_student_ability_stats_ability ON student_ability_stats(ability);
CREATE INDEX idx_student_ability_stats_accuracy ON student_ability_stats(accuracy_rate DESC);

-- =====================================================
-- 2. 学生知识点统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS student_knowledge_stats (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  knowledge_point VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_knowledge UNIQUE(student_id, knowledge_point, subject)
);

COMMENT ON COLUMN student_knowledge_stats.student_id IS '学生用户ID';
COMMENT ON COLUMN student_knowledge_stats.subject IS '科目';
COMMENT ON COLUMN student_knowledge_stats.correct_count IS '正确题数';
COMMENT ON COLUMN student_knowledge_stats.avg_score IS '平均得分';

CREATE INDEX idx_student_knowledge_stats_student_id ON student_knowledge_stats(student_id);
CREATE INDEX idx_student_knowledge_stats_subject ON student_knowledge_stats(subject);
CREATE INDEX idx_student_knowledge_stats_knowledge ON student_knowledge_stats(knowledge_point);
CREATE INDEX idx_student_knowledge_stats_accuracy ON student_knowledge_stats(accuracy_rate DESC);

-- =====================================================
-- 3. 学校能力统计�?
-- =====================================================
CREATE TABLE IF NOT EXISTS school_ability_stats (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  student_count INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_school_ability_period UNIQUE(school_id, ability, subject, period_start, period_end)
);

COMMENT ON COLUMN school_ability_stats.school_id IS '学校ID';
COMMENT ON COLUMN school_ability_stats.ability IS '能力标签';
COMMENT ON COLUMN school_ability_stats.subject IS '科目';
COMMENT ON COLUMN school_ability_stats.correct_count IS '正确次数';
COMMENT ON COLUMN school_ability_stats.avg_score IS '平均得分';
COMMENT ON COLUMN school_ability_stats.period_end IS '统计周期结束日期';

CREATE INDEX idx_school_ability_stats_school_id ON school_ability_stats(school_id);
CREATE INDEX idx_school_ability_stats_subject ON school_ability_stats(subject);
CREATE INDEX idx_school_ability_stats_ability ON school_ability_stats(ability);
CREATE INDEX idx_school_ability_stats_period ON school_ability_stats(period_start, period_end);
CREATE INDEX idx_school_ability_stats_accuracy ON school_ability_stats(accuracy_rate DESC);

-- =====================================================
-- 4. 区域能力统计�?
-- =====================================================
CREATE TABLE IF NOT EXISTS district_ability_stats (
  id SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  ability VARCHAR(100) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  school_count INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_district_ability_period UNIQUE(district_id, ability, subject, period_start, period_end)
);

COMMENT ON COLUMN district_ability_stats.district_id IS '区县ID';
COMMENT ON COLUMN district_ability_stats.ability IS '能力标签';
COMMENT ON COLUMN district_ability_stats.subject IS '科目';
COMMENT ON COLUMN district_ability_stats.correct_count IS '正确次数';
COMMENT ON COLUMN district_ability_stats.avg_score IS '平均得分';
COMMENT ON COLUMN district_ability_stats.period_end IS '统计周期结束日期';

CREATE INDEX idx_district_ability_stats_district_id ON district_ability_stats(district_id);
CREATE INDEX idx_district_ability_stats_subject ON district_ability_stats(subject);
CREATE INDEX idx_district_ability_stats_ability ON district_ability_stats(ability);
CREATE INDEX idx_district_ability_stats_period ON district_ability_stats(period_start, period_end);
CREATE INDEX idx_district_ability_stats_accuracy ON district_ability_stats(accuracy_rate DESC);

-- =====================================================
-- 5. 学生能力实时统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_student_ability_realtime AS
SELECT
  sa.student_id,
  unnest(qd.abilities) as ability,
  qd.subject,
  COUNT(*) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.abilities IS NOT NULL
  AND array_length(qd.abilities, 1) > 0
GROUP BY sa.student_id, ability, qd.subject;


-- =====================================================
-- 6. 学生知识点实时统计视�?
-- =====================================================
CREATE OR REPLACE VIEW v_student_knowledge_realtime AS
SELECT
  sa.student_id,
  unnest(qd.knowledge_points) as knowledge_point,
  qd.subject,
  COUNT(*) as total_questions,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.knowledge_points IS NOT NULL
  AND array_length(qd.knowledge_points, 1) > 0
GROUP BY sa.student_id, knowledge_point, qd.subject;


-- =====================================================
-- 7. 学生学习概况视图
-- =====================================================
CREATE OR REPLACE VIEW v_student_learning_overview AS
SELECT
  sa.student_id,
  COUNT(DISTINCT sa.activity_id) as total_activities,
  COUNT(DISTINCT CASE WHEN sa.status IN ('submitted', 'graded') THEN sa.activity_id END) as completed_activities,
  ROUND(AVG(CASE WHEN sa.status IN ('submitted', 'graded') THEN sa.score END), 2) as avg_score,
  SUM(EXTRACT(EPOCH FROM (sa.submit_time - sa.start_time))) as total_study_seconds,
  MAX(sa.submit_time) as last_activity_time,
  MIN(sa.created_at) as first_activity_time
FROM student_activities sa
GROUP BY sa.student_id;

COMMENT ON VIEW v_student_learning_overview IS '学生学习概况视图 - 整体学习统计';

-- =====================================================
-- 8. 学校能力实时统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_school_ability_realtime AS
SELECT
  s.school_id,
  s.grade,
  unnest(qd.abilities) as ability,
  qd.subject,
  COUNT(DISTINCT sa.student_id) as student_count,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN students s ON sa.student_id = s.user_id
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.abilities IS NOT NULL
  AND array_length(qd.abilities, 1) > 0
  AND s.school_id IS NOT NULL
GROUP BY s.school_id, s.grade, ability, qd.subject;


-- =====================================================
-- 9. 区域能力实时统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_district_ability_realtime AS
SELECT
  sch.district_id,
  s.grade,
  unnest(qd.abilities) as ability,
  qd.subject,
  COUNT(DISTINCT s.school_id) as school_count,
  COUNT(DISTINCT sa.student_id) as student_count,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(CASE WHEN a.is_correct THEN 100 ELSE 0 END), 2) as accuracy_rate,
  ROUND(AVG(a.score), 2) as avg_score,
  MAX(sa.submit_time) as last_activity_time
FROM student_activities sa
JOIN students s ON sa.student_id = s.user_id
JOIN schools sch ON s.school_id = sch.id
JOIN answers a ON sa.id = a.student_exam_id
JOIN question_bank qb ON a.question_id = qb.id
JOIN question_drafts qd ON qb.draft_id = qd.id
WHERE (sa.status = 'submitted' OR sa.status = 'graded')
  AND qd.abilities IS NOT NULL
  AND array_length(qd.abilities, 1) > 0
  AND sch.district_id IS NOT NULL
GROUP BY sch.district_id, s.grade, ability, qd.subject;

COMMENT ON VIEW v_district_ability_realtime IS '区域能力实时统计视图 - 基于区域所有学校学生的答题记录';

-- =====================================================
-- 10. 触发器函数：更新学生能力统计
-- =====================================================


-- 创建触发器（仅在答案被评分后触发�?
DROP TRIGGER IF EXISTS trigger_update_student_ability_stats ON answers;
CREATE TRIGGER trigger_update_student_ability_stats
AFTER INSERT OR UPDATE OF score, is_correct ON answers
FOR EACH ROW
WHEN (NEW.score IS NOT NULL AND NEW.is_correct IS NOT NULL)
EXECUTE FUNCTION update_student_ability_stats();

-- =====================================================
-- 11. 触发器函数：更新学生知识点统�?
-- =====================================================


-- 创建触发器（仅在答案被评分后触发�?
DROP TRIGGER IF EXISTS trigger_update_student_knowledge_stats ON answers;
CREATE TRIGGER trigger_update_student_knowledge_stats
AFTER INSERT OR UPDATE OF score, is_correct ON answers
FOR EACH ROW
WHEN (NEW.score IS NOT NULL AND NEW.is_correct IS NOT NULL)
EXECUTE FUNCTION update_student_knowledge_stats();

-- =====================================================
-- 12. 初始化现有数据的统计（可选）
-- =====================================================
-- 注意：这个步骤可能需要较长时间，建议在低峰期执行
-- 或者通过后台任务逐步初始�?

-- 初始化学生能力统计（注释掉，需要时手动执行�?
-- INSERT INTO student_ability_stats (student_id, ability, subject, total_questions, correct_count, accuracy_rate, avg_score)
-- SELECT * FROM v_student_ability_realtime
-- ON CONFLICT (student_id, ability, subject) DO NOTHING;

-- 初始化学生知识点统计（注释掉，需要时手动执行�?
-- INSERT INTO student_knowledge_stats (student_id, knowledge_point, subject, total_questions, correct_count, accuracy_rate, avg_score)
-- SELECT * FROM v_student_knowledge_realtime
-- ON CONFLICT (student_id, knowledge_point, subject) DO NOTHING;

-- =====================================================
-- Migration Complete
-- =====================================================


-- =====================================================
-- 教学班管理系统 (Migration 026)
-- Teaching Class Management System
-- =====================================================

-- =====================================================
-- 1. 教学班主表 (teaching_classes)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                              -- 班级名称
    description TEXT,                                        -- 班级描述
    scope VARCHAR(20) NOT NULL,                              -- 范围: school/district/municipal
    school_id INTEGER REFERENCES schools(id),                -- 所属学校(校级班级必填)
    district_id INTEGER REFERENCES districts(id),            -- 所属区县(区级班级必填)
    subject VARCHAR(50),                                     -- 所属学科(可选)
    grade VARCHAR(20),                                       -- 年级(可选)
    academic_year VARCHAR(30) NOT NULL,                      -- 学年学期，如"2025-2026学年第一学期"
    status VARCHAR(20) NOT NULL DEFAULT 'draft',             -- 状态
    created_by INTEGER NOT NULL REFERENCES users(id),        -- 创建者
    approved_by INTEGER REFERENCES users(id),                -- 审批者
    approved_at TIMESTAMP,                                   -- 审批时间
    rejection_reason TEXT,                                   -- 拒绝原因
    submitted_at TIMESTAMP,                                  -- 提交审批时间
    current_reviewer_level VARCHAR(20),                      -- 当前审核级别: school/district/municipal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_scope CHECK (scope IN ('school', 'district', 'municipal')),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived'))
);

COMMENT ON TABLE teaching_classes IS '教学班主表 - 存储教学班基本信息';
COMMENT ON COLUMN teaching_classes.scope IS '教学班范围: school-校级, district-区级, municipal-市级';
COMMENT ON COLUMN teaching_classes.status IS '状态: draft-草稿, pending-待审批, approved-已批准, rejected-已拒绝, archived-已归档';
COMMENT ON COLUMN teaching_classes.current_reviewer_level IS '当前审核级别，用于超时流转';

-- 索引
CREATE INDEX IF NOT EXISTS idx_teaching_classes_scope ON teaching_classes(scope);
CREATE INDEX IF NOT EXISTS idx_teaching_classes_status ON teaching_classes(status);
CREATE INDEX IF NOT EXISTS idx_teaching_classes_school ON teaching_classes(school_id);
CREATE INDEX IF NOT EXISTS idx_teaching_classes_district ON teaching_classes(district_id);
CREATE INDEX IF NOT EXISTS idx_teaching_classes_created_by ON teaching_classes(created_by);
CREATE INDEX IF NOT EXISTS idx_teaching_classes_academic_year ON teaching_classes(academic_year);

-- =====================================================
-- 2. 教学班成员表 (teaching_class_members)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_members (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_class_student UNIQUE(teaching_class_id, student_id)
);

COMMENT ON TABLE teaching_class_members IS '教学班成员表 - 记录教学班与学生的关联关系';
COMMENT ON COLUMN teaching_class_members.is_active IS '是否在班: true-在班, false-已移除';

-- 索引
CREATE INDEX IF NOT EXISTS idx_tcm_class ON teaching_class_members(teaching_class_id);
CREATE INDEX IF NOT EXISTS idx_tcm_student ON teaching_class_members(student_id);
CREATE INDEX IF NOT EXISTS idx_tcm_active ON teaching_class_members(is_active);

-- =====================================================
-- 3. 教学班教师表 (teaching_class_teachers)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_teachers (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'teacher',             -- 角色: creator/teacher/assistant
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_class_teacher UNIQUE(teaching_class_id, teacher_id),
    CONSTRAINT valid_teacher_role CHECK (role IN ('creator', 'teacher', 'assistant'))
);

COMMENT ON TABLE teaching_class_teachers IS '教学班教师表 - 记录教学班与教师的关联关系';
COMMENT ON COLUMN teaching_class_teachers.role IS '教师角色: creator-创建者, teacher-任课教师, assistant-助教';

-- 索引
CREATE INDEX IF NOT EXISTS idx_tct_class ON teaching_class_teachers(teaching_class_id);
CREATE INDEX IF NOT EXISTS idx_tct_teacher ON teaching_class_teachers(teacher_id);

-- =====================================================
-- 4. 教学班审批记录表 (teaching_class_approvals)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_approvals (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL,                             -- 动作: approve/reject/escalate/return
    comment TEXT,                                            -- 审批意见
    reviewer_level VARCHAR(20) NOT NULL,                     -- 审核者级别: school/district/municipal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_approval_action CHECK (action IN ('approve', 'reject', 'escalate', 'return'))
);

COMMENT ON TABLE teaching_class_approvals IS '教学班审批记录表 - 记录审批历史';
COMMENT ON COLUMN teaching_class_approvals.action IS '审批动作: approve-批准, reject-拒绝, escalate-流转上级, return-退回修改';

-- 索引
CREATE INDEX IF NOT EXISTS idx_tca_class ON teaching_class_approvals(teaching_class_id);
CREATE INDEX IF NOT EXISTS idx_tca_reviewer ON teaching_class_approvals(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_tca_created_at ON teaching_class_approvals(created_at);

-- =====================================================
-- 5. 教学班活动关联表 (teaching_class_activities)
-- =====================================================
CREATE TABLE IF NOT EXISTS teaching_class_activities (
    id SERIAL PRIMARY KEY,
    teaching_class_id INTEGER NOT NULL REFERENCES teaching_classes(id) ON DELETE CASCADE,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    deadline TIMESTAMP,                                      -- 完成截止时间(可选)
    is_required BOOLEAN DEFAULT FALSE,                       -- 是否必做

    CONSTRAINT unique_class_activity UNIQUE(teaching_class_id, activity_id)
);

COMMENT ON TABLE teaching_class_activities IS '教学班活动关联表 - 记录教学班与活动的关联关系';

-- 索引
CREATE INDEX IF NOT EXISTS idx_tcact_class ON teaching_class_activities(teaching_class_id);
CREATE INDEX IF NOT EXISTS idx_tcact_activity ON teaching_class_activities(activity_id);

-- =====================================================
-- 6. 创建更新时间触发器
-- =====================================================

DROP TRIGGER IF EXISTS trigger_teaching_class_updated_at ON teaching_classes;
CREATE TRIGGER trigger_teaching_class_updated_at
    BEFORE UPDATE ON teaching_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_teaching_class_updated_at();

-- =====================================================
-- 7. 教学班统计视图
-- =====================================================
CREATE OR REPLACE VIEW v_teaching_class_summary AS
SELECT
    tc.id,
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
    (SELECT COUNT(*) FROM teaching_class_members tcm
     WHERE tcm.teaching_class_id = tc.id AND tcm.is_active = TRUE) AS student_count,
    (SELECT COUNT(*) FROM teaching_class_teachers tct
     WHERE tct.teaching_class_id = tc.id AND tct.is_active = TRUE) AS teacher_count,
    (SELECT COUNT(*) FROM teaching_class_activities tca
     WHERE tca.teaching_class_id = tc.id) AS activity_count
FROM teaching_classes tc
LEFT JOIN schools s ON tc.school_id = s.id
LEFT JOIN districts d ON tc.district_id = d.id
LEFT JOIN users u ON tc.created_by = u.id;

COMMENT ON VIEW v_teaching_class_summary IS '教学班汇总视图 - 包含学生数、教师数、活动数等统计信息';

-- =====================================================
-- 8. 待审批教学班视图 (用于管理员审批列表)
-- =====================================================
CREATE OR REPLACE VIEW v_pending_teaching_classes AS
SELECT
    tc.id,
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
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - tc.submitted_at)) AS pending_days
FROM teaching_classes tc
LEFT JOIN schools s ON tc.school_id = s.id
LEFT JOIN districts d ON tc.district_id = d.id
LEFT JOIN users u ON tc.created_by = u.id
WHERE tc.status = 'pending'
ORDER BY tc.submitted_at ASC;

COMMENT ON VIEW v_pending_teaching_classes IS '待审批教学班视图 - 显示待审批的教学班列表';

-- =====================================================
-- 教学班管理系统 完成
-- =====================================================


-- =====================================================
-- 测评报名管理系统
-- 迁移文件: 029_assessment_registration.sql
-- =====================================================

-- 导入迁移脚本

-- =====================================================
-- 测评报名管理系统 完成
-- =====================================================


-- =====================================================
-- 编程题判题系统
-- 迁移文件: 031_judge_system.sql, 032_update_question_bank_view.sql, 033_fix_code_submissions.sql
-- =====================================================

-- 导入迁移脚本

-- =====================================================
-- 编程题判题系统 完成
-- =====================================================


--
-- PostgreSQL database dump complete
--


