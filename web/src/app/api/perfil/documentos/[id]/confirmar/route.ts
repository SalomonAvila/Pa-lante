import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

type HallazgoPropuesto = { tipo: string; descripcion: string; valor: number; fecha?: string };

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
    .select("id, banco_detectado, periodo_detectado")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentoError || !documento) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const filas = hallazgos.map((h) => ({
    user_id: user.id,
    tipo: h.tipo,
    fuente: documento.banco_detectado ?? "documento cargado",
    procedencia: "confirmado",
    periodo: h.fecha ?? documento.periodo_detectado ?? null,
    datos: { descripcion: h.descripcion, valor: h.valor },
    confianza: 1,
    documento_ref: documento.id,
  }));

  const { error } = await supabase.from("hallazgos_financieros").insert(filas);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, guardados: filas.length });
}
