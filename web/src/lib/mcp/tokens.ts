import { createHash, randomBytes } from "node:crypto";

const PREFIJO = "palante_";

export function hashTokenMcp(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** El valor en claro solo existe durante esta petición y se devuelve una vez. */
export function generarTokenMcp() {
  const token = PREFIJO + randomBytes(24).toString("base64url");
  return {
    token,
    tokenHash: hashTokenMcp(token),
    prefijo: token.slice(0, PREFIJO.length + 6),
  };
}
