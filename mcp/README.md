# mcp/ — Servidor MCP de Pa'lante

Expone el perfil financiero normalizado del usuario como *tools* consumibles por agentes de IA externos, con permiso explícito del dueño de los datos. Sin UI — es infraestructura pura para el track **Access**.

Arquitectura completa, decisiones y restricciones: [`../CLAUDE.md`](../CLAUDE.md).

## Cómo se autentica un agente

Bearer token propio (no OAuth 2.1 — decisión de hackathon). El token se genera desde el portal web (`/portal`), se muestra **una sola vez** en claro y se guarda hasheado (sha256) en `mcp_tokens`. Cada llamada queda registrada en `mcp_accesos`, así el dueño ve quién leyó su contexto y puede revocarlo.

```bash
curl -s -X POST http://localhost:3333/mcp \
  -H "Authorization: Bearer <tu-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Sin token o con token inválido: **401**. Con `MCP_DEMO_TOKEN` configurado, el servidor responde contra un fixture (`src/fixtures/estado-ejemplo.ts`) sin tocar Postgres — útil para probar sin base de datos, quitar en producción.

## Correr en local

```bash
bun install
cp ../.env.example .env.local
bun run dev     # proceso largo en :3333 (o MCP_PORT)
```

## Dos entry points, un solo handler

`src/handler.ts` es la lógica única. `src/index.ts` levanta el proceso largo de arriba (local, Render, cualquier VM); `api/mcp.ts` es la función serverless que usa el deploy en Vercel — ambos exponen la misma ruta pública `/mcp` (`vercel.json` reescribe `/mcp` → `/api/mcp`), así que el mismo curl y la misma config de Claude Desktop sirven para los dos. **Se despliega como proyecto de Vercel aparte** (Root Directory `mcp`).

## Tools

`src/tools/` — cada archivo es una tool. Van desde diagnóstico agregado (`obtener_contexto_financiero`, `explicar_diagnostico`, `obtener_perfil_financiero`) hasta la interpretación calibrada de un experto puntual (crédito, tributario, riesgo, hipotecario, portafolio, acción, flujo de caja) para que un agente externo reciba el mismo criterio que el chat propio de la web, no un volcado de JSON crudo.

Los tipos que consumen (`Transaccion`, `Deuda`, `PerfilFinancieroV1`, ...) no se duplican: `tsconfig.json` mapea `@web/*` a `web/src/*`, así que `web/src/types/finance.ts` es la única fuente de verdad para ambos frentes.

## Conectarlo a Claude Desktop

```json
{
  "mcpServers": {
    "palante": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3333/mcp",
               "--header", "Authorization: Bearer <tu-token>"]
    }
  }
}
```
