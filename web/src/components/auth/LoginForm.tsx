"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

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
    // Si no hay error, el navegador ya se fue a Google; solo importa el fallo.
    if (error) setEstado({ tipo: "error", mensaje: error.message });
  }

  async function enviarEnlace(evento: React.FormEvent) {
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
      <div className={styles.enviado}>
        <p className={styles.aviso}>
          Te enviamos un enlace a <strong>{estado.correo}</strong>. Ábrelo desde
          este mismo dispositivo.
        </p>
        <button
          type="button"
          className={styles.volver}
          onClick={() => setEstado({ tipo: "idle" })}
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  const cargando = estado.tipo === "enviando";

  return (
    <div className={styles.acciones}>
      <button
        type="button"
        className={styles.google}
        onClick={entrarConGoogle}
        disabled={cargando}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
        </svg>
        Continuar con Google
      </button>

      <div className={styles.separador}>o</div>

      <form className={styles.form} onSubmit={enviarEnlace}>
        <label className={styles.aviso} htmlFor="correo">
          Entra con un enlace a tu correo
        </label>
        <input
          id="correo"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className={styles.campo}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <button type="submit" className={styles.enviar} disabled={cargando}>
          {cargando ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      {estado.tipo === "error" && (
        <p className={styles.error} role="alert">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
