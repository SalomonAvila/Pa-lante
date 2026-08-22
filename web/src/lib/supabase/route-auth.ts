import { createClient } from "@/lib/supabase/server";

/** Cliente + usuario autenticado, para usar una sola vez por route handler. */
export async function clienteAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
