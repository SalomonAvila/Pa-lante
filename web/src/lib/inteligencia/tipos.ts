import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProcedenciaDato } from "@/types/finance";

/**
 * Contexto de ejecución de un experto o herramienta. Lo construye cada
 * superficie de forma distinta (web: cliente con sesión, RLS aplica; MCP:
 * cliente service_role, RLS no aplica) pero todo el código de
 * inteligencia/ es agnóstico de cuál es — siempre filtra explícitamente
 * por userId, nunca confía solo en RLS (misma disciplina que
 * mcp/src/lib/estado.ts ya usa).
 */
export type ContextoInteligencia = {
  userId: string;
  supabase: SupabaseClient;
  origen: "web" | "mcp";
};

export type TierFuente = "A" | "B" | "C" | "D";

/**
 * Procedencia de una afirmación citada en una respuesta: de qué fuente
 * salió, con qué tier de confianza y por qué (sección 6 del pedido —
 * Trust Engine). Nunca "según Internet": siempre se puede reconstruir
 * afirmación → experto → hallazgo → fuente → timestamp.
 */
export type FuenteCitada = {
  fuente: string;
  tier: TierFuente;
  procedencia: ProcedenciaDato;
  motivo: string;
  hallazgoId?: string;
  periodo?: string | null;
};

export type ExpertoId =
  | "presupuesto"
  | "deuda"
  | "flujo_caja"
  | "credito"
  | "tributario"
  | "riesgo"
  | "anomalias"
  | "proyeccion"
  | "hipotecario"
  | "inversiones"
  | "acciones";

/**
 * Lo que devuelve un experto: nunca certeza, siempre con procedencia y un
 * nivel de confianza explícito. `suficiente=false` es una respuesta válida
 * (sección 10, Data Sufficiency Gate) — el orquestador debe poder decir
 * "no tengo evidencia suficiente" en vez de fabricar una conclusión.
 */
export type ExpertResult = {
  expertoId: ExpertoId;
  resumen: string;
  datos: Record<string, unknown>;
  confianza: number;
  fuentes: FuenteCitada[];
  advertencias: string[];
  suficiente: boolean;
};

export type ExpertDefinition = {
  id: ExpertoId;
  nombre: string;
  descripcion: string;
  especialidad: string;
  restricciones: string[];
  riesgo: "bajo" | "medio" | "alto";
  ejecutar: (ctx: ContextoInteligencia, pregunta: string) => Promise<ExpertResult>;
};
