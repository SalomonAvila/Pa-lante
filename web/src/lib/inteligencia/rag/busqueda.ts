import type { SupabaseClient } from "@supabase/supabase-js";
import type { TierFuente } from "../tipos";
import { generarEmbedding } from "./embeddings";

export type ResultadoConocimiento = {
  titulo: string;
  fuenteUrl: string | null;
  tier: TierFuente;
  contenido: string;
  distancia: number;
};

type FilaBusqueda = {
  documento_id: string;
  titulo: string;
  fuente_url: string | null;
  tier: string;
  contenido: string;
  distancia: number;
};

/**
 * RAG mínimo (Fase 1, sección 8-9 del pedido general de contexto
 * documental): solo para conocimiento documental — regulación,
 * definiciones — nunca para datos propios del usuario, que siempre vienen
 * de una query estructurada sobre hallazgos_financieros/transacciones.
 */
export async function buscarConocimiento(
  supabase: SupabaseClient,
  consulta: string,
  k = 4,
): Promise<{ disponible: boolean; resultados: ResultadoConocimiento[] }> {
  const embedding = await generarEmbedding(consulta, "query");
  if (!embedding) {
    return { disponible: false, resultados: [] };
  }

  const { data, error } = await supabase.rpc("buscar_chunks_conocimiento", {
    query_embedding: embedding,
    match_count: k,
  });

  if (error) throw new Error(`No se pudo buscar en el conocimiento documental: ${error.message}`);

  const filas = (data ?? []) as FilaBusqueda[];
  return {
    disponible: true,
    resultados: filas.map((f) => ({
      titulo: f.titulo,
      fuenteUrl: f.fuente_url,
      tier: (f.tier as TierFuente) ?? "C",
      contenido: f.contenido,
      distancia: f.distancia,
    })),
  };
}
