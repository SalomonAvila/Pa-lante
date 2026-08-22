import type { IncomingMessage, ServerResponse } from "node:http";
import { manejarMcp } from "../src/handler";

/**
 * Entry point para Vercel. El archivo se llama `mcp.ts` a propósito: la ruta
 * pública queda en `/mcp`, igual que en local, así el mismo comando de curl y
 * la misma config de Claude Desktop sirven en los dos entornos.
 */
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  await manejarMcp(req, res, req.body);
}
