import type {
  CoberturaPerfil,
  Deuda,
  EstadoPreparacionPerfil,
  EvidenciaFinanciera,
  HallazgoFinanciero,
  MetricaVerificable,
  ObjetivoAccesoFinanciero,
  PerfilFinancieroV1,
  PruebaCapacidadPagoV1,
  Transaccion,
  TipoHallazgo,
  UnidadMetrica,
} from "../../types/finance";

export type TransaccionConId = Transaccion & { id: string };
export type DeudaConEvidencia = Deuda & {
  id: string;
  fuente: string;
  confianza: number;
  actualizadoEn: string;
};

export type EntradaPerfilFinanciero = {
  transacciones: TransaccionConId[];
  deudas: DeudaConEvidencia[];
  hallazgos: HallazgoFinanciero[];
  generadoEn: string;
};

type ValorConEvidencia = {
  valor: number;
  evidencia: EvidenciaFinanciera[];
};

export function construirPerfilFinanciero(
  entrada: EntradaPerfilFinanciero,
): PerfilFinancieroV1 {
  const meses = agruparTransaccionesPorMes(entrada.transacciones);
  const ingresosPorMes = [...meses.values()].map((mes) => mes.ingresos);
  const gastosPorMes = [...meses.values()].map((mes) => mes.gastos);
  const transaccionesIngreso = entrada.transacciones.filter((t) => t.tipo === "ingreso");
  const transaccionesGasto = entrada.transacciones.filter((t) => t.tipo === "gasto");

  const ingresoDeclarado = obtenerIngresoDeclarado(entrada);
  const ingresoVerificado = obtenerIngresoVerificado(entrada, ingresosPorMes);
  const gastoMensual = promedio(gastosPorMes);
  const variacionIngreso = coeficienteVariacion(ingresosPorMes);
  const porcentajeVerificado =
    ingresoDeclarado.valor > 0 && ingresoVerificado.valor > 0
      ? Math.min(100, (ingresoVerificado.valor / ingresoDeclarado.valor) * 100)
      : 0;

  const deudas = resolverDeudas(entrada);
  const deudaTotal = deudas.reduce((suma, deuda) => suma + deuda.saldo, 0);
  const cuotaMensual = deudas.reduce(
    (suma, deuda) => suma + (deuda.cuotaMensual ?? 0),
    0,
  );
  const cargaFinanciera =
    ingresoVerificado.valor > 0 ? (cuotaMensual / ingresoVerificado.valor) * 100 : 0;
  const flujoLibre = ingresoVerificado.valor - gastoMensual;

  const { patrimonioTotal, patrimonioPorTipo, evidenciaPatrimonio } =
    resolverPatrimonio(entrada.hallazgos);

  const evidenciaIngresos = transaccionesIngreso.map(evidenciaDeTransaccion);
  const evidenciaGastos = transaccionesGasto.map(evidenciaDeTransaccion);
  const evidenciaDeudas = deudas.flatMap((deuda) => deuda.evidencia);
  const actualizadoEn = entrada.generadoEn;

  const datosFaltantes: string[] = [];
  if (ingresoDeclarado.valor <= 0) datosFaltantes.push("ingreso_declarado");
  if (ingresoVerificado.valor <= 0) datosFaltantes.push("ingreso_observado");
  if (ingresosPorMes.length < 3) datosFaltantes.push("historia_ingresos_3_meses");
  if (!tieneEvidenciaObligaciones(entrada)) datosFaltantes.push("obligaciones_confirmadas");
  if (patrimonioPorTipo.length === 0) datosFaltantes.push("patrimonio");

  const SENALES = 5;
  const senalesCompletas = SENALES - datosFaltantes.length;
  const completitud = Math.max(0, Math.round((senalesCompletas / SENALES) * 100));
  const todaLaEvidencia = [
    ...ingresoDeclarado.evidencia,
    ...ingresoVerificado.evidencia,
    ...evidenciaGastos,
    ...evidenciaDeudas,
  ];
  const confianza = redondear(
    todaLaEvidencia.length > 0
      ? promedio(todaLaEvidencia.map((e) => e.confianza))
      : 0,
    2,
  );
  const fuentesIndependientes = new Set(
    todaLaEvidencia.map((evidencia) => evidencia.fuente),
  ).size;

  const advertencias: string[] = [];
  if (porcentajeVerificado < 70 && ingresoDeclarado.valor > 0) {
    advertencias.push(
      "Menos del 70% del ingreso declarado está respaldado por datos observados.",
    );
  }
  if (variacionIngreso > 25) {
    advertencias.push(
      "El ingreso cambia más de 25% entre meses; una sola cifra mensual no representa toda la historia.",
    );
  }
  if (ingresosPorMes.length < 3) {
    advertencias.push("Se requieren al menos tres meses de ingresos para medir estabilidad.");
  }

  // Preparación general del perfil: si es suficiente para un propósito
  // concreto lo decide cada vista de divulgación, no el núcleo.
  const estadoPreparacion: EstadoPreparacionPerfil =
    ingresoVerificado.valor <= 0
      ? "sin_datos"
      : ingresosPorMes.length >= 3 && porcentajeVerificado >= 70
        ? "listo_para_compartir"
        : "requiere_datos";

  return {
    version: "1.0",
    generadoEn: entrada.generadoEn,
    periodo: construirPeriodo(entrada.transacciones),
    ingresos: {
      declarado: metrica(
        ingresoDeclarado.valor,
        "COP",
        "Último ingreso mensual declarado o confirmado por la persona.",
        ingresoDeclarado.evidencia,
        actualizadoEn,
      ),
      verificado: metrica(
        ingresoVerificado.valor,
        "COP",
        ingresoVerificado.metodo,
        ingresoVerificado.evidencia,
        actualizadoEn,
      ),
      porcentajeVerificado: metrica(
        porcentajeVerificado,
        "porcentaje",
        "Ingreso mensual verificado dividido por ingreso mensual declarado, limitado a 100%.",
        [...ingresoDeclarado.evidencia, ...ingresoVerificado.evidencia],
        actualizadoEn,
      ),
      variacionMensual: metrica(
        variacionIngreso,
        "porcentaje",
        "Coeficiente de variación de los ingresos mensuales observados.",
        evidenciaIngresos,
        actualizadoEn,
      ),
    },
    flujo: {
      gastoMensualObservado: metrica(
        gastoMensual,
        "COP",
        "Promedio del gasto total de los meses observados.",
        evidenciaGastos,
        actualizadoEn,
      ),
      flujoLibreObservado: metrica(
        flujoLibre,
        "COP",
        "Ingreso mensual verificado menos gasto mensual observado.",
        [...ingresoVerificado.evidencia, ...evidenciaGastos],
        actualizadoEn,
      ),
    },
    obligaciones: {
      deudaTotal: metrica(
        deudaTotal,
        "COP",
        "Suma de obligaciones deduplicadas por entidad y saldo.",
        evidenciaDeudas,
        actualizadoEn,
      ),
      cuotaMensual: metrica(
        cuotaMensual,
        "COP",
        "Suma de las cuotas mensuales conocidas de obligaciones deduplicadas.",
        evidenciaDeudas,
        actualizadoEn,
      ),
      cargaFinanciera: metrica(
        cargaFinanciera,
        "porcentaje",
        "Cuotas mensuales conocidas divididas por ingreso mensual verificado.",
        [...evidenciaDeudas, ...ingresoVerificado.evidencia],
        actualizadoEn,
      ),
    },
    patrimonio: {
      total: metrica(
        patrimonioTotal,
        "COP",
        "Suma de activos, propiedades y vehículos reportados por las fuentes.",
        evidenciaPatrimonio,
        actualizadoEn,
      ),
      porTipo: patrimonioPorTipo,
    },
    cobertura: calcularCobertura(entrada.hallazgos),
    calidadDatos: {
      completitud,
      confianza,
      fuentesIndependientes,
      estadoPreparacion,
      datosFaltantes,
      advertencias,
    },
  };
}

export function crearPruebaCapacidadPago(
  perfil: PerfilFinancieroV1,
  objetivo: ObjetivoAccesoFinanciero | null,
): PruebaCapacidadPagoV1 {
  const ingreso = perfil.ingresos.verificado.valor;
  const canon = objetivo?.canonMensualObjetivo ?? null;
  const relacionCanonIngreso =
    canon != null && ingreso != null && ingreso > 0
      ? redondear((canon / ingreso) * 100, 1)
      : null;

  return {
    version: "1.0",
    proposito: "evaluar_capacidad_arriendo",
    emitidoEn: perfil.generadoEn,
    periodo: perfil.periodo,
    ingresoMensualVerificado: perfil.ingresos.verificado.valor,
    porcentajeIngresoVerificado: perfil.ingresos.porcentajeVerificado.valor,
    variacionMensualIngreso: perfil.ingresos.variacionMensual.valor,
    cargaFinanciera: perfil.obligaciones.cargaFinanciera.valor,
    canonMensualObjetivo: canon,
    relacionCanonIngreso,
    confianzaPerfil: perfil.calidadDatos.confianza,
    fuentesIndependientes: perfil.calidadDatos.fuentesIndependientes,
    estadoPreparacion: perfil.calidadDatos.estadoPreparacion,
  };
}

function metrica(
  valor: number | null,
  unidad: UnidadMetrica,
  metodo: string,
  evidencia: EvidenciaFinanciera[],
  actualizadoEn: string,
): MetricaVerificable {
  return {
    valor: valor == null ? null : redondear(valor, unidad === "COP" ? 0 : 2),
    unidad,
    confianza: redondear(
      evidencia.length > 0 ? promedio(evidencia.map((item) => item.confianza)) : 0,
      2,
    ),
    metodo,
    evidencia,
    actualizadoEn,
  };
}

function obtenerIngresoDeclarado(entrada: EntradaPerfilFinanciero): ValorConEvidencia {
  const candidatos = entrada.hallazgos
    .filter(
      (hallazgo) =>
        hallazgo.tipo === "income" &&
        ["declarado", "confirmado"].includes(hallazgo.procedencia),
    )
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const candidato = candidatos[0];
  const valor = candidato
    ? ingresoMensualDeHallazgo(candidato)
    : 0;

  return {
    valor,
    evidencia: candidato ? [evidenciaDeHallazgo(candidato)] : [],
  };
}

function obtenerIngresoVerificado(
  entrada: EntradaPerfilFinanciero,
  ingresosPorMes: number[],
): ValorConEvidencia & { metodo: string } {
  const transaccionesIngreso = entrada.transacciones.filter((t) => t.tipo === "ingreso");
  const hallazgosObservados = entrada.hallazgos.filter(
    (hallazgo) =>
      hallazgo.tipo === "income" &&
      ["observado", "confirmado"].includes(hallazgo.procedencia),
  );

  if (ingresosPorMes.length > 0) {
    return {
      valor: mediana(ingresosPorMes),
      evidencia: [
        ...transaccionesIngreso.map(evidenciaDeTransaccion),
        ...hallazgosObservados.map(evidenciaDeHallazgo),
      ],
      metodo: "Mediana de ingresos mensuales observados; fuentes externas corroboran sin sumarse.",
    };
  }

  const candidato = hallazgosObservados
    .map((hallazgo) => ({ hallazgo, valor: ingresoMensualDeHallazgo(hallazgo) }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.hallazgo.confianza - a.hallazgo.confianza)[0];

  return {
    valor: candidato?.valor ?? 0,
    evidencia: candidato ? [evidenciaDeHallazgo(candidato.hallazgo)] : [],
    metodo: "Mejor observación mensual disponible por confianza.",
  };
}

type DeudaResuelta = Deuda & { evidencia: EvidenciaFinanciera[] };

function resolverDeudas(entrada: EntradaPerfilFinanciero): DeudaResuelta[] {
  const resueltas: DeudaResuelta[] = [];

  for (const deuda of entrada.deudas) {
    resueltas.push({
      entidad: deuda.entidad,
      tipo: deuda.tipo,
      saldo: deuda.saldo,
      tasaEA: deuda.tasaEA,
      cuotaMensual: deuda.cuotaMensual,
      evidencia: [
        {
          id: deuda.id,
          fuente: deuda.fuente,
          procedencia: "observado",
          periodo: null,
          confianza: deuda.confianza,
          actualizadoEn: deuda.actualizadoEn,
        },
      ],
    });
  }

  for (const hallazgo of entrada.hallazgos.filter((h) => h.tipo === "liability")) {
    const entidad = textoDe(hallazgo.datos, ["entidad", "acreedor"]) || hallazgo.fuente;
    const saldo = numeroDe(hallazgo.datos, ["saldo", "valor"]);
    if (saldo <= 0) continue;
    const existente = resueltas.find((deuda) => deudasEquivalentes(deuda, { entidad, saldo }));
    if (existente) {
      existente.evidencia.push(evidenciaDeHallazgo(hallazgo));
      continue;
    }
    resueltas.push({
      entidad,
      tipo: textoDe(hallazgo.datos, ["tipo"]) || null,
      saldo,
      tasaEA: numeroOpcionalDe(hallazgo.datos, ["tasa_ea", "tasaEA"]),
      cuotaMensual: numeroOpcionalDe(hallazgo.datos, ["cuota_mensual", "cuotaMensual"]),
      evidencia: [evidenciaDeHallazgo(hallazgo)],
    });
  }

  return resueltas;
}

function tieneEvidenciaObligaciones(entrada: EntradaPerfilFinanciero): boolean {
  return (
    entrada.deudas.length > 0 ||
    entrada.hallazgos.some((hallazgo) =>
      ["liability", "credit_report"].includes(hallazgo.tipo),
    )
  );
}

function agruparTransaccionesPorMes(transacciones: TransaccionConId[]) {
  const meses = new Map<string, { ingresos: number; gastos: number }>();
  for (const transaccion of transacciones) {
    const mes = transaccion.fecha.slice(0, 7);
    const actual = meses.get(mes) ?? { ingresos: 0, gastos: 0 };
    if (transaccion.tipo === "ingreso") actual.ingresos += transaccion.monto;
    else actual.gastos += transaccion.monto;
    meses.set(mes, actual);
  }
  return new Map([...meses.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function construirPeriodo(transacciones: TransaccionConId[]) {
  const fechas = transacciones.map((t) => t.fecha).sort();
  const meses = new Set(fechas.map((fecha) => fecha.slice(0, 7)));
  return {
    desde: fechas[0] ?? "",
    hasta: fechas.at(-1) ?? "",
    mesesObservados: meses.size,
  };
}

function evidenciaDeTransaccion(transaccion: TransaccionConId): EvidenciaFinanciera {
  return {
    id: transaccion.id,
    fuente: `${transaccion.fuente}:${transaccion.cuenta}`,
    procedencia: "observado",
    periodo: transaccion.fecha.slice(0, 7),
    confianza: transaccion.confianza,
    actualizadoEn: transaccion.fecha,
  };
}

function evidenciaDeHallazgo(hallazgo: HallazgoFinanciero): EvidenciaFinanciera {
  return {
    id: hallazgo.id,
    fuente: hallazgo.fuente,
    procedencia: hallazgo.procedencia,
    periodo: hallazgo.periodo,
    confianza: hallazgo.confianza,
    actualizadoEn: hallazgo.creadoEn,
  };
}

function ingresoMensualDeHallazgo(hallazgo: HallazgoFinanciero): number {
  const anual = numeroOpcionalDe(hallazgo.datos, ["valor_anual"]);
  if (anual != null) return anual / 12;
  return numeroDe(hallazgo.datos, ["valor_mensual", "valor"]);
}

function deudasEquivalentes(
  izquierda: Pick<Deuda, "entidad" | "saldo">,
  derecha: Pick<Deuda, "entidad" | "saldo">,
): boolean {
  if (Math.round(izquierda.saldo) !== Math.round(derecha.saldo)) return false;
  const entidadIzquierda = normalizarTexto(izquierda.entidad);
  const entidadDerecha = normalizarTexto(derecha.entidad);
  return (
    entidadIzquierda === entidadDerecha ||
    entidadIzquierda.includes(entidadDerecha) ||
    entidadDerecha.includes(entidadIzquierda)
  );
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function numeroDe(datos: Record<string, unknown>, claves: string[]): number {
  return numeroOpcionalDe(datos, claves) ?? 0;
}

function numeroOpcionalDe(
  datos: Record<string, unknown>,
  claves: string[],
): number | null {
  for (const clave of claves) {
    if (typeof datos[clave] === "number") return datos[clave];
  }
  return null;
}

function textoDe(datos: Record<string, unknown>, claves: string[]): string {
  for (const clave of claves) {
    if (typeof datos[clave] === "string") return datos[clave];
  }
  return "";
}

function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[medio - 1] + ordenados[medio]) / 2
    : ordenados[medio];
}

function coeficienteVariacion(valores: number[]): number {
  if (valores.length < 2) return 0;
  const media = promedio(valores);
  if (media === 0) return 0;
  const varianza = promedio(valores.map((valor) => (valor - media) ** 2));
  return (Math.sqrt(varianza) / media) * 100;
}

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/** Dominios que un perfil completo debería cubrir. */
const DOMINIOS: TipoHallazgo[] = [
  "income",
  "liability",
  "asset",
  "property",
  "vehicle",
  "credit_report",
  "pension",
  "tax_profile",
  "company",
  "fine",
  "account",
];

const DOMINIOS_PATRIMONIO: TipoHallazgo[] = ["asset", "property", "vehicle"];

/**
 * Patrimonio agregado por tipo. Los nombres de campo varían entre fuentes
 * (avalúo, valor comercial, saldo…), por eso se buscan varias claves en vez
 * de asumir una sola.
 */
function resolverPatrimonio(hallazgos: HallazgoFinanciero[]) {
  const relevantes = hallazgos.filter((h) => DOMINIOS_PATRIMONIO.includes(h.tipo));

  const porTipo = DOMINIOS_PATRIMONIO.map((tipo) => ({
    tipo,
    valor: relevantes
      .filter((h) => h.tipo === tipo)
      .reduce(
        (suma, h) =>
          suma +
          numeroDe(h.datos, [
            "valor",
            "valorComercial",
            "valor_comercial",
            "avaluo",
            "saldo",
            "monto",
          ]),
        0,
      ),
  })).filter((entrada) => entrada.valor > 0);

  return {
    patrimonioTotal: porTipo.reduce((suma, entrada) => suma + entrada.valor, 0),
    patrimonioPorTipo: porTipo,
    evidenciaPatrimonio: relevantes.map(evidenciaDeHallazgo),
  };
}

/**
 * Cobertura: qué tanto del contexto financiero está efectivamente capturado.
 * Es la métrica que le dice a un consumidor si vale la pena confiar en este
 * perfil, y al usuario qué le falta por conectar.
 */
function calcularCobertura(hallazgos: HallazgoFinanciero[]): CoberturaPerfil {
  const dominios = DOMINIOS.map((dominio) => {
    const propios = hallazgos.filter((h) => h.tipo === dominio);
    return {
      dominio,
      fuentes: [...new Set(propios.map((h) => h.fuente))],
      hallazgos: propios.length,
      confianzaMedia:
        propios.length > 0
          ? redondear(promedio(propios.map((h) => h.confianza)), 2)
          : 0,
    };
  }).filter((entrada) => entrada.hallazgos > 0);

  return {
    dominios,
    fuentesConectadas: [...new Set(hallazgos.map((h) => h.fuente))].sort(),
    porcentajeCubierto: Math.round((dominios.length / DOMINIOS.length) * 100),
  };
}
