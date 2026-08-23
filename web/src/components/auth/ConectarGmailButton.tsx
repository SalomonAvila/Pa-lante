"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function ConectarGmailButton() {
  const supabase = createClient();
  const [estado, setEstado] = useState<"cargando" | "conectado" | "desconectado">("cargando");
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el usuario ya entró con Google pidiendo gmail.readonly (mismo consent
  // del login), no hace falta mandarlo de nuevo por el OAuth — eso reinicia
  // la página entera y le hace perder todo lo avanzado en /intake.
  useEffect(() => {
    let activo = true;
    fetch("/api/perfil/gmail-estado")
      .then((res) => (res.ok ? res.json() : { conectado: false }))
      .then((data: { conectado: boolean }) => {
        if (activo) setEstado(data.conectado ? "conectado" : "desconectado");
      })
      .catch(() => activo && setEstado("desconectado"));
    return () => {
      activo = false;
    };
  }, []);

  async function conectar() {
    setError(null);
    setConectando(true);
    try {
      // Si de verdad hace falta el OAuth completo (login por enlace mágico,
      // token vencido), vuelve a /intake/problema en vez de /intake: así se
      // salta el paso de datos personales, que ya está guardado.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/intake/problema")}`,
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

  if (estado === "cargando") return null;

  if (estado === "conectado") {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/70">
        Gmail ya conectado
      </div>
    );
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
