import { z } from "zod";
import { calcularAmortizacion, simularAbonoExtraordinario } from "../hipotecas/amortizacion";
import { CATALOGO_OFERTAS_HIPOTECARIAS } from "../hipotecas/catalogo-ofertas";
import { calcularEstadoFinanciero, obtenerDeudas, obtenerIngresoDeclarado, obtenerTransacciones } from "../datos";
import { extraerParametros, interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult, FuenteCitada } from "../tipos";

const NOMBRE = "Experto Hipotecario";
const ESPECIALIDAD =
  "Financiación de vivienda: simula cuotas y costo financiero de un crédito hipotecario, compara " +
  "condiciones entre entidades, y cruza el resultado contra la capacidad de pago real del usuario.";
const RESTRICCIONES = [
  "Las condiciones bancarias que usa son un catálogo de referencia SIMULADO — nunca una cotización " +
    "real ni una preaprobación. Debe decirlo explícitamente cada vez que las menciona.",
  "No elige un banco por el usuario ni dice 'este es el mejor' como instrucción — presenta las " +
    "alternativas con sus números y deja la decisión al usuario.",
];

const ParametrosSchema = z.object({
  valorInmueble: z.number().nullable().describe("Valor total del inmueble en pesos colombianos, si se menciona."),
  cuotaInicial: z.number().nullable().describe("Cuota inicial disponible en pesos, si se menciona."),
  montoSolicitado: z.number().nullable().describe("Monto a financiar directamente, si el usuario lo da así en vez de valor+cuota inicial."),
  plazoAnios: z.number().nullable().describe("Plazo deseado en años, si se menciona."),
  tasaEAConocida: z.number().nullable().describe("Una tasa E.A. específica que el usuario ya conoce/le ofrecieron, si la menciona."),
  abonoExtraordinarioAnual: z.number().nullable().describe("Monto de abono extra anual al crédito, si se menciona (ej. 'abonos de 20 millones cada año')."),
  modoAbono: z
    .enum(["reducir_plazo", "reducir_cuota"])
    .nullable()
    .describe("Si el usuario indica qué prefiere hacer con el abono extra; null si no lo dice (se asume reducir_plazo)."),
});

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const parametros = await extraerParametros({
    schema: ParametrosSchema,
    instrucciones:
      "Extrae parámetros de una solicitud de crédito hipotecario en Colombia (montos en pesos colombianos).",
    texto: pregunta,
  });

  const montoSolicitado =
    parametros?.montoSolicitado ??
    (parametros?.valorInmueble != null && parametros?.cuotaInicial != null
      ? parametros.valorInmueble - parametros.cuotaInicial
      : null);

  if (montoSolicitado == null || montoSolicitado <= 0) {
    return {
      expertoId: "hipotecario",
      resumen:
        "Para simular un crédito hipotecario necesito el monto a financiar — dime el valor del " +
        "inmueble y la cuota inicial que tienes, o directamente cuánto necesitarías pedir prestado.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["Falta el monto a financiar (valor del inmueble y cuota inicial, o el monto directo)."],
      suficiente: false,
    };
  }

  const [transacciones, deudas, ingresoDeclarado] = await Promise.all([
    obtenerTransacciones(ctx),
    obtenerDeudas(ctx),
    obtenerIngresoDeclarado(ctx),
  ]);
  const estado = calcularEstadoFinanciero(transacciones, deudas);
  const ingresoMensual = estado.ingresoMensual || ingresoDeclarado?.valor || null;

  const escenariosPorBanco = CATALOGO_OFERTAS_HIPOTECARIAS.map((oferta) => {
    const resultado = calcularAmortizacion({
      montoSolicitado,
      tasaEA: oferta.tasaEA,
      plazoMeses: Math.min(oferta.plazoMaximoMeses, (parametros?.plazoAnios ?? 20) * 12),
    });
    return {
      banco: oferta.banco,
      producto: oferta.producto,
      modalidad: oferta.modalidad,
      tasaEA: oferta.tasaEA,
      plazoMeses: Math.min(oferta.plazoMaximoMeses, (parametros?.plazoAnios ?? 20) * 12),
      condiciones: oferta.condiciones,
      ...resultado,
      relacionCuotaIngreso: ingresoMensual ? Number((resultado.cuotaMensual / ingresoMensual).toFixed(3)) : null,
    };
  });

  let escenarioConTasaConocida = null;
  if (parametros?.tasaEAConocida != null) {
    escenarioConTasaConocida = calcularAmortizacion({
      montoSolicitado,
      tasaEA: parametros.tasaEAConocida,
      plazoMeses: (parametros?.plazoAnios ?? 20) * 12,
    });
  }

  let simulacionAbono = null;
  if (parametros?.abonoExtraordinarioAnual != null && parametros.abonoExtraordinarioAnual > 0) {
    const masBarata = [...escenariosPorBanco].sort((a, b) => a.tasaEA - b.tasaEA)[0];
    simulacionAbono = {
      basadoEn: `${masBarata.banco} (tasa más baja del catálogo, ${masBarata.tasaEA}% E.A.)`,
      ...simularAbonoExtraordinario(
        { montoSolicitado, tasaEA: masBarata.tasaEA, plazoMeses: masBarata.plazoMeses },
        parametros.abonoExtraordinarioAnual,
        parametros.modoAbono ?? "reducir_plazo",
      ),
    };
  }

  const fuentes: FuenteCitada[] = [
    citarFuente({ fuente: "catalogo_referencia_hipotecario", procedencia: "estimado" }),
    ...(deudas.length > 0 || transacciones.length > 0
      ? [citarFuente({ fuente: "transacciones_y_deudas_usuario", procedencia: "observado" })]
      : []),
    ...(estado.ingresoMensual === 0 && ingresoDeclarado
      ? [citarFuente({ fuente: ingresoDeclarado.hallazgo.fuente, procedencia: ingresoDeclarado.hallazgo.procedencia, hallazgoId: ingresoDeclarado.hallazgo.id, periodo: ingresoDeclarado.hallazgo.periodo })]
      : []),
  ];

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: {
      montoSolicitado,
      ingresoMensualPromedio: ingresoMensual,
      cargaDeDeudaExistente: estado.deudas.map((d) => ({ entidad: d.entidad, cuotaMensual: d.cuotaMensual })),
      escenariosPorBanco,
      escenarioConTasaQueElUsuarioYaConoce: escenarioConTasaConocida,
      simulacionAbonoExtraordinario: simulacionAbono,
      nota: "escenariosPorBanco viene de un catálogo SIMULADO de referencia, no de una cotización real a ninguna entidad.",
    },
  });

  return {
    expertoId: "hipotecario",
    resumen: salida.resumen,
    datos: { montoSolicitado, escenariosPorBanco, simulacionAbonoExtraordinario: simulacionAbono },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: [...salida.advertencias, "Las tasas y condiciones son de un catálogo de referencia simulado, no una cotización real de ninguna entidad."],
    suficiente: salida.suficiente,
  };
}

export const expertoHipotecario: ExpertDefinition = {
  id: "hipotecario",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto hipotecario: simula cuotas de crédito de vivienda, compara condiciones " +
    "entre entidades (catálogo de referencia, no cotización real) y cruza contra la capacidad de " +
    "pago real del usuario. Sirve para preguntas sobre comprar vivienda, cuota inicial, abonos " +
    "extraordinarios, o pesos vs. UVR.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "medio",
  ejecutar,
};
