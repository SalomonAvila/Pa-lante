import { describe, expect, test } from "bun:test";
import { construirPerfilFinanciero } from "./perfil-financiero";
import { ENTRADA_DANIELA } from "./fixtures/daniela";
import { filtrarPerfilPorScopes, type PerfilFinancieroGenerado } from "./perfil-generado";

const base = construirPerfilFinanciero(ENTRADA_DANIELA);
const perfil: PerfilFinancieroGenerado = {
  version: "1.1",
  generadoEn: base.generadoEn,
  generadoPor: { motor: "reglas-locales", modelo: "test" },
  identidad: { nombre: "Daniela", ciudad: "Bogotá" },
  problema: { id: "salir-de-deudas", titulo: "Salir de deudas", descripcion: "Reducir obligaciones" },
  narrativa: {
    resumenEjecutivo: "Resumen",
    lecturaObjetivo: "Objetivo",
    fortalezas: [], alertas: [], prioridades: [], preguntasPendientes: [], limites: [],
  },
  perfilBase: base,
  contexto: { hallazgos: 3, documentos: 1, conversaciones: 1 },
};

describe("scopes del perfil generado", () => {
  test("un token de resumen no filtra identidad ni cifras", () => {
    const salida = filtrarPerfilPorScopes(perfil, ["perfil:resumen"]);
    expect(salida.identidad).toBeUndefined();
    expect(salida.problema).toBeUndefined();
    expect(salida.perfilBase).toBeUndefined();
    expect((salida.narrativa as Record<string, unknown>).resumenEjecutivo).toBe("Resumen");
  });

  test("un token de ingresos no recibe flujo, obligaciones o patrimonio", () => {
    const salida = filtrarPerfilPorScopes(perfil, ["perfil:ingresos"]);
    const filtrado = salida.perfilBase as Record<string, unknown>;
    expect(filtrado.ingresos).toBeDefined();
    expect(filtrado.flujo).toBeUndefined();
    expect(filtrado.obligaciones).toBeUndefined();
    expect(filtrado.patrimonio).toBeUndefined();
  });
});
