import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

let cliente: Anthropic | null = null;

/** Cliente compartido — nunca se instancia en el navegador (todo esto corre en servidor). */
export function clienteAnthropic(): Anthropic {
  if (!cliente) cliente = new Anthropic();
  return cliente;
}

export const MODELO = process.env.ANTHROPIC_MODEL || "claude-opus-5";

/**
 * Forma común de lo que un experto le pide al modelo que juzgue. Los datos
 * citables (`datos`) y las fuentes (`fuentes`) los calcula el código a
 * partir de lo que realmente se consultó — el modelo NUNCA los inventa acá,
 * solo interpreta y calibra confianza sobre evidencia ya recolectada.
 */
export const SalidaExpertoSchema = z.object({
  resumen: z
    .string()
    .describe("Explicación en lenguaje simple (2-4 frases) de lo que encontró este experto."),
  confianza: z
    .number()
    .min(0)
    .max(1)
    .describe("Qué tan confiable es esta conclusión dada la evidencia disponible y su procedencia."),
  advertencias: z
    .array(z.string())
    .describe("Limitaciones, caveats o datos faltantes. Arreglo vacío si no hay ninguno."),
  suficiente: z
    .boolean()
    .describe(
      "false si la evidencia disponible NO alcanza para responder con una conclusión confiable " +
        "(ej. cero datos conectados de esa fuente, muy poca historia, etc).",
    ),
});

export type SalidaExperto = z.infer<typeof SalidaExpertoSchema>;

/**
 * Regla universal para los 11 expertos (viejos y nuevos). Pa'lante nunca es
 * un asesor licenciado ni ejecuta operaciones — pero desde que existen
 * hipotecario/inversiones/acciones, "nunca asesoría de inversión" ya no es
 * una prohibición absoluta de tocar el tema: es una prohibición de terminar
 * en una instrucción de compra/venta o "elige esta entidad". Los 8 expertos
 * originales quedan igual de restringidos que antes porque sus propias
 * `restricciones` (ej. deuda.ts: "nunca sugiere refinanciar con una entidad
 * específica") ya cubren eso — acá solo va lo que aplica a TODOS.
 */
const RESTRICCIONES_GLOBALES =
  "Nunca te presentas como asesor financiero licenciado ni ejecutas una operación por el " +
  "usuario. Nunca terminas en una instrucción imperativa de compra/venta ni en 'elige esta " +
  "entidad/producto' — expones evidencia, riesgo y escenarios, y dejas la decisión al usuario. " +
  "Nunca presentas una estimación, simulación o dato declarado como si fuera un hecho verificado " +
  "u oferta real. Si la evidencia es insuficiente, dilo explícitamente en vez de fabricar una " +
  "conclusión.";

export async function interpretarComoExperto(params: {
  nombre: string;
  especialidad: string;
  restricciones: string[];
  pregunta: string;
  evidencia: unknown;
}): Promise<SalidaExperto> {
  const client = clienteAnthropic();

  const system = [
    `Eres el "${params.nombre}" dentro del orquestador de inteligencia financiera de Pa'lante.`,
    `Especialidad: ${params.especialidad}.`,
    RESTRICCIONES_GLOBALES,
    ...params.restricciones,
    "Responde ÚNICAMENTE a partir de la evidencia entregada abajo. No asumas datos que no están ahí.",
  ].join("\n");

  const response = await client.messages.parse({
    model: MODELO,
    max_tokens: 2000,
    system,
    output_config: { format: zodOutputFormat(SalidaExpertoSchema) },
    messages: [
      {
        role: "user",
        content: `Pregunta del usuario: ${params.pregunta}\n\nEvidencia disponible (JSON):\n${JSON.stringify(params.evidencia, null, 2)}`,
      },
    ],
  });

  if (!response.parsed_output) {
    return {
      resumen: "No se pudo interpretar la evidencia en este momento.",
      confianza: 0,
      advertencias: ["Falló la interpretación del modelo; intenta de nuevo."],
      suficiente: false,
    };
  }
  return response.parsed_output;
}

/**
 * Extrae parámetros estructurados de una pregunta en lenguaje natural (ej.
 * "quiero comprar un apartamento de $500 millones con $150 millones de
 * cuota inicial" → { valorInmueble: 500000000, cuotaInicial: 150000000 }).
 * El schema debe declarar todos los campos opcionales/nullable: el usuario
 * rara vez da todos los datos en un solo mensaje, y no tener uno no es un
 * error — el experto que llama a esto decide qué hacer con lo que falte.
 */
export async function extraerParametros<T>(params: {
  schema: z.ZodType<T>;
  instrucciones: string;
  texto: string;
}): Promise<T | null> {
  const client = clienteAnthropic();

  const response = await client.messages.parse({
    model: MODELO,
    max_tokens: 1000,
    system:
      `Extraes parámetros estructurados de un mensaje en lenguaje natural. ${params.instrucciones} ` +
      "Si un dato no está mencionado, déjalo en null — nunca lo inventes ni asumas un valor típico.",
    output_config: { format: zodOutputFormat(params.schema) },
    messages: [{ role: "user", content: params.texto }],
  });

  return response.parsed_output;
}
