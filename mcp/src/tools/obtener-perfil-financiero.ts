import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ENTRADA_DANIELA } from "@web/lib/perfil/fixtures/daniela";
import { construirPerfilFinanciero } from "@web/lib/perfil/perfil-financiero";
import { obtenerPerfilFinanciero } from "@web/lib/perfil/obtener-perfil";
import type { PerfilFinancieroV1 } from "@web/types/finance";
import {
  clienteServicioMcp,
  registrarAcceso,
  type ContextoMcp,
} from "../lib/auth.js";

const NOMBRE_HERRAMIENTA = "obtener_perfil_financiero";

const DESCRIPCION =
  "Devuelve el perfil financiero normalizado del usuario: periodo observado, " +
  "ingresos declarados y verificados, flujo, obligaciones, patrimonio, " +
  "cobertura por fuente y calidad de datos. Cada cifra viene con su unidad, " +
  "su explicación y las referencias de evidencia que la respaldan. " +
  "Es contexto general, no una recomendación: úsalo como insumo para razonar, " +
  "y revisa siempre 'cobertura' y 'calidadDatos' antes de concluir — si la " +
  "completitud es baja o hay advertencias, dilo explícitamente en vez de " +
  "rellenar los huecos. Pa'lante no da asesoría financiera ni de inversión.";

export function registrarObtenerPerfilFinanciero(
  server: McpServer,
  ctx: ContextoMcp,
) {
  server.registerTool(
    NOMBRE_HERRAMIENTA,
    {
      title: "Obtener perfil financiero",
      description: DESCRIPCION,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const perfil = await obtenerPerfilMcp(ctx);
        await registrarAcceso(ctx, NOMBRE_HERRAMIENTA, null);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  perfil,
                  nota: ctx.demo
                    ? "Datos ficticios de Daniela para demostración."
                    : undefined,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        await registrarAcceso(ctx, NOMBRE_HERRAMIENTA, null, false);
        const mensaje =
          error instanceof Error
            ? error.message
            : "Error desconocido al construir el perfil";
        return {
          isError: true,
          content: [{ type: "text" as const, text: mensaje }],
        };
      }
    },
  );
}

export async function obtenerPerfilMcp(
  ctx: ContextoMcp,
): Promise<PerfilFinancieroV1> {
  if (ctx.demo) return construirPerfilFinanciero(ENTRADA_DANIELA);

  const supabase = clienteServicioMcp();
  if (!supabase) {
    throw new Error("El servidor MCP no tiene configurada la conexión a Supabase.");
  }

  // La clave de servicio omite RLS: obtenerPerfilFinanciero aplica user_id en
  // cada consulta y ctx.userId viene del Bearer token ya validado.
  const { perfil } = await obtenerPerfilFinanciero(supabase, ctx.userId);
  return perfil;
}
