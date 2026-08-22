import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { listarConexiones } from "@/lib/conectores/orquestador";

/** Cada llamada avanza lo que corresponda por tiempo transcurrido (ver orquestador.ts). */
export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const conexiones = await listarConexiones(supabase, user.id);
  return NextResponse.json({ conexiones });
}
