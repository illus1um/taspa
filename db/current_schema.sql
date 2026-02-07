--
-- PostgreSQL database dump
--

\restrict 7I5iSq9R3Uyl4zKvbrbqcpfoLLbhqp2AWO6AKnDvfKS3DG6ZLXN6qXbmjZnAKai

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: direction_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direction_sources (
    id bigint NOT NULL,
    direction_id bigint NOT NULL,
    source_type text NOT NULL,
    source_identifier text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT direction_sources_source_type_check CHECK ((source_type = ANY (ARRAY['vk_group'::text, 'instagram_account'::text, 'tiktok_account'::text])))
);


--
-- Name: direction_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.direction_sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: direction_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.direction_sources_id_seq OWNED BY public.direction_sources.id;


--
-- Name: directions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.directions (
    id bigint NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: directions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.directions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: directions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.directions_id_seq OWNED BY public.directions.id;


--
-- Name: instagram_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instagram_accounts (
    id bigint NOT NULL,
    direction_id bigint NOT NULL,
    username text NOT NULL,
    url text,
    bio text,
    location text,
    scraped_at timestamp with time zone,
    name text
);


--
-- Name: instagram_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.instagram_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: instagram_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.instagram_accounts_id_seq OWNED BY public.instagram_accounts.id;


--
-- Name: instagram_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instagram_users (
    id bigint NOT NULL,
    instagram_account_id bigint NOT NULL,
    username text NOT NULL,
    url text,
    bio text,
    location text,
    scraped_at timestamp with time zone,
    sex text,
    city text,
    data_timestamp timestamp with time zone
);


--
-- Name: instagram_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.instagram_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: instagram_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.instagram_users_id_seq OWNED BY public.instagram_users.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name text NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: scrape_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scrape_jobs (
    id bigint NOT NULL,
    service_name text NOT NULL,
    direction_id bigint,
    status text NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scrape_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scrape_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scrape_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scrape_jobs_id_seq OWNED BY public.scrape_jobs.id;


--
-- Name: scrape_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scrape_logs (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    level text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scrape_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scrape_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scrape_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scrape_logs_id_seq OWNED BY public.scrape_logs.id;


--
-- Name: tiktok_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiktok_accounts (
    id bigint NOT NULL,
    direction_id bigint NOT NULL,
    username text NOT NULL,
    url text,
    location text,
    followers_count integer,
    scraped_at timestamp with time zone,
    name text
);


--
-- Name: tiktok_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tiktok_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tiktok_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tiktok_accounts_id_seq OWNED BY public.tiktok_accounts.id;


--
-- Name: tiktok_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiktok_users (
    id bigint NOT NULL,
    tiktok_account_id bigint NOT NULL,
    username text NOT NULL,
    url text,
    location text,
    followers_count integer,
    scraped_at timestamp with time zone,
    sex text,
    city text,
    data_timestamp timestamp with time zone
);


--
-- Name: tiktok_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tiktok_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tiktok_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tiktok_users_id_seq OWNED BY public.tiktok_users.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id bigint NOT NULL,
    role_id bigint NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    refresh_token_hash text,
    refresh_token_expires_at timestamp with time zone,
    first_name text,
    last_name text
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
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
-- Name: vk_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vk_groups (
    id bigint NOT NULL,
    direction_id bigint NOT NULL,
    vk_group_id text NOT NULL,
    name text,
    members_count integer,
    scraped_at timestamp with time zone,
    url text
);


--
-- Name: vk_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vk_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vk_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vk_groups_id_seq OWNED BY public.vk_groups.id;


--
-- Name: vk_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vk_members (
    id bigint NOT NULL,
    vk_group_id bigint NOT NULL,
    vk_user_id text NOT NULL,
    full_name text,
    gender text,
    university text,
    school text,
    scraped_at timestamp with time zone,
    age integer,
    city text,
    last_recently timestamp with time zone,
    data_timestamp timestamp with time zone
);


--
-- Name: vk_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vk_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vk_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vk_members_id_seq OWNED BY public.vk_members.id;


--
-- Name: direction_sources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direction_sources ALTER COLUMN id SET DEFAULT nextval('public.direction_sources_id_seq'::regclass);


--
-- Name: directions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.directions ALTER COLUMN id SET DEFAULT nextval('public.directions_id_seq'::regclass);


--
-- Name: instagram_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_accounts ALTER COLUMN id SET DEFAULT nextval('public.instagram_accounts_id_seq'::regclass);


--
-- Name: instagram_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_users ALTER COLUMN id SET DEFAULT nextval('public.instagram_users_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: scrape_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_jobs ALTER COLUMN id SET DEFAULT nextval('public.scrape_jobs_id_seq'::regclass);


--
-- Name: scrape_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_logs ALTER COLUMN id SET DEFAULT nextval('public.scrape_logs_id_seq'::regclass);


--
-- Name: tiktok_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_accounts ALTER COLUMN id SET DEFAULT nextval('public.tiktok_accounts_id_seq'::regclass);


--
-- Name: tiktok_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_users ALTER COLUMN id SET DEFAULT nextval('public.tiktok_users_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vk_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_groups ALTER COLUMN id SET DEFAULT nextval('public.vk_groups_id_seq'::regclass);


--
-- Name: vk_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_members ALTER COLUMN id SET DEFAULT nextval('public.vk_members_id_seq'::regclass);


--
-- Name: direction_sources direction_sources_direction_id_source_type_source_identifie_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direction_sources
    ADD CONSTRAINT direction_sources_direction_id_source_type_source_identifie_key UNIQUE (direction_id, source_type, source_identifier);


--
-- Name: direction_sources direction_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direction_sources
    ADD CONSTRAINT direction_sources_pkey PRIMARY KEY (id);


--
-- Name: directions directions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT directions_name_key UNIQUE (name);


--
-- Name: directions directions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.directions
    ADD CONSTRAINT directions_pkey PRIMARY KEY (id);


--
-- Name: instagram_accounts instagram_accounts_direction_id_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_direction_id_username_key UNIQUE (direction_id, username);


--
-- Name: instagram_accounts instagram_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_pkey PRIMARY KEY (id);


--
-- Name: instagram_users instagram_users_instagram_account_id_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_users
    ADD CONSTRAINT instagram_users_instagram_account_id_username_key UNIQUE (instagram_account_id, username);


--
-- Name: instagram_users instagram_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_users
    ADD CONSTRAINT instagram_users_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scrape_jobs scrape_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_jobs
    ADD CONSTRAINT scrape_jobs_pkey PRIMARY KEY (id);


--
-- Name: scrape_logs scrape_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_logs
    ADD CONSTRAINT scrape_logs_pkey PRIMARY KEY (id);


--
-- Name: tiktok_accounts tiktok_accounts_direction_id_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_accounts
    ADD CONSTRAINT tiktok_accounts_direction_id_username_key UNIQUE (direction_id, username);


--
-- Name: tiktok_accounts tiktok_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_accounts
    ADD CONSTRAINT tiktok_accounts_pkey PRIMARY KEY (id);


--
-- Name: tiktok_users tiktok_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_users
    ADD CONSTRAINT tiktok_users_pkey PRIMARY KEY (id);


--
-- Name: tiktok_users tiktok_users_tiktok_account_id_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_users
    ADD CONSTRAINT tiktok_users_tiktok_account_id_username_key UNIQUE (tiktok_account_id, username);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vk_groups vk_groups_direction_id_vk_group_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_groups
    ADD CONSTRAINT vk_groups_direction_id_vk_group_id_key UNIQUE (direction_id, vk_group_id);


--
-- Name: vk_groups vk_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_groups
    ADD CONSTRAINT vk_groups_pkey PRIMARY KEY (id);


--
-- Name: vk_members vk_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_members
    ADD CONSTRAINT vk_members_pkey PRIMARY KEY (id);


--
-- Name: vk_members vk_members_vk_group_id_vk_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_members
    ADD CONSTRAINT vk_members_vk_group_id_vk_user_id_key UNIQUE (vk_group_id, vk_user_id);


--
-- Name: idx_instagram_users_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instagram_users_account_id ON public.instagram_users USING btree (instagram_account_id);


--
-- Name: idx_scrape_logs_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrape_logs_job_id ON public.scrape_logs USING btree (job_id);


--
-- Name: idx_tiktok_users_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tiktok_users_account_id ON public.tiktok_users USING btree (tiktok_account_id);


--
-- Name: idx_vk_members_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vk_members_group_id ON public.vk_members USING btree (vk_group_id);


--
-- Name: direction_sources direction_sources_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direction_sources
    ADD CONSTRAINT direction_sources_direction_id_fkey FOREIGN KEY (direction_id) REFERENCES public.directions(id) ON DELETE CASCADE;


--
-- Name: instagram_accounts instagram_accounts_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_direction_id_fkey FOREIGN KEY (direction_id) REFERENCES public.directions(id) ON DELETE CASCADE;


--
-- Name: instagram_users instagram_users_instagram_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instagram_users
    ADD CONSTRAINT instagram_users_instagram_account_id_fkey FOREIGN KEY (instagram_account_id) REFERENCES public.instagram_accounts(id) ON DELETE CASCADE;


--
-- Name: scrape_jobs scrape_jobs_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_jobs
    ADD CONSTRAINT scrape_jobs_direction_id_fkey FOREIGN KEY (direction_id) REFERENCES public.directions(id) ON DELETE SET NULL;


--
-- Name: scrape_logs scrape_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrape_logs
    ADD CONSTRAINT scrape_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.scrape_jobs(id) ON DELETE CASCADE;


--
-- Name: tiktok_accounts tiktok_accounts_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_accounts
    ADD CONSTRAINT tiktok_accounts_direction_id_fkey FOREIGN KEY (direction_id) REFERENCES public.directions(id) ON DELETE CASCADE;


--
-- Name: tiktok_users tiktok_users_tiktok_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiktok_users
    ADD CONSTRAINT tiktok_users_tiktok_account_id_fkey FOREIGN KEY (tiktok_account_id) REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vk_groups vk_groups_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_groups
    ADD CONSTRAINT vk_groups_direction_id_fkey FOREIGN KEY (direction_id) REFERENCES public.directions(id) ON DELETE CASCADE;


--
-- Name: vk_members vk_members_vk_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vk_members
    ADD CONSTRAINT vk_members_vk_group_id_fkey FOREIGN KEY (vk_group_id) REFERENCES public.vk_groups(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7I5iSq9R3Uyl4zKvbrbqcpfoLLbhqp2AWO6AKnDvfKS3DG6ZLXN6qXbmjZnAKai

