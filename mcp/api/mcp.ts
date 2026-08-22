import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { autenticar } from "../src/lib/auth";
import { construirServidor } from "../src/server";

// Función serverless de Node en Vercel. No usar runtime "edge": el SDK de
// MCP y el cliente de Supabase dependen de APIs de Node (node:crypto, etc.).
export const config = { runtime: "nodejs" };

/**
 * Equivalente en Vercel de mcp/src/index.ts. Vercel no ejecuta un
 * http.Server con .listen(); invoca este handler por request bajo
 * /api/mcp. vercel.json reescribe /mcp -> /api/mcp para que la URL pública
 * sea la misma que en desarrollo local.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const ctx = await autenticar(req.headers.authorization ?? null);
  if (!ctx) {
    res
      .writeHead(401, {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="palante"',
      })
      .end(
        JSON.stringify({
          error: "unauthorized",
          mensaje:
            "Falta un token de Pa'lante válido. Genera uno desde tu cuenta.",
        }),
      );
    return;
  }

  // Modo sin estado: cada request trae su propio token y se atiende sola,
  // con su propio servidor — el mismo diseño que el entry point local, y el
  // que necesita una función serverless (sin proceso persistente entre
  // requests que pueda guardar sesiones).
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    void transport.close();
  });

  const server = construirServidor(ctx);
  await server.connect(transport);
  await transport.handleRequest(req, res);
}
