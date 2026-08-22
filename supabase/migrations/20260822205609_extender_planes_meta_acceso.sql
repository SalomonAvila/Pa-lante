-- Mantiene la descripción legible en `meta` y agrega un discriminante +
-- payload estructurado para que web/MCP no tengan que interpretar lenguaje
-- natural cada vez que calculan el perfil. Las filas existentes siguen siendo
-- válidas porque `tipo_meta` es nullable y `datos_meta` inicia vacío.
alter table public.planes
  add column tipo_meta text,
  add column datos_meta jsonb not null default '{}'::jsonb,
  add constraint planes_tipo_meta_check
    check (tipo_meta is null or tipo_meta in ('demostrar_capacidad_arriendo')),
  add constraint planes_datos_meta_objeto_check
    check (jsonb_typeof(datos_meta) = 'object');

comment on column public.planes.tipo_meta is
  'Discriminante de la meta para calcularla sin interpretar planes.meta.';

comment on column public.planes.datos_meta is
  'Parámetros estructurados de la meta; nunca contiene extractos ni transacciones crudas.';
