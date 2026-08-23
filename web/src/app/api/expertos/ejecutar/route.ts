import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { REGISTRO_EXPERTOS, consultarExperto } from "@/lib/inteligencia/registro-expertos";
import type { ContextoInteligencia, ExpertoId, ExpertResult } from "@/lib/inteligencia/tipos";

// 11 expertos en paralelo, cada uno con su propio round-trip al LLM — igual
// margen que api/conversar/route.ts para el mismo tipo de carga.
export const maxDuration = 300;

export type EventoExpertos =
  | { tipo: "lista"; expertos: { id: ExpertoId; nombre: string }[] }
  | { tipo: "experto_status"; expertoId: ExpertoId; estado: "consultando" | "listo" | "error" }
  | { tipo: "experto_resultado"; expertoId: ExpertoId; resultado: ExpertResult }
  | { tipo: "done" }
  | { tipo: "error"; mensaje: string };

function sseLine(evento: EventoExpertos): string {
  return `data: ${JSON.stringify(evento)}\n\n`;
}

const PREGUNTA_GENERICA =
  "Evalúa mi situación financiera actual con toda la información disponible y dame tu análisis.";

/**
 * A diferencia de /api/conversar (donde Claude decide qué expertos
 * consultar según la pregunta libre), esto corre TODOS los expertos del
 * registro contra el perfil recién capturado — es el "progreso real"
 * que se muestra al terminar la conversación de voz.
 */
export async function POST() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });

  const ctx: ContextoInteligencia = { userId: user.id, supabase, origen: "web" };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: EventoExpertos) => controller.enqueue(encoder.encode(sseLine(evento)));

      enviar({ tipo: "lista", expertos: REGISTRO_EXPERTOS.map((e) => ({ id: e.id, nombre: e.nombre })) });

      try {
        await Promise.all(
          REGISTRO_EXPERTOS.map(async (experto) => {
            enviar({ tipo: "experto_status", expertoId: experto.id, estado: "consultando" });
            try {
              const resultado = await consultarExperto(ctx, experto.id, PREGUNTA_GENERICA);
              enviar({ tipo: "experto_resultado", expertoId: experto.id, resultado });
              enviar({ tipo: "experto_status", expertoId: experto.id, estado: "listo" });
            } catch {
              enviar({ tipo: "experto_status", expertoId: experto.id, estado: "error" });
            }
          }),
        );
        enviar({ tipo: "done" });
      } catch (error) {
        enviar({ tipo: "error", mensaje: error instanceof Error ? error.message : "Error desconocido." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
