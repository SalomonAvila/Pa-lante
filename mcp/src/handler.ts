import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { autenticar, type ContextoMcp } from "@mcp/lib/auth";
import { registrarExplicarDiagnostico } from "@mcp/tools/explicar-diagnostico";

/**
 * Cada sesión se construye con el contexto del usuario ya resuelto desde el
 * Bearer token, así que las tools nunca tienen que preguntarse de quién son
 * los datos que están leyendo.
 */
function construirServidor(ctx: ContextoMcp): McpServer {
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

/**
 * Maneja una petición MCP. Sirve igual al servidor local (`src/index.ts`) que
 * a una función serverless (`api/mcp.ts`), por eso no decide rutas ni puertos.
 *
 * `parsedBody` existe porque las plataformas serverless ya parsean el cuerpo
 * antes de entregarlo: si no se lo pasamos, el transporte intenta leer un
 * stream que ya fue consumido y la petición se cuelga.
 */
export async function manejarMcp(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody?: unknown,
): Promise<void> {
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

  // Modo sin estado: cada request trae su propio token y se atiende sola, con
  // su propio servidor. Evita estado compartido entre usuarios y es lo que
  // hace que esto funcione igual en un proceso largo que en serverless.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    void transport.close();
  });

  const server = construirServidor(ctx);
  await server.connect(transport);
  await transport.handleRequest(req, res, parsedBody);
}
