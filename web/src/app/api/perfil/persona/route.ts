import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";

const CAMPOS_REQUERIDOS = [
  "nombres",
  "apellidos",
  "tipoDocumento",
  "numeroDocumento",
  "fechaExpedicion",
  "fechaNacimiento",
  "direccion",
  "departamento",
  "municipio",
  "celular",
  "tipoPersona",
] as const;

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();

  for (const campo of CAMPOS_REQUERIDOS) {
    if (!body[campo]) {
      return NextResponse.json({ error: `Falta el campo "${campo}"` }, { status: 400 });
    }
  }

  const { error } = await supabase.from("personas").upsert(
    {
      user_id: user.id,
      nombres: body.nombres,
      apellidos: body.apellidos,
      tipo_documento: body.tipoDocumento,
      numero_documento: body.numeroDocumento,
      fecha_expedicion: body.fechaExpedicion,
      fecha_nacimiento: body.fechaNacimiento,
      direccion: body.direccion,
      departamento: body.departamento,
      municipio: body.municipio,
      celular: body.celular,
      tipo_persona: body.tipoPersona,
      sexo: body.sexo || null,
      identidad_genero: body.identidadGenero || null,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase.from("personas").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ persona: data });
}
