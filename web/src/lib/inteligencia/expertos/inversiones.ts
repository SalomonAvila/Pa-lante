import { z } from "zod";
import { obtenerPanorama } from "@/lib/perfil/normalizacion";
import { obtenerHallazgos } from "../datos";
import { extraerParametros, interpretarComoExperto } from "../llm";
import { actualizarPerfilConversacional, obtenerPerfilConversacional } from "../memoria/perfil";
import { citarFuente, techoConfianzaPorTiers } from "../trust/tiers";
import type { ContextoInteligencia, ExpertDefinition, ExpertResult, FuenteCitada } from "../tipos";

const NOMBRE = "Experto de Inversiones";
const ESPECIALIDAD =
  "Perfil de inversión a nivel de portafolio: objetivo, horizonte, tolerancia al riesgo, liquidez " +
  "disponible, y qué tan concentrado o diversificado está lo que el usuario ya tiene. No es un " +
  "experto de mercado — para una empresa puntual coordina con el experto de acciones.";
const RESTRICCIONES = [
  "Nunca dice 'compra X' ni recomienda un instrumento o producto específico — solo describe " +
    "consideraciones de perfil (objetivo, horizonte, riesgo, diversificación) para que el usuario " +
    "decida, y sugiere cuándo conviene revisar una empresa puntual con el experto de acciones.",
  "Si el usuario menciona objetivo, horizonte o tolerancia al riesgo, se recuerda para la próxima " +
    "conversación (memoria) — no hace falta que el usuario lo repita cada vez.",
];

const ParametrosSchema = z.object({
  montoDisponible: z.number().nullable().describe("Monto disponible para invertir mencionado en este mensaje, si lo hay."),
  objetivoMencionado: z.string().nullable().describe("Objetivo de inversión que el usuario menciona en este mensaje, si lo hay (ej. 'comprar carro en 2 años')."),
  horizonteMencionado: z.string().nullable().describe("Horizonte de tiempo mencionado, si lo hay (ej. '3 años', 'largo plazo')."),
  toleranciaRiesgoMencionada: z.string().nullable().describe("Tolerancia al riesgo que el usuario expresa, si la hay (ej. 'no quiero arriesgar nada', 'puedo asumir volatilidad')."),
});

function numeroDe(datos: Record<string, unknown>, claves: string[]): number {
  for (const clave of claves) {
    const valor = datos[clave];
    if (typeof valor === "number") return valor;
  }
  return 0;
}

async function ejecutar(ctx: ContextoInteligencia, pregunta: string): Promise<ExpertResult> {
  const [parametros, perfilPrevio, hallazgosActivos, panorama] = await Promise.all([
    extraerParametros({
      schema: ParametrosSchema,
      instrucciones: "Extrae parámetros de inversión de un mensaje sobre finanzas personales (montos en pesos colombianos).",
      texto: pregunta,
    }),
    obtenerPerfilConversacional(ctx),
    obtenerHallazgos(ctx, { tipo: "asset" }),
    obtenerPanorama(ctx.supabase, ctx.userId),
  ]);

  // Memoria (sección 3 del pedido): lo que el usuario diga acá queda
  // disponible para la próxima conversación sin que lo repita.
  if (parametros?.objetivoMencionado || parametros?.horizonteMencionado || parametros?.toleranciaRiesgoMencionada) {
    await actualizarPerfilConversacional(ctx, {
      objetivosNuevos: parametros.objetivoMencionado ? [parametros.objetivoMencionado] : undefined,
      horizonte: parametros.horizonteMencionado ?? undefined,
      toleranciaRiesgo: parametros.toleranciaRiesgoMencionada ?? undefined,
    });
  }

  const perfil = {
    objetivos: [...perfilPrevio.objetivos, ...(parametros?.objetivoMencionado ? [parametros.objetivoMencionado] : [])],
    horizonte: parametros?.horizonteMencionado ?? perfilPrevio.horizonte,
    toleranciaRiesgo: parametros?.toleranciaRiesgoMencionada ?? perfilPrevio.toleranciaRiesgo,
  };

  const tenenciasActuales = hallazgosActivos.map((h) => ({
    fuente: h.fuente,
    procedencia: h.procedencia,
    valorEstimado: numeroDe(h.datos, ["valor_estimado", "valor"]),
    detalle: h.datos,
  }));
  const valorTotalTenencias = tenenciasActuales.reduce((acc, t) => acc + t.valorEstimado, 0);

  const fuentes: FuenteCitada[] = [
    ...hallazgosActivos.map((h) => citarFuente({ fuente: h.fuente, procedencia: h.procedencia, hallazgoId: h.id, periodo: h.periodo })),
    ...(perfil.objetivos.length > 0 || perfil.horizonte || perfil.toleranciaRiesgo
      ? [citarFuente({ fuente: "perfil_declarado_por_usuario", procedencia: "declarado" })]
      : []),
  ];

  const salida = await interpretarComoExperto({
    nombre: NOMBRE,
    especialidad: ESPECIALIDAD,
    restricciones: RESTRICCIONES,
    pregunta,
    evidencia: {
      montoDisponibleEnEsteMensaje: parametros?.montoDisponible ?? null,
      perfilDeclarado: perfil,
      liquidezDisponibleTotal: panorama.liquidezDisponible,
      patrimonioNeto: panorama.patrimonioNeto,
      tenenciasActuales,
      valorTotalTenenciasConocidas: valorTotalTenencias,
      cantidadDeTenenciasDistintas: tenenciasActuales.length,
    },
  });

  return {
    expertoId: "inversiones",
    resumen: salida.resumen,
    datos: { perfil, valorTotalTenencias, cantidadDeTenenciasDistintas: tenenciasActuales.length },
    confianza: Math.min(salida.confianza, techoConfianzaPorTiers(fuentes)),
    fuentes,
    advertencias: salida.advertencias,
    suficiente: salida.suficiente,
  };
}

export const expertoInversiones: ExpertDefinition = {
  id: "inversiones",
  nombre: NOMBRE,
  descripcion:
    "Consulta al experto de inversiones: perfil de inversión a nivel de portafolio (objetivo, " +
    "horizonte, riesgo, liquidez, diversificación). Para analizar una empresa/acción puntual, " +
    "consulta también al experto de acciones.",
  especialidad: ESPECIALIDAD,
  restricciones: RESTRICCIONES,
  riesgo: "medio",
  ejecutar,
};
