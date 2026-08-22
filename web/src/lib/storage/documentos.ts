import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bucket privado (creado en la migración de perfil financiero). Nunca se usa
 * `getPublicUrl` acá — todo acceso es por URL firmada de corta duración.
 */
const BUCKET = "documentos";

export function construirRuta(
  userId: string,
  categoria: "identidad" | "financieros",
  nombreArchivo: string,
): string {
  const limpio = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${categoria}/${Date.now()}_${limpio}`;
}

export async function subirDocumento(
  supabase: SupabaseClient,
  ruta: string,
  archivo: File,
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
}

export async function urlFirmada(
  supabase: SupabaseClient,
  ruta: string,
  expiraEnSegundos = 300,
): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, expiraEnSegundos);
  if (error || !data) throw new Error(error?.message ?? "No se pudo generar la URL firmada");
  return data.signedUrl;
}

export async function eliminarDocumento(supabase: SupabaseClient, ruta: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([ruta]);
  if (error) throw new Error(error.message);
}
