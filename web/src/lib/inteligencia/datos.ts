import type {
  Deuda,
  EstadoFinanciero,
  HallazgoFinanciero,
  Plan,
  TipoHallazgo,
  Transaccion,
} from "@/types/finance";
import type { ContextoInteligencia } from "./tipos";

/**
 * Acceso a datos compartido por los expertos. Cada función filtra
 * explícitamente por `ctx.userId` — igual que mcp/src/lib/estado.ts y
 * web/src/lib/perfil/normalizacion.ts ya hacen — porque el contexto puede
 * venir de un cliente service_role (MCP) donde RLS no aplica.
 */

type FilaTransaccion = {
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

export async function obtenerTransacciones(ctx: ContextoInteligencia): Promise<Transaccion[]> {
  const { data, error } = await ctx.supabase
    .from("transacciones")
    .select("fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza")
    .eq("user_id", ctx.userId)
    .order("fecha", { ascending: true });

  if (error) throw new Error(`No se pudieron leer transacciones: ${error.message}`);

  return ((data ?? []) as FilaTransaccion[]).map((f) => ({
    fecha: f.fecha,
    monto: Number(f.monto),
    tipo: f.tipo,
    comercioRaw: f.comercio_raw,
    comercioNorm: f.comercio_norm ?? f.comercio_raw,
    categoria: f.categoria ?? "",
    cuenta: f.cuenta ?? "",
    fuente: f.fuente,
    confianza: Number(f.confianza),
  }));
}

type FilaDeuda = {
  entidad: string;
  tipo: string | null;
  saldo: number;
  tasa_ea: number | null;
  cuota_mensual: number | null;
};

export async function obtenerDeudas(ctx: ContextoInteligencia): Promise<Deuda[]> {
  const { data, error } = await ctx.supabase
    .from("deudas")
    .select("entidad, tipo, saldo, tasa_ea, cuota_mensual")
    .eq("user_id", ctx.userId);

  if (error) throw new Error(`No se pudieron leer deudas: ${error.message}`);

  return ((data ?? []) as FilaDeuda[]).map((d) => ({
    entidad: d.entidad,
    tipo: d.tipo,
    saldo: Number(d.saldo),
    tasaEA: d.tasa_ea == null ? null : Number(d.tasa_ea),
    cuotaMensual: d.cuota_mensual == null ? null : Number(d.cuota_mensual),
  }));
}

type FilaHallazgo = {
  id: string;
  tipo: TipoHallazgo;
  fuente: string;
  procedencia: HallazgoFinanciero["procedencia"];
  periodo: string | null;
  datos: Record<string, unknown>;
  confianza: number;
  creado_en: string;
};

export async function obtenerHallazgos(
  ctx: ContextoInteligencia,
  filtro?: { tipo?: TipoHallazgo; fuente?: string },
): Promise<HallazgoFinanciero[]> {
  let query = ctx.supabase
    .from("hallazgos_financieros")
    .select("id, tipo, fuente, procedencia, periodo, datos, confianza, creado_en")
    .eq("user_id", ctx.userId)
    .order("creado_en", { ascending: false });

  if (filtro?.tipo) query = query.eq("tipo", filtro.tipo);
  if (filtro?.fuente) query = query.eq("fuente", filtro.fuente);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron leer hallazgos: ${error.message}`);

  return ((data ?? []) as FilaHallazgo[]).map((f) => ({
    id: f.id,
    tipo: f.tipo,
    fuente: f.fuente,
    procedencia: f.procedencia,
    periodo: f.periodo,
    datos: f.datos,
    confianza: Number(f.confianza),
    creadoEn: f.creado_en,
  }));
}

type FilaPlan = {
  meta: string;
  aporte_mensual: number;
  pasos: string[];
  supuestos: string[];
  fecha_objetivo: string | null;
};

export async function obtenerPlanActivo(ctx: ContextoInteligencia): Promise<Plan | null> {
  const { data, error } = await ctx.supabase
    .from("planes")
    .select("meta, aporte_mensual, pasos, supuestos, fecha_objetivo")
    .eq("user_id", ctx.userId)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el plan activo: ${error.message}`);
  if (!data) return null;

  const fila = data as FilaPlan;
  return {
    meta: fila.meta,
    aporteMensual: Number(fila.aporte_mensual),
    pasos: fila.pasos ?? [],
    supuestos: fila.supuestos ?? [],
    fechaObjetivo: fila.fecha_objetivo ?? "",
  };
}

/** Meses de historia cubiertos por un conjunto de transacciones (mínimo 1). */
export function mesesDeHistoria(transacciones: Transaccion[]): number {
  if (transacciones.length === 0) return 0;
  const desde = new Date(transacciones[0].fecha);
  const hasta = new Date(transacciones[transacciones.length - 1].fecha);
  return Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
}

/**
 * Agregación pura de EstadoFinanciero a partir de transacciones + deudas ya
 * cargadas (misma lógica que mcp/src/lib/estado.ts, pero separada del
 * fetch para que los expertos puedan reutilizarla sin duplicar la query ni
 * el cálculo).
 */
export function calcularEstadoFinanciero(transacciones: Transaccion[], deudas: Deuda[]): EstadoFinanciero {
  if (transacciones.length === 0) {
    return {
      periodo: { desde: "", hasta: "", meses: 0 },
      ingresoMensual: 0,
      gastoMensual: 0,
      flujoNeto: 0,
      gastoPorCategoria: {},
      gastoSinCategorizar: 0,
      deudas,
      calidadDatos: { transacciones: 0, sinCategorizar: 0, confianzaMedia: 0 },
    };
  }

  const desde = transacciones[0].fecha;
  const hasta = transacciones[transacciones.length - 1].fecha;
  const meses = mesesDeHistoria(transacciones);

  let ingresos = 0;
  let gastos = 0;
  let sinCategorizarMonto = 0;
  let sinCategorizarCuenta = 0;
  let sumaConfianza = 0;
  const porCategoria: Record<string, number> = {};

  for (const t of transacciones) {
    sumaConfianza += t.confianza;
    if (t.tipo === "ingreso") {
      ingresos += t.monto;
      continue;
    }
    gastos += t.monto;
    if (t.categoria) {
      porCategoria[t.categoria] = (porCategoria[t.categoria] ?? 0) + t.monto;
    } else {
      sinCategorizarMonto += t.monto;
      sinCategorizarCuenta += 1;
    }
  }

  const porMes = (valor: number) => Math.round(valor / meses);

  return {
    periodo: { desde, hasta, meses },
    ingresoMensual: porMes(ingresos),
    gastoMensual: porMes(gastos),
    flujoNeto: porMes(ingresos - gastos),
    gastoPorCategoria: Object.fromEntries(Object.entries(porCategoria).map(([k, v]) => [k, porMes(v)])),
    gastoSinCategorizar: porMes(sinCategorizarMonto),
    deudas,
    calidadDatos: {
      transacciones: transacciones.length,
      sinCategorizar: sinCategorizarCuenta,
      confianzaMedia: Number((sumaConfianza / transacciones.length).toFixed(2)),
    },
  };
}

/**
 * Último ingreso mensual que el usuario declaró (ej. por voz, hallazgo
 * tipo "income"), si lo hay. Los expertos que dependen de un ingreso para
 * calcular una relación (carga de deuda/ingreso, cuota/ingreso) lo usan
 * como respaldo cuando calcularEstadoFinanciero da 0 por falta de
 * transacciones — sin esto, un usuario que solo habló por voz (sin Gmail
 * ni PDF) no tenía ingreso con el que calcular nada, aunque sí lo dijo.
 */
export async function obtenerIngresoDeclarado(
  ctx: ContextoInteligencia,
): Promise<{ valor: number; hallazgo: HallazgoFinanciero } | null> {
  const hallazgos = await obtenerHallazgos(ctx, { tipo: "income" });
  const candidato = hallazgos.find((h) => h.procedencia === "declarado" || h.procedencia === "confirmado");
  if (!candidato) return null;

  const datos = candidato.datos;
  const valor =
    typeof datos.valor_anual === "number"
      ? datos.valor_anual / 12
      : typeof datos.valor_mensual === "number"
        ? datos.valor_mensual
        : typeof datos.valor === "number"
          ? datos.valor
          : 0;

  return valor > 0 ? { valor, hallazgo: candidato } : null;
}

/** Flujo neto mensual, mes calendario a mes calendario (para tendencia/proyección). */
export function flujoNetoPorMes(transacciones: Transaccion[]): { mes: string; flujoNeto: number }[] {
  const porMes = new Map<string, number>();
  for (const t of transacciones) {
    const mes = t.fecha.slice(0, 7); // "YYYY-MM"
    const signo = t.tipo === "ingreso" ? 1 : -1;
    porMes.set(mes, (porMes.get(mes) ?? 0) + signo * t.monto);
  }
  return [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, flujoNeto]) => ({ mes, flujoNeto }));
}
