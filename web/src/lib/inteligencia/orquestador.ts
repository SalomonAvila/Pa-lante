import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { obtenerPanorama } from "@/lib/perfil/normalizacion";
import { clienteAnthropic, MODELO } from "./llm";
import { buscarConocimiento } from "./rag/busqueda";
import { REGISTRO_EXPERTOS, consultarExperto, obtenerExperto } from "./registro-expertos";
import type { ContextoInteligencia, ExpertoId, FuenteCitada } from "./tipos";
import { registrarAnalisis } from "./trust/auditoria";

export type EventoOrquestador =
  | { tipo: "status"; mensaje: string; expertoId?: ExpertoId }
  | { tipo: "texto"; delta: string }
  | { tipo: "fuentes"; fuentes: FuenteCitada[] }
  | { tipo: "done" }
  | { tipo: "error"; mensaje: string };

export type ResultadoConversacion = {
  textoFinal: string;
  expertosInvocados: ExpertoId[];
  fuentes: FuenteCitada[];
  confianza: number | null;
};

const SYSTEM_PROMPT = `
Eres el orquestador de inteligencia financiera de Pa'lante — diagnóstico, organización y
seguimiento financiero para Colombia, y además análisis (no asesoría regulada) de financiación de
vivienda, portafolio y renta variable a través de los expertos hipotecario/inversiones/acciones.
Pa'lante NUNCA se presenta como asesor financiero licenciado y NUNCA ejecuta una operación por el
usuario. Los expertos presupuesto/deuda/flujo_caja/credito/tributario/riesgo/anomalias/proyeccion
siguen estrictamente fuera de temas de inversión, como siempre. hipotecario/inversiones/acciones sí
pueden analizar y comparar — pero ningún experto, nuevo o viejo, termina en una instrucción de
compra/venta ni en "elige este banco/producto/acción": siempre presentan evidencia, riesgo y
escenarios, y dejan la decisión al usuario.

Tu trabajo:
1. Interpretar qué necesita el usuario.
2. Decidir qué expertos hacen falta (herramientas consultar_experto_*). Si varias preguntas son
   independientes entre sí, invoca a los expertos correspondientes EN PARALELO en el mismo turno
   — no uno por uno si no hace falta.
3. Si necesitas contexto barato antes de decidir a quién consultar, usa obtener_resumen_rapido.
4. Si la pregunta depende de conocimiento documental (regulación, definiciones de tasas, etc.),
   usa buscar_conocimiento_financiero.
5. Cuando tengas evidencia suficiente, sintetiza la respuesta final SIN volver a llamar
   herramientas, con este formato exacto:

**Qué encontramos** — hechos concretos, citando de qué experto salieron.
**Qué significa** — interpretación en lenguaje simple, sin jerga.
**Qué podría faltar o salir mal** — limitaciones y advertencias que reportaron los expertos.
**Fuentes** — cada fuente citada con su tier (A/B/C/D) y qué tan verificada está.
**Confianza** — baja / media / alta, y por qué.

Reglas duras, sin excepción:
- Si dos expertos dan señales contradictorias sobre el mismo tema, dilo explícitamente
  ("encontré información contradictoria entre X y Y") en vez de elegir una arbitrariamente.
- Nunca conviertas una proyección, simulación o análisis en una instrucción de compra/venta, ni
  sugieras "elige este banco/producto/acción" como conclusión — expón evidencia, riesgo y
  escenarios, y deja la decisión al usuario.
- Toda simulación de crédito hipotecario contra el catálogo de bancos es de referencia, NUNCA una
  cotización real ni una preaprobación — dilo cada vez que la menciones.
- Si la pregunta es sobre una empresa/acción puntual, considera consultar también al experto de
  inversiones cuando haga falta contexto de portafolio (concentración, cuánto del patrimonio
  representaría); si es sobre el portafolio en general, el experto de inversiones basta.
- Si un experto marcó suficiente=false, respeta eso: no inventes la conclusión que él se negó a
  dar. Dilo tal cual ("no tengo evidencia suficiente para eso todavía") y explica qué falta.
- Nunca presentes un dato con procedencia "declarado" o "estimado" como si fuera un hecho
  verificado — usa el tier y la procedencia que trae cada fuente citada.
- Si el usuario no tiene ninguna fuente relevante conectada, dilo claramente e invita a conectar
  la fuente que haga falta (DIAN, DataCrédito, Gmail, subir un PDF) en vez de responder en el vacío.
`.trim();

const PreguntaExpertoSchema = z.object({
  pregunta: z.string().describe("La pregunta específica, en lenguaje natural, para este experto."),
});

const BusquedaConocimientoSchema = z.object({
  consulta: z.string().describe("Qué se quiere saber, en lenguaje natural (ej. 'qué es la tasa de usura')."),
});

function construirTools(): Anthropic.Tool[] {
  const inputSchemaExperto = z.toJSONSchema(PreguntaExpertoSchema) as Anthropic.Tool["input_schema"];

  const toolsExpertos: Anthropic.Tool[] = REGISTRO_EXPERTOS.map((experto) => ({
    name: `consultar_experto_${experto.id}`,
    description: `${experto.descripcion} Restricciones: ${experto.restricciones.join(" ")}`,
    input_schema: inputSchemaExperto,
  }));

  const toolBusqueda: Anthropic.Tool = {
    name: "buscar_conocimiento_financiero",
    description:
      "Busca en el conocimiento documental curado de Pa'lante (regulación, definiciones de tasas, " +
      "cómo funciona el sistema financiero colombiano). Solo para conocimiento documental, nunca para " +
      "datos propios del usuario — esos siempre vienen de un experto.",
    input_schema: z.toJSONSchema(BusquedaConocimientoSchema) as Anthropic.Tool["input_schema"],
  };

  const toolResumen: Anthropic.Tool = {
    name: "obtener_resumen_rapido",
    description:
      "Resumen agregado y barato del panorama financiero del usuario (patrimonio neto, deuda total, " +
      "ingresos reportados, liquidez) para decidir rápido qué expertos hacen falta, sin gastar una " +
      "consulta completa a un experto.",
    input_schema: { type: "object", properties: {}, required: [] },
  };

  return [...toolsExpertos, toolBusqueda, toolResumen];
}

type ResultadoTool = {
  payload: unknown;
  expertoId?: ExpertoId;
  fuentes?: FuenteCitada[];
  confianza?: number;
};

async function ejecutarTool(
  ctx: ContextoInteligencia,
  nombre: string,
  input: unknown,
  conversacionId: string | null | undefined,
  onEvento: (evento: EventoOrquestador) => void,
): Promise<ResultadoTool> {
  if (nombre.startsWith("consultar_experto_")) {
    const id = nombre.slice("consultar_experto_".length) as ExpertoId;
    const experto = obtenerExperto(id);
    const { pregunta } = PreguntaExpertoSchema.parse(input);

    onEvento({ tipo: "status", mensaje: `Consultando ${experto.nombre.toLowerCase()}…`, expertoId: id });
    const resultado = await consultarExperto(ctx, id, pregunta, conversacionId);
    onEvento({ tipo: "status", mensaje: `${experto.nombre} respondió.`, expertoId: id });
    if (resultado.fuentes.length > 0) onEvento({ tipo: "fuentes", fuentes: resultado.fuentes });

    return { payload: resultado, expertoId: id, fuentes: resultado.fuentes, confianza: resultado.confianza };
  }

  if (nombre === "buscar_conocimiento_financiero") {
    const { consulta } = BusquedaConocimientoSchema.parse(input);
    onEvento({ tipo: "status", mensaje: "Buscando en conocimiento documental…" });
    const resultado = await buscarConocimiento(ctx.supabase, consulta);
    if (!resultado.disponible) {
      return { payload: { disponible: false, mensaje: "RAG no disponible: falta configurar VOYAGE_API_KEY." } };
    }
    const fuentes: FuenteCitada[] = resultado.resultados.map((r) => ({
      fuente: r.titulo,
      tier: r.tier,
      procedencia: "observado",
      motivo: "Documento de referencia curado por el equipo de Pa'lante.",
    }));
    if (fuentes.length > 0) onEvento({ tipo: "fuentes", fuentes });
    return { payload: resultado, fuentes };
  }

  if (nombre === "obtener_resumen_rapido") {
    const panorama = await obtenerPanorama(ctx.supabase, ctx.userId);
    return { payload: panorama };
  }

  throw new Error(`Herramienta desconocida: ${nombre}`);
}

const MAX_ITERACIONES = 6;

/**
 * Loop manual (no el Tool Runner beta) porque cada consultar_experto_* debe
 * ejecutar su propio sub-loop de interpretación y persistir auditoría — ver
 * el plan de Fase 1. `Promise.all` sobre los tool_use de un mismo turno es
 * lo que hace que los carriles de expertos corran en paralelo de verdad.
 */
export async function ejecutarConversacion(
  ctx: ContextoInteligencia,
  params: {
    pregunta: string;
    historial: { rol: "user" | "assistant"; contenido: string }[];
    conversacionId?: string | null;
  },
  onEvento: (evento: EventoOrquestador) => void,
): Promise<ResultadoConversacion> {
  const client = clienteAnthropic();
  const tools = construirTools();

  const messages: Anthropic.MessageParam[] = [
    ...params.historial.map((m): Anthropic.MessageParam => ({ role: m.rol, content: m.contenido })),
    { role: "user", content: params.pregunta },
  ];

  const expertosInvocados = new Set<ExpertoId>();
  const todasLasFuentes: FuenteCitada[] = [];
  const confianzas: number[] = [];
  const herramientasLlamadas: string[] = [];
  let textoFinal = "";

  try {
    for (let iteracion = 0; iteracion < MAX_ITERACIONES; iteracion++) {
      const stream = client.messages.stream({
        model: MODELO,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        tools,
        messages,
      });

      stream.on("text", (delta) => {
        textoFinal += delta;
        onEvento({ tipo: "texto", delta });
      });

      const respuesta = await stream.finalMessage();

      if (respuesta.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: respuesta.content });
        continue;
      }

      const toolUses = respuesta.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      messages.push({ role: "assistant", content: respuesta.content });

      if (toolUses.length === 0 || respuesta.stop_reason === "end_turn") {
        break;
      }

      const resultados: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (toolUse): Promise<Anthropic.ToolResultBlockParam> => {
          herramientasLlamadas.push(toolUse.name);
          try {
            const resultado = await ejecutarTool(ctx, toolUse.name, toolUse.input, params.conversacionId, onEvento);
            if (resultado.expertoId) expertosInvocados.add(resultado.expertoId);
            if (resultado.fuentes) todasLasFuentes.push(...resultado.fuentes);
            if (typeof resultado.confianza === "number") confianzas.push(resultado.confianza);
            return {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: JSON.stringify(resultado.payload),
            };
          } catch (error) {
            return {
              type: "tool_result",
              tool_use_id: toolUse.id,
              is_error: true,
              content: error instanceof Error ? error.message : "Error desconocido al ejecutar la herramienta.",
            };
          }
        }),
      );

      messages.push({ role: "user", content: resultados });
    }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido en el orquestador.";
    onEvento({ tipo: "error", mensaje });
    throw error;
  }

  const confianzaFinal = confianzas.length > 0 ? Math.min(...confianzas) : null;

  await registrarAnalisis(ctx, {
    conversacionId: params.conversacionId ?? null,
    expertosInvocados: [...expertosInvocados],
    herramientas: herramientasLlamadas,
    fuentes: todasLasFuentes,
    confianza: confianzaFinal,
    resultado: { texto: textoFinal },
    advertencias: [],
  });

  onEvento({ tipo: "done" });

  return {
    textoFinal,
    expertosInvocados: [...expertosInvocados],
    fuentes: todasLasFuentes,
    confianza: confianzaFinal,
  };
}
