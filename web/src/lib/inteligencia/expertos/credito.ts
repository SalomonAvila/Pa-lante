import { obtenerHallazgos } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult, FuenteCitada } from "../tipos";

const NOMBRE = "Experto de Crédito";
const ESPECIALIDAD =
  "Perfil crediticio del usuario a partir de las fuentes que autorizó conectar (DataCrédito, " +
  "TransUnion): score, obligaciones activas, y qué factores lo explican.";
const RESTRICCIONES = [
  "Nunca recomienda solicitar un crédito ni sugiere una entidad específica — solo explica el perfil.",
  "Si dos fuentes reportan cifras distintas (ej. dos scores), las presenta ambas por separado, nunca las promedia ni elige una.",
];

/**
 * Sección 23-B del pedido: normaliza hallazgos crudos a un "CreditProfile"
 * — solo los campos que la fuente realmente trajo, nada inventado.
 */
function normalizarCreditProfile(hallazgos: { fuente: string; datos: Record<string, unknown> }[]) {
  return hallazgos.map((h) => ({
    fuente: h.fuente,
    score: h.datos.score ?? null,
    obligacionesActivas: h.datos.obligaciones_activas ?? null,
    entidad: h.datos.entidad ?? h.fuente,
  }));
}

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const hallazgos = await obtenerHallazgos(ctx, { tipo: "credit_report" });

  if (hallazgos.length === 0) {
    return {
      expertoId: "credito",
      resumen:
        "No hay ningún reporte crediticio conectado todavía (ni DataCrédito ni TransUnion). Sin eso no puedo " +
        "hablar del perfil crediticio del usuario.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["Ninguna fuente de crédito conectada."],
      suficiente: false,
    };
  }

  const perfil = normalizarCreditProfile(hallazgos);
  const fuentes: FuenteCitada[] = hallazgos.map((h) =>
    citarFuente({ fuente: h.fuente, procedencia: h.procedencia, hallazgoId: h.id, periodo: h.periodo }),
  );

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: { reportesCrediticios: perfil },
  });

  return {
    expertoId: "credito",
    resumen: salida.resumen,
    datos: { reportesCrediticios: perfil },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoCredito: ExpertDefinition = {
  id: "credito",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de crédito: qué dicen los reportes crediticios conectados (DataCrédito, " +
    "TransUnion) sobre el score y las obligaciones activas del usuario.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "bajo",
  ejecutar,
};
