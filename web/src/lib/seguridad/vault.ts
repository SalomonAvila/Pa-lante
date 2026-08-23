import { createHmac, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Vault de identidad (sección 15-16 del pedido): cifra en el servidor los
 * campos más sensibles de `personas` (número de documento, celular) y calcula
 * un identificador seudonimizado para lookups/unicidad sin exponer la cédula
 * en claro en un índice. Dos claves separadas a propósito (sección 18 —
 * separación de secretos): una para cifrar/descifrar, otra solo para el HMAC,
 * nunca la misma. Ninguna de las dos vive en la base de datos.
 */

const ALGORITMO = "aes-256-gcm";

function clave(nombreVar: "PII_ENCRYPTION_KEY" | "PII_HMAC_KEY"): Buffer {
  const valor = process.env[nombreVar];
  if (!valor) {
    throw new Error(
      `Falta ${nombreVar} — genera una con "openssl rand -hex 32" y agrégala a .env.local. Nunca se ` +
        "inventa un valor por defecto para una clave de cifrado de PII.",
    );
  }
  const buffer = Buffer.from(valor, "hex");
  if (buffer.length !== 32) {
    throw new Error(`${nombreVar} debe ser 32 bytes en hex (64 caracteres) — genera una con "openssl rand -hex 32".`);
  }
  return buffer;
}

/** AES-256-GCM. Formato de salida: "iv:tag:ciphertext", todo en base64. */
export function cifrarCampo(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITMO, clave("PII_ENCRYPTION_KEY"), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), cifrado.toString("base64")].join(":");
}

export function descifrarCampo(valorCifrado: string): string {
  const partes = valorCifrado.split(":");
  if (partes.length !== 3) throw new Error("Valor cifrado con formato inválido.");
  const [ivB64, tagB64, cifradoB64] = partes;
  const decipher = createDecipheriv(ALGORITMO, clave("PII_ENCRYPTION_KEY"), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const descifrado = Buffer.concat([decipher.update(Buffer.from(cifradoB64, "base64")), decipher.final()]);
  return descifrado.toString("utf8");
}

/**
 * Identificador seudonimizado estable para un número de documento — nunca
 * `SHA256(cedula)` a secas (espacio de búsqueda pequeño, atacable por fuerza
 * bruta): HMAC-SHA256 con una clave de servidor que nunca sale del backend.
 */
export function hashIdentidad(numeroDocumento: string): string {
  return createHmac("sha256", clave("PII_HMAC_KEY")).update(numeroDocumento).digest("hex");
}
