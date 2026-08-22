import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { autenticar, registrarAcceso, type ContextoMcp } from "@/lib/mcp/auth";
import { obtenerEstado } from "@/lib/mcp/estado";
import { diagnosticar, UMBRALES, formatearCOP } from "@/lib/diagnostico/reglas";

/**
 * El contexto autenticado lo pone withMcpAuth y el SDK lo entrega en
 * `extra.http.authInfo`. Miramos también `extra.authInfo` porque esa fue la
 * ubicación en versiones anteriores del SDK: así una subida de versión no
 * rompe el servidor en silencio.
 */
type ConAuth = { extra?: ContextoMcp };
function contextoDe(extra: unknown): ContextoMcp | null {
  const e = extra as {
    authInfo?: ConAuth;
    http?: { authInfo?: ConAuth };
  };
  return e.http?.authInfo?.extra ?? e.authInfo?.extra ?? null;
}

const handler = createMcpHandler((server) => {
  server.registerTool(
    "explicar_diagnostico",
    {
      title: "Explicar diagnóstico financiero",
      description:
        "Devuelve la ruta financiera del usuario (salida-de-deudas, visibilidad o " +
        "meta-de-ahorro) junto con las reglas explícitas que la determinaron, el " +
        "umbral de cada una y el valor observado. Úsala para explicar POR QUÉ el " +
        "usuario está en esa ruta: no inventes razones, cita las reglas que " +
        "devuelve esta herramienta. Revisa siempre 'advertencias' y " +
        "'calidad_datos' antes de concluir: si hay mucho gasto sin categorizar o " +
        "poca historia, dilo. Pa'lante organiza, diagnostica y hace seguimiento; " +
        "no da asesoría de inversión.",
      annotations: { readOnlyHint: true },
    },
    async (extra: unknown) => {
      const ctx = contextoDe(extra);
      if (!ctx) {
        throw new Error("Llamada sin contexto autenticado.");
      }

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
});

// Cada llamada exige un Bearer token de Pa'lante; sin token válido, 401.
const authHandler = withMcpAuth(
  handler,
  async (_req, bearer) => {
    if (!bearer) return undefined;
    const ctx = await autenticar(`Bearer ${bearer}`);
    if (!ctx) return undefined;
    return {
      token: bearer,
      scopes: ["contexto:leer"],
      clientId: ctx.tokenId ?? "demo",
      extra: ctx as unknown as Record<string, unknown>,
    };
  },
  { required: true },
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
