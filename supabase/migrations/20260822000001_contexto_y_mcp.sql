-- Pa'lante — esquema base del contexto financiero y de la capa de acceso MCP.
--
-- Principios que este esquema hace cumplir:
--   1. Todo dato pertenece a un usuario (auth.users) y queda aislado por RLS.
--   2. Los tokens de MCP se guardan hasheados, nunca en texto plano.
--   3. Cada lectura vía MCP deja rastro en mcp_accesos (el usuario puede ver
--      qué agente leyó su contexto y cuándo).

-- ---------------------------------------------------------------------------
-- Contexto financiero
-- ---------------------------------------------------------------------------

create type tipo_transaccion as enum ('ingreso', 'gasto');
create type fuente_dato as enum ('gmail', 'pdf', 'manual');

create table public.transacciones (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  fecha         date not null,
  monto         numeric(14,2) not null check (monto >= 0),
  tipo          tipo_transaccion not null,
  comercio_raw  text not null,
  comercio_norm text,
  categoria     text,
  cuenta        text,
  fuente        fuente_dato not null,
  -- 0..1: qué tan seguro está el parser de esta fila. El MCP lo expone para
  -- que un agente sepa cuándo NO debe concluir.
  confianza     numeric(3,2) not null default 1.0 check (confianza between 0 and 1),
  -- Deduplicación: el mismo movimiento puede llegar por correo y por PDF.
  hash_dedupe   text,
  creado_en     timestamptz not null default now()
);

create unique index transacciones_dedupe_idx
  on public.transacciones (user_id, hash_dedupe)
  where hash_dedupe is not null;

create index transacciones_user_fecha_idx
  on public.transacciones (user_id, fecha desc);

-- Las deudas NO se derivan de las transacciones: una transacción es un
-- movimiento, y el router de diagnóstico necesita saldo y tasa para decidir
-- "deuda de alto costo". Por eso viven en su propia tabla.
create table public.deudas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  entidad        text not null,
  tipo           text,                       -- tarjeta, libranza, libre inversión…
  saldo          numeric(14,2) not null check (saldo >= 0),
  tasa_ea        numeric(6,3),               -- efectiva anual, en % (ej. 28.500)
  cuota_mensual  numeric(14,2),
  fuente         fuente_dato not null default 'manual',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index deudas_user_idx on public.deudas (user_id);

create table public.planes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  meta           text not null,
  aporte_mensual numeric(14,2) not null,
  pasos          jsonb not null default '[]'::jsonb,
  supuestos      jsonb not null default '[]'::jsonb,
  fecha_objetivo date,
  activo         boolean not null default true,
  creado_en      timestamptz not null default now()
);

-- Un solo plan activo por usuario.
create unique index planes_activo_idx
  on public.planes (user_id)
  where activo;

-- ---------------------------------------------------------------------------
-- Capa de acceso MCP
-- ---------------------------------------------------------------------------

create table public.mcp_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Nombre que le pone el usuario: "Claude de escritorio", "mi agente".
  nombre      text not null,
  -- sha256 del token. El valor en claro se muestra UNA vez al generarlo.
  token_hash  text not null unique,
  -- Prefijo visible para que el usuario reconozca cuál es cuál en la lista.
  prefijo     text not null,
  ultimo_uso  timestamptz,
  revocado_en timestamptz,
  creado_en   timestamptz not null default now()
);

create index mcp_tokens_hash_idx on public.mcp_tokens (token_hash) where revocado_en is null;

-- Registro de accesos: es lo que le permite al usuario responder
-- "¿quién leyó mis finanzas?". Se escribe en cada llamada del MCP.
create table public.mcp_accesos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token_id    uuid references public.mcp_tokens(id) on delete set null,
  herramienta text not null,
  argumentos  jsonb,
  exito       boolean not null default true,
  creado_en   timestamptz not null default now()
);

create index mcp_accesos_user_idx on public.mcp_accesos (user_id, creado_en desc);

-- ---------------------------------------------------------------------------
-- RLS: nadie ve lo que no es suyo
-- ---------------------------------------------------------------------------

alter table public.transacciones enable row level security;
alter table public.deudas        enable row level security;
alter table public.planes        enable row level security;
alter table public.mcp_tokens    enable row level security;
alter table public.mcp_accesos   enable row level security;

create policy "dueño gestiona sus transacciones" on public.transacciones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus deudas" on public.deudas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus planes" on public.planes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus tokens" on public.mcp_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- El registro de accesos es solo de lectura para el usuario: lo escribe el
-- servidor MCP. Que el dueño no pueda borrarlo es justamente el punto.
create policy "dueño lee sus accesos" on public.mcp_accesos
  for select using (auth.uid() = user_id);
