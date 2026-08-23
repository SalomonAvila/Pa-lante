/**
 * Contrato para un proveedor real de datos de mercado (precios, volumen,
 * fundamentales) — necesario para que el experto de acciones investigue una
 * empresa con evidencia verificable en vez de texto genérico del modelo.
 *
 * Sin proveedor conectado todavía: `obtenerProveedorMercado()` devuelve
 * `null` a propósito (sección 22 del pedido original — documentar la
 * credencial que falta en vez de inventar un conector o fabricar datos).
 *
 * Para conectar uno real:
 *   1. Implementar `ProveedorMercado` contra la API del proveedor elegido
 *      (ej. Alpha Vantage, Financial Modeling Prep, Twelve Data — todos
 *      tienen tier gratuito razonable para una demo).
 *   2. Agregar la API key a .env.example / .env.local (nunca hardcodeada).
 *   3. Devolver la instancia acá en vez de null.
 * El experto de acciones (expertos/acciones.ts) no necesita cambios: ya
 * está escrito contra esta interfaz.
 */

export type PrecioHistorico = { fecha: string; cierre: number; volumen: number };

export type DatoMercado = {
  ticker: string;
  nombreEmpresa: string | null;
  moneda: string | null;
  precios: PrecioHistorico[] | null;
  fundamentales: Record<string, unknown> | null;
  fuente: string;
  fechaConsulta: string;
};

export interface ProveedorMercado {
  id: string;
  nombre: string;
  obtenerDatos(ticker: string): Promise<DatoMercado | null>;
}

export function obtenerProveedorMercado(): ProveedorMercado | null {
  return null;
}
