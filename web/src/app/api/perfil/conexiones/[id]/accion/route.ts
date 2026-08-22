import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { resolverAccion, type PayloadAccion } from "@/lib/conectores/orquestador";

/**
 * El usuario resuelve un paso en pausa: campos de registro faltantes,
 * confirmación de CAPTCHA, código OTP, o inicio de recuperación de clave.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const payload = (await request.json()) as PayloadAccion;

  try {
    const conexion = await resolverAccion(supabase, user.id, id, payload);
    return NextResponse.json({ conexion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 400 },
    );
  }
}
