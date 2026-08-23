import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { consultarExperto } from "@web/lib/inteligencia/registro-expertos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Riesgo de sobreendeudamiento del usuario: combina deuda, crédito y (si está disponible) " +
  "información tributaria. Es riesgo de sobreendeudamiento del propio usuario, NUNCA riesgo de " +
  "mercado o de una inversión — Pa'lante no evalúa activos.";

const InputSchema = { pregunta: z.string().optional().describe("Pregunta específica (opcional).") };

export function registrarCalcularRiesgo(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "calcular_riesgo_sobreendeudamiento",
    { title: "Calcular riesgo de sobreendeudamiento", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ pregunta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await consultarExperto(inteligenciaCtx, "riesgo", pregunta ?? "¿Qué tan expuesto está el usuario a sobreendeudarse?");
      await registrarAcceso(ctx, "calcular_riesgo_sobreendeudamiento", { pregunta });

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
    },
  );
}
