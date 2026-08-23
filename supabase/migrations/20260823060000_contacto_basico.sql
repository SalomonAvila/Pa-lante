-- Pa'lante — datos de contacto mínimos, capturados apenas el usuario entra
-- a /intake logueado, antes de la conversación por voz. Deliberadamente NO
-- es el KYC completo de `personas` (documento, dirección, fecha de
-- nacimiento…): eso se pide más adelante cuando haga falta para una
-- integración concreta (DIAN, DataCrédito). Acá solo lo mínimo para poder
-- identificar y contactar al usuario mientras arma su perfil.
create table public.contacto_basico (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  celular     text not null,
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.contacto_basico enable row level security;

create policy "dueño gestiona su contacto básico" on public.contacto_basico
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
