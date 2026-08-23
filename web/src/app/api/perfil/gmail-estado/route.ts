import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/supabase/session";

/**
 * Si el usuario ya entró con Google y ese login pidió gmail.readonly (mismo
 * consent, ver LoginForm/ConectarGmailButton), el token ya vive en la sesión
 * — no hace falta mandarlo de nuevo por el OAuth completo solo para "conectar
 * Gmail" en integraciones. El token dura ~1h y no se refresca solo (ver
 * session.ts), así que esto puede volver a false más adelante.
 */
export async function GET() {
  const token = await getGoogleAccessToken();
  return NextResponse.json({ conectado: Boolean(token) });
}
