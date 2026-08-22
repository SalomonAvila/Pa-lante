import { createClient } from "@supabase/supabase-js";
import type { EstadoFinanciero, Deuda } from "@web/types/finance";
import { ESTADO_EJEMPLO } from "../fixtures/estado-ejemplo.js";
import type { ContextoMcp } from "./auth.js";

type FilaTransaccion = {
  fecha: string;
  monto: number;
  tipo: "ingreso" | "gasto";
  categoria: string | null;
  confianza: number;
};

/**
 * Arma el EstadoFinanciero del usuario.
 *
 * PROVISIONAL: la agregación vive acá mientras el equipo de ingesta y el de
 * diagnóstico definen dónde va. El contrato hacia el MCP es EstadoFinanciero;
 * mover el cálculo no cambia ninguna herramienta.
 */
export async function obtenerEstado(ctx: ContextoMcp): Promise<EstadoFinanciero> {
  if (ctx.demo) return ESTADO_EJEMPLO;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Filtro explícito por user_id: acá no hay RLS que nos cubra (ver auth.ts).
  const [{ data: transacciones }, { data: deudas }] = await Promise.all([
    supabase
      .from("transacciones")
      .select("fecha, monto, tipo, categoria, confianza")
      .eq("user_id", ctx.userId)
      .order("fecha", { ascending: true }),
    supabase
      .from("deudas")
      .select("entidad, tipo, saldo, tasa_ea, cuota_mensual")
      .eq("user_id", ctx.userId),
  ]);

  const filas = (transacciones ?? []) as FilaTransaccion[];

  // Sin datos todavía: devolvemos un estado vacío y honesto, no el fixture.
  if (filas.length === 0) {
    return {
      periodo: { desde: "", hasta: "", meses: 0 },
      ingresoMensual: 0,
      gastoMensual: 0,
      flujoNeto: 0,
      gastoPorCategoria: {},
      gastoSinCategorizar: 0,
      deudas: mapearDeudas(deudas),
      calidadDatos: { transacciones: 0, sinCategorizar: 0, confianzaMedia: 0 },
    };
  }

  const desde = filas[0].fecha;
  const hasta = filas[filas.length - 1].fecha;
  const meses = Math.max(1, mesesEntre(desde, hasta));

  let ingresos = 0;
  let gastos = 0;
  let sinCategorizarMonto = 0;
  let sinCategorizarCuenta = 0;
  let sumaConfianza = 0;
  const porCategoria: Record<string, number> = {};

  for (const fila of filas) {
    const monto = Number(fila.monto);
    sumaConfianza += Number(fila.confianza);

    if (fila.tipo === "ingreso") {
      ingresos += monto;
      continue;
    }

    gastos += monto;
    if (fila.categoria) {
      porCategoria[fila.categoria] = (porCategoria[fila.categoria] ?? 0) + monto;
    } else {
      sinCategorizarMonto += monto;
      sinCategorizarCuenta += 1;
    }
  }

  const porMes = (valor: number) => Math.round(valor / meses);

  return {
    periodo: { desde, hasta, meses },
    ingresoMensual: porMes(ingresos),
    gastoMensual: porMes(gastos),
    flujoNeto: porMes(ingresos - gastos),
    gastoPorCategoria: Object.fromEntries(
      Object.entries(porCategoria).map(([k, v]) => [k, porMes(v)]),
    ),
    gastoSinCategorizar: porMes(sinCategorizarMonto),
    deudas: mapearDeudas(deudas),
    calidadDatos: {
      transacciones: filas.length,
      sinCategorizar: sinCategorizarCuenta,
      confianzaMedia: Number((sumaConfianza / filas.length).toFixed(2)),
    },
  };
}

type FilaDeuda = {
  entidad: string;
  tipo: string | null;
  saldo: number;
  tasa_ea: number | null;
  cuota_mensual: number | null;
};

function mapearDeudas(filas: unknown): Deuda[] {
  return ((filas ?? []) as FilaDeuda[]).map((d) => ({
    entidad: d.entidad,
    tipo: d.tipo,
    saldo: Number(d.saldo),
    tasaEA: d.tasa_ea == null ? null : Number(d.tasa_ea),
    cuotaMensual: d.cuota_mensual == null ? null : Number(d.cuota_mensual),
  }));
}

function mesesEntre(desde: string, hasta: string): number {
  const a = new Date(desde);
  const b = new Date(hasta);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}
