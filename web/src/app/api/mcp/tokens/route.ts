import { NextResponse } from "next/server";
import { generarTokenMcp } from "@/lib/mcp/tokens";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [tokensResult, accesosResult] = await Promise.all([
    supabase
      .from("mcp_tokens")
      .select("id, nombre, prefijo, ultimo_uso, revocado_en, creado_en")
      .eq("user_id", user.id)
      .order("creado_en", { ascending: false }),
    supabase
      .from("mcp_accesos")
      .select("id, token_id, herramienta, exito, creado_en")
      .eq("user_id", user.id)
      .order("creado_en", { ascending: false })
      .limit(20),
  ]);

  if (tokensResult.error || accesosResult.error) {
    return NextResponse.json({ error: "No pudimos consultar tus accesos" }, { status: 500 });
  }

  return NextResponse.json({
    tokens: tokensResult.data,
    accesos: accesosResult.data,
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  if (nombre.length < 2 || nombre.length > 60) {
    return NextResponse.json({ error: "El nombre debe tener entre 2 y 60 caracteres" }, { status: 400 });
  }

  const generado = generarTokenMcp();
  const { data, error } = await supabase
    .from("mcp_tokens")
    .insert({
      user_id: user.id,
      nombre,
      token_hash: generado.tokenHash,
      prefijo: generado.prefijo,
    })
    .select("id, nombre, prefijo, ultimo_uso, revocado_en, creado_en")
    .single();

  if (error) {
    return NextResponse.json({ error: "No pudimos crear el acceso" }, { status: 500 });
  }

  return NextResponse.json({ token: generado.token, acceso: data }, { status: 201 });
}
