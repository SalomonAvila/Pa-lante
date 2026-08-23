import { z } from "zod";
import { extraerParametros, interpretarComoExperto } from "../llm";
import { obtenerProveedorMercado } from "../mercado/proveedor";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult } from "../tipos";

const NOMBRE = "Experto de Acciones";
const ESPECIALIDAD =
  "Análisis de una empresa de renta variable con datos de mercado verificables: precios, " +
  "volumen, fundamentales, valoración, eventos corporativos, contexto sectorial.";
const RESTRICCIONES = [
  "Nunca produce 'compra' o 'vende' como conclusión — construye evidencia → análisis → riesgo → " +
    "escenarios → conclusión, siempre con incertidumbre explícita.",
  "Si no hay un proveedor de datos de mercado conectado, lo dice directamente en vez de razonar " +
    "sobre la empresa con conocimiento genérico del modelo (eso no sería evidencia verificable).",
];

const ParametrosSchema = z.object({
  ticker: z.string().nullable().describe("El ticker bursátil si el usuario lo da directamente (ej. 'NVDA')."),
  empresa: z.string().nullable().describe("El nombre de la empresa mencionada, si no da el ticker (ej. 'NVIDIA')."),
});

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const proveedor = obtenerProveedorMercado();

  if (!proveedor) {
    return {
      expertoId: "acciones",
      resumen:
        "No tengo ningún proveedor de datos de mercado conectado todavía, así que no puedo investigar " +
        "esta empresa con evidencia verificable — no voy a improvisar un análisis sin datos reales detrás.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: [
        "Falta conectar un proveedor real de datos de mercado (ver web/src/lib/inteligencia/mercado/proveedor.ts) " +
          "— se necesita elegir un proveedor (ej. Alpha Vantage, Financial Modeling Prep) y su API key.",
      ],
      suficiente: false,
    };
  }

  // A partir de acá el flujo queda listo para cuando se conecte un
  // proveedor real: extraer el ticker, pedirle datos, y solo entonces
  // interpretar — ctx se mantiene en la firma para no romper el contrato
  // del experto (ver ContextoInteligencia) cuando esto se complete.
  void ctx;
  const parametros = await extraerParametros({
    schema: ParametrosSchema,
    instrucciones: "Extrae el ticker o nombre de empresa mencionado en una pregunta sobre análisis de acciones.",
    texto: pregunta,
  });

  const dato = await proveedor.obtenerDatos(parametros?.ticker ?? parametros?.empresa ?? pregunta);
  if (!dato) {
    return {
      expertoId: "acciones",
      resumen: `No encontré datos verificables para "${parametros?.ticker ?? parametros?.empresa ?? "esa empresa"}" en ${proveedor.nombre}.`,
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: [`${proveedor.nombre} no devolvió datos para esta búsqueda.`],
      suficiente: false,
    };
  }

  const fuentes = [citarFuente({ fuente: dato.fuente, procedencia: "observado", periodo: dato.fechaConsulta })];

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: dato,
  });

  return {
    expertoId: "acciones",
    resumen: salida.resumen,
    datos: { ticker: dato.ticker, fundamentales: dato.fundamentales },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoAcciones: ExpertDefinition = {
  id: "acciones",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de acciones: investiga una empresa puntual con datos de mercado " +
    "verificables (precios, fundamentales, volumen). Responde honestamente si no hay un proveedor " +
    "de datos conectado en vez de fabricar un análisis.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "medio",
  ejecutar,
};
