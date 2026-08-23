import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { obtenerPanorama } from "@/lib/perfil/normalizacion";
import { calcularCompletitud } from "@/lib/perfil/completitud";

/**
 * Todo lo que el usuario dio en cada fase de /intake, para la pantalla de
 * revisión antes de generar el perfil: contacto básico, lo que contó por
 * voz (hallazgos_financieros con fuente "conversacion"), y los archivos que
 * adjuntó (todavía sin analizar).
 */
export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [contactoRes, panorama, completitud, documentosRes] = await Promise.all([
    supabase
      .from("contacto_basico")
      .select("nombres, apellidos, tipo_documento, numero_documento, celular, ciudad")
      .eq("user_id", user.id)
      .maybeSingle(),
    obtenerPanorama(supabase, user.id),
    calcularCompletitud(supabase, user.id),
    supabase
      .from("documentos_financieros")
      .select("id, storage_path, estado_extraccion, creado_en")
      .eq("user_id", user.id)
      .order("creado_en", { ascending: false }),
  ]);

  const hallazgosPorVoz = panorama.hallazgos.filter((h) => h.fuente === "conversacion");
  const documentos = (documentosRes.data ?? []).map((d) => ({
    id: d.id,
    nombre: d.storage_path.split("/").pop() ?? d.storage_path,
    estado: d.estado_extraccion,
    creadoEn: d.creado_en,
  }));

  return NextResponse.json({
    contacto: contactoRes.data,
    hallazgosPorVoz,
    documentos,
    completitud,
  });
}
