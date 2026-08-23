# web/ — Pa'lante (web app)

Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth + Postgres + Storage). Dueño de los datos: donde una persona conecta sus fuentes, ve su cobertura y administra quién accede a su contexto financiero.

Arquitectura completa, decisiones y restricciones: [`../CLAUDE.md`](../CLAUDE.md).

## Correr en local

```bash
bun install
cp ../.env.example .env.local   # completar credenciales (ver comentarios ahí)
bun run dev                     # http://localhost:3000
```

`bun test` corre los tests unitarios (`bun run --cwd .. test` desde la raíz también funciona).

## Rutas principales

| Ruta | Qué es |
|---|---|
| `/` | Landing |
| `/login` | Google OAuth (pide `gmail.readonly` en el mismo consent), enlace mágico o correo+contraseña |
| `/intake` → `/intake/problema` → `/intake/progreso` | Onboarding conversacional por voz (ElevenLabs): datos personales → objetivo → conversación → archivos → integraciones → resumen → perfil generado |
| `/portal` | Consola del usuario: cobertura, fuentes conectadas, accesos MCP |
| `/asistente` | Chat propio sobre la capa de expertos (streaming SSE) |
| `/api/v1/*` | API REST con scopes por token — el mismo contrato que consume el servidor MCP |

## Estructura

```
src/
  app/            rutas (App Router) + endpoints /api
  components/     UI reutilizable
  lib/
    conectores/       fuentes externas simuladas (state machine por conexión)
    documentos/       parsers reales (DIAN, DataCrédito) + extractor mock genérico
    inteligencia/      capa de expertos conversacional — demo sobre el MCP, no el núcleo
    perfil/            construcción y normalización de PerfilFinancieroV1
    seguridad/         vault de identidad (cifrado + hash seudonimizado)
    supabase/          clientes (browser/server) y helpers de sesión
  types/finance.ts  contratos congelados que comparten los tres frentes (web/mcp/consumidores)
```

## Convenciones

- TypeScript estricto, sin `any` sin justificar.
- Solo Tailwind — nada de CSS inline salvo casos puntuales.
- `service_role` de Supabase únicamente en código de servidor (nunca en un componente cliente).
