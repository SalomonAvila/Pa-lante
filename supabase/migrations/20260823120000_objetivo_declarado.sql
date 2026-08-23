-- Pa'lante — "¿qué quieres lograr con tus finanzas?": el paso de
-- selección del problema que va entre datos personales y la conversación
-- por voz. Deliberadamente separado de ObjetivoAccesoFinanciero/`planes`
-- (que sigue siendo específico de "demostrar_capacidad_arriendo" y no se
-- toca) — esto es la elección más general del usuario, no una vista de
-- divulgación para un tercero.
create table public.objetivo_declarado (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  problema   text not null check (
    problema in ('salir_de_deudas', 'organizar_finanzas', 'meta_ahorro', 'demostrar_capacidad_arriendo')
  ),
  creado_en  timestamptz not null default now()
);

alter table public.objetivo_declarado enable row level security;

create policy "dueño gestiona su objetivo declarado" on public.objetivo_declarado
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
