import { obtenerPanorama } from "@/lib/perfil/normalizacion";
import { UMBRALES } from "@/lib/diagnostico/reglas";
import { calcularEstadoFinanciero, obtenerDeudas, obtenerHallazgos, obtenerTransacciones } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult, FuenteCitada } from "../tipos";

const NOMBRE = "Experto de Riesgo";
const ESPECIALIDAD =
  "Riesgo de sobreendeudamiento: combina deuda, crédito y (cuando aplica) información tributaria " +
  "para explicar qué tan expuesto está el usuario — nunca riesgo de mercado ni de inversión.";
const RESTRICCIONES = [
  "Solo evalúa riesgo de sobreendeudamiento del propio usuario, nunca riesgo de un activo o inversión.",
  "Distingue siempre entre dato observado, inferencia y estimación — nunca los mezcla en una sola cifra.",
];

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const [transacciones, deudas, hallazgosCredito, hallazgosTax, panorama] = await Promise.all([
    obtenerTransacciones(ctx),
    obtenerDeudas(ctx),
    obtenerHallazgos(ctx, { tipo: "credit_report" }),
    obtenerHallazgos(ctx, { tipo: "tax_profile" }),
    obtenerPanorama(ctx.supabase, ctx.userId),
  ]);

  if (transacciones.length === 0 && deudas.length === 0 && hallazgosCredito.length === 0) {
    return {
      expertoId: "riesgo",
      resumen: "No hay suficiente información conectada (ni transacciones, ni deudas, ni reporte crediticio) para evaluar riesgo de sobreendeudamiento.",
      datos: {},
      confianza: 0,
      fuentes: [],
      advertencias: ["Sin datos de transacciones, deudas ni crédito conectados."],
      suficiente: false,
    };
  }

  const estado = calcularEstadoFinanciero(transacciones, deudas);
  const cuotaDeudaCara = deudas
    .filter((d) => (d.tasaEA ?? 0) >= UMBRALES.tasaAltoCostoEA)
    .reduce((s, d) => s + (d.cuotaMensual ?? 0), 0);
  const cargaDeudaCaraSobreIngreso = estado.ingresoMensual > 0 ? cuotaDeudaCara / estado.ingresoMensual : null;

  const fuentes: FuenteCitada[] = [
    ...(deudas.length > 0 ? [citarFuente({ fuente: "manual", procedencia: "declarado" as const })] : []),
    ...hallazgosCredito.map((h) => citarFuente({ fuente: h.fuente, procedencia: h.procedencia, hallazgoId: h.id, periodo: h.periodo })),
    ...hallazgosTax.map((h) => citarFuente({ fuente: h.fuente, procedencia: h.procedencia, hallazgoId: h.id, periodo: h.periodo })),
    citarFuente({ fuente: "nivel_endeudamiento_calculado", procedencia: "estimado" }),
  ];

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: {
      cargaDeudaCaraSobreIngreso: cargaDeudaCaraSobreIngreso,
      nivelEndeudamientoGeneral: panorama.nivelEndeudamiento,
      patrimonioNeto: panorama.patrimonioNeto,
      deudaTotal: panorama.deudaTotal,
      liquidezDisponible: panorama.liquidezDisponible,
      reportesCrediticios: hallazgosCredito.map((h) => h.datos),
      infoTributaria: hallazgosTax.map((h) => h.datos),
    },
  });

  return {
    expertoId: "riesgo",
    resumen: salida.resumen,
    datos: {
      cargaDeudaCaraSobreIngreso,
      nivelEndeudamientoGeneral: panorama.nivelEndeudamiento,
      patrimonioNeto: panorama.patrimonioNeto,
    },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoRiesgo: ExpertDefinition = {
  id: "riesgo",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de riesgo: combina deuda, crédito e información tributaria para explicar " +
    "el riesgo de sobreendeudamiento del usuario (nunca riesgo de inversión).",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "medio",
  ejecutar,
};
