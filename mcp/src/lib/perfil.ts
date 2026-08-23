import type { HallazgoFinanciero } from "@web/types/finance";
import { clienteServicio, type ContextoMcp } from "./auth.js";

type FilaPersona = {
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  ciudad: string | null;
  departamento: string;
  municipio: string;
};

type FilaHallazgo = {
  id: string;
  tipo: HallazgoFinanciero["tipo"];
  fuente: string;
  procedencia: HallazgoFinanciero["procedencia"];
  periodo: string | null;
  datos: Record<string, unknown>;
  confianza: number;
  creado_en: string;
};

export type PerfilDeclarado = {
  persona: {
    nombres: string;
    apellidos: string;
    tipoDocumento: string;
    departamento: string;
    municipio: string;
  } | null;
  hallazgos: HallazgoFinanciero[];
};

/**
 * Lee el perfil declarado/observado del usuario — el mismo que arma la
 * conversación por voz (`hallazgos_financieros`) más su identidad básica
 * (`personas`). Espejo de `obtenerEstado` en estado.ts: mismo cliente de
 * servicio, mismo filtro explícito por user_id porque acá no hay RLS.
 */
export async function obtenerPerfil(ctx: ContextoMcp): Promise<PerfilDeclarado> {
  if (ctx.demo) {
    return {
      persona: {
        nombres: "Cuenta",
        apellidos: "Semilla",
        tipoDocumento: "CC",
        departamento: "Antioquia",
        municipio: "Medellín",
      },
      hallazgos: [],
    };
  }

  const supabase = clienteServicio();
  if (!supabase) throw new Error("Supabase no está configurado en el servidor MCP.");

  const [{ data: persona }, { data: hallazgosData }] = await Promise.all([
    supabase
      .from("personas")
      .select("nombres, apellidos, tipo_documento, departamento, municipio")
      .eq("user_id", ctx.userId)
      .maybeSingle(),
    supabase
      .from("hallazgos_financieros")
      .select("id, tipo, fuente, procedencia, periodo, datos, confianza, creado_en")
      .eq("user_id", ctx.userId)
      .order("creado_en", { ascending: false }),
  ]);

  const filaPersona = persona as FilaPersona | null;

  return {
    persona: filaPersona
      ? {
          nombres: filaPersona.nombres,
          apellidos: filaPersona.apellidos,
          tipoDocumento: filaPersona.tipo_documento,
          departamento: filaPersona.departamento,
          municipio: filaPersona.municipio,
        }
      : null,
    hallazgos: ((hallazgosData ?? []) as FilaHallazgo[]).map((h) => ({
      id: h.id,
      tipo: h.tipo,
      fuente: h.fuente,
      procedencia: h.procedencia,
      periodo: h.periodo,
      datos: h.datos,
      confianza: Number(h.confianza),
      creadoEn: h.creado_en,
    })),
  };
}
