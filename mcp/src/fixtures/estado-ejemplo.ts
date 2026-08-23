import type { EstadoFinanciero } from "@web/types/finance";

/**
 * Cuenta semilla de prueba. Datos completamente ficticios: PRODUCT.md prohíbe
 * usar datos reales de nadie del equipo en demos.
 *
 * Este fixture es la fuente temporal del MCP mientras el parser no persiste
 * transacciones. Cuando exista la ingesta real, se reemplaza por una consulta
 * a Supabase — el contrato (EstadoFinanciero) no cambia.
 */
export const ESTADO_EJEMPLO: EstadoFinanciero = {
  periodo: { desde: "2026-05-01", hasta: "2026-08-21", meses: 4 },
  ingresoMensual: 3_200_000,
  gastoMensual: 3_510_000,
  flujoNeto: -310_000,
  gastoPorCategoria: {
    arriendo: 1_100_000,
    mercado: 520_000,
    transporte: 240_000,
    "cuotas de deuda": 1_150_000,
    domicilios: 180_000,
    servicios: 145_000,
  },
  gastoSinCategorizar: 175_000,
  deudas: [
    {
      entidad: "Tarjeta de crédito Bancolombia",
      tipo: "tarjeta",
      saldo: 6_400_000,
      tasaEA: 28.5,
      cuotaMensual: 1_050_000,
    },
    {
      entidad: "Crédito de libre inversión Davivienda",
      tipo: "libre inversión",
      saldo: 4_100_000,
      tasaEA: 17.2,
      cuotaMensual: 100_000,
    },
  ],
  calidadDatos: {
    transacciones: 214,
    sinCategorizar: 12,
    confianzaMedia: 0.87,
  },
};
