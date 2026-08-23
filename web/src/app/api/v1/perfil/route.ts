import { rutaProtegidaConScopes } from "@/lib/api/ruta";
import { clienteServicio } from "@/lib/api/auth";
import { obtenerPerfilFinanciero } from "@/lib/perfil/obtener-perfil";
import { filtrarPerfilBasePorScopes, filtrarPerfilPorScopes, obtenerUltimoPerfilGenerado } from "@/lib/perfil/perfil-generado";
import { SCOPES_PERFIL } from "@/lib/api/scopes";

export const GET = rutaProtegidaConScopes("/v1/perfil", ["perfil:leer", ...SCOPES_PERFIL], async (ctx) => {
  const supabase = clienteServicio()!;
  const ultimo = await obtenerUltimoPerfilGenerado(supabase, ctx.userId);
  if (ultimo?.perfil?.version === "1.1") return { perfil: filtrarPerfilPorScopes(ultimo.perfil, ctx.scopes) };
  const { perfil } = await obtenerPerfilFinanciero(supabase, ctx.userId);
  return { perfil: filtrarPerfilBasePorScopes(perfil, ctx.scopes) };
});
