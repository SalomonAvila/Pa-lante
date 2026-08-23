import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { cifrarCampo, descifrarCampo, hashIdentidad } from "@/lib/seguridad/vault";

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
      // Vault de identidad (sección 15-16 del pedido): el número de documento
      // y el celular nunca se guardan en claro. `external_identity_hash` es
      // un HMAC, no el número de documento — reemplaza el índice único que
      // antes vivía sobre la columna en claro.
      numero_documento_cifrado: cifrarCampo(body.numeroDocumento),
      celular_cifrado: cifrarCampo(body.celular),
      external_identity_hash: hashIdentidad(body.numeroDocumento),
      fecha_expedicion: body.fechaExpedicion,
      fecha_nacimiento: body.fechaNacimiento,
      direccion: body.direccion,
      departamento: body.departamento,
      municipio: body.municipio,
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
  if (!data) return NextResponse.json({ persona: null });

  // El dueño autenticado (RLS ya garantiza que es su propia fila) recibe su
  // dato descifrado — el cifrado protege la base, no al usuario viendo lo suyo.
  const { numero_documento_cifrado, celular_cifrado, external_identity_hash: _hash, ...resto } = data;
  return NextResponse.json({
    persona: {
      ...resto,
      numero_documento: numero_documento_cifrado ? descifrarCampo(numero_documento_cifrado) : null,
      celular: celular_cifrado ? descifrarCampo(celular_cifrado) : null,
    },
  });
}
