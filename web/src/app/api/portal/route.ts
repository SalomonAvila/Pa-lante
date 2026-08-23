import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [perfiles, documentos, conversaciones] = await Promise.all([
    supabase.from("perfiles_financieros_generados").select("id, version, datos, generado_en").eq("user_id", user.id).order("generado_en", { ascending: false }).limit(10),
    supabase.from("documentos_financieros").select("id, storage_path, tipo, estado_extraccion, creado_en").eq("user_id", user.id).order("creado_en", { ascending: false }).limit(50),
    supabase.from("conversaciones").select("id, titulo, creado_en, actualizado_en").eq("user_id", user.id).order("actualizado_en", { ascending: false }).limit(20),
  ]);
  const error = perfiles.error ?? documentos.error ?? conversaciones.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    perfil: perfiles.data?.find((fila) => fila.version === "1.1") ?? null,
    sesionesPerfil: (perfiles.data ?? []).map(({ id, version, generado_en }) => ({ id, version, generadoEn: generado_en })),
    documentos: (documentos.data ?? []).map((documento) => ({
      id: documento.id,
      nombre: documento.storage_path.split("/").pop() ?? documento.storage_path,
      tipo: documento.tipo,
      estado: documento.estado_extraccion,
      creadoEn: documento.creado_en,
    })),
    conversaciones: (conversaciones.data ?? []).map((conversacion) => ({
      id: conversacion.id,
      titulo: conversacion.titulo,
      canal: "asistente",
      creadoEn: conversacion.creado_en,
      actualizadoEn: conversacion.actualizado_en,
    })),
  });
}
