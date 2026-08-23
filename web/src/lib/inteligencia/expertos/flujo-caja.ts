import { flujoNetoPorMes, mesesDeHistoria, obtenerTransacciones } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult } from "../tipos";

const NOMBRE = "Experto de Flujo de Caja";
const ESPECIALIDAD =
  "Tendencia del flujo neto mes a mes (ingresos menos gastos): si mejora, empeora, o es estable, " +
  "y qué tan volátil es.";
const RESTRICCIONES = [
  "Solo describe la tendencia observada, no proyecta meses futuros (eso lo hace el experto de Proyección).",
];

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const transacciones = await obtenerTransacciones(ctx);

  if (transacciones.length === 0) {
    return {
      expertoId: "flujo_caja",
      resumen: "No hay transacciones conectadas todavía, así que no hay flujo de caja que analizar.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["No hay transacciones conectadas."],
      suficiente: false,
    };
  }

  const serie = flujoNetoPorMes(transacciones);
  const meses = mesesDeHistoria(transacciones);
  const fuentesUsadas = [...new Set(transacciones.map((t) => t.fuente))];
  const fuentes = fuentesUsadas.map((f) => citarFuente({ fuente: f, procedencia: "observado" }));

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: { serieFlujoNetoMensual: serie, mesesDeHistoria: meses },
  });

  return {
    expertoId: "flujo_caja",
    resumen: salida.resumen,
    datos: { serieFlujoNetoMensual: serie },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoFlujoCaja: ExpertDefinition = {
  id: "flujo_caja",
  nombre: NOMBRE,
  descripcion: "Consulta al experto de flujo de caja: cómo ha evolucionado el flujo neto mes a mes.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "bajo",
  ejecutar,
};
