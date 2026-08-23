import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
 * texto) mientras la conversación avanza — no un volcado al final.
 *
 * "goal" es un caso especial: el objetivo de acceso NO vive en
 * hallazgos_financieros, vive en `planes` (tipo_meta/datos_meta) porque es
 * de ahí que lee `objetivoDesdePlan` en obtener-perfil.ts — el pipeline
 * canónico del perfil. Cualquier otro tipo va a hallazgos_financieros como
 * cualquier otra fuente (Gmail, PDF, manual), solo cambia `fuente`.
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

  if (body.tipo === "goal") {
    return guardarObjetivo(supabase, user.id, body.datos, body.periodo ?? null);
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

/**
 * Único objetivo de acceso soportado hoy: demostrar capacidad de pago para
 * arriendo (ver ObjetivoAccesoFinanciero en types/finance.ts). Upsert manual
 * porque el índice único de "un plan activo por usuario" es parcial
 * (where activo) y PostgREST no lo puede usar como target de ON CONFLICT.
 */
async function guardarObjetivo(
  supabase: SupabaseClient,
  userId: string,
  datos: Record<string, unknown>,
  periodo: string | null,
) {
  const canonMensualObjetivo = datos.canon_mensual_objetivo;
  const ingresoMensualDeclarado = datos.ingreso_mensual_declarado;
  if (typeof canonMensualObjetivo !== "number" || typeof ingresoMensualDeclarado !== "number") {
    return NextResponse.json(
      { error: "Para 'goal' se necesita canon_mensual_objetivo e ingreso_mensual_declarado (números)" },
      { status: 400 },
    );
  }

  const fila = {
    meta: typeof datos.descripcion === "string" ? datos.descripcion : "Demostrar capacidad de pago para arriendo",
    tipo_meta: "demostrar_capacidad_arriendo",
    datos_meta: { canon_mensual_objetivo: canonMensualObjetivo, ingreso_mensual_declarado: ingresoMensualDeclarado },
    fecha_objetivo: typeof datos.fecha_objetivo === "string" ? datos.fecha_objetivo : periodo,
  };

  const { data: existente, error: errorLectura } = await supabase
    .from("planes")
    .select("id")
    .eq("user_id", userId)
    .eq("activo", true)
    .maybeSingle();
  if (errorLectura) return NextResponse.json({ error: errorLectura.message }, { status: 500 });

  const { error } = existente
    ? await supabase.from("planes").update(fila).eq("id", existente.id)
    : await supabase.from("planes").insert({ ...fila, user_id: userId, aporte_mensual: 0, activo: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
