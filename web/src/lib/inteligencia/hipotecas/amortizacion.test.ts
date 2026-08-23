import { describe, expect, test } from "bun:test";
import { calcularAmortizacion, simularAbonoExtraordinario, tasaMensualDesdeEA } from "./amortizacion";

describe("tasaMensualDesdeEA", () => {
  test("12% E.A. equivale a ~0.9489% mensual (conversión exacta, no /12)", () => {
    expect(tasaMensualDesdeEA(12)).toBeCloseTo(0.009489, 5);
  });

  test("0% E.A. es 0% mensual", () => {
    expect(tasaMensualDesdeEA(0)).toBe(0);
  });
});

describe("calcularAmortizacion", () => {
  test("cuota fija razonable para un crédito típico", () => {
    const resultado = calcularAmortizacion({ montoSolicitado: 350_000_000, tasaEA: 12.8, plazoMeses: 240 });
    // El total pagado siempre debe superar el monto solicitado (hay interés).
    expect(resultado.totalPagado).toBeGreaterThan(350_000_000);
    expect(resultado.totalIntereses).toBe(resultado.totalPagado - 350_000_000);
    expect(resultado.cuotaMensual).toBeGreaterThan(0);
  });

  test("con tasa 0%, la cuota es simplemente monto / plazo, sin intereses", () => {
    const resultado = calcularAmortizacion({ montoSolicitado: 120_000_000, tasaEA: 0, plazoMeses: 120 });
    expect(resultado.cuotaMensual).toBe(1_000_000);
    expect(resultado.totalIntereses).toBe(0);
  });

  test("a mayor tasa, mayor cuota (mismo monto y plazo)", () => {
    const bajo = calcularAmortizacion({ montoSolicitado: 300_000_000, tasaEA: 8, plazoMeses: 180 });
    const alto = calcularAmortizacion({ montoSolicitado: 300_000_000, tasaEA: 15, plazoMeses: 180 });
    expect(alto.cuotaMensual).toBeGreaterThan(bajo.cuotaMensual);
  });
});

describe("simularAbonoExtraordinario", () => {
  const escenario = { montoSolicitado: 300_000_000, tasaEA: 12, plazoMeses: 240 };

  test("reducir_plazo: el plazo nuevo es menor al original y hay ahorro de intereses", () => {
    const resultado = simularAbonoExtraordinario(escenario, 20_000_000, "reducir_plazo");
    expect(resultado.plazoNuevoMeses).not.toBeNull();
    expect(resultado.plazoNuevoMeses!).toBeLessThan(escenario.plazoMeses);
    expect(resultado.interesesAhorrados).toBeGreaterThan(0);
  });

  test("reducir_cuota: la cuota nueva es menor a la original, el plazo no cambia", () => {
    const resultado = simularAbonoExtraordinario(escenario, 20_000_000, "reducir_cuota");
    expect(resultado.plazoNuevoMeses).toBe(escenario.plazoMeses);
    expect(resultado.cuotaNueva).not.toBeNull();
    expect(resultado.cuotaNueva!).toBeLessThan(resultado.cuotaOriginal);
  });

  test("sin abono (0), el ahorro de intereses es insignificante (redondeo de la simulación mes a mes)", () => {
    const resultado = simularAbonoExtraordinario(escenario, 0, "reducir_plazo");
    // La simulación mes a mes acumula un redondeo distinto al de la fórmula
    // cerrada de calcularAmortizacion — la tolerancia es sobre pesos en un
    // crédito de cientos de millones, no sobre el resultado en sí.
    expect(Math.abs(resultado.interesesAhorrados)).toBeLessThan(1000);
  });
});
