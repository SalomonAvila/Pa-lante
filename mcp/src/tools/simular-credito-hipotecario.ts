import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { consultarExperto } from "@web/lib/inteligencia/registro-expertos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Simula un crédito hipotecario (cuota, costo financiero, efecto de abonos extraordinarios) y lo " +
  "compara contra un catálogo de referencia SIMULADO de condiciones bancarias — nunca una " +
  "cotización real ni una preaprobación. Cruza contra la capacidad de pago real del usuario.";

const InputSchema = {
  pregunta: z
    .string()
    .describe("Describe el crédito en lenguaje natural: valor del inmueble, cuota inicial o monto a financiar, plazo, abonos, etc."),
};

export function registrarSimularCreditoHipotecario(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "simular_credito_hipotecario",
    { title: "Simular crédito hipotecario", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ pregunta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await consultarExperto(inteligenciaCtx, "hipotecario", pregunta);
      await registrarAcceso(ctx, "simular_credito_hipotecario", { pregunta });

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
    },
  );
}
