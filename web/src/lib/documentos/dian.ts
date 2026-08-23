import { z } from "zod";
import type { TipoHallazgo } from "@/types/finance";
import { campoOpcional, interpretarDocumentoPdf } from "./interpretar-pdf";

/**
 * Parsers de documentos DIAN subidos por el usuario (sección 6-7 del pedido):
 * RUT, Información Exógena, Declaración de Renta. Campos tomados directo de
 * lo que la propia DIAN documenta públicamente para cada trámite (ver el
 * mapeo entregado antes de implementar) — nunca se inventa un campo que el
 * documento real no traiga; cada uno es opcional y `null` es una respuesta
 * válida.
 */

export type HallazgoPropuestoDocumento = {
  tipo: TipoHallazgo;
  periodo: string | null;
  confianza: number;
  datos: Record<string, unknown>;
};

const InstruccionesDian =
  "Es un documento oficial de la DIAN (Dirección de Impuestos y Aduanas Nacionales de Colombia). " +
  "Las fechas se normalizan a formato YYYY-MM-DD y los montos en pesos colombianos a número entero sin " +
  "separadores de miles.";

// ---------------------------------------------------------------------------
// RUT
// ---------------------------------------------------------------------------

const RutSchema = z.object({
  tipoContribuyente: campoOpcional(z.string()),
  nit: campoOpcional(z.string()),
  actividadEconomica: campoOpcional(z.string()),
  responsabilidades: campoOpcional(z.array(z.string())),
  estadoRut: campoOpcional(z.string()),
  fechaActualizacion: campoOpcional(z.string()),
  confianzaExtraccion: z
    .number()
    .min(0)
    .max(1)
    .describe("Qué tan legible/completo estaba el documento para esta extracción."),
});

export async function parseRut(pdfBase64: string): Promise<HallazgoPropuestoDocumento[]> {
  const salida = await interpretarDocumentoPdf({
    nombreDocumento: "RUT (Registro Único Tributario)",
    instrucciones: InstruccionesDian,
    schema: RutSchema,
    pdfBase64,
  });

  return [
    {
      tipo: "tax_profile",
      periodo: salida.fechaActualizacion?.valorNormalizado ?? null,
      confianza: salida.confianzaExtraccion,
      datos: {
        tipoContribuyente: salida.tipoContribuyente,
        nit: salida.nit,
        actividadEconomica: salida.actividadEconomica,
        responsabilidades: salida.responsabilidades,
        estadoRut: salida.estadoRut,
        fechaActualizacion: salida.fechaActualizacion,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Información Exógena
// ---------------------------------------------------------------------------

const ConceptoExogena = z.object({
  concepto: z.string().describe("Descripción del concepto tal como aparece en el reporte (ej. 'Pagos laborales')."),
  reportadoPor: campoOpcional(z.string()),
  valorAnual: campoOpcional(z.number()),
});

const ExogenaSchema = z.object({
  añoGravable: z.string().nullable(),
  ingresosReportados: z.array(ConceptoExogena).describe("Ingresos/pagos laborales/pensiones reportados por terceros."),
  obligacionesReportadas: z.array(ConceptoExogena).describe("Deudas/obligaciones financieras reportadas por terceros."),
  bienesReportados: z.array(ConceptoExogena).describe("Bienes (inmuebles, vehículos, inversiones) reportados por terceros."),
  otrosConceptos: z
    .array(ConceptoExogena)
    .describe(
      "Cualquier otro concepto que no encaje en las tres categorías anteriores (retenciones, intereses, " +
        "consumos financieros, operaciones notariales, etc.) — nunca se descarta, se guarda tal cual.",
    ),
  confianzaExtraccion: z.number().min(0).max(1),
});

export async function parseExogena(pdfBase64: string): Promise<HallazgoPropuestoDocumento[]> {
  const salida = await interpretarDocumentoPdf({
    nombreDocumento: "reporte de Información Exógena (reportada por terceros) de la DIAN",
    instrucciones:
      InstruccionesDian +
      " Información reportada por terceros no es lo mismo que un hecho verificado por la DIAN misma — " +
      "extrae tal como aparece, sin corregir ni consolidar cifras.",
    schema: ExogenaSchema,
    pdfBase64,
  });

  const hallazgos: HallazgoPropuestoDocumento[] = [];
  if (salida.ingresosReportados.length > 0) {
    hallazgos.push({
      tipo: "income",
      periodo: salida.añoGravable,
      confianza: salida.confianzaExtraccion,
      datos: { conceptos: salida.ingresosReportados },
    });
  }
  if (salida.obligacionesReportadas.length > 0) {
    hallazgos.push({
      tipo: "liability",
      periodo: salida.añoGravable,
      confianza: salida.confianzaExtraccion,
      datos: { conceptos: salida.obligacionesReportadas },
    });
  }
  if (salida.bienesReportados.length > 0) {
    hallazgos.push({
      tipo: "asset",
      periodo: salida.añoGravable,
      confianza: salida.confianzaExtraccion,
      datos: { conceptos: salida.bienesReportados },
    });
  }
  if (salida.otrosConceptos.length > 0) {
    hallazgos.push({
      tipo: "tax_profile",
      periodo: salida.añoGravable,
      confianza: salida.confianzaExtraccion,
      datos: { exogenaOtrosConceptos: salida.otrosConceptos },
    });
  }
  return hallazgos;
}

// ---------------------------------------------------------------------------
// Declaración de Renta
// ---------------------------------------------------------------------------

const DeclaracionRentaSchema = z.object({
  añoGravable: campoOpcional(z.string()),
  patrimonioBruto: campoOpcional(z.number()),
  deudas: campoOpcional(z.number()),
  patrimonioLiquido: campoOpcional(z.number()),
  ingresos: campoOpcional(z.number()),
  rentas: campoOpcional(z.array(z.object({ concepto: z.string(), valor: z.number() }))),
  deducciones: campoOpcional(z.array(z.object({ concepto: z.string(), valor: z.number() }))),
  impuesto: campoOpcional(z.number()),
  saldoAPagarOFavor: campoOpcional(z.number()).describe("Positivo = saldo a pagar; negativo = saldo a favor."),
  confianzaExtraccion: z.number().min(0).max(1),
});

export async function parseDeclaracionRenta(pdfBase64: string): Promise<HallazgoPropuestoDocumento[]> {
  const salida = await interpretarDocumentoPdf({
    nombreDocumento: "declaración de renta (Formulario 210 o equivalente) de la DIAN",
    instrucciones: InstruccionesDian,
    schema: DeclaracionRentaSchema,
    pdfBase64,
  });

  return [
    {
      tipo: "tax_profile",
      periodo: salida.añoGravable?.valorNormalizado ?? null,
      confianza: salida.confianzaExtraccion,
      datos: {
        añoGravable: salida.añoGravable,
        patrimonioBruto: salida.patrimonioBruto,
        deudas: salida.deudas,
        patrimonioLiquido: salida.patrimonioLiquido,
        ingresos: salida.ingresos,
        rentas: salida.rentas,
        deducciones: salida.deducciones,
        impuesto: salida.impuesto,
        saldoAPagarOFavor: salida.saldoAPagarOFavor,
      },
    },
  ];
}
