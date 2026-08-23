import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { clienteAnthropic, MODELO } from "@/lib/inteligencia/llm";

/**
 * Extracción estructurada de documentos DIAN/DataCrédito subidos por el
 * usuario (sección 7 del pedido). Sin librería de parseo de PDF en el repo —
 * el PDF se manda directo a Claude como `document` block con salida
 * estructurada (mismo patrón que `interpretarComoExperto` en
 * `inteligencia/llm.ts`, mismo cliente). El modelo solo puede devolver
 * `null` para un campo que el documento no trae — nunca lo inventa; el
 * schema de cada documento (`dian.ts`/`datacredito.ts`) hace ese contrato
 * explícito campo por campo.
 */

/** Envuelve un campo opcional con su valor tal cual aparece + su normalización. */
export function campoOpcional<T extends z.ZodTypeAny>(valorNormalizado: T) {
  return z
    .object({
      valorOriginal: z.string().describe("Texto exactamente como aparece en el documento, sin editar."),
      valorNormalizado,
    })
    .nullable()
    .describe("null si el documento NO trae este campo — nunca se inventa un valor.");
}

export type CampoConProcedencia<T> = { valorOriginal: string; valorNormalizado: T } | null;

export async function interpretarDocumentoPdf<T extends z.ZodTypeAny>(params: {
  nombreDocumento: string;
  instrucciones: string;
  schema: T;
  pdfBase64: string;
}): Promise<z.infer<T>> {
  const client: Anthropic = clienteAnthropic();

  const response = await client.messages.parse({
    model: MODELO,
    max_tokens: 4000,
    system:
      `Extraes datos estructurados de un ${params.nombreDocumento} colombiano real, subido por su ` +
      "propio dueño. Responde ÚNICAMENTE con lo que el documento realmente contiene — un campo que no " +
      "aparece se deja en null, nunca se estima ni se completa con un valor típico. " +
      params.instrucciones,
    output_config: { format: zodOutputFormat(params.schema) },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: params.pdfBase64 },
          },
          { type: "text", text: `Extrae los campos de este ${params.nombreDocumento}.` },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(`No se pudo interpretar el ${params.nombreDocumento} — intenta subirlo de nuevo.`);
  }
  return response.parsed_output;
}
