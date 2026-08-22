import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { construirRuta, subirDocumento } from "@/lib/storage/documentos";
import { extractorDocumentos } from "@/lib/documentos/extractor";

const TIPOS_VALIDOS = ["extracto", "captura"] as const;

/**
 * Sube un extracto/captura y devuelve una PROPUESTA de hallazgos — todavía
 * no se guarda nada en `hallazgos_financieros`. La confirmación humana pasa
 * por `documentos/[id]/confirmar` (sección 19: nunca asumir que una
 * extracción automática es correcta).
 */
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

  const ruta = construirRuta(user.id, "financieros", archivo.name);
  await subirDocumento(supabase, ruta, archivo);

  const resultado = await extractorDocumentos.extraerDocumentoFinanciero(
    archivo.name,
    tipo as "extracto" | "captura",
  );

  const { data, error } = await supabase
    .from("documentos_financieros")
    .insert({
      user_id: user.id,
      tipo,
      storage_path: ruta,
      banco_detectado: resultado.bancoDetectado,
      periodo_detectado: resultado.periodoDetectado,
      estado_extraccion: "completado",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo guardar el documento" }, { status: 500 });
  }

  return NextResponse.json({
    documentoId: data.id,
    bancoDetectado: resultado.bancoDetectado,
    periodoDetectado: resultado.periodoDetectado,
    saldo: resultado.saldo,
    hallazgos: resultado.hallazgos,
  });
}
