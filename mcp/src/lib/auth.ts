import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * ÚNICO punto del código que usa la clave secreta de Supabase.
 *
 * Por qué hace falta: un agente llama al MCP sin sesión de navegador, así que
 * no hay JWT de usuario y RLS no puede resolver auth.uid(). Resolvemos el
 * token contra la tabla con la clave secreta y, a partir de ahí, TODA consulta
 * filtra explícitamente por user_id. RLS sigue siendo la red de seguridad del
 * cliente web; acá la disciplina es el filtro explícito.
 */
function clienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { persistSession: false } });
}

const PREFIJO = "palante_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Genera un token nuevo. El valor en claro se muestra UNA sola vez. */
export function generarToken() {
  const token = PREFIJO + randomBytes(24).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    prefijo: token.slice(0, PREFIJO.length + 6),
  };
}

export type ContextoMcp = {
  userId: string;
  tokenId: string | null;
  /** true cuando corre sin base de datos, contra el fixture de demo. */
  demo: boolean;
};

/**
 * Resuelve el Bearer token a un usuario. Devuelve null si el token no existe,
 * está revocado, o no viene.
 *
 * Sin base de datos configurada, acepta MCP_DEMO_TOKEN para poder probar el
 * servidor antes de que exista la ingesta real.
 */
export async function autenticar(
  authorization: string | null,
): Promise<ContextoMcp | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const demoToken = process.env.MCP_DEMO_TOKEN;
  if (demoToken && token === demoToken) {
    return { userId: "demo", tokenId: null, demo: true };
  }

  const supabase = clienteServicio();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id, user_id, revocado_en")
    .eq("token_hash", hashToken(token))
    .is("revocado_en", null)
    .maybeSingle();

  if (error || !data) return null;

  await supabase
    .from("mcp_tokens")
    .update({ ultimo_uso: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id, tokenId: data.id, demo: false };
}

/** Deja rastro de cada lectura para que el usuario sepa quién leyó qué. */
export async function registrarAcceso(
  ctx: ContextoMcp,
  herramienta: string,
  argumentos: unknown,
  exito = true,
): Promise<void> {
  if (ctx.demo) return;
  const supabase = clienteServicio();
  if (!supabase) return;

  await supabase.from("mcp_accesos").insert({
    user_id: ctx.userId,
    token_id: ctx.tokenId,
    herramienta,
    argumentos: argumentos ?? null,
    exito,
  });
}
