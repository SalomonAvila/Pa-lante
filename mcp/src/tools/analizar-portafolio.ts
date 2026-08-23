import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { consultarExperto } from "@web/lib/inteligencia/registro-expertos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Analiza el perfil de inversión del usuario a nivel de portafolio: objetivo, horizonte, " +
  "tolerancia al riesgo, liquidez disponible y qué tan concentrado o diversificado está lo que ya " +
  "tiene. No recomienda un instrumento específico. Para una empresa puntual usa analizar_accion.";

const InputSchema = { pregunta: z.string().describe("La pregunta o situación de inversión, en lenguaje natural.") };

export function registrarAnalizarPortafolio(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "analizar_portafolio",
    { title: "Analizar portafolio", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ pregunta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await consultarExperto(inteligenciaCtx, "inversiones", pregunta);
      await registrarAcceso(ctx, "analizar_portafolio", { pregunta });

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
    },
  );
}
