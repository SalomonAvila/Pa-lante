import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import type { TipoHallazgo } from "@/types/finance";

const TIPOS_VALIDOS: TipoHallazgo[] = [
  "income",
  "liability",
  "asset",
  "property",
  "vehicle",
  "credit_report",
  "pension",
  "tax_profile",
  "company",
  "fine",
  "account",
  "goal",
];

/**
 * Recibe un hecho a la vez, extraído por el agente conversacional (voz o
 * texto) mientras la conversación avanza — no un volcado al final. Mismo
 * destino que cualquier otra fuente (Gmail, PDF, manual): `hallazgos_financieros`,
 * solo cambia `fuente`.
 */
export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();

  if (!TIPOS_VALIDOS.includes(body.tipo)) {
    return NextResponse.json({ error: `Tipo de hallazgo inválido: "${body.tipo}"` }, { status: 400 });
  }
  if (!body.datos || typeof body.datos !== "object") {
    return NextResponse.json({ error: "Falta \"datos\"" }, { status: 400 });
  }

  const { error } = await supabase.from("hallazgos_financieros").insert({
    user_id: user.id,
    tipo: body.tipo,
    fuente: "conversacion",
    procedencia: "declarado",
    periodo: body.periodo ?? null,
    datos: body.datos,
    confianza: 1,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
