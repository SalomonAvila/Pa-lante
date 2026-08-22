import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  HallazgoFinanciero,
  ObjetivoAccesoFinanciero,
  PerfilFinancieroV1,
  ProcedenciaDato,
  TipoHallazgo,
} from "../../types/finance";
import {
  construirPerfilFinanciero,
  type DeudaConEvidencia,
  type TransaccionConId,
} from "./perfil-financiero";

type FilaTransaccion = {
  id: string;
  fecha: string;
  monto: number;
  tipo: "ingreso" | "gasto";
  comercio_raw: string;
  comercio_norm: string | null;
  categoria: string | null;
  cuenta: string | null;
  fuente: "gmail" | "pdf" | "manual";
  confianza: number;
};

type FilaDeuda = {
  id: string;
  entidad: string;
  tipo: string | null;
  saldo: number;
  tasa_ea: number | null;
  cuota_mensual: number | null;
  fuente: string;
  actualizado_en: string;
};

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

export type FilaPlanAcceso = {
  meta: string;
  fecha_objetivo: string | null;
  tipo_meta: string | null;
  datos_meta: Record<string, unknown> | null;
};

export async function obtenerPerfilFinanciero(
  supabase: SupabaseClient,
  userId: string,
  generadoEn = new Date().toISOString(),
): Promise<PerfilFinancieroV1> {
  const [resultadoTransacciones, resultadoDeudas, resultadoHallazgos, resultadoPlan] =
    await Promise.all([
      supabase
        .from("transacciones")
        .select(
          "id, fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza",
        )
        .eq("user_id", userId)
        .order("fecha", { ascending: true }),
      supabase
        .from("deudas")
        .select(
          "id, entidad, tipo, saldo, tasa_ea, cuota_mensual, fuente, actualizado_en",
        )
        .eq("user_id", userId),
      supabase
        .from("hallazgos_financieros")
        .select("id, tipo, fuente, procedencia, periodo, datos, confianza, creado_en")
        .eq("user_id", userId)
        .order("creado_en", { ascending: false }),
      supabase
        .from("planes")
        .select("meta, fecha_objetivo, tipo_meta, datos_meta")
        .eq("user_id", userId)
        .eq("activo", true)
        .maybeSingle(),
    ]);

  const errores = [
    resultadoTransacciones.error,
    resultadoDeudas.error,
    resultadoHallazgos.error,
    resultadoPlan.error,
  ].filter(Boolean);
  if (errores.length > 0) {
    throw new Error(
      `No se pudo construir el perfil financiero: ${errores.map((error) => error?.message).join("; ")}`,
    );
  }

  const transacciones = ((resultadoTransacciones.data ?? []) as FilaTransaccion[]).map(
    mapearTransaccion,
  );
  const deudas = ((resultadoDeudas.data ?? []) as FilaDeuda[]).map(mapearDeuda);
  const hallazgos = ((resultadoHallazgos.data ?? []) as FilaHallazgo[]).map(
    mapearHallazgo,
  );
  const objetivoAcceso = objetivoDesdePlan(
    (resultadoPlan.data as FilaPlanAcceso | null) ?? null,
  );

  return construirPerfilFinanciero({
    transacciones,
    deudas,
    hallazgos,
    objetivoAcceso,
    generadoEn,
  });
}

export function objetivoDesdePlan(
  plan: FilaPlanAcceso | null,
): ObjetivoAccesoFinanciero | null {
  if (!plan || plan.tipo_meta !== "demostrar_capacidad_arriendo") return null;

  const canonMensualObjetivo = numeroPositivo(
    plan.datos_meta?.canon_mensual_objetivo,
  );
  const ingresoMensualDeclarado = numeroPositivo(
    plan.datos_meta?.ingreso_mensual_declarado,
  );
  if (canonMensualObjetivo == null || ingresoMensualDeclarado == null) return null;

  return {
    tipo: "demostrar_capacidad_arriendo",
    descripcion: plan.meta,
    canonMensualObjetivo,
    ingresoMensualDeclarado,
    fechaObjetivo: plan.fecha_objetivo,
  };
}

function mapearTransaccion(fila: FilaTransaccion): TransaccionConId {
  return {
    id: fila.id,
    fecha: fila.fecha,
    monto: Number(fila.monto),
    tipo: fila.tipo,
    comercioRaw: fila.comercio_raw,
    comercioNorm: fila.comercio_norm ?? "",
    categoria: fila.categoria ?? "",
    cuenta: fila.cuenta ?? "Cuenta no identificada",
    fuente: fila.fuente,
    confianza: Number(fila.confianza),
  };
}

function mapearDeuda(fila: FilaDeuda): DeudaConEvidencia {
  return {
    id: fila.id,
    entidad: fila.entidad,
    tipo: fila.tipo,
    saldo: Number(fila.saldo),
    tasaEA: fila.tasa_ea == null ? null : Number(fila.tasa_ea),
    cuotaMensual: fila.cuota_mensual == null ? null : Number(fila.cuota_mensual),
    fuente: fila.fuente,
    confianza: fila.fuente === "manual" ? 0.75 : 0.95,
    actualizadoEn: fila.actualizado_en,
  };
}

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

function numeroPositivo(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0
    ? valor
    : null;
}
