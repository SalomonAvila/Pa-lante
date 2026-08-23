import type { EstadoFinanciero } from "@web/types/finance";

/**
 * Estado financiero de ejemplo para el modo demo del servidor MCP
 * (MCP_DEMO_TOKEN) — permite probar las tools sin base de datos ni ingesta
 * real. Datos completamente ficticios (PRODUCT.md prohíbe usar datos reales
 * del equipo en demos), con las mismas dos deudas que supabase/seed.sql usa
 * para la cuenta semilla, así ambos caminos de demo cuentan la misma
 * historia.
 */
export const ESTADO_EJEMPLO: EstadoFinanciero = {
  periodo: { desde: "2026-05-05", hasta: "2026-08-05", meses: 4 },
  ingresoMensual: 3200000,
  gastoMensual: 3410000,
  flujoNeto: -210000,
  gastoPorCategoria: {
    arriendo: 1100000,
    mercado: 520000,
    transporte: 240000,
    "cuotas de deuda": 1050000,
    domicilios: 180000,
    servicios: 145000,
  },
  gastoSinCategorizar: 175000,
  deudas: [
    {
      entidad: "Tarjeta de crédito Bancolombia",
      tipo: "tarjeta",
      saldo: 6400000,
      tasaEA: 28.5,
      cuotaMensual: 1050000,
    },
    {
      entidad: "Crédito de libre inversión Davivienda",
      tipo: "libre inversión",
      saldo: 4100000,
      tasaEA: 17.2,
      cuotaMensual: 100000,
    },
  ],
  calidadDatos: {
    transacciones: 32,
    sinCategorizar: 4,
    confianzaMedia: 0.86,
  },
};
