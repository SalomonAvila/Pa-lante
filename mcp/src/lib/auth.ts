import { createClient } from "@supabase/supabase-js";
import { hashTokenMcp } from "@web/lib/mcp/tokens.js";

/**
 * ÚNICO punto del código que construye un cliente con la clave secreta de
 * Supabase — todo lo demás en mcp/ (estado.ts, las tools de
 * inteligencia/...) pide el cliente ya armado acá, nunca lee
 * SUPABASE_SERVICE_ROLE_KEY directamente.
 *
 * Por qué hace falta: un agente llama al MCP sin sesión de navegador, así que
 * no hay JWT de usuario y RLS no puede resolver auth.uid(). Resolvemos el
 * token contra la tabla con la clave secreta y, a partir de ahí, TODA consulta
 * filtra explícitamente por user_id. RLS sigue siendo la red de seguridad del
 * cliente web; acá la disciplina es el filtro explícito.
 */
export function clienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { persistSession: false } });
}

/**
 * Cliente interno para herramientas MCP que ya recibieron un ContextoMcp
 * autenticado. El caller debe filtrar cada consulta por ctx.userId porque la
 * clave de servicio no está cubierta por RLS.
 */
export function clienteServicioMcp() {
  return clienteServicio();
}

export type ContextoMcp = {
  userId: string;
  tokenId: string | null;
  /** true cuando corre sin base de datos, contra el fixture de demo. */
  demo: boolean;
  scopes: string[];
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
    return { userId: "demo", tokenId: null, demo: true, scopes: ["perfil:leer", "hallazgos:leer", "cobertura:leer", "prueba:generar", "exportar"] };
  }

  const supabase = clienteServicio();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id, user_id, scopes, expira_en, revocado_en")
    .eq("token_hash", hashTokenMcp(token))
    .is("revocado_en", null)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expira_en && new Date(data.expira_en) < new Date()) return null;

  await supabase
    .from("mcp_tokens")
    .update({ ultimo_uso: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id, tokenId: data.id, demo: false, scopes: (data.scopes as string[] | null) ?? [] };
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
