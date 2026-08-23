import type { ContextoInteligencia, ExpertoId, ExpertResult, FuenteCitada } from "../tipos";

/**
 * Ledger de auditoría (sección 16 del pedido): cada invocación de experto y
 * cada síntesis final quedan como una fila reconstruible en `analisis`.
 * Responde "¿por qué el sistema me dijo esto?" sin tener que confiar en la
 * memoria del modelo.
 */
export async function registrarAnalisis(
  ctx: ContextoInteligencia,
  params: {
    conversacionId?: string | null;
    mensajeId?: string | null;
    expertosInvocados: ExpertoId[];
    herramientas: string[];
    fuentes: FuenteCitada[];
    confianza: number | null;
    resultado: unknown;
    advertencias: string[];
  },
): Promise<void> {
  const { error } = await ctx.supabase.from("analisis").insert({
    user_id: ctx.userId,
    conversacion_id: params.conversacionId ?? null,
    mensaje_id: params.mensajeId ?? null,
    expertos_invocados: params.expertosInvocados,
    herramientas: params.herramientas,
    fuentes: params.fuentes,
    confianza: params.confianza,
    resultado: params.resultado,
    advertencias: params.advertencias,
  });

  // La auditoría nunca debe tumbar la respuesta al usuario: si falla, se
  // registra en el log del servidor y se sigue.
  if (error) {
    console.error("No se pudo registrar auditoría en `analisis`:", error.message);
  }
}

export function fuentesDeResultado(resultado: ExpertResult): FuenteCitada[] {
  return resultado.fuentes;
}
