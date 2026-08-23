import { beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cifrarCampo, descifrarCampo, hashIdentidad } from "./vault";

beforeAll(() => {
  process.env.PII_ENCRYPTION_KEY = "11".repeat(32);
  process.env.PII_HMAC_KEY = "22".repeat(32);
});

describe("cifrarCampo / descifrarCampo", () => {
  test("cifra y descifra de vuelta al valor original", () => {
    const original = "1023456789";
    const cifrado = cifrarCampo(original);
    expect(cifrado).not.toBe(original);
    expect(descifrarCampo(cifrado)).toBe(original);
  });

  test("dos cifrados del mismo valor no son iguales (IV aleatorio)", () => {
    expect(cifrarCampo("1023456789")).not.toBe(cifrarCampo("1023456789"));
  });
});

describe("hashIdentidad", () => {
  test("es estable para el mismo número de documento", () => {
    expect(hashIdentidad("1023456789")).toBe(hashIdentidad("1023456789"));
  });

  test("nunca es igual a un SHA256 plano del mismo valor (nunca SHA256(cedula) a secas)", () => {
    const shaPlano = createHash("sha256").update("1023456789").digest("hex");
    expect(hashIdentidad("1023456789")).not.toBe(shaPlano);
  });

  test("distintos documentos producen hashes distintos", () => {
    expect(hashIdentidad("1023456789")).not.toBe(hashIdentidad("1023456780"));
  });
});
