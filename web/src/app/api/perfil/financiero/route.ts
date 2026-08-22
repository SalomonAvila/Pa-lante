import { NextResponse } from "next/server";
import { obtenerPerfilFinanciero } from "@/lib/perfil/obtener-perfil";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

/**
 * Fuente única para panorama y chat. No acepta user_id del cliente: siempre
 * usa la identidad de la sesión y deja que RLS limite las filas consultadas.
 */
export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const perfil = await obtenerPerfilFinanciero(supabase, user.id);
    return NextResponse.json({ perfil });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
