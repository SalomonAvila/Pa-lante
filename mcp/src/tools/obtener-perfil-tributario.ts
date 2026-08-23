import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { consultarExperto } from "@web/lib/inteligencia/registro-expertos";
import { construirContextoInteligencia, MENSAJE_NO_DISPONIBLE_EN_DEMO } from "../lib/contexto.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Información tributaria del usuario conectada desde la DIAN (RUT, responsabilidades, ingresos " +
  "de la información exógena). Ayuda a organizar qué hay disponible para la declaración de renta " +
  "— no calcula el impuesto a pagar ni presenta una declaración.";

const InputSchema = { pregunta: z.string().optional().describe("Pregunta específica (opcional).") };

export function registrarObtenerPerfilTributario(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "obtener_perfil_tributario",
    { title: "Obtener perfil tributario", description: DESCRIPCION, inputSchema: InputSchema, annotations: { readOnlyHint: true } },
    async ({ pregunta }) => {
      const inteligenciaCtx = construirContextoInteligencia(ctx);
      if (!inteligenciaCtx) {
        return { content: [{ type: "text" as const, text: MENSAJE_NO_DISPONIBLE_EN_DEMO }] };
      }

      const resultado = await consultarExperto(inteligenciaCtx, "tributario", pregunta ?? "¿Qué información tributaria tengo disponible?");
      await registrarAcceso(ctx, "obtener_perfil_tributario", { pregunta });

      return { content: [{ type: "text" as const, text: JSON.stringify(resultado, null, 2) }] };
    },
  );
}
