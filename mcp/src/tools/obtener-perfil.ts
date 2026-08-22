import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { obtenerPerfil } from "../lib/perfil.js";
import { registrarAcceso, type ContextoMcp } from "../lib/auth.js";

const DESCRIPCION =
  "Devuelve el perfil financiero declarado/observado del usuario: identidad " +
  "básica y la lista de hallazgos (ingresos, deudas, activos, objetivo " +
  "declarado, etc.), cada uno con su fuente (conversación por voz, Gmail, " +
  "PDF, manual), procedencia y confianza. Úsala cuando necesites el contexto " +
  "crudo que el usuario contó o conectó, no el diagnóstico ya calculado — " +
  "para eso usa explicar_diagnostico. No fusiones hallazgos contradictorios " +
  "de distintas fuentes en una sola cifra: muéstralos por separado, como " +
  "vienen.";

export function registrarObtenerPerfil(server: McpServer, ctx: ContextoMcp) {
  server.registerTool(
    "obtener_perfil",
    {
      title: "Obtener perfil financiero declarado",
      description: DESCRIPCION,
      annotations: { readOnlyHint: true },
    },
    async () => {
      const perfil = await obtenerPerfil(ctx);

      await registrarAcceso(ctx, "obtener_perfil", null);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                persona: perfil.persona,
                hallazgos: perfil.hallazgos,
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
