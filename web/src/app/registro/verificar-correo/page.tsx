"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { CLAVE_SESSION_REGISTRO } from "@/lib/perfil/registro-local";

function VerificarCorreoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const correo = searchParams.get("correo") ?? "";
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const supabase = createClient();

  async function verificar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setVerificando(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: correo,
      token: codigo,
      type: "signup",
    });

    if (verifyError) {
      setError(verifyError.message);
      setVerificando(false);
      return;
    }

    // Recién acá hay sesión: mandamos los datos que quedaron en espera.
    const datosGuardados = sessionStorage.getItem(CLAVE_SESSION_REGISTRO);
    if (datosGuardados) {
      await fetch("/api/perfil/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: datosGuardados,
      });
      sessionStorage.removeItem(CLAVE_SESSION_REGISTRO);
    }

    router.push("/registro/verificar-identidad");
  }

  async function reenviar() {
    setReenviando(true);
    await supabase.auth.resend({ type: "signup", email: correo });
    setReenviando(false);
    setReenviado(true);
    setTimeout(() => setReenviado(false), 30_000);
  }

  return (
    <Card elevated className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <MascotFeedback mood="pensando" size={72} housed />
      <div>
        <h1 className="headline-md text-on-surface">Verifica tu correo</h1>
        <p className="mt-1 body-md text-on-surface-variant">
          Enviamos un código de 6 dígitos a <strong>{correo}</strong>.
        </p>
      </div>
      <form onSubmit={verificar} className="flex w-full flex-col gap-4 text-left">
        <Input
          label="Código de verificación"
          inputMode="numeric"
          maxLength={6}
          required
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <Button type="submit" disabled={verificando} className="w-full disabled:opacity-60">
          {verificando ? "Verificando…" : "Verificar"}
        </Button>
        {error && (
          <p className="body-md text-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <button
        type="button"
        onClick={reenviar}
        disabled={reenviando || reenviado}
        className="label-md text-primary underline disabled:opacity-60"
      >
        {reenviado ? "Código reenviado" : reenviando ? "Reenviando…" : "Reenviar código"}
      </button>
    </Card>
  );
}

export default function VerificarCorreoPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface p-6">
      <Suspense fallback={null}>
        <VerificarCorreoForm />
      </Suspense>
    </div>
  );
}
