import type { EstadoFinanciero, Diagnostico, ReglaEvaluada } from "@/types/finance";

/**
 * Router de diagnóstico: reglas EXPLÍCITAS y visibles (principio #1 del
 * producto). Nada aquí es un modelo: son umbrales que se pueden auditar,
 * y el resultado incluye el número observado contra cada umbral.
 *
 * PROVISIONAL: los umbrales vienen de CLAUDE.MD. El dueño del diagnóstico
 * debe confirmarlos y quedarse con este archivo; el MCP solo lo consume.
 */
export const UMBRALES = {
  /** % efectivo anual desde el cual una deuda se considera "de alto costo". */
  tasaAltoCostoEA: 20,
  /** Cuota mensual de deuda cara sobre ingreso mensual. */
  cargaDeudaSobreIngreso: 0.3,
  /** Proporción del gasto sin categorizar que hace inviable planear. */
  gastoSinCategorizarMax: 0.25,
  /** Meses mínimos de historia para que el diagnóstico signifique algo. */
  mesesMinimos: 2,
} as const;

export function diagnosticar(estado: EstadoFinanciero): Diagnostico {
  const cuotaDeudaCara = estado.deudas
    .filter((d) => (d.tasaEA ?? 0) >= UMBRALES.tasaAltoCostoEA)
    .reduce((suma, d) => suma + (d.cuotaMensual ?? 0), 0);

  const cargaDeuda =
    estado.ingresoMensual > 0 ? cuotaDeudaCara / estado.ingresoMensual : 0;

  const proporcionSinCategorizar =
    estado.gastoMensual > 0 ? estado.gastoSinCategorizar / estado.gastoMensual : 0;

  const reglas: ReglaEvaluada[] = [
    {
      id: "deuda-alto-costo",
      descripcion:
        "La cuota mensual de las deudas con tasa alta supera el 30% del ingreso mensual",
      umbral: `> ${UMBRALES.cargaDeudaSobreIngreso * 100}% del ingreso`,
      valorObservado: `${(cargaDeuda * 100).toFixed(1)}% (${formatearCOP(cuotaDeudaCara)} sobre ${formatearCOP(estado.ingresoMensual)})`,
      cumple: cargaDeuda > UMBRALES.cargaDeudaSobreIngreso,
    },
    {
      id: "flujo-negativo",
      descripcion: "El flujo neto mensual es negativo (gasta más de lo que recibe)",
      umbral: "< 0",
      valorObservado: formatearCOP(estado.flujoNeto),
      cumple: estado.flujoNeto < 0,
    },
    {
      id: "gasto-sin-categorizar",
      descripcion:
        "Más del 25% del gasto no está categorizado, así que no hay base para planear",
      umbral: `> ${UMBRALES.gastoSinCategorizarMax * 100}% del gasto`,
      valorObservado: `${(proporcionSinCategorizar * 100).toFixed(1)}%`,
      cumple: proporcionSinCategorizar > UMBRALES.gastoSinCategorizarMax,
    },
  ];

  const cumple = (id: string) => reglas.find((r) => r.id === id)?.cumple ?? false;

  // Orden de precedencia: la deuda cara manda sobre todo lo demás.
  let ruta: Diagnostico["ruta"];
  let razon: string;

  if (cumple("deuda-alto-costo")) {
    ruta = "salida-de-deudas";
    razon =
      "La carga de deuda cara supera el umbral, así que cualquier meta de ahorro rinde menos que pagar esa deuda primero.";
  } else if (cumple("flujo-negativo") || cumple("gasto-sin-categorizar")) {
    ruta = "visibilidad";
    razon = cumple("flujo-negativo")
      ? "El flujo neto es negativo: primero hay que entender a dónde se va la plata."
      : "Falta categorizar una parte grande del gasto: no hay base confiable para proyectar.";
  } else {
    ruta = "meta-de-ahorro";
    razon =
      "Hay flujo positivo y no hay deuda cara dominante, así que se puede definir una meta concreta.";
  }

  const advertencias: string[] = [];

  if (estado.periodo.meses < UMBRALES.mesesMinimos) {
    advertencias.push(
      `Solo hay ${estado.periodo.meses} mes(es) de historia; se recomiendan al menos ${UMBRALES.mesesMinimos} antes de confiar en el diagnóstico.`,
    );
  }
  if (proporcionSinCategorizar > 0.1) {
    advertencias.push(
      `${(proporcionSinCategorizar * 100).toFixed(1)}% del gasto está sin categorizar: las cifras por categoría están incompletas.`,
    );
  }
  if (estado.deudas.some((d) => d.tasaEA == null)) {
    advertencias.push(
      "Hay deudas sin tasa registrada; no se pudieron clasificar como caras o baratas.",
    );
  }

  return { ruta, razon, reglas, advertencias };
}

export function formatearCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
