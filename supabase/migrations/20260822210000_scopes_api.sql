-- Scopes por token y renombrado de la bitácora para reflejar que ya no
-- registra solo llamadas MCP, sino también las de la API REST.

-- Hasta ahora un token leía todo. Un token debe poder emitirse acotado: es la
-- diferencia entre "le di acceso a mi agente" y "le di acceso a todo".
alter table public.mcp_tokens
  add column if not exists scopes text[] not null default array['perfil:leer'];

-- Vencimiento opcional. Un token de una integración puntual no debería vivir
-- para siempre.
alter table public.mcp_tokens
  add column if not exists expira_en timestamptz;

-- Distinguir por dónde entró cada acceso, para poder mostrárselo al usuario.
alter table public.mcp_accesos
  add column if not exists canal text not null default 'mcp'
    check (canal in ('mcp', 'api'));

alter table public.mcp_accesos
  add column if not exists scope_usado text;

comment on column public.mcp_tokens.scopes is
  'Permisos del token. perfil:leer, hallazgos:leer, cobertura:leer, prueba:generar, exportar.';
