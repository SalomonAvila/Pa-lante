import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import {
  listarConsentimientosVigentes,
  registrarConsentimiento,
  revocarConsentimiento,
  type TipoConsentimiento,
} from "@/lib/perfil/consentimientos";

const TIPOS_VALIDOS: TipoConsentimiento[] = [
  "tratamiento_basico",
  "perfil_financiero",
  "conexion_externa",
  "lectura_correo_otp",
  "procesamiento_documentos",
];

function esTipoValido(valor: unknown): valor is TipoConsentimiento {
  return typeof valor === "string" && TIPOS_VALIDOS.includes(valor as TipoConsentimiento);
}

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  if (!esTipoValido(body.tipo)) {
    return NextResponse.json({ error: "Tipo de consentimiento inválido" }, { status: 400 });
  }

  await registrarConsentimiento(
    supabase,
    user.id,
    body.tipo,
    Array.isArray(body.finalidades) ? body.finalidades : [],
  );
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const consentimientos = await listarConsentimientosVigentes(supabase, user.id);
  return NextResponse.json({ consentimientos });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  if (!esTipoValido(body.tipo)) {
    return NextResponse.json({ error: "Tipo de consentimiento inválido" }, { status: 400 });
  }

  await revocarConsentimiento(supabase, user.id, body.tipo);
  return NextResponse.json({ ok: true });
}
