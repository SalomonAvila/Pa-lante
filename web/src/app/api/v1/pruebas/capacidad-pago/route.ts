import { rutaProtegida } from "@/lib/api/ruta";
import { clienteServicio } from "@/lib/api/auth";
import { obtenerPerfilFinanciero } from "@/lib/perfil/obtener-perfil";
import { crearPruebaCapacidadPago } from "@/lib/perfil/perfil-financiero";

/**
 * Vista de divulgación para un tercero. Deliberadamente NO devuelve
 * transacciones, comercios, cuentas ni documentos: solo agregados
 * verificables. No aprueba ni rechaza nada — quien recibe conserva sus reglas.
 */
export const POST = rutaProtegida(
  "/v1/pruebas/capacidad-pago",
  "prueba:generar",
  async (ctx) => {
    const supabase = clienteServicio()!;
    const { perfil, objetivoAcceso } = await obtenerPerfilFinanciero(
      supabase,
      ctx.userId,
    );

    return {
      prueba: crearPruebaCapacidadPago(perfil, objetivoAcceso),
      limites: [
        "No constituye aprobación ni recomendación crediticia.",
        "No contiene transacciones, comercios ni documentos personales.",
      ],
    };
  },
);
