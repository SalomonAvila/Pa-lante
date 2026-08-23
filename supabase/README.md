# Base de datos

El servidor MCP que consume estas tablas vive en `mcp/` (paquete aparte, ver
`CLAUDE.md` → Estructura de carpetas).

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

Lista autoritativa: `migrations/*.sql` (cada tabla nace en la migración que la creó). Agrupadas por para qué sirven:

| Grupo | Tablas | Para qué |
|---|---|---|
| Núcleo financiero | `transacciones`, `deudas`, `hallazgos_financieros`, `planes` | `transacciones`/`deudas` son el diagnóstico por reglas original; `hallazgos_financieros` es el ledger genérico y trazable que alimenta `PerfilFinancieroV1` — nunca sobrescribe un dato contradictorio de otra fuente |
| Identidad y consentimiento | `personas`, `empresas`, `documentos_identidad`, `consentimientos`, `contacto_basico` | `consentimientos` es append-only, un tipo por finalidad y por fuente — nunca un checkbox único |
| Extracción | `conexiones_fuente`, `documentos_financieros`, `documentos_conocimiento`, `documentos_conocimiento_chunks` | Estado de cada fuente externa conectada, documentos subidos a mano, y el RAG de conocimiento curado (pgvector) |
| Capa conversacional (demo) | `conversaciones`, `mensajes`, `perfil_conversacional`, `analisis`, `perfiles_financieros_generados` | `analisis` es la auditoría de cada consulta a un experto (quién preguntó, qué fuentes, qué confianza) |
| Distribución MCP | `mcp_tokens`, `mcp_accesos` | Solo se guarda el sha256 del token; `mcp_accesos` es lo que el usuario lee para ver quién accedió a su contexto y revocarlo |

Todas con RLS: `auth.uid() = user_id` (el servidor MCP filtra explícitamente por `user_id` en vez de depender de RLS, porque un agente llama sin sesión de navegador — ver `mcp/src/lib/auth.ts`).

## Probar el MCP sin base de datos

Con `MCP_DEMO_TOKEN` en `.env.local`, el servidor responde con el fixture de
`mcp/src/fixtures/estado-ejemplo.ts` sin tocar Postgres:

```bash
bun run mcp:dev
```

```bash
curl -s -X POST http://localhost:3333/mcp \
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
      "args": ["-y", "mcp-remote", "http://localhost:3333/mcp",
               "--header", "Authorization: Bearer palante_demo_local"]
    }
  }
}
```
