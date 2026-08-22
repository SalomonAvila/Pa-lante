export type Transaccion = {
  fecha: string;
  monto: number;
  tipo: "ingreso" | "gasto";
  comercioRaw: string;
  comercioNorm: string;
  categoria: string;
  cuenta: string;
  fuente: "gmail" | "pdf" | "manual";
  confianza: number;
};

/**
 * Una deuda NO es una transacción: el router de diagnóstico necesita saldo y
 * tasa para decidir si es "de alto costo", y eso no se deriva de movimientos.
 */
export type Deuda = {
  entidad: string;
  tipo: string | null;
  saldo: number;
  tasaEA: number | null;
  cuotaMensual: number | null;
};

export type Plan = {
  meta: string;
  aporteMensual: number;
  pasos: string[];
  supuestos: string[];
  fechaObjetivo: string;
};

/** Foto agregada del contexto financiero. Es lo que consume el MCP. */
export type EstadoFinanciero = {
  periodo: { desde: string; hasta: string; meses: number };
  ingresoMensual: number;
  gastoMensual: number;
  flujoNeto: number;
  gastoPorCategoria: Record<string, number>;
  gastoSinCategorizar: number;
  deudas: Deuda[];
  calidadDatos: {
    transacciones: number;
    sinCategorizar: number;
    confianzaMedia: number;
  };
};

export type ReglaEvaluada = {
  id: string;
  descripcion: string;
  umbral: string;
  valorObservado: string;
  cumple: boolean;
};

export type Diagnostico = {
  ruta: "salida-de-deudas" | "visibilidad" | "meta-de-ahorro";
  razon: string;
  reglas: ReglaEvaluada[];
  advertencias: string[];
};

/**
 * Normalización genérica del perfil financiero extendido (DataCrédito, DIAN,
 * Colpensiones, RUNT, extractos manuales...). En vez de una tabla por tipo
 * (Income, Liability, Asset...) se usa un discriminante `tipo` + trazabilidad,
 * igual que `EstadoFinanciero.calidadDatos` ya trackea confianza por fila.
 */
export type TipoHallazgo =
  | "income"
  | "liability"
  | "asset"
  | "property"
  | "vehicle"
  | "credit_report"
  | "pension"
  | "tax_profile"
  | "company"
  | "fine"
  | "account";

/**
 * declarado = lo dijo el usuario; observado = vino de una fuente/documento;
 * estimado = lo calculó el motor de análisis; confirmado = el usuario lo revisó.
 */
export type ProcedenciaDato = "declarado" | "observado" | "estimado" | "confirmado";

/**
 * Un hallazgo nunca se sobrescribe con datos contradictorios de otra fuente:
 * cada fuente/periodo queda como fila propia (sección 18 del pedido).
 */
export type HallazgoFinanciero = {
  id: string;
  tipo: TipoHallazgo;
  fuente: string;
  procedencia: ProcedenciaDato;
  periodo: string | null;
  datos: Record<string, unknown>;
  confianza: number;
  creadoEn: string;
};
