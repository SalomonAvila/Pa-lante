import type { ContextoInteligencia } from "@web/lib/inteligencia/tipos";
import { clienteServicio, type ContextoMcp } from "./auth.js";

/**
 * Puente entre el contexto de autenticación del MCP (Bearer token → user_id)
 * y el contexto que espera la capa compartida de inteligencia/. El cliente
 * SIEMPRE sale de clienteServicio() (auth.ts) — nunca se construye acá con
 * la clave secreta directamente.
 *
 * Devuelve null en modo demo: los expertos de inteligencia/ necesitan datos
 * reales de Postgres (hallazgos_financieros, transacciones), no el fixture
 * estático de explicar_diagnostico. Las tools que dependen de esto deben
 * responder con un mensaje claro en vez de fallar en silencio.
 */
export function construirContextoInteligencia(ctx: ContextoMcp): ContextoInteligencia | null {
  if (ctx.demo) return null;

  const supabase = clienteServicio();
  if (!supabase) return null;

  return { userId: ctx.userId, supabase, origen: "mcp" };
}

/** Mensaje uniforme para las tools que necesitan base de datos real (no disponible en modo demo). */
export const MENSAJE_NO_DISPONIBLE_EN_DEMO =
  "Esta herramienta necesita una base de datos real conectada; no está disponible con el token de demo.";
