import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("contacto_basico")
    .select("nombre, celular")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacto: data });
}

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const celular = typeof body.celular === "string" ? body.celular.trim() : "";
  if (!nombre || !celular) {
    return NextResponse.json({ error: "Falta nombre o celular" }, { status: 400 });
  }

  const { error } = await supabase.from("contacto_basico").upsert(
    { user_id: user.id, nombre, celular, actualizado_en: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
