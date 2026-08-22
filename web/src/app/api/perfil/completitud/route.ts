import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { calcularCompletitud } from "@/lib/perfil/completitud";

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const completitud = await calcularCompletitud(supabase, user.id);
  return NextResponse.json(completitud);
}
