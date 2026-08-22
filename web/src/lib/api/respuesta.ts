import { NextResponse } from "next/server";

const DOCS = "https://pa-lante-web.vercel.app/docs";

/**
 * Forma única de error para toda la API. Un consumidor debe poder ramificar
 * por `code` sin parsear prosa, y un humano debe entender qué pasó sin abrir
 * la documentación — por eso van los dos.
 */
export type CodigoError =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "server_error";

const ESTADO: Record<CodigoError, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_request: 422,
  server_error: 500,
};

export function idPeticion(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function ok<T>(datos: T, reqId: string, extra?: HeadersInit) {
  return NextResponse.json(datos, {
    headers: { "X-Request-Id": reqId, "Cache-Control": "no-store", ...extra },
  });
}

export function error(
  code: CodigoError,
  detail: string,
  reqId: string,
  extra?: { scopeRequerido?: string },
) {
  const status = ESTADO[code];
  const headers: Record<string, string> = {
    "X-Request-Id": reqId,
    "Cache-Control": "no-store",
  };

  // Un 401 sin WWW-Authenticate obliga al cliente a adivinar cómo autenticarse.
  if (code === "unauthorized") {
    headers["WWW-Authenticate"] = 'Bearer realm="palante"';
  }
  if (code === "forbidden" && extra?.scopeRequerido) {
    headers["WWW-Authenticate"] =
      `Bearer realm="palante", error="insufficient_scope", scope="${extra.scopeRequerido}"`;
  }

  return NextResponse.json(
    {
      error: {
        code,
        detail,
        ...(extra?.scopeRequerido ? { scope_requerido: extra.scopeRequerido } : {}),
        request_id: reqId,
        docs: DOCS,
      },
    },
    { status, headers },
  );
}
