import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { obtenerPanorama } from "@web/lib/perfil/normalizacion";
import { obtenerEstado } from "../lib/estado.js";
import { construirContextoInteligencia } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Devuelve el contexto financiero normalizado del usuario: estado agregado (ingreso/gasto " +
  "mensual, flujo neto, gasto por categoría) y el panorama completo (patrimonio neto, deuda " +
  "total, liquidez, nivel de endeudamiento) con la procedencia de cada cifra. Es la foto general " +
  "— para detalle crediticio o tributario usa las tools específicas.";

export function registrarObtenerContextoFinanciero(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "obtener_contexto_financiero",
    { title: "Obtener contexto financiero", description: DESCRIPCION, annotations: { readOnlyHint: true } },
    async () => {
      const estado = await obtenerEstado(ctx);
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      const panorama = inteligenciaCtx ? await obtenerPanorama(inteligenciaCtx.supabase, inteligenciaCtx.userId) : null;

      await registrarAcceso(ctx, "obtener_contexto_financiero", null);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                estado,
                panorama,
                nota: ctx.demo
                  ? "Datos de la cuenta semilla de prueba (fixture), no son reales. El panorama detallado no está disponible en modo demo."
                  : undefined,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
