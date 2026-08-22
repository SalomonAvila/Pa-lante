import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { construirRuta, subirDocumento } from "@/lib/storage/documentos";
import { extractorDocumentos } from "@/lib/documentos/extractor";

const TIPOS_VALIDOS = ["cedula_frontal", "cedula_posterior"] as const;

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const tipo = formData.get("tipo");
  const archivo = formData.get("archivo");

  if (typeof tipo !== "string" || !TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const { data: persona, error: personaError } = await supabase
    .from("personas")
    .select("nombres, apellidos, numero_documento, fecha_nacimiento, fecha_expedicion")
    .eq("user_id", user.id)
    .maybeSingle();

  if (personaError || !persona) {
    return NextResponse.json({ error: "Completa primero tus datos personales" }, { status: 400 });
  }

  const ruta = construirRuta(user.id, "identidad", archivo.name);
  await subirDocumento(supabase, ruta, archivo);

  const resultado = await extractorDocumentos.extraerIdentidad({
    nombres: persona.nombres,
    apellidos: persona.apellidos,
    numeroDocumento: persona.numero_documento,
    fechaNacimiento: persona.fecha_nacimiento,
    fechaExpedicion: persona.fecha_expedicion,
  });

  const { error: insertError } = await supabase.from("documentos_identidad").insert({
    persona_id: user.id,
    tipo,
    storage_path: ruta,
    ocr_resultado: resultado.campos,
    coincide: resultado.coincide,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  if (tipo === "cedula_frontal") {
    await supabase
      .from("personas")
      .update({ documento_verificado: resultado.coincide, documento_verificado_en: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ coincide: resultado.coincide, camposNoCoincidentes: resultado.camposNoCoincidentes });
}
