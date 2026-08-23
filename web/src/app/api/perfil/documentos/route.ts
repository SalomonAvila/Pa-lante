import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { construirRuta, subirDocumento } from "@/lib/storage/documentos";
import { extractorDocumentos } from "@/lib/documentos/extractor";
import { parseDeclaracionRenta, parseExogena, parseRut } from "@/lib/documentos/dian";
import { parseHistoriaCredito } from "@/lib/documentos/datacredito";
import { tieneConsentimientoVigente, type TipoConsentimiento } from "@/lib/perfil/consentimientos";

const TIPOS_VALIDOS = ["extracto", "captura", "rut", "exogena", "declaracion_renta", "historia_credito"] as const;
type TipoDocumento = (typeof TIPOS_VALIDOS)[number];

/** Documento cargado a mano de la DIAN/DataCrédito exige su propio consentimiento (sección 20). */
const CONSENTIMIENTO_POR_TIPO: Partial<Record<TipoDocumento, TipoConsentimiento>> = {
  rut: "dian_documento",
  exogena: "dian_documento",
  declaracion_renta: "dian_documento",
  historia_credito: "datacredito_documento",
};

/** Propuesta unificada — nunca se persiste sola, la confirma el usuario en `[id]/confirmar`. */
type HallazgoPropuesto = {
  tipo: string;
  datos: Record<string, unknown>;
  periodo?: string | null;
  confianza?: number;
};

/**
 * Sube un documento y devuelve una PROPUESTA de hallazgos — todavía no se
 * guarda nada en `hallazgos_financieros`. La confirmación humana pasa por
 * `documentos/[id]/confirmar` (sección 19: nunca asumir que una extracción
 * automática es correcta), sea que el documento venga del mock de
 * extracto/captura o de un parser real de DIAN/DataCrédito.
 */
export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const tipo = formData.get("tipo");
  const archivo = formData.get("archivo");

  if (typeof tipo !== "string" || !TIPOS_VALIDOS.includes(tipo as TipoDocumento)) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const tipoDocumento = tipo as TipoDocumento;
  const consentimientoRequerido = CONSENTIMIENTO_POR_TIPO[tipoDocumento];
  if (consentimientoRequerido) {
    const otorgado = await tieneConsentimientoVigente(supabase, user.id, consentimientoRequerido);
    if (!otorgado) {
      return NextResponse.json(
        { error: `Falta el consentimiento "${consentimientoRequerido}" para subir este documento.` },
        { status: 403 },
      );
    }
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const hashDocumento = createHash("sha256").update(bytes).digest("hex");

  const ruta = construirRuta(user.id, "financieros", archivo.name);
  await subirDocumento(supabase, ruta, archivo);

  let bancoDetectado: string | null = null;
  let periodoDetectado: string | null = null;
  let hallazgosPropuestos: HallazgoPropuesto[];

  if (tipoDocumento === "extracto" || tipoDocumento === "captura") {
    const resultado = await extractorDocumentos.extraerDocumentoFinanciero(archivo.name, tipoDocumento);
    bancoDetectado = resultado.bancoDetectado;
    periodoDetectado = resultado.periodoDetectado;
    hallazgosPropuestos = resultado.hallazgos.map((h) => ({
      tipo: h.tipo,
      datos: { descripcion: h.descripcion, valor: h.valor },
      periodo: h.fecha ?? null,
    }));
  } else {
    const pdfBase64 = Buffer.from(bytes).toString("base64");
    const parser = { rut: parseRut, exogena: parseExogena, declaracion_renta: parseDeclaracionRenta, historia_credito: parseHistoriaCredito }[
      tipoDocumento
    ];
    const hallazgosDocumento = await parser(pdfBase64);
    bancoDetectado = tipoDocumento === "historia_credito" ? "DataCrédito" : "DIAN";
    periodoDetectado = hallazgosDocumento[0]?.periodo ?? null;
    hallazgosPropuestos = hallazgosDocumento.map((h) => ({
      tipo: h.tipo,
      datos: h.datos,
      periodo: h.periodo,
      confianza: h.confianza,
    }));
  }

  const { data, error } = await supabase
    .from("documentos_financieros")
    .insert({
      user_id: user.id,
      tipo: tipoDocumento,
      storage_path: ruta,
      banco_detectado: bancoDetectado,
      periodo_detectado: periodoDetectado,
      hash_documento: hashDocumento,
      estado_extraccion: "completado",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo guardar el documento" }, { status: 500 });
  }

  return NextResponse.json({
    documentoId: data.id,
    bancoDetectado,
    periodoDetectado,
    hallazgos: hallazgosPropuestos,
  });
}
