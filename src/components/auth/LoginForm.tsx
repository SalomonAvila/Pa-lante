"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Lectura de correos bancarios: solo lectura, nunca escritura ni envío.
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

type Estado =
  | { tipo: "idle" }
  | { tipo: "enviando" }
  | { tipo: "enviado"; correo: string }
  | { tipo: "error"; mensaje: string };

export function LoginForm() {
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const [correo, setCorreo] = useState("");
  const supabase = createClient();

  async function entrarConGoogle() {
    setEstado({ tipo: "enviando" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: GMAIL_SCOPE,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setEstado({ tipo: "error", mensaje: error.message });
    }
  }

  async function enviarEnlaceMagico(evento: React.FormEvent) {
    evento.preventDefault();
    setEstado({ tipo: "enviando" });
    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setEstado(
      error
        ? { tipo: "error", mensaje: error.message }
        : { tipo: "enviado", correo },
    );
  }

  if (estado.tipo === "enviado") {
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="body-md text-on-surface">
          Te enviamos un enlace a <strong>{estado.correo}</strong>. Ábrelo desde
          este mismo dispositivo.
        </p>
        <button
          type="button"
          onClick={() => setEstado({ tipo: "idle" })}
          className="label-md text-primary underline"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  const cargando = estado.tipo === "enviando";

  return (
    <div className="flex w-full flex-col gap-4">
      <Button
        type="button"
        onClick={entrarConGoogle}
        disabled={cargando}
        className="w-full disabled:opacity-60"
      >
        Continuar con Google
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-outline-variant" />
        <span className="label-md text-on-surface-variant">o</span>
        <span className="h-px flex-1 bg-outline-variant" />
      </div>

      <form onSubmit={enviarEnlaceMagico} className="flex flex-col gap-3 text-left">
        <Input
          label="Correo"
          name="email"
          type="email"
          required
          placeholder="tu@correo.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={cargando}
          className="w-full disabled:opacity-60"
        >
          {cargando ? "Enviando…" : "Enviar enlace mágico"}
        </Button>
      </form>

      {estado.tipo === "error" && (
        <p className="body-md text-error" role="alert">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
