import { calcularEstadoFinanciero, obtenerDeudas, obtenerTransacciones } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult } from "../tipos";

const NOMBRE = "Experto de Presupuesto";
const ESPECIALIDAD =
  "Organización del gasto: cuánto entra, cuánto sale, en qué categorías, y qué tan completo " +
  "está el registro (gasto sin categorizar).";
const RESTRICCIONES = [
  "No sugiere productos financieros ni bancos específicos, solo hábitos de organización del gasto propio.",
];

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const [transacciones, deudas] = await Promise.all([obtenerTransacciones(ctx), obtenerDeudas(ctx)]);
  const estado = calcularEstadoFinanciero(transacciones, deudas);

  if (transacciones.length === 0) {
    return {
      expertoId: "presupuesto",
      resumen: "Todavía no hay transacciones conectadas (ni por Gmail ni por PDF), así que no hay nada que organizar todavía.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["No hay transacciones conectadas."],
      suficiente: false,
    };
  }

  const fuentesUsadas = [...new Set(transacciones.map((t) => t.fuente))];
  const fuentes = fuentesUsadas.map((f) =>
    citarFuente({ fuente: f, procedencia: "observado", periodo: `${estado.periodo.desde} a ${estado.periodo.hasta}` }),
  );

  const proporcionSinCategorizar = estado.gastoMensual > 0 ? estado.gastoSinCategorizar / estado.gastoMensual : 0;

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: {
      periodo: estado.periodo,
      ingresoMensualPromedio: estado.ingresoMensual,
      gastoMensualPromedio: estado.gastoMensual,
      gastoPorCategoria: estado.gastoPorCategoria,
      gastoSinCategorizarMensual: estado.gastoSinCategorizar,
      proporcionSinCategorizar,
      calidadDatos: estado.calidadDatos,
    },
  });

  return {
    expertoId: "presupuesto",
    resumen: salida.resumen,
    datos: {
      ingresoMensualPromedio: estado.ingresoMensual,
      gastoMensualPromedio: estado.gastoMensual,
      gastoPorCategoria: estado.gastoPorCategoria,
      proporcionSinCategorizar,
    },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoPresupuesto: ExpertDefinition = {
  id: "presupuesto",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de presupuesto: en qué categorías gasta el usuario, cuánto le entra vs. " +
    "cuánto le sale, y qué tan completo está el registro de gasto.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "bajo",
  ejecutar,
};
