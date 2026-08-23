import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

/** Forma genérica: `datos` es lo que trajo el extractor/parser, sin forzarlo a {descripcion, valor}. */
type HallazgoPropuesto = {
  tipo: string;
  datos: Record<string, unknown>;
  periodo?: string | null;
  confianza?: number;
};

/**
 * `fuente` distingue explícitamente un documento que el usuario subió a mano
 * de una conexión automatizada real (`orquestador.ts` ya reserva los ids
 * "dian"/"datacredito" para esa otra vía) — nunca debe presentarse como "nos
 * conectamos a la DIAN" cuando en realidad es un PDF que el usuario cargó.
 */
const FUENTE_POR_TIPO_DOCUMENTO: Partial<Record<string, string>> = {
  rut: "dian_user_upload",
  exogena: "dian_user_upload",
  declaracion_renta: "dian_user_upload",
  historia_credito: "datacredito_user_upload",
};

/** El usuario confirmó (o editó) los hallazgos propuestos: ahora sí se persisten. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const hallazgos: HallazgoPropuesto[] = Array.isArray(body.hallazgos) ? body.hallazgos : [];

  if (hallazgos.length === 0) {
    return NextResponse.json({ error: "No hay hallazgos para confirmar" }, { status: 400 });
  }

  const { data: documento, error: documentoError } = await supabase
    .from("documentos_financieros")
    .select("id, tipo, banco_detectado, periodo_detectado")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentoError || !documento) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const fuente = FUENTE_POR_TIPO_DOCUMENTO[documento.tipo] ?? documento.banco_detectado ?? "documento cargado";

  const filas = hallazgos.map((h) => ({
    user_id: user.id,
    tipo: h.tipo,
    fuente,
    procedencia: "confirmado",
    periodo: h.periodo ?? documento.periodo_detectado ?? null,
    datos: h.datos,
    // El usuario ya revisó y confirmó — pero si el parser reportó una
    // confianza de extracción más baja (ej. un escaneo poco legible), esa
    // incertidumbre no desaparece solo porque un humano lo confirmó.
    confianza: Math.min(1, h.confianza ?? 1),
    documento_ref: documento.id,
  }));

  const { error } = await supabase.from("hallazgos_financieros").insert(filas);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, guardados: filas.length });
}
