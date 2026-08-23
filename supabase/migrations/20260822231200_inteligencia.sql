-- Pa'lante — orquestador conversacional, expertos, Trust Engine (auditoría),
-- memoria financiera y RAG mínimo (Fase 1 de la plataforma de inteligencia
-- financiera conversacional; ver CLAUDE.md).
--
-- Principios que este esquema hace cumplir:
--   1. Todo dato pertenece a un usuario (auth.users) y queda aislado por RLS,
--      salvo el conocimiento documental (documentos_conocimiento*), que es
--      contenido de referencia global leído solo desde el servidor.
--   2. `analisis` es el ledger de auditoría (sección 16 del pedido): toda
--      invocación de experto y toda síntesis final quedan reconstruibles.
--   3. `perfil_conversacional` es memoria, no modelo: solo preferencias y
--      contexto declarado por el usuario, nunca cifras financieras crudas
--      (esas siguen viviendo en transacciones/deudas/hallazgos_financieros).

-- ---------------------------------------------------------------------------
-- Conversaciones
-- ---------------------------------------------------------------------------

create type rol_mensaje as enum ('user', 'assistant');

create table public.conversaciones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  titulo         text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index conversaciones_user_idx on public.conversaciones (user_id, actualizado_en desc);

create table public.mensajes (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  rol             rol_mensaje not null,
  contenido       text not null,
  -- Qué expertos/tools se invocaron para producir este mensaje (solo en
  -- mensajes rol='assistant'), para poder re-renderizar el progreso al
  -- reabrir la conversación.
  eventos         jsonb,
  creado_en       timestamptz not null default now()
);

create index mensajes_conversacion_idx on public.mensajes (conversacion_id, creado_en);

-- ---------------------------------------------------------------------------
-- Memoria financiera (preferencias declaradas, no cifras)
-- ---------------------------------------------------------------------------

create table public.perfil_conversacional (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  objetivos         text[] not null default '{}',
  horizonte         text,
  tolerancia_riesgo text,
  preferencias      jsonb not null default '{}'::jsonb,
  actualizado_en    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auditoría (Trust Engine / sección 16): reconstruir "¿por qué me lo dijo?"
-- ---------------------------------------------------------------------------

create table public.analisis (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  conversacion_id     uuid references public.conversaciones(id) on delete cascade,
  mensaje_id          uuid references public.mensajes(id) on delete set null,
  -- ids del registro de expertos (registro-expertos.ts), ej. ['deuda','riesgo'].
  expertos_invocados  text[] not null default '{}',
  herramientas        jsonb not null default '[]'::jsonb,
  -- Cada fuente citada con su tier del Trust Engine: [{fuente, tier, procedencia, hallazgo_id}].
  fuentes             jsonb not null default '[]'::jsonb,
  confianza           numeric(3,2) check (confianza between 0 and 1),
  resultado           jsonb,
  advertencias        text[] not null default '{}',
  creado_en           timestamptz not null default now()
);

create index analisis_user_idx on public.analisis (user_id, creado_en desc);
create index analisis_conversacion_idx on public.analisis (conversacion_id);

-- ---------------------------------------------------------------------------
-- RAG mínimo: conocimiento documental (regulación, definiciones), NUNCA para
-- datos propios del usuario (esos siempre vienen de una query estructurada).
-- ---------------------------------------------------------------------------

create extension if not exists vector;

create table public.documentos_conocimiento (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  fuente_url text,
  -- Tier del Trust Engine para el conocimiento documental (ver
  -- web/src/lib/inteligencia/trust/tiers.ts): normalmente 'A' o 'C'.
  tier       text not null default 'C',
  creado_en  timestamptz not null default now()
);

create table public.documentos_conocimiento_chunks (
  id            uuid primary key default gen_random_uuid(),
  documento_id  uuid not null references public.documentos_conocimiento(id) on delete cascade,
  contenido     text not null,
  -- Voyage AI voyage-3 / voyage-3-lite: 1024 dimensiones.
  embedding     vector(1024),
  orden         integer not null default 0
);

create index documentos_conocimiento_chunks_documento_idx
  on public.documentos_conocimiento_chunks (documento_id);

create index documentos_conocimiento_chunks_embedding_idx
  on public.documentos_conocimiento_chunks
  using hnsw (embedding vector_cosine_ops);

-- Búsqueda por similitud coseno. Sin política de cliente sobre estas tablas
-- (son contenido de referencia global, no datos de usuario), así que esta
-- función es segura de invocar tanto desde el cliente con sesión (web) como
-- desde el cliente service_role (MCP).
create or replace function public.buscar_chunks_conocimiento(
  query_embedding vector(1024),
  match_count integer default 4
)
returns table (
  documento_id uuid,
  titulo text,
  fuente_url text,
  tier text,
  contenido text,
  distancia float
)
language sql stable
as $$
  select
    c.documento_id,
    d.titulo,
    d.fuente_url,
    d.tier,
    c.contenido,
    (c.embedding <=> query_embedding) as distancia
  from public.documentos_conocimiento_chunks c
  join public.documentos_conocimiento d on d.id = c.documento_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- RLS: nadie ve lo que no es suyo. El conocimiento documental no lleva
-- política de cliente: solo se consulta desde el servidor (tool de RAG).
-- ---------------------------------------------------------------------------

alter table public.conversaciones         enable row level security;
alter table public.mensajes               enable row level security;
alter table public.perfil_conversacional  enable row level security;
alter table public.analisis               enable row level security;

create policy "dueño gestiona sus conversaciones" on public.conversaciones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus mensajes" on public.mensajes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona su perfil conversacional" on public.perfil_conversacional
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- El ledger de auditoría es de solo lectura para el dueño: lo escribe el
-- servidor (mismo criterio que mcp_accesos en 20260822000001).
create policy "dueño lee su auditoría" on public.analisis
  for select using (auth.uid() = user_id);
