import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { obtenerEstado } from "../lib/estado.js";
import { diagnosticar, UMBRALES, formatearCOP } from "../lib/reglas.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Devuelve la ruta financiera del usuario (salida-de-deudas, visibilidad o " +
  "meta-de-ahorro) junto con las reglas explícitas que la determinaron, el " +
  "umbral de cada una y el valor observado. Úsala para explicar POR QUÉ el " +
  "usuario está en esa ruta: no inventes razones, cita las reglas que devuelve " +
  "esta herramienta. Revisa siempre 'advertencias' y 'calidad_datos' antes de " +
  "concluir: si hay mucho gasto sin categorizar o poca historia, dilo. " +
  "Pa'lante organiza, diagnostica y hace seguimiento; no da asesoría de inversión.";

export function registrarExplicarDiagnostico(
  server: McpServer,
  ctx: ContextoMcp,
) {
  server.registerTool(
    "explicar_diagnostico",
    {
      title: "Explicar diagnóstico financiero",
      description: DESCRIPCION,
      annotations: { readOnlyHint: true },
    },
    async () => {
      const estado = await obtenerEstado(ctx);
      const diagnostico = diagnosticar(estado);

      await registrarAcceso(ctx, "explicar_diagnostico", null);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ruta: diagnostico.ruta,
                razon: diagnostico.razon,
                reglas: diagnostico.reglas,
                advertencias: diagnostico.advertencias,
                umbrales: UMBRALES,
                periodo: estado.periodo,
                calidad_datos: estado.calidadDatos,
                resumen: {
                  ingreso_mensual: formatearCOP(estado.ingresoMensual),
                  gasto_mensual: formatearCOP(estado.gastoMensual),
                  flujo_neto: formatearCOP(estado.flujoNeto),
                },
                nota: ctx.demo
                  ? "Datos de la cuenta semilla de prueba, no son reales."
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
