import type { NextRequest } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { ejecutarConversacion, type EventoOrquestador } from "@/lib/inteligencia/orquestador";
import type { ContextoInteligencia } from "@/lib/inteligencia/tipos";

// Un turno puede disparar varios expertos en paralelo + una síntesis final:
// se deja margen generoso en vez de construir una cola de jobs para esto
// (ver "Riesgo conocido" en el plan de Fase 1).
export const maxDuration = 300;

type EventoSSE = EventoOrquestador | { tipo: "conversacion"; conversacionId: string };

function sseLine(evento: EventoSSE): string {
  return `data: ${JSON.stringify(evento)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });

  const body = await request.json().catch(() => null);
  const pregunta = typeof body?.pregunta === "string" ? body.pregunta.trim() : "";
  if (!pregunta) {
    return new Response(JSON.stringify({ error: "Falta 'pregunta'" }), { status: 400 });
  }

  let conversacionId: string | null = typeof body?.conversacionId === "string" ? body.conversacionId : null;

  if (!conversacionId) {
    const { data, error } = await supabase
      .from("conversaciones")
      .insert({ user_id: user.id, titulo: pregunta.slice(0, 80) })
      .select("id")
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message ?? "No se pudo crear la conversación" }), { status: 500 });
    }
    conversacionId = data.id as string;
  }

  const { data: mensajesPrevios, error: errorHistorial } = await supabase
    .from("mensajes")
    .select("rol, contenido")
    .eq("conversacion_id", conversacionId)
    .order("creado_en", { ascending: true });

  if (errorHistorial) {
    return new Response(JSON.stringify({ error: errorHistorial.message }), { status: 500 });
  }

  const historial = ((mensajesPrevios ?? []) as { rol: "user" | "assistant"; contenido: string }[]).map((m) => ({
    rol: m.rol,
    contenido: m.contenido,
  }));

  const { error: errorInsertUsuario } = await supabase
    .from("mensajes")
    .insert({ conversacion_id: conversacionId, user_id: user.id, rol: "user", contenido: pregunta });
  if (errorInsertUsuario) {
    return new Response(JSON.stringify({ error: errorInsertUsuario.message }), { status: 500 });
  }

  const ctx: ContextoInteligencia = { userId: user.id, supabase, origen: "web" };
  const conversacionIdFinal = conversacionId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: EventoSSE) => controller.enqueue(encoder.encode(sseLine(evento)));

      enviar({ tipo: "conversacion", conversacionId: conversacionIdFinal });

      try {
        const resultado = await ejecutarConversacion(ctx, { pregunta, historial, conversacionId: conversacionIdFinal }, enviar);

        await supabase.from("mensajes").insert({
          conversacion_id: conversacionIdFinal,
          user_id: user.id,
          rol: "assistant",
          contenido: resultado.textoFinal,
          eventos: {
            expertosInvocados: resultado.expertosInvocados,
            fuentes: resultado.fuentes,
            confianza: resultado.confianza,
          },
        });

        await supabase
          .from("conversaciones")
          .update({ actualizado_en: new Date().toISOString() })
          .eq("id", conversacionIdFinal);
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
