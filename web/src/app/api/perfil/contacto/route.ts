import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

const TIPOS_DOCUMENTO = ["CC", "CE", "TI", "PA", "NIT"] as const;

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("contacto_basico")
    .select("nombres, apellidos, tipo_documento, numero_documento, celular, ciudad")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacto: data });
}

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const nombres = typeof body.nombres === "string" ? body.nombres.trim() : "";
  const apellidos = typeof body.apellidos === "string" ? body.apellidos.trim() : "";
  const tipoDocumento = typeof body.tipoDocumento === "string" ? body.tipoDocumento.trim() : "";
  const numeroDocumento = typeof body.numeroDocumento === "string" ? body.numeroDocumento.trim() : "";
  const celular = typeof body.celular === "string" ? body.celular.trim() : "";
  const ciudad = typeof body.ciudad === "string" ? body.ciudad.trim() : "";

  if (!nombres || !apellidos || !numeroDocumento || !celular) {
    return NextResponse.json({ error: "Falta nombres, apellidos, número de documento o celular" }, { status: 400 });
  }
  if (!TIPOS_DOCUMENTO.includes(tipoDocumento as (typeof TIPOS_DOCUMENTO)[number])) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  const { error } = await supabase.from("contacto_basico").upsert(
    {
      user_id: user.id,
      nombres,
      apellidos,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      celular,
      ciudad: ciudad || null,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
