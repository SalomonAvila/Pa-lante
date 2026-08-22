import { createServer } from "node:http";
import { manejarMcp } from "./handler.js";

/**
 * Servidor MCP de Pa'lante para desarrollo local y para cualquier plataforma
 * que corra un proceso largo (Render, Fly, una VM). En Vercel el entry point
 * es `api/mcp.ts`, que reusa el mismo handler.
 */
const PUERTO = Number(process.env.MCP_PORT ?? 3333);

const servidorHttp = createServer(async (req, res) => {
  if (req.url !== "/mcp") {
    res.writeHead(404).end("No encontrado");
    return;
  }
  await manejarMcp(req, res);
});

servidorHttp.listen(PUERTO, () => {
  console.log(`[palante-mcp] escuchando en http://localhost:${PUERTO}/mcp`);
  if (process.env.MCP_DEMO_TOKEN) {
    console.log(
      "[palante-mcp] MCP_DEMO_TOKEN activo — responde con el fixture, sin tocar Postgres.",
    );
  }
});
