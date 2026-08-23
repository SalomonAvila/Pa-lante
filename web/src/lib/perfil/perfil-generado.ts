import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { PerfilFinancieroV1 } from "@/types/finance";
import type { ProblemaSeleccionado } from "@/lib/problemas/catalogo";
import { clienteAnthropic, MODELO } from "@/lib/inteligencia/llm";
import { tieneScope } from "@/lib/api/scopes";

const ItemSchema = z.object({ titulo: z.string(), detalle: z.string() });
const AlertaSchema = ItemSchema.extend({ prioridad: z.enum(["alta", "media", "baja"]) });

export const NarrativaPerfilSchema = z.object({
  resumenEjecutivo: z.string(),
  lecturaObjetivo: z.string(),
  fortalezas: z.array(ItemSchema).max(4),
  alertas: z.array(AlertaSchema).max(4),
  prioridades: z.array(ItemSchema.extend({ proximoPaso: z.string() })).max(4),
  preguntasPendientes: z.array(z.string()).max(5),
  limites: z.array(z.string()).max(5),
});

export type NarrativaPerfil = z.infer<typeof NarrativaPerfilSchema>;

export type PerfilFinancieroGenerado = {
  version: "1.1";
  generadoEn: string;
  generadoPor: { motor: "anthropic" | "reglas-locales"; modelo: string };
  identidad: { nombre: string; ciudad: string | null } | null;
  problema: ProblemaSeleccionado | null;
  narrativa: NarrativaPerfil;
  perfilBase: PerfilFinancieroV1;
  contexto: { hallazgos: number; documentos: number; conversaciones: number };
};

type ContextoGeneracion = {
  identidad: PerfilFinancieroGenerado["identidad"];
  problema: ProblemaSeleccionado | null;
  hallazgos: unknown[];
  documentos: unknown[];
  conversaciones: number;
};

export async function obtenerContextoGeneracion(supabase: SupabaseClient, userId: string): Promise<ContextoGeneracion> {
  const [contacto, memoria, hallazgos, documentos, conversaciones] = await Promise.all([
    supabase.from("contacto_basico").select("nombres, apellidos, ciudad").eq("user_id", userId).maybeSingle(),
    supabase.from("perfil_conversacional").select("preferencias").eq("user_id", userId).maybeSingle(),
    supabase.from("hallazgos_financieros").select("tipo, fuente, procedencia, periodo, datos, confianza").eq("user_id", userId).order("creado_en", { ascending: false }).limit(50),
    supabase.from("documentos_financieros").select("storage_path, tipo, estado_extraccion, creado_en").eq("user_id", userId).order("creado_en", { ascending: false }).limit(30),
    supabase.from("conversaciones").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const errores = [contacto.error, memoria.error, hallazgos.error, documentos.error, conversaciones.error].filter(Boolean);
  if (errores.length) throw new Error("No pudimos reunir todo el contexto del perfil.");
  const c = contacto.data;
  const preferencias = memoria.data?.preferencias as Record<string, unknown> | null | undefined;
  return {
    identidad: c ? { nombre: `${c.nombres} ${c.apellidos}`.trim(), ciudad: c.ciudad ?? null } : null,
    problema: (preferencias?.problema_activo as ProblemaSeleccionado | undefined) ?? null,
    hallazgos: hallazgos.data ?? [],
    documentos: documentos.data ?? [],
    conversaciones: conversaciones.count ?? 0,
  };
}

export async function generarPerfilConNarrativa(
  perfilBase: PerfilFinancieroV1,
  contexto: ContextoGeneracion,
): Promise<PerfilFinancieroGenerado> {
  let narrativa: NarrativaPerfil;
  let motor: PerfilFinancieroGenerado["generadoPor"]["motor"] = "reglas-locales";
  let modelo = "perfil-canónico-v1";

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      const respuesta = await clienteAnthropic().messages.parse({
        model: MODELO,
        max_tokens: 2500,
        system: [
          "Eres el analista de perfil financiero de Pa'lante para Colombia.",
          "Convierte evidencia estructurada en una lectura clara, concreta y accionable en español.",
          "Nunca inventes cifras, productos, tasas ni hechos. Distingue lo declarado de lo observado.",
          "Si faltan datos, dilo. No des órdenes de inversión ni te presentes como asesor licenciado.",
          "Prioriza el problema seleccionado por la persona y propone próximos pasos pequeños y verificables.",
        ].join("\n"),
        output_config: { format: zodOutputFormat(NarrativaPerfilSchema) },
        messages: [{
          role: "user",
          content: `Construye el perfil usando solamente este contexto JSON:\n${JSON.stringify({
            identidad: contexto.identidad,
            problema: contexto.problema,
            perfilFinancieroVerificable: perfilBase,
            hallazgos: contexto.hallazgos,
            documentos: contexto.documentos,
          })}`,
        }],
      });
      if (!respuesta.parsed_output) throw new Error("Anthropic no devolvió un perfil estructurado.");
      narrativa = respuesta.parsed_output;
      motor = "anthropic";
      modelo = MODELO;
    } catch (error) {
      console.error("Falló la narrativa Anthropic; se usará respaldo local", error);
      narrativa = narrativaLocal(perfilBase, contexto.problema, true);
    }
  } else {
    narrativa = narrativaLocal(perfilBase, contexto.problema, false);
  }

  return {
    version: "1.1",
    generadoEn: perfilBase.generadoEn,
    generadoPor: { motor, modelo },
    identidad: contexto.identidad,
    problema: contexto.problema,
    narrativa,
    perfilBase,
    contexto: {
      hallazgos: contexto.hallazgos.length,
      documentos: contexto.documentos.length,
      conversaciones: contexto.conversaciones,
    },
  };
}

function narrativaLocal(perfil: PerfilFinancieroV1, problema: ProblemaSeleccionado | null, falloAnthropic: boolean): NarrativaPerfil {
  const calidad = perfil.calidadDatos;
  const ingreso = perfil.ingresos.verificado.valor ?? 0;
  const flujo = perfil.flujo.flujoLibreObservado.valor ?? 0;
  const carga = perfil.obligaciones.cargaFinanciera.valor ?? 0;
  const fortalezas: NarrativaPerfil["fortalezas"] = [];
  const alertas: NarrativaPerfil["alertas"] = [];
  if (ingreso > 0) fortalezas.push({ titulo: "Ingreso con evidencia", detalle: "Ya existe una base observable para entender tu capacidad mensual." });
  if (flujo > 0) fortalezas.push({ titulo: "Margen mensual positivo", detalle: "Los datos disponibles muestran un margen entre ingresos y gastos observados." });
  if (carga > 35) alertas.push({ titulo: "Carga financiera relevante", detalle: "Una parte importante del ingreso observado está comprometida en cuotas conocidas.", prioridad: "alta" });
  for (const advertencia of calidad.advertencias.slice(0, 3)) alertas.push({ titulo: "Dato por validar", detalle: advertencia, prioridad: "media" });
  if (!fortalezas.length) fortalezas.push({ titulo: "Contexto iniciado", detalle: "Ya consolidaste el objetivo y una primera versión de tus datos en un solo lugar." });
  return {
    resumenEjecutivo: `Tu perfil está ${calidad.completitud}% completo. ${flujo >= 0 ? "El flujo observado no es negativo" : "Los gastos observados superan el ingreso verificado"}, pero la lectura debe considerar los datos que aún faltan.`,
    lecturaObjetivo: problema ? `Este perfil se orienta a “${problema.titulo}”. La siguiente iteración debe cerrar primero los vacíos que más cambian esa decisión.` : "Aún no hay un objetivo activo; definirlo permitirá priorizar mejor las siguientes preguntas.",
    fortalezas,
    alertas,
    prioridades: calidad.datosFaltantes.slice(0, 3).map((dato) => ({ titulo: `Completar ${dato.replaceAll("_", " ")}`, detalle: "Este dato aumentará la precisión del perfil.", proximoPaso: "Agrégalo en una nueva sesión o adjunta un soporte que lo evidencie." })),
    preguntasPendientes: calidad.datosFaltantes.slice(0, 5).map((dato) => `¿Cómo podemos confirmar ${dato.replaceAll("_", " ")}?`),
    limites: ["Este perfil organiza evidencia disponible; no constituye asesoría financiera.", ...(falloAnthropic ? ["La generación con Anthropic falló y se usó el análisis local."] : ["La API de Anthropic no estaba configurada; se usó el análisis local."])],
  };
}

export async function obtenerUltimoPerfilGenerado(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("perfiles_financieros_generados").select("id, version, datos, generado_en").eq("user_id", userId).order("generado_en", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { id: data.id as string, generadoEn: data.generado_en as string, perfil: data.datos as PerfilFinancieroGenerado } : null;
}

export function filtrarPerfilPorScopes(perfil: PerfilFinancieroGenerado, scopes: string[]) {
  if (scopes.includes("perfil:leer")) return perfil;
  const salida: Record<string, unknown> = { version: perfil.version, generadoEn: perfil.generadoEn, generadoPor: perfil.generadoPor };
  if (tieneScope(scopes, "perfil:identidad")) salida.identidad = perfil.identidad;
  if (tieneScope(scopes, "perfil:objetivo")) salida.problema = perfil.problema;
  const narrativa: Record<string, unknown> = {};
  if (tieneScope(scopes, "perfil:resumen")) Object.assign(narrativa, { resumenEjecutivo: perfil.narrativa.resumenEjecutivo, fortalezas: perfil.narrativa.fortalezas, alertas: perfil.narrativa.alertas });
  if (tieneScope(scopes, "perfil:objetivo")) narrativa.lecturaObjetivo = perfil.narrativa.lecturaObjetivo;
  if (tieneScope(scopes, "perfil:acciones")) Object.assign(narrativa, { prioridades: perfil.narrativa.prioridades, preguntasPendientes: perfil.narrativa.preguntasPendientes, limites: perfil.narrativa.limites });
  if (Object.keys(narrativa).length) salida.narrativa = narrativa;
  const base: Record<string, unknown> = {};
  if (tieneScope(scopes, "perfil:ingresos")) base.ingresos = perfil.perfilBase.ingresos;
  if (tieneScope(scopes, "perfil:flujo")) base.flujo = perfil.perfilBase.flujo;
  if (tieneScope(scopes, "perfil:obligaciones")) base.obligaciones = perfil.perfilBase.obligaciones;
  if (tieneScope(scopes, "perfil:patrimonio")) base.patrimonio = perfil.perfilBase.patrimonio;
  if (tieneScope(scopes, "perfil:calidad")) Object.assign(base, { periodo: perfil.perfilBase.periodo, cobertura: perfil.perfilBase.cobertura, calidadDatos: perfil.perfilBase.calidadDatos });
  if (Object.keys(base).length) salida.perfilBase = base;
  if (tieneScope(scopes, "perfil:calidad")) salida.contexto = perfil.contexto;
  return salida;
}

export function filtrarPerfilBasePorScopes(perfil: PerfilFinancieroV1, scopes: string[]) {
  if (scopes.includes("perfil:leer")) return perfil;
  const salida: Record<string, unknown> = { version: perfil.version, generadoEn: perfil.generadoEn };
  if (tieneScope(scopes, "perfil:ingresos")) salida.ingresos = perfil.ingresos;
  if (tieneScope(scopes, "perfil:flujo")) salida.flujo = perfil.flujo;
  if (tieneScope(scopes, "perfil:obligaciones")) salida.obligaciones = perfil.obligaciones;
  if (tieneScope(scopes, "perfil:patrimonio")) salida.patrimonio = perfil.patrimonio;
  if (tieneScope(scopes, "perfil:calidad")) Object.assign(salida, { periodo: perfil.periodo, cobertura: perfil.cobertura, calidadDatos: perfil.calidadDatos });
  return salida;
}
