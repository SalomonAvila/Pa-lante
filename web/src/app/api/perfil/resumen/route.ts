import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { obtenerPerfilFinanciero } from "@/lib/perfil/obtener-perfil";
import { crearPruebaCapacidadPago } from "@/lib/perfil/perfil-financiero";

/**
 * Resumen mínimo para mostrar al terminar la conversación, en la misma
 * pantalla — reusa el mismo pipeline canónico que antes armaba /panorama
 * (obtenerPerfilFinanciero → crearPruebaCapacidadPago), esa página ya no
 * existe como ruta propia.
 */
export async function GET() {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { perfil, objetivoAcceso } = await obtenerPerfilFinanciero(supabase, user.id);
  const prueba = crearPruebaCapacidadPago(perfil, objetivoAcceso);

  return NextResponse.json({
    porcentajeIngresoVerificado: prueba.porcentajeIngresoVerificado,
    ingresoMensualVerificado: prueba.ingresoMensualVerificado,
    canonMensualObjetivo: prueba.canonMensualObjetivo,
    estadoPreparacion: prueba.estadoPreparacion,
    objetivoDescripcion: objetivoAcceso?.descripcion ?? null,
  });
}
