import { flujoNetoPorMes, mesesDeHistoria, obtenerTransacciones } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult } from "../tipos";

const NOMBRE = "Experto de Proyección (ML)";
const ESPECIALIDAD =
  "Proyección del flujo neto de los próximos meses, a partir SOLO de la propia historia de " +
  "transacciones del usuario. Nunca proyecta precios de activos ni mercados.";
const RESTRICCIONES = [
  "Nunca convierte una proyección en una recomendación de inversión o de compra/venta de nada.",
  "Si la evidencia no alcanza (Data Sufficiency Gate), se niega a proyectar y explica qué falta — nunca inventa una cifra.",
];

/** Mínimo de meses de historia para que una proyección de flujo tenga algún sentido. */
const MESES_MINIMOS_PROYECCION = 3;
const CONFIANZA_MEDIA_MINIMA = 0.6;
const HORIZONTE_MESES = 3;

type Proyeccion = { mes: number; flujoNetoEstimado: number; margenError: number };

/** Regresión lineal simple (mínimos cuadrados) sobre la serie mensual de flujo neto. */
function proyectarFlujoLineal(serie: { mes: string; flujoNeto: number }[], horizonte: number) {
  const n = serie.length;
  const xs = serie.map((_, i) => i);
  const ys = serie.map((s) => s.flujoNeto);

  const mediaX = xs.reduce((a, b) => a + b, 0) / n;
  const mediaY = ys.reduce((a, b) => a + b, 0) / n;

  const numerador = xs.reduce((acc, x, i) => acc + (x - mediaX) * (ys[i] - mediaY), 0);
  const denominador = xs.reduce((acc, x) => acc + (x - mediaX) ** 2, 0);
  const pendiente = denominador === 0 ? 0 : numerador / denominador;
  const intercepto = mediaY - pendiente * mediaX;

  const residuos = ys.map((y, i) => y - (intercepto + pendiente * xs[i]));
  const errorEstandar = Math.sqrt(residuos.reduce((a, r) => a + r ** 2, 0) / Math.max(1, n - 2));

  const proyecciones: Proyeccion[] = [];
  for (let h = 1; h <= horizonte; h++) {
    const x = n - 1 + h;
    proyecciones.push({
      mes: h,
      flujoNetoEstimado: Math.round(intercepto + pendiente * x),
      margenError: Math.round(errorEstandar),
    });
  }

  return { pendiente, intercepto, errorEstandar: Math.round(errorEstandar), proyecciones };
}

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const transacciones = await obtenerTransacciones(ctx);

  if (transacciones.length === 0) {
    return {
      expertoId: "proyeccion",
      resumen: "No hay transacciones conectadas, así que no hay nada sobre lo cual proyectar.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["No hay transacciones conectadas."],
      suficiente: false,
    };
  }

  const meses = mesesDeHistoria(transacciones);
  const confianzaMedia = transacciones.reduce((a, t) => a + t.confianza, 0) / transacciones.length;
  const serie = flujoNetoPorMes(transacciones);

  // --- Data Sufficiency Gate (sección 10 del pedido): se evalúa ANTES de
  // correr cualquier modelo. Si no pasa, no se proyecta, punto.
  const razonesInsuficiencia: string[] = [];
  if (meses < MESES_MINIMOS_PROYECCION) {
    razonesInsuficiencia.push(`Solo hay ${meses} mes(es) de historia; se necesitan al menos ${MESES_MINIMOS_PROYECCION}.`);
  }
  if (serie.length < MESES_MINIMOS_PROYECCION) {
    razonesInsuficiencia.push(`Solo hay ${serie.length} punto(s) mensuales de flujo neto; se necesitan al menos ${MESES_MINIMOS_PROYECCION}.`);
  }
  if (confianzaMedia < CONFIANZA_MEDIA_MINIMA) {
    razonesInsuficiencia.push(
      `La confianza media del parser sobre estas transacciones es ${confianzaMedia.toFixed(2)}, por debajo del mínimo ${CONFIANZA_MEDIA_MINIMA}.`,
    );
  }

  if (razonesInsuficiencia.length > 0) {
    return {
      expertoId: "proyeccion",
      resumen:
        "Encontré información, pero no considero que haya evidencia suficiente todavía para construir una " +
        "proyección confiable de flujo de caja.",
      datos: { mesesDeHistoria: meses, confianzaMedia },
      confianza: 0,
      fuentes: [],
      advertencias: razonesInsuficiencia,
      suficiente: false,
    };
  }

  // --- Pasa el gate: corre el modelo (regresión lineal simple, explícito).
  const modelo = proyectarFlujoLineal(serie, HORIZONTE_MESES);
  const fuentesUsadas = [...new Set(transacciones.map((t) => t.fuente))];
  const fuentes = fuentesUsadas.map((f) => citarFuente({ fuente: f, procedencia: "observado" }));
  // La proyección en sí es un cálculo del sistema, no un dato observado: se
  // cita aparte con procedencia "estimado" para que nunca se confunda con
  // un hecho verificado.
  fuentes.push(citarFuente({ fuente: "regresion_lineal_flujo_neto", procedencia: "estimado" }));

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: {
      metodo: "Regresión lineal simple sobre el flujo neto mensual observado",
      mesesDeHistoriaUsados: meses,
      serieHistorica: serie,
      proyeccion: modelo.proyecciones,
      margenDeErrorAproximado: modelo.errorEstandar,
    },
  });

  return {
    expertoId: "proyeccion",
    resumen: salida.resumen,
    datos: {
      metodo: "regresion_lineal_flujo_neto",
      proyeccion: modelo.proyecciones,
      margenDeErrorAproximado: modelo.errorEstandar,
    },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: true,
  };
}

export const expertoProyeccion: ExpertDefinition = {
  id: "proyeccion",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de proyección: intenta estimar el flujo neto de los próximos meses a partir " +
    "de la propia historia del usuario. Puede negarse si no hay evidencia suficiente.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "medio",
  ejecutar,
};
