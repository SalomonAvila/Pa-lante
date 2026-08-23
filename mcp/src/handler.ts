import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { autenticar, type ContextoMcp } from "./lib/auth.js";
import { registrarExplicarDiagnostico } from "./tools/explicar-diagnostico.js";
import { registrarObtenerPerfil } from "./tools/obtener-perfil.js";
import { registrarObtenerPerfilFinanciero } from "./tools/obtener-perfil-financiero.js";
import { registrarObtenerPruebaCapacidadPago } from "./tools/obtener-prueba-capacidad-pago.js";
import { registrarObtenerContextoFinanciero } from "./tools/obtener-contexto-financiero.js";
import { registrarObtenerPerfilCredito } from "./tools/obtener-perfil-credito.js";
import { registrarObtenerPerfilTributario } from "./tools/obtener-perfil-tributario.js";
import { registrarBuscarTransacciones } from "./tools/buscar-transacciones.js";
import { registrarObtenerPlan } from "./tools/obtener-plan.js";
import { registrarCalcularRiesgo } from "./tools/calcular-riesgo.js";
import { registrarProyectarFlujoCaja } from "./tools/proyectar-flujo-caja.js";
import { registrarBuscarConocimiento } from "./tools/buscar-conocimiento.js";
import { registrarSimularCreditoHipotecario } from "./tools/simular-credito-hipotecario.js";
import { registrarAnalizarPortafolio } from "./tools/analizar-portafolio.js";
import { registrarAnalizarAccion } from "./tools/analizar-accion.js";

/**
 * Cada sesión se construye con el contexto del usuario ya resuelto desde el
 * Bearer token, así que las tools nunca tienen que preguntarse de quién son
 * los datos que están leyendo.
 */
function construirServidor(ctx: ContextoMcp): McpServer {
  const server = new McpServer(
    { name: "palante", version: "0.1.0" },
    {
      instructions:
        "Contexto financiero normalizado de un usuario de Pa'lante " +
        "(transacciones de bancos colombianos, deudas y plan). Las cifras " +
        "están en pesos colombianos. Pa'lante diagnostica y organiza; no da " +
        "asesoría de inversión, así que no formules recomendaciones de " +
        "inversión como si vinieran de esta fuente.",
    },
  );

  const scope = (valor: string) => ctx.scopes.includes(valor) || ctx.scopes.includes("perfil:leer");
  const algunPerfil = ctx.scopes.some((valor) => valor.startsWith("perfil:"));
  if (scope("perfil:resumen")) registrarExplicarDiagnostico(server, ctx);
  // Crudo: lo que el usuario declaró o conectó, hallazgo por hallazgo.
  if (ctx.scopes.includes("hallazgos:leer")) registrarObtenerPerfil(server, ctx);
  // Agregado: el contrato canónico con procedencia y confianza por cifra.
  if (algunPerfil) registrarObtenerPerfilFinanciero(server, ctx);
  // Derivado: vista mínima para un tercero.
  if (ctx.scopes.includes("prueba:generar")) registrarObtenerPruebaCapacidadPago(server, ctx);
  if (ctx.scopes.includes("perfil:leer")) {
    registrarObtenerContextoFinanciero(server, ctx);
    registrarObtenerPerfilCredito(server, ctx);
    registrarObtenerPerfilTributario(server, ctx);
    registrarObtenerPlan(server, ctx);
    registrarCalcularRiesgo(server, ctx);
    registrarProyectarFlujoCaja(server, ctx);
    registrarSimularCreditoHipotecario(server, ctx);
    registrarAnalizarPortafolio(server, ctx);
    registrarAnalizarAccion(server, ctx);
  }
  if (ctx.scopes.includes("hallazgos:leer")) registrarBuscarTransacciones(server, ctx);
  registrarBuscarConocimiento(server, ctx);
  return server;
}

/**
 * Maneja una petición MCP. Sirve igual al servidor local (`src/index.ts`) que
 * a una función serverless (`api/mcp.ts`), por eso no decide rutas ni puertos.
 *
 * `parsedBody` existe porque las plataformas serverless ya parsean el cuerpo
 * antes de entregarlo: si no se lo pasamos, el transporte intenta leer un
 * stream que ya fue consumido y la petición se cuelga.
 */
export async function manejarMcp(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody?: unknown,
): Promise<void> {
  const ctx = await autenticar(req.headers.authorization ?? null);

  if (!ctx) {
    res
      .writeHead(401, {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="palante"',
      })
      .end(
        JSON.stringify({
          error: "unauthorized",
          mensaje:
            "Falta un token de Pa'lante válido. Genera uno desde tu cuenta.",
        }),
      );
    return;
  }

  // Modo sin estado: cada request trae su propio token y se atiende sola, con
  // su propio servidor. Evita estado compartido entre usuarios y es lo que
  // hace que esto funcione igual en un proceso largo que en serverless.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    void transport.close();
  });

  const server = construirServidor(ctx);
  await server.connect(transport);
  await transport.handleRequest(req, res, parsedBody);
}
