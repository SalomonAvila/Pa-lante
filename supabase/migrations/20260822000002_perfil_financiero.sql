-- Pa'lante — registro extendido, verificación de identidad, consentimientos
-- separados y conectores simulados de fuentes financieras externas.
--
-- Principios que este esquema hace cumplir (ver CLAUDE.md):
--   1. Todo dato pertenece a un usuario (auth.users) y queda aislado por RLS.
--   2. Ningún conector salta la fase de cuenta: toda fuente pasa por
--      preparing → (registro | recuperar clave | login directo) → extracción.
--   3. Un hallazgo financiero nunca se sobrescribe con datos contradictorios:
--      cada fuente/periodo queda como fila propia, con su procedencia.
--   4. El correo ya vive en auth.users — no se duplica en personas.

-- ---------------------------------------------------------------------------
-- Identidad extendida
-- ---------------------------------------------------------------------------

create type tipo_documento as enum ('CC', 'CE', 'TI', 'PA', 'NIT');
create type tipo_persona as enum ('natural', 'juridica');
create type sexo_registro as enum ('femenino', 'masculino', 'no_binario', 'sin_especificar');
create type identidad_genero as enum (
  'mujer', 'hombre', 'transgenero', 'no_binario', 'otro', 'prefiero_no_responder'
);

create table public.personas (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  nombres                  text not null,
  apellidos                text not null,
  tipo_documento           tipo_documento not null,
  numero_documento         text not null,
  fecha_expedicion         date not null,
  fecha_nacimiento         date not null,
  direccion                text not null,
  departamento             text not null,
  municipio                text not null,
  celular                  text not null,
  tipo_persona             tipo_persona not null default 'natural',
  -- Sexo (interoperabilidad con fuentes externas) e identidad de género
  -- (nunca obligatoria) se guardan por separado a propósito: ver CLAUDE.md.
  sexo                     sexo_registro,
  identidad_genero         identidad_genero,
  documento_verificado     boolean not null default false,
  documento_verificado_en  timestamptz,
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now()
);

create unique index personas_documento_idx
  on public.personas (tipo_documento, numero_documento);

-- Solo prepara la arquitectura para persona_juridica (sección 2 del pedido);
-- el flujo de captura de NIT/razón social no se construye todavía.
create table public.empresas (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references public.personas(user_id) on delete cascade,
  nit           text not null,
  razon_social  text not null,
  creado_en     timestamptz not null default now()
);

create index empresas_persona_idx on public.empresas (persona_id);

create type tipo_documento_identidad as enum ('cedula_frontal', 'cedula_posterior');

create table public.documentos_identidad (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references public.personas(user_id) on delete cascade,
  tipo          tipo_documento_identidad not null,
  -- Ruta dentro del bucket privado "documentos"; nunca una URL pública.
  storage_path  text not null,
  -- Solo los campos extraídos, nunca el documento completo ni datos biométricos.
  ocr_resultado jsonb,
  coincide      boolean,
  creado_en     timestamptz not null default now()
);

create index documentos_identidad_persona_idx on public.documentos_identidad (persona_id);

-- ---------------------------------------------------------------------------
-- Consentimientos — separados por finalidad, nunca un único checkbox genérico.
-- ---------------------------------------------------------------------------

create type tipo_consentimiento as enum (
  'tratamiento_basico',
  'perfil_financiero',
  'conexion_externa',
  'lectura_correo_otp',
  'procesamiento_documentos'
);

-- Append-only: cada fila es un otorgamiento. El vigente por tipo es el más
-- reciente. Así queda trazable qué versión aceptó el usuario y cuándo.
create table public.consentimientos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  tipo         tipo_consentimiento not null,
  version      text not null,
  finalidades  text[] not null default '{}',
  otorgado     boolean not null default true,
  creado_en    timestamptz not null default now()
);

create index consentimientos_user_tipo_idx
  on public.consentimientos (user_id, tipo, creado_en desc);

-- ---------------------------------------------------------------------------
-- Conectores de fuentes externas — máquina de estados simulada.
-- ---------------------------------------------------------------------------

create type estado_conexion as enum (
  'pending',
  'preparing',
  'requires_registration',
  'requires_login',
  'requires_password_recovery',
  'requires_user_action',
  'requires_captcha',
  'requires_otp',
  'processing',
  'extracting',
  'completed',
  'completed_no_data',
  'failed',
  'temporarily_unavailable'
);

create table public.conexiones_fuente (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  -- Clave del catálogo en código (web/src/lib/conectores/catalogo.ts), ej. "dian".
  fuente_id          text not null,
  estado             estado_conexion not null default 'pending',
  -- Índice del guion (web/src/lib/conectores/guiones.ts) donde va esta conexión.
  paso_actual        integer not null default 0,
  mensaje            text,
  -- Qué le falta al usuario cuando el estado es requires_registration /
  -- requires_user_action: campos pedidos y, tras resolverlos, sus valores.
  campo_solicitado   jsonb,
  resultado_resumen  jsonb,
  iniciado_en        timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  completado_en      timestamptz
);

-- Una fuente por usuario: reintentar/reconectar reutiliza la misma fila en
-- vez de acumular históricos (sección 29: "no reiniciar todas las fuentes").
create unique index conexiones_fuente_user_fuente_idx
  on public.conexiones_fuente (user_id, fuente_id);

-- ---------------------------------------------------------------------------
-- Documentos financieros cargados a mano (extractos, capturas) y los
-- hallazgos normalizados que salen de ellos o de los conectores.
-- ---------------------------------------------------------------------------

create type tipo_documento_financiero as enum ('extracto', 'captura');
create type estado_extraccion as enum ('pendiente', 'procesando', 'completado', 'fallido');

create table public.documentos_financieros (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  tipo               tipo_documento_financiero not null,
  storage_path       text not null,
  banco_detectado    text,
  periodo_detectado  text,
  estado_extraccion  estado_extraccion not null default 'pendiente',
  creado_en          timestamptz not null default now()
);

create index documentos_financieros_user_idx on public.documentos_financieros (user_id);

create type tipo_hallazgo as enum (
  'income', 'liability', 'asset', 'property', 'vehicle',
  'credit_report', 'pension', 'tax_profile', 'company', 'fine', 'account'
);

-- declarado = lo dijo el usuario; observado = vino de una fuente/documento;
-- estimado = lo calculó el motor de análisis; confirmado = el usuario lo revisó.
create type procedencia_dato as enum ('declarado', 'observado', 'estimado', 'confirmado');

-- Normalización genérica (sección 17 del pedido): en vez de once tablas
-- (Income, Liability, Asset...) se usa una sola tabla con "tipo" como
-- discriminante y trazabilidad (fuente, procedencia, confianza, periodo)
-- igual a como EstadoFinanciero.calidadDatos ya trackea confianza por fila.
-- Nunca se actualiza in-place con datos contradictorios: cada hallazgo nuevo
-- es una fila nueva (sección 18) — el motor de análisis decide cuál priorizar.
create table public.hallazgos_financieros (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  tipo           tipo_hallazgo not null,
  -- fuente_id del catálogo de conectores, o 'manual' / 'pdf' / 'captura'.
  fuente         text not null,
  procedencia    procedencia_dato not null default 'observado',
  periodo        text,
  datos          jsonb not null,
  confianza      numeric(3,2) not null default 1.0 check (confianza between 0 and 1),
  documento_ref  uuid references public.documentos_financieros(id) on delete set null,
  creado_en      timestamptz not null default now()
);

create index hallazgos_financieros_user_tipo_idx
  on public.hallazgos_financieros (user_id, tipo);

-- ---------------------------------------------------------------------------
-- Storage: bucket privado para cédulas y documentos financieros.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "dueño gestiona sus documentos en storage"
  on storage.objects for all
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- RLS: nadie ve lo que no es suyo
-- ---------------------------------------------------------------------------

alter table public.personas               enable row level security;
alter table public.empresas                enable row level security;
alter table public.documentos_identidad    enable row level security;
alter table public.consentimientos         enable row level security;
alter table public.conexiones_fuente       enable row level security;
alter table public.documentos_financieros  enable row level security;
alter table public.hallazgos_financieros   enable row level security;

create policy "dueño gestiona su persona" on public.personas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus empresas" on public.empresas
  for all using (auth.uid() = persona_id) with check (auth.uid() = persona_id);

create policy "dueño gestiona sus documentos de identidad" on public.documentos_identidad
  for all using (auth.uid() = persona_id) with check (auth.uid() = persona_id);

create policy "dueño gestiona sus consentimientos" on public.consentimientos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus conexiones" on public.conexiones_fuente
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus documentos financieros" on public.documentos_financieros
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dueño gestiona sus hallazgos" on public.hallazgos_financieros
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
