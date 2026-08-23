import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { eliminarDocumento, urlFirmada } from "@/lib/storage/documentos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const { data } = await supabase.from("documentos_financieros").select("storage_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  try {
    return NextResponse.json({ url: await urlFirmada(supabase, data.storage_path, 120) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir" }, { status: 500 });
  }
}

/** Eliminar un documento cargado (sección 27: control de privacidad). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { data: documento } = await supabase
    .from("documentos_financieros")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!documento) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await eliminarDocumento(supabase, documento.storage_path);
  const { error } = await supabase.from("documentos_financieros").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
