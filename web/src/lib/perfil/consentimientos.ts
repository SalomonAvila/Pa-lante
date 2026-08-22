import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cinco consentimientos separados (sección 26 del pedido) — nunca un único
 * checkbox genérico. Append-only: revocar es otorgar una fila nueva con
 * `otorgado=false`, así queda trazable cuándo y con qué versión se aceptó o
 * se revocó cada uno.
 */
export type TipoConsentimiento =
  | "tratamiento_basico"
  | "perfil_financiero"
  | "conexion_externa"
  | "lectura_correo_otp"
  | "procesamiento_documentos";

export type EventoConsentimiento = {
  id: string;
  tipo: TipoConsentimiento;
  version: string;
  finalidades: string[];
  otorgado: boolean;
  creadoEn: string;
};

const VERSION_VIGENTE = "2026-08-22";

async function insertarEvento(
  supabase: SupabaseClient,
  userId: string,
  tipo: TipoConsentimiento,
  finalidades: string[],
  otorgado: boolean,
): Promise<void> {
  const { error } = await supabase.from("consentimientos").insert({
    user_id: userId,
    tipo,
    version: VERSION_VIGENTE,
    finalidades,
    otorgado,
  });
  if (error) throw new Error(error.message);
}

export function registrarConsentimiento(
  supabase: SupabaseClient,
  userId: string,
  tipo: TipoConsentimiento,
  finalidades: string[],
): Promise<void> {
  return insertarEvento(supabase, userId, tipo, finalidades, true);
}

export function revocarConsentimiento(
  supabase: SupabaseClient,
  userId: string,
  tipo: TipoConsentimiento,
): Promise<void> {
  return insertarEvento(supabase, userId, tipo, [], false);
}

export async function tieneConsentimientoVigente(
  supabase: SupabaseClient,
  userId: string,
  tipo: TipoConsentimiento,
): Promise<boolean> {
  const { data } = await supabase
    .from("consentimientos")
    .select("otorgado")
    .eq("user_id", userId)
    .eq("tipo", tipo)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.otorgado === true;
}

export async function listarConsentimientosVigentes(
  supabase: SupabaseClient,
  userId: string,
): Promise<EventoConsentimiento[]> {
  const { data, error } = await supabase
    .from("consentimientos")
    .select("id, tipo, version, finalidades, otorgado, creado_en")
    .eq("user_id", userId)
    .order("creado_en", { ascending: false });
  if (error) throw new Error(error.message);

  const filas = (data ?? []) as {
    id: string;
    tipo: TipoConsentimiento;
    version: string;
    finalidades: string[];
    otorgado: boolean;
    creado_en: string;
  }[];

  // Solo el más reciente por tipo es el vigente.
  const vigentesPorTipo = new Map<TipoConsentimiento, (typeof filas)[number]>();
  for (const fila of filas) {
    if (!vigentesPorTipo.has(fila.tipo)) vigentesPorTipo.set(fila.tipo, fila);
  }

  return [...vigentesPorTipo.values()].map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    version: fila.version,
    finalidades: fila.finalidades,
    otorgado: fila.otorgado,
    creadoEn: fila.creado_en,
  }));
}
