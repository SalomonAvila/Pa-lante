-- Revierte 20260823120000_objetivo_declarado.sql: una sesión concurrente
-- resolvió "selección del problema" con perfil_conversacional.preferencias
-- (ver /intake/problema, ProblemDiscovery.tsx) antes de que esta tabla se
-- integrara a ningún flujo — se descarta para no dejar dos conceptos
-- paralelos de "qué quiere el usuario".
drop table if exists public.objetivo_declarado;
