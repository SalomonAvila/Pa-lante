import { describe, expect, test } from "bun:test";
import { clasificarFuente, techoConfianzaPorTiers } from "./tiers";

describe("clasificarFuente", () => {
  test("fuente oficial observada es tier A", () => {
    expect(clasificarFuente("dian", "observado").tier).toBe("A");
  });

  test("proveedor reconocido observado es tier B", () => {
    expect(clasificarFuente("datacredito", "observado").tier).toBe("B");
    expect(clasificarFuente("transunion", "observado").tier).toBe("B");
  });

  test("dato declarado por el usuario es tier D", () => {
    expect(clasificarFuente("manual", "declarado").tier).toBe("D");
  });

  test("estimación calculada por el sistema es tier D", () => {
    expect(clasificarFuente("regresion_lineal_flujo_neto", "estimado").tier).toBe("D");
  });

  test("transacción observada de una fuente no oficial es tier B, no A", () => {
    expect(clasificarFuente("gmail", "observado").tier).toBe("B");
  });
});

describe("techoConfianzaPorTiers", () => {
  test("sin fuentes, el techo es bajo", () => {
    expect(techoConfianzaPorTiers([])).toBeLessThan(0.5);
  });

  test("la fuente más débil manda: una sola fuente tier D limita todo el conjunto", () => {
    const techo = techoConfianzaPorTiers([
      { fuente: "dian", tier: "A", procedencia: "observado", motivo: "" },
      { fuente: "manual", tier: "D", procedencia: "declarado", motivo: "" },
    ]);
    expect(techo).toBe(0.6);
  });

  test("todo tier A permite un techo alto", () => {
    const techo = techoConfianzaPorTiers([{ fuente: "dian", tier: "A", procedencia: "observado", motivo: "" }]);
    expect(techo).toBeGreaterThan(0.9);
  });
});
