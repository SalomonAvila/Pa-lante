import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { CATALOGO_FUENTES } from "@/lib/conectores/catalogo";
import { iniciarConexiones } from "@/lib/conectores/orquestador";

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fuenteIds: string[] =
    Array.isArray(body.fuenteIds) && body.fuenteIds.length > 0
      ? body.fuenteIds
      : CATALOGO_FUENTES.map((f) => f.id);

  const conexiones = await iniciarConexiones(supabase, user.id, fuenteIds);
  return NextResponse.json({ conexiones });
}
