import { createClient } from "@/lib/supabase/server";

/**
 * Token de Google que Supabase guarda en la sesión tras el login con OAuth.
 * Sirve para llamar a Gmail en nombre del usuario. Vive ~1 hora y no se
 * refresca solo: si falta, hay que reconectar Gmail desde /intake.
 */
export async function getGoogleAccessToken() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.provider_token ?? null;
}

/** Usuario autenticado (validado contra Supabase), o null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
