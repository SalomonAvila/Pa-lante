-- Pa'lante — consentimientos granulares por fuente (DIAN/DataCrédito), vault
-- de identidad (cifrado de campo + seudonimización HMAC) y nuevos tipos de
-- documento para parsers reales de RUT/Exógena/Declaración/Historia de
-- crédito. Ver el plan "PortalMapper..." — Fase 0.
--
-- Principios que esto hace cumplir (CLAUDE.md + el pedido del usuario):
--   1. Consentimiento separado por finalidad, nunca un checkbox genérico —
--      ahora también separado por fuente externa (DIAN vs. DataCrédito, y
--      "leer mi cuenta" vs. "importar un documento que subo" son cosas
--      distintas).
--   2. Nunca `SHA256(cedula)` a secas para seudonimizar — el espacio de
--      búsqueda de una cédula es pequeño y se puede atacar por fuerza bruta.
--      El hash de identidad se calcula en la app con HMAC-SHA256 y una clave
--      de servidor (`PII_HMAC_KEY`), nunca en SQL.
--   3. Cifrado de campo para lo más sensible de `personas` (número de
--      documento, celular) con clave fuera de la base (`PII_ENCRYPTION_KEY`).

-- ---------------------------------------------------------------------------
-- Consentimientos granulares por fuente
-- ---------------------------------------------------------------------------

alter type tipo_consentimiento add value if not exists 'dian_lectura';
alter type tipo_consentimiento add value if not exists 'datacredito_lectura';
alter type tipo_consentimiento add value if not exists 'dian_documento';
alter type tipo_consentimiento add value if not exists 'datacredito_documento';

-- ---------------------------------------------------------------------------
-- Vault de identidad: columnas cifradas + hash de identidad seudonimizado.
-- Las columnas viejas (numero_documento, celular) se dejan sin tocar por ahora
-- — la app deja de leerlas/escribirlas, no hay datos reales que migrar (el
-- seed no toca `personas`). Se eliminan en una migración de limpieza aparte,
-- una vez que todo consumidor real esté sobre las columnas cifradas.
-- ---------------------------------------------------------------------------

alter table public.personas
  add column if not exists numero_documento_cifrado text,
  add column if not exists celular_cifrado          text,
  add column if not exists external_identity_hash    text;

-- Reemplaza el índice único sobre el número de documento en claro por uno
-- sobre el hash seudonimizado — misma garantía de "una cuenta por cédula",
-- sin exponer la cédula en un índice legible.
drop index if exists public.personas_documento_idx;

create unique index if not exists personas_identity_hash_idx
  on public.personas (tipo_documento, external_identity_hash)
  where external_identity_hash is not null;

-- ---------------------------------------------------------------------------
-- Documentos DIAN/DataCrédito subidos a mano (fallback universal — sección 17
-- del pedido) + hash del archivo para trazabilidad (sección 7).
-- ---------------------------------------------------------------------------

alter type tipo_documento_financiero add value if not exists 'rut';
alter type tipo_documento_financiero add value if not exists 'exogena';
alter type tipo_documento_financiero add value if not exists 'declaracion_renta';
alter type tipo_documento_financiero add value if not exists 'historia_credito';

alter table public.documentos_financieros
  add column if not exists hash_documento text;
