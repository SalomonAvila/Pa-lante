import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { obtenerPlanActivo } from "@web/lib/inteligencia/datos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION = "Devuelve el plan financiero activo del usuario (meta, aporte mensual, pasos, supuestos, fecha objetivo), si tiene uno.";

export function registrarObtenerPlan(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "obtener_plan",
    { title: "Obtener plan financiero", description: DESCRIPCION, annotations: { readOnlyHint: true } },
    async () => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const plan = await obtenerPlanActivo(inteligenciaCtx);
      await registrarAcceso(ctx, "obtener_plan", null);

      return {
        content: [
          {
            type: "text" as const,
            text: plan ? JSON.stringify(plan, null, 2) : "El usuario no tiene un plan activo todavía.",
          },
        ],
      };
    },
  );
}
