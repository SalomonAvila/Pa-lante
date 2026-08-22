import { rutaProtegida } from "@/lib/api/ruta";
import { clienteServicio } from "@/lib/api/auth";
import { obtenerPerfilFinanciero } from "@/lib/perfil/obtener-perfil";

export const GET = rutaProtegida(
  "/v1/cobertura",
  "cobertura:leer",
  async (ctx) => {
    const supabase = clienteServicio()!;
    const { perfil } = await obtenerPerfilFinanciero(supabase, ctx.userId);
    return {
      cobertura: perfil.cobertura,
      calidad_datos: perfil.calidadDatos,
      periodo: perfil.periodo,
    };
  },
);
