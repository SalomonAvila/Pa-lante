import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { autenticar } from "@mcp/lib/auth";
import { construirServidor } from "@mcp/server";

const PUERTO = Number(process.env.MCP_PORT ?? 3333);

/**
 * Entry point para desarrollo local. En Vercel el mismo servidor corre como
 * función serverless en mcp/api/mcp.ts — este archivo no se usa ahí, porque
 * Vercel nunca ejecuta un http.Server con .listen().
 */
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
