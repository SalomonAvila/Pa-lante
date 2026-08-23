import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { consultarExperto } from "@web/lib/inteligencia/registro-expertos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Perfil crediticio del usuario a partir de las fuentes que autorizó conectar (DataCrédito, " +
  "TransUnion): score, obligaciones activas, y una explicación de los factores. Si dos fuentes " +
  "reportan cifras distintas, las devuelve por separado — no las promedia. Nunca uses esto para " +
  "sugerir un producto de crédito específico.";

const InputSchema = { pregunta: z.string().optional().describe("Pregunta específica (opcional).") };

export function registrarObtenerPerfilCredito(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "obtener_perfil_credito",
    { title: "Obtener perfil crediticio", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ pregunta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await consultarExperto(inteligenciaCtx, "credito", pregunta ?? "¿Cómo está mi perfil crediticio?");
      await registrarAcceso(ctx, "obtener_perfil_credito", { pregunta });

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
    },
  );
}
