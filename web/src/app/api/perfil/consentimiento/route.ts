import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import {
  listarConsentimientosVigentes,
  registrarConsentimiento,
  revocarConsentimiento,
  TIPOS_CONSENTIMIENTO,
  type TipoConsentimiento,
} from "@/lib/perfil/consentimientos";

function esTipoValido(valor: unknown): valor is TipoConsentimiento {
  return typeof valor === "string" && TIPOS_CONSENTIMIENTO.includes(valor as TipoConsentimiento);
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
