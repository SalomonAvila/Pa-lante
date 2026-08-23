import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { obtenerTransacciones } from "@web/lib/inteligencia/datos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Búsqueda cruda de transacciones del usuario, con filtros opcionales por rango de fechas, " +
  "categoría o comercio. Devuelve movimientos individuales, no un análisis — para interpretación " +
  "usa el experto de presupuesto o de flujo de caja.";

const InputSchema = {
  desde: z.string().optional().describe("Fecha inicial YYYY-MM-DD (inclusive)."),
  hasta: z.string().optional().describe("Fecha final YYYY-MM-DD (inclusive)."),
  categoria: z.string().optional().describe("Filtrar por categoría exacta, ej. 'mercado'."),
  comercio: z.string().optional().describe("Filtrar por comercio normalizado (contiene, sin distinguir mayúsculas)."),
};

export function registrarBuscarTransacciones(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "buscar_transacciones",
    { title: "Buscar transacciones", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ desde, hasta, categoria, comercio }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const todas = await obtenerTransacciones(inteligenciaCtx);
      const filtradas = todas.filter((t) => {
        if (desde && t.fecha < desde) return false;
        if (hasta && t.fecha > hasta) return false;
        if (categoria && t.categoria !== categoria) return false;
        if (comercio && !t.comercioNorm.toLowerCase().includes(comercio.toLowerCase())) return false;
        return true;
      });

      await registrarAcceso(ctx, "buscar_transacciones", { desde, hasta, categoria, comercio });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ total: filtradas.length, transacciones: filtradas }, null, 2) }],
      };
    },
  );
}
