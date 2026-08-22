import { describe, expect, it } from "bun:test";
import { ENTRADA_DANIELA } from "./fixtures/daniela";
import {
  construirPerfilFinanciero,
  crearPruebaCapacidadPago,
  type EntradaPerfilFinanciero,
} from "./perfil-financiero";
import { objetivoDesdePlan } from "./obtener-perfil";

describe("perfil financiero portable", () => {
  it("calcula cuánto ingreso declarado está respaldado por datos observados", () => {
    const perfil = construirPerfilFinanciero(ENTRADA_DANIELA);

    expect(perfil.ingresos.declarado.valor).toBe(4_200_000);
    expect(perfil.ingresos.verificado.valor).toBe(3_950_000);
    expect(perfil.ingresos.porcentajeVerificado.valor).toBe(94.05);
    expect(perfil.periodo.mesesObservados).toBe(6);
    expect(perfil.contextoObjetivo.estadoPreparacion).toBe("listo_para_compartir");
  });

  it("no suma dos veces una obligación observada en deuda y hallazgo", () => {
    const entradaConNombresDistintos: EntradaPerfilFinanciero = {
      ...ENTRADA_DANIELA,
      deudas: ENTRADA_DANIELA.deudas.map((deuda) => ({
        ...deuda,
        entidad: "Tarjeta de crédito Bancolombia",
      })),
    };
    const perfil = construirPerfilFinanciero(entradaConNombresDistintos);

    expect(perfil.obligaciones.deudaTotal.valor).toBe(8_000_000);
    expect(perfil.obligaciones.cuotaMensual.valor).toBe(650_000);
    expect(perfil.obligaciones.deudaTotal.evidencia).toHaveLength(2);
  });

  it("genera una prueba compartible sin transacciones ni referencias privadas", () => {
    const perfil = construirPerfilFinanciero(ENTRADA_DANIELA);
    const prueba = crearPruebaCapacidadPago(perfil);
    const serializada = JSON.stringify(prueba);

    expect(prueba.ingresoMensualVerificado).toBe(3_950_000);
    expect(prueba.canonMensualObjetivo).toBe(1_300_000);
    expect(serializada).not.toContain("evidencia");
    expect(serializada).not.toContain("Bancolombia");
    expect(serializada).not.toContain("Nequi");
    expect(serializada).not.toContain("comercio");
  });

  it("declara que faltan datos sin reemplazarlos por el fixture", () => {
    const entradaVacia: EntradaPerfilFinanciero = {
      transacciones: [],
      deudas: [],
      hallazgos: [],
      objetivoAcceso: null,
      generadoEn: "2026-08-22T15:00:00.000Z",
    };
    const perfil = construirPerfilFinanciero(entradaVacia);

    expect(perfil.ingresos.verificado.valor).toBe(0);
    expect(perfil.contextoObjetivo.estadoPreparacion).toBe("sin_datos");
    expect(perfil.calidadDatos.completitud).toBe(0);
    expect(perfil.calidadDatos.datosFaltantes).toContain("ingreso_observado");
  });

  it("convierte una meta estructurada de planes y rechaza payloads incompletos", () => {
    const objetivo = objetivoDesdePlan({
      meta: "Demostrar capacidad económica para un arriendo",
      fecha_objetivo: "2026-09-15",
      tipo_meta: "demostrar_capacidad_arriendo",
      datos_meta: {
        canon_mensual_objetivo: 1_300_000,
        ingreso_mensual_declarado: 4_200_000,
      },
    });

    expect(objetivo?.canonMensualObjetivo).toBe(1_300_000);
    expect(
      objetivoDesdePlan({
        meta: "Meta incompleta",
        fecha_objetivo: null,
        tipo_meta: "demostrar_capacidad_arriendo",
        datos_meta: { canon_mensual_objetivo: 1_300_000 },
      }),
    ).toBeNull();
  });
});
