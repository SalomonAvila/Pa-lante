import { createClient } from "@supabase/supabase-js";

// service_role: solo aquí, nunca en el cliente web. Bypasea RLS.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor MCP.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
