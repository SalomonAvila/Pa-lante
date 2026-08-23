import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerfilFinancieroV1 } from "@/types/finance";
import { obtenerPerfilFinanciero } from "./obtener-perfil";

export type Completitud = {
  porcentaje: number;
  camposFaltantes: string[];
};

type ContextoPerfilFinanciero = {
  perfil: PerfilFinancieroV1;
};

const ETIQUETA_DATO_FALTANTE: Record<string, string> = {
  ingreso_declarado: "Cuánto ganas al mes (que tú lo confirmes)",
  ingreso_observado: "Ingreso observado en tus movimientos (Gmail o un extracto)",
  historia_ingresos_3_meses: "Al menos 3 meses de historial de ingresos",
  obligaciones_confirmadas: "Tus deudas u obligaciones actuales",
  patrimonio: "Tus activos (cuentas, propiedades, vehículos)",
};

/**
 * % de completitud del perfil — es lo que usa el agente de voz para decidir
 * qué preguntar y cuándo parar. Reusa el mismo cálculo canónico que arma
 * PerfilFinancieroV1 (`obtenerPerfilFinanciero` → `calidadDatos`), en vez de
 * mantener una segunda definición de "completo" que podría divergir de la
 * que ya usa el resto del producto (panorama, MCP, prueba de capacidad de
 * pago). Le suma dos señales que el perfil canónico no cubre porque no son
 * parte del núcleo financiero: el contacto básico confirmado y el problema
 * que la persona eligió trabajar en esta etapa del flujo.
 */
export async function calcularCompletitud(
  supabase: SupabaseClient,
  userId: string,
  contextoYaCalculado?: ContextoPerfilFinanciero,
): Promise<Completitud> {
  const [{ data: contacto }, { data: perfilConversacional }, { perfil }] = await Promise.all([
    supabase.from("contacto_basico").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("perfil_conversacional").select("preferencias").eq("user_id", userId).maybeSingle(),
    contextoYaCalculado ?? obtenerPerfilFinanciero(supabase, userId),
  ]);

  const camposFaltantes: string[] = [];
  if (!contacto) camposFaltantes.push("Datos básicos de contacto");
  const preferencias = perfilConversacional?.preferencias as Record<string, unknown> | null;
  if (!preferencias?.problema_activo) camposFaltantes.push("El problema financiero que quieres trabajar");
  for (const dato of perfil.calidadDatos.datosFaltantes) {
    camposFaltantes.push(ETIQUETA_DATO_FALTANTE[dato] ?? dato);
  }

  const señalesTotales = 2 + 5; // contacto + problema elegido, más las 5 del núcleo canónico
  const señalesCubiertas = señalesTotales - camposFaltantes.length;
  const porcentaje = Math.max(0, Math.round((señalesCubiertas / señalesTotales) * 100));

  return { porcentaje, camposFaltantes };
}
