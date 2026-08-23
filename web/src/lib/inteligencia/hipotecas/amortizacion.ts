/**
 * Matemática de amortización de crédito hipotecario — determinística, sin
 * caja negra: el experto de hipotecario le pasa esto ya calculado al modelo
 * para que solo interprete, nunca para que invente una cuota o un ahorro.
 *
 * Sistema francés (cuota fija en pesos, la más común en Colombia para
 * crédito hipotecario en pesos). UVR se trata aparte: sin un feed en vivo
 * del valor de la UVR (lo publica el Banco de la República día a día), acá
 * solo se explica el concepto (ver fixtures/conocimiento/pesos-vs-uvr.md);
 * no se simula una amortización en UVR con una conversión inventada.
 */

export type EscenarioCredito = {
  montoSolicitado: number;
  tasaEA: number; // % efectiva anual, ej. 12.5
  plazoMeses: number;
};

export type ResultadoAmortizacion = {
  cuotaMensual: number;
  totalPagado: number;
  totalIntereses: number;
  tasaMensualEquivalente: number;
};

/** Tasa mensual equivalente a una tasa efectiva anual (conversión exacta, no aproximada). */
export function tasaMensualDesdeEA(tasaEA: number): number {
  return Math.pow(1 + tasaEA / 100, 1 / 12) - 1;
}

/** Cuota fija (sistema francés) para un crédito a tasa y plazo dados. */
export function calcularAmortizacion(escenario: EscenarioCredito): ResultadoAmortizacion {
  const { montoSolicitado, tasaEA, plazoMeses } = escenario;
  const i = tasaMensualDesdeEA(tasaEA);

  const cuotaMensual =
    i === 0 ? montoSolicitado / plazoMeses : (montoSolicitado * i) / (1 - Math.pow(1 + i, -plazoMeses));

  const totalPagado = cuotaMensual * plazoMeses;

  return {
    cuotaMensual: Math.round(cuotaMensual),
    totalPagado: Math.round(totalPagado),
    totalIntereses: Math.round(totalPagado - montoSolicitado),
    tasaMensualEquivalente: Number((i * 100).toFixed(4)),
  };
}

export type ResultadoAbonoExtraordinario = {
  modo: "reducir_plazo" | "reducir_cuota";
  plazoOriginalMeses: number;
  plazoNuevoMeses: number | null;
  cuotaOriginal: number;
  cuotaNueva: number | null;
  interesesAhorrados: number;
};

/**
 * Simula abonos extraordinarios anuales al saldo (aplicados a capital),
 * amortizando mes a mes hasta que el saldo llegue a cero. `reducir_plazo`
 * mantiene la cuota y acorta el crédito; `reducir_cuota` recalcula la cuota
 * cada vez que se abona, manteniendo el plazo original.
 */
export function simularAbonoExtraordinario(
  escenario: EscenarioCredito,
  abonoAnual: number,
  modo: "reducir_plazo" | "reducir_cuota",
): ResultadoAbonoExtraordinario {
  const { montoSolicitado, tasaEA, plazoMeses } = escenario;
  const i = tasaMensualDesdeEA(tasaEA);
  const base = calcularAmortizacion(escenario);

  let saldo = montoSolicitado;
  let cuota = base.cuotaMensual;
  let mes = 0;
  let interesesPagados = 0;
  const MAX_MESES = plazoMeses * 2; // salvaguarda: nunca debería llegar acá con números razonables

  while (saldo > 0 && mes < MAX_MESES) {
    mes++;
    const interes = saldo * i;
    let abonoCapital = cuota - interes;
    if (abonoCapital > saldo) abonoCapital = saldo;
    saldo -= abonoCapital;
    interesesPagados += interes;

    if (mes % 12 === 0 && saldo > 0) {
      const abonoEfectivo = Math.min(abonoAnual, saldo);
      saldo -= abonoEfectivo;
      if (modo === "reducir_cuota" && saldo > 0) {
        const mesesRestantes = plazoMeses - mes;
        if (mesesRestantes > 0) {
          cuota =
            i === 0 ? saldo / mesesRestantes : (saldo * i) / (1 - Math.pow(1 + i, -mesesRestantes));
        }
      }
    }
  }

  return {
    modo,
    plazoOriginalMeses: plazoMeses,
    plazoNuevoMeses: modo === "reducir_plazo" ? mes : plazoMeses,
    cuotaOriginal: base.cuotaMensual,
    cuotaNueva: modo === "reducir_cuota" ? Math.round(cuota) : null,
    interesesAhorrados: Math.round(base.totalIntereses - interesesPagados),
  };
}
