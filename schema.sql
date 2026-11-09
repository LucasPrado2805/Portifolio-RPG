--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.8

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
-- Name: biomas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biomas (
    id_bioma integer NOT NULL,
    nome text,
    cor text,
    transponivel boolean,
    custo_mov integer DEFAULT 1
);


ALTER TABLE public.biomas OWNER TO postgres;

--
-- Name: biomas_id_bioma_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.biomas_id_bioma_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.biomas_id_bioma_seq OWNER TO postgres;

--
-- Name: biomas_id_bioma_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.biomas_id_bioma_seq OWNED BY public.biomas.id_bioma;


--
-- Name: cidades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cidades (
    id_cidade integer NOT NULL,
    nome character varying(100) NOT NULL,
    x integer,
    y integer
);


ALTER TABLE public.cidades OWNER TO postgres;

--
-- Name: cidades_id_cidade_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cidades_id_cidade_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cidades_id_cidade_seq OWNER TO postgres;

--
-- Name: cidades_id_cidade_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cidades_id_cidade_seq OWNED BY public.cidades.id_cidade;


--
-- Name: criaturas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.criaturas (
    id_criatura integer NOT NULL,
    nome text NOT NULL,
    vida integer NOT NULL,
    ataque integer NOT NULL,
    bioma_id integer,
    agressividade text DEFAULT 'agressiva'::text
);


ALTER TABLE public.criaturas OWNER TO postgres;

--
-- Name: criaturas_id_criatura_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.criaturas_id_criatura_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.criaturas_id_criatura_seq OWNER TO postgres;

--
-- Name: criaturas_id_criatura_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.criaturas_id_criatura_seq OWNED BY public.criaturas.id_criatura;


--
-- Name: missao_obj; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.missao_obj (
    id_obj integer NOT NULL,
    missao_id integer NOT NULL,
    ordem integer NOT NULL,
    tipo text NOT NULL,
    alvo integer,
    vida_mod integer,
    ataq_mod integer,
    modo text,
    meta integer
);


ALTER TABLE public.missao_obj OWNER TO postgres;

--
-- Name: missao_obj_id_obj_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.missao_obj_id_obj_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.missao_obj_id_obj_seq OWNER TO postgres;

--
-- Name: missao_obj_id_obj_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.missao_obj_id_obj_seq OWNED BY public.missao_obj.id_obj;


--
-- Name: missoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.missoes (
    id_missao integer NOT NULL,
    cidade_id integer,
    n_d4 integer,
    nivel integer,
    texto text,
    prazo integer,
    recompensa integer DEFAULT 0,
    missao_pai integer
);


ALTER TABLE public.missoes OWNER TO postgres;

--
-- Name: missoes_id_missao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.missoes_id_missao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.missoes_id_missao_seq OWNER TO postgres;

--
-- Name: missoes_id_missao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.missoes_id_missao_seq OWNED BY public.missoes.id_missao;


--
-- Name: obj_dinamico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.obj_dinamico (
    id_dinamico integer NOT NULL,
    personagem_id integer NOT NULL,
    missao_id integer NOT NULL,
    turno_aceite integer,
    status text,
    ordem_atual integer DEFAULT 1,
    ultimo_num integer DEFAULT 0,
    turno_meta integer
);


ALTER TABLE public.obj_dinamico OWNER TO postgres;

--
-- Name: obj_dinamico_id_dinamico_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.obj_dinamico_id_dinamico_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.obj_dinamico_id_dinamico_seq OWNER TO postgres;

--
-- Name: obj_dinamico_id_dinamico_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.obj_dinamico_id_dinamico_seq OWNED BY public.obj_dinamico.id_dinamico;


--
-- Name: personagem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personagem (
    id_personagem integer NOT NULL,
    nome character varying(100) NOT NULL,
    x integer,
    y integer,
    movimento_max integer DEFAULT 5,
    saldo_mov_turno integer DEFAULT 5,
    vida integer DEFAULT 100,
    acampado boolean DEFAULT false,
    andou_no_turno boolean DEFAULT false,
    vida_max integer DEFAULT 100,
    turno_atual integer DEFAULT 1,
    dinheiro integer DEFAULT 0
);


ALTER TABLE public.personagem OWNER TO postgres;

--
-- Name: personagem_id_personagem_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personagem_id_personagem_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personagem_id_personagem_seq OWNER TO postgres;

--
-- Name: personagem_id_personagem_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personagem_id_personagem_seq OWNED BY public.personagem.id_personagem;


--
-- Name: posicoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posicoes (
    id_posicao integer NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    bioma_id integer
);


ALTER TABLE public.posicoes OWNER TO postgres;

--
-- Name: posicoes_id_posicao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posicoes_id_posicao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posicoes_id_posicao_seq OWNER TO postgres;

--
-- Name: posicoes_id_posicao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posicoes_id_posicao_seq OWNED BY public.posicoes.id_posicao;


--
-- Name: biomas id_bioma; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomas ALTER COLUMN id_bioma SET DEFAULT nextval('public.biomas_id_bioma_seq'::regclass);


--
-- Name: cidades id_cidade; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cidades ALTER COLUMN id_cidade SET DEFAULT nextval('public.cidades_id_cidade_seq'::regclass);


--
-- Name: criaturas id_criatura; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.criaturas ALTER COLUMN id_criatura SET DEFAULT nextval('public.criaturas_id_criatura_seq'::regclass);


--
-- Name: missao_obj id_obj; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missao_obj ALTER COLUMN id_obj SET DEFAULT nextval('public.missao_obj_id_obj_seq'::regclass);


--
-- Name: missoes id_missao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missoes ALTER COLUMN id_missao SET DEFAULT nextval('public.missoes_id_missao_seq'::regclass);


--
-- Name: obj_dinamico id_dinamico; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obj_dinamico ALTER COLUMN id_dinamico SET DEFAULT nextval('public.obj_dinamico_id_dinamico_seq'::regclass);


--
-- Name: personagem id_personagem; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personagem ALTER COLUMN id_personagem SET DEFAULT nextval('public.personagem_id_personagem_seq'::regclass);


--
-- Name: posicoes id_posicao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posicoes ALTER COLUMN id_posicao SET DEFAULT nextval('public.posicoes_id_posicao_seq'::regclass);


--
-- Name: biomas biomas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomas
    ADD CONSTRAINT biomas_pkey PRIMARY KEY (id_bioma);


--
-- Name: cidades cidades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cidades
    ADD CONSTRAINT cidades_pkey PRIMARY KEY (id_cidade);


--
-- Name: criaturas criaturas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.criaturas
    ADD CONSTRAINT criaturas_pkey PRIMARY KEY (id_criatura);


--
-- Name: missao_obj missao_obj_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missao_obj
    ADD CONSTRAINT missao_obj_pkey PRIMARY KEY (id_obj);


--
-- Name: missoes missoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missoes
    ADD CONSTRAINT missoes_pkey PRIMARY KEY (id_missao);


--
-- Name: obj_dinamico obj_dinamico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obj_dinamico
    ADD CONSTRAINT obj_dinamico_pkey PRIMARY KEY (id_dinamico);


--
-- Name: missao_obj ordem_unica; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missao_obj
    ADD CONSTRAINT ordem_unica UNIQUE (missao_id, ordem);


--
-- Name: personagem personagem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personagem
    ADD CONSTRAINT personagem_pkey PRIMARY KEY (id_personagem);


--
-- Name: posicoes posicoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posicoes
    ADD CONSTRAINT posicoes_pkey PRIMARY KEY (id_posicao);


--
-- Name: criaturas criaturas_bioma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.criaturas
    ADD CONSTRAINT criaturas_bioma_id_fkey FOREIGN KEY (bioma_id) REFERENCES public.biomas(id_bioma);


--
-- Name: missao_obj missao_obj_missao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missao_obj
    ADD CONSTRAINT missao_obj_missao_id_fkey FOREIGN KEY (missao_id) REFERENCES public.missoes(id_missao);


--
-- Name: missoes missoes_cidade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missoes
    ADD CONSTRAINT missoes_cidade_id_fkey FOREIGN KEY (cidade_id) REFERENCES public.cidades(id_cidade);


--
-- Name: missoes missoes_missao_pai_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missoes
    ADD CONSTRAINT missoes_missao_pai_fkey FOREIGN KEY (missao_pai) REFERENCES public.missoes(id_missao);


--
-- Name: obj_dinamico obj_dinamico_missao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obj_dinamico
    ADD CONSTRAINT obj_dinamico_missao_id_fkey FOREIGN KEY (missao_id) REFERENCES public.missoes(id_missao);


--
-- Name: obj_dinamico obj_dinamico_personagem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obj_dinamico
    ADD CONSTRAINT obj_dinamico_personagem_id_fkey FOREIGN KEY (personagem_id) REFERENCES public.personagem(id_personagem);


--
-- Name: posicoes posicoes_bioma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posicoes
    ADD CONSTRAINT posicoes_bioma_id_fkey FOREIGN KEY (bioma_id) REFERENCES public.biomas(id_bioma);


--
-- PostgreSQL database dump complete
--

