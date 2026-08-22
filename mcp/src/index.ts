import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { autenticar, type ContextoMcp } from "@mcp/lib/auth";
import { registrarExplicarDiagnostico } from "@mcp/tools/explicar-diagnostico";

const PUERTO = Number(process.env.MCP_PORT ?? 3333);

/**
 * Servidor MCP de Pa'lante. Producto separado de la web app (comparten el
 * modelo de datos, no el entry point).
 *
 * Cada sesión se crea con el contexto del usuario ya resuelto desde el Bearer
 * token, así que las tools nunca tienen que preguntarse de quién son los datos
 * que están leyendo.
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

const servidorHttp = createServer(async (req, res) => {
  if (req.url !== "/mcp") {
    res.writeHead(404).end("No encontrado");
    return;
  }

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
  // su propio servidor. Evita estado compartido entre usuarios y hace que el
  // servidor sea trivial de escalar horizontalmente.
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
});

servidorHttp.listen(PUERTO, () => {
  console.log(`[palante-mcp] escuchando en http://localhost:${PUERTO}/mcp`);
  if (process.env.MCP_DEMO_TOKEN) {
    console.log("[palante-mcp] MCP_DEMO_TOKEN activo — responde con el fixture, sin tocar Postgres.");
  }
});
