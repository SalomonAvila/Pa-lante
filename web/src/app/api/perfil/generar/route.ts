import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { obtenerPerfilFinanciero } from "@/lib/perfil/obtener-perfil";

/**
 * Último paso de /intake: el usuario ya validó el resumen de las 3 fases
 * (contacto, voz, archivos adjuntos) — acá se calcula el perfil canónico
 * (PerfilFinancieroV1) y se GUARDA una foto de él, no solo se calcula al
 * vuelo como hace el resto de la app. Append-only: cada confirmación es una
 * fila nueva en perfiles_financieros_generados, nunca se sobrescribe.
 */
export async function POST() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { perfil } = await obtenerPerfilFinanciero(supabase, user.id);

  const { data, error } = await supabase
    .from("perfiles_financieros_generados")
    .insert({ user_id: user.id, version: perfil.version, datos: perfil })
    .select("id, generado_en")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo guardar el perfil" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, generadoEn: data.generado_en, perfil });
}
