import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ContextoMcp } from "@mcp/lib/auth";
import { registrarExplicarDiagnostico } from "@mcp/tools/explicar-diagnostico";

/**
 * Construye un servidor MCP nuevo para una sola request, ya con el contexto
 * del usuario resuelto. La comparten el entry point local (mcp/src/index.ts,
 * un http.Server de toda la vida) y la función serverless de Vercel
 * (mcp/api/mcp.ts) — el runtime cambia, esta pieza no.
 */
export function construirServidor(ctx: ContextoMcp): McpServer {
  const server = new McpServer(
    { name: "palante", version: "0.1.0" },
    {
      instructions:
        "Contexto financiero normalizado de un usuario de Pa'lante " +
        "(transacciones de bancos colombianos, deudas y plan). Las cifras " +
        "están en pesos colombianos. Pa'lante diagnostica y organiza; no da " +
        "asesoría de inversión, así que no formules recomendaciones de " +
        "inversión como si vinieran de esta fuente.",
    },
  );

  registrarExplicarDiagnostico(server, ctx);
  return server;
}
