import { expertoAcciones } from "./expertos/acciones";
import { expertoAnomalias } from "./expertos/anomalias";
import { expertoCredito } from "./expertos/credito";
import { expertoDeuda } from "./expertos/deuda";
import { expertoFlujoCaja } from "./expertos/flujo-caja";
import { expertoHipotecario } from "./expertos/hipotecario";
import { expertoInversiones } from "./expertos/inversiones";
import { expertoPresupuesto } from "./expertos/presupuesto";
import { expertoProyeccion } from "./expertos/proyeccion";
import { expertoRiesgo } from "./expertos/riesgo";
import { expertoTributario } from "./expertos/tributario";
import type { ContextoInteligencia, ExpertDefinition, ExpertoId, ExpertResult } from "./tipos";
import { registrarAnalisis } from "./trust/auditoria";

/**
 * El "hormiguero" (sección 1 del pedido). Los 8 primeros son estrictamente
 * diagnóstico/organización/seguimiento (principio #2 original de
 * PRODUCT.md). hipotecario/inversiones/acciones sí analizan y comparan
 * financiación, portafolio y renta variable — bajo la misma regla dura que
 * el resto: nunca terminan en una instrucción de compra/venta ni en "elige
 * esta entidad" (ver PRODUCT.md principio #2 actualizado y CLAUDE.md).
 * Agregar un experto nuevo es agregar un archivo en expertos/ + una entrada
 * acá: el orquestador no se toca.
 */
export const REGISTRO_EXPERTOS: ExpertDefinition[] = [
  expertoPresupuesto,
  expertoDeuda,
  expertoFlujoCaja,
  expertoCredito,
  expertoTributario,
  expertoRiesgo,
  expertoAnomalias,
  expertoProyeccion,
  expertoHipotecario,
  expertoInversiones,
  expertoAcciones,
];

export function obtenerExperto(id: ExpertoId): ExpertDefinition {
  const experto = REGISTRO_EXPERTOS.find((e) => e.id === id);
  if (!experto) throw new Error(`Experto desconocido: ${id}`);
  return experto;
}

/**
 * Consulta un experto y deja el rastro de auditoría (sección 16) en una
 * sola operación. La usan tanto el orquestador (web/src/lib/inteligencia/
 * orquestador.ts, dentro del loop de tool_use) como las tools MCP que
 * exponen un experto directamente a agentes externos — así ninguna de las
 * dos superficies puede "olvidarse" de auditar una consulta.
 */
export async function consultarExperto(
  ctx: ContextoInteligencia,
  id: ExpertoId,
  pregunta: string,
  conversacionId?: string | null,
): Promise<ExpertResult> {
  const experto = obtenerExperto(id);
  const resultado = await experto.ejecutar(ctx, pregunta);

  await registrarAnalisis(ctx, {
    conversacionId: conversacionId ?? null,
    expertosInvocados: [id],
    herramientas: [`consultar_experto_${id}`],
    fuentes: resultado.fuentes,
    confianza: resultado.confianza,
    resultado,
    advertencias: resultado.advertencias,
  });

  return resultado;
}
