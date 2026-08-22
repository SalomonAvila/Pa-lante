/**
 * Punto de reemplazo por un vendor de OCR real. Hoy no hay ninguno
 * contratado, así que `MockDocumentExtractor` simula la extracción: para la
 * cédula, compara contra lo que el usuario ya escribió en el formulario
 * (siempre coincide, porque no hay imagen real que leer); para extractos
 * bancarios genera hallazgos de fixture plausibles. Nunca se asume que una
 * extracción real sería siempre correcta (sección 19 del pedido) — la
 * pantalla de revisión posterior a esto siempre exige confirmación humana.
 */
export type CampoIdentidad = {
  nombres: string;
  apellidos: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  fechaExpedicion: string;
};

export type ResultadoOcrIdentidad = {
  campos: CampoIdentidad;
  coincide: boolean;
  camposNoCoincidentes: (keyof CampoIdentidad)[];
};

export type HallazgoExtracto = {
  tipo: "income" | "liability" | "account";
  descripcion: string;
  valor: number;
  fecha?: string;
};

export type ResultadoExtraccionDocumento = {
  bancoDetectado: string | null;
  periodoDetectado: string | null;
  saldo: number | null;
  hallazgos: HallazgoExtracto[];
};

export interface DocumentExtractor {
  extraerIdentidad(datosDeclarados: CampoIdentidad): Promise<ResultadoOcrIdentidad>;
  extraerDocumentoFinanciero(
    nombreArchivo: string,
    tipo: "extracto" | "captura",
  ): Promise<ResultadoExtraccionDocumento>;
}

const BANCOS_CONOCIDOS = ["bancolombia", "davivienda", "nequi", "daviplata", "bbva", "bogota"];

function detectarBanco(nombreArchivo: string): string | null {
  const normalizado = nombreArchivo.toLowerCase();
  const encontrado = BANCOS_CONOCIDOS.find((banco) => normalizado.includes(banco));
  if (!encontrado) return null;
  return encontrado.charAt(0).toUpperCase() + encontrado.slice(1);
}

export class MockDocumentExtractor implements DocumentExtractor {
  async extraerIdentidad(datosDeclarados: CampoIdentidad): Promise<ResultadoOcrIdentidad> {
    return { campos: datosDeclarados, coincide: true, camposNoCoincidentes: [] };
  }

  async extraerDocumentoFinanciero(
    nombreArchivo: string,
    tipo: "extracto" | "captura",
  ): Promise<ResultadoExtraccionDocumento> {
    const bancoDetectado = detectarBanco(nombreArchivo);
    const hoy = new Date();
    const periodoDetectado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

    return {
      bancoDetectado,
      periodoDetectado,
      saldo: tipo === "extracto" ? 2_450_000 : null,
      hallazgos: [
        {
          tipo: "income",
          descripcion: "Consignación recurrente — posible nómina",
          valor: 3_200_000,
          fecha: periodoDetectado,
        },
        {
          tipo: "liability",
          descripcion: "Pago recurrente a cuota de crédito",
          valor: 450_000,
          fecha: periodoDetectado,
        },
      ],
    };
  }
}

export const extractorDocumentos: DocumentExtractor = new MockDocumentExtractor();
