import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ENTRADA_DANIELA } from "@web/lib/perfil/fixtures/daniela";
import {
  construirPerfilFinanciero,
  crearPruebaCapacidadPago,
} from "@web/lib/perfil/perfil-financiero";
import { obtenerPerfilFinanciero } from "@web/lib/perfil/obtener-perfil";
import {
  clienteServicioMcp,
  registrarAcceso,
  type ContextoMcp,
} from "../lib/auth.js";

const NOMBRE_HERRAMIENTA = "obtener_prueba_capacidad_pago";

const DESCRIPCION =
  "Devuelve una prueba financiera mínima para evaluar contexto de un arriendo: " +
  "ingreso mensual verificado, porcentaje del ingreso declarado respaldado, " +
  "variación del ingreso, carga financiera, relación canon/ingreso, vigencia y " +
  "calidad de datos. No devuelve transacciones, comercios, cuentas, documentos " +
  "ni evidencia identificable. Esta prueba NO aprueba ni rechaza una solicitud: " +
  "la entidad receptora conserva sus propias reglas. Si estado_preparacion no es " +
  "listo_para_compartir, explica qué falta y no concluyas capacidad de pago.";

export function registrarObtenerPruebaCapacidadPago(
  server: McpServer,
  ctx: ContextoMcp,
) {
  server.registerTool(
    NOMBRE_HERRAMIENTA,
    {
      title: "Obtener prueba de capacidad de pago",
      description: DESCRIPCION,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const prueba = await obtenerPruebaCapacidadPagoMcp(ctx);
        await registrarAcceso(ctx, NOMBRE_HERRAMIENTA, {
          proposito: "evaluar_capacidad_arriendo",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  prueba,
                  limites: [
                    "No constituye aprobación ni recomendación crediticia.",
                    "No contiene transacciones ni documentos personales.",
                  ],
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
        await registrarAcceso(
          ctx,
          NOMBRE_HERRAMIENTA,
          { proposito: "evaluar_capacidad_arriendo" },
          false,
        );
        const mensaje =
          error instanceof Error ? error.message : "Error desconocido al construir la prueba";
        return {
          isError: true,
          content: [{ type: "text" as const, text: mensaje }],
        };
      }
    },
  );
}

export async function obtenerPruebaCapacidadPagoMcp(ctx: ContextoMcp) {
  if (ctx.demo) {
    return crearPruebaCapacidadPago(construirPerfilFinanciero(ENTRADA_DANIELA));
  }

  const supabase = clienteServicioMcp();
  if (!supabase) {
    throw new Error("El servidor MCP no tiene configurada la conexión a Supabase.");
  }

  // La clave de servicio omite RLS: obtenerPerfilFinanciero aplica user_id en
  // cada consulta y ctx.userId viene del Bearer token ya validado.
  const perfil = await obtenerPerfilFinanciero(supabase, ctx.userId);
  return crearPruebaCapacidadPago(perfil);
}
