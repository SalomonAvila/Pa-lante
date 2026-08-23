import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buscarConocimiento } from "@web/lib/inteligencia/rag/busqueda";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Busca en el conocimiento documental curado de Pa'lante (regulación colombiana, definiciones de " +
  "tasas, cómo funciona el sistema financiero). Solo para conocimiento documental, nunca para datos " +
  "propios del usuario — esos vienen de las otras tools.";

const InputSchema = { consulta: z.string().describe("Qué se quiere saber, en lenguaje natural.") };

export function registrarBuscarConocimiento(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "buscar_conocimiento_financiero",
    { title: "Buscar conocimiento financiero", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ consulta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await buscarConocimiento(inteligenciaCtx.supabase, consulta);
      await registrarAcceso(ctx, "buscar_conocimiento_financiero", { consulta });

      if (!resultado.disponible) {
        return { content: [{ type: "text" as const, text: "RAG no disponible: falta configurar VOYAGE_API_KEY en el servidor." }] };
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado.resultados, null, 2) }] };
    },
  );
}
