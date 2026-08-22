import { createClient } from "@supabase/supabase-js";
import { hashTokenMcp } from "@/lib/mcp/tokens";
import { tieneScope, type Scope } from "@/lib/api/scopes";

/**
 * Único punto de la web app que usa la clave de servicio.
 *
 * Un cliente de API llama sin sesión de navegador, así que no hay `auth.uid()`
 * y RLS no puede resolver nada. Resolvemos el token acá y, de ahí en adelante,
 * TODA consulta filtra explícitamente por `user_id`.
 */
export function clienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { persistSession: false } });
}

export type ContextoApi = {
  userId: string;
  tokenId: string;
  scopes: string[];
};

export type ResultadoAuth =
  | { ok: true; ctx: ContextoApi }
  | { ok: false; motivo: "sin_token" | "token_invalido" | "expirado" | "sin_config" };

export async function autenticarPeticion(
  request: Request,
): Promise<ResultadoAuth> {
  const bruto = request.headers.get("authorization");
  const token = bruto?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, motivo: "sin_token" };

  const supabase = clienteServicio();
  if (!supabase) return { ok: false, motivo: "sin_config" };

  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id, user_id, scopes, expira_en")
    .eq("token_hash", hashTokenMcp(token))
    .is("revocado_en", null)
    .maybeSingle();

  if (error || !data) return { ok: false, motivo: "token_invalido" };

  if (data.expira_en && new Date(data.expira_en) < new Date()) {
    return { ok: false, motivo: "expirado" };
  }

  await supabase
    .from("mcp_tokens")
    .update({ ultimo_uso: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok: true,
    ctx: {
      userId: data.user_id,
      tokenId: data.id,
      scopes: (data.scopes as string[] | null) ?? [],
    },
  };
}

export function autoriza(ctx: ContextoApi, scope: Scope): boolean {
  return tieneScope(ctx.scopes, scope);
}

/** Deja rastro de cada lectura: es lo que el dueño ve y puede revocar. */
export async function registrarAccesoApi(
  ctx: ContextoApi,
  recurso: string,
  scope: Scope,
  exito = true,
) {
  const supabase = clienteServicio();
  if (!supabase) return;
  await supabase.from("mcp_accesos").insert({
    user_id: ctx.userId,
    token_id: ctx.tokenId,
    herramienta: recurso,
    canal: "api",
    scope_usado: scope,
    exito,
  });
}
