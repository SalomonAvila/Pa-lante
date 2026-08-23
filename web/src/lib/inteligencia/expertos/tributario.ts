import { obtenerHallazgos } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult, FuenteCitada } from "../tipos";

const NOMBRE = "Experto Tributario";
const ESPECIALIDAD =
  "Información tributaria del usuario conectada desde la DIAN (RUT, responsabilidades, información " +
  "exógena de ingresos) — ayuda a organizar qué hay disponible para la declaración de renta.";
const RESTRICCIONES = [
  "No calcula el impuesto a pagar ni llena una declaración — solo organiza y explica la información tributaria disponible.",
  "Nunca trata un ingreso reportado por el usuario como si fuera el mismo dato que la exógena de la DIAN: los presenta con su propia procedencia.",
];

/** Sección 23-A del pedido: TaxProfile — solo campos que la DIAN realmente trajo. */
function normalizarTaxProfile(
  perfiles: { datos: Record<string, unknown> }[],
  ingresos: { periodo: string | null; datos: Record<string, unknown> }[],
) {
  return {
    responsabilidades: perfiles.flatMap((p) => (Array.isArray(p.datos.responsabilidades) ? p.datos.responsabilidades : [])),
    obligacionesPendientes: perfiles.map((p) => p.datos.obligaciones_pendientes ?? null).find((v) => v != null) ?? null,
    ingresosExogena: ingresos.map((i) => ({ periodo: i.periodo, ...i.datos })),
  };
}

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const [perfiles, ingresosDian] = await Promise.all([
    obtenerHallazgos(ctx, { tipo: "tax_profile", fuente: "dian" }),
    obtenerHallazgos(ctx, { tipo: "income", fuente: "dian" }),
  ]);

  if (perfiles.length === 0 && ingresosDian.length === 0) {
    return {
      expertoId: "tributario",
      resumen: "La DIAN no está conectada todavía, así que no tengo información tributaria del usuario.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["Fuente DIAN no conectada."],
      suficiente: false,
    };
  }

  const perfil = normalizarTaxProfile(perfiles, ingresosDian);
  const fuentes: FuenteCitada[] = [...perfiles, ...ingresosDian].map((h) =>
    citarFuente({ fuente: h.fuente, procedencia: h.procedencia, hallazgoId: h.id, periodo: h.periodo }),
  );

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: perfil,
  });

  return {
    expertoId: "tributario",
    resumen: salida.resumen,
    datos: perfil,
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoTributario: ExpertDefinition = {
  id: "tributario",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto tributario: qué información de la DIAN hay disponible (RUT, responsabilidades, " +
    "ingresos declarados en la exógena) para ayudar con la declaración de renta.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "bajo",
  ejecutar,
};
