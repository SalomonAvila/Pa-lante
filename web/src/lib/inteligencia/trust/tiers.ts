import type { ProcedenciaDato } from "@/types/finance";
import type { FuenteCitada, TierFuente } from "../tipos";

/**
 * Trust Engine simplificado (Fase 1, sección 6 del pedido). No inventa
 * tiers por fuente: los deriva de lo que el esquema YA registra
 * (`fuente` + `procedencia` en hallazgos_financieros/transacciones). Un
 * motor de corroboración multi-fuente automático queda para Fase 2 — acá
 * solo se clasifica y se deja trazable, nunca se resuelve una contradicción
 * en código.
 *
 * Tier A — autoritativa (reguladores, entidades oficiales).
 * Tier B — proveedor profesional reconocido, con metodología conocida.
 * Tier C — reservado para medios/contexto (sin uso en Fase 1: no hay
 *          experto de noticias todavía).
 * Tier D — lo que dijo o estimó el propio sistema/usuario: útil como señal,
 *          nunca como único fundamento de una afirmación categórica.
 */
const FUENTES_TIER_A = new Set(["dian", "banrep", "dane", "sfc"]);
const FUENTES_TIER_B = new Set(["datacredito", "transunion"]);

export function clasificarFuente(
  fuente: string,
  procedencia: ProcedenciaDato,
): { tier: TierFuente; motivo: string } {
  const fuenteNormalizada = fuente.toLowerCase();

  if (procedencia === "observado" && FUENTES_TIER_A.has(fuenteNormalizada)) {
    return { tier: "A", motivo: `${fuente} es una fuente oficial y el dato fue observado directamente.` };
  }
  if (procedencia === "observado" && FUENTES_TIER_B.has(fuenteNormalizada)) {
    return { tier: "B", motivo: `${fuente} es un proveedor profesional reconocido, con metodología conocida.` };
  }
  if (procedencia === "observado") {
    return {
      tier: "B",
      motivo: `El dato viene observado de ${fuente} (transacciones/documentos del propio usuario), no autoreportado.`,
    };
  }
  if (procedencia === "confirmado") {
    return { tier: "B", motivo: "El usuario revisó y confirmó este dato explícitamente." };
  }
  if (procedencia === "estimado") {
    return { tier: "D", motivo: "Es una estimación calculada por el sistema, no un dato observado." };
  }
  return { tier: "D", motivo: "El usuario declaró este dato; no está verificado contra una fuente externa." };
}

export function citarFuente(params: {
  fuente: string;
  procedencia: ProcedenciaDato;
  hallazgoId?: string;
  periodo?: string | null;
}): FuenteCitada {
  const { tier, motivo } = clasificarFuente(params.fuente, params.procedencia);
  return {
    fuente: params.fuente,
    tier,
    procedencia: params.procedencia,
    motivo,
    hallazgoId: params.hallazgoId,
    periodo: params.periodo ?? null,
  };
}

/**
 * Confianza agregada de un experto: nunca más alta que la fuente más débil
 * que citó. Evita que un experto declare confianza 0.9 apoyado en un solo
 * dato "declarado" (tier D).
 */
export function techoConfianzaPorTiers(fuentes: FuenteCitada[]): number {
  if (fuentes.length === 0) return 0.3;
  const techoPorTier: Record<TierFuente, number> = { A: 0.98, B: 0.9, C: 0.75, D: 0.6 };
  return Math.min(...fuentes.map((f) => techoPorTier[f.tier]));
}
