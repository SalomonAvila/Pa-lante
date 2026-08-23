import { UMBRALES, formatearCOP } from "@/lib/diagnostico/reglas";
import { calcularEstadoFinanciero, obtenerDeudas, obtenerHallazgos, obtenerTransacciones } from "../datos";
import { interpretarComoExperto } from "../llm";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult } from "../tipos";

const NOMBRE = "Experto de Deuda";
const ESPECIALIDAD =
  "Deudas registradas por el usuario: cuáles son caras (tasa efectiva anual alta) y cuáles no, " +
  "y qué parte del ingreso se va en pagarlas.";
const RESTRICCIONES = [
  "Nunca sugiere refinanciar con una entidad específica ni recomienda un producto de crédito puntual.",
  `Usa el mismo umbral que el router de diagnóstico: una deuda es "de alto costo" desde ${UMBRALES.tasaAltoCostoEA}% E.A.`,
];

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const [transacciones, deudas, hallazgosDeuda] = await Promise.all([
    obtenerTransacciones(ctx),
    obtenerDeudas(ctx),
    obtenerHallazgos(ctx, { tipo: "liability" }),
  ]);

  if (deudas.length === 0 && hallazgosDeuda.length === 0) {
    return {
      expertoId: "deuda",
      resumen: "No hay deudas registradas para este usuario, ni cargadas a mano ni encontradas en otras fuentes conectadas.",
      datos: { deudas: [] },
      confianza: 0.7,
      fuentes: [],
      advertencias: [],
      suficiente: true,
    };
  }

  const estado = calcularEstadoFinanciero(transacciones, deudas);
  const deudaCara = deudas.filter((d) => (d.tasaEA ?? 0) >= UMBRALES.tasaAltoCostoEA);
  const cuotaDeudaCara = deudaCara.reduce((s, d) => s + (d.cuotaMensual ?? 0), 0);
  const cargaSobreIngreso = estado.ingresoMensual > 0 ? cuotaDeudaCara / estado.ingresoMensual : null;

  const fuentes = [
    ...(deudas.length > 0 ? [citarFuente({ fuente: "manual", procedencia: "declarado" as const })] : []),
    ...hallazgosDeuda.map((h) => citarFuente({ fuente: h.fuente, procedencia: h.procedencia, hallazgoId: h.id, periodo: h.periodo })),
  ];

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: {
      deudas: deudas.map((d) => ({
        entidad: d.entidad,
        tipo: d.tipo,
        saldo: formatearCOP(d.saldo),
        tasaEA: d.tasaEA,
        cuotaMensual: d.cuotaMensual != null ? formatearCOP(d.cuotaMensual) : null,
        esAltoCosto: (d.tasaEA ?? 0) >= UMBRALES.tasaAltoCostoEA,
      })),
      hallazgosDeExternas: hallazgosDeuda.map((h) => h.datos),
      ingresoMensualPromedio: estado.ingresoMensual || null,
      cargaDeDeudaCaraSobreIngreso: cargaSobreIngreso,
      umbralAltoCostoEA: UMBRALES.tasaAltoCostoEA,
      umbralCargaSobreIngreso: UMBRALES.cargaDeudaSobreIngreso,
    },
  });

  return {
    expertoId: "deuda",
    resumen: salida.resumen,
    datos: {
      deudas: deudas.map((d) => ({ entidad: d.entidad, saldo: d.saldo, tasaEA: d.tasaEA })),
      cargaDeDeudaCaraSobreIngreso: cargaSobreIngreso,
    },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoDeuda: ExpertDefinition = {
  id: "deuda",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de deuda: qué deudas tiene el usuario, cuáles son caras, y qué proporción " +
    "del ingreso se va en pagarlas.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "bajo",
  ejecutar,
};
