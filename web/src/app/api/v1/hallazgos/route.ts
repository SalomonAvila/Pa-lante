import { rutaProtegida } from "@/lib/api/ruta";
import { clienteServicio } from "@/lib/api/auth";

const LIMITE_MAX = 200;

export const GET = rutaProtegida(
  "/v1/hallazgos",
  "hallazgos:leer",
  async (ctx, request) => {
    const params = request.nextUrl.searchParams;
    const tipo = params.get("tipo");
    const fuente = params.get("fuente");
    const limite = Math.min(
      Number(params.get("limite") ?? 50) || 50,
      LIMITE_MAX,
    );
    const desplazamiento = Number(params.get("desplazamiento") ?? 0) || 0;

    const supabase = clienteServicio()!;
    let consulta = supabase
      .from("hallazgos_financieros")
      .select("id, tipo, fuente, procedencia, periodo, datos, confianza, creado_en", {
        count: "exact",
      })
      // Filtro explícito por user_id: acá no hay RLS que nos cubra.
      .eq("user_id", ctx.userId)
      .order("creado_en", { ascending: false })
      .range(desplazamiento, desplazamiento + limite - 1);

    if (tipo) consulta = consulta.eq("tipo", tipo);
    if (fuente) consulta = consulta.eq("fuente", fuente);

    const { data, count, error } = await consulta;
    if (error) throw new Error(error.message);

    return {
      hallazgos: data ?? [],
      paginacion: {
        total: count ?? 0,
        limite,
        desplazamiento,
        hay_mas: (count ?? 0) > desplazamiento + (data?.length ?? 0),
      },
    };
  },
);
