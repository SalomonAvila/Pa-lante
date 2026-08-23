-- Pa'lante — dos cosas que pide el flujo post-voz de /intake:
--
-- 1. "Cualquier formato" de archivo adjunto sin analizarlo todavía: el
--    enum tipo_documento_financiero solo tenía extracto/captura, agrego
--    'otro' para lo que no encaja ahí. estado_extraccion se queda en
--    'pendiente' — nada dispara el extractor al subir.
--
-- 2. Un lugar para GUARDAR el perfil financiero generado (hoy
--    PerfilFinancieroV1 se calcula al vuelo cada vez, nunca se persiste).
--    Append-only, como hallazgos_financieros: cada generación es una fila
--    nueva, nunca se sobrescribe la anterior.

alter type public.tipo_documento_financiero add value if not exists 'otro';

create table public.perfiles_financieros_generados (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  version      text not null default '1.0',
  datos        jsonb not null,
  generado_en  timestamptz not null default now()
);

create index perfiles_financieros_generados_user_idx
  on public.perfiles_financieros_generados (user_id, generado_en desc);

alter table public.perfiles_financieros_generados enable row level security;

create policy "dueño gestiona sus perfiles generados" on public.perfiles_financieros_generados
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
