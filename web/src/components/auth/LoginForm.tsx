"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Lectura de correos bancarios: solo lectura, nunca escritura ni envío.
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

type EstadoMagico =
  | { tipo: "idle" }
  | { tipo: "enviando" }
  | { tipo: "enviado"; correo: string }
  | { tipo: "error"; mensaje: string };

type EstadoRecuperar = "idle" | "enviando" | "enviado" | "error";

export function LoginForm() {
  const supabase = createClient();
  const router = useRouter();

  const [estadoMagico, setEstadoMagico] = useState<EstadoMagico>({ tipo: "idle" });
  const [correoMagico, setCorreoMagico] = useState("");
  const [entrandoConGoogle, setEntrandoConGoogle] = useState(false);
  const [errorGoogle, setErrorGoogle] = useState<string | null>(null);

  const [correoPassword, setCorreoPassword] = useState("");
  const [password, setPassword] = useState("");
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [entrandoConPassword, setEntrandoConPassword] = useState(false);
  const [estadoRecuperar, setEstadoRecuperar] = useState<EstadoRecuperar>("idle");

  async function entrarConGoogle() {
    setErrorGoogle(null);
    setEntrandoConGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: GMAIL_SCOPE,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      // Si no hubo error, el navegador ya está navegando a Google — no hay
      // nada más que hacer acá. Si sí hubo error, lo mostramos y liberamos
      // el botón para que se pueda reintentar.
      if (error) {
        setErrorGoogle(error.message);
        setEntrandoConGoogle(false);
      }
    } catch (excepcion) {
      // Sin este catch, una excepción (red, config del proveedor, etc.) deja
      // el botón deshabilitado para siempre sin ningún mensaje — "se queda
      // pegado" sin explicación ni forma de reintentar.
      console.error("Error iniciando sesión con Google:", excepcion);
      setErrorGoogle("No pudimos abrir el inicio de sesión con Google. Intenta de nuevo.");
      setEntrandoConGoogle(false);
    }
  }

  async function enviarEnlaceMagico(evento: React.FormEvent) {
    evento.preventDefault();
    setEstadoMagico({ tipo: "enviando" });
    const { error } = await supabase.auth.signInWithOtp({
      email: correoMagico,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setEstadoMagico(
      error ? { tipo: "error", mensaje: error.message } : { tipo: "enviado", correo: correoMagico },
    );
  }

  async function entrarConPassword(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorPassword(null);
    setEntrandoConPassword(true);

    const { error } = await supabase.auth.signInWithPassword({ email: correoPassword, password });
    if (error) {
      setErrorPassword(error.message);
      setEntrandoConPassword(false);
      return;
    }
    router.push("/panorama");
    router.refresh();
  }

  async function recuperarPassword() {
    if (!correoPassword) {
      setErrorPassword("Escribe tu correo arriba para poder enviarte el enlace de recuperación.");
      return;
    }
    setEstadoRecuperar("enviando");
    const { error } = await supabase.auth.resetPasswordForEmail(correoPassword, {
      redirectTo: `${window.location.origin}/auth/callback?next=/configuracion/privacidad`,
    });
    setEstadoRecuperar(error ? "error" : "enviado");
  }

  const cargandoMagico = estadoMagico.tipo === "enviando";

  return (
    <div className="flex w-full flex-col gap-6">
      <Button
        type="button"
        onClick={entrarConGoogle}
        disabled={entrandoConGoogle}
        className="w-full disabled:opacity-60"
      >
        {entrandoConGoogle ? "Abriendo Google…" : "Continuar con Google"}
      </Button>
      {errorGoogle && (
        <p className="body-md text-error" role="alert">
          {errorGoogle}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-outline-variant" />
        <span className="label-md text-on-surface-variant">o</span>
        <span className="h-px flex-1 bg-outline-variant" />
      </div>

      {estadoMagico.tipo === "enviado" ? (
        <div className="flex w-full flex-col gap-2">
          <p className="body-md text-on-surface">
            Te enviamos un enlace a <strong>{estadoMagico.correo}</strong>. Ábrelo desde este mismo
            dispositivo.
          </p>
          <button
            type="button"
            onClick={() => setEstadoMagico({ tipo: "idle" })}
            className="label-md text-primary underline"
          >
            Usar otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={enviarEnlaceMagico} className="flex flex-col gap-3 text-left">
          <Input
            label="Correo"
            name="email"
            type="email"
            required
            placeholder="tu@correo.com"
            value={correoMagico}
            onChange={(e) => setCorreoMagico(e.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={cargandoMagico}
            className="w-full disabled:opacity-60"
          >
            {cargandoMagico ? "Enviando…" : "Enviar enlace mágico"}
          </Button>
        </form>
      )}

      {estadoMagico.tipo === "error" && (
        <p className="body-md text-error" role="alert">
          {estadoMagico.mensaje}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-outline-variant" />
        <span className="label-md text-on-surface-variant">o con tu contraseña</span>
        <span className="h-px flex-1 bg-outline-variant" />
      </div>

      <form onSubmit={entrarConPassword} className="flex flex-col gap-3 text-left">
        <Input
          label="Correo"
          type="email"
          required
          value={correoPassword}
          onChange={(e) => setCorreoPassword(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={entrandoConPassword}
          className="w-full disabled:opacity-60"
        >
          {entrandoConPassword ? "Entrando…" : "Iniciar sesión"}
        </Button>
        {errorPassword && (
          <p className="body-md text-error" role="alert">
            {errorPassword}
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={recuperarPassword} className="text-primary underline">
            {estadoRecuperar === "enviado" ? "Enlace enviado" : "¿Olvidaste tu contraseña?"}
          </button>
          <a href="/registro" className="text-primary underline">
            Crear cuenta
          </a>
        </div>
      </form>
    </div>
  );
}
