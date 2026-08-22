import type { EntradaPerfilFinanciero } from "../perfil-financiero";
import type { ObjetivoAccesoFinanciero } from "../../../types/finance";

const MESES = [
  { mes: "2026-03", ingreso: 3_600_000, gasto: 2_400_000, cuenta: "Nequi" },
  { mes: "2026-04", ingreso: 3_800_000, gasto: 2_500_000, cuenta: "Bancolombia" },
  { mes: "2026-05", ingreso: 3_900_000, gasto: 2_550_000, cuenta: "Nequi" },
  { mes: "2026-06", ingreso: 4_000_000, gasto: 2_600_000, cuenta: "Bancolombia" },
  { mes: "2026-07", ingreso: 4_150_000, gasto: 2_650_000, cuenta: "Nequi" },
  { mes: "2026-08", ingreso: 4_300_000, gasto: 2_600_000, cuenta: "Bancolombia" },
] as const;

/**
 * Historia completamente ficticia para la demo. Daniela trabaja por cuenta
 * propia y necesita demostrar capacidad económica para un arriendo sin
 * entregar sus extractos ni su historial de compras al tercero.
 */
/**
 * El objetivo vive fuera del perfil: es el insumo de una vista de
 * divulgación, no parte del contexto financiero de la persona.
 */
export const OBJETIVO_DANIELA: ObjetivoAccesoFinanciero = {
  tipo: "demostrar_capacidad_arriendo",
  descripcion:
    "Demostrar capacidad económica para arrendar una vivienda sin compartir transacciones personales.",
  canonMensualObjetivo: 1_300_000,
  ingresoMensualDeclarado: 4_200_000,
  fechaObjetivo: "2026-09-15",
};

export const ENTRADA_DANIELA: EntradaPerfilFinanciero = {
  generadoEn: "2026-08-22T15:00:00.000Z",
  transacciones: MESES.flatMap(({ mes, ingreso, gasto, cuenta }, indice) => [
    {
      id: `tx-ingreso-${mes}`,
      fecha: `${mes}-05`,
      monto: ingreso,
      tipo: "ingreso" as const,
      comercioRaw: "ABONOS DE CLIENTES CONSOLIDADOS",
      comercioNorm: "Ingresos actividad independiente",
      categoria: "ingresos independientes",
      cuenta,
      fuente: indice % 2 === 0 ? ("gmail" as const) : ("pdf" as const),
      confianza: 0.94,
    },
    {
      id: `tx-gasto-${mes}`,
      fecha: `${mes}-25`,
      monto: gasto,
      tipo: "gasto" as const,
      comercioRaw: "GASTOS NORMALIZADOS DEL MES",
      comercioNorm: "Gastos del hogar",
      categoria: "gastos del hogar",
      cuenta,
      fuente: indice % 2 === 0 ? ("gmail" as const) : ("pdf" as const),
      confianza: 0.91,
    },
  ]),
  deudas: [
    {
      id: "deuda-bancolombia-1",
      entidad: "Bancolombia",
      tipo: "tarjeta",
      saldo: 8_000_000,
      tasaEA: 24.5,
      cuotaMensual: 650_000,
      fuente: "DataCrédito",
      confianza: 0.95,
      actualizadoEn: "2026-08-20T12:00:00.000Z",
    },
  ],
  hallazgos: [
    {
      id: "ingreso-declarado-whatsapp",
      tipo: "income",
      fuente: "WhatsApp",
      procedencia: "declarado",
      periodo: "2026-08",
      datos: { valor_mensual: 4_200_000, concepto: "Ingreso independiente" },
      confianza: 1,
      creadoEn: "2026-08-22T14:00:00.000Z",
    },
    {
      id: "ingreso-dian-2025",
      tipo: "income",
      fuente: "DIAN",
      procedencia: "observado",
      periodo: "2025",
      datos: { valor_anual: 49_200_000, concepto: "Ingreso fiscal anual" },
      confianza: 0.85,
      creadoEn: "2026-08-22T14:20:00.000Z",
    },
    {
      id: "deuda-duplicada-datacredito",
      tipo: "liability",
      fuente: "DataCrédito",
      procedencia: "observado",
      periodo: "2026-08",
      datos: {
        entidad: "Bancolombia",
        tipo: "tarjeta",
        saldo: 8_000_000,
        tasa_ea: 24.5,
        cuota_mensual: 650_000,
      },
      confianza: 0.95,
      creadoEn: "2026-08-20T12:00:00.000Z",
    },
    {
      id: "reporte-credito-daniela",
      tipo: "credit_report",
      fuente: "DataCrédito",
      procedencia: "observado",
      periodo: "2026-08",
      datos: { obligaciones_activas: 1 },
      confianza: 0.95,
      creadoEn: "2026-08-20T12:00:00.000Z",
    },
  ],
};
