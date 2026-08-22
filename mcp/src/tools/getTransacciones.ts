import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServiceClient } from "../lib/supabase.js";

export function registerGetTransacciones(server: McpServer) {
  server.registerTool(
    "get_transacciones",
    {
      title: "Obtener transacciones",
      description:
        "Devuelve las transacciones normalizadas de un usuario autenticado del contexto financiero.",
      inputSchema: {
        usuario_id: z.string().describe("ID del usuario en Supabase"),
        limite: z.number().int().positive().max(500).default(100),
      },
    },
    async ({ usuario_id, limite }) => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("transacciones")
        .select("*")
        .eq("usuario_id", usuario_id)
        .order("fecha", { ascending: false })
        .limit(limite);

      if (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
