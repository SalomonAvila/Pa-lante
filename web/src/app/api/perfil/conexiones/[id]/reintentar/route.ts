import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { reintentarConexion } from "@/lib/conectores/orquestador";

/** Reintenta solo esta fuente — nunca reinicia las demás (sección 29 del pedido). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const conexion = await reintentarConexion(supabase, user.id, id);
    return NextResponse.json({ conexion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 400 },
    );
  }
}
