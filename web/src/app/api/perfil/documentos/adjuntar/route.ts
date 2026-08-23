import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { construirRuta, subirDocumento } from "@/lib/storage/documentos";

/**
 * Sube un archivo de CUALQUIER formato y solo lo registra — a propósito NO
 * llama al extractor (a diferencia de /api/perfil/documentos, que sí lo hace
 * al subir). El análisis queda pendiente hasta que el usuario valide el
 * resumen general y confirme generar su perfil (ver /api/perfil/generar).
 */
export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const ruta = construirRuta(user.id, "financieros", archivo.name);
  await subirDocumento(supabase, ruta, archivo);

  const { data, error } = await supabase
    .from("documentos_financieros")
    .insert({
      user_id: user.id,
      tipo: "otro",
      storage_path: ruta,
      estado_extraccion: "pendiente",
    })
    .select("id, storage_path, creado_en")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo guardar el documento" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    nombre: archivo.name,
    creadoEn: data.creado_en,
  });
}

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("documentos_financieros")
    .select("id, storage_path, estado_extraccion, creado_en")
    .eq("user_id", user.id)
    .order("creado_en", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const documentos = (data ?? []).map((d) => ({
    id: d.id,
    nombre: d.storage_path.split("/").pop() ?? d.storage_path,
    estado: d.estado_extraccion,
    creadoEn: d.creado_en,
  }));

  return NextResponse.json({ documentos });
}
