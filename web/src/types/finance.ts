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

/**
 * Evidencia mínima que acompaña una cifra agregada. El perfil nunca expone el
 * documento o la transacción cruda por defecto: conserva una referencia para
 * que el dueño pueda auditarla dentro de Pa'lante.
 */
export type EvidenciaFinanciera = {
  id: string;
  fuente: string;
  procedencia: ProcedenciaDato;
  periodo: string | null;
  confianza: number;
  actualizadoEn: string;
};

export type UnidadMetrica = "COP" | "porcentaje" | "meses";

/** Una cifra calculada junto con el método y la evidencia que la sustentan. */
export type MetricaVerificable = {
  valor: number | null;
  unidad: UnidadMetrica;
  confianza: number;
  metodo: string;
  evidencia: EvidenciaFinanciera[];
  actualizadoEn: string;
};

/**
 * Meta de acceso, no una solicitud ni una decisión crediticia. Pa'lante
 * demuestra contexto; la entidad receptora conserva sus propias reglas.
 */
export type ObjetivoAccesoFinanciero = {
  tipo: "demostrar_capacidad_arriendo";
  descripcion: string;
  canonMensualObjetivo: number;
  ingresoMensualDeclarado: number;
  fechaObjetivo: string | null;
};

export type EstadoPreparacionPerfil =
  | "sin_datos"
  | "requiere_datos"
  | "listo_para_compartir";

/**
 * Contrato canónico que consumen la web, el chat y el MCP. Es una foto
 * calculada y versionada; las observaciones originales siguen viviendo en
 * transacciones/hallazgos y nunca se sobrescriben.
 */
export type PerfilFinancieroV1 = {
  version: "1.0";
  generadoEn: string;
  periodo: { desde: string; hasta: string; mesesObservados: number };
  ingresos: {
    declarado: MetricaVerificable;
    verificado: MetricaVerificable;
    porcentajeVerificado: MetricaVerificable;
    variacionMensual: MetricaVerificable;
  };
  flujo: {
    gastoMensualObservado: MetricaVerificable;
    flujoLibreObservado: MetricaVerificable;
  };
  obligaciones: {
    deudaTotal: MetricaVerificable;
    cuotaMensual: MetricaVerificable;
    cargaFinanciera: MetricaVerificable;
  };
  objetivoAcceso: ObjetivoAccesoFinanciero | null;
  contextoObjetivo: {
    relacionCanonIngreso: MetricaVerificable;
    /** Describe suficiencia de evidencia, nunca aprobación de un arriendo. */
    estadoPreparacion: EstadoPreparacionPerfil;
  };
  calidadDatos: {
    completitud: number;
    confianza: number;
    fuentesIndependientes: number;
    datosFaltantes: string[];
    advertencias: string[];
  };
};

/**
 * Vista de divulgación mínima para un tercero. Deliberadamente no contiene
 * transacciones, comercios, números de cuenta, documentos ni evidencia IDs.
 */
export type PruebaCapacidadPagoV1 = {
  version: "1.0";
  proposito: "evaluar_capacidad_arriendo";
  emitidoEn: string;
  periodo: PerfilFinancieroV1["periodo"];
  ingresoMensualVerificado: number | null;
  porcentajeIngresoVerificado: number | null;
  variacionMensualIngreso: number | null;
  cargaFinanciera: number | null;
  canonMensualObjetivo: number | null;
  relacionCanonIngreso: number | null;
  confianzaPerfil: number;
  fuentesIndependientes: number;
  estadoPreparacion: EstadoPreparacionPerfil;
};
