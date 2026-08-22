import type { SupabaseClient } from "@supabase/supabase-js";
import type { HallazgoFinanciero, ProcedenciaDato, TipoHallazgo } from "@/types/finance";

type FilaHallazgo = {
  id: string;
  tipo: TipoHallazgo;
  fuente: string;
  procedencia: ProcedenciaDato;
  periodo: string | null;
  datos: Record<string, unknown>;
  confianza: number;
  creado_en: string;
};

function mapearHallazgo(fila: FilaHallazgo): HallazgoFinanciero {
  return {
    id: fila.id,
    tipo: fila.tipo,
    fuente: fila.fuente,
    procedencia: fila.procedencia,
    periodo: fila.periodo,
    datos: fila.datos,
    confianza: Number(fila.confianza),
    creadoEn: fila.creado_en,
  };
}

/** Busca el primer valor numérico entre varias claves posibles de `datos`. */
function numeroDe(datos: Record<string, unknown>, claves: string[]): number {
  for (const clave of claves) {
    const valor = datos[clave];
    if (typeof valor === "number") return valor;
  }
  return 0;
}

/** Un hallazgo `income` trae valor anual o mensual según la fuente; normaliza a mensual. */
function ingresoMensualDeHallazgo(datos: Record<string, unknown>): number {
  if (typeof datos.valor_anual === "number") return datos.valor_anual / 12;
  if (typeof datos.valor_mensual === "number") return datos.valor_mensual;
  return numeroDe(datos, ["valor"]);
}

export type CifraConProcedencia = {
  valor: number;
  fuente: string;
  procedencia: ProcedenciaDato;
  periodo: string | null;
};

/**
 * Panorama financiero agregado (secciones 22-24 del pedido). Nunca funde
 * valores contradictorios de distintas fuentes en uno solo (sección 18):
 * `ingresosReportados` lista cada observación por separado, con su
 * procedencia, y deja que la UI muestre todas.
 */
export type PanoramaFinanciero = {
  ingresosReportados: CifraConProcedencia[];
  gastoMensualEstimado: CifraConProcedencia;
  patrimonioNeto: number;
  activosTotales: number;
  deudaTotal: number;
  liquidezDisponible: number;
  nivelEndeudamiento: number | null;
  hallazgos: HallazgoFinanciero[];
};

export async function obtenerPanorama(supabase: SupabaseClient, userId: string): Promise<PanoramaFinanciero> {
  const [{ data: transacciones }, { data: deudas }, { data: hallazgosData }] = await Promise.all([
    supabase.from("transacciones").select("fecha, monto, tipo").eq("user_id", userId).order("fecha", { ascending: true }),
    supabase.from("deudas").select("saldo, cuota_mensual").eq("user_id", userId),
    supabase
      .from("hallazgos_financieros")
      .select("id, tipo, fuente, procedencia, periodo, datos, confianza, creado_en")
      .eq("user_id", userId)
      .order("creado_en", { ascending: false }),
  ]);

  const hallazgos = ((hallazgosData ?? []) as FilaHallazgo[]).map(mapearHallazgo);

  const filasTx = (transacciones ?? []) as { fecha: string; monto: number; tipo: "ingreso" | "gasto" }[];
  let ingresoMensualTx = 0;
  let gastoMensualTx = 0;
  if (filasTx.length > 0) {
    const desde = new Date(filasTx[0].fecha);
    const hasta = new Date(filasTx[filasTx.length - 1].fecha);
    const meses = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    const totalIngreso = filasTx.filter((f) => f.tipo === "ingreso").reduce((acc, f) => acc + Number(f.monto), 0);
    const totalGasto = filasTx.filter((f) => f.tipo === "gasto").reduce((acc, f) => acc + Number(f.monto), 0);
    ingresoMensualTx = Math.round(totalIngreso / meses);
    gastoMensualTx = Math.round(totalGasto / meses);
  }

  const ingresosReportados: CifraConProcedencia[] = hallazgos
    .filter((h) => h.tipo === "income")
    .map((h) => ({
      valor: Math.round(ingresoMensualDeHallazgo(h.datos)),
      fuente: h.fuente,
      procedencia: h.procedencia,
      periodo: h.periodo,
    }));

  if (ingresoMensualTx > 0) {
    ingresosReportados.push({
      valor: ingresoMensualTx,
      fuente: "Transacciones (Gmail/PDF)",
      procedencia: "observado",
      periodo: null,
    });
  }

  const filasDeuda = (deudas ?? []) as { saldo: number; cuota_mensual: number | null }[];
  const deudaDesdeTablaDeudas = filasDeuda.reduce((acc, d) => acc + Number(d.saldo), 0);
  const cuotaMensualTotal = filasDeuda.reduce((acc, d) => acc + Number(d.cuota_mensual ?? 0), 0);

  const deudaDesdeHallazgos = hallazgos
    .filter((h) => h.tipo === "liability")
    .reduce((acc, h) => acc + numeroDe(h.datos, ["saldo", "valor"]), 0);

  const activosTotales = hallazgos
    .filter((h) => ["asset", "property", "vehicle"].includes(h.tipo))
    .reduce((acc, h) => acc + numeroDe(h.datos, ["valor_estimado", "valor_catastral", "valor"]), 0);

  const liquidezDisponible = hallazgos
    .filter((h) => h.tipo === "account")
    .reduce((acc, h) => acc + numeroDe(h.datos, ["saldo", "valor"]), 0);

  const deudaTotal = deudaDesdeTablaDeudas + deudaDesdeHallazgos;
  const patrimonioNeto = activosTotales + liquidezDisponible - deudaTotal;

  const ingresoBase = ingresoMensualTx || ingresosReportados[0]?.valor || 0;
  const nivelEndeudamiento = ingresoBase > 0 ? Number((cuotaMensualTotal / ingresoBase).toFixed(4)) : null;

  return {
    ingresosReportados,
    gastoMensualEstimado: {
      valor: gastoMensualTx,
      fuente: "Transacciones (Gmail/PDF)",
      procedencia: "observado",
      periodo: null,
    },
    patrimonioNeto,
    activosTotales,
    deudaTotal,
    liquidezDisponible,
    nivelEndeudamiento,
    hallazgos,
  };
}
