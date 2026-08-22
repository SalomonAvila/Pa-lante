# Base de datos y capa MCP

## Estructura

```
supabase/
  migrations/   esquema versionado (correr en orden)
  seed.sql      cuenta semilla de prueba (datos ficticios)
  templates/    plantillas de correo de Supabase Auth
```

## Aplicar el esquema

Sin CLI (lo más rápido en hackathon): abrir el **SQL Editor** de Supabase y
pegar el contenido de `migrations/` en orden, y luego `seed.sql`.

Con CLI:

```bash
bunx supabase link --project-ref <tu-ref>
bunx supabase db push
```

## Tablas

| Tabla | Para qué |
|---|---|
| `transacciones` | Movimientos normalizados. `confianza` (0–1) y `hash_dedupe` los llena el parser |
| `deudas` | Saldo y tasa. **No se derivan de transacciones**: el diagnóstico necesita tasa para decidir "deuda de alto costo" |
| `planes` | Plan activo del usuario (uno por usuario) |
| `mcp_tokens` | Tokens de acceso de agentes. Se guarda solo el sha256 |
| `mcp_accesos` | Registro de qué agente leyó qué y cuándo. El usuario lo lee, no lo borra |

Todas con RLS: `auth.uid() = user_id`.

## Probar el MCP sin base de datos

Con `MCP_DEMO_TOKEN` en `.env.local`, el servidor responde con el fixture de
`src/lib/fixtures/estado-ejemplo.ts` sin tocar Postgres:

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer palante_demo_local" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"explicar_diagnostico","arguments":{}}}'
```

Sin token o con token inválido, el endpoint responde **401**.

## Conectarlo a Claude Desktop

```json
{
  "mcpServers": {
    "palante": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp",
               "--header", "Authorization: Bearer palante_demo_local"]
    }
  }
}
```
