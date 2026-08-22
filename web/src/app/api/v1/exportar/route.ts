import { rutaProtegida } from "@/lib/api/ruta";
import { clienteServicio } from "@/lib/api/auth";

/**
 * Exportación completa. Si los datos son del usuario, tiene que poder
 * llevárselos enteros y sin pedir permiso — incluida la bitácora de quién
 * los leyó.
 */
export const GET = rutaProtegida("/v1/exportar", "exportar", async (ctx) => {
  const supabase = clienteServicio()!;

  const tablas = ["transacciones", "deudas", "hallazgos_financieros", "mcp_accesos"] as const;
  const resultados = await Promise.all(
    tablas.map((tabla) =>
      supabase.from(tabla).select("*").eq("user_id", ctx.userId),
    ),
  );

  const datos = Object.fromEntries(
    tablas.map((tabla, i) => [tabla, resultados[i].data ?? []]),
  );

  return {
    exportado_en: new Date().toISOString(),
    formato: "palante.export.v1",
    datos,
  };
});
