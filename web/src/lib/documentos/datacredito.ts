import { z } from "zod";
import type { TipoHallazgo } from "@/types/finance";
import { campoOpcional, interpretarDocumentoPdf } from "./interpretar-pdf";
import type { HallazgoPropuestoDocumento } from "./dian";

/**
 * Parser del reporte de "Historia de Crédito Gratis" que el propio usuario
 * descarga de MiDataCrédito/DataCrédito y sube a mano (sección 11 del
 * pedido). Distingue explícitamente historia de crédito de score: el score
 * solo se extrae si el documento realmente lo trae impreso — nunca se
 * calcula uno propio y se presenta como "puntaje DataCrédito" (regla dura del
 * pedido).
 */

const Obligacion = z.object({
  entidad: z.string(),
  tipoProducto: campoOpcional(z.string()),
  estado: campoOpcional(z.string()),
  saldo: campoOpcional(z.number()),
  comportamientoPago: campoOpcional(z.string()),
  mora: campoOpcional(z.string()),
  antiguedad: campoOpcional(z.string()),
});

const HistoriaCreditoSchema = z.object({
  fechaConsulta: campoOpcional(z.string()),
  obligaciones: z.array(Obligacion),
  consultasRecientes: campoOpcional(z.array(z.object({ entidad: z.string(), fecha: z.string() }))),
  nivelEndeudamiento: campoOpcional(z.string()),
  scoreImpresoEnDocumento: campoOpcional(z.number()).describe(
    "SOLO si el documento imprime un puntaje/score numérico explícito — la mayoría de reportes de " +
      "'historia de crédito gratis' NO lo incluyen. Si no aparece, null: nunca se estima ni se calcula uno.",
  ),
  confianzaExtraccion: z.number().min(0).max(1),
});

const TIPO_CREDIT_REPORT: TipoHallazgo = "credit_report";

export async function parseHistoriaCredito(pdfBase64: string): Promise<HallazgoPropuestoDocumento[]> {
  const salida = await interpretarDocumentoPdf({
    nombreDocumento: "reporte de Historia de Crédito de DataCrédito/MiDataCrédito",
    instrucciones:
      "Distingue con cuidado historia de crédito (comportamiento de pago, obligaciones, consultas) de " +
      "score/puntaje (un número). La mayoría de estos reportes NO traen score — no lo inventes ni lo derives.",
    schema: HistoriaCreditoSchema,
    pdfBase64,
  });

  return [
    {
      tipo: TIPO_CREDIT_REPORT,
      periodo: salida.fechaConsulta?.valorNormalizado ?? null,
      confianza: salida.confianzaExtraccion,
      datos: {
        obligaciones: salida.obligaciones,
        consultasRecientes: salida.consultasRecientes,
        nivelEndeudamiento: salida.nivelEndeudamiento,
        // Nombrado distinto de "score" a propósito — nunca se presenta como
        // "Puntaje DataCrédito" calculado por Pa'lante, solo lo que el
        // documento mismo imprimió, si lo hizo.
        scoreImpresoEnDocumento: salida.scoreImpresoEnDocumento,
      },
    },
  ];
}
