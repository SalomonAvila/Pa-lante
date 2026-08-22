import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("mcp_tokens")
    .update({ revocado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revocado_en", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "No pudimos revocar el acceso" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Acceso no encontrado o ya revocado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
