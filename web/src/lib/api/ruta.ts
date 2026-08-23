import type { NextRequest } from "next/server";
import { autenticarPeticion, autoriza, registrarAccesoApi, type ContextoApi } from "@/lib/api/auth";
import { error, idPeticion, ok } from "@/lib/api/respuesta";
import type { Scope } from "@/lib/api/scopes";

const MOTIVOS = {
  sin_token:
    "Falta la cabecera Authorization. Envía 'Authorization: Bearer <token>'.",
  token_invalido: "El token no existe o fue revocado.",
  expirado: "El token venció. Genera uno nuevo desde tu cuenta.",
  sin_config: "El servidor no tiene configurado el acceso a la base de datos.",
} as const;

/**
 * Envuelve un handler de la API: autentica, valida el scope, registra el
 * acceso y normaliza errores. Cada ruta se queda solo con su lógica.
 */
export function rutaProtegida<T>(
  recurso: string,
  scope: Scope,
  handler: (ctx: ContextoApi, request: NextRequest) => Promise<T>,
) {
  return async function manejador(request: NextRequest) {
    const reqId = idPeticion();

    const auth = await autenticarPeticion(request);
    if (!auth.ok) {
      const code = auth.motivo === "sin_config" ? "server_error" : "unauthorized";
      return error(code, MOTIVOS[auth.motivo], reqId);
    }

    if (!autoriza(auth.ctx, scope)) {
      await registrarAccesoApi(auth.ctx, recurso, scope, false);
      return error(
        "forbidden",
        `Este token no tiene el scope '${scope}'. Genera uno que lo incluya.`,
        reqId,
        { scopeRequerido: scope },
      );
    }

    try {
      const datos = await handler(auth.ctx, request);
      await registrarAccesoApi(auth.ctx, recurso, scope);
      return ok(datos, reqId);
    } catch (e) {
      await registrarAccesoApi(auth.ctx, recurso, scope, false);
      const detalle =
        e instanceof Error ? e.message : "Error inesperado procesando la petición.";
      return error("server_error", detalle, reqId);
    }
  };
}

export function rutaProtegidaConScopes<T>(
  recurso: string,
  scopes: Scope[],
  handler: (ctx: ContextoApi, request: NextRequest) => Promise<T>,
) {
  return async function manejador(request: NextRequest) {
    const reqId = idPeticion();
    const auth = await autenticarPeticion(request);
    if (!auth.ok) {
      const code = auth.motivo === "sin_config" ? "server_error" : "unauthorized";
      return error(code, MOTIVOS[auth.motivo], reqId);
    }
    const usado = scopes.find((scope) => autoriza(auth.ctx, scope));
    if (!usado) {
      await registrarAccesoApi(auth.ctx, recurso, scopes[0], false);
      return error("forbidden", "Este token no permite leer ninguna sección del perfil.", reqId, { scopeRequerido: scopes.join(" ") });
    }
    try {
      const datos = await handler(auth.ctx, request);
      await registrarAccesoApi(auth.ctx, recurso, usado);
      return ok(datos, reqId);
    } catch (e) {
      await registrarAccesoApi(auth.ctx, recurso, usado, false);
      return error("server_error", e instanceof Error ? e.message : "Error inesperado.", reqId);
    }
  };
}
