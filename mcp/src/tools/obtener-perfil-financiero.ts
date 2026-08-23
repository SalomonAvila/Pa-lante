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
): Promise<PerfilFinancieroV1 | Record<string, unknown>> {
  if (ctx.demo) return construirPerfilFinanciero(ENTRADA_DANIELA);

  const supabase = clienteServicioMcp();
  if (!supabase) {
    throw new Error("El servidor MCP no tiene configurada la conexión a Supabase.");
  }

  const { data: generado } = await supabase
    .from("perfiles_financieros_generados")
    .select("datos")
    .eq("user_id", ctx.userId)
    .order("generado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (generado?.datos && (generado.datos as { version?: string }).version === "1.1") {
    return filtrarGenerado(generado.datos as Record<string, unknown>, ctx.scopes);
  }

  // La clave de servicio omite RLS: obtenerPerfilFinanciero aplica user_id en
  // cada consulta y ctx.userId viene del Bearer token ya validado.
  const { perfil } = await obtenerPerfilFinanciero(supabase, ctx.userId);
  return filtrarBase(perfil, ctx.scopes);
}

function permitido(scopes: string[], scope: string) {
  return scopes.includes("perfil:leer") || scopes.includes(scope);
}

function filtrarGenerado(perfil: Record<string, unknown>, scopes: string[]) {
  if (scopes.includes("perfil:leer")) return perfil;
  const salida: Record<string, unknown> = { version: perfil.version, generadoEn: perfil.generadoEn, generadoPor: perfil.generadoPor };
  if (permitido(scopes, "perfil:identidad")) salida.identidad = perfil.identidad;
  if (permitido(scopes, "perfil:objetivo")) salida.problema = perfil.problema;
  const narrativaOriginal = (perfil.narrativa ?? {}) as Record<string, unknown>;
  const narrativa: Record<string, unknown> = {};
  if (permitido(scopes, "perfil:resumen")) Object.assign(narrativa, { resumenEjecutivo: narrativaOriginal.resumenEjecutivo, fortalezas: narrativaOriginal.fortalezas, alertas: narrativaOriginal.alertas });
  if (permitido(scopes, "perfil:objetivo")) narrativa.lecturaObjetivo = narrativaOriginal.lecturaObjetivo;
  if (permitido(scopes, "perfil:acciones")) Object.assign(narrativa, { prioridades: narrativaOriginal.prioridades, preguntasPendientes: narrativaOriginal.preguntasPendientes, limites: narrativaOriginal.limites });
  if (Object.keys(narrativa).length) salida.narrativa = narrativa;
  const base = filtrarBase((perfil.perfilBase ?? {}) as PerfilFinancieroV1, scopes);
  if (Object.keys(base).length > 2) salida.perfilBase = base;
  if (permitido(scopes, "perfil:calidad")) salida.contexto = perfil.contexto;
  return salida;
}

function filtrarBase(perfil: PerfilFinancieroV1, scopes: string[]): Record<string, unknown> {
  if (scopes.includes("perfil:leer")) return perfil as unknown as Record<string, unknown>;
  const salida: Record<string, unknown> = { version: perfil.version, generadoEn: perfil.generadoEn };
  if (permitido(scopes, "perfil:ingresos")) salida.ingresos = perfil.ingresos;
  if (permitido(scopes, "perfil:flujo")) salida.flujo = perfil.flujo;
  if (permitido(scopes, "perfil:obligaciones")) salida.obligaciones = perfil.obligaciones;
  if (permitido(scopes, "perfil:patrimonio")) salida.patrimonio = perfil.patrimonio;
  if (permitido(scopes, "perfil:calidad")) Object.assign(salida, { periodo: perfil.periodo, cobertura: perfil.cobertura, calidadDatos: perfil.calidadDatos });
  return salida;
}
