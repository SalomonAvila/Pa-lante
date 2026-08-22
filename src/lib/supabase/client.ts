import { createBrowserClient } from "@supabase/ssr";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Guardarraíl: la clave secreta salta RLS. Si se cuela aquí, queda expuesta a
// cualquiera que abra la página. Fallamos con un mensaje claro en vez de dejar
// que el error salga como "Forbidden use of secret API key in browser".
if (PUBLISHABLE_KEY?.startsWith("sb_secret_")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tiene una clave secreta (sb_secret_…). " +
      "Usa la clave publishable (sb_publishable_…) de Supabase → Project Settings → API Keys.",
  );
}

/** Cliente de Supabase para componentes del navegador. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    PUBLISHABLE_KEY,
  );
}
