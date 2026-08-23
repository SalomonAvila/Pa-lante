import { NextResponse } from "next/server";
import { clienteAutenticado } from "@/lib/supabase/route-auth";
import { CATALOGO_FUENTES } from "@/lib/conectores/catalogo";
import { iniciarConexiones } from "@/lib/conectores/orquestador";
import { tieneConsentimientoVigente, type TipoConsentimiento } from "@/lib/perfil/consentimientos";

/**
 * DIAN y DataCrédito exigen su propio consentimiento de "lectura" antes de
 * arrancar el conector (sección 20 del pedido) — el resto de fuentes sigue
 * usando el `conexion_externa` genérico que ya tenían, sin cambios.
 */
const CONSENTIMIENTO_POR_FUENTE: Partial<Record<string, TipoConsentimiento>> = {
  dian: "dian_lectura",
  datacredito: "datacredito_lectura",
};

export async function POST(request: Request) {
  const { supabase, user } = await clienteAutenticado();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fuenteIds: string[] =
    Array.isArray(body.fuenteIds) && body.fuenteIds.length > 0
      ? body.fuenteIds
      : CATALOGO_FUENTES.map((f) => f.id);

  for (const fuenteId of fuenteIds) {
    const tipoRequerido = CONSENTIMIENTO_POR_FUENTE[fuenteId];
    if (!tipoRequerido) continue;
    const otorgado = await tieneConsentimientoVigente(supabase, user.id, tipoRequerido);
    if (!otorgado) {
      return NextResponse.json(
        { error: `Falta el consentimiento "${tipoRequerido}" para conectar "${fuenteId}".` },
        { status: 403 },
      );
    }
  }

  const conexiones = await iniciarConexiones(supabase, user.id, fuenteIds);
  return NextResponse.json({ conexiones });
}
