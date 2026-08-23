"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function ConectarGmailButton() {
  const supabase = createClient();
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function conectar() {
    setError(null);
    setConectando(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: GMAIL_SCOPE,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        setError(error.message);
        setConectando(false);
      }
      // Si no hubo error, el navegador ya está navegando a Google.
    } catch (excepcion) {
      console.error("Error conectando Gmail:", excepcion);
      setError("No pudimos abrir la conexión con Gmail. Intenta de nuevo.");
      setConectando(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Button type="button" className="w-full disabled:opacity-60" onClick={conectar} disabled={conectando}>
        {conectando ? "Abriendo Google…" : "Conectar Gmail"}
      </Button>
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
