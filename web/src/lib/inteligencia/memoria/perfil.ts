import type { ContextoInteligencia } from "../tipos";

/**
 * Memoria financiera (sección 3 del pedido: modelo ≠ memoria). Solo
 * preferencias y contexto declarado por el usuario — objetivos, horizonte,
 * tolerancia al riesgo — NUNCA cifras financieras crudas (esas siguen
 * viviendo en transacciones/deudas/hallazgos_financieros). Se recupera y se
 * le entrega al modelo como contexto cuando hace falta, sin reentrenar nada.
 */
export type PerfilConversacional = {
  objetivos: string[];
  horizonte: string | null;
  toleranciaRiesgo: string | null;
  preferencias: Record<string, unknown>;
};

type FilaPerfil = {
  objetivos: string[];
  horizonte: string | null;
  tolerancia_riesgo: string | null;
  preferencias: Record<string, unknown>;
};

const PERFIL_VACIO: PerfilConversacional = {
  objetivos: [],
  horizonte: null,
  toleranciaRiesgo: null,
  preferencias: {},
};

export async function obtenerPerfilConversacional(ctx: ContextoInteligencia): Promise<PerfilConversacional> {
  const { data, error } = await ctx.supabase
    .from("perfil_conversacional")
    .select("objetivos, horizonte, tolerancia_riesgo, preferencias")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el perfil conversacional: ${error.message}`);
  if (!data) return PERFIL_VACIO;

  const fila = data as FilaPerfil;
  return {
    objetivos: fila.objetivos ?? [],
    horizonte: fila.horizonte,
    toleranciaRiesgo: fila.tolerancia_riesgo,
    preferencias: fila.preferencias ?? {},
  };
}

/**
 * Actualiza solo los campos que vienen definidos — nunca borra algo que el
 * usuario ya había declarado solo porque esta conversación no lo repitió.
 * `objetivos` es la excepción: si viene un arreglo nuevo, se agrega (unión)
 * en vez de reemplazar, para no perder objetivos declarados antes.
 */
export async function actualizarPerfilConversacional(
  ctx: ContextoInteligencia,
  cambios: Partial<{ objetivosNuevos: string[]; horizonte: string; toleranciaRiesgo: string; preferencias: Record<string, unknown> }>,
): Promise<void> {
  const actual = await obtenerPerfilConversacional(ctx);

  const objetivos = cambios.objetivosNuevos
    ? [...new Set([...actual.objetivos, ...cambios.objetivosNuevos])]
    : actual.objetivos;

  const { error } = await ctx.supabase.from("perfil_conversacional").upsert(
    {
      user_id: ctx.userId,
      objetivos,
      horizonte: cambios.horizonte ?? actual.horizonte,
      tolerancia_riesgo: cambios.toleranciaRiesgo ?? actual.toleranciaRiesgo,
      preferencias: cambios.preferencias ? { ...actual.preferencias, ...cambios.preferencias } : actual.preferencias,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) console.error("No se pudo actualizar el perfil conversacional:", error.message);
}
