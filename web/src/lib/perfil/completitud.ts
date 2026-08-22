import type { SupabaseClient } from "@supabase/supabase-js";
import type { HallazgoFinanciero } from "@/types/finance";

export type Completitud = {
  porcentaje: number;
  camposFaltantes: string[];
};

type DatosPerfil = {
  tienePersona: boolean;
  hallazgos: HallazgoFinanciero[];
  tieneIngresoObservado: boolean;
  tieneGastoObservado: boolean;
  tieneDeudaObservada: boolean;
};

type CampoEsperado = {
  id: string;
  etiqueta: string;
  cubierto: (datos: DatosPerfil) => boolean;
};

/** Ruta que el objetivo declarado (hallazgo `tipo: "goal"`) apunta a seguir. */
function rutaDeclarada(hallazgos: HallazgoFinanciero[]): "deudas" | "ahorro" | "visibilidad" | null {
  const meta = hallazgos.find((h) => h.tipo === "goal");
  const valor = meta?.datos.ruta;
  if (valor === "deudas" || valor === "ahorro" || valor === "visibilidad") return valor;
  return null;
}

const CAMPOS_BASE: CampoEsperado[] = [
  {
    id: "identidad",
    etiqueta: "Datos básicos de identidad",
    cubierto: (d) => d.tienePersona,
  },
  {
    id: "objetivo",
    etiqueta: "Objetivo financiero (qué quiere lograr)",
    cubierto: (d) => d.hallazgos.some((h) => h.tipo === "goal"),
  },
  {
    id: "ingreso",
    etiqueta: "Ingreso mensual aproximado",
    cubierto: (d) => d.tieneIngresoObservado || d.hallazgos.some((h) => h.tipo === "income"),
  },
];

/** Campos extra según la ruta que ya se intuye por el objetivo declarado. */
const CAMPOS_POR_RUTA: Record<"deudas" | "ahorro" | "visibilidad", CampoEsperado[]> = {
  deudas: [
    {
      id: "deuda",
      etiqueta: "Deudas actuales (saldo y, si se sabe, tasa o cuota)",
      cubierto: (d) => d.tieneDeudaObservada || d.hallazgos.some((h) => h.tipo === "liability"),
    },
  ],
  ahorro: [
    {
      id: "meta_ahorro",
      etiqueta: "Monto y fecha objetivo de ahorro",
      cubierto: (d) => {
        const meta = d.hallazgos.find((h) => h.tipo === "goal");
        return Boolean(meta?.datos.monto_objetivo && meta?.datos.fecha_objetivo);
      },
    },
  ],
  visibilidad: [
    {
      id: "gasto",
      etiqueta: "Gasto mensual aproximado",
      cubierto: (d) => d.tieneGastoObservado,
    },
  ],
};

/**
 * % de completitud del perfil, contando TODAS las fuentes por igual (voz,
 * Gmail, PDF, manual) — no solo lo que se dijo por conversación. Es lo que
 * usa el agente de voz para decidir qué preguntar y cuándo parar.
 */
export async function calcularCompletitud(supabase: SupabaseClient, userId: string): Promise<Completitud> {
  const [{ data: persona }, { data: hallazgosData }, { data: transacciones }, { data: deudas }] = await Promise.all([
    supabase.from("personas").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("hallazgos_financieros")
      .select("id, tipo, fuente, procedencia, periodo, datos, confianza, creado_en")
      .eq("user_id", userId),
    supabase.from("transacciones").select("tipo").eq("user_id", userId).limit(1),
    supabase.from("deudas").select("id").eq("user_id", userId).limit(1),
  ]);

  const hallazgos = (hallazgosData ?? []) as unknown as HallazgoFinanciero[];
  const filasTx = (transacciones ?? []) as { tipo: "ingreso" | "gasto" }[];

  const datos: DatosPerfil = {
    tienePersona: Boolean(persona),
    hallazgos,
    tieneIngresoObservado: filasTx.some((f) => f.tipo === "ingreso"),
    tieneGastoObservado: filasTx.some((f) => f.tipo === "gasto"),
    tieneDeudaObservada: (deudas ?? []).length > 0,
  };

  const ruta = rutaDeclarada(hallazgos);
  const camposEsperados = ruta ? [...CAMPOS_BASE, ...CAMPOS_POR_RUTA[ruta]] : CAMPOS_BASE;

  const faltantes = camposEsperados.filter((c) => !c.cubierto(datos));
  const porcentaje = Math.round(((camposEsperados.length - faltantes.length) / camposEsperados.length) * 100);

  return {
    porcentaje,
    camposFaltantes: faltantes.map((c) => c.etiqueta),
  };
}
