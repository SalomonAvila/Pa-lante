import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { consultarExperto } from "@web/lib/inteligencia/registro-expertos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Proyecta el flujo neto de los próximos meses a partir SOLO de la historia de transacciones " +
  "propia del usuario (regresión lineal simple, sin caja negra). Antes de proyectar corre un " +
  "Data Sufficiency Gate: si no hay suficiente historia o calidad de datos, se niega a proyectar " +
  "y explica qué falta en vez de inventar una cifra. Nunca proyecta precios de activos ni mercados.";

const InputSchema = { pregunta: z.string().optional().describe("Pregunta específica (opcional).") };

export function registrarProyectarFlujoCaja(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "proyectar_flujo_caja",
    { title: "Proyectar flujo de caja", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ pregunta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await consultarExperto(inteligenciaCtx, "proyeccion", pregunta ?? "¿Cómo se ve mi flujo de caja en los próximos meses?");
      await registrarAcceso(ctx, "proyectar_flujo_caja", { pregunta });

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
    },
  );
}
