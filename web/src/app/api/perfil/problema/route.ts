import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { buscarProblema, type ProblemaSeleccionado } from "@/lib/problemas/catalogo";

const seleccionSchema = z.discriminatedUnion("id", [
  z.object({
    id: z.literal("otro"),
    titulo: z.string().trim().min(8).max(240),
  }),
  z.object({
    id: z.enum([
      "entender-gastos",
      "salir-de-deudas",
      "cumplir-meta",
      "vivienda",
      "credito-arriendo",
      "invertir",
    ]),
  }),
]);

type FilaPerfil = {
  objetivos: string[] | null;
  horizonte: string | null;
  tolerancia_riesgo: string | null;
  preferencias: Record<string, unknown> | null;
};

export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("perfil_conversacional")
    .select("preferencias")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const preferencias = data?.preferencias as Record<string, unknown> | undefined;
  return NextResponse.json({ problema: preferencias?.problema_activo ?? null });
}

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const resultado = seleccionSchema.safeParse(await request.json().catch(() => null));
  if (!resultado.success) {
    return NextResponse.json(
      { error: "Elige una opción o cuéntanos tu problema con un poco más de detalle." },
      { status: 400 },
    );
  }

  const problemaCatalogo = resultado.data.id === "otro" ? null : buscarProblema(resultado.data.id);
  const problema: ProblemaSeleccionado = problemaCatalogo
    ? {
        id: problemaCatalogo.id,
        titulo: problemaCatalogo.titulo,
        descripcion: problemaCatalogo.descripcion,
      }
    : {
        id: "otro",
        titulo: resultado.data.id === "otro" ? resultado.data.titulo : "",
        descripcion: "Problema descrito por la persona.",
      };

  const { data: actual, error: errorLectura } = await supabase
    .from("perfil_conversacional")
    .select("objetivos, horizonte, tolerancia_riesgo, preferencias")
    .eq("user_id", user.id)
    .maybeSingle();

  if (errorLectura) return NextResponse.json({ error: errorLectura.message }, { status: 500 });

  const fila = actual as FilaPerfil | null;
  const objetivos = [...new Set([...(fila?.objetivos ?? []), problema.titulo])];
  const preferencias = {
    ...(fila?.preferencias ?? {}),
    problema_activo: problema,
  };

  const { error } = await supabase.from("perfil_conversacional").upsert(
    {
      user_id: user.id,
      objetivos,
      horizonte: fila?.horizonte ?? null,
      tolerancia_riesgo: fila?.tolerancia_riesgo ?? null,
      preferencias,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ problema });
}
