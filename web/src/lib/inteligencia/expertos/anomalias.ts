import type { Transaccion } from "@/types/finance";
import { obtenerTransacciones } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult } from "../tipos";

const NOMBRE = "Experto de Anomalías";
const ESPECIALIDAD =
  "Gastos fuera de lo normal para el propio historial del usuario (picos por categoría) y gasto " +
  "recurrente que podría ser una suscripción, comparado contra su propio patrón — no contra el de nadie más.";
const RESTRICCIONES = [
  "Solo señala patrones estadísticos sobre el propio historial del usuario, nunca compara contra otros usuarios.",
];

type PicoCategoria = { categoria: string; mes: string; monto: number; promedio: number; desviacion: number };
type PosibleSuscripcion = { comercio: string; ocurrencias: number; montoPromedio: number };

function detectarPicosPorCategoria(gastos: Transaccion[]): PicoCategoria[] {
  const porCategoriaYMes = new Map<string, Map<string, number>>();
  for (const g of gastos) {
    if (!g.categoria) continue;
    const mes = g.fecha.slice(0, 7);
    if (!porCategoriaYMes.has(g.categoria)) porCategoriaYMes.set(g.categoria, new Map());
    const mapaMes = porCategoriaYMes.get(g.categoria)!;
    mapaMes.set(mes, (mapaMes.get(mes) ?? 0) + g.monto);
  }

  const picos: PicoCategoria[] = [];
  for (const [categoria, mapaMes] of porCategoriaYMes) {
    const valores = [...mapaMes.values()];
    if (valores.length < 3) continue; // no hay suficiente historia para juzgar qué es "normal"

    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const varianza = valores.reduce((a, v) => a + (v - promedio) ** 2, 0) / valores.length;
    const desviacionEstandar = Math.sqrt(varianza);
    if (desviacionEstandar === 0) continue;

    for (const [mes, monto] of mapaMes) {
      const z = (monto - promedio) / desviacionEstandar;
      if (z > 1.5) {
        picos.push({ categoria, mes, monto, promedio: Math.round(promedio), desviacion: Number(z.toFixed(2)) });
      }
    }
  }
  return picos;
}

function detectarPosiblesSuscripciones(gastos: Transaccion[]): PosibleSuscripcion[] {
  const porComercio = new Map<string, number[]>();
  for (const g of gastos) {
    const clave = g.comercioNorm || g.comercioRaw;
    if (!porComercio.has(clave)) porComercio.set(clave, []);
    porComercio.get(clave)!.push(g.monto);
  }

  const resultado: PosibleSuscripcion[] = [];
  for (const [comercio, montos] of porComercio) {
    if (montos.length < 2) continue;
    const promedio = montos.reduce((a, b) => a + b, 0) / montos.length;
    const dentroDeTolerancia = montos.every((m) => Math.abs(m - promedio) / promedio <= 0.05);
    if (dentroDeTolerancia) {
      resultado.push({ comercio, ocurrencias: montos.length, montoPromedio: Math.round(promedio) });
    }
  }
  return resultado;
}

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const transacciones = await obtenerTransacciones(ctx);
  const gastos = transacciones.filter((t) => t.tipo === "gasto");

  if (gastos.length === 0) {
    return {
      expertoId: "anomalias",
      resumen: "No hay gastos registrados todavía para buscar patrones inusuales.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["No hay transacciones conectadas."],
      suficiente: false,
    };
  }

  const picos = detectarPicosPorCategoria(gastos);
  const suscripciones = detectarPosiblesSuscripciones(gastos);
  const fuentesUsadas = [...new Set(gastos.map((t) => t.fuente))];
  const fuentes = fuentesUsadas.map((f) => citarFuente({ fuente: f, procedencia: "observado" }));

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: { picosDeGastoPorCategoria: picos, posiblesSuscripciones: suscripciones, totalGastos: gastos.length },
  });

  return {
    expertoId: "anomalias",
    resumen: salida.resumen,
    datos: { picosDeGastoPorCategoria: picos, posiblesSuscripciones: suscripciones },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoAnomalias: ExpertDefinition = {
  id: "anomalias",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de anomalías: picos de gasto fuera de lo normal por categoría y posibles " +
    "suscripciones o gastos recurrentes.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "bajo",
  ejecutar,
};
