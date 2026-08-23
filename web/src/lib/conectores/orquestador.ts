import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerFuente } from "./catalogo";
import { construirGuion } from "./guiones";
import {
  ESTADOS_TERMINALES,
  type CampoSolicitado,
  type ConexionFuente,
  type EstadoConexion,
  type FinancialDataConnector,
  type HallazgoFixture,
} from "./tipos";

type FilaConexion = {
  id: string;
  user_id: string;
  fuente_id: string;
  estado: EstadoConexion;
  paso_actual: number;
  mensaje: string | null;
  campo_solicitado: CampoSolicitado | null;
  resultado_resumen: Record<string, unknown> | null;
  iniciado_en: string;
  actualizado_en: string;
  completado_en: string | null;
};

export type PayloadAccion =
  | { accion: "registro_campos"; valores: Record<string, string> }
  | { accion: "captcha" }
  | { accion: "otp"; codigo: string }
  | { accion: "iniciar_recuperacion" };

function mapearConexion(fila: FilaConexion): ConexionFuente {
  return {
    id: fila.id,
    userId: fila.user_id,
    fuenteId: fila.fuente_id,
    estado: fila.estado,
    pasoActual: fila.paso_actual,
    mensaje: fila.mensaje,
    campoSolicitado: fila.campo_solicitado,
    resultadoResumen: fila.resultado_resumen,
    iniciadoEn: fila.iniciado_en,
    actualizadoEn: fila.actualizado_en,
    completadoEn: fila.completado_en,
  };
}

function resumenFinal(fuente: FinancialDataConnector): Record<string, unknown> {
  if (fuente.resultado.tipo === "completed") {
    return { mensaje: fuente.resultado.resumen, hallazgos: fuente.resultado.hallazgos.length };
  }
  return { mensaje: fuente.resultado.resumen };
}

async function insertarHallazgos(
  supabase: SupabaseClient,
  userId: string,
  fuenteId: string,
  hallazgos: HallazgoFixture[],
): Promise<void> {
  if (hallazgos.length === 0) return;
  await supabase.from("hallazgos_financieros").insert(
    hallazgos.map((h) => ({
      user_id: userId,
      tipo: h.tipo,
      fuente: fuenteId,
      procedencia: "observado",
      periodo: h.periodo ?? null,
      datos: h.datos,
      confianza: h.confianza,
    })),
  );
}

export async function iniciarConexion(
  supabase: SupabaseClient,
  userId: string,
  fuenteId: string,
): Promise<ConexionFuente> {
  if (!obtenerFuente(fuenteId)) throw new Error(`Fuente desconocida: ${fuenteId}`);

  const ahora = new Date().toISOString();
  const { data, error } = await supabase
    .from("conexiones_fuente")
    .upsert(
      {
        user_id: userId,
        fuente_id: fuenteId,
        estado: "pending",
        paso_actual: 0,
        mensaje: null,
        campo_solicitado: null,
        resultado_resumen: null,
        iniciado_en: ahora,
        actualizado_en: ahora,
        completado_en: null,
      },
      { onConflict: "user_id,fuente_id" },
    )
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "No se pudo iniciar la conexión");
  return mapearConexion(data as FilaConexion);
}

export async function iniciarConexiones(
  supabase: SupabaseClient,
  userId: string,
  fuenteIds: string[],
): Promise<ConexionFuente[]> {
  const resultados: ConexionFuente[] = [];
  for (const fuenteId of fuenteIds) {
    resultados.push(await iniciarConexion(supabase, userId, fuenteId));
  }
  return resultados;
}

/** Cuánto simulamos que tarda el usuario en resolver un paso que lo espera. */
const MS_AUTO_RESOLUCION = 400;

/**
 * Avanza una fila si le corresponde: los pasos automáticos avanzan cuando
 * transcurrió su duración. Los pasos que esperan al usuario (registro,
 * CAPTCHA, OTP, recuperación) también avanzan solos con valores de fixture
 * — es una fuente simulada, no tiene sentido bloquear la demo esperando un
 * formulario que no existe; `resolverAccion` sigue disponible para quien
 * quiera resolverlos a mano antes de que le toque el turno automático. Sin
 * cola de jobs en el repo, el avance ocurre al leer — cada GET mueve lo que
 * haya que mover.
 */
async function avanzarYPersistir(supabase: SupabaseClient, fila: FilaConexion): Promise<FilaConexion> {
  if (ESTADOS_TERMINALES.includes(fila.estado)) return fila;

  const fuente = obtenerFuente(fila.fuente_id);
  if (!fuente) return fila;

  const guion = construirGuion(fuente);
  const pasoActualDef = guion[fila.paso_actual];
  if (!pasoActualDef) return fila;

  const duracion = pasoActualDef.kind === "espera_usuario" ? MS_AUTO_RESOLUCION : pasoActualDef.duracionMs;
  const transcurrido = Date.now() - new Date(fila.actualizado_en).getTime();
  if (transcurrido < duracion) return fila;

  const siguienteIndice = fila.paso_actual + 1;
  const siguientePaso = guion[siguienteIndice];
  if (!siguientePaso) return fila;

  const ahora = new Date().toISOString();
  const actualizacion: Record<string, unknown> = {
    paso_actual: siguienteIndice,
    estado: siguientePaso.estado,
    mensaje: siguientePaso.mensaje,
    actualizado_en: ahora,
  };

  if (siguientePaso.kind === "espera_usuario" && siguientePaso.accionEsperada === "registro_campos") {
    actualizacion.campo_solicitado = {
      campos: fuente.camposAdicionalesRequeridos,
    } satisfies CampoSolicitado;
  }

  if (ESTADOS_TERMINALES.includes(siguientePaso.estado)) {
    actualizacion.completado_en = ahora;
    actualizacion.resultado_resumen = resumenFinal(fuente);
    if (siguientePaso.estado === "completed" && fuente.resultado.tipo === "completed") {
      await insertarHallazgos(supabase, fila.user_id, fuente.id, fuente.resultado.hallazgos);
    }
  }

  const { data, error } = await supabase
    .from("conexiones_fuente")
    .update(actualizacion)
    .eq("id", fila.id)
    .select()
    .single();

  if (error || !data) return fila;
  return data as FilaConexion;
}

export async function listarConexiones(supabase: SupabaseClient, userId: string): Promise<ConexionFuente[]> {
  const { data, error } = await supabase
    .from("conexiones_fuente")
    .select("*")
    .eq("user_id", userId)
    .order("iniciado_en", { ascending: true });

  if (error) throw new Error(error.message);
  const filas = (data ?? []) as FilaConexion[];
  const actualizadas = await Promise.all(filas.map((fila) => avanzarYPersistir(supabase, fila)));
  return actualizadas.map(mapearConexion);
}

export async function resolverAccion(
  supabase: SupabaseClient,
  userId: string,
  conexionId: string,
  payload: PayloadAccion,
): Promise<ConexionFuente> {
  const { data: filaData, error: filaError } = await supabase
    .from("conexiones_fuente")
    .select("*")
    .eq("id", conexionId)
    .eq("user_id", userId)
    .single();

  if (filaError || !filaData) throw new Error("Conexión no encontrada");
  const fila = filaData as FilaConexion;

  const fuente = obtenerFuente(fila.fuente_id);
  if (!fuente) throw new Error(`Fuente desconocida: ${fila.fuente_id}`);

  const guion = construirGuion(fuente);
  const pasoActualDef = guion[fila.paso_actual];

  if (!pasoActualDef || pasoActualDef.kind !== "espera_usuario") {
    throw new Error("Esta conexión no está esperando una acción del usuario.");
  }
  if (pasoActualDef.accionEsperada !== payload.accion) {
    throw new Error(`Esta conexión espera "${pasoActualDef.accionEsperada}", no "${payload.accion}".`);
  }

  const siguienteIndice = fila.paso_actual + 1;
  const siguientePaso = guion[siguienteIndice];
  if (!siguientePaso) throw new Error("Guion inconsistente para esta fuente.");

  const ahora = new Date().toISOString();
  const actualizacion: Record<string, unknown> = {
    paso_actual: siguienteIndice,
    estado: siguientePaso.estado,
    mensaje: siguientePaso.mensaje,
    actualizado_en: ahora,
  };

  // Guardamos lo que el usuario respondió, como rastro de auditoría de esta
  // conexión (no se reescribe `personas`: estos campos son específicos de la
  // fuente, no parte de la identidad central del usuario).
  if (payload.accion === "registro_campos") {
    actualizacion.campo_solicitado = {
      campos: fuente.camposAdicionalesRequeridos,
      valores: payload.valores,
    } satisfies CampoSolicitado;
  }
  if (siguientePaso.kind === "espera_usuario" && siguientePaso.accionEsperada === "registro_campos") {
    actualizacion.campo_solicitado = {
      campos: fuente.camposAdicionalesRequeridos,
    } satisfies CampoSolicitado;
  }

  if (ESTADOS_TERMINALES.includes(siguientePaso.estado)) {
    actualizacion.completado_en = ahora;
    actualizacion.resultado_resumen = resumenFinal(fuente);
    if (siguientePaso.estado === "completed" && fuente.resultado.tipo === "completed") {
      await insertarHallazgos(supabase, userId, fuente.id, fuente.resultado.hallazgos);
    }
  }

  const { data, error } = await supabase
    .from("conexiones_fuente")
    .update(actualizacion)
    .eq("id", conexionId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "No se pudo actualizar la conexión");
  return mapearConexion(data as FilaConexion);
}

export async function reintentarConexion(
  supabase: SupabaseClient,
  userId: string,
  conexionId: string,
): Promise<ConexionFuente> {
  const ahora = new Date().toISOString();
  const { data, error } = await supabase
    .from("conexiones_fuente")
    .update({
      estado: "pending",
      paso_actual: 0,
      mensaje: null,
      campo_solicitado: null,
      resultado_resumen: null,
      completado_en: null,
      actualizado_en: ahora,
    })
    .eq("id", conexionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "No se pudo reintentar la conexión");
  return mapearConexion(data as FilaConexion);
}

export async function desconectarConexion(
  supabase: SupabaseClient,
  userId: string,
  conexionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("conexiones_fuente")
    .delete()
    .eq("id", conexionId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
