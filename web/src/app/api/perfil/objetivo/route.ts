import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

const PROBLEMAS = ["salir_de_deudas", "organizar_finanzas", "meta_ahorro", "demostrar_capacidad_arriendo"] as const;

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("objetivo_declarado")
    .select("problema")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ problema: data?.problema ?? null });
}

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const problema = typeof body.problema === "string" ? body.problema : "";
  if (!PROBLEMAS.includes(problema as (typeof PROBLEMAS)[number])) {
    return NextResponse.json({ error: "Opción inválida" }, { status: 400 });
  }

  const { error } = await supabase
    .from("objetivo_declarado")
    .upsert({ user_id: user.id, problema }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
