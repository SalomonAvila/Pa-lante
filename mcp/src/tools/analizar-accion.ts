import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { consultarExperto } from "@web/lib/inteligencia/registro-expertos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Investiga una empresa/acción con datos de mercado verificables (precios, fundamentales, " +
  "volumen). Nunca produce 'compra/vende' — construye evidencia → análisis → riesgo → escenarios. " +
  "Responde honestamente si no hay un proveedor de datos de mercado conectado.";

const InputSchema = { pregunta: z.string().describe("La empresa o ticker a analizar, en lenguaje natural.") };

export function registrarAnalizarAccion(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "analizar_accion",
    { title: "Analizar acción", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ pregunta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await consultarExperto(inteligenciaCtx, "acciones", pregunta);
      await registrarAcceso(ctx, "analizar_accion", { pregunta });

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
    },
  );
}
