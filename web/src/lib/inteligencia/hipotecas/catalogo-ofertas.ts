/**
 * Catálogo de ofertas hipotecarias — SIMULADO, con el mismo criterio que ya
 * justificó simular DIAN/DataCrédito en web/src/lib/conectores/catalogo.ts:
 * no existe una API pública para que un individuo consulte en vivo las
 * condiciones de crédito hipotecario de cada entidad, y automatizar el
 * scraping de portales bancarios (con CAPTCHA, autenticación, anti-bot)
 * está fuera de lo permitido.
 *
 * Cada oferta es un dato de referencia ilustrativo, no una cotización real.
 * El experto de hipotecario (y el prompt de síntesis del orquestador) deben
 * dejar esto explícito siempre: SIMULACIÓN ≠ PREAPROBACIÓN ≠ OFERTA REAL.
 * Reemplazar esto por datos reales es cambiar este archivo, no el resto del
 * experto — mismo patrón que catalogo.ts/guiones.ts.
 */
export type OfertaHipotecaria = {
  banco: string;
  producto: string;
  modalidad: "tasa_fija_pesos" | "uvr";
  tasaEA: number;
  plazoMaximoMeses: number;
  financiacionMaximaPct: number;
  condiciones: string[];
};

export const CATALOGO_OFERTAS_HIPOTECARIAS: OfertaHipotecaria[] = [
  {
    banco: "Bancolombia",
    producto: "Crédito de Vivienda VIS/No VIS",
    modalidad: "tasa_fija_pesos",
    tasaEA: 12.8,
    plazoMaximoMeses: 240,
    financiacionMaximaPct: 70,
    condiciones: ["Cuota inicial mínima 30%", "Seguro de vida deudores y todo riesgo obligatorios"],
  },
  {
    banco: "Davivienda",
    producto: "Crédito Hipotecario Tradicional",
    modalidad: "tasa_fija_pesos",
    tasaEA: 13.1,
    plazoMaximoMeses: 180,
    financiacionMaximaPct: 70,
    condiciones: ["Cuota inicial mínima 30%", "Antigüedad laboral mínima 12 meses"],
  },
  {
    banco: "Banco de Bogotá",
    producto: "Crédito Hipotecario en UVR",
    modalidad: "uvr",
    tasaEA: 7.9,
    plazoMaximoMeses: 240,
    financiacionMaximaPct: 70,
    condiciones: [
      "Cuota inicial mínima 30%",
      "El saldo se ajusta diariamente por UVR (inflación) — la cuota en pesos varía mes a mes",
    ],
  },
  {
    banco: "BBVA Colombia",
    producto: "Crédito de Vivienda",
    modalidad: "tasa_fija_pesos",
    tasaEA: 12.5,
    plazoMaximoMeses: 240,
    financiacionMaximaPct: 80,
    condiciones: ["Financiación hasta 80% solo para vivienda VIS", "Cuota inicial mínima 20% en VIS"],
  },
];
