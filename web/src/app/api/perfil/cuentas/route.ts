import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

/** Agregar una cuenta financiera a mano (sección 19 del pedido). */
export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  if (!body.banco || !body.tipoProducto) {
    return NextResponse.json({ error: "Falta el banco o el tipo de producto" }, { status: 400 });
  }

  const { error } = await supabase.from("hallazgos_financieros").insert({
    user_id: user.id,
    tipo: "account",
    fuente: "manual",
    procedencia: "declarado",
    periodo: null,
    datos: { banco: body.banco, tipo_producto: body.tipoProducto, alias: body.alias ?? null },
    confianza: 1,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
